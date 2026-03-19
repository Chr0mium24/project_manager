import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const tsconfig = JSON.parse(readFileSync('tsconfig.base.json', 'utf8'));
const expectedScripts = ['format:check', 'lint', 'typecheck', 'test:unit', 'test:integration', 'test:contract', 'test:e2e:smoke', 'test:git', 'test:ai', 'test:publish'];
const missingScripts = expectedScripts.filter((name) => !(name in packageJson.scripts));
const requiredCompilerOptions = {
  strict: true,
  noImplicitAny: true,
  noUncheckedIndexedAccess: true,
  exactOptionalPropertyTypes: true,
  module: 'NodeNext',
  moduleResolution: 'NodeNext',
};

if (packageJson.packageManager !== 'pnpm@9.15.0') {
  console.error('[typecheck] packageManager must be pinned to pnpm@9.15.0');
  process.exit(1);
}

if (packageJson.volta?.node !== '20.19.5') {
  console.error('[typecheck] volta.node must be pinned to 20.19.5');
  process.exit(1);
}

if (missingScripts.length > 0) {
  console.error('[typecheck] missing required scripts:');
  missingScripts.forEach((name) => console.error(`- ${name}`));
  process.exit(1);
}

for (const [option, expectedValue] of Object.entries(requiredCompilerOptions)) {
  if (tsconfig.compilerOptions?.[option] !== expectedValue) {
    console.error(`[typecheck] tsconfig.base.json must set compilerOptions.${option}=${expectedValue}`);
    process.exit(1);
  }
}

console.log('[typecheck] repository typecheck prerequisites are pinned');
