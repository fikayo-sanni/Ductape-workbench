import CloudCopySnippet from '@/components/cloud/CloudCopySnippet';
import { useDuctapeApiProxyIps } from '@/components/cloud/useDuctapeApiProxyIps';
import type { SDKProxyService } from '@/services/sdkProxy';
import { cn } from '@/lib/utils';
import { AlertCircle, Globe, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

function toHostCidr(ip: string): string {
  return ip.includes('/') ? ip : `${ip}/32`;
}

export interface DuctapeApiProxyIpsPanelProps {
  sdkProxy: SDKProxyService;
  /** setup = shown during connection activation; panel = private access networking */
  variant?: 'setup' | 'panel';
  className?: string;
}

export default function DuctapeApiProxyIpsPanel({
  sdkProxy,
  variant = 'panel',
  className,
}: DuctapeApiProxyIpsPanelProps) {
  const isSetup = variant === 'setup';
  const { addresses, isLocalApi, resolvingHost, resolveHostError, refetchHost } =
    useDuctapeApiProxyIps(sdkProxy);

  return (
    <div
      className={cn(
        'rounded-lg border p-4 sm:p-5 shadow-sm space-y-4',
        isSetup ? 'border-primary/25 bg-primary/5' : 'border-grey-300/80 bg-grey-100/40',
        className,
      )}
    >
      <div>
        {isSetup ? (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Required for workbench access — IP allowlist
          </p>
        ) : null}
        <h3 className="text-sm font-semibold text-grey flex items-center gap-2 mt-1">
          <Globe className="h-4 w-4 text-primary shrink-0" />
          Workbench access IPs
        </h3>
        <p className="text-xs text-grey-600 mt-1 leading-relaxed">
          {isSetup ? (
            <>
              Resolve the IPv4 addresses this workbench uses to reach your Atlas cluster, then add them
              to <span className="font-medium text-grey">Network Access</span> (or sync automatically
              after activation under Private access).
            </>
          ) : (
            <>
              Resolve and copy the IPv4 addresses to allowlist so this workbench can reach your database
              through Ductape.
            </>
          )}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-grey">Workbench IP addresses (/32)</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetchHost()}
          disabled={resolvingHost}
          className="gap-1.5 shrink-0 h-8"
        >
          {resolvingHost ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {resolvingHost ? 'Resolving…' : 'Check IPs'}
        </Button>
      </div>

      {isLocalApi ? (
        <div className="flex gap-2 text-xs text-amber-800 bg-amber-500/10 border border-amber-500/25 rounded-md p-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>
            Local development cannot resolve a real workbench access IP from this machine. Open this
            screen on your deployed or self-hosted workbench, then check IPs again.
          </p>
        </div>
      ) : null}

      {resolveHostError ? (
        <p className="text-xs text-red-600">Could not resolve workbench IPs. Try Check IPs again.</p>
      ) : resolvingHost && addresses.length === 0 ? (
        <p className="text-xs text-grey-600 flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Resolving IP addresses…
        </p>
      ) : addresses.length > 0 ? (
        <ul className="space-y-2">
          {addresses.map((ip) => {
            const cidr = toHostCidr(ip);
            return (
              <li key={ip}>
                <CloudCopySnippet
                  value={cidr}
                  label={`Workbench access ${cidr}`}
                  className="w-full max-w-none"
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-grey-600">
          Click <span className="font-medium text-grey">Check IPs</span> to resolve workbench access
          addresses for Atlas Network Access.
        </p>
      )}

      {isSetup && addresses.length > 0 ? (
        <p className="text-xs text-grey-600 leading-relaxed border-t border-primary/15 pt-3">
          In Atlas: Project → Network Access → Add IP Address → paste each{' '}
          <span className="font-mono text-[11px]">/32</span> entry above. You can also sync from
          Private access after activating this connection.
        </p>
      ) : null}
    </div>
  );
}
