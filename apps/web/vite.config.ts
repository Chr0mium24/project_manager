import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const gatewayOrigin = process.env.VITE_GATEWAY_ORIGIN ?? "http://127.0.0.1:3101";
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const INDEX_HTML_PATH = path.join(CURRENT_DIR, "index.html");

function isPlatformPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/projects" || pathname.startsWith("/projects/");
}

function projectManagerSpaFallback(): Plugin {
  return {
    name: "project-manager-spa-fallback",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        void (async () => {
          const method = request.method ?? "GET";
          const pathname = request.url?.split("?")[0] ?? "/";
          const acceptsHtml = request.headers.accept?.includes("text/html") ?? false;

          if (method !== "GET" || !acceptsHtml || !isPlatformPath(pathname)) {
            next();
            return;
          }

          const template = await fs.readFile(INDEX_HTML_PATH, "utf8");
          const html = await server.transformIndexHtml(pathname, template);
          response.statusCode = 200;
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.end(html);
        })().catch(next);
      });
    }
  };
}

export default defineConfig({
  appType: "spa",
  plugins: [projectManagerSpaFallback()],
  server: {
    host: "127.0.0.1",
    port: 3100,
    strictPort: true,
    proxy: {
      "/api": gatewayOrigin,
      "/p": gatewayOrigin,
      "/app": gatewayOrigin,
      "/healthz": gatewayOrigin
    }
  },
  build: {
    outDir: "./dist",
    emptyOutDir: true
  }
});
