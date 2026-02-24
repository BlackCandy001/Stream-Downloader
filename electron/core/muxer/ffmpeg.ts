import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

export class FFmpegService {
  private ffmpegPath: string;

  constructor(ffmpegPath?: string) {
    this.ffmpegPath = ffmpegPath || "ffmpeg";
    if (ffmpegPath) {
      ffmpeg.setFfmpegPath(ffmpegPath);
    }
  }

  async mergeSegments(
    segmentPaths: string[],
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const concatFilePath = path.join(
        path.dirname(outputPath),
        `concat-${Date.now()}.txt`,
      );
      const fileList = segmentPaths
        .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
        .join("\n");

      fs.writeFileSync(concatFilePath, fileList);

      ffmpeg()
        .input(concatFilePath)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .outputOptions(["-c", "copy"])
        .save(outputPath)
        .on("end", () => {
          if (fs.existsSync(concatFilePath)) fs.unlinkSync(concatFilePath);
          resolve();
        })
        .on("error", (err) => {
          if (fs.existsSync(concatFilePath)) fs.unlinkSync(concatFilePath);
          reject(new Error(`FFmpeg merge failed: ${err.message}`));
        });
    });
  }

  async remux(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions(["-c", "copy"])
        .save(outputPath)
        .on("end", resolve)
        .on("error", (err) =>
          reject(new Error(`FFmpeg remux failed: ${err.message}`)),
        );
    });
  }
}
