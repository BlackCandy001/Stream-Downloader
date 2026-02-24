export interface EncryptInfo {
  method: "NONE" | "AES-128" | "AES-128-ECB" | "SAMPLE-AES";
  key?: Uint8Array; // 16 bytes
  iv?: Uint8Array; // 16 bytes
  keyUri?: string;
}
