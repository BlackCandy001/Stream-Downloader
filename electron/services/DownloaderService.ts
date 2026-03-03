import { spawn, ChildProcess } from "child_process";
import { BrowserWindow, app } from "electron";
import path from "path";
import fs from "fs/promises";
import { existsSync, createWriteStream } from "fs";
import { fileURLToPath } from "url";
import { shell } from "electron";
import { SettingsService } from "./SettingsService.js";
import { HistoryService } from "./HistoryService.js";
import { DownloaderCore } from "../core/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface DownloadTask {
  id: string;
  status:
    | "pending"
    | "downloading"
    | "paused"
    | "completed"
    | "failed"
    | "cancelled";
  progress: number;
  speed: number;
  downloadedBytes: number;
  totalBytes: number;
  eta?: number;
  downloadedSegments: number;
  totalSegments: number;
  options: any;
  process?: ChildProcess;
  outputLines: string[];
  outputPath?: string;
  startTime: number;
  errorMessage?: string;
}

export class DownloaderService {
  private downloads: Map<string, DownloadTask> = new Map();
  private settingsService: SettingsService;
  private historyService: HistoryService;
  private backendPath: string;
  private mainWindow: BrowserWindow | null = null;
  private downloaderCore: DownloaderCore;

  constructor(settingsService: SettingsService, historyService: HistoryService) {
    this.settingsService = settingsService;
    this.historyService = historyService;

    // Determine backend path based on platform
    const platform = process.platform;
    this.backendPath = path.join(
      __dirname,
      "../../backend/bin",
      this.getBackendExecutable(platform),
    );

    this.downloaderCore = new DownloaderCore();
    // Note: progress events from DownloaderCore are forwarded per-download
    // via the activeDownloadId mechanism below
  }

  setMainWindow(window: BrowserWindow | null) {
    this.mainWindow = window;
  }
 
  private async recordHistory(task: DownloadTask) {
    try {
      const duration = Math.floor((Date.now() - task.startTime) / 1000);
      await this.historyService.addHistory({
        url: task.options.url,
        filename: task.options.title || "Unknown",
        savePath: task.outputPath || task.options.savePath || "",
        streamInfo: {
          type: task.options.type || "Unknown",
          quality: task.options.quality || "Unknown",
          language: task.options.language || "Unknown",
        },
        fileSize: task.downloadedBytes,
        status: task.status as "completed" | "failed" | "cancelled",
        createdAt: new Date(task.startTime).toISOString(),
        completedAt: new Date().toISOString(),
        duration,
        errorMessage: task.errorMessage
      });
    } catch (err) {
      console.error("[DownloaderService] Failed to record history:", err);
    }
  }

  private getBackendExecutable(platform: string): string {
    switch (platform) {
      case "win32":
        return "N_m3u8DL-RE.exe";
      case "darwin":
        return "N_m3u8DL-RE";
      case "linux":
        return "N_m3u8DL-RE";
      default:
        return "N_m3u8DL-RE";
    }
  }

  async parseStream(url: string, options: any): Promise<any> {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      try {
        const ytdl = (await import("@distube/ytdl-core")).default;
        const info = await ytdl.getInfo(url);
        const streams = info.formats
          .filter((f: any) => f.hasVideo && f.hasAudio)
          .map((f: any) => ({
            id: f.itag.toString(),
            type: "video",
            quality: f.qualityLabel || `${f.audioBitrate}kbps`,
            bandwidth: f.bitrate,
            codecs: f.codecs,
            url: f.url,
          }));

        if (streams.length === 0) {
          streams.push({
            id: "highest",
            type: "video",
            quality: "Highest Quality",
            bandwidth: 0,
            codecs: "unknown",
            url: url,
          });
        }

        return {
          success: true,
          streams,
          metadata: {
            title: info.videoDetails.title,
            sourceType: "YOUTUBE",
          },
        };
      } catch (e: any) {
        return {
          success: false,
          error: `Failed to parse YouTube: ${e.message}`,
        };
      }
    }

    // Try native Node.js parser for HLS (now handles HTML extraction too)
    try {
      const result = await this.downloaderCore.parse(url, options.headers);
      return {
        success: true,
        streams: result.streams.map((s: any) => ({
          ...s,
          quality: s.resolution || "Unknown",
        })),
        metadata: {
          title: result.title,
          sourceType: "HLS",
        },
      };
    } catch (e) {
      console.warn("Native parser failed, falling back to binary:", e);
    }

