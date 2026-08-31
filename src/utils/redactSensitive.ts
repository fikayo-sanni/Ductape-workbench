const SENSITIVE_KEY = /(?:^|[-_])(authorization|proxy[-_]?authorization|api[-_]?key|access[-_]?token|refresh[-_]?token|id[-_]?token|auth[-_]?token|session[-_]?token|client[-_]?secret|secret(?:[-_]?key)?|private[-_]?key|password|passwd|cookie|set[-_]?cookie|signature|credential|bearer)(?:$|[-_])/i;
const SECRET_REFERENCE = /\$(?:Secret|Credential)\{[^}]+\}/gi;
const BEARER_VALUE = /\b(Bearer|Basic)\s+[^\s,"'}]+/gi;

export function redactSensitive(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') {
    let parsed: unknown;
    try { parsed = JSON.parse(value); } catch { parsed = undefined; }
    if (parsed && typeof parsed === 'object') return redactSensitive(parsed, seen);
    return value.replace(SECRET_REFERENCE, '[REDACTED]').replace(BEARER_VALUE, '$1 [REDACTED]');
  }
  if (value == null || typeof value !== 'object') return value;
  if (seen.has(value as object)) return '[Circular]';
  seen.add(value as object);
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item, seen));
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
    key,
    SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactSensitive(item, seen),
  ]));
}
