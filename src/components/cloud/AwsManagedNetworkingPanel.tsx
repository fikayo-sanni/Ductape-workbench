import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CloudRegionSelect from '@/components/cloud/CloudRegionSelect';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import toast from 'react-hot-toast';
import { isEc2NetworkingPermissionError } from '@/components/cloud/awsIamUserPolicy';
import AwsCustomerRoleNetworkingPolicySection from '@/components/cloud/AwsCustomerRoleNetworkingPolicySection';
import {
  getCloudManagedNetworking,
  type IAllowedSourceCidr,
} from '@/components/cloud/awsManagedNetworking';
import type { SDKProxyService } from '@/services/sdkProxy';
import {
  cloudConnectionRef,
  isCloudConnectionActive,
  syncCloudConnectionAfterMutation,
  type CloudConnectionQueryRecord,
} from '@/components/cloud/cloudConnection.constants';
import { useAuth } from '@/store/useAuth';
import {
  isLocalDevApiHost,
  resolveApiHostAddresses,
  resolveWorkbenchApiHostname,
} from '@/utils/cloudApiHost';

export interface AwsManagedNetworkingPanelProps {
  connection: {
    id?: string;
    tag?: string;
    provider?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  };
  sdkProxy: SDKProxyService;
}

type CustomRow = { cidr: string; label: string };

function customRowsFromSaved(sources: IAllowedSourceCidr[] | undefined): CustomRow[] {
  return (sources || [])
    .filter((s) => s.source === 'custom')
    .map((s) => ({
      cidr: s.cidr.replace(/\/32$/, '').includes('/') ? s.cidr : s.cidr,
      label: s.label || '',
    }));
}

