import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Copy, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth';
import { useDuctape } from '@/hooks/useDuctape';
import { useProductWebhookRegistrations } from '@/hooks/useProductWebhookRegistrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { IWebhook } from '@/types/webhook';

type Registration = { product: string; access_tag: string; webhook_tag: string; env: string; url: string; method: string };
type Result = { tag: string; env: string; link?: string; error?: string };

interface Props {
  webhooks: IWebhook[];
  productTag: string;
  accessTag: string;
  productEnvs: Array<{ slug: string; env_name?: string }>;
  onBusyChange?: (busy: boolean) => void;
}

export default function BulkWebhookRegistrationPanel({ webhooks, productTag, accessTag, productEnvs, onBusyChange }: Props) {
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('POST');
  const [environments, setEnvironments] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [results, setResults] = useState<Result[]>([]);
  const { data: registrations, isLoading, isError } = useProductWebhookRegistrations(productTag, accessTag, true);
  const sdk = useDuctape({
    workspace_id: currentWorkspaceId || '', user_id: user?._id || '',
    token: user?.auth_token || '', public_key: user?.public_key || '', type: 'product',
  }) as { init: (tag: string) => Promise<void>; apps: { webhooks: {
    generateLink: (data: Registration) => Promise<string | { link?: string; data?: { link?: string } }>;
  } } } | null;

  const existingCount = webhooks.reduce((count, webhook) => count + environments.filter(env =>
    !results.some(result => result.tag === webhook.tag && result.env === env && result.link) &&
    registrations?.find(row => row.tag === webhook.tag)?.config?.some(config => config.productEnv === env && (config.url || config.uuid))
  ).length, 0);
  const changed = () => { setResults([]); setConfirmed(false); };
  const failed = results.filter(result => result.error);

  const save = async (retryOnly = false) => {
    if (inFlight.current || !sdk || !environments.length || !webhooks.length) return;
    let endpoint: URL;
    try { endpoint = new URL(url.trim()); } catch { toast.error('Enter a valid consumer URL'); return; }
    if (!['https:', 'http:'].includes(endpoint.protocol) || endpoint.username || endpoint.password) {
      toast.error('Use an HTTP or HTTPS URL without embedded credentials'); return;
    }
    if (existingCount && !confirmed) return;
    const targets = retryOnly ? failed : webhooks.flatMap(webhook => environments.map(env => ({ tag: webhook.tag, env })));
    inFlight.current = true;
    setBusy(true);
    onBusyChange?.(true);
    let next = retryOnly ? results.filter(result => !result.error) : [];
    setResults(next);
    try {
      await sdk.init(productTag);
      for (const target of targets) {
        let result: Result;
        try {
          const current = useAuth.getState();
          if (current.currentWorkspaceId !== currentWorkspaceId || current.user?._id !== user?._id) {
            throw new Error('Workspace or account changed; registration stopped');
          }
          const response = await sdk.apps.webhooks.generateLink({
            product: productTag, access_tag: accessTag, webhook_tag: target.tag,
            env: target.env, url: url.trim(), method,
          });
          const link = typeof response === 'string' ? response : response?.link ?? response?.data?.link;
          if (!link) throw new Error('No proxy URL returned; verify registration before retrying');
          result = { tag: target.tag, env: target.env, link };
        } catch (error) {
          result = { tag: target.tag, env: target.env, error: error instanceof Error ? error.message : 'Registration failed' };
        }
        next = [...next, result];
        setResults(next);
      }
      if (next.some(result => result.error)) toast.error('Some registrations failed. Review the results below.', { id: 'bulk-webhook-registration' });
      else toast.success(`${next.length} registrations saved`, { id: 'bulk-webhook-registration' });
    } catch (error) {
      setResults([...next, ...targets.map(target => ({ ...target, error: error instanceof Error ? error.message : 'Registration failed' }))]);
      toast.error('Could not initialize registration');
    } finally {
      void queryClient.invalidateQueries({ queryKey: ['product-webhook-registrations', productTag, accessTag] });
      for (const webhook of webhooks) {
        void queryClient.invalidateQueries({ queryKey: ['webhook-registration', productTag, accessTag, webhook.tag] });
      }
      inFlight.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  };

  return <div className="space-y-5 min-w-0">
    <ul className="max-h-40 overflow-auto text-sm text-grey divide-y divide-grey-300">
      {webhooks.map(webhook => <li key={webhook.tag} className="py-2 break-words">{webhook.name || webhook.tag}</li>)}
    </ul>
    <fieldset disabled={busy} className="space-y-4 min-w-0">
      <div className="space-y-2">
        <Label htmlFor="bulk-webhook-url">Consumer endpoint</Label>
        <Input id="bulk-webhook-url" className="text-grey" value={url} placeholder="https://your-api.com/webhooks/receive"
          onChange={event => { changed(); setUrl(event.target.value); }} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bulk-webhook-method">Method</Label>
        <Select value={method} disabled={busy} onValueChange={value => { changed(); setMethod(value); }}>
          <SelectTrigger id="bulk-webhook-method"><SelectValue /></SelectTrigger>
          <SelectContent>{['POST', 'PUT', 'PATCH'].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Product environments</Label>
        {productEnvs.map(env => <label key={env.slug} className="flex items-center gap-2 text-sm text-grey">
          <Checkbox disabled={busy} checked={environments.includes(env.slug)} onCheckedChange={checked => {
            changed(); setEnvironments(values => checked === true ? [...values, env.slug] : values.filter(value => value !== env.slug));
          }} />{env.env_name || env.slug}
        </label>)}
      </div>
      {existingCount > 0 && <label className="flex items-start gap-2 text-sm text-grey">
        <Checkbox className="mt-0.5" disabled={busy} checked={confirmed} onCheckedChange={checked => setConfirmed(checked === true)} />
        Update {existingCount} existing registration{existingCount === 1 ? '' : 's'} with this endpoint and method
      </label>}
    </fieldset>
    <p className="text-xs text-grey-600">Each webhook keeps its own Ductape proxy URL. Provider-side registration is unchanged.</p>
    {isError && <p role="alert" className="text-sm text-red">Could not check existing registrations. Reopen this panel to retry.</p>}
    <Button className="gap-2" disabled={!sdk || busy || isLoading || isError || !url.trim() || !environments.length || (results.length > 0 && failed.length === 0) || (existingCount > 0 && !confirmed)}
      onClick={() => void save(failed.length > 0)}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {busy ? 'Saving...' : failed.length ? `Retry ${failed.length} failed` : results.length ? 'Registrations saved' : 'Save registrations'}
    </Button>
    {results.length > 0 && <ul aria-label="Registration results" className="divide-y divide-grey-300 text-sm">
      {results.map(result => <li key={`${result.tag}:${result.env}`} className="py-3 space-y-1">
        <div className="flex gap-2 items-center text-grey break-all">
          {result.link && <CheckCircle className="h-4 w-4 shrink-0 text-green" />}{result.tag} / {result.env}
        </div>
        {result.error ? <p role="alert" className="text-red break-words">{result.error}</p> : <div className="flex gap-2 items-start">
          <code className="flex-1 min-w-0 text-xs break-all text-grey-600">{result.link}</code>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-grey-600" title="Copy proxy URL" aria-label={`Copy proxy URL for ${result.tag} ${result.env}`}
            onClick={() => void navigator.clipboard.writeText(result.link!).then(() => toast.success('Copied'), () => toast.error('Could not copy URL'))}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>}
      </li>)}
    </ul>}
  </div>;
}
