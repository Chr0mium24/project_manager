import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  buildProjectFileTree,
  readProjectFileTree,
  type ProjectFileTreeDirectoryNode,
  type ProjectFileTreeNode
} from "./index.ts";
import {
  createTempRoot,
  writeContentRepo
} from "./test-fixtures.ts";

function isDirectoryNode(node: ProjectFileTreeNode): node is ProjectFileTreeDirectoryNode {
  return node.kind === "directory";
}

void test("buildProjectFileTree groups files into sorted directories", () => {
  const tree = buildProjectFileTree("landing-a", [
    { path: "project.json", size: 10 },
    { path: "src/index.html", size: 20 },
    { path: "src/components/card.js", size: 30 },
    { path: "assets/logo.svg", size: 40 }
  ]);

  assert.deepEqual(tree, {
    kind: "directory",
    name: "landing-a",
    path: "",
    children: [
      {
        kind: "directory",
        name: "assets",
        path: "assets",
        children: [
          {
            kind: "file",
            name: "logo.svg",
            path: "assets/logo.svg",
            size: 40
          }
        ]
      },
      {
        kind: "directory",
        name: "src",
        path: "src",
        children: [
          {
            kind: "directory",
            name: "components",
            path: "src/components",
            children: [
              {
                kind: "file",
                name: "card.js",
                path: "src/components/card.js",
                size: 30
              }
            ]
          },
          {
            kind: "file",
            name: "index.html",
            path: "src/index.html",
            size: 20
          }
        ]
      },
      {
        kind: "file",
        name: "project.json",
        path: "project.json",
        size: 10
      }
    ]
  });
});

void test("readProjectFileTree returns a tree for the managed project", () => {
  const rootDir = createTempRoot();
  writeContentRepo(rootDir);

  fs.mkdirSync(path.join(rootDir, "content-repo", "projects", "landing-a", "src", "components"), {
    recursive: true
  });
  fs.writeFileSync(
    path.join(rootDir, "content-repo", "projects", "landing-a", "src", "components", "card.js"),
    'export const card = "ok";\n',
    "utf8"
  );

  const tree = readProjectFileTree(rootDir, "landing-a");
  assert.notEqual(tree, null);
  assert.equal(tree.kind, "directory");
  assert.equal(tree.name, "landing-a");
  assert.deepEqual(
    tree.children.map((child) => `${child.kind}:${child.name}`),
    ["directory:src", "file:project.json"]
  );

  const srcNode = tree.children.find((child) => child.name === "src");
  assert.notEqual(srcNode, undefined);
  assert.equal(isDirectoryNode(srcNode), true);
  if (!isDirectoryNode(srcNode)) {
    throw new Error("expected src node to be a directory");
  }
  assert.deepEqual(
    srcNode.children.map((child) => `${child.kind}:${child.name}`),
    ["directory:components", "file:index.html"]
  );
});
