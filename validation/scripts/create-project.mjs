import path from "node:path";
import { createProject } from "../lib/project-bootstrap.mjs";

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

if (!args["content-repo"] || !args.slug || !args.name || !args.runtime) {
  console.error("usage: node scripts/create-project.mjs --content-repo <dir> --slug <slug> --name <name> --runtime <static|dynamic> [--visibility <private|unlisted>] [--force]");
  process.exit(1);
}

const result = createProject(path.resolve(args["content-repo"]), {
  slug: args.slug,
  name: args.name,
  runtime: args.runtime,
  visibility: args.visibility || "private",
  force: args.force === "true"
});

console.log(JSON.stringify(result, null, 2));
