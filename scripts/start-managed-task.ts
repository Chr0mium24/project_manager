import process from "node:process";
import { startManagedTask } from "../packages/project-core/src/index.ts";

interface CliArgs {
  projectSlug?: string;
  taskSlug?: string;
  mode?: "workspace" | "git-branch";
  force: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    mode: "workspace",
    force: false
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];

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
      args.mode = value as "workspace" | "git-branch";
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
