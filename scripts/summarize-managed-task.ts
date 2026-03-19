import process from "node:process";
import { summarizeManagedTask } from "../packages/project-core/src/index.ts";

interface CliArgs {
  projectSlug: string | undefined;
  taskSlug: string | undefined;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    projectSlug: undefined,
    taskSlug: undefined
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index] ?? "";
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

    throw new Error(`unknown argument: ${token}`);
  }

  return args;
}

function main(): void {
  const args = parseArgs(process.argv);
  if (args.projectSlug === undefined || args.taskSlug === undefined) {
    throw new Error(
      "usage: node --import tsx scripts/summarize-managed-task.ts --project <slug> --task <slug>"
    );
  }

  const summary = summarizeManagedTask(process.cwd(), {
    projectSlug: args.projectSlug,
    taskSlug: args.taskSlug
  });

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main();
