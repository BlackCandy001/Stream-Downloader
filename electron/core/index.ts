import { HLSParser } from "./parser/hls.js";
import { SegmentDownloader } from "./downloader/segment.js";
import { DecryptionEngine } from "./utils/crypto.js";
import { FFmpegService } from "./muxer/ffmpeg.js";
import path from "path";
import fs from "fs/promises";
import { EventEmitter } from "events";

export class DownloaderCore extends EventEmitter {
  private parser: HLSParser;
  private downloader: SegmentDownloader;
  private decryptor: DecryptionEngine;
  private muxer: FFmpegService;

  constructor(ffmpegPath?: string) {
    super();
    this.parser = new HLSParser();
    this.downloader = new SegmentDownloader();
    this.decryptor = new DecryptionEngine();
    this.muxer = new FFmpegService(ffmpegPath);

    this.downloader.on("progress", (p) => this.emit("progress", p));
  }

  async parse(url: string, headers: Record<string, string> = {}) {
    return this.parser.parse(url, headers);
  }

  async download(url: string, outputPath: string, options: any = {}) {
    const tmpDir = path.join(path.dirname(outputPath), `tmp-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });

    try {
      this.emit("status", { message: "Parsing manifest..." });
      const metadata = await this.parser.parse(url, options.headers || {});
      console.log(
        `[DownloaderCore] Found ${metadata.streams.length} stream(s)`,
      );
      metadata.streams.forEach((s, i) =>
        console.log(`  [${i}] type=${s.type} url=${s.url}`),
      );

      const targetStream = metadata.streams[0];
      if (!targetStream) {
        throw new Error(
          "No streams found in manifest. The URL may require authentication or special headers.",
        );
      }

      console.log(
        `[DownloaderCore] Fetching segments from: ${targetStream.url}`,
      );
      const segments = await this.parser.getSegments(
        targetStream.url,
        options.headers || {}, // Fix #B: always forward headers
      );
      console.log(`[DownloaderCore] Got ${segments.length} segment(s)`);
      if (segments.length > 0) {
        console.log(`  First segment URL: ${segments[0].url}`);
        console.log(
          `  Encrypt method: ${segments[0]?.encryptInfo?.method || "NONE"}`,
        );
      }

      this.emit("status", {
        message: `Downloading ${segments.length} segments...`,
      });

      // Fix #3: Use an ordered array instead of index-based sparse assignment
      // This ensures no undefined gaps that would crash FFmpeg
      const segmentPaths: string[] = Array(segments.length).fill("");

      await this.downloader.downloadSegments(
        segments,
        async (buffer, index) => {
          const segmentPath = path.join(
            tmpDir,
            `segment-${String(index).padStart(6, "0")}.ts`,
          );
          await fs.writeFile(segmentPath, buffer);
          segmentPaths[index] = segmentPath;
        },
        options.headers,
      );

      // Filter out any failed/empty segment paths before muxing
      const validSegmentPaths = segmentPaths.filter((p) => p && p.length > 0);
      if (validSegmentPaths.length === 0) {
        throw new Error("No segments were successfully downloaded");
      }
      if (validSegmentPaths.length < segments.length) {
        console.warn(
          `[DownloaderCore] Warning: only ${validSegmentPaths.length}/${segments.length} segments downloaded`,
        );
      }

      this.emit("status", { message: "Merging segments..." });
      await this.muxer.mergeSegments(validSegmentPaths, outputPath);

      this.emit("status", { message: "Download completed!" });
    } catch (error: any) {
      console.error("[DownloaderCore] Download failed:", error.message);
      console.error("[DownloaderCore] Stack:", error.stack);
      this.emit("error", error);
      throw error;
    } finally {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch (e) {
        console.error("Cleanup failed:", e);
      }
    }
  }
}
