export interface StreamInfo {
  id: string;
  type: "video" | "audio" | "subtitle";
  groupId?: string;
  quality?: string;
  width?: number;
  height?: number;
  bandwidth?: number;
  averageBandwidth?: number;
  frameRate?: number;
  codecs?: string;
  resolution?: string;
  language?: string;
  languageName?: string;
  channels?: string;
  sampleRate?: number;
  subtitleFormat?: string;
  isDefault?: boolean;
  isForced?: boolean;
  url: string;
  playlistUrl?: string;
  extension?: string;
  title?: string;
  thumbnail?: string;
}

export interface DownloadProgress {
  downloadId: string;
  status:
    | "pending"
    | "downloading"
    | "paused"
    | "completed"
    | "failed"
    | "cancelled";
  progress: number;
  speed: number;
  downloadedBytes: number;
  totalBytes: number;
  eta?: number;
  downloadedSegments: number;
  totalSegments: number;
  currentSegment?: number;
  outputPath?: string;
  errorMessage?: string;
}

export interface DownloadTask {
  id: string;
  status: string;
  progress: number;
  speed: number;
  downloadedBytes: number;
  totalBytes: number;
  eta?: number;
  options: any;
  filename?: string;
  outputPath?: string;
  url?: string;
  errorMessage?: string;
}

export interface Settings {
  language: string;
  theme: string;
  defaultSaveFolder: string;
  maxConcurrentDownloads: number;
  defaultThreadCount: number;
  defaultSpeedLimit?: number;
  autoMerge: boolean;
  deleteTempFiles: boolean;
}

export interface HistoryRecord {
  id: string;
  url: string;
  filename: string;
  savePath: string;
  streamInfo: {
    quality?: string;
    language?: string;
    type: string;
  };
  fileSize: number;
  status: string;
  createdAt: string;
  completedAt?: string;
  duration: number;
  errorMessage?: string;
}
