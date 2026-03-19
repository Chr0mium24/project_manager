import path from "node:path";
import process from "node:process";
import { createProject } from "../packages/project-core/src/index.ts";

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = value;
    index += 1;
  }

  return args;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!args.slug || !args.name || !args.runtime) {
    throw new Error(
      "usage: node --import tsx scripts/create-project.ts --slug <slug> --name <name> --runtime <static|dynamic> [--visibility <private|public>] [--force]"
    );
  }

  const rootDir = process.cwd();
  const project = createProject(rootDir, {
    slug: String(args.slug),
    name: String(args.name),
    runtime: String(args.runtime) as "static" | "dynamic",
    visibility: args.visibility ? (String(args.visibility) as "private" | "public") : "private",
    force: args.force === true
  });

  process.stdout.write(`${JSON.stringify({
    slug: project.slug,
    runtime: project.runtime,
    route: project.route,
    entry: project.entry
  }, null, 2)}\n`);
}

main();
