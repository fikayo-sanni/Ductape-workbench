import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertTriangle, ChevronDown, ChevronRight, Info, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useResilienceProxy } from '@/hooks/useResilienceProxy';
import { cn } from '@/lib/utils';
import {
  WINDOW_UNITS,
  buildPayload,
  describePolicy,
  describeStrategy,
  emptyForm,
  formFromPolicy,
  hasErrors,
  slugify,
  validateForm,
  type FormErrors,
  type OverrideForm,
  type RateLimitForm,
  type WindowUnit,
} from '@/utils/rateLimitForm';
import type { StoredPolicy } from '@/utils/rateLimitSummary';

export type RateLimitDialogMode = 'create' | 'version' | 'details';

const KEY_SUGGESTIONS = ['user_id', 'ip', 'api_key', 'session_id'];

const STRATEGIES = [
  { id: 'fixed', label: 'Fixed window', help: 'The count resets at the end of each interval. Simple and cheap.' },
  { id: 'sliding', label: 'Sliding window', help: 'Counts requests in the most recent interval. Smoother, no burst at the boundary.' },
] as const;

const FAILURE_POLICIES = [
  { id: 'fail_closed', label: 'Block requests', help: 'Safer: nothing gets through while the limiter cannot be reached.' },
  { id: 'fail_open', label: 'Let requests through', help: 'Keeps your product available, but the limit is not enforced until the limiter is back.' },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: RateLimitDialogMode;
  product: any;
  /** The policy being versioned or edited. */
  policy?: StoredPolicy | null;
  /** Every tag on the product, deleted ones included: tags are never reused. */
  takenTags: string[];
  onDone: () => void;
}

const stripPrefix = (message: string) => message.replace(/^Validation error:\s*/i, '');

