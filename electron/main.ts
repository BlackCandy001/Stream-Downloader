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
let isMinimalMode = false;

// Disable GPU hardware acceleration if needed
// app.disableHardwareAcceleration()

function setMinimalMode(minimal: boolean) {
  if (!mainWindow) return;
  
  // Rule: Minimal mode should not show up immediately when switching or closing
  // It only shows when user clicks the tray icon AFTER it's set to minimal mode.
  if (minimal) {
    // Hide first if switching from Dashboard
    if (!isMinimalMode && mainWindow.isVisible()) {
      mainWindow.hide();
    }
    
    isMinimalMode = true;
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setResizable(false);
    mainWindow.setSkipTaskbar(true);
    mainWindow.setMinimumSize(280, 100);
    
    // Prepare position and size for when it's eventually shown via tray click
    mainWindow.setSize(280, 110);
    const pos = getWindowPosition();
    mainWindow.setPosition(pos.x, pos.y);
    
    mainWindow.webContents.send("app:navigate", "/minimal");
  } else {
    isMinimalMode = false;
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setResizable(true);
    mainWindow.setSkipTaskbar(false);
    mainWindow.setMinimumSize(1000, 700);
    mainWindow.setSize(1400, 900);
    mainWindow.center();
    mainWindow.webContents.send("app:navigate", "/");
    mainWindow.show();
    mainWindow.focus();
  }
}

function getWindowPosition() {
  const windowBounds = mainWindow!.getBounds();
  const trayBounds = tray!.getBounds();

  // Center window horizontally with the tray icon
  const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);

  // Position window 4 pixels above the tray (for bottom taskbars)
  // Or handle different OS layouts later if needed
  const y = Math.round(trayBounds.y - windowBounds.height - 4);

  return { x, y };
}

function toggleWindow() {
  if (mainWindow?.isVisible()) {
    mainWindow.hide();
  } else {
    showWindow();
  }
}

function showWindow() {
  const position = getWindowPosition();
  mainWindow?.setPosition(position.x, position.y, false);
  mainWindow?.show();
  mainWindow?.focus();
}

function getIconPath(): string | undefined {
  // 1. Try dev path (relative to dist-electron or electron)
  let iconPath = path.join(__dirname, "../resources/icon.png");
  if (existsSync(iconPath)) return iconPath;

  // 2. Try production path (outside asar, in resources folder)
  if (app.isPackaged) {
    iconPath = path.join(process.resourcesPath, "resources/icon.png");
    if (existsSync(iconPath)) return iconPath;
    
    iconPath = path.join(process.resourcesPath, "icon.png");
    if (existsSync(iconPath)) return iconPath;
  }

  // 3. Fallback to asar interior if necessary (though usually better kept outside)
  iconPath = path.join(__dirname, "../../resources/icon.png");
  if (existsSync(iconPath)) return iconPath;

  return undefined;
}

function createWindow() {
  const iconPath = getIconPath();
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: true,
    frame: false,
    transparent: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    ...(iconPath ? { icon: iconPath } : {}),
    backgroundColor: "#00000000",
  });

  // Start in Dashboard mode
  isMinimalMode = false;

  // Load the app root (Dashboard)
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("blur", () => {
    // Only auto-hide in minimal mode
    if (isMinimalMode && !mainWindow?.webContents.isDevToolsOpened()) {
      mainWindow?.hide();
    }
  });

  mainWindow.on("close", (event) => {
    if (!(app as any).isQuiting) {
      event.preventDefault();
      // Switch to minimal mode on close
      if (!isMinimalMode) {
        setMinimalMode(true);
      }
      mainWindow?.hide();
      return false;
    }
    return true;
  });
}

