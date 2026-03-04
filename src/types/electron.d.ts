// Type definitions for Electron API exposed via preload script

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
  title?: string;
  url?: string;
}

export interface ElectronAPI {
  // App Control
  appQuit: () => Promise<void>;
  appMinimize: () => Promise<void>;
  appToggleMaximize: () => Promise<void>;
  appCloseWindow: () => Promise<void>;
  appIsMaximized: () => Promise<boolean>;
  appGetVersion: () => Promise<string>;
  appGetPlatform: () => Promise<"win" | "mac" | "linux">;
  appResetData: () => Promise<{ success: boolean }>;
  appOpenExternal: (url: string) => Promise<{ success: boolean }>;
  appSetMinimalMode: (minimal: boolean) => Promise<void>;
  appGetIsMinimalMode: () => Promise<boolean>;
  appShowContextMenu: () => Promise<void>;
  appGetStreamCount: () => Promise<number>;

  // Stream Parsing
  streamParse: (url: string, options: any) => Promise<any>;

  // Download Control
  downloadStart: (options: any, ) => Promise<{ success: boolean; downloadId?: string }>;
  downloadPause: (downloadId: string) => Promise<{ success: boolean }>;
  downloadResume: (downloadId: string) => Promise<{ success: boolean }>;
  downloadCancel: (downloadId: string) => Promise<{ success: boolean }>;
  downloadRemove: (
    downloadId: string,
    deleteFile?: boolean,
  ) => Promise<{ success: boolean }>;
  downloadGetAll: () => Promise<any[]>;
  downloadGetProgress: (downloadId: string) => Promise<any>;

  // Settings
  settingsGet: () => Promise<any>;
  settingsSave: (settings: any) => Promise<{ success: boolean }>;
  settingsReset: () => Promise<{ success: boolean }>;

  // History
  historyGet: (filters?: any) => Promise<any[]>;
  historyAdd: (record: any) => Promise<{ success: boolean }>;
  historyUpdate: (id: string, updates: any) => Promise<{ success: boolean }>;
  historyDelete: (id: string) => Promise<{ success: boolean }>;
  historyClear: () => Promise<{ success: boolean }>;
  historyExport: (
    format: string,
    path: string,
  ) => Promise<{ success: boolean }>;

  // File System
  filePickFolder: (options?: any) => Promise<string | null>;
  filePickFile: (options?: any) => Promise<string | null>;
  fileExists: (path: string) => Promise<boolean>;
  fileOpen: (path: string) => Promise<void>;
  fileShowInFolder: (path: string) => Promise<void>;
  fileDelete: (path: string) => Promise<void>;

  // Clipboard
  clipboardReadText: () => Promise<string>;
  clipboardWriteText: (text: string) => Promise<void>;

  // Dialog
  dialogShowMessageBox: (options: any) => Promise<any>;
  dialogShowError: (message: string) => Promise<void>;
  dialogShowConfirm: (message: string) => Promise<boolean>;

  // Event listeners
  onDownloadProgress: (
    callback: (data: DownloadProgress) => void,
  ) => () => void;
  onDownloadCompleted: (callback: (data: any) => void) => () => void;
  onDownloadFailed: (callback: (data: any) => void) => () => void;
  onSettingsChanged: (callback: (data: any) => void) => () => void;
  onExtensionStreamDetected: (callback: (data: any) => void) => () => void;
  onAppMessage: (callback: (data: any) => void) => () => void;
  onAppNavigate: (callback: (url: string) => void) => () => void;
  downloadProgressSync: (data: any) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
