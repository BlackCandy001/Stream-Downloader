#!/usr/bin/env node

/**
 * Script to run Electron app with Vite dev server
 * Steps:
 *  1. Compile electron/main.ts + electron/preload.ts → dist-electron/
 *  2. Spawn Electron pointing at dist-electron/main.js
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");

// ─── Step 1: Compile TypeScript sources ───────────────────────────────────────
console.log("🔨 Compiling Electron TypeScript...\n");

const sharedBuildOpts = {
  bundle: true,
  platform: "node",
  target: "node18",
  format: "esm",
  external: [
    "electron",
    "fs",
    "path",
    "url",
    "os",
    "child_process",
    "http",
    "https",
    "net",
    "stream",
    "events",
    "util",
    "crypto",
    "buffer",
    "fs/promises",
    "m3u8-parser",
    "node-fetch",
    "fluent-ffmpeg",
    "@distube/ytdl-core",
  ],
  outdir: join(ROOT_DIR, "dist-electron"),
  sourcemap: "inline",
};

try {
  await Promise.all([
    // Main process (ESM)
    build({
      ...sharedBuildOpts,
      entryPoints: [join(ROOT_DIR, "electron/main.ts")],
    }),

    // Preload (CJS so contextBridge works correctly in renderer)
    build({
      ...sharedBuildOpts,
      entryPoints: [join(ROOT_DIR, "electron/preload.ts")],
      format: "cjs",
      platform: "browser",
      target: "chrome120",
      external: ["electron"],
    }),
  ]);

  console.log("✅ Compilation done\n");
} catch (err) {
  console.error("❌ Compilation failed:", err.message);
  process.exit(1);
}

// ─── Step 2: Detect Vite port ────────────────────────────────────────────────
// Use /@vite/client — only Vite dev server serves this endpoint
async function detectVitePort(startPort = 5173, maxAttempts = 10) {
  const { default: http } = await import("http");
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(
          `http://localhost:${port}/@vite/client`,
          { timeout: 1000 },
          (res) => {
            // Vite returns 200 for /@vite/client
            if (res.statusCode === 200) resolve(port);
            else reject(new Error(`Status ${res.statusCode}`));
          },
        );
        req.on("error", reject);
        req.on("timeout", () => {
          req.destroy();
          reject(new Error("timeout"));
        });
      });
      return port;
    } catch {
      // Not Vite on this port, try next
    }
  }
  return null;
}

const vitePort = await detectVitePort();

if (!vitePort) {
  console.error("❌ No Vite dev server found on ports 5173-5182.");
  console.log("");
  console.log("Please start Vite first in another terminal:");
  console.log("  npm run dev");
  console.log("");
  process.exit(1);
}

// ─── Step 3: Launch Electron ──────────────────────────────────────────────────
const env = {
  ...process.env,
  VITE_DEV_SERVER_URL: `http://localhost:${vitePort}`,
  ELECTRON_ENABLE_LOGGING: "1",
};

console.log("🚀 Starting Electron...");
console.log("📱 Vite Dev Server:", env.VITE_DEV_SERVER_URL);
console.log("📂 Project root:", ROOT_DIR);
console.log("");
console.log("ℹ️  Make sure Vite is running: npm run dev");
console.log("");

const electron = spawn("npx", ["electron", "."], {
  cwd: ROOT_DIR,
  env,
  stdio: "inherit",
  shell: true,
});

electron.on("close", (code) => {
  console.log("");
  console.log("👋 Electron closed");
  process.exit(code || 0);
});

electron.on("error", (err) => {
  console.error("❌ Failed to start Electron:", err.message);
  console.log("");
  console.log("Make sure you have run:");
  console.log("  1. npm install");
  console.log("  2. npm run dev (in another terminal, for Vite server)");
  console.log("");
  process.exit(1);
});
