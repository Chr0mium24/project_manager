import assert from "node:assert/strict";
import process from "node:process";
import test from "node:test";
import { startGatewayServer } from "../apps/gateway/src/index.ts";

test("gateway server serves healthz, projects, static, and dynamic routes", async (t) => {
  let running;

  try {
    running = await startGatewayServer(process.cwd(), 0);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "EPERM") {
      t.skip("socket bind unavailable in current sandbox");
      return;
    }
    throw error;
  }

  try {
    const baseUrl = `http://${running.host}:${String(running.port)}`;
    const health = await fetch(`${baseUrl}/healthz`).then(async (response) => response.json());
    const projects = await fetch(`${baseUrl}/api/projects`).then(async (response) => response.json());
    const staticHtml = await fetch(`${baseUrl}/p/landing-a`).then(async (response) => response.text());
    const dynamicInfo = await fetch(`${baseUrl}/app/service-b`).then(async (response) => response.json());

    assert.equal(health.ok, true);
    assert.ok(Array.isArray(projects.projects));
    assert.ok(projects.projects.length >= 2);
    assert.match(staticHtml, /Landing A/);
    assert.equal(dynamicInfo.slug, "service-b");
    assert.equal(dynamicInfo.runtime, "dynamic");
  } finally {
    await running.close();
  }
});
