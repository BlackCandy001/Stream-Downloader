import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  Tray,
  Menu,
  clipboard,
} from "electron";
import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { DownloaderService } from "./services/DownloaderService.js";
import { SettingsService } from "./services/SettingsService.js";
import { HistoryService } from "./services/HistoryService.js";
import { LocalServer, StreamData } from "./services/LocalServer.js";

import { File } from "buffer";

// Polyfill for global.File which Electron main process hides
if (typeof (global as any).File === "undefined") {
  (global as any).File = File;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let downloaderService: DownloaderService | null = null;
let settingsService: SettingsService | null = null;
let historyService: HistoryService | null = null;
let localServer: LocalServer | null = null;

// Disable GPU hardware acceleration if needed
// app.disableHardwareAcceleration()

function getIconPath(): string | undefined {
  const iconPath = path.join(__dirname, "../resources/icon.png");
  return existsSync(iconPath) ? iconPath : undefined;
}

function createWindow() {
  const iconPath = getIconPath();
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    ...(iconPath ? { icon: iconPath } : {}),
    titleBarStyle: "default",
    frame: true,
  });

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.on("minimize", () => {
    if (process.platform === "win32") {
      mainWindow?.minimize();
    }
  });
}

function createTray() {
  const iconPath = getIconPath();
  if (!iconPath) {
    console.warn("[Main] Tray icon not found, skipping tray creation");
    return;
  }
  try {
    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Show",
        click: () => {
          mainWindow?.show();
        },
      },
      {
        label: "Quit",
        click: () => {
          (app as any).isQuiting = true;
          app.quit();
        },
      },
    ]);

    tray.setToolTip("Stream Downloader");
    tray.setContextMenu(contextMenu);
  } catch (err: any) {
    console.warn("[Main] Failed to create tray:", err.message);
  }
}