    const tmpDir = path.join(app.getPath("temp"), `stream-parse-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });

    return new Promise((resolve) => {
      const args = [
        "--skip-download",
        "--write-meta-json",
        "--tmp-dir",
        tmpDir,
        url,
      ];

      if (options.headers) {
        for (const [key, value] of Object.entries(options.headers)) {
          args.push("--headers", `${key}:${value}`);
        }
      }

      const rid =
        process.platform === "win32"
          ? "win-x64"
          : process.platform === "darwin"
            ? "osx-x64"
            : "linux-x64";
      const binPath = path.join(
        path.dirname(this.backendPath),
        rid,
        this.getBackendExecutable(process.platform),
      );

      const childProcess = spawn(binPath, args, {
        cwd: tmpDir,
      });

      childProcess.on("close", async (code) => {
        try {
          // Look for .json files in tmpDir
          const files = await fs.readdir(tmpDir);
          const metaFile = files.find((f) => f.endsWith(".json"));

          if (metaFile) {
            const content = await fs.readFile(
              path.join(tmpDir, metaFile),
              "utf-8",
            );
            const meta = JSON.parse(content);

            // Map N_m3u8DL-RE meta to our app's format
            const streams = (meta.Streams || []).map((s: any, idx: number) => ({
              id: `${s.Type?.toLowerCase() || "video"}-${s.Id || idx}`,
              type: s.Type?.toLowerCase() || "video",
              quality: s.Resolution || s.Name,
              bandwidth: s.Bandwidth,
              codecs: s.Codecs,
              url: url,
            }));

            resolve({
              success: true,
              streams,
              metadata: {
                title: meta.Title || "Detected Stream",
                sourceType: meta.Type || "HLS",
              },
            });
          } else {
            resolve({
              success: false,
              error: `No metadata found. Backend exit code: ${code}`,
            });
          }
        } catch (error: any) {
          resolve({
            success: false,
            error: `Failed to parse metadata: ${error.message}`,
          });
        } finally {
          // Cleanup tmpDir
          try {
            await fs.rm(tmpDir, { recursive: true, force: true });
          } catch (e) {
            console.error("Failed to cleanup tmp dir:", e);
          }
        }
      });

      childProcess.on("error", (err) => {
        resolve({ success: false, error: `Process error: ${err.message}` });
      });
    });
  }

  async startDownload(options: any): Promise<string> {
    const downloadId = `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const task: DownloadTask = {
      id: downloadId,
      status: "pending",
      progress: 0,
      speed: 0,
      downloadedBytes: 0,
      totalBytes: 1,
      downloadedSegments: 0,
      totalSegments: 100,
      options,
      outputLines: [],
      startTime: Date.now(),
    };

    this.downloads.set(downloadId, task);

    // Spawn backend process
    const settings = await this.settingsService.getSettings();

    const args = this.buildCommandLineArgs(options, settings);

    // Native YouTube download support
    if (
      options.url.includes("youtube.com") ||
      options.url.includes("youtu.be") ||
      options.type === "YOUTUBE"
    ) {
      const saveDir =
        options.savePath && options.savePath.trim() !== ""
          ? options.savePath
          : settings.defaultSaveFolder || app.getPath("downloads");

      const safeOutputPath = this.getSafeOutputPath(saveDir, options.title);
      task.outputPath = safeOutputPath;
      task.status = "downloading";

      (async () => {
        try {
          const ytdl = (await import("@distube/ytdl-core")).default;
          const fs = await import("fs");
          
          let formatOptions: any = { 
            quality: "highest", 
            filter: (format: any) => format.hasVideo && format.hasAudio, // More reliable than 'audioandvideo' string
            highWaterMark: 1 << 25, // Increase buffer to 32MB for smoother download
            requestOptions: {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.9",
                "Origin": "https://www.youtube.com",
                "Referer": "https://www.youtube.com/",
              }
            }
          };
          
          // If a specific stream ID was provided and it's an itag, try to use it
          if (options.selectedStreamIds && options.selectedStreamIds.length > 0) {
            const itagStr = options.selectedStreamIds[0];
            if (itagStr !== "highest" && !isNaN(Number(itagStr))) {
              formatOptions.quality = Number(itagStr);
            }
          }

          const stream = ytdl(options.url, formatOptions);
          
          let lastTime = Date.now();
          let lastDownloadedBytes = 0;

          stream.on(
            "progress",
            (chunkLength: number, downloadedBytes: number, totalBytes: number) => {
              const now = Date.now();
              const timeDiff = (now - lastTime) / 1000; // in seconds
              
              if (timeDiff >= 0.5) { // update speed every 0.5s
                const bytesDiff = downloadedBytes - lastDownloadedBytes;
                task.speed = bytesDiff > 0 ? bytesDiff / timeDiff : 0;
                lastTime = now;
                lastDownloadedBytes = downloadedBytes;
              }

              task.downloadedBytes = downloadedBytes;
              task.totalBytes = totalBytes;
              task.progress =
                totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;
              task.downloadedSegments = downloadedBytes;
              task.totalSegments = totalBytes;
              this.broadcastProgress(task);
            }
          );

          Object.defineProperty(task, 'process', {
            value: {
              kill: () => {
                stream.destroy();
              }
            },
            writable: true
          });

          const fileStream = createWriteStream(safeOutputPath);
          stream.pipe(fileStream);

          stream.on("end", () => {
            task.status = "completed";
            task.progress = 100;
            task.outputPath = safeOutputPath;
            if (settings.openFolderWhenComplete && task.outputPath) {
              shell.showItemInFolder(task.outputPath);
            }
            this.recordHistory(task);
            this.broadcastProgress(task);
            this.downloads.delete(downloadId);
          });

          stream.on("error", (err: any) => {
            console.error(`[DownloaderService] YouTube Download ${downloadId} failed:`, err.message);
            task.status = "failed";
            task.outputLines.push(`YouTube download error: ${err.message}`);
            task.errorMessage = err.message;
            this.recordHistory(task);
            this.broadcastProgress(task);
            this.downloads.delete(downloadId);
          });
        } catch (err: any) {
          console.error(`[DownloaderService] YouTube Setup Download ${downloadId} failed:`, err.message);
          task.status = "failed";
          task.outputLines.push(`YouTube setup error: ${err.message}`);
          task.errorMessage = err.message;
          this.recordHistory(task);
          this.broadcastProgress(task);
          // this.downloads.delete(downloadId);
        }
      })();

      return downloadId;
    }

