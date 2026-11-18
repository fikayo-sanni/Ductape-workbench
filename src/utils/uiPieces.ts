/** Pure helpers for the Workbench's view of UI pieces. Nothing here touches the network or the screen. */

export type UiFramework = 'react' | 'vue' | 'javascript';

export const FRAMEWORK_LABEL: Record<string, string> = { react: 'React', vue: 'Vue', javascript: 'Plain JavaScript' };

const pascal = (name: string) => name.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');

/** What a developer runs and writes to use a piece in an application, for the piece's framework. */
export function integrationSnippet(name: string, version: string, framework: string): { command: string; code: string; language: string } {
  const component = pascal(name);
  const command = `ductape ui add ${name}@${version}`;
  if (framework === 'vue') {
    return {
      command,
      language: 'vue',
      code: `<script setup lang="ts">\nimport { ${component} } from '#ui/${name}';\n</script>\n\n<template>\n  <${component} app="<app tag>" action="<action tag>" />\n</template>\n\n// Once, in main.ts:\n// app.use(createDuctape({ publishableKey, product, env }))  (from @ductape/vue)`,
    };
  }
  if (framework === 'javascript') {
    return {
      command,
      language: 'ts',
      code: `import { Ductape } from '@ductape/client';\nimport { mount${component} } from '#ui/${name}';\n\nconst client = new Ductape({ publishableKey, product, env });\nconst handle = mount${component}(document.getElementById('target')!, { client, app: '<app tag>', action: '<action tag>' });\n// later: handle.destroy();`,
    };
  }
  return {
    command,
    language: 'tsx',
    code: `import { ${component} } from '#ui/${name}';\n\n// Inside <DuctapeProvider config={{ publishableKey, product, env }}> (from @ductape/react):\n<${component} app="<app tag>" action="<action tag>" />`,
  };
}

export type RequirementStatus = 'ok' | 'missing' | 'unknown';
export interface IRequirementRow { kind: 'action' | 'feature' | 'session'; ref: string; status: RequirementStatus; detail?: string }

const tagsOf = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? value.map((item) => (item && typeof item === 'object' ? String((item as { tag?: unknown }).tag ?? '') : String(item))).filter(Boolean) : undefined;

/** Features and sessions a product has, read from the product record; undefined when the record does not carry them. */
export function productInventory(product: unknown): { features?: string[]; sessions?: string[] } {
  const record = (product && typeof product === 'object' ? product : {}) as Record<string, unknown>;
  return { features: tagsOf(record.features), sessions: tagsOf(record.sessions) };
}

/** Feature and session rows, decided from the product record. Actions are asked of the platform separately. */
export function localRequirementRows(requires: { features?: string[]; sessions?: string[] } | undefined, product: unknown): IRequirementRow[] {
  const inventory = productInventory(product);
  const rows: IRequirementRow[] = [];
  for (const kind of ['feature', 'session'] as const) {
    const have = kind === 'feature' ? inventory.features : inventory.sessions;
    for (const tag of (kind === 'feature' ? requires?.features : requires?.sessions) ?? []) {
      rows.push(have === undefined
        ? { kind, ref: tag, status: 'unknown', detail: `This product's ${kind}s could not be read` }
        : have.includes(tag) ? { kind, ref: tag, status: 'ok' } : { kind, ref: tag, status: 'missing', detail: `This product has no ${kind} "${tag}"` });
    }
  }
  return rows;
}

export const requirementCount = (requires: { actions?: unknown[]; features?: unknown[]; sessions?: unknown[] } | undefined): number =>
  (requires?.actions?.length ?? 0) + (requires?.features?.length ?? 0) + (requires?.sessions?.length ?? 0);

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
