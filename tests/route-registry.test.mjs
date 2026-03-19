import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getRouteRegistryPath, upsertRouteRecord } from '../scripts/lib/route-registry.mjs';

test('route registry stores multiple routes and updates by route prefix', () => {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), 'route-registry-'));

  upsertRouteRecord(rootDir, {
    routePrefix: '/app/demo',
    targetKind: 'internal-handler',
    targetRef: 'demo-runtime',
  });

  upsertRouteRecord(rootDir, {
    routePrefix: '/p/landing-a',
    targetKind: 'static-build',
    targetRef: 'landing-a',
  });

  const updated = upsertRouteRecord(rootDir, {
    routePrefix: '/app/demo',
    targetKind: 'dynamic-handler',
    targetRef: 'demo-runtime-v2',
  });

  assert.equal(updated.routes.length, 2);
  assert.deepEqual(
    updated.routes.map((item) => [item.routePrefix, item.targetKind, item.targetRef]),
    [
      ['/app/demo', 'dynamic-handler', 'demo-runtime-v2'],
      ['/p/landing-a', 'static-build', 'landing-a'],
    ],
  );

  const persisted = JSON.parse(readFileSync(getRouteRegistryPath(rootDir), 'utf8'));
  assert.equal(persisted.version, 1);
  assert.equal(persisted.routes.length, 2);
});

test('route registry rejects invalid public prefixes', () => {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), 'route-registry-'));

  assert.throws(
    () =>
      upsertRouteRecord(rootDir, {
        routePrefix: '/static/demo',
        targetKind: 'static-build',
        targetRef: 'demo',
      }),
    /routePrefix must start with \/p\/, \/app\/, or \/api\/runtime\//,
  );
});