    // Use native downloader core if it's an HLS stream
    if (options.url.includes(".m3u8") || options.type === "HLS") {
      // Fix #6 & New Feature: Use defaultSaveFolder as fallback if options.savePath is missing
      const saveDir =
        options.savePath && options.savePath.trim() !== ""
          ? options.savePath
          : settings.defaultSaveFolder || app.getPath("downloads");

      const safeOutputPath = this.getSafeOutputPath(saveDir, options.title);
      task.outputPath = safeOutputPath;

      // Fix #C: Auto-inject Referer header from origin URL to bypass anti-hotlink protection
      const urlOrigin = (() => {
        try {
          return new URL(options.url).origin;
        } catch {
          return "";
        }
      })();
      const mergedHeaders: Record<string, string> = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
        Connection: "keep-alive",
        ...(urlOrigin ? { Referer: urlOrigin + "/" } : {}),
        ...(options.headers || {}),
      };
      const downloadOptions = { ...options, headers: mergedHeaders };

      // Fix #2: Forward progress events with downloadId attached
      const onProgress = (p: any) => {
        task.downloadedSegments = p.downloadedSegments || 0;
        task.totalSegments = p.totalSegments || task.totalSegments;
        task.progress = p.progress || 0;
        task.speed = p.speed || 0;
        this.broadcastProgress(task);
      };
      this.downloaderCore.on("progress", onProgress);

