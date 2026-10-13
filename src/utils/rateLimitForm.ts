/**
 * Form model for creating a rate limit policy in the Workbench: turns what the user typed into the
 * payload the platform expects, and checks it with the same rules the platform and the SDK apply so
 * mistakes show up next to the field instead of as a failed request.
 */

export type WindowUnit = 's' | 'm' | 'h' | 'd';
export type Strategy = 'fixed' | 'sliding';
export type FailurePolicy = 'fail_open' | 'fail_closed';

export interface OverrideForm {
  slug: string;
  enabled: boolean;
  limit: string;
  windowAmount: string;
  windowUnit: WindowUnit;
  /** Empty string means "same as the default". */
  strategy: '' | Strategy;
  failurePolicy: '' | FailurePolicy;
}

export interface RateLimitForm {
  name: string;
  tag: string;
  /** True once the user typed in the tag field, so typing the name no longer rewrites it. */
  tagEdited: boolean;
  description: string;
  keys: string[];
  limit: string;
  windowAmount: string;
  windowUnit: WindowUnit;
  strategy: Strategy;
  failurePolicy: FailurePolicy;
  overrides: OverrideForm[];
  supersedes?: string;
}

export const WINDOW_UNITS: Array<{ id: WindowUnit; singular: string; plural: string; ms: number }> = [
  { id: 's', singular: 'second', plural: 'seconds', ms: 1000 },
  { id: 'm', singular: 'minute', plural: 'minutes', ms: 60_000 },
  { id: 'h', singular: 'hour', plural: 'hours', ms: 3_600_000 },
  { id: 'd', singular: 'day', plural: 'days', ms: 86_400_000 },
];

const NAME = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/;
const MAX_WINDOW_MS = 86_400_000;

export const emptyOverride = (slug: string): OverrideForm => ({
  slug,
  enabled: false,
  limit: '',
  windowAmount: '',
  windowUnit: 'm',
  strategy: '',
  failurePolicy: '',
});

export function emptyForm(envSlugs: string[]): RateLimitForm {
  return {
    name: '',
    tag: '',
    tagEdited: false,
    description: '',
    keys: [],
    limit: '100',
    windowAmount: '1',
    windowUnit: 'm',
    strategy: 'fixed',
    failurePolicy: 'fail_closed',
    overrides: envSlugs.map(emptyOverride),
  };
}

/** "Login attempts" becomes "login-attempts". */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 128);
}

/** login -> login-v2, login-v2 -> login-v3, skipping any tag that is already taken (deleted tags included). */
export function nextVersionTag(tag: string, takenTags: string[]): string {
  const base = tag.replace(/-v\d+$/, '');
  const taken = new Set(takenTags);
  let version = 2;
  while (taken.has(`${base}-v${version}`)) version += 1;
  return `${base}-v${version}`;
}

/** Split "90s", "15m", "1h" into the amount and unit the form shows. Millisecond windows become seconds. */
export function splitWindow(window: string): { amount: string; unit: WindowUnit } {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(window ?? '');
  if (!match) return { amount: '', unit: 'm' };
  const [, amount, unit] = match;
  if (unit === 'ms') {
    const seconds = Number(amount) / 1000;
    return { amount: String(seconds), unit: 's' };
  }
  return { amount, unit: unit as WindowUnit };
}

interface StoredPolicy {
  tag: string;
  name?: string;
  description?: string;
  key?: string[];
  limit?: number;
  window?: string;
  strategy?: Strategy;
  failurePolicy?: FailurePolicy;
  envs?: Array<{ slug: string; limit?: number; window?: string; strategy?: Strategy; failurePolicy?: FailurePolicy }>;
}

/** Pre-fill the form for a new version of an existing policy. */
export function formFromPolicy(policy: StoredPolicy, envSlugs: string[], takenTags: string[]): RateLimitForm {
  const window = splitWindow(policy.window ?? '');
  const overrides = new Map((policy.envs ?? []).map(item => [item.slug, item]));
  return {
    name: policy.name && policy.name !== policy.tag ? policy.name : '',
    tag: nextVersionTag(policy.tag, takenTags),
    tagEdited: true,
    description: policy.description ?? '',
    keys: [...(policy.key ?? [])],
    limit: String(policy.limit ?? ''),
    windowAmount: window.amount,
    windowUnit: window.unit,
    strategy: policy.strategy ?? 'fixed',
    failurePolicy: policy.failurePolicy ?? 'fail_closed',
    overrides: envSlugs.map(slug => {
      const found = overrides.get(slug);
      if (!found) return emptyOverride(slug);
      const parts = found.window ? splitWindow(found.window) : { amount: '', unit: 'm' as WindowUnit };
      return {
        slug,
        enabled: true,
        limit: found.limit === undefined ? '' : String(found.limit),
        windowAmount: parts.amount,
        windowUnit: parts.unit,
        strategy: found.strategy ?? '',
        failurePolicy: found.failurePolicy ?? '',
      };
    }),
    supersedes: policy.tag,
  };
}

