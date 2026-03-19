import test from "node:test";
import assert from "node:assert/strict";
import { validateProjectJson } from "../lib/validators.mjs";

test("accepts a valid project.json object", () => {
  const project = validateProjectJson({
    schemaVersion: 1,
    name: "Landing A",
    slug: "landing-a",
    runtime: "static",
    entry: "src/index.html",
    route: "/p/landing-a",
    visibility: "private",
    tags: ["landing", "promo"],
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z"
  }, "landing-a");

  assert.equal(project.slug, "landing-a");
});

test("rejects project.json with invalid slug", () => {
  assert.throws(() => {
    validateProjectJson({
      schemaVersion: 1,
      name: "Broken",
      slug: "Broken_Name",
      runtime: "static",
      entry: "src/index.html",
      route: "/p/broken-name",
      visibility: "private",
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:00.000Z"
    });
  }, /slug is invalid/);
});

test("rejects entry that points to drafts", () => {
  assert.throws(() => {
    validateProjectJson({
      schemaVersion: 1,
      name: "Draft Entry",
      slug: "draft-entry",
      runtime: "static",
      entry: "drafts/index.html",
      route: "/p/draft-entry",
      visibility: "private",
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:00.000Z"
    });
  }, /entry must start with src\//);
});

test("rejects a static project with a non-static route prefix", () => {
  assert.throws(() => {
    validateProjectJson({
      schemaVersion: 1,
      name: "Wrong Route",
      slug: "wrong-route",
      runtime: "static",
      entry: "src/index.html",
      route: "/app/wrong-route",
      visibility: "private",
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:00.000Z"
    });
  }, /static runtime route must start with \/p\//);
});
