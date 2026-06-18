import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import toast from 'react-hot-toast';
import AwsSecurityGroupsGuide from '@/components/cloud/AwsSecurityGroupsGuide';
import { getCloudManagedNetworking } from '@/components/cloud/awsManagedNetworking';
import {
  AWS_SG_ID_PATTERN,
  AWS_SG_TAG_PATTERN,
  type AwsRegisteredSecurityGroup,
  type AwsSecurityGroupResourceType,
  awsVpcInboundPort,
  parseRegisteredSecurityGroups,
} from '@/components/cloud/awsSecurityGroups';
import type { SDKProxyService } from '@/services/sdkProxy';
import {
  cloudConnectionRef,
  isCloudConnectionActive,
  syncCloudConnectionAfterMutation,
  type CloudConnectionQueryRecord,
} from '@/components/cloud/cloudConnection.constants';
import { useAuth } from '@/store/useAuth';

const EMPTY_ROW = (): AwsRegisteredSecurityGroup => ({
  tag: '',
  groupId: '',
  resourceTypes: ['rds'],
  region: '',
  description: '',
});

export interface AwsSecurityGroupsPanelProps {
  connection: {
    id?: string;
    tag?: string;
    provider?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  };
  sdkProxy: SDKProxyService;
}

export default function AwsSecurityGroupsPanel({
  connection,
  sdkProxy,
}: AwsSecurityGroupsPanelProps) {
  const queryClient = useQueryClient();
  const { currentWorkspaceId } = useAuth();
  const cloudRef = cloudConnectionRef(connection);
  const isActive = isCloudConnectionActive(connection.status);
  const managedGroup = getCloudManagedNetworking(connection.metadata).managed_security_group;
  const [rows, setRows] = useState<AwsRegisteredSecurityGroup[]>(() =>
    parseRegisteredSecurityGroups(connection.metadata),
  );

  useEffect(() => {
    setRows(parseRegisteredSecurityGroups(connection.metadata));
  }, [connection.metadata]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!cloudRef) throw new Error('No connection');
      const normalized: AwsRegisteredSecurityGroup[] = [];
      const seenTags = new Set<string>();

      for (const row of rows) {
        const tag = row.tag.trim().toLowerCase();
        const groupId = row.groupId.trim();
        if (!tag && !groupId && !row.resourceTypes.length) continue;

        if (!AWS_SG_TAG_PATTERN.test(tag)) {
          throw new Error(
            `Invalid tag "${tag}". Use lowercase letters, numbers, and hyphens (e.g. prod-rds).`,
          );
        }
        if (!AWS_SG_ID_PATTERN.test(groupId)) {
          throw new Error(`Invalid group id "${groupId}". Expected format sg-xxxxxxxx.`);
        }
        if (!row.resourceTypes.length) {
          throw new Error(`Security group "${tag}" must include at least one resource type.`);
        }
        if (seenTags.has(tag)) {
          throw new Error(`Duplicate tag "${tag}"`);
        }
        seenTags.add(tag);

        normalized.push({
          tag,
          groupId,
          resourceTypes: row.resourceTypes,
          region: row.region?.trim() || undefined,
          description: row.description?.trim() || undefined,
        });
      }

      return sdkProxy.cloud.connections.updateSecurityGroups(cloudRef, {
        security_groups: normalized,
      });
    },
    onSuccess: (updated: CloudConnectionQueryRecord) => {
      syncCloudConnectionAfterMutation(queryClient, currentWorkspaceId, connection, updated);
      toast.success('Security groups saved');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save security groups'),
  });

  const toggleResourceType = (index: number, type: AwsSecurityGroupResourceType, checked: boolean) => {
    setRows((prev) => {
      const next = [...prev];
      const types = new Set(next[index].resourceTypes);
      if (checked) types.add(type);
      else types.delete(type);
      next[index] = { ...next[index], resourceTypes: [...types] as AwsSecurityGroupResourceType[] };
      return next;
    });
  };

  const updateRow = (index: number, patch: Partial<AwsRegisteredSecurityGroup>) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  if (connection.provider !== 'aws') return null;

  return (
    <div className="bg-white rounded-lg border border-grey-400 p-5 shadow-sm space-y-5">
      <p className="text-xs text-grey-600 leading-relaxed">
        Register EC2 security groups you manage in AWS. Use the tag in{' '}
        <code className="font-mono text-[11px]">securityGroups: [&quot;your-tag&quot;]</code> when
        provisioning RDS or Neptune. Ductape never modifies your inbound rules.
      </p>

      {managedGroup?.groupId ? (
        <p className="text-xs text-grey-600 leading-relaxed rounded-md border border-grey-300 bg-grey-50/60 p-3">
          You also have a Ductape-managed allowlist security group (
          <code className="font-mono text-[11px]">{managedGroup.groupId}</code>) on the{' '}
          <span className="font-medium text-grey">IP allowlist</span> tab. That group is created
          automatically and is not listed here.
        </p>
      ) : null}

      {!isActive ? (
        <p className="text-sm text-grey-600">
          Complete and validate this connection before registering security groups.
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {rows.length === 0 ? (
              <p className="text-sm text-grey-600">No security groups registered yet.</p>
            ) : (
              rows.map((row, index) => (
                <div key={index} className="rounded-lg border border-grey-300 p-4 space-y-3 bg-grey-50/40">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-grey">Group {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-red-600"
                      onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Tag</Label>
                      <Input
                        className="mt-1.5 font-mono text-sm"
                        placeholder="prod-rds"
                        value={row.tag}
                        onChange={(e) => updateRow(index, { tag: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Group ID</Label>
                      <Input
                        className="mt-1.5 font-mono text-sm"
                        placeholder="sg-0abc123def456"
                        value={row.groupId}
                        onChange={(e) => updateRow(index, { groupId: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {(['rds', 'neptune'] as const).map((type) => (
                      <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={row.resourceTypes.includes(type)}
                          onCheckedChange={(checked) =>
                            toggleResourceType(index, type, checked === true)
                          }
                        />
                        {type.toUpperCase()} (TCP {awsVpcInboundPort(type)})
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-grey-300">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setRows((prev) => [...prev, EMPTY_ROW()])}
            >
              <Plus className="h-4 w-4" />
              Add group
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>

          <details className="group rounded-lg border border-grey-300">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-grey">
              Setup guide — ports and inbound rules
              <ChevronDown className="h-4 w-4 text-grey-600 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-grey-300 px-4 py-4">
              <AwsSecurityGroupsGuide variant="panel" />
            </div>
          </details>
        </>
      )}
    </div>
  );
}
