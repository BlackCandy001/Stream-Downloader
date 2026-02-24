import { MediaSegment } from "../models/Segment.js";
import { httpClient } from "../utils/HTTPClient.js";
import { Decryptor } from "./Decryptor.js";
import { logger } from "../utils/Logger.js";
import fs from "fs/promises";
import path from "path";

export class SegmentDownloader {
  constructor(private tempDir: string) {}

  async download(segment: MediaSegment): Promise<string> {
    const filePath = path.join(this.tempDir, segment.filename);

    // Check if file already exists (resume support)
    try {
      await fs.access(filePath);
      // logger.debug(`Skipping already downloaded segment: ${segment.index}`);
      return filePath;
    } catch {
      // Continue to download
    }

    // logger.debug(`Downloading segment: ${segment.index}`);
    try {
      let data = await httpClient.get(segment.url, "arraybuffer");
      const buffer = Buffer.from(data);

      if (
        segment.encryptInfo.method === "AES-128" &&
        segment.encryptInfo.keyUri
      ) {
        // Fetch key if URI is provided
        const keyData = await httpClient.get(
          segment.encryptInfo.keyUri,
          "arraybuffer",
        );
        const key = Buffer.from(keyData);

        let iv = segment.encryptInfo.iv
          ? Buffer.from(segment.encryptInfo.iv)
          : Buffer.alloc(16);
        // If IV is missing, use media sequence number (handled by manager usually, but let's be safe)
        if (!segment.encryptInfo.iv) {
          // Standard HLS: Missing IV = Use segment index (media sequence)
          const ivBuffer = Buffer.alloc(16);
          ivBuffer.writeUInt32BE(segment.index, 12);
          iv = ivBuffer;
        }

        const decrypted = Decryptor.decrypt(buffer, key, iv);
        await fs.writeFile(filePath, decrypted);
      } else {
        await fs.writeFile(filePath, buffer);
      }

      return filePath;
    } catch (error: any) {
      logger.error(
        `Failed to download segment ${segment.index}: ${error.message}`,
      );
      throw error;
    }
  }
}
