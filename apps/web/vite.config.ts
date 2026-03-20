import { defineConfig } from "vite";

const gatewayOrigin = process.env.VITE_GATEWAY_ORIGIN ?? "http://127.0.0.1:3101";

export default defineConfig({
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
