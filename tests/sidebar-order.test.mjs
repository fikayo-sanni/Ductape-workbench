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

test('the workbench lands on the dashboard on opening, after a workspace switch and after a fresh login', () => {
  assert.match(layout, /state\._hasHydrated/, 'only once the saved tabs have loaded');
  assert.match(layout, /navigate\('dashboard'\)/);
  assert.match(layout, /landingKey\(user\?\._id, currentWorkspaceId\)/, 'keyed on the person and the workspace, so a change of either lands again');
  assert.match(layout, /shouldOpenDashboard\(shownFor\.current/);
  assert.match(layout, /landing === null\) \{ shownFor\.current = null/, 'signing out resets it, so the next login lands again');
});

test('the dashboard tab is placed before every other tab', () => {
  assert.match(store, /tabs: \[newDashboardTab, \.\.\.state\.tabs\]/);
});
