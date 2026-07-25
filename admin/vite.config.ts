import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

function forbiddenPlugin(loginPath: string) {
  const ALLOWED_PATHS = [
    `/${loginPath}`,
    "/api",
    "/assets/",
    "/@react-refresh",
    "/node_modules/",
    "/@vite/",
    "/src/",
    "/favicon",
    "/vite.svg",
  ];

  return {
    name: "forbidden-plugin",
    configureServer(server: import("vite").ViteDevServer) {
      // Run BEFORE Vite's built-in middlewares (SPA fallback, etc.)
      // so '/' and unknown paths get real 403 before Vite serves index.html
      server.middlewares.use((req, res, next) => {
        const path = req.url ?? "/";
        // Allow known paths through
        const allowed = ALLOWED_PATHS.some((p) => path.startsWith(p));
        if (allowed) {
          return next();
        }
        // Everything else → 403 with no body
        res.statusCode = 403;
        res.end();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load .env vars properly — process.env belum siap saat config dievaluasi
  const env = loadEnv(mode, process.cwd(), "");
  const LOGIN_PATH = env.VITE_ADMIN_LOGIN_PATH || "iasniaguiagsiashas";
  const API_TARGET = env.VITE_API_TARGET || "http://localhost:3000";

  return {
    plugins: [react(), tailwindcss(), forbiddenPlugin(LOGIN_PATH)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        // BFF proxy: forward /api/* to Nest backend
        "/api": {
          target: API_TARGET,
          changeOrigin: true,
          // Rewrite /api/auth/* → /api/v1/auth/*
          rewrite: (p) => p.replace(/^\/api/, "/api/v1"),
        },
      },
    },
  };
});
