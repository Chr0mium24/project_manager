import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createGatewayApp } from "./index.ts";
import { writeContentRepo } from "./test-fixtures.ts";

interface FilesPayload {
  slug: string;
  files: Array<{ path: string }>;
}

interface FileContentPayload {
  content: string;
}

void test("createGatewayApp serves project file listings and file content", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir);

  const filesResponse = await app.inject({ method: "GET", url: "/api/projects/landing-a/files" });
  const fileResponse = await app.inject({
    method: "GET",
    url: "/api/projects/landing-a/file?path=src/index.html"
  });
  const missingPathResponse = await app.inject({
    method: "GET",
    url: "/api/projects/landing-a/file"
  });
  const invalidPathResponse = await app.inject({
    method: "GET",
    url: "/api/projects/landing-a/file?path=../outside.txt"
  });

  const filesPayload: FilesPayload = filesResponse.json();
  const filePayload: FileContentPayload = fileResponse.json();

  assert.equal(filesResponse.statusCode, 200);
  assert.equal(filesPayload.slug, "landing-a");
  assert.deepEqual(
    filesPayload.files.map((file: { path: string }) => file.path),
    ["project.json", "src/index.html"]
  );
  assert.equal(fileResponse.statusCode, 200);
  assert.match(filePayload.content, /Landing A/);
  assert.equal(missingPathResponse.statusCode, 400);
  assert.equal(invalidPathResponse.statusCode, 400);

  await app.close();
});
