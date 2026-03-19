import test from "node:test";
import assert from "node:assert/strict";
import { validateProjectsIndex } from "../lib/validators.mjs";

test("accepts a sorted projects-index", () => {
  const index = validateProjectsIndex({
    version: 1,
    generatedAt: "2026-03-19T00:00:00.000Z",
    projects: [
      {
        slug: "landing-a",
        path: "projects/landing-a",
        name: "Landing A",
        runtime: "static",
        visibility: "private",
        entry: "src/index.html",
        route: "/p/landing-a",
        updatedAt: "2026-03-19T00:00:00.000Z"
      },
      {
        slug: "service-b",
        path: "projects/service-b",
        name: "Service B",
        runtime: "dynamic",
        visibility: "unlisted",
        entry: "src/server.ts",
        route: "/app/service-b",
        updatedAt: "2026-03-19T00:10:00.000Z"
      }
    ]
  });

  assert.equal(index.projects.length, 2);
});

test("rejects an unsorted projects-index", () => {
  assert.throws(() => {
    validateProjectsIndex({
      version: 1,
      generatedAt: "2026-03-19T00:00:00.000Z",
      projects: [
        {
          slug: "service-b",
          path: "projects/service-b",
          name: "Service B",
          runtime: "dynamic",
          visibility: "unlisted",
          entry: "src/server.ts",
          route: "/app/service-b",
          updatedAt: "2026-03-19T00:10:00.000Z"
        },
        {
          slug: "landing-a",
          path: "projects/landing-a",
          name: "Landing A",
          runtime: "static",
          visibility: "private",
          entry: "src/index.html",
          route: "/p/landing-a",
          updatedAt: "2026-03-19T00:00:00.000Z"
        }
      ]
    });
  }, /sorted by slug/);
});
