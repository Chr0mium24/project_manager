import path from "node:path";
import process from "node:process";
import { validateManagedTask } from "../lib/managed-task.mjs";

function parseArgs(argv) {
  const args = {};

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];

    if (token === "--content-repo") {
      args.contentRepo = value;
      index += 1;
      continue;
    }

    if (token === "--project") {
      args.projectSlug = value;
      index += 1;
      continue;
    }

    if (token === "--task") {
      args.taskSlug = value;
      index += 1;
      continue;
    }

    throw new Error(`unknown argument: ${token}`);
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.contentRepo || !args.projectSlug || !args.taskSlug) {
    throw new Error("usage: node scripts/validate-managed-task.mjs --content-repo <path> --project <slug> --task <slug>");
  }

  const validationRoot = process.cwd();
  const contentRepoRoot = path.resolve(validationRoot, args.contentRepo);
  const result = validateManagedTask(validationRoot, {
    contentRepoRoot,
    projectSlug: args.projectSlug,
    taskSlug: args.taskSlug
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main();
