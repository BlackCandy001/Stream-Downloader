import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

// Types
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

export interface StreamInfo {
  id: string;
  type: "video" | "audio" | "subtitle";
  groupId?: string;
  quality?: string;
  bandwidth?: number;
  codecs?: string;
  language?: string;
  url: string;
}

export interface Settings {
  language: "en" | "vi" | "zh";
  theme: "light" | "dark" | "auto";
  defaultSaveFolder: string;
  maxConcurrentDownloads: number;
  defaultThreadCount: number;
  autoMerge: boolean;
  deleteTempFiles: boolean;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // App Control
  appQuit: () => ipcRenderer.invoke("app:quit"),
  appMinimize: () => ipcRenderer.invoke("app:minimize"),
  appToggleMaximize: () => ipcRenderer.invoke("app:toggleMaximize"),
  appCloseWindow: () => ipcRenderer.invoke("app:closeWindow"),
  appIsMaximized: () => ipcRenderer.invoke("app:isMaximized"),
  appGetVersion: () => ipcRenderer.invoke("app:getVersion"),
  appGetPlatform: () => ipcRenderer.invoke("app:getPlatform"),
  appResetData: () => ipcRenderer.invoke("app:resetData"),
  appOpenExternal: (url: string) => ipcRenderer.invoke("app:openExternal", url),
  appSetMinimalMode: (minimal: boolean) => ipcRenderer.invoke("app:setMinimalMode", minimal),
  appShowContextMenu: () => ipcRenderer.invoke("app:showContextMenu"),
  downloadProgressSync: (data: any) => ipcRenderer.send("download:progress-sync", data),

  // Stream Parsing
  streamParse: (url: string, options: any) =>
    ipcRenderer.invoke("stream:parse", url, options),

  // Download Control
  downloadStart: (options: any) =>
    ipcRenderer.invoke("download:start", options),
  downloadPause: (downloadId: string) =>
    ipcRenderer.invoke("download:pause", downloadId),
  downloadResume: (downloadId: string) =>
    ipcRenderer.invoke("download:resume", downloadId),
  downloadCancel: (downloadId: string) =>
    ipcRenderer.invoke("download:cancel", downloadId),
  downloadRemove: (downloadId: string, deleteFile = false) =>
    ipcRenderer.invoke("download:remove", downloadId, deleteFile),
  downloadGetAll: () => ipcRenderer.invoke("download:getAll"),
  downloadGetProgress: (downloadId: string) =>
    ipcRenderer.invoke("download:getProgress", downloadId),

  // Settings
  settingsGet: () => ipcRenderer.invoke("settings:get"),
  settingsSave: (settings: Partial<Settings>) =>
    ipcRenderer.invoke("settings:save", settings),
  settingsReset: () => ipcRenderer.invoke("settings:reset"),

  // History
  historyGet: (filters?: any) => ipcRenderer.invoke("history:get", filters),
  historyAdd: (record: any) => ipcRenderer.invoke("history:add", record),
  historyUpdate: (id: string, updates: any) =>
    ipcRenderer.invoke("history:update", id, updates),
  historyDelete: (id: string) => ipcRenderer.invoke("history:delete", id),
  historyClear: () => ipcRenderer.invoke("history:clear"),
  historyExport: (format: string, path: string) =>
    ipcRenderer.invoke("history:export", format, path),

  // File System
  filePickFolder: (options?: any) =>
    ipcRenderer.invoke("file:pickFolder", options),
  filePickFile: (options?: any) => ipcRenderer.invoke("file:pickFile", options),
  fileExists: (path: string) => ipcRenderer.invoke("file:exists", path),
  fileOpen: (path: string) => ipcRenderer.invoke("file:open", path),
  fileShowInFolder: (path: string) =>
    ipcRenderer.invoke("file:showInFolder", path),
  fileDelete: (path: string) => ipcRenderer.invoke("file:delete", path),

  // Clipboard
  clipboardReadText: () => ipcRenderer.invoke("clipboard:readText"),
  clipboardWriteText: (text: string) =>
    ipcRenderer.invoke("clipboard:writeText", text),

