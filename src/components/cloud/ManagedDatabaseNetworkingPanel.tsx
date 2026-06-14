import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Globe, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import toast from 'react-hot-toast';
import {
  getCloudManagedNetworking,
  type IAllowedSourceCidr,
} from '@/components/cloud/awsManagedNetworking';
import { CLOUD_PROVIDER_GUIDES, type CloudProvider } from '@/components/cloud/cloudSetupGuide';
import type { SDKProxyService } from '@/services/sdkProxy';
import DuctapeApiProxyIpsPanel from '@/components/cloud/DuctapeApiProxyIpsPanel';
import { useDuctapeApiProxyIps } from '@/components/cloud/useDuctapeApiProxyIps';
import {
  cloudConnectionRef,
  isCloudConnectionActive,
  isManagedDatabaseProvider,
  syncCloudConnectionAfterMutation,
  type CloudConnectionQueryRecord,
} from '@/components/cloud/cloudConnection.constants';

type CustomRow = { cidr: string; label: string };

function customRowsFromSaved(sources: IAllowedSourceCidr[] | undefined): CustomRow[] {
  return (sources || [])
    .filter((s) => s.source === 'custom')
    .map((s) => ({
      cidr: s.cidr.replace(/\/32$/, '').includes('/') ? s.cidr : s.cidr,
      label: s.label || '',
    }));
}

export interface ManagedDatabaseNetworkingPanelProps {
  connection: {
    id?: string;
    tag?: string;
    provider?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  };
  sdkProxy: SDKProxyService;
}

