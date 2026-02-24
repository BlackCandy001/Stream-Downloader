import CryptoJS from "crypto-js";

export class Decryptor {
  static decrypt(data: Buffer, key: Buffer, iv: Buffer): Buffer {
    // Convert Buffer to CryptoJS WordArray
    const keyWA = CryptoJS.lib.WordArray.create(key as any);
    const ivWA = CryptoJS.lib.WordArray.create(iv as any);
    const encryptedWA = CryptoJS.lib.WordArray.create(data as any);

    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: encryptedWA } as any,
      keyWA,
      {
        iv: ivWA,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.NoPadding, // Typically HLS segments are padded to 16 bytes already
      },
    );

    // Convert WordArray back to Buffer
    return Buffer.from(this.wordArrayToUint8Array(decrypted));
  }

  private static wordArrayToUint8Array(
    wordArray: CryptoJS.lib.WordArray,
  ): Uint8Array {
    const l = wordArray.sigBytes;
    const words = wordArray.words;
    const result = new Uint8Array(l);
    for (let i = 0; i < l; i++) {
      result[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }
    return result;
  }
}
