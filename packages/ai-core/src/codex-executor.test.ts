import assert from "node:assert/strict";
import test from "node:test";
import { buildCodexExecArgs, readSessionIdFromEventStream } from "./codex-executor.ts";

void test("buildCodexExecArgs uses writable sandbox for fresh sessions", () => {
  const args = buildCodexExecArgs({
    cwd: "/tmp/project",
    prompt: "Update the landing page."
  });

  assert.deepEqual(args, [
    "exec",
    "--skip-git-repo-check",
    "--json",
    "--sandbox",
    "workspace-write",
    "--cd",
    "/tmp/project",
    "Update the landing page."
  ]);
});

void test("buildCodexExecArgs resumes an existing session when provided", () => {
  const args = buildCodexExecArgs({
    cwd: "/tmp/project",
    prompt: "Continue the previous task.",
    sessionId: "session-1"
  });

  assert.deepEqual(args, [
    "exec",
    "--skip-git-repo-check",
    "--json",
    "--sandbox",
    "workspace-write",
    "--cd",
    "/tmp/project",
    "resume",
    "session-1",
    "Continue the previous task."
  ]);
});

void test("readSessionIdFromEventStream extracts the thread id", () => {
  const sessionId = readSessionIdFromEventStream([
    "{\"type\":\"thread.started\",\"thread_id\":\"session-7\"}",
    "{\"type\":\"turn.started\"}"
  ].join("\n"));

  assert.equal(sessionId, "session-7");
});
