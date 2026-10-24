import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('../src/components/Dashboard.tsx', import.meta.url), 'utf8');
const at = (marker) => {
  const index = source.indexOf(marker);
  assert.ok(index >= 0, `${marker} is on the dashboard`);
  return index;
};

test('the original dashboard comes first and the platform health sections come after "Activity by type"', () => {
  const original = ['{/* Workspace status */}', '{/* Stats */}', '{/* Timeline, and what needs attention', '{/* Products */}', '{/* Activity by type'].map(at);
  assert.deepEqual(original, [...original].sort((a, b) => a - b), 'the original sections keep their order');
  assert.ok(at('<PlatformHealth') > at('{/* Activity by type'), 'platform health, resource usage and usage by product follow it');
  assert.equal(source.split('<PlatformHealth').length - 1, 1, 'it is on the page once');
  assert.ok(at('<InfraSummary') > at('{/* Activity by type'), 'the deployment and cloud connection summaries follow Activity by type too');
  assert.ok(at('<InfraSummary') < at('<PlatformHealth'), 'and come before platform health');
  assert.equal(source.split('<InfraSummary').length - 1, 1, 'once');
  assert.doesNotMatch(source, /['"]Other['"]/, 'nothing on the dashboard is called Other');
});

test('Activity by type is a Gantt chart, and the totals failing does not replace the page', () => {
  assert.match(source, /<ActivityGantt/);
  assert.doesNotMatch(source, /Failed to load dashboard data/, 'one request failing must not blank the sections that read other data');
  assert.match(source, /totalsFailed/);
});

test('products show their own average and p95 latency', () => {
  assert.match(source, /Avg latency/);
  assert.match(source, /p95 latency/);
  assert.match(source, /productLatency\(platformHealth\.data/);
});

test('the green trend badges are gone from the stat cards', () => {
  assert.doesNotMatch(source, /TrendingUp|TrendingDown|TrendIcon/);
  assert.doesNotMatch(source, /text-green bg-green\/10/);
});
