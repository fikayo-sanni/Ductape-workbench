import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const hook = fs.readFileSync(new URL('../src/hooks/useIconSidebarNavigation.ts', import.meta.url), 'utf8');
const layout = fs.readFileSync(new URL('../src/components/WorkbenchLayout.tsx', import.meta.url), 'utf8');
const store = fs.readFileSync(new URL('../src/stores/workbench-store.ts', import.meta.url), 'utf8');

const items = [...hook.matchAll(/^  \{ id: '([a-z]+)', icon: \w+, label: '[^']+', section: '(primary|secondary)' \},$/gm)].map((m) => ({ id: m[1], section: m[2] }));

test('the dashboard is the first item in the icon sidebar and the logs are the second', () => {
  assert.deepEqual(items.slice(0, 2).map((i) => i.id), ['dashboard', 'logs']);
  assert.ok(items.slice(0, 2).every((i) => i.section === 'primary'), 'both sit at the top, above the divider');
  assert.equal(new Set(items.map((i) => i.id)).size, items.length, 'no item is listed twice');
  assert.ok(items.length >= 10, 'every other item is still there');
});

test('opening the workbench shows the dashboard once the saved tabs have loaded', () => {
  assert.match(layout, /state\._hasHydrated/);
  assert.match(layout, /navigate\('dashboard'\)/);
  assert.match(layout, /openedDashboard\.current/, 'it happens once per page load, not on every change');
});

test('the dashboard tab is placed before every other tab', () => {
  assert.match(store, /tabs: \[newDashboardTab, \.\.\.state\.tabs\]/);
});