export default function RateLimitFormDialog({ open, onOpenChange, mode, product, policy, takenTags, onDone }: Props) {
  const proxy = useResilienceProxy();
  const envSlugs = useMemo(() => (product?.envs ?? []).map((env: any) => env.slug as string), [product?.envs]);
  const [form, setForm] = useState<RateLimitForm>(() => emptyForm(envSlugs));
  const [details, setDetails] = useState({ name: '', description: '' });
  const [keyDraft, setKeyDraft] = useState('');
  const [showOverrides, setShowOverrides] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Start from a clean form (or the policy being versioned) when the dialog opens, and only then:
  // a background refresh of the product must not wipe what the user is typing.
  const wasOpen = useRef(false);
  useEffect(() => {
    const opening = open && !wasOpen.current;
    wasOpen.current = open;
    if (!opening) return;
    setSubmitted(false);
    setServerError(null);
    setKeyDraft('');
    if (mode === 'details') {
      setDetails({ name: policy?.name && policy.name !== policy.tag ? policy.name : '', description: policy?.description ?? '' });
      return;
    }
    const next = mode === 'version' && policy ? formFromPolicy(policy as any, envSlugs, takenTags) : emptyForm(envSlugs);
    setForm(next);
    setShowOverrides(next.overrides.some(item => item.enabled));
  }, [open, mode, policy, envSlugs, takenTags]);

  const errors: FormErrors = useMemo(() => (mode === 'details' ? {} : validateForm(form, takenTags)), [form, takenTags, mode]);
  const shown: FormErrors = submitted ? errors : {};

  const mutation = useMutation({
    mutationFn: async () => {
      if (!proxy) throw new Error('Not signed in to a workspace');
      if (!product?.tag) throw new Error('Product tag not found');
      if (mode === 'details') {
        return proxy.rateLimits.policies.update(product.tag, policy!.tag, { name: details.name.trim() || undefined, description: details.description });
      }
      return proxy.rateLimits.policies.create(product.tag, buildPayload(form));
    },
    onSuccess: () => {
      toast.success(mode === 'details' ? 'Details updated' : mode === 'version' ? `Published ${form.tag}` : 'Rate limit created');
      onOpenChange(false);
      onDone();
    },
    onError: (error: any) => setServerError(stripPrefix(error?.message || 'Could not save the rate limit')),
  });

  const patch = (changes: Partial<RateLimitForm>) => setForm(current => ({ ...current, ...changes }));
  const patchOverride = (slug: string, changes: Partial<OverrideForm>) =>
    setForm(current => ({ ...current, overrides: current.overrides.map(item => (item.slug === slug ? { ...item, ...changes } : item)) }));

  const addKey = (raw: string) => {
    const value = raw.trim().replace(/,+$/, '');
    if (!value || form.keys.includes(value)) {
      setKeyDraft('');
      return;
    }
    patch({ keys: [...form.keys, value] });
    setKeyDraft('');
  };

  const submit = () => {
    setSubmitted(true);
    setServerError(null);
    if (mode !== 'details' && hasErrors(errors)) return;
    mutation.mutate();
  };

  const title = mode === 'details' ? 'Edit details' : mode === 'version' ? `New version of ${policy?.tag}` : 'Add rate limit';
  const preview = describePolicy({
    limit: Number(form.limit) || undefined,
    window: form.windowAmount ? `${Number(form.windowAmount)}${form.windowUnit}` : undefined,
    key: form.keys,
  });

  return (
    <Dialog open={open} onOpenChange={next => !mutation.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-grey">{title}</DialogTitle>
          <DialogDescription>
            {mode === 'details'
              ? 'Only the name and description can change. The limits are fixed for this tag.'
              : 'Cap how often something can happen, such as sign-in attempts per user or API calls per key.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'version' ? (
          <div className="flex gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-grey-600 sm:text-sm">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <p>
              Limits cannot be edited once published, because counters are tied to them. This publishes the changes under a new tag. <strong>{policy?.tag}</strong> keeps working until your code or settings switch to the new tag.
            </p>
          </div>
        ) : null}

        {mode === 'details' ? (
          <div className="space-y-4">
            <Field label="Name" hint="Shown in the Workbench. Leave empty to show the tag.">
              <Input value={details.name} onChange={event => setDetails({ ...details, name: event.target.value })} placeholder={policy?.tag} />
            </Field>
            <Field label="Description">
              <Textarea value={details.description} onChange={event => setDetails({ ...details, description: event.target.value })} rows={3} />
            </Field>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" error={shown.name}>
                <Input
                  value={form.name}
                  placeholder="Login attempts"
                  onChange={event => {
                    const name = event.target.value;
                    patch({ name, ...(form.tagEdited ? {} : { tag: slugify(name) }) });
                  }}
                />
              </Field>
              <Field label="Tag" error={shown.tag} hint="What your code uses to refer to this policy. Permanent once created.">
                <Input value={form.tag} placeholder="login-attempts" className="font-mono" onChange={event => patch({ tag: event.target.value, tagEdited: true })} />
              </Field>
            </div>

            <Field label="Description">
              <Textarea value={form.description} onChange={event => patch({ description: event.target.value })} rows={2} placeholder="What this limit protects" />
            </Field>

            <Field label="Count requests by" error={shown.keys} hint="Each distinct combination gets its own counter. For example, user_id gives every user their own limit.">
              <div className={cn('flex flex-wrap items-center gap-1.5 rounded-md border bg-white p-2', shown.keys ? 'border-red' : 'border-grey-400')}>
                {form.keys.map(key => (
                  <span key={key} className="inline-flex items-center gap-1 rounded bg-primary/10 py-0.5 pl-2 pr-1 font-mono text-xs text-primary">
                    {key}
                    <button type="button" aria-label={`Remove ${key}`} onClick={() => patch({ keys: form.keys.filter(item => item !== key) })} className="rounded p-0.5 hover:bg-primary/20">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={keyDraft}
                  onChange={event => setKeyDraft(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ',') {
                      event.preventDefault();
                      addKey(keyDraft);
                    } else if (event.key === 'Backspace' && !keyDraft && form.keys.length) {
                      patch({ keys: form.keys.slice(0, -1) });
                    }
                  }}
                  onBlur={() => addKey(keyDraft)}
                  placeholder={form.keys.length ? 'Add another' : 'user_id'}
                  aria-label="Field to count by"
                  className="min-w-24 flex-1 bg-transparent px-1 py-0.5 font-mono text-xs outline-none"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {KEY_SUGGESTIONS.filter(item => !form.keys.includes(item)).map(item => (
                  <button key={item} type="button" onClick={() => addKey(item)} className="inline-flex items-center gap-1 rounded-full border border-grey-400 px-2 py-0.5 font-mono text-[11px] text-grey-600 hover:border-primary hover:text-primary">
                    <Plus className="h-3 w-3" />
                    {item}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Allow up to" error={shown.limit}>
                <div className="flex items-center gap-2">
                  <Input inputMode="numeric" value={form.limit} onChange={event => patch({ limit: event.target.value })} className="w-28" />
                  <span className="text-sm text-grey-600">requests</span>
                </div>
              </Field>
              <Field label="Every" error={shown.window}>
                <div className="flex items-center gap-2">
                  <Input inputMode="numeric" value={form.windowAmount} onChange={event => patch({ windowAmount: event.target.value })} className="w-24" />
                  <WindowUnitSelect value={form.windowUnit} onChange={windowUnit => patch({ windowUnit })} />
                </div>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="How it counts" hint={STRATEGIES.find(item => item.id === form.strategy)?.help}>
                <Select value={form.strategy} onValueChange={value => patch({ strategy: value as RateLimitForm['strategy'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STRATEGIES.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="If the limiter is unavailable" hint={FAILURE_POLICIES.find(item => item.id === form.failurePolicy)?.help}>
                <Select value={form.failurePolicy} onValueChange={value => patch({ failurePolicy: value as RateLimitForm['failurePolicy'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FAILURE_POLICIES.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {envSlugs.length ? (
              <div className="rounded-lg border border-grey-400">
                <button type="button" onClick={() => setShowOverrides(value => !value)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left" aria-expanded={showOverrides}>
                  <span>
                    <span className="block text-sm font-medium text-grey">Different limits per environment</span>
                    <span className="block text-xs text-grey-500">Optional. For example a higher limit in production than in sandbox.</span>
                  </span>
                  {showOverrides ? <ChevronDown className="h-4 w-4 text-grey-600" /> : <ChevronRight className="h-4 w-4 text-grey-600" />}
                </button>
                {showOverrides ? (
                  <div className="divide-y divide-grey-300 border-t border-grey-300">
                    {form.overrides.map(override => (
                      <OverrideRow key={override.slug} override={override} error={shown.overrides?.[override.slug]} onChange={changes => patchOverride(override.slug, changes)} />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-lg bg-grey-100 px-4 py-3 text-sm text-grey">
              <span className="text-xs font-semibold uppercase tracking-wide text-grey-500">Summary</span>
              <p className="mt-1">
                Allows {preview}. {describeStrategy(form.strategy).replace(/^./, character => character.toUpperCase())}; {form.failurePolicy === 'fail_open' ? 'requests are let through' : 'requests are blocked'} if the limiter is unavailable.
              </p>
            </div>
          </div>
        )}

        {serverError ? (
          <div role="alert" className="flex gap-2 rounded-lg border border-red/30 bg-red/5 p-3 text-sm text-red">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{serverError}</p>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending || !proxy}>
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === 'details' ? 'Save' : mode === 'version' ? 'Publish new version' : 'Create rate limit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-grey">{label}</Label>
      {children}
      {error ? <p className="text-xs text-red">{error}</p> : hint ? <p className="text-xs text-grey-500">{hint}</p> : null}
    </div>
  );
}

function WindowUnitSelect({ value, onChange }: { value: WindowUnit; onChange: (value: WindowUnit) => void }) {
  return (
    <Select value={value} onValueChange={next => onChange(next as WindowUnit)}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {WINDOW_UNITS.map(unit => (
          <SelectItem key={unit.id} value={unit.id}>
            {unit.plural}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function OverrideRow({ override, error, onChange }: { override: OverrideForm; error?: string; onChange: (changes: Partial<OverrideForm>) => void }) {
  return (
    <div className="space-y-3 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-sm text-grey">{override.slug}</span>
        <Switch checked={override.enabled} onCheckedChange={enabled => onChange({ enabled })} aria-label={`Override limits in ${override.slug}`} />
      </div>
      {override.enabled ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-grey-600">Requests allowed</Label>
              <Input inputMode="numeric" value={override.limit} placeholder="Same as default" onChange={event => onChange({ limit: event.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-grey-600">Every</Label>
              <div className="flex items-center gap-2">
                <Input inputMode="numeric" value={override.windowAmount} placeholder="Same" onChange={event => onChange({ windowAmount: event.target.value })} className="w-24" />
                <WindowUnitSelect value={override.windowUnit} onChange={windowUnit => onChange({ windowUnit })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-grey-600">How it counts</Label>
              <Select value={override.strategy || 'inherit'} onValueChange={value => onChange({ strategy: value === 'inherit' ? '' : (value as OverrideForm['strategy']) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Same as default</SelectItem>
                  {STRATEGIES.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-grey-600">If the limiter is unavailable</Label>
              <Select value={override.failurePolicy || 'inherit'} onValueChange={value => onChange({ failurePolicy: value === 'inherit' ? '' : (value as OverrideForm['failurePolicy']) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Same as default</SelectItem>
                  {FAILURE_POLICIES.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error ? <p className="text-xs text-red">{error}</p> : null}
        </>
      ) : null}
    </div>
  );
}
