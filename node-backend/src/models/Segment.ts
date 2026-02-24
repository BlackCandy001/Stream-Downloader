import { EncryptInfo } from "./EncryptInfo.js";

export interface MediaSegment {
  url: string;
  duration: number;
  index: number;
  encryptInfo: EncryptInfo;
  startRange?: number; // For partial downloads
  stopRange?: number;
  filename: string; // Local temporary filename
}

export interface MediaPart {
  segments: MediaSegment[];
}
