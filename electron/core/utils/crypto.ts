import crypto from "crypto";

export class DecryptionEngine {
  async decrypt(buffer: Buffer, key: Buffer, iv: Buffer): Promise<Buffer> {
    try {
      const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
      return Buffer.concat([decipher.update(buffer), decipher.final()]);
    } catch (error: any) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  parseIV(iv: string | Buffer | Uint8Array | undefined): Buffer {
    if (!iv) return Buffer.alloc(16);

    let buffer: Buffer;
    if (Buffer.isBuffer(iv)) {
      buffer = iv;
    } else if (iv instanceof Uint8Array) {
      buffer = Buffer.from(iv);
    } else if (typeof iv === "string") {
      const cleanIv = iv.startsWith("0x") ? iv.slice(2) : iv;
      buffer = Buffer.from(cleanIv, "hex");
    } else {
      return Buffer.alloc(16);
    }

    if (buffer.length === 16) return buffer;

    // Pad or truncate to 16 bytes
    const result = Buffer.alloc(16);
    buffer.copy(
      result,
      Math.max(0, 16 - buffer.length),
      0,
      Math.min(buffer.length, 16),
    );
    return result;
  }
}
