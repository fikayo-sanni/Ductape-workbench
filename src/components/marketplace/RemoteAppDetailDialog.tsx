import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Download, ExternalLink, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MarkdownViewer } from '@/components/ui/markdown-editor';
import { useAuth } from '@/store/useAuth';
import { useWorkbenchStore } from '@/stores/workbench-store';
import appServicesReal from '@/services/appServicesReal';
import marketplaceServices from '@/services/marketplaceServices';
import remoteMarketplaceServices, {
  RemoteMarketplaceError,
  toRemoteError,
  type RemoteCatalogApp,
  type RemotePricingPlan,
  type RemoteStatus,
} from '@/services/remoteMarketplaceServices';

const KIND_LABELS: Record<string, string> = {
  free: 'Free',
  one_time: 'One-time purchase',
  subscription: 'Subscription',
  metered: 'Metered',
};

export const priceKindLabel = (kind: string | undefined | null) => (kind && KIND_LABELS[kind]) || kind || 'Unknown';

export function formatPlanPrice(plan: RemotePricingPlan): string {
  if (plan.kind === 'free' || plan.unit_price === null || plan.unit_price === undefined) return 'Free';
  const amount = `${plan.unit_price}${plan.currency ? ` ${plan.currency}` : ''}`;
  return plan.interval ? `${amount} / ${plan.interval}` : amount;
}

