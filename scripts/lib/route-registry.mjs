import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export const REGISTRY_VERSION = 1;
const ALLOWED_TARGET_KINDS = new Set(['internal-handler', 'static-build', 'dynamic-handler']);
const ROUTE_PREFIX_PATTERNS = [/^\/p\/[a-z0-9-]+(?:\/.*)?$/, /^\/app\/[a-z0-9-]+(?:\/.*)?$/, /^\/api\/runtime\/[a-z0-9-]+(?:\/.*)?$/];

export function getRouteRegistryPath(rootDir) {
  return path.join(rootDir, 'storage', 'route-registry', 'dev-routes.json');
}

export function readRouteRegistry(rootDir) {
  const filePath = getRouteRegistryPath(rootDir);
  if (!existsSync(filePath)) {
    return { version: REGISTRY_VERSION, updatedAt: null, routes: [] };
  }

  return JSON.parse(readFileSync(filePath, 'utf8'));
}

export function validateRouteRecord(record) {
  if (typeof record.routePrefix !== 'string' || record.routePrefix.length === 0) {
    throw new Error('routePrefix must be a non-empty string');
  }

  if (!ROUTE_PREFIX_PATTERNS.some((pattern) => pattern.test(record.routePrefix))) {
    throw new Error('routePrefix must start with /p/, /app/, or /api/runtime/ and use a valid slug');
  }

  if (!ALLOWED_TARGET_KINDS.has(record.targetKind)) {
    throw new Error('targetKind must be one of internal-handler, static-build, dynamic-handler');
  }

  if (typeof record.targetRef !== 'string' || record.targetRef.trim().length === 0) {
    throw new Error('targetRef must be a non-empty string');
  }
}

export function upsertRouteRecord(rootDir, record) {
  validateRouteRecord(record);

  const registry = readRouteRegistry(rootDir);
  const routes = registry.routes.filter((item) => item.routePrefix !== record.routePrefix);
  const timestamp = new Date().toISOString();
  const normalized = { ...record, updatedAt: timestamp };
  routes.push(normalized);
  routes.sort((left, right) => left.routePrefix.localeCompare(right.routePrefix));

  const payload = {
    version: REGISTRY_VERSION,
    updatedAt: timestamp,
    routes,
  };

  const filePath = getRouteRegistryPath(rootDir);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
}
