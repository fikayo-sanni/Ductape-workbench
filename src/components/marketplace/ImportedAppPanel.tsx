import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Download, Loader2, Lock, PackageCheck, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/useAuth';
import remoteMarketplaceServices, {
  toRemoteError,
  type OriginSummary,
} from '@/services/remoteMarketplaceServices';
import { appOriginQueryKey } from '@/hooks/useAppOrigin';

/** Days an app keeps working after its entitlement lapses or it is withdrawn. */
const GRACE_DAYS = 30;

export const LOCKED_APP_MESSAGE =
  'This app was imported from the hosted marketplace and belongs to its publisher. It is read-only here: update it to a newer version, or uninstall it.';

export function publisherName(origin: OriginSummary): string {
  return origin.publisher?.name || 'the publisher';
}

function formatDate(value: Date): string {
  return value.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** The date an app in the grace state stops working: withdrawn_at (else expires_at) plus the grace period. */
export function graceEndDate(origin: OriginSummary): Date | null {
  const base = origin.withdrawn_at || origin.expires_at;
  if (!base) return null;
  const start = new Date(base);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);
}

/** Compact badge for lists: "Imported", with the publisher and version in the hover title. */
export function ImportedBadge({ origin, className }: { origin: OriginSummary; className?: string }) {
  return (
    <span
      className={cn(
        'px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 bg-blue-500/10 text-blue-600',
        className,
      )}
      title={`Imported from ${publisherName(origin)}, version ${origin.imported_version}`}
    >
      Imported
    </span>
  );
}

interface ImportedAppPanelProps {
  appId: string;
  origin: OriginSummary;
  /** Called after the app's content changed (an update was applied) so the caller can reload it. */
  onChanged?: () => void | Promise<void>;
}

/**
 * Shows where an imported app came from, explains why it is read-only, warns when its entitlement has lapsed,
 * and lets the user check for and apply updates from the hosted marketplace.
 */
export default function ImportedAppPanel({ appId, origin, onChanged }: ImportedAppPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);

  const auth = { user_id: user?._id || '', public_key: user?.public_key || '' };
  const canAct = !!auth.user_id && !!auth.public_key;
  const graceEnd = graceEndDate(origin);

  const handleCheck = async () => {
    setChecking(true);
    try {
      const entries = await remoteMarketplaceServices.checkAppUpdates(auth, appId);
      const entry = entries.find((e) => e.app_id === appId) ?? entries[0];
      if (entry?.origin) {
        queryClient.setQueryData(appOriginQueryKey(appId), entry.origin);
        toast.success(
          entry.origin.available_version
            ? `Version ${entry.origin.available_version} is available`
            : 'This app is up to date',
        );
      } else {
        toast.success('This app is up to date');
      }
      void queryClient.invalidateQueries({ queryKey: ['apps'] });
    } catch (error) {
      toast.error(toRemoteError(error).message);
    } finally {
      setChecking(false);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const result = await remoteMarketplaceServices.updateApp(auth, appId, origin.available_version || undefined);
      toast.success(`Updated to version ${result.version}`);
      await queryClient.invalidateQueries({ queryKey: appOriginQueryKey(appId) });
      void queryClient.invalidateQueries({ queryKey: ['apps'] });
      void queryClient.invalidateQueries({ queryKey: ['app', appId] });
      void queryClient.invalidateQueries({ queryKey: ['remote-marketplace'] });
      await onChanged?.();
    } catch (error) {
      toast.error(toRemoteError(error).message);
    } finally {
      setUpdating(false);
    }
  };

  const busy = checking || updating;

  return (
    <div className="bg-white dark:bg-background rounded-lg border border-grey-300 dark:border-grey-400 p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1">
              <PackageCheck className="h-3 w-3" />
              Imported from {publisherName(origin)}
            </Badge>
            <Badge variant="outline">v{origin.imported_version}</Badge>
            {origin.entitlement_kind && (
              <Badge variant="outline" className="capitalize">
                {origin.entitlement_kind.replace(/_/g, ' ')}
              </Badge>
            )}
            {origin.locked && (
              <span
                className="inline-flex items-center gap-1 text-xs text-grey-600"
                title={LOCKED_APP_MESSAGE}
              >
                <Lock className="h-3 w-3" />
                Read-only
              </span>
            )}
          </div>
          {origin.locked && <p className="text-xs text-grey-600">{LOCKED_APP_MESSAGE}</p>}
          {origin.checked_at && (
            <p className="text-xs text-grey-600">
              Last checked {formatDate(new Date(origin.checked_at))}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCheck} disabled={busy || !canAct}>
            {checking ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Check for updates
          </Button>
          {origin.available_version && (
            <Button size="sm" onClick={handleUpdate} disabled={busy || !canAct}>
              {updating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Update to v{origin.available_version}
            </Button>
          )}
        </div>
      </div>

      {origin.state === 'grace' && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            Entitlement lapsed / app withdrawn. It keeps working
            {graceEnd ? ` until ${formatDate(graceEnd)}` : ' for a limited time'}.
          </p>
        </div>
      )}

      {origin.state === 'disabled' && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>This app is disabled. Renew it on the hosted marketplace and check for updates.</p>
        </div>
      )}
    </div>
  );
}
