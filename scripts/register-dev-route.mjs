import process from 'node:process';
import { upsertRouteRecord } from './lib/route-registry.mjs';

if (process.argv.length < 5) {
  console.error('usage: node scripts/register-dev-route.mjs <route-prefix> <target-kind> <target-ref>');
  process.exit(1);
}

const [, , routePrefix, targetKind, targetRef] = process.argv;
const payload = upsertRouteRecord(process.cwd(), { routePrefix, targetKind, targetRef });
console.log(`[route-registry] registered ${routePrefix} (${targetKind})`);
console.log(`[route-registry] total routes: ${payload.routes.length}`);
