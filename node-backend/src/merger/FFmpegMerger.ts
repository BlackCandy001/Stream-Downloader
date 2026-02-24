import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import path from "path";
import { logger } from "../utils/Logger.js";

export class FFmpegMerger {
  async merge(segmentPaths: string[], outputPath: string): Promise<void> {
    const listFilePath = path.join(
      path.dirname(segmentPaths[0]),
      "segments.txt",
    );
    const content = segmentPaths
      .map((p) => `file '${path.resolve(p)}'`)
      .join("\n");

    await fs.writeFile(listFilePath, content);
    logger.info(`Merging segments into: ${outputPath}`);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(listFilePath)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .outputOptions(["-c", "copy"])
        .save(outputPath)
        .on("start", (commandLine) => {
          logger.debug(`FFmpeg command: ${commandLine}`);
        })
        .on("error", (err) => {
          logger.error(`FFmpeg error: ${err.message}`);
          reject(err);
        })
        .on("end", () => {
          logger.success("Merge completed!");
          // Cleanup list file
          fs.unlink(listFilePath).catch(() => {});
          resolve();
        });
    });
  }
}
