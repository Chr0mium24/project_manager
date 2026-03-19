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

interface FileTreePayload {
  slug: string;
  tree: {
    kind: "directory";
    name: string;
    children: Array<{ kind: "directory" | "file"; name: string }>;
  };
}

interface FileContentPayload {
  content: string;
}

interface FileWritePayload {
  path: string;
  size: number;
  updatedAt: string;
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

void test("createGatewayApp serves a project file tree", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  fs.mkdirSync(path.join(rootDir, "content-repo", "projects", "landing-a", "src", "components"), {
    recursive: true
  });
  fs.writeFileSync(
    path.join(rootDir, "content-repo", "projects", "landing-a", "src", "components", "card.js"),
    'export const card = "ok";\n',
    "utf8"
  );
  const app = createGatewayApp(rootDir);

  const treeResponse = await app.inject({
    method: "GET",
    url: "/api/projects/landing-a/file-tree"
  });
  const treePayload: FileTreePayload = treeResponse.json();

  assert.equal(treeResponse.statusCode, 200);
  assert.equal(treePayload.slug, "landing-a");
  assert.deepEqual(
    treePayload.tree.children.map((child) => `${child.kind}:${child.name}`),
    ["directory:src", "file:project.json"]
  );

  await app.close();
});

void test("createGatewayApp writes project file content", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gateway-"));
  writeContentRepo(rootDir);
  const app = createGatewayApp(rootDir);

  const writeResponse = await app.inject({
    method: "PUT",
    url: "/api/projects/landing-a/file",
    payload: {
      path: "src/app.js",
      content: 'console.log("saved");\n'
    }
  });
  const readBackResponse = await app.inject({
    method: "GET",
    url: "/api/projects/landing-a/file?path=src/app.js"
  });
  const invalidWriteResponse = await app.inject({
    method: "PUT",
    url: "/api/projects/landing-a/file",
    payload: {
      path: "../outside.txt",
      content: "bad"
    }
  });

  const writePayload: FileWritePayload = writeResponse.json();
  const readBackPayload: FileContentPayload = readBackResponse.json();

  assert.equal(writeResponse.statusCode, 200);
  assert.equal(writePayload.path, "src/app.js");
  assert.equal(writePayload.size, Buffer.byteLength('console.log("saved");\n', "utf8"));
  assert.match(writePayload.updatedAt, /\d{4}-\d{2}-\d{2}T/);
  assert.equal(readBackResponse.statusCode, 200);
  assert.equal(readBackPayload.content, 'console.log("saved");\n');
  assert.equal(invalidWriteResponse.statusCode, 400);

  await app.close();
});