export type FormErrors = Partial<Record<'name' | 'tag' | 'keys' | 'limit' | 'window', string>> & {
  overrides?: Record<string, string>;
};

export interface RateLimitPayload {
  tag: string;
  name: string;
  description: string;
  key: string[];
  limit: number;
  window: string;
  strategy: Strategy;
  failurePolicy: FailurePolicy;
  envs?: Array<{ slug: string; limit?: number; window?: string; strategy?: Strategy; failurePolicy?: FailurePolicy }>;
  supersedes?: string;
}

const isWholeNumber = (value: string) => /^\d+$/.test(value.trim());

function checkLimit(value: string): string | undefined {
  if (!isWholeNumber(value)) return 'Enter a whole number.';
  const limit = Number(value);
  if (limit < 1 || limit > 10000) return 'Must be between 1 and 10,000.';
  return undefined;
}

function checkWindow(amount: string, unit: WindowUnit): string | undefined {
  if (!isWholeNumber(amount)) return 'Enter a whole number.';
  const span = Number(amount) * (WINDOW_UNITS.find(item => item.id === unit)?.ms ?? 0);
  if (Number(amount) < 1) return 'Must be at least 1.';
  if (span > MAX_WINDOW_MS) return 'Cannot be longer than 1 day.';
  return undefined;
}

export function validateForm(form: RateLimitForm, takenTags: string[]): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = 'Give the policy a name.';

  const tag = form.tag.trim();
  if (!tag) errors.tag = 'A tag is required.';
  else if (!NAME.test(tag)) errors.tag = 'Use letters, numbers, ".", "_" or "-", starting with a letter or number.';
  else if (takenTags.includes(tag)) errors.tag = `"${tag}" is already used. Tags are permanent, so pick a new one.`;

  if (!form.keys.length) errors.keys = 'Add at least one field to count by, for example user_id.';
  else if (form.keys.length > 8) errors.keys = 'At most 8 fields.';

  const limit = checkLimit(form.limit);
  if (limit) errors.limit = limit;
  const window = checkWindow(form.windowAmount, form.windowUnit);
  if (window) errors.window = window;

  const overrideErrors: Record<string, string> = {};
  for (const override of form.overrides.filter(item => item.enabled)) {
    const touched = override.limit.trim() || override.windowAmount.trim() || override.strategy || override.failurePolicy;
    if (!touched) {
      overrideErrors[override.slug] = 'Change at least one setting, or turn this override off.';
      continue;
    }
    if (override.limit.trim()) {
      const problem = checkLimit(override.limit);
      if (problem) overrideErrors[override.slug] = `Limit: ${problem}`;
    }
    if (!overrideErrors[override.slug] && override.windowAmount.trim()) {
      const problem = checkWindow(override.windowAmount, override.windowUnit);
      if (problem) overrideErrors[override.slug] = `Window: ${problem}`;
    }
  }
  if (Object.keys(overrideErrors).length) errors.overrides = overrideErrors;
  return errors;
}

export const hasErrors = (errors: FormErrors) => Object.keys(errors).length > 0;

/** Build the platform payload. Call validateForm first; this assumes the form is valid. */
export function buildPayload(form: RateLimitForm): RateLimitPayload {
  const envs = form.overrides
    .filter(item => item.enabled)
    .map(item => ({
      slug: item.slug,
      ...(item.limit.trim() ? { limit: Number(item.limit) } : {}),
      ...(item.windowAmount.trim() ? { window: `${Number(item.windowAmount)}${item.windowUnit}` } : {}),
      ...(item.strategy ? { strategy: item.strategy } : {}),
      ...(item.failurePolicy ? { failurePolicy: item.failurePolicy } : {}),
    }));
  return {
    tag: form.tag.trim(),
    name: form.name.trim(),
    description: form.description.trim(),
    key: form.keys,
    limit: Number(form.limit),
    window: `${Number(form.windowAmount)}${form.windowUnit}`,
    strategy: form.strategy,
    failurePolicy: form.failurePolicy,
    ...(envs.length ? { envs } : {}),
    ...(form.supersedes ? { supersedes: form.supersedes } : {}),
  };
}

/** "1 minute", "30 seconds", "2 hours". */
export function describeWindow(window: string): string {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(window ?? '');
  if (!match) return window || 'unknown window';
  const amount = Number(match[1]);
  if (match[2] === 'ms') return `${amount} ms`;
  const unit = WINDOW_UNITS.find(item => item.id === match[2])!;
  return `${amount} ${amount === 1 ? unit.singular : unit.plural}`;
}

export const describeStrategy = (strategy: Strategy | undefined) => (strategy === 'sliding' ? 'sliding window' : 'fixed window');

/** One sentence that says what the policy does, used in the form preview and on cards. */
export function describePolicy(policy: { limit?: number; window?: string; key?: string[]; strategy?: Strategy }): string {
  if (policy.limit === undefined || !policy.window) return 'Limit not recorded';
  const by = policy.key?.length ? ` per ${policy.key.join(' + ')}` : '';
  return `${policy.limit.toLocaleString()} requests${by} every ${describeWindow(policy.window)}`;
}
