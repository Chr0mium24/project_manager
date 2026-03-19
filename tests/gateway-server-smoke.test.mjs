import assert from "node:assert/strict";
import process from "node:process";
import test from "node:test";
import { startGatewayServer } from "../apps/gateway/src/index.ts";

async function fetchJson(url) {
  return fetch(url).then(async (response) => response.json());
}

async function fetchText(url) {
  return fetch(url).then(async (response) => response.text());
}

async function startGatewayOrSkip(t) {
  try {
    return await startGatewayServer(process.cwd(), 0);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "EPERM") {
      t.skip("socket bind unavailable in current sandbox");
      return null;
    }
    throw error;
  }
}

function resolveBaseUrl(running) {
  const address = running.server.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, "object");
  return `http://${address.address}:${String(address.port)}`;
}

test("gateway server serves healthz, projects, static, and dynamic routes", async (t) => {
  const running = await startGatewayOrSkip(t);
  if (running === null) {
    return;
  }

  try {
    const baseUrl = resolveBaseUrl(running);
    const health = await fetchJson(`${baseUrl}/healthz`);
    const projects = await fetchJson(`${baseUrl}/api/projects`);
    const staticHtml = await fetchText(`${baseUrl}/p/landing-a`);
    const dynamicInfo = await fetchJson(`${baseUrl}/app/service-b`);
    const runtimeResult = await fetchJson(`${baseUrl}/api/runtime/service-b?mode=smoke`);

    assert.equal(health.ok, true);
    assert.ok(Array.isArray(projects.projects));
    assert.ok(projects.projects.length >= 2);
    assert.match(staticHtml, /Landing A/);
    assert.equal(dynamicInfo.slug, "service-b");
    assert.equal(dynamicInfo.runtime, "dynamic");
    assert.equal(runtimeResult.service, "service-b");
    assert.equal(runtimeResult.query.mode, "smoke");
  } finally {
    await running.close();
  }
});