      // Fix #1: Handle both success and failure to update task status
      this.downloaderCore
        .download(options.url, safeOutputPath, downloadOptions)
        .then(() => {
          task.status = "completed";
          task.progress = 100;
          task.outputPath = safeOutputPath;

          // Auto-open folder if enabled
          if (settings.openFolderWhenComplete && task.outputPath) {
            shell.showItemInFolder(task.outputPath);
          }

          this.recordHistory(task);
          this.broadcastProgress(task);
          this.downloaderCore.off("progress", onProgress);
          // Keep in memory for UI sync until explicitly removed or app restart
          // this.downloads.delete(downloadId);
        })
        .catch((err) => {
          console.error(
            `[DownloaderService] Download ${downloadId} failed:`,
            err.message,
          );
          task.status = "failed";
          task.outputLines.push(`Download error: ${err.message}`);
          task.errorMessage = err.message;
          this.recordHistory(task);
          this.broadcastProgress(task);
          this.downloaderCore.off("progress", onProgress);
          // Keep in memory for UI sync until explicitly removed or app restart
          // this.downloads.delete(downloadId);
        });

      task.status = "downloading";
      return downloadId;
    }

    console.log("Starting download with args:", args);

    try {
      const rid =
        process.platform === "win32"
          ? "win-x64"
          : process.platform === "darwin"
            ? "osx-x64"
            : "linux-x64";
      const binPath = path.join(
        path.dirname(this.backendPath),
        rid,
        this.getBackendExecutable(process.platform),
      );

      const childProcess = spawn(binPath, args, {
        cwd: path.dirname(binPath),
        env: { ...process.env },
      });

      task.process = childProcess;
      task.status = "downloading";

      childProcess.stdout.on("data", (data: Buffer) => {
        const line = data.toString();
        task.outputLines.push(line);
        this.parseProgress(downloadId, line);
      });

      childProcess.stderr.on("data", (data: Buffer) => {
        const line = data.toString();
        task.outputLines.push(line);
        console.error(`Download ${downloadId} error:`, line);
      });

      childProcess.on("close", (code) => {
        if (code === 0) {
          task.status = "completed";
          task.progress = 100;

          // Auto-open folder if enabled
          if (settings.openFolderWhenComplete && task.outputPath) {
            shell.showItemInFolder(task.outputPath);
          }
        } else {
          task.status = "failed";
          task.errorMessage = `Exit code ${code}`;
        }
        this.recordHistory(task);
        this.broadcastProgress(task);
        // Keep in memory for UI sync
        // this.downloads.delete(downloadId);
      });
    } catch (error: any) {
      task.status = "failed";
      task.outputLines.push(`Spawn error: ${error.message}`);
      task.errorMessage = error.message;
      this.recordHistory(task);
      this.broadcastProgress(task);
      // Keep in memory for UI sync
      // this.downloads.delete(downloadId);
      throw error;
    }

    return downloadId;
  }

  private buildCommandLineArgs(options: any, settings: any): string[] {
    const args: string[] = [];

    // Input URL
    args.push(options.url);

    // Save directory
    if (options.savePath) {
      args.push("--save-dir", options.savePath);
    }

    // Fix: Explicitly set save name to match our safe output path logic
    const saveName = path.basename(
      this.getSafeOutputPath(options.savePath || ".", options.title),
      ".mp4",
    );
    args.push("--save-name", saveName);

    // Thread count
    if (options.threadCount || settings.defaultThreadCount) {
      args.push(
        "--thread-count",
        String(options.threadCount || settings.defaultThreadCount),
      );
    }

    // Speed limit
    if (options.maxSpeed) {
      args.push("--max-speed", String(options.maxSpeed));
    }

    // Headers
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        args.push("--headers", `${key}:${value}`);
      }
    }

    // ===== STREAM SELECTION =====
    if (options.selectedStreamIds && options.selectedStreamIds.length > 0) {
      // For N_m3u8DL-RE, we can use specific selection flags.
      // If the IDs are from our parser, we might need to map them back.
      // Assuming the parser logic provides IDs that can be used directly or as indices.
      // Common practice: use --select-video, --select-audio, --select-subtitle

      // Simple strategy for now: if user selected specific streams, we try to pass them.
      // Note: N_m3u8DL-RE often uses regex or index for selection.
      // We'll pass them as custom args or specific flags if we know which is which.
      options.selectedStreamIds.forEach((id: string) => {
        // This is a placeholder logic - real logic would depend on what IDs the parser returns
        // or using index selection like: --select-video index=0
        if (id.startsWith("video-"))
          args.push("--select-video", `id=${id.replace("video-", "")}`);
        else if (id.startsWith("audio-"))
          args.push("--select-audio", `id=${id.replace("audio-", "")}`);
        else if (id.startsWith("subtitle-"))
          args.push("--select-subtitle", `id=${id.replace("subtitle-", "")}`);
        else args.push("--select-video", id); // Fallback
      });
    }

    // ===== DRM & DECRYPTION OPTIONS =====

    // Decryption keys
    if (options.keys && options.keys.length > 0) {
      args.push("--keys", options.keys.join(","));
    }

    // Key text file
    if (options.keyTextFile) {
      args.push("--key-text-file", options.keyTextFile);
    }

    // Custom HLS key
    if (options.customHLSKey) {
      args.push("--custom-hls-key", options.customHLSKey);
    }

    // Custom HLS IV
    if (options.customHLSIv) {
      args.push("--custom-hls-iv", options.customHLSIv);
    }

    // Decryption engine
    if (options.decryptionEngine) {
      args.push("--decryption-engine", options.decryptionEngine);
    }

    // Decryption binary path
    if (options.decryptionBinaryPath) {
      args.push("--decryption-binary-path", options.decryptionBinaryPath);
    }

    // MP4 real-time decryption
    if (options.MP4RealTimeDecryption) {
      args.push("--mp4-real-time-decryption");
    }

    // Use shaka packager
    if (options.useShakaPackager) {
      args.push("--use-shaka-packager");
    }

    // ===== MERGE & MUX OPTIONS =====

    // Auto merge
    if (options.autoMerge !== false) {
      args.push("--auto-merge");
    }

    // Binary merge
    if (options.binaryMerge) {
      args.push("--binary-merge");
    }

    // Mux after done
    if (options.muxAfterDone) {
      args.push("--mux-after-done");
    }

    // Mux imports
    if (options.muxImports && options.muxImports.length > 0) {
      for (const importFile of options.muxImports) {
        args.push("--mux-import", importFile);
      }
    }

    // FFmpeg path
    if (settings.ffmpegPath) {
      args.push("--ffmpeg-binary-path", settings.ffmpegPath);
    }

    // ===== OTHER OPTIONS =====

    // Delete temp files
    if (settings.deleteTempFiles) {
      args.push("--del-after-done");
    }

    // Skip merge
    if (options.skipMerge) {
      args.push("--skip-merge");
    }

    // Skip download (parse only)
    if (options.skipDownload) {
      args.push("--skip-download");
    }

    // Write meta json
    if (options.writeMetaJson) {
      args.push("--write-meta-json");
    }

    // No log
    if (options.noLog) {
      args.push("--no-log");
    }

    // Log level
    if (options.logLevel) {
      args.push("--log-level", options.logLevel);
    }

    // Custom arguments (user provided)
    if (options.customArgs) {
      args.push(...options.customArgs);
    }

    return args;
  }

  private parseProgress(downloadId: string, line: string): void {
    const task = this.downloads.get(downloadId);
    if (!task) return;

    // Parse progress from output
    // Example: [95.3%] Speed: 15.2 MB/s | Progress: 10/100 | Time: 00:01:23
    const progressMatch = line.match(/\[(\d+\.?\d*)%\]/);
    const speedMatch = line.match(/Speed:\s*(\d+\.?\d*)\s*(KB\/s|MB\/s|GB\/s)/);
    const segmentsMatch = line.match(/Progress:\s*(\d+)\/(\d+)/);
    const timeMatch = line.match(/Time:\s*(\d{2}:\d{2}:\d{2})/);

    if (progressMatch) {
      task.progress = parseFloat(progressMatch[1]);
    }

    if (speedMatch) {
      const value = parseFloat(speedMatch[1]);
      const unit = speedMatch[2];
      task.speed =
        value *
        (unit === "MB/s"
          ? 1048576
          : unit === "KB/s"
            ? 1024
            : unit === "GB/s"
              ? 1073741824
              : 1);
    }

    if (segmentsMatch) {
      task.downloadedSegments = parseInt(segmentsMatch[1]);
      task.totalSegments = parseInt(segmentsMatch[2]);
    }

    if (timeMatch) {
      // Could convert time to seconds if needed, but eta is usually sent as a number of seconds remaining
      // N_m3u8DL-RE might have a specific ETA field too.
    }

    this.broadcastProgress(task);
  }

  private broadcastProgress(task: DownloadTask): void {
    if (this.mainWindow) {
      console.log(`[DownloaderService] Broadcasting progress for ${task.id}: ${task.progress}% status=${task.status}`);
      this.mainWindow.webContents.send("download:progress", {
        downloadId: task.id,
        status: task.status,
        progress: task.progress,
        speed: task.speed,
        downloadedBytes: task.downloadedBytes,
        totalBytes: task.totalBytes,
        eta: task.eta,
        downloadedSegments: task.downloadedSegments,
        totalSegments: task.totalSegments,
        outputPath: task.outputPath,
        title: task.options.title,
        url: task.options.url,
        // Include last error line so UI can display it
        errorMessage:
          task.status === "failed" && task.outputLines.length > 0
            ? task.outputLines[task.outputLines.length - 1]
            : undefined,
      });
    }
  }

  async pauseDownload(downloadId: string): Promise<void> {
    const task = this.downloads.get(downloadId);
    if (task && task.process) {
      // Send SIGSTOP on Unix, or handle gracefully on Windows
      if (process.platform !== "win32") {
        task.process.kill("SIGSTOP");
      }
      task.status = "paused";
      this.broadcastProgress(task);
    }
  }

  async resumeDownload(downloadId: string): Promise<void> {
    const task = this.downloads.get(downloadId);
    if (task && task.process) {
      // Send SIGCONT on Unix
      if (process.platform !== "win32") {
        task.process.kill("SIGCONT");
      }
      task.status = "downloading";
      this.broadcastProgress(task);
    }
  }

  async cancelDownload(downloadId: string): Promise<void> {
    const task = this.downloads.get(downloadId);
    if (task && task.process) {
      task.process.kill();
      task.status = "cancelled";
      this.broadcastProgress(task);
      // Keep in memory for UI sync until explicitly removed
      // this.downloads.delete(downloadId);
    }
  }

  async removeDownload(downloadId: string, deleteFile = false): Promise<void> {
    const task = this.downloads.get(downloadId);
    if (!task) return;

    // 1. Cancel if active
    if (task.status === "downloading" || task.status === "paused") {
      await this.cancelDownload(downloadId);
    }

    // 2. Delete file if requested
    if (deleteFile && task.outputPath) {
      try {
        await fs.unlink(task.outputPath);
        console.log(`[DownloaderService] Deleted file: ${task.outputPath}`);
      } catch (e) {
        console.warn(
          `[DownloaderService] Failed to delete file: ${task.outputPath}`,
          e,
        );
      }
    }

    // 3. Remove from map
    this.downloads.delete(downloadId);
  }

  getAllDownloads(): any[] {
    const tasks = Array.from(this.downloads.values()).map(task => {
      const { process, outputLines, ...sanitized } = task;
      return sanitized;
    });
    console.log(`[DownloaderService] Returning ${tasks.length} sanitized tasks from map.`, tasks.map(t => t.id));
    return tasks;
  }

  getDownloadProgress(downloadId: string): DownloadTask | undefined {
    return this.downloads.get(downloadId);
  }

  cleanup(): void {
    // Cancel all active downloads
    for (const [id, task] of this.downloads.entries()) {
      if (task.process) {
        task.process.kill();
      }
    }
    this.downloads.clear();
  }

  private generateRandomName(length: number = 6): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private getSafeOutputPath(saveDir: string, title?: string): string {
    let baseName =
      title && title.trim() !== "" ? title.trim() : this.generateRandomName(6);
      
    // Sanitize filename to remove invalid characters, especially for Windows
    baseName = baseName.replace(/[<>:"/\\|?*]+/g, "-").replace(/\s+/g, " ");

    let fileName = `${baseName}.mp4`;
    let fullPath = path.join(saveDir, fileName);

    // If file exists, append random suffix
    if (existsSync(fullPath)) {
      const suffix = this.generateRandomName(6);
      fileName = `${baseName}_${suffix}.mp4`;
      fullPath = path.join(saveDir, fileName);
    }

    return fullPath;
  }
}
