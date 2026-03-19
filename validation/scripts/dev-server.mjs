import path from "node:path";
import { startDebugServer } from "../lib/debug-server.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) {
      continue;
    }
    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const contentRepoRoot = path.resolve(args["content-repo"] || "./content-repo");
const host = args.host || "127.0.0.1";
const port = args.port ? Number(args.port) : 4310;

const running = await startDebugServer({ contentRepoRoot, host, port });
console.log(`debug server listening on http://${running.host}:${running.port}`);

process.on("SIGINT", async () => {
  await running.close();
  process.exit(0);
});