// IPC Handlers
function setupIpcHandlers() {
  // ============= APP CONTROL =============
  ipcMain.handle("app:quit", () => {
    (app as any).isQuiting = true;
    app.quit();
  });

  ipcMain.handle("app:minimize", () => {
    mainWindow?.minimize();
  });

  ipcMain.handle("app:maximize", () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle("app:getVersion", () => {
    return app.getVersion();
  });

  ipcMain.handle("app:getPlatform", () => {
    return process.platform as "win" | "mac" | "linux";
  });

  // ============= STREAM PARSING =============
  ipcMain.handle("stream:parse", async (_, url: string, options: any) => {
    try {
      const result = await downloaderService?.parseStream(url, options);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ============= DOWNLOAD CONTROL =============
  ipcMain.handle("download:start", async (_, options: any) => {
    try {
      const downloadId = await downloaderService?.startDownload(options);
      return { success: true, downloadId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("download:pause", async (_, downloadId: string) => {
    try {
      await downloaderService?.pauseDownload(downloadId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("download:resume", async (_, downloadId: string) => {
    try {
      await downloaderService?.resumeDownload(downloadId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("download:cancel", async (_, downloadId: string) => {
    try {
      await downloaderService?.cancelDownload(downloadId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "download:remove",
    async (_, downloadId: string, deleteFile = false) => {
      try {
        await downloaderService?.removeDownload(downloadId, deleteFile);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle("download:getAll", async () => {
    return downloaderService?.getAllDownloads() || [];
  });

  ipcMain.handle("download:getProgress", async (_, downloadId: string) => {
    return downloaderService?.getDownloadProgress(downloadId);
  });

  // ============= SETTINGS =============
  ipcMain.handle("settings:get", async () => {
    return settingsService?.getSettings() || {};
  });

  ipcMain.handle("settings:save", async (_, settings: any) => {
    await settingsService?.saveSettings(settings);
    return { success: true };
  });

  ipcMain.handle("settings:reset", async () => {
    await settingsService?.resetSettings();
    return { success: true };
  });

  // ============= HISTORY =============
  ipcMain.handle("history:get", async (_, filters?: any) => {
    return historyService?.getHistory(filters) || [];
  });

  ipcMain.handle("history:add", async (_, record: any) => {
    await historyService?.addHistory(record);
    return { success: true };
  });

  ipcMain.handle("history:update", async (_, id: string, updates: any) => {
    await historyService?.updateHistory(id, updates);
    return { success: true };
  });

  ipcMain.handle("history:delete", async (_, id: string) => {
    await historyService?.deleteHistory(id);
    return { success: true };
  });

  ipcMain.handle("history:clear", async () => {
    await historyService?.clearHistory();
    return { success: true };
  });

  ipcMain.handle("history:export", async (_, format: string, path: string) => {
    await historyService?.exportHistory(format as "csv" | "json", path);
    return { success: true };
  });

  // ============= APP MANAGEMENT =============
  ipcMain.handle("app:resetData", async () => {
    // 1. Cancel all downloads
    const downloads = downloaderService?.getAllDownloads() || [];
    for (const d of downloads) {
      if (d.status === "downloading" || d.status === "paused") {
        await downloaderService?.cancelDownload(d.id);
      }
      await downloaderService?.removeDownload(d.id, false);
    }

    // 2. Clear history
    await historyService?.clearHistory();

    // 3. Reset settings
    await settingsService?.resetSettings();

    // 4. Clear detected streams
    localServer?.clearStreams();

    return { success: true };
  });

  // ============= FILE SYSTEM =============
  ipcMain.handle("file:pickFolder", async (_, options?: any) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ["openDirectory"],
      ...options,
    });
    return result.filePaths[0] || null;
  });

  ipcMain.handle("file:pickFile", async (_, options?: any) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ["openFile"],
      ...options,
    });
    return result.filePaths[0] || null;
  });

  ipcMain.handle("file:exists", async (_, filePath: string) => {
    const fs = await import("fs/promises");
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle("file:open", async (_, filePath: string) => {
    shell.openPath(filePath);
  });

  ipcMain.handle("file:showInFolder", async (_, filePath: string) => {
    shell.showItemInFolder(filePath);
  });

  ipcMain.handle("file:delete", async (_, filePath: string) => {
    const fs = await import("fs/promises");
    await fs.unlink(filePath);
  });

  // ============= CLIPBOARD =============
  ipcMain.handle("clipboard:readText", () => {
    return clipboard.readText();
  });

  ipcMain.handle("clipboard:writeText", (_, text: string) => {
    clipboard.writeText(text);
  });

  // ============= DIALOG =============
  ipcMain.handle("dialog:showMessageBox", async (_, options: any) => {
    return await dialog.showMessageBox(mainWindow!, options);
  });

  ipcMain.handle("dialog:showError", async (_, message: string) => {
    await dialog.showMessageBox(mainWindow!, {
      type: "error",
      title: "Error",
      message,
    });
  });

  ipcMain.handle("dialog:showConfirm", async (_, message: string) => {
    const result = await dialog.showMessageBox(mainWindow!, {
      type: "question",
      buttons: ["Cancel", "Confirm"],
      message,
    });
    return result.response === 1;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  // Initialize services
  settingsService = new SettingsService();
  historyService = new HistoryService();
  downloaderService = new DownloaderService(settingsService);

  // Set window for broadcasting
  downloaderService.setMainWindow(mainWindow);

  // Start local server for extension communication
  localServer = new LocalServer();
  const serverStarted = await localServer.start(handleStreamFromExtension);

  if (serverStarted) {
    console.log("[Main] Local server started successfully");
  }

  createWindow();

  // Update service with new window
  if (mainWindow) {
    downloaderService?.setMainWindow(mainWindow);
  }

  setupIpcHandlers();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Cleanup downloads
    downloaderService?.cleanup();
    app.quit();
  }
});

app.on("before-quit", () => {
  downloaderService?.cleanup();
  localServer?.stop();
});

// Handle stream from extension
async function handleStreamFromExtension(stream: StreamData): Promise<void> {
  console.log("[Main] Stream received from extension:", stream.url);

  // Notify renderer process
  if (mainWindow) {
    mainWindow.webContents.send("extension:stream-detected", stream);
  }

  // Instant Download Logic
  const settings = await settingsService?.getSettings();
  if (settings?.enableInstantDownload && downloaderService) {
    console.log("[Main] Instant Download triggered for:", stream.url);
    try {
      await downloaderService.startDownload({
        url: stream.url,
        title: stream.title,
        type: stream.type || "HLS",
        selectedStreamIds: ["default"],
        threadCount: settings.defaultThreadCount || 16,
        savePath: settings.defaultSaveFolder,
      });

      // Notify renderer that an auto-download started
      if (mainWindow) {
        mainWindow.webContents.send("app:message", {
          type: "info",
          content: "instantDownloadAutoStarted",
        });
      }
    } catch (err: any) {
      console.error("[Main] Instant Download failed:", err.message);
    }
  }

  // Show notification
  if (mainWindow) {
    mainWindow.flashFrame(true);
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});
