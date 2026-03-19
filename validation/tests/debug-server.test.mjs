import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startDebugServer } from "../lib/debug-server.mjs";

test("debug server serves healthz, index, static route, and dynamic route metadata", async (t) => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const contentRepoRoot = path.resolve(currentDir, "../content-repo");
  let running;

  try {
    running = await startDebugServer({ contentRepoRoot, port: 0 });
  } catch (error) {
    if (error && error.code === "EPERM") {
      t.skip("socket bind unavailable in current sandbox");
      return;
    }
    throw error;
  }

  try {
    const baseUrl = `http://${running.host}:${running.port}`;

    const health = await fetch(`${baseUrl}/healthz`).then((res) => res.json());
    assert.equal(health.ok, true);

    const projects = await fetch(`${baseUrl}/api/projects`).then((res) => res.json());
    assert.ok(projects.projects.length >= 2);

    const staticHtml = await fetch(`${baseUrl}/p/landing-a`).then((res) => res.text());
    assert.match(staticHtml, /Landing A/);

    const dynamicInfo = await fetch(`${baseUrl}/app/service-b`).then((res) => res.json());
    assert.equal(dynamicInfo.slug, "service-b");
    assert.equal(dynamicInfo.runtime, "dynamic");
  } finally {
    await running.close();
  }
});
