import { Playlist } from "../models/Playlist.js";
import { SegmentDownloader } from "../downloader/SegmentDownloader.js";
import { logger } from "../utils/Logger.js";
import { SingleBar, Presets } from "cli-progress";
import fs from "fs/promises";
import path from "path";

export class DownloadManager {
  private downloader: SegmentDownloader;
  private tempDir: string;

  constructor(tempDir: string) {
    this.tempDir = tempDir;
    this.downloader = new SegmentDownloader(tempDir);
  }

  async downloadPlaylist(
    playlist: Playlist,
    concurrency: number = 8,
  ): Promise<string[]> {
    await fs.mkdir(this.tempDir, { recursive: true });

    logger.info(`Starting download of ${playlist.segments.length} segments...`);
    const progress = new SingleBar({}, Presets.shades_classic);
    progress.start(playlist.segments.length, 0);

    const results: string[] = [];
    const queue = [...playlist.segments];
    let activeCount = 0;
    let completedCount = 0;

    return new Promise((resolve, reject) => {
      const next = async () => {
        if (completedCount === playlist.segments.length) {
          progress.stop();
          resolve(results);
          return;
        }

        while (activeCount < concurrency && queue.length > 0) {
          const segment = queue.shift()!;
          activeCount++;

          this.downloader
            .download(segment)
            .then((filePath) => {
              results[segment.index] = filePath;
              completedCount++;
              activeCount--;
              progress.update(completedCount);
              next();
            })
            .catch((err) => {
              progress.stop();
              reject(err);
            });
        }
      };

      next();
    });
  }
}
