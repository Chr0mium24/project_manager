import { spawnSync } from 'node:child_process';

const commands = [
  ['node', ['scripts/check-config-presence.mjs']],
  ['node', ['scripts/check-doc-consistency.mjs']],
  ['node', ['scripts/check-file-limits.mjs']],
  ['node', ['scripts/check-no-compat.mjs']],
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('[lint] repository policy checks passed');
