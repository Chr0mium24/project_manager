import fs from "node:fs";
import path from "node:path";
import type { z } from "zod";

export function writeTextArtifact(filePath: string, value: string): string {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
  return filePath;
}

export function appendTextArtifact(filePath: string, value: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, value, "utf8");
}

export function readTextArtifact(rootDir: string, relativePath: string | null): string {
  if (relativePath === null) {
    return "";
  }

  const artifactPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(artifactPath) || !fs.statSync(artifactPath).isFile()) {
    return "";
  }

  return fs.readFileSync(artifactPath, "utf8");
}

export function readJsonArtifact<T>(
  rootDir: string,
  relativePath: string | null,
  schema: z.ZodType<T>
): T | null {
  if (relativePath === null) {
    return null;
  }

  const artifactPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(artifactPath) || !fs.statSync(artifactPath).isFile()) {
    return null;
  }

  const rawValue: unknown = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  return schema.parse(rawValue);
}
