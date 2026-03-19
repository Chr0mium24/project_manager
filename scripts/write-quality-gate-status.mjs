import process from 'node:process';
import { writeGateStatus } from './lib/quality-gate-status.mjs';

const rootDir = process.cwd();
const stages = process.argv.slice(2);
const payload = writeGateStatus(rootDir, stages);
console.log(`[quality-gate] status recorded for ${payload.branch} at ${payload.recordedAt}`);
