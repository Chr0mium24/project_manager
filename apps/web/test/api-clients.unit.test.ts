import { afterEach, describe, expect, it, vi } from "vitest";
import { AiTaskApiClient } from "../src/ai-task-api.ts";
import { GatewayProjectApiClient } from "../src/gateway-api.ts";

const originalFetch = globalThis.fetch;

describe("browser api clients", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("binds the default fetch for ai task requests", async () => {
    globalThis.fetch = function fetchWithRequiredThis(this: unknown): Promise<Response> {
      expect(this).toBe(globalThis);
      return Promise.resolve(Response.json({
        tasks: []
      }));
    } as typeof fetch;

    const client = new AiTaskApiClient();
    await expect(client.listTasks()).resolves.toEqual([]);
  });

  it("binds the default fetch for project api requests", async () => {
    globalThis.fetch = function fetchWithRequiredThis(this: unknown): Promise<Response> {
      expect(this).toBe(globalThis);
      return Promise.resolve(Response.json({
        projects: []
      }));
    } as typeof fetch;

    const client = new GatewayProjectApiClient();
    await expect(client.listProjects()).resolves.toEqual([]);
  });

  it("reads a project detail payload that includes the managed project path", async () => {
    const client = new GatewayProjectApiClient({
      fetch: () =>
        Promise.resolve(Response.json({
          schemaVersion: 1,
          slug: "landing-a",
          path: "projects/landing-a",
          name: "Landing A",
          description: "Official sample static project",
          runtime: "static",
          visibility: "private",
          entry: "src/index.html",
          route: "/p/landing-a",
          tags: ["landing", "sample"],
          latestVersion: "v1",
          mainLanguage: "html",
          framework: "vanilla",
          owner: "project-manager",
          createdAt: "2026-03-20T00:00:00.000Z",
          updatedAt: "2026-03-20T00:00:00.000Z"
        }))
    });

    await expect(client.readProject("landing-a")).resolves.toMatchObject({
      slug: "landing-a",
      path: "projects/landing-a",
      route: "/p/landing-a"
    });
  });

  it("verifies an admin session with bearer auth", async () => {
    let capturedInit: RequestInit | undefined;
    const fetchSpy: typeof fetch = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => {
      capturedInit = _init;
      return Promise.resolve(Response.json({ ok: true }));
    }) as typeof fetch;
    const client = new GatewayProjectApiClient({
      adminToken: "secret-token",
      fetch: fetchSpy
    });

    await expect(client.verifyAdminSession()).resolves.toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(capturedInit?.method).toBe("POST");
    expect(capturedInit?.headers).toMatchObject({
      authorization: "Bearer secret-token"
    });
    expect(capturedInit?.body).toBeUndefined();
    expect(capturedInit?.headers).not.toHaveProperty("content-type");
  });
});
