import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { validateContentRepo } from "./validators.mjs";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sendJson(res, statusCode, value) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value, null, 2));
}

function sendText(res, statusCode, value, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, { "content-type": contentType });
  res.end(value);
}

function loadContent(contentRepoRoot) {
  validateContentRepo(contentRepoRoot);
  const index = readJson(path.join(contentRepoRoot, "projects-index.json"));
  const projects = new Map();

  for (const item of index.projects) {
    const projectDir = path.join(contentRepoRoot, item.path);
    const project = readJson(path.join(projectDir, "project.json"));
    projects.set(project.slug, {
      ...project,
      absoluteProjectDir: projectDir
    });
  }

  return {
    index,
    projects
  };
}

export function startDebugServer({ contentRepoRoot, port = 0, host = "127.0.0.1" }) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${host}:${port}`);
    const { index, projects } = loadContent(contentRepoRoot);

    if (url.pathname === "/healthz") {
      return sendJson(res, 200, { ok: true });
    }

    if (url.pathname === "/api/projects") {
      return sendJson(res, 200, index);
    }

    if (url.pathname.startsWith("/api/projects/")) {
      const slug = url.pathname.slice("/api/projects/".length);
      const project = projects.get(slug);
      if (!project) {
        return sendJson(res, 404, { error: "project not found" });
      }
      const { absoluteProjectDir, ...publicProject } = project;
      return sendJson(res, 200, publicProject);
    }

    if (url.pathname.startsWith("/p/")) {
      const slug = url.pathname.slice("/p/".length);
      const project = projects.get(slug);
      if (!project || project.runtime !== "static") {
        return sendJson(res, 404, { error: "static project not found" });
      }
      const filePath = path.join(project.absoluteProjectDir, project.entry);
      return sendText(res, 200, fs.readFileSync(filePath, "utf8"), "text/html; charset=utf-8");
    }

    if (url.pathname.startsWith("/app/")) {
      const slug = url.pathname.slice("/app/".length);
      const project = projects.get(slug);
      if (!project || project.runtime !== "dynamic") {
        return sendJson(res, 404, { error: "dynamic project not found" });
      }
      return sendJson(res, 200, {
        ok: true,
        slug: project.slug,
        runtime: project.runtime,
        route: project.route,
        entry: project.entry,
        debug: "dynamic runtime execution is not implemented in validation server"
      });
    }

    return sendJson(res, 404, { error: "not found" });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const address = server.address();
      resolve({
        server,
        host,
        port: typeof address === "object" && address ? address.port : port,
        close: () => new Promise((closeResolve, closeReject) => {
          server.close((err) => {
            if (err) {
              closeReject(err);
              return;
            }
            closeResolve();
          });
        })
      });
    });
  });
}
