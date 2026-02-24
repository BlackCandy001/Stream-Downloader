import { EventEmitter } from "events";
import { DecryptionEngine } from "../utils/crypto.js";

export interface DownloadProgress {
  downloadedSegments: number;
  totalSegments: number;
  speed: number;
  progress: number;
}

export class SegmentDownloader extends EventEmitter {
  private concurrency: number;
  private retryCount: number;
  private decryptor: DecryptionEngine;

  constructor(concurrency: number = 16, retryCount: number = 3) {
    super();
    this.concurrency = concurrency;
    this.retryCount = retryCount;
    this.decryptor = new DecryptionEngine();
  }

  async downloadSegments(
    segments: any[],
    onData: (buffer: Buffer, index: number) => Promise<void>,
    headers: Record<string, string> = {},
  ) {
    const total = segments.length;
    let completed = 0;
    const startTime = Date.now();

    const worker = async (index: number) => {
      let attempts = 0;
      const segment = segments[index];
      let lastError: Error | null = null;

      while (attempts <= this.retryCount) {
        try {
          const response = await fetch(segment.url, { headers });
          if (!response.ok)
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);

          let buffer = Buffer.from(await response.arrayBuffer());

          // Handle decryption
          if (segment.encryptInfo && segment.encryptInfo.method === "AES-128") {
            const keyUri = segment.encryptInfo.keyUri;
            const iv = this.decryptor.parseIV(segment.encryptInfo.iv);
            if (!segment.encryptInfo.iv) {
              // Only override with sequence IV if no IV was provided in the manifest
              const derived = this.deriveIV(index);
              derived.copy(iv);
            }

            if (keyUri) {
              const keyResponse = await fetch(keyUri, { headers });
              const keyBuffer = Buffer.from(await keyResponse.arrayBuffer());
              buffer = await this.decryptor.decrypt(buffer, keyBuffer, iv);
            }
          }

          await onData(buffer, index);

          completed++;
          this.reportProgress(completed, total, startTime);
          return; // Success — exit worker
        } catch (error: any) {
          attempts++;
          lastError = error;
          console.warn(
            `[SegmentDownloader] Segment ${index} attempt ${attempts} failed: ${error.message}`,
            `\n  URL: ${segment.url}`,
          );
          if (attempts <= this.retryCount) {
            // Wait briefly before retrying (exponential backoff)
            await new Promise((r) => setTimeout(r, 500 * attempts));
          }
        }
      }

      // Fix #4: All retries exhausted — throw so the download can surface the error
      throw new Error(
        `Segment ${index} failed after ${this.retryCount} retries: ${lastError?.message || "unknown error"}`,
      );
    };

    // Simple pool implementation
    const queue = [...Array(segments.length).keys()];
    const workers = Array(Math.min(this.concurrency, segments.length))
      .fill(null)
      .map(async () => {
        while (queue.length > 0) {
          const index = queue.shift();
          if (index !== undefined) {
            await worker(index);
          }
        }
      });

    await Promise.all(workers);
  }

  private deriveIV(index: number): Buffer {
    const iv = Buffer.alloc(16);
    iv.writeUInt32BE(index, 12);
    return iv;
  }

  private reportProgress(completed: number, total: number, startTime: number) {
    const elapsed = (Date.now() - startTime) / 1000;
    const speed = completed > 0 ? completed / elapsed : 0;
    const progress = (completed / total) * 100;

    this.emit("progress", {
      downloadedSegments: completed,
      totalSegments: total,
      speed: speed,
      progress: progress,
    });
  }
}