interface RemoteAppDetailDialogProps {
  app: RemoteCatalogApp | null;
  status: RemoteStatus | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RemoteAppDetailDialog({ app, status, open, onOpenChange }: RemoteAppDetailDialogProps) {
  const { user, currentWorkspaceId } = useAuth();
  const { openTab } = useWorkbenchStore();
  const queryClient = useQueryClient();
  const auth = { user_id: user?._id || '', public_key: user?.public_key || '' };
  const canCall = !!auth.user_id && !!auth.public_key;

  const [version, setVersion] = useState<string>('');
  const [planId, setPlanId] = useState<string>('');
  const [error, setError] = useState<RemoteMarketplaceError | null>(null);
  const [success, setSuccess] = useState<{ message: string; tag: string } | null>(null);
  const [openingApp, setOpeningApp] = useState(false);

  const remoteId = app?.remote_app_id;

  const {
    data: detail,
    isLoading,
    error: detailError,
  } = useQuery({
    queryKey: ['remote-marketplace', 'detail', remoteId],
    queryFn: () => remoteMarketplaceServices.fetchCatalogApp(auth, remoteId || ''),
    enabled: open && !!remoteId && canCall,
    staleTime: 1000 * 60,
  });

  // Reset the form whenever a different app is opened.
  useEffect(() => {
    setError(null);
    setSuccess(null);
    setVersion('');
    setPlanId('');
  }, [remoteId, open]);

  const versions = detail?.versions ?? [];
  const latestVersion = detail?.latest_version ?? app?.latest_version ?? null;
  const effectiveVersion = version || latestVersion || versions[0] || '';
  const plans = detail?.pricing?.plans ?? [];
  const priceKind = detail?.pricing?.kind;
  const isPaid = !!priceKind && priceKind !== 'free';
  const effectivePlanId = isPaid ? planId || plans[0]?.id || '' : '';

  const imported = detail?.imported ?? app?.imported ?? false;
  const localAppId = detail?.local_app_id ?? app?.local_app_id ?? null;
  const importedVersion = detail?.imported_version ?? app?.imported_version ?? null;
  const updateAvailable = detail?.update_available ?? app?.update_available ?? false;

  const atLimit = !!status && status.max_apps !== null && status.imported >= status.max_apps;
  const blockedByLimit = atLimit && !imported;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['remote-marketplace'] });
    void queryClient.invalidateQueries({ queryKey: ['apps'] });
  };

  const importMutation = useMutation({
    mutationFn: () =>
      remoteMarketplaceServices.importApp(auth, {
        workspace_id: currentWorkspaceId || '',
        remote_app_id: remoteId || '',
        version: effectiveVersion || undefined,
        plan_id: effectivePlanId || undefined,
      }),
    onMutate: () => {
      setError(null);
      setSuccess(null);
    },
    onSuccess: (result) => {
      const message = result.already_imported
        ? `${app?.app_name} was already imported.`
        : `${app?.app_name} was imported${result.version ? ` (version ${result.version})` : ''}.`;
      setSuccess({ message, tag: result.tag });
      toast.success(message);
      refresh();
    },
    onError: (err) => setError(toRemoteError(err, 'Failed to import the app')),
  });

  const updateMutation = useMutation({
    mutationFn: () => remoteMarketplaceServices.updateApp(auth, localAppId || '', latestVersion || undefined),
    onMutate: () => {
      setError(null);
      setSuccess(null);
    },
    onSuccess: (result) => {
      const message = `${app?.app_name} was updated to version ${result.version}.`;
      setSuccess({ message, tag: app?.tag || '' });
      toast.success(message);
      void queryClient.invalidateQueries({ queryKey: ['app', localAppId] });
      void queryClient.invalidateQueries({ queryKey: ['app-origin', localAppId] });
      refresh();
    },
    onError: (err) => setError(toRemoteError(err, 'Failed to update the app')),
  });

  const handleOpenApp = async (target: { tag?: string; appId?: string | null }) => {
    if ((!target.tag && !target.appId) || !canCall) return;
    setOpeningApp(true);
    try {
      const res = target.appId
        ? await marketplaceServices.fetchApp({ app_id: target.appId, ...auth })
        : await appServicesReal.fetchAppByTag({ tag: target.tag || '', ...auth });
      const full = res.data as any;
      openTab({
        id: `app-${full._id}`,
        type: 'app',
        title: full.app_name,
        itemId: full._id,
        data: { ...full, appViewMode: 'general' as const },
      });
      onOpenChange(false);
    } catch {
      toast.error('Failed to open the app');
    } finally {
      setOpeningApp(false);
    }
  };

  const busy = importMutation.isPending || updateMutation.isPending;
  const initials = (app?.app_name || '?')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const errorPlans = error?.plans?.length ? error.plans : plans;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-6">
            <div className="w-12 h-12 rounded-lg bg-grey-100 flex items-center justify-center border border-grey-400 p-1.5 flex-shrink-0">
              {app?.logo ? (
                <img src={app.logo} alt={app.app_name} className="w-full h-full object-cover rounded-sm" />
              ) : (
                <span className="text-primary font-bold">{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-grey break-words">{app?.app_name}</DialogTitle>
              <DialogDescription className="text-sm text-grey-600">
                {app?.publisher ? `By ${app.publisher}` : 'Hosted marketplace app'}
                {latestVersion ? ` - latest v${latestVersion}` : ''}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : detailError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {toRemoteError(detailError, 'Failed to load the app details').message}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {priceKind && (
                <Badge variant="outline" className="font-semibold">
                  {priceKindLabel(priceKind)}
                </Badge>
              )}
              {imported && (
                <Badge className="bg-green/10 text-green border-green/20">
                  Imported{importedVersion ? ` v${importedVersion}` : ''}
                </Badge>
              )}
              {imported && updateAvailable && (
                <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Update available</Badge>
              )}
              {typeof detail?.actions_count === 'number' && (
                <Badge variant="secondary">{detail.actions_count} actions</Badge>
              )}
              {(detail?.domains ?? app?.domains ?? []).map((d) => (
                <Badge key={d} variant="outline" className="text-grey-600 font-medium">
                  {d}
                </Badge>
              ))}
            </div>

            {(detail?.description || app?.description) && (
              <p className="text-sm text-grey-600 leading-relaxed">{detail?.description || app?.description}</p>
            )}
            {detail?.aboutText && <MarkdownViewer content={detail.aboutText} />}
            {(detail?.website || app?.website) && (
              <a
                href={detail?.website || app?.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline break-all"
              >
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                {detail?.website || app?.website}
              </a>
            )}

            {plans.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-grey">Pricing</h3>
                {isPaid && plans.length > 1 ? (
                  <RadioGroup value={effectivePlanId} onValueChange={setPlanId}>
                    {plans.map((plan) => (
                      <label
                        key={plan.id}
                        htmlFor={`plan-${plan.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-grey-400 p-3 cursor-pointer hover:border-primary/50"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <RadioGroupItem id={`plan-${plan.id}`} value={plan.id} />
                          <span className="text-sm text-grey truncate">{plan.name}</span>
                        </span>
                        <span className="text-sm font-medium text-grey flex-shrink-0">{formatPlanPrice(plan)}</span>
                      </label>
                    ))}
                  </RadioGroup>
                ) : (
                  <ul className="space-y-2">
                    {plans.map((plan) => (
                      <li
                        key={plan.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-grey-400 p-3"
                      >
                        <span className="text-sm text-grey truncate">{plan.name}</span>
                        <span className="text-sm font-medium text-grey flex-shrink-0">{formatPlanPrice(plan)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {versions.length > 0 && !imported && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-grey">Version</Label>
                <Select value={effectiveVersion} onValueChange={setVersion}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="Version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                        {v === latestVersion ? ' (Latest)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {versions.length > 0 && imported && (
              <p className="text-xs text-grey-600">Available versions: {versions.join(', ')}</p>
            )}

            {status && (
              <p className="text-sm text-grey-600">
                {status.max_apps === null
                  ? `${status.imported} apps imported (no limit on your licence)`
                  : `${status.imported} of ${status.max_apps} apps imported`}
              </p>
            )}

            {blockedByLimit && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                Your licence allows {status?.max_apps} imported apps and you have reached that limit. Uninstall an app or
                upgrade your licence to import more.
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="space-y-2 min-w-0">
                  <p className="break-words">{error.message}</p>
                  {error.status === 402 && (
                    <>
                      <p>Buy this app for your licence on the hosted marketplace, then import it again.</p>
                      {errorPlans.length > 0 && (
                        <ul className="space-y-1">
                          {errorPlans.map((plan) => (
                            <li key={plan.id} className="flex justify-between gap-3">
                              <span className="truncate">{plan.name}</span>
                              <span className="flex-shrink-0">{formatPlanPrice(plan)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2 rounded-lg border border-green/30 bg-green/10 p-3 text-sm text-green">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>{success.message}</p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Close
              </Button>
              {success && success.tag && (
                <Button variant="outline" onClick={() => handleOpenApp({ tag: success.tag })} disabled={openingApp}>
                  {openingApp && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Open app
                </Button>
              )}
              {imported && updateAvailable && localAppId ? (
                <Button onClick={() => updateMutation.mutate()} disabled={busy || !canCall}>
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  Update to v{latestVersion}
                </Button>
              ) : imported ? (
                !success && localAppId ? (
                  <Button variant="outline" onClick={() => handleOpenApp({ appId: localAppId })} disabled={openingApp}>
                    {openingApp && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Open app
                  </Button>
                ) : null
              ) : (
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={busy || !canCall || !currentWorkspaceId || blockedByLimit || !!success}
                  title={!currentWorkspaceId ? 'Select a workspace first' : undefined}
                >
                  {importMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  Import
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
