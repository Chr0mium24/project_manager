import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { validateContentRepo } from "../lib/validators.mjs";

function copyDir(source, target) {
  fs.cpSync(source, target, { recursive: true });
}

function parseJsonLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

if (process.env.RUN_CODEX_LIVE !== "1") {
  console.log("live Codex create-project probe skipped; set RUN_CODEX_LIVE=1 to run it");
  process.exit(0);
}

const workspaceRoot = path.resolve(".");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-create-validation-"));
const tempWorkspace = path.join(tempRoot, "validation");
copyDir(workspaceRoot, tempWorkspace);

const schemaPath = path.join(tempWorkspace, "schemas/codex-create-response.schema.json");
const prompt = [
  "Read CODEX.md first.",
  "Use the documented bootstrap script to create a new static project with slug codex-static and name Codex Static in ./content-repo.",
  "Do not manually edit projects-index.json.",
  "Respond with JSON matching the provided schema.",
  'Set method to the exact command you used.'
].join(" ");

const result = spawnSync("codex", [
  "exec",
  "--skip-git-repo-check",
  "--ephemeral",
  "--json",
  "--sandbox",
  "workspace-write",
  "--cd",
  tempWorkspace,
  "--output-schema",
  schemaPath,
  prompt
], {
  encoding: "utf8",
  cwd: tempWorkspace,
  env: {
    ...process.env,
    RUN_CODEX_LIVE: "0"
  }
});

console.log(result.stdout);
if (result.stderr.trim()) {
  console.error(result.stderr);
}

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  throw new Error(`codex exec failed with status ${result.status}`);
}

const events = parseJsonLines(result.stdout);
const commandEvents = events.filter((event) => JSON.stringify(event).includes("create-project.mjs"));

if (commandEvents.length === 0) {
  throw new Error("Codex did not appear to call create-project.mjs");
}

const validation = validateContentRepo(path.join(tempWorkspace, "content-repo"));
const createdProjectPath = path.join(tempWorkspace, "content-repo/projects/codex-static/project.json");

if (!fs.existsSync(createdProjectPath)) {
  throw new Error("codex-static project was not created");
}

console.log(JSON.stringify({
  ok: true,
  projects: validation.projects,
  createdProjectPath
}, null, 2));
