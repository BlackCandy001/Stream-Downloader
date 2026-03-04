import { Command } from "commander";
import { HLSParser } from "./parser/HLSParser.js";
import { DownloadManager } from "./manager/DownloadManager.js";
import { FFmpegMerger } from "./merger/FFmpegMerger.js";
import { logger } from "./utils/Logger.js";
import path from "path";
import fs from "fs/promises";

const program = new Command();

program
  .name("node-downloader")
  .description("Download HLS m3u8 streams")
  .version("1.1.0")
  .argument("<url>", "m3u8 URL")
  .option("-o, --output <filename>", "output filename", "output.mp4")
  .option("-c, --concurrency <number>", "number of concurrent downloads", "8")
  .option("-t, --temp <dir>", "temporary directory", "./temp")
  .action(async (url, options) => {
    try {
      const parser = new HLSParser();
      const streams = await parser.parse(url);

      if (streams.length === 0) {
        logger.error("No streams found");
        return;
      }

      // If it's a master playlist, just pick the first one for now
      // A more complex app would let the user choose or pick the highest bitrate
      const stream = streams[0].playlist
        ? streams[0]
        : await parser.parse(streams[0].url).then((s) => s[0]);

      if (!stream.playlist) {
        logger.error("Failed to parse media playlist");
        return;
      }

      const tempDir = path.resolve(options.temp);
      const manager = new DownloadManager(tempDir);
      const segmentPaths = await manager.downloadPlaylist(
        stream.playlist,
        parseInt(options.concurrency),
      );

      const merger = new FFmpegMerger();
      await merger.merge(segmentPaths, options.output);

      // Cleanup temp dir
      logger.info("Cleaning up temporary files...");
      await fs.rm(tempDir, { recursive: true, force: true });
      logger.success("Task finished!");
    } catch (error: any) {
      logger.error(`Critical error: ${error.message}`);
    }
  });

program.parse();
