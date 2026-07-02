import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ChevronDown, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CloudRegionSelect from '@/components/cloud/CloudRegionSelect';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';
import CloudCopySnippet from '@/components/cloud/CloudCopySnippet';
import { buildCustomerRoleVpcConnectorPolicy } from '@/components/cloud/awsIamUserPolicy';
import { getVpcConnectorConfig } from '@/components/cloud/awsVpcConnector';
import type { SDKProxyService } from '@/services/sdkProxy';
import { cloudConnectionRef, isCloudConnectionActive } from '@/components/cloud/cloudConnection.constants';
import { cloudConnectionsQueryKey } from '@/utils/cloudConnectionQueryKeys';
import { resolveWorkbenchApiHostname } from '@/utils/cloudApiHost';

export interface AwsVpcConnectorPanelProps {
  connection: {
    id?: string;
    tag?: string;
    provider?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  };
  sdkProxy: SDKProxyService;
  workspaceId?: string;
}

export default function AwsVpcConnectorPanel({
  connection,
  sdkProxy,
  workspaceId,
}: AwsVpcConnectorPanelProps) {
  const queryClient = useQueryClient();
  const cloudRef = cloudConnectionRef(connection);
  const isActive = isCloudConnectionActive(connection.status);
  const saved = getVpcConnectorConfig(connection.metadata);

  const [region, setRegion] = useState(saved?.region || 'us-east-1');
  const [vpcId, setVpcId] = useState(saved?.vpc_id || '');
  const [selectedSubnets, setSelectedSubnets] = useState<string[]>(saved?.subnet_ids || []);
  const [appSecurityGroups, setAppSecurityGroups] = useState(
    (saved?.app_security_group_ids || []).join(', '),
  );
  const [enrollmentToken, setEnrollmentToken] = useState(saved?.enrollment_token || '');

  useEffect(() => {
    if (saved?.region) setRegion(saved.region);
    if (saved?.vpc_id) setVpcId(saved.vpc_id);
    if (saved?.subnet_ids?.length) setSelectedSubnets(saved.subnet_ids);
    if (saved?.app_security_group_ids?.length) {
      setAppSecurityGroups(saved.app_security_group_ids.join(', '));
    }
  }, [saved?.region, saved?.vpc_id, saved?.subnet_ids, saved?.app_security_group_ids]);

  const { data: vpcList, isFetching: loadingVpcs, refetch: refetchVpcs } = useQuery({
    queryKey: ['vpc-connector-vpcs', cloudRef, region],
    queryFn: () => sdkProxy.cloud.connections.listVpcConnectorVpcs(cloudRef!, region),
    enabled: Boolean(cloudRef && isActive),
  });

  const { data: subnetList, isFetching: loadingSubnets, refetch: refetchSubnets } = useQuery({
    queryKey: ['vpc-connector-subnets', cloudRef, region, vpcId],
    queryFn: () => sdkProxy.cloud.connections.listVpcConnectorSubnets(cloudRef!, region, vpcId),
    enabled: Boolean(cloudRef && isActive && vpcId),
  });

  const { data: liveStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['vpc-connector-status', cloudRef],
    queryFn: () => sdkProxy.cloud.connections.getVpcConnectorStatus(cloudRef!),
    enabled: Boolean(cloudRef && isActive && saved?.data_security_group?.groupId),
    refetchInterval: 15000,
  });

  const agentStatus = liveStatus?.agent_status || saved?.agent_status || 'pending';
  const integrationsUrl = useMemo(() => {
    const host = resolveWorkbenchApiHostname();
    if (host.includes('localhost')) return 'http://localhost:3003';
    return `https://${host.replace(/^api\./, 'api.')}`;
  }, []);

  const subnets = (subnetList?.subnets || []) as Array<{
    subnetId: string;
    availabilityZone?: string;
    name?: string;
  }>;

  const toggleSubnet = (subnetId: string, checked: boolean) => {
    setSelectedSubnets((prev) => {
      if (checked) return prev.includes(subnetId) ? prev : [...prev, subnetId];
      return prev.filter((id) => id !== subnetId);
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!cloudRef) throw new Error('No connection');
      if (!vpcId.trim()) throw new Error('Select a VPC');
      if (!selectedSubnets.length) throw new Error('Select at least one subnet');
      const parsedAppSgs = appSecurityGroups
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      return sdkProxy.cloud.connections.updateVpcConnector(cloudRef, {
        region: region.trim() || 'us-east-1',
        vpc_id: vpcId.trim(),
        subnet_ids: selectedSubnets,
        app_security_group_ids: parsedAppSgs,
      });
    },
    onSuccess: (result: { vpc_connector?: { enrollment_token?: string } }) => {
      const token = result?.vpc_connector?.enrollment_token;
      if (token) setEnrollmentToken(token);
      toast.success('VPC connector ready — deploy the agent below');
      queryClient.invalidateQueries({ queryKey: cloudConnectionsQueryKey(workspaceId) });
      void refetchStatus();
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to save VPC connector'),
  });

  const rotateTokenMutation = useMutation({
    mutationFn: async () => {
      if (!cloudRef) throw new Error('No connection');
      return sdkProxy.cloud.connections.updateVpcConnector(cloudRef, {
        region: region.trim() || 'us-east-1',
        vpc_id: vpcId.trim(),
        subnet_ids: selectedSubnets,
        app_security_group_ids: appSecurityGroups.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean),
        rotate_enrollment_token: true,
      });
    },
    onSuccess: (result: { vpc_connector?: { enrollment_token?: string } }) => {
      const token = result?.vpc_connector?.enrollment_token;
      if (token) setEnrollmentToken(token);
      toast.success('Enrollment token rotated');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to rotate token'),
  });

  const dockerRunCommand = useMemo(() => {
    if (!workspaceId || !cloudRef || !enrollmentToken) return '';
    return [
      'docker run --rm \\',
      `  -e DUCTAPE_INTEGRATIONS_URL=${integrationsUrl} \\`,
      `  -e WORKSPACE_ID=${workspaceId} \\`,
      `  -e CLOUD_TAG=${cloudRef} \\`,
      `  -e ENROLLMENT_TOKEN=${enrollmentToken} \\`,
      '  -v $(pwd)/connectors/aws-vpc-agent:/app \\',
      '  -w /app node:20-alpine sh -c "npm install && node index.js"',
    ].join('\n');
  }, [workspaceId, cloudRef, enrollmentToken, integrationsUrl]);

  if (!isActive) {
    return (
      <p className="text-sm text-grey-600">
        Complete and validate this connection before configuring a VPC connector.
      </p>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-grey-400 p-5 shadow-sm space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vpc-connector-region">Region</Label>
          <CloudRegionSelect
            provider="aws"
            id="vpc-connector-region"
            value={region}
            onChange={setRegion}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>VPC</Label>
            <Button type="button" variant="ghost" size="sm" onClick={() => refetchVpcs()} disabled={loadingVpcs}>
              {loadingVpcs ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
          </div>
          <Select
            value={vpcId || undefined}
            onValueChange={(value) => {
              setVpcId(value);
              setSelectedSubnets([]);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingVpcs ? 'Loading VPCs…' : 'Select a VPC'} />
            </SelectTrigger>
            <SelectContent>
              {(vpcList?.vpcs || []).map((vpc: { vpcId: string; name?: string; isDefault?: boolean }) => (
                <SelectItem key={vpc.vpcId} value={vpc.vpcId}>
                  {vpc.name ? `${vpc.name} (${vpc.vpcId})` : vpc.vpcId}
                  {vpc.isDefault ? ' · default' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {vpcId ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Subnets for the connector agent</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => refetchSubnets()}
              disabled={loadingSubnets}
            >
              {loadingSubnets ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
          </div>
          {loadingSubnets ? (
            <p className="text-xs text-grey-600 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading subnets…
            </p>
          ) : subnets.length ? (
            <div className="rounded-md border border-grey-300 divide-y divide-grey-300 max-h-48 overflow-y-auto">
              {subnets.map((subnet) => (
                <label
                  key={subnet.subnetId}
                  className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-grey-50"
                >
                  <Checkbox
                    checked={selectedSubnets.includes(subnet.subnetId)}
                    onCheckedChange={(checked) => toggleSubnet(subnet.subnetId, checked === true)}
                  />
                  <span className="font-mono text-xs">{subnet.subnetId}</span>
                  {subnet.availabilityZone ? (
                    <span className="text-xs text-grey-600">{subnet.availabilityZone}</span>
                  ) : null}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-grey-600">No subnets found in this VPC.</p>
          )}
          {selectedSubnets.length ? (
            <p className="text-xs text-grey-600">{selectedSubnets.length} subnet(s) selected</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !vpcId || !selectedSubnets.length}
        >
          {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {saved?.data_security_group?.groupId ? 'Update connector' : 'Create connector'}
        </Button>
      </div>

      {saved?.connector_security_group?.groupId ? (
        <div className="rounded-md border border-grey-300 bg-grey-50 p-3 text-sm space-y-1">
          <p>
            Connector SG: <code className="font-mono text-xs">{saved.connector_security_group.groupId}</code>
          </p>
          <p>
            Data SG: <code className="font-mono text-xs">{saved.data_security_group.groupId}</code>
          </p>
          <div className="flex items-center gap-2 pt-1">
            {agentStatus === 'connected' ? (
              <span className="text-emerald-700 text-xs font-medium">Agent connected</span>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-xs">
                  Agent {agentStatus}
                  {liveStatus?.agent_last_seen_at ? ` · last seen ${liveStatus.agent_last_seen_at}` : ''}
                </span>
              </>
            )}
          </div>
        </div>
      ) : null}

      {enrollmentToken ? (
        <div className="space-y-3 border-t border-grey-300 pt-4">
          <p className="text-sm font-medium text-grey">Deploy the agent</p>
          <p className="text-xs text-grey-600">
            Run this in a subnet that can reach your RDS or Neptune endpoints (same VPC).
          </p>
          {dockerRunCommand ? (
            <CloudCopySnippet label="Docker command" value={dockerRunCommand} />
          ) : null}
          <CloudCopySnippet label="Enrollment token" value={enrollmentToken} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => rotateTokenMutation.mutate()}
            disabled={rotateTokenMutation.isPending}
          >
            Rotate enrollment token
          </Button>
        </div>
      ) : null}

      <details className="group rounded-lg border border-grey-300">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-grey">
          Advanced options
          <ChevronDown className="h-4 w-4 text-grey-600 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-grey-300 px-4 py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vpc-connector-app-sgs">App security group IDs (optional)</Label>
            <Input
              id="vpc-connector-app-sgs"
              value={appSecurityGroups}
              onChange={(e) => setAppSecurityGroups(e.target.value)}
              placeholder="sg-app (comma-separated)"
            />
            <p className="text-xs text-grey-600">
              Allow inbound on the data security group from your application servers.
            </p>
          </div>
          <CloudCopySnippet
            label="IAM policy for DuctapeAccess role"
            value={buildCustomerRoleVpcConnectorPolicy()}
          />
        </div>
      </details>
    </div>
  );
}