function updateTrayMenu(progressInfo?: string) {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: progressInfo || "No active downloads",
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Open Dashboard",
      click: () => {
        setMinimalMode(false);
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: "separator" },
    {
      label: isMinimalMode ? "Hide Popup" : "Switch to Minimal Mode",
      click: () => {
        if (!isMinimalMode) {
          setMinimalMode(true);
        }
        toggleWindow();
      },
    },
    {
      label: mainWindow?.isVisible() ? "Hide to Tray" : "Show Window",
      click: () => {
        if (mainWindow?.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow?.show();
          mainWindow?.focus();
        }
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        (app as any).isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  if (progressInfo) {
    tray.setToolTip(`Stream Downloader: ${progressInfo}`);
  } else {
    tray.setToolTip("Stream Downloader");
  }
}

function createTray() {
  const iconPath = getIconPath();
  if (!iconPath) {
    console.warn("[Main] Tray icon not found, skipping tray creation");
    return;
  }
  try {
    tray = new Tray(iconPath);
    tray.setToolTip("Stream Downloader");
    updateTrayMenu();
    
    tray.on("click", () => {
      toggleWindow();
    });

    tray.on('double-click', () => {
      if (isMinimalMode) {
        setMinimalMode(false);
      }
      mainWindow?.show();
    });
  } catch (err: any) {
    console.warn("[Main] Failed to create tray:", err.message);
  }
}

// IPC Handlers
function setupIpcHandlers() {
  // ============= APP CONTROL =============
  ipcMain.on("download:progress-sync", (_, data: any) => {
    if (data && data.progress !== undefined) {
      updateTrayMenu(`${Math.round(data.progress)}% - ${data.status}`);
    }
  });

  ipcMain.handle("app:quit", () => {
    (app as any).isQuiting = true;
    app.quit();
  });

  ipcMain.handle("app:minimize", () => {
    mainWindow?.minimize();
  });

  ipcMain.handle("app:toggleMaximize", () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle("app:isMaximized", () => {
    return mainWindow?.isMaximized() || false;
  });

  ipcMain.handle("app:closeWindow", () => {
    mainWindow?.close();
  });

  ipcMain.handle("app:getVersion", () => {
    return app.getVersion();
  });

  ipcMain.handle("app:getPlatform", () => {
    return process.platform as "win" | "mac" | "linux";
  });

  ipcMain.handle("app:openExternal", async (_, url: string) => {
    await shell.openExternal(url);
    return { success: true };
  });

  ipcMain.handle("app:getStreamCount", () => {
    return localServer?.getStreams().length || 0;
  });

  ipcMain.handle("app:getIsMinimalMode", () => {
    return isMinimalMode;
  });

  ipcMain.handle("app:setMinimalMode", async (_, minimal: boolean) => {
    setMinimalMode(minimal);
    updateTrayMenu();
  });

  ipcMain.handle("app:showContextMenu", () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: isMinimalMode ? "Restore Main UI" : "Show Window",
        click: () => {
          if (isMinimalMode) {
            setMinimalMode(false);
          }
          mainWindow?.show();
          mainWindow?.focus();
        },
      },
      { type: "separator" },
      {
        label: "Exit",
        click: () => {
          (app as any).isQuiting = true;
          app.quit();
        },
      },
    ]);
    contextMenu.popup();
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
      console.log("[Main] Download started with ID:", downloadId);
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
    const downloads = downloaderService?.getAllDownloads() || [];
    console.log("[Main] download:getAll called, returning", downloads.length, "tasks");
    return downloads;
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
  downloaderService = new DownloaderService(settingsService, historyService);

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
    } else {
      mainWindow?.show();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if ((app as any).isQuiting) {
      downloaderService?.cleanup();
      app.quit();
    }
  }
});

app.on("before-quit", (e) => {
  if (!(app as any).isReallyQuitting) {
    e.preventDefault();
    (app as any).isQuiting = true;
    
    (async () => {
      console.log("[Main] Finalizing shutdown...");
      downloaderService?.cleanup();
      if (localServer) {
        await localServer.stop();
      }
      (app as any).isReallyQuitting = true;
      app.quit();
    })();
  }
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
  const shouldAutoDownload =
    stream.autoDownload || settings?.enableInstantDownload;

  console.log(
    `[Main] Auto-download check: stream.autoDownload=${stream.autoDownload}, settings.enableInstantDownload=${settings?.enableInstantDownload} -> result=${shouldAutoDownload}`,
  );

  if (shouldAutoDownload && downloaderService) {
    console.log(
      "[Main] Auto Download triggered for:",
      stream.url,
      stream.autoDownload ? "(via extension)" : "(via app settings)",
    );
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
      console.error("[Main] Auto Download failed:", err.message);
      if (mainWindow) {
        mainWindow.webContents.send("app:message", {
          type: "error",
          content: "autoDownloadFailed",
          data: err.message,
        });
      }
    }
  } else if (mainWindow) {
    // Notify renderer that a stream was received but auto-download was skipped
    mainWindow.webContents.send("app:message", {
      type: "info",
      content: "streamReceivedAutoDownloadSkipped",
      data: {
        streamAutoDownload: stream.autoDownload,
        appAutoDownload: settings?.enableInstantDownload,
      },
    });
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
