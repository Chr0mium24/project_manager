import process from 'node:process';
import { readGateStatus, validateGateStatus } from './lib/quality-gate-status.mjs';

const rootDir = process.cwd();

try {
  const payload = readGateStatus(rootDir);
  const result = validateGateStatus(rootDir, payload);
  if (!result.ok) {
    console.error(`[codex-safe-git] ${result.reason}`);
    process.exit(1);
  }
  console.log('[codex-safe-git] commit preconditions satisfied');
} catch (error) {
  console.error(`[codex-safe-git] ${error.message}`);
  process.exit(1);
}
