import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import {
  isPlatformDocumentPath,
  PROJECT_MANAGER_UI_SOURCE_HEADER,
  VITE_DEV_UI_SOURCE
} from "./src/platform-dev-server.ts";

const gatewayOrigin = process.env.VITE_GATEWAY_ORIGIN ?? "http://127.0.0.1:3101";
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const INDEX_HTML_PATH = path.join(CURRENT_DIR, "index.html");

function projectManagerSpaFallback(): Plugin {
  return {
    name: "project-manager-spa-fallback",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        void (async () => {
          const method = request.method ?? "GET";
          const pathname = request.url?.split("?")[0] ?? "/";

          if (method !== "GET") {
            next();
            return;
          }

          if (!isPlatformDocumentPath(pathname)) {
            next();
            return;
          }

          const template = await fs.readFile(INDEX_HTML_PATH, "utf8");
          const html = await server.transformIndexHtml(pathname, template);
          response.statusCode = 200;
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.setHeader("Cache-Control", "no-store");
          response.setHeader(PROJECT_MANAGER_UI_SOURCE_HEADER, VITE_DEV_UI_SOURCE);
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
