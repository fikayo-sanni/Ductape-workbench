/**
 * Turns JSON schemas and sample payloads into flat, human-readable rows so the
 * Workbench can show "what goes in / what comes out" as a table instead of raw JSON.
 */

export interface FieldRow {
  /** Field name, or "(value)" when the schema is not an object. */
  name: string;
  /** Plain-language type, e.g. "text", "number", "list of text". */
  type: string;
  required: boolean;
  /** Constraints in plain language, e.g. "one of: a, b" or "1 to 40 characters". */
  note: string;
  /** Nesting level, used for indentation. */
  depth: number;
}

export interface ValueRow {
  name: string;
  type: string;
  /** Short preview of the value. */
  example: string;
  depth: number;
}

type Schema = {
  type?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  enum?: unknown[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  additionalProperties?: boolean | Schema;
};

const MAX_DEPTH = 3;

const TYPE_LABELS: Record<string, string> = {
  string: 'text',
  number: 'number',
  integer: 'whole number',
  boolean: 'true / false',
  object: 'object',
  array: 'list',
  null: 'nothing',
};

function typeLabel(schema: Schema | undefined): string {
  if (!schema || !schema.type) return 'any';
  if (schema.type === 'array') {
    const inner = schema.items ? typeLabel(schema.items) : 'any';
    return `list of ${inner}`;
  }
  return TYPE_LABELS[schema.type] ?? schema.type;
}

function range(min: number | undefined, max: number | undefined, unit: string): string {
  if (min !== undefined && max !== undefined) return `${min} to ${max} ${unit}`;
  if (min !== undefined) return `at least ${min} ${unit}`;
  if (max !== undefined) return `at most ${max} ${unit}`;
  return '';
}

function noteFor(schema: Schema): string {
  const parts: string[] = [];
  if (Array.isArray(schema.enum) && schema.enum.length) {
    parts.push(`one of: ${schema.enum.map(v => String(v)).join(', ')}`);
  }
  const chars = range(schema.minLength, schema.maxLength, 'characters');
  if (chars) parts.push(chars);
  const bounds = range(schema.minimum, schema.maximum, '');
  if (bounds) parts.push(bounds.trim());
  const items = range(schema.minItems, schema.maxItems, 'items');
  if (items) parts.push(items);
  return parts.join(' · ');
}

function walk(schema: Schema, depth: number, rows: FieldRow[]): void {
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  for (const [name, child] of Object.entries(properties)) {
    rows.push({
      name,
      type: typeLabel(child),
      required: required.has(name),
      note: noteFor(child),
      depth,
    });
    if (depth + 1 >= MAX_DEPTH) continue;
    if (child.type === 'object' && child.properties) {
      walk(child, depth + 1, rows);
    } else if (child.type === 'array' && child.items?.type === 'object' && child.items.properties) {
      walk(child.items, depth + 1, rows);
    }
  }
}

/** Flatten a function/operation schema into display rows. */
export function schemaToRows(schema: unknown): FieldRow[] {
  if (!schema || typeof schema !== 'object') return [];
  const root = schema as Schema;
  if (root.type === 'object' || root.properties) {
    const rows: FieldRow[] = [];
    walk(root, 0, rows);
    if (!rows.length) rows.push({ name: '(value)', type: 'object', required: true,
      note: root.additionalProperties === false ? 'No fields allowed' : 'Object; fields unspecified', depth: 0 });
    return rows;
  }
  return [{ name: '(value)', type: typeLabel(root), required: true, note: noteFor(root), depth: 0 }];
}

function describeValue(value: unknown): { type: string; example: string } {
  if (value === null || value === undefined) return { type: 'nothing', example: 'null' };
  if (Array.isArray(value)) return { type: 'list', example: `${value.length} item${value.length === 1 ? '' : 's'}` };
  switch (typeof value) {
    case 'string':
      return { type: 'text', example: value.length > 60 ? `${value.slice(0, 57)}...` : value };
    case 'number':
      return { type: Number.isInteger(value) ? 'whole number' : 'number', example: String(value) };
    case 'boolean':
      return { type: 'true / false', example: String(value) };
    default:
      return { type: 'object', example: `${Object.keys(value as object).length} fields` };
  }
}

function walkValue(value: unknown, depth: number, rows: ValueRow[]): void {
  if (!value || typeof value !== 'object') return;
  const entries = Array.isArray(value)
    ? (value.length ? [['item 1', value[0]] as const] : [])
    : Object.entries(value as Record<string, unknown>);
  for (const [name, child] of entries) {
    const described = describeValue(child);
    rows.push({ name, ...described, depth });
    if (depth + 1 < MAX_DEPTH) walkValue(child, depth + 1, rows);
  }
}

/** Flatten a sample payload (object, or JSON text) into display rows. */
export function valueToRows(input: unknown): ValueRow[] {
  let value = input;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  const rows: ValueRow[] = [];
  walkValue(value, 0, rows);
  return rows;
}
