import process from "node:process";
import { startManagedTask } from "../packages/project-core/src/index.ts";

interface CliArgs {
  projectSlug: string | undefined;
  taskSlug: string | undefined;
  mode: "workspace" | "git-branch";
  force: boolean;
}

function parseMode(value: string | undefined): "workspace" | "git-branch" {
  if (value === "workspace" || value === "git-branch") {
    return value;
  }

  const label = value ?? "<missing>";
  throw new Error(`invalid mode: ${label}`);
}

function assignFlag(args: CliArgs, token: string, value: string | undefined): boolean {
  switch (token) {
    case "--project":
      args.projectSlug = value;
      return true;
    case "--task":
      args.taskSlug = value;
      return true;
    case "--mode":
      args.mode = parseMode(value);
      return true;
    default:
      return false;
  }
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    projectSlug: undefined,
    taskSlug: undefined,
    mode: "workspace",
    force: false
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index] ?? "";
    const value = argv[index + 1];

    if (assignFlag(args, token, value)) {
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

function main(): void {
  const args = parseArgs(process.argv);
  if (args.projectSlug === undefined || args.taskSlug === undefined) {
    throw new Error(
      "usage: node --import tsx scripts/start-managed-task.ts --project <slug> --task <slug> [--mode workspace|git-branch] [--force]"
    );
  }

  const result = startManagedTask(process.cwd(), {
    projectSlug: args.projectSlug,
    taskSlug: args.taskSlug,
    mode: args.mode,
    force: args.force
  });

  process.stdout.write(
    `${JSON.stringify(
      {
        status: "started",
        projectSlug: result.manifest.projectSlug,
        taskSlug: result.manifest.taskSlug,
        mode: result.manifest.mode,
        commitPolicy: result.manifest.commitPolicy,
        prPolicy: result.manifest.prPolicy,
        workspaceProjectPath: result.manifest.workspaceProjectPath,
        branchName: result.manifest.branchName
      },
      null,
      2
    )}\n`
  );
}

main();
