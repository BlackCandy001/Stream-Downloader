#!/usr/bin/env node

/**
 * Compile Electron TypeScript files using esbuild
 * Outputs to dist-electron/
 */

import { build } from "esbuild";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");

console.log("🔨 Compiling Electron TypeScript files...");

const sharedOptions = {
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
    // Compile main process
    build({
      ...sharedOptions,
      entryPoints: [join(ROOT_DIR, "electron/main.ts")],
    }),

    // Compile preload (CJS format so contextBridge works correctly)
    build({
      ...sharedOptions,
      entryPoints: [join(ROOT_DIR, "electron/preload.ts")],
      format: "cjs",
      platform: "browser",
      target: "chrome120",
      external: ["electron"],
    }),
  ]);

  console.log("✅ Electron files compiled successfully");
  console.log("   → dist-electron/main.js");
  console.log("   → dist-electron/preload.js");
} catch (err) {
  console.error("❌ Compilation failed:", err.message);
  process.exit(1);
}