  // Dialog
  dialogShowMessageBox: (options: any) =>
    ipcRenderer.invoke("dialog:showMessageBox", options),
  dialogShowError: (message: string) =>
    ipcRenderer.invoke("dialog:showError", message),
  dialogShowConfirm: (message: string) =>
    ipcRenderer.invoke("dialog:showConfirm", message),

  // Event listeners
  onDownloadProgress: (callback: (data: DownloadProgress) => void) => {
    const subscription = (_event: IpcRendererEvent, data: DownloadProgress) =>
      callback(data);
    ipcRenderer.on("download:progress", subscription);
    return () => ipcRenderer.removeListener("download:progress", subscription);
  },

  onDownloadCompleted: (callback: (data: any) => void) => {
    const subscription = (_event: IpcRendererEvent, data: any) =>
      callback(data);
    ipcRenderer.on("download:completed", subscription);
    return () => ipcRenderer.removeListener("download:completed", subscription);
  },

  onDownloadFailed: (callback: (data: any) => void) => {
    const subscription = (_event: IpcRendererEvent, data: any) =>
      callback(data);
    ipcRenderer.on("download:failed", subscription);
    return () => ipcRenderer.removeListener("download:failed", subscription);
  },

  onSettingsChanged: (callback: (data: Settings) => void) => {
    const subscription = (_event: IpcRendererEvent, data: Settings) =>
      callback(data);
    ipcRenderer.on("settings:changed", subscription);
    return () => ipcRenderer.removeListener("settings:changed", subscription);
  },

  onExtensionStreamDetected: (callback: (data: any) => void) => {
    const subscription = (_event: IpcRendererEvent, data: any) =>
      callback(data);
    ipcRenderer.on("extension:stream-detected", subscription);
    return () =>
      ipcRenderer.removeListener("extension:stream-detected", subscription);
  },

  onAppMessage: (callback: (data: any) => void) => {
    const subscription = (_event: IpcRendererEvent, data: any) =>
      callback(data);
    ipcRenderer.on("app:message", subscription);
    return () => ipcRenderer.removeListener("app:message", subscription);
  },
  onAppNavigate: (callback: (url: string) => void) => {
    const subscription = (_event: IpcRendererEvent, url: string) =>
      callback(url);
    ipcRenderer.on("app:navigate", subscription);
    return () => ipcRenderer.removeListener("app:navigate", subscription);
  },

  // Remove all listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Type declaration for window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      // App Control
      appQuit: () => Promise<void>;
      appMinimize: () => Promise<void>;
      appMaximize: () => Promise<void>;
      appGetVersion: () => Promise<string>;
      appGetPlatform: () => Promise<"win" | "mac" | "linux">;
      appResetData: () => Promise<{ success: boolean }>;
      appOpenExternal: (url: string) => Promise<{ success: boolean }>;
      appSetMinimalMode: (minimal: boolean) => Promise<void>;
      appShowContextMenu: () => Promise<void>;

      // Stream Parsing
      streamParse: (url: string, options: any) => Promise<any>;

      // Download Control
      downloadStart: (
        options: any,
      ) => Promise<{ success: boolean; downloadId?: string }>;
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
      settingsGet: () => Promise<Settings>;
      settingsSave: (
        settings: Partial<Settings>,
      ) => Promise<{ success: boolean }>;
      settingsReset: () => Promise<{ success: boolean }>;

      // History
      historyGet: (filters?: any) => Promise<any[]>;
      historyAdd: (record: any) => Promise<{ success: boolean }>;
      historyUpdate: (
        id: string,
        updates: any,
      ) => Promise<{ success: boolean }>;
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
      onExtensionStreamDetected: (callback: (data: any) => void) => () => void;
      onSettingsChanged: (callback: (data: Settings) => void) => () => void;
      onAppMessage: (callback: (data: any) => void) => () => void;
      onAppNavigate: (callback: (url: string) => void) => () => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}