export default function ManagedDatabaseNetworkingPanel({
  connection,
  sdkProxy,
}: ManagedDatabaseNetworkingPanelProps) {
  const provider = connection.provider;
  if (!isManagedDatabaseProvider(provider)) return null;

  const queryClient = useQueryClient();
  const cloudRef = cloudConnectionRef(connection);
  const isActive = isCloudConnectionActive(connection.status);
  const guide = CLOUD_PROVIDER_GUIDES[provider as CloudProvider];
  const networkingGuide = guide.networkingGuides?.[0];
  const { apiHostname, addresses: ductapeAddresses, isLocalApi } = useDuctapeApiProxyIps(sdkProxy);

  const saved = getCloudManagedNetworking(connection.metadata);
  const syncedIps = (
    (connection.metadata?.networking as { synced_ips?: string[] } | undefined)?.synced_ips || []
  ).filter(Boolean);

  const [includeDuctapeProxy, setIncludeDuctapeProxy] = useState(
    saved.include_ductape_proxy !== false,
  );
  const [showCustomSources, setShowCustomSources] = useState(
    (saved.allowed_sources || []).some((s) => s.source === 'custom'),
  );
  const [customRows, setCustomRows] = useState<CustomRow[]>(() => customRowsFromSaved(saved.allowed_sources));

  const savedDuctapeAddresses =
    saved.ductape_proxy_addresses?.length ? saved.ductape_proxy_addresses : ductapeAddresses;
  const effectiveDuctapeAddresses =
    ductapeAddresses.length > 0 ? ductapeAddresses : savedDuctapeAddresses;

  useEffect(() => {
    const next = getCloudManagedNetworking(connection.metadata);
    if (next.include_ductape_proxy !== undefined) {
      setIncludeDuctapeProxy(next.include_ductape_proxy !== false);
    }
    const custom = customRowsFromSaved(next.allowed_sources);
    if (custom.length) {
      setShowCustomSources(true);
      setCustomRows(custom);
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
      include_ductape_proxy: includeDuctapeProxy,
      ductape_proxy_host: apiHostname,
      ductape_proxy_addresses: effectiveDuctapeAddresses,
      allowed_sources,
    };
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!cloudRef) throw new Error('No connection');
      return sdkProxy.cloud.connections.updateManagedNetworking(cloudRef, buildPayload());
    },
    onSuccess: (updated: CloudConnectionQueryRecord) => {
      syncCloudConnectionAfterMutation(queryClient, connection, updated);
      const meta = updated.metadata?.networking as { synced_ips?: string[] } | undefined;
      const added = meta?.synced_ips?.length ?? 0;
      if (provider === 'mongodb_atlas') {
        toast.success(
          added > 0 ? `Atlas IP access list updated (${added} new)` : 'Atlas IP access list synced',
        );
      } else {
        toast.success('Allowlist saved — apply these IPs in the Aura console if needed');
      }
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to sync allowlist'),
  });

  const previewCidrs = useMemo(() => {
    const items: { cidr: string; label: string }[] = [];
    if (includeDuctapeProxy) {
      for (const ip of effectiveDuctapeAddresses) {
        items.push({ cidr: `${ip}/32`, label: 'Workbench access' });
      }
    }
    for (const row of customRows) {
      if (!row.cidr.trim()) continue;
      const cidr = row.cidr.includes('/') ? row.cidr : `${row.cidr.trim()}/32`;
      items.push({ cidr, label: row.label.trim() || 'Custom' });
    }
    return items;
  }, [includeDuctapeProxy, effectiveDuctapeAddresses, customRows]);

  return (
    <div className="bg-white rounded-lg border border-grey-400 p-5 shadow-sm space-y-5">
      {!isActive ? (
        <p className="text-sm text-grey-600">
          Complete and validate this connection before configuring IP allowlisting.
        </p>
      ) : (
        <>
          <div>
            <h2 className="text-sm font-semibold text-grey flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              {networkingGuide?.title || 'IP allowlist'}
            </h2>
            <p className="text-xs text-grey-600 mt-1 leading-relaxed">
              {networkingGuide?.summary ||
                'Allow Ductape proxy traffic so products can reach your managed database.'}
            </p>
          </div>

          <DuctapeApiProxyIpsPanel sdkProxy={sdkProxy} variant="panel" />

          <div className="flex items-center gap-2">
            <Checkbox
              id="include-ductape-proxy-managed-db"
              checked={includeDuctapeProxy}
              onCheckedChange={(v) => setIncludeDuctapeProxy(v === true)}
              disabled={!effectiveDuctapeAddresses.length || isLocalApi}
            />
            <Label htmlFor="include-ductape-proxy-managed-db" className="text-sm font-normal cursor-pointer">
              Include workbench access IPs
            </Label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Additional IPs (optional)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCustomSources(true);
                  setCustomRows((rows) => [...rows, { cidr: '', label: '' }]);
                }}
                className="h-8 gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add IP
              </Button>
            </div>
            {showCustomSources &&
              customRows.map((row, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="203.0.113.10 or 203.0.113.0/24"
                    value={row.cidr}
                    onChange={(e) => {
                      const next = [...customRows];
                      next[index] = { ...next[index], cidr: e.target.value };
                      setCustomRows(next);
                    }}
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-grey-600"
                    onClick={() => setCustomRows(customRows.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
          </div>

          {previewCidrs.length > 0 && (
            <div className="rounded-lg border border-grey-300/80 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-grey-600">
                IPs to allow
              </p>
              <ul className="space-y-1">
                {previewCidrs.map((item) => (
                  <li key={item.cidr} className="text-xs text-grey-600 flex justify-between gap-2">
                    <span className="font-mono text-grey">{item.cidr}</span>
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {syncedIps.length > 0 && provider === 'mongodb_atlas' && (
            <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-500/10 rounded-lg p-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Last sync added to Atlas</p>
                <p className="text-xs mt-1 font-mono">{syncedIps.join(', ')}</p>
              </div>
            </div>
          )}

          {provider === 'neo4j_aura' && (
            <p className="text-xs text-grey-600 leading-relaxed">
              Aura does not expose a public IP allowlist API. Saving records the intended list on this
              connection — add the same IPs in Aura Console → your instance → Security.
            </p>
          )}

          <div className="flex justify-end pt-2 border-t border-grey-400">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || previewCidrs.length === 0}
              className="gap-2"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {provider === 'mongodb_atlas' ? 'Sync to Atlas' : 'Save allowlist'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
