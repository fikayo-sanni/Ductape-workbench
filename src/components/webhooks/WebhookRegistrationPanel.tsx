import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Copy,
  Check,
  Link2,
  Loader2,
  Save,
  Globe,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/useAuth';
import { useDuctape } from '@/hooks/useDuctape';
import {
  getWebhookProxyUrl,
  getWebhookRegistrationSummary,
  isEnvRegistered,
  type WebhookRegistrationConfig,
} from '@/utils/productWebhookRegistration';

interface WebhookRegistrationPanelProps {
  webhookTag: string;
  webhookName: string;
  productTag: string;
  accessTag: string;
  productEnvs?: Array<{ slug: string; env_name?: string }>;
  appEnvSlugs?: string[];
}

const HTTP_METHODS = ['POST', 'PUT', 'PATCH'] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

type EnvDraft = {
  consumerUrl: string;
  method: HttpMethod;
};

export default function WebhookRegistrationPanel({
  webhookTag,
  webhookName,
  productTag,
  accessTag,
  productEnvs = [],
  appEnvSlugs = [],
}: WebhookRegistrationPanelProps) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, EnvDraft>>({});
  const [savingEnv, setSavingEnv] = useState<string | null>(null);

  const productDuctape = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product',
  }) as {
    init: (tag: string) => Promise<void>;
    apps: {
      webhooks: {
        list: (product: string, access: string) => Promise<
          Array<{ tag: string; config?: WebhookRegistrationConfig[] }>
        >;
        generateLink: (data: {
          product: string;
          access_tag: string;
          webhook_tag: string;
          env: string;
          url: string;
          method: string;
        }) => Promise<string | { link?: string; data?: { link?: string } }>;
      };
    };
  } | null;

  const registrationQueryKey = [
    'product-webhook-registrations',
    productTag,
    accessTag,
  ] as const;

  const { data: registrationRows, isLoading: loadingConfig } = useQuery({
    queryKey: [...registrationQueryKey, webhookTag],
    queryFn: async () => {
      if (!productDuctape || !productTag || !accessTag) return [];
      await productDuctape.init(productTag);
      const webhooks = await productDuctape.apps.webhooks.list(productTag, accessTag);
      const collection = webhooks?.find((w) => w.tag === webhookTag);
      return collection?.config ?? [];
    },
    enabled: Boolean(productDuctape && productTag && accessTag && webhookTag),
  });

  const summary = useMemo(
    () => getWebhookRegistrationSummary(registrationRows, productEnvs),
    [registrationRows, productEnvs]
  );

  useEffect(() => {
    const next: Record<string, EnvDraft> = {};
    for (const env of productEnvs) {
      const reg = registrationRows?.find((c) => c.productEnv === env.slug);
      next[env.slug] = {
        consumerUrl: reg?.url || '',
        method: (reg?.method as HttpMethod) || 'POST',
      };
    }
    setDrafts(next);
  }, [registrationRows, productEnvs]);

  const invalidateRegistration = () => {
    queryClient.invalidateQueries({ queryKey: [...registrationQueryKey] });
    queryClient.invalidateQueries({
      queryKey: ['webhook-registration', productTag, accessTag, webhookTag],
    });
  };

  const saveEnvRegistration = async (productEnvSlug: string) => {
    if (!productDuctape) throw new Error('Ductape not initialized');
    const draft = drafts[productEnvSlug];
    if (!draft?.consumerUrl.trim()) {
      throw new Error('Consumer URL is required');
    }

    await productDuctape.init(productTag);

    const link = await productDuctape.apps.webhooks.generateLink({
      product: productTag,
      access_tag: accessTag,
      webhook_tag: webhookTag,
      env: productEnvSlug,
      url: draft.consumerUrl.trim(),
      method: draft.method,
    });

    return typeof link === 'string' ? link : link?.link ?? link?.data?.link;
  };

  const { mutateAsync: saveOne, isPending: isSavingOne } = useMutation({
    mutationFn: saveEnvRegistration,
    onSuccess: (_, productEnvSlug) => {
      invalidateRegistration();
      const wasRegistered = isEnvRegistered(registrationRows, productEnvSlug);
      toast.success(wasRegistered ? 'Registration updated' : 'Environment registered');
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Registration failed');
    },
    onSettled: () => setSavingEnv(null),
  });

  const { mutateAsync: saveAll, isPending: isSavingAll } = useMutation({
    mutationFn: async () => {
      const toSave = productEnvs.filter((env) => drafts[env.slug]?.consumerUrl.trim());
      if (toSave.length === 0) {
        throw new Error('Enter at least one consumer URL');
      }
      const errors: string[] = [];
      let saved = 0;
      for (const env of toSave) {
        try {
          await saveEnvRegistration(env.slug);
          saved += 1;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed';
          errors.push(`${env.env_name || env.slug}: ${msg}`);
        }
      }
      return { saved, errors };
    },
    onSuccess: (result) => {
      invalidateRegistration();
      if (result.errors.length > 0) {
        toast.error(
          `Saved ${result.saved} environment(s). ${result.errors.length} failed.`
        );
      } else {
        toast.success(
          `Registered ${result.saved} environment${result.saved === 1 ? '' : 's'}`
        );
      }
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Registration failed');
    },
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    toast.success('Copied');
    setTimeout(() => setCopied(null), 2000);
  };

  const updateDraft = (slug: string, patch: Partial<EnvDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], ...patch },
    }));
  };

  const envsWithUrl = productEnvs.filter((e) => drafts[e.slug]?.consumerUrl.trim()).length;

  if (productEnvs.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
        <p className="text-sm text-grey-600">
          No environments are mapped between this product and app. Map product environments
          to app environments on the connected app, then register consumer endpoints here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm space-y-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-grey flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Register for product
            </h2>
            <p className="text-sm text-grey-600 mt-1">
              Set your consumer URL per product environment for{' '}
              <strong>{webhookName}</strong>. Use the Ductape proxy URL on the third-party
              dashboard.
            </p>
          </div>
          <span
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0',
              summary.fullyRegistered
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                : summary.anyRegistered
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-grey-100 text-grey-600 border-grey-300'
            )}
          >
            {summary.registered}/{summary.total} registered
          </span>
        </div>
        {appEnvSlugs.length > 0 && (
          <p className="text-xs text-grey-500 mt-2 flex items-center gap-1">
            <Globe className="h-3 w-3" />
            App webhook envs: {appEnvSlugs.join(', ')}
          </p>
        )}
      </div>

      {loadingConfig ? (
        <div className="flex items-center justify-center py-10 text-grey-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading registration status…
        </div>
      ) : (
        <div className="space-y-4">
          {productEnvs.map((env) => {
            const slug = env.slug;
            const draft = drafts[slug] || { consumerUrl: '', method: 'POST' as HttpMethod };
            const reg = registrationRows?.find((c) => c.productEnv === slug);
            const registered = isEnvRegistered(registrationRows, slug);
            const proxyUrl = reg?.uuid ? getWebhookProxyUrl(reg.uuid) : null;
            const isSavingThis = savingEnv === slug && isSavingOne;

            return (
              <div
                key={slug}
                className={cn(
                  'rounded-lg border p-4 space-y-3',
                  registered
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-grey-300 bg-grey-50/40'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-white border border-grey-300 flex items-center justify-center flex-shrink-0">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-grey">
                        {env.env_name || slug}
                      </p>
                      <p className="text-[11px] font-mono text-grey-500">{slug}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium inline-flex items-center gap-1 flex-shrink-0',
                      registered
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-grey-200 text-grey-600'
                    )}
                  >
                    {registered ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        Registered
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3" />
                        Not registered
                      </>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_7rem] gap-3">
                  <div>
                    <Label className="text-xs">Your consumer endpoint</Label>
                    <Input
                      className="mt-1 font-mono text-sm"
                      placeholder="https://your-api.com/webhooks/receive"
                      value={draft.consumerUrl}
                      onChange={(e) =>
                        updateDraft(slug, { consumerUrl: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Method</Label>
                    <Select
                      value={draft.method}
                      onValueChange={(v) =>
                        updateDraft(slug, { method: v as HttpMethod })
                      }
                    >
                      <SelectTrigger className="mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HTTP_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {proxyUrl && (
                  <div className="rounded-md border border-green/30 bg-white p-3 space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wide text-grey-500">
                      Ductape proxy URL (third party)
                    </Label>
                    <div className="flex gap-2">
                      <code className="flex-1 text-[11px] font-mono break-all text-grey-700">
                        {proxyUrl}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 flex-shrink-0"
                        onClick={() => handleCopy(proxyUrl)}
                      >
                        {copied === proxyUrl ? (
                          <Check className="h-3.5 w-3.5 text-green" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    {reg?.active && (
                      <p className="text-[11px] text-green font-medium">Active</p>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant={registered ? 'outline' : 'default'}
                    className="gap-1.5 h-8"
                    disabled={isSavingThis || isSavingAll || !draft.consumerUrl.trim()}
                    onClick={() => {
                      setSavingEnv(slug);
                      saveOne(slug);
                    }}
                  >
                    {isSavingThis ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-grey-300">
        <p className="text-xs text-grey-500">
          {envsWithUrl} of {productEnvs.length} environments have a consumer URL
        </p>
        <Button
          type="button"
          onClick={() => saveAll()}
          disabled={loadingConfig || isSavingAll || isSavingOne || envsWithUrl === 0}
          className="gap-2"
        >
          {isSavingAll ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save all environments
        </Button>
      </div>
    </div>
  );
}
