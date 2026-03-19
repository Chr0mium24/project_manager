import path from "node:path";
import process from "node:process";
import { startManagedTask } from "../lib/managed-task.mjs";

function parseArgs(argv) {
  const args = {
    mode: "workspace",
    force: false
  };

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

    if (token === "--mode") {
      args.mode = value;
      index += 1;
      continue;
    }

    if (token === "--force") {
      args.force = true;
      continue;
    }

    throw new Error(`unknown argument: ${token}`);
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.contentRepo || !args.projectSlug || !args.taskSlug) {
    throw new Error("usage: node scripts/start-managed-task.mjs --content-repo <path> --project <slug> --task <slug> [--mode workspace|git-branch] [--force]");
  }

  const validationRoot = process.cwd();
  const contentRepoRoot = path.resolve(validationRoot, args.contentRepo);
  const result = startManagedTask(validationRoot, {
    contentRepoRoot,
    projectSlug: args.projectSlug,
    taskSlug: args.taskSlug,
    mode: args.mode,
    force: args.force
  });

  process.stdout.write(`${JSON.stringify({
    status: "started",
    projectSlug: result.manifest.projectSlug,
    taskSlug: result.manifest.taskSlug,
    mode: result.manifest.mode,
    commitPolicy: result.manifest.commitPolicy,
    prPolicy: result.manifest.prPolicy,
    workspaceProjectPath: result.manifest.workspaceProjectPath,
    branchName: result.manifest.branchName
  }, null, 2)}\n`);
}

main();