export default function AwsManagedNetworkingPanel({
  connection,
  sdkProxy,
}: AwsManagedNetworkingPanelProps) {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useAuth();
  const cloudRef = cloudConnectionRef(connection);
  const isActive = isCloudConnectionActive(connection.status);
  const apiHostname = useMemo(() => resolveWorkbenchApiHostname(), []);

  const saved = getCloudManagedNetworking(connection.metadata);
  const hasManagedGroup = Boolean(saved.managed_security_group?.groupId);

  const [region, setRegion] = useState(saved.managed_security_group?.region || 'us-east-1');
  const [includeDuctapeProxy, setIncludeDuctapeProxy] = useState(
    saved.include_ductape_proxy !== false,
  );
  const [showCustomSources, setShowCustomSources] = useState(
    (saved.allowed_sources || []).some((s) => s.source === 'custom'),
  );
  const [customRows, setCustomRows] = useState<CustomRow[]>(() => customRowsFromSaved(saved.allowed_sources));
  const [highlightIamPolicy, setHighlightIamPolicy] = useState(false);
  const [showIamPolicy, setShowIamPolicy] = useState(!hasManagedGroup);
  const iamPolicyRef = useRef<HTMLDivElement>(null);

  const {
    data: resolvedHost,
    isFetching: resolvingHost,
    refetch: refetchHost,
    isError: resolveHostError,
  } = useQuery({
    queryKey: ['cloud-networking-resolve-host', apiHostname],
    queryFn: () => resolveApiHostAddresses(apiHostname, sdkProxy),
    enabled: Boolean(apiHostname && sdkProxy),
    staleTime: 1000 * 60 * 10,
  });

  const ductapeAddresses = resolvedHost?.addresses || saved.ductape_proxy_addresses || [];
  const isLocalApi = isLocalDevApiHost(apiHostname);

  useEffect(() => {
    const next = getCloudManagedNetworking(connection.metadata);
    if (next.managed_security_group?.region) {
      setRegion(next.managed_security_group.region);
    }
    if (next.include_ductape_proxy !== undefined) {
      setIncludeDuctapeProxy(next.include_ductape_proxy !== false);
    }
    const custom = customRowsFromSaved(next.allowed_sources);
    if (custom.length) {
      setShowCustomSources(true);
      setCustomRows(custom);
    }
    if (next.managed_security_group?.groupId) {
      setShowIamPolicy(false);
    }
  }, [connection.metadata]);

  const buildPayload = () => {
    const allowed_sources: IAllowedSourceCidr[] = customRows
      .map((row) => row.cidr.trim())
      .filter(Boolean)
      .map((raw) => {
        const cidr = raw.includes('/') ? raw : `${raw}/32`;
        return { cidr, label: 'Custom', source: 'custom' as const };
      });

    return {
      mode: 'managed' as const,
      region: region.trim() || 'us-east-1',
      include_ductape_proxy: includeDuctapeProxy,
      ductape_proxy_host: apiHostname,
      ductape_proxy_addresses: ductapeAddresses,
      allowed_sources,
    };
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!cloudRef) throw new Error('No connection');
      return sdkProxy.cloud.connections.updateManagedNetworking(cloudRef, buildPayload());
    },
    onSuccess: (updated: CloudConnectionQueryRecord) => {
      syncCloudConnectionAfterMutation(queryClient, currentWorkspaceId, connection, updated);
      toast.success(
        getCloudManagedNetworking(updated.metadata).managed_security_group?.groupId
          ? 'IP allowlist updated'
          : 'IP allowlist saved',
      );
      setHighlightIamPolicy(false);
      setShowIamPolicy(false);
    },
    onError: (e: Error) => {
      if (isEc2NetworkingPermissionError(e.message)) {
        setHighlightIamPolicy(true);
        setShowIamPolicy(true);
        iamPolicyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        toast.error(
          'Missing EC2 permissions on DuctapeAccess — attach the IAM policy highlighted below, then save again.',
          { duration: 10000 },
        );
      } else {
        toast.error(e.message || 'Failed to save allowlist');
      }
    },
  });

  const previewCidrs = useMemo(() => {
    const items: { cidr: string; label: string }[] = [];
    if (includeDuctapeProxy) {
      for (const ip of ductapeAddresses) {
        items.push({ cidr: `${ip}/32`, label: 'Ductape workbench / proxy' });
      }
    }
    for (const row of customRows) {
      if (!row.cidr.trim()) continue;
      const cidr = row.cidr.includes('/') ? row.cidr : `${row.cidr.trim()}/32`;
      items.push({ cidr, label: row.label.trim() || 'Custom' });
    }
    return items;
  }, [includeDuctapeProxy, ductapeAddresses, customRows]);

  const savedAllowlistSummary = useMemo(() => {
    const items: { cidr: string; label: string }[] = [];
    if (saved.include_ductape_proxy !== false) {
      for (const ip of saved.ductape_proxy_addresses || []) {
        items.push({ cidr: `${ip}/32`, label: 'Ductape workbench / proxy' });
      }
    }
    for (const row of saved.allowed_sources || []) {
      if (row.source === 'custom') {
        items.push({ cidr: row.cidr, label: row.label || 'Custom' });
      }
    }
    return items;
  }, [saved]);

  if (connection.provider !== 'aws') return null;

  return (
    <div className="bg-white rounded-lg border border-grey-400 p-5 shadow-sm space-y-5">
      {!isActive ? (
        <p className="text-sm text-grey-600">
          Complete and validate this connection before configuring IP allowlisting.
        </p>
      ) : (
        <>
          {hasManagedGroup ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-grey">Allowlist active</p>
                  <p className="text-xs text-grey-600 leading-relaxed">
                    Ductape created and manages this security group in your AWS account. Attach it to
                    your RDS or Neptune resources alongside their existing groups.
                  </p>
                </div>
              </div>
              <dl className="grid gap-2 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-grey-600">Security group</dt>
                  <dd className="font-mono text-grey mt-0.5">{saved.managed_security_group?.groupId}</dd>
                </div>
                <div>
                  <dt className="text-grey-600">Region</dt>
                  <dd className="font-mono text-grey mt-0.5">{saved.managed_security_group?.region}</dd>
                </div>
                {saved.managed_security_group?.vpcId ? (
                  <div>
                    <dt className="text-grey-600">VPC</dt>
                    <dd className="font-mono text-grey mt-0.5">{saved.managed_security_group.vpcId}</dd>
                  </div>
                ) : null}
                {saved.managed_security_group?.name ? (
                  <div>
                    <dt className="text-grey-600">Name</dt>
                    <dd className="font-mono text-grey mt-0.5">{saved.managed_security_group.name}</dd>
                  </div>
                ) : null}
              </dl>
              {savedAllowlistSummary.length ? (
                <div>
                  <p className="text-xs text-grey-600 mb-1">Allowed inbound on TCP 3306, 5432, and 8182</p>
                  <ul className="text-xs font-mono text-grey space-y-1">
                    {savedAllowlistSummary.map((item) => (
                      <li key={item.cidr}>
                        {item.cidr}
                        <span className="font-sans text-grey-600"> — {item.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-lg border border-grey-300 bg-grey-50/60 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-grey">
                  {hasManagedGroup ? 'Update allowlist' : 'Allow this workbench'}
                </p>
                <p className="text-xs text-grey-600 mt-1">
                  Opens TCP 3306/5432 (RDS) and 8182 (Neptune) for{' '}
                  <span className="font-mono">{apiHostname}</span>
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => refetchHost()}
                disabled={resolvingHost}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${resolvingHost ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {isLocalApi ? (
              <div className="flex gap-2 text-xs text-amber-800 bg-amber-500/10 border border-amber-500/25 rounded-md p-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>
                  Local dev cannot whitelist localhost on AWS. Use VPC connector for private databases,
                  or add your deployed proxy IPs below.
                </p>
              </div>
            ) : resolvingHost ? (
              <p className="text-xs text-grey-600 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Resolving IP addresses…
              </p>
            ) : resolveHostError ? (
              <p className="text-xs text-red-600">Could not resolve host. Retry refresh.</p>
            ) : ductapeAddresses.length ? (
              <ul className="text-xs font-mono text-grey space-y-1">
                {ductapeAddresses.map((ip) => (
                  <li key={ip}>{ip}/32</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-grey-600">No addresses returned.</p>
            )}

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={includeDuctapeProxy}
                onCheckedChange={(checked) => setIncludeDuctapeProxy(checked === true)}
                disabled={!ductapeAddresses.length || isLocalApi}
              />
              Include these IPs in the security group
            </label>
          </div>

          {hasManagedGroup && !showIamPolicy && !highlightIamPolicy ? (
            <button
              type="button"
              onClick={() => setShowIamPolicy(true)}
              className="text-xs text-grey-600 hover:text-grey underline underline-offset-2"
            >
              Show IAM policy reference
            </button>
          ) : (
            <AwsCustomerRoleNetworkingPolicySection
              variant="allowlist"
              highlight={highlightIamPolicy}
              innerRef={iamPolicyRef}
            />
          )}

          {!showCustomSources ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowCustomSources(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add more IP addresses
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Additional IPs or CIDRs</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setCustomRows((prev) => [...prev, { cidr: '', label: '' }])}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
              {customRows.map((row, index) => (
                <div key={index} className="flex flex-wrap items-end gap-2">
                  <Input
                    className="flex-1 min-w-[140px] font-mono text-sm"
                    placeholder="203.0.113.10 or 10.0.0.0/16"
                    value={row.cidr}
                    onChange={(e) =>
                      setCustomRows((prev) => {
                        const next = [...prev];
                        next[index] = { ...next[index], cidr: e.target.value };
                        return next;
                      })
                    }
                  />
                  <Input
                    className="flex-1 min-w-[120px] text-sm"
                    placeholder="Label"
                    value={row.label}
                    onChange={(e) =>
                      setCustomRows((prev) => {
                        const next = [...prev];
                        next[index] = { ...next[index], label: e.target.value };
                        return next;
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 text-red-600"
                    onClick={() => setCustomRows((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="managed-sg-region">AWS region</Label>
            <CloudRegionSelect
              provider="aws"
              id="managed-sg-region"
              className="font-mono text-sm max-w-xs"
              value={region}
              onChange={setRegion}
            />
            <p className="text-xs text-grey-600">Match the region where you provision RDS or Neptune.</p>
          </div>

          {previewCidrs.length > 0 ? (
            <p className="text-xs text-grey-600">
              {previewCidrs.length} source(s) will be allowed on ports 3306, 5432, and 8182.
            </p>
          ) : null}

          <div className="flex justify-end pt-2 border-t border-grey-300">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || previewCidrs.length === 0}
            >
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {hasManagedGroup ? 'Update allowlist' : 'Save allowlist'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
