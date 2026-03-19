import {
  listProjectFiles,
  type ProjectFileRecord
} from "./project-files.ts";
import { readProject } from "./content-repo.ts";

export interface ProjectFileTreeFileNode {
  kind: "file";
  name: string;
  path: string;
  size: number;
}

export interface ProjectFileTreeDirectoryNode {
  kind: "directory";
  name: string;
  path: string;
  children: ProjectFileTreeNode[];
}

export type ProjectFileTreeNode = ProjectFileTreeDirectoryNode | ProjectFileTreeFileNode;

function compareTreeNodes(left: ProjectFileTreeNode, right: ProjectFileTreeNode): number {
  if (left.kind !== right.kind) {
    return left.kind === "directory" ? -1 : 1;
  }

  return left.name.localeCompare(right.name);
}

function sortTree(node: ProjectFileTreeDirectoryNode): ProjectFileTreeDirectoryNode {
  node.children = node.children
    .map((child) => (child.kind === "directory" ? sortTree(child) : child))
    .sort(compareTreeNodes);
  return node;
}

function findOrCreateDirectory(
  rootNode: ProjectFileTreeDirectoryNode,
  directoryPath: string
): ProjectFileTreeDirectoryNode {
  if (directoryPath.length === 0) {
    return rootNode;
  }

  const segments = directoryPath.split("/");
  let currentNode = rootNode;
  let currentPath = "";

  for (const segment of segments) {
    currentPath = currentPath.length === 0 ? segment : `${currentPath}/${segment}`;
    const existingNode = currentNode.children.find(
      (child): child is ProjectFileTreeDirectoryNode =>
        child.kind === "directory" && child.name === segment
    );

    if (existingNode) {
      currentNode = existingNode;
      continue;
    }

    const nextNode: ProjectFileTreeDirectoryNode = {
      kind: "directory",
      name: segment,
      path: currentPath,
      children: []
    };
    currentNode.children.push(nextNode);
    currentNode = nextNode;
  }

  return currentNode;
}

function appendFileNode(
  rootNode: ProjectFileTreeDirectoryNode,
  fileRecord: ProjectFileRecord
): void {
  const segments = fileRecord.path.split("/");
  const fileName = segments.pop() ?? fileRecord.path;
  const directoryPath = segments.join("/");
  const parentNode = findOrCreateDirectory(rootNode, directoryPath);

  parentNode.children.push({
    kind: "file",
    name: fileName,
    path: fileRecord.path,
    size: fileRecord.size
  });
}

export function buildProjectFileTree(
  slug: string,
  files: ProjectFileRecord[]
): ProjectFileTreeDirectoryNode {
  const rootNode: ProjectFileTreeDirectoryNode = {
    kind: "directory",
    name: slug,
    path: "",
    children: []
  };

  for (const fileRecord of files) {
    appendFileNode(rootNode, fileRecord);
  }

  return sortTree(rootNode);
}

export function readProjectFileTree(
  rootDir: string,
  slug: string
): ProjectFileTreeDirectoryNode | null {
  const project = readProject(rootDir, slug);
  if (project === null) {
    return null;
  }

  return buildProjectFileTree(slug, listProjectFiles(rootDir, slug) ?? []);
}
