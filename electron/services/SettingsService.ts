import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { app } from "electron";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface Settings {
  language: "en" | "vi" | "zh";
  theme: "light" | "dark" | "auto";
  startOnBoot: boolean;
  minimizeToTray: boolean;
  checkForUpdates: boolean;
  defaultSaveFolder: string;
  maxConcurrentDownloads: number;
  defaultThreadCount: number;
  defaultSpeedLimit?: number;
  autoMerge: boolean;
  deleteTempFiles: boolean;
  openFolderWhenComplete: boolean;
  ffmpegPath?: string;
  proxy?: any;
  requestTimeout: number;
  retryCount: number;
  enableClipboardMonitor: boolean;
  logLevel: string;
  historyRetentionDays: number;
  autoCleanHistory: boolean;
  enableInstantDownload: boolean;
}

const defaultSettings: Settings = {
  language: "en",
  theme: "auto",
  startOnBoot: false,
  minimizeToTray: true,
  checkForUpdates: true,
  defaultSaveFolder: app.getPath("downloads"),
  maxConcurrentDownloads: 3,
  defaultThreadCount: 8,
  defaultSpeedLimit: undefined,
  autoMerge: true,
  deleteTempFiles: true,
  openFolderWhenComplete: false,
  ffmpegPath: undefined,
  proxy: undefined,
  requestTimeout: 30,
  retryCount: 3,
  enableClipboardMonitor: false,
  logLevel: "info",
  historyRetentionDays: 30,
  autoCleanHistory: false,
  enableInstantDownload: false,
};

export class SettingsService {
  private settingsPath: string;
  private settings: Settings | null = null;

  constructor() {
    const userDataPath = app.getPath("userData");
    this.settingsPath = path.join(userDataPath, "settings.json");
  }

  async getSettings(): Promise<Settings> {
    if (this.settings) {
      if (!this.settings.defaultSaveFolder) {
        this.settings.defaultSaveFolder = defaultSettings.defaultSaveFolder;
      }
      return this.settings;
    }

    try {
      const data = await fs.readFile(this.settingsPath, "utf-8");
      this.settings = { ...defaultSettings, ...JSON.parse(data) };
      if (!this.settings.defaultSaveFolder) {
        this.settings.defaultSaveFolder = defaultSettings.defaultSaveFolder;
      }
    } catch (error) {
      // File doesn't exist or is corrupted, use defaults
      this.settings = { ...defaultSettings };
      await this.saveSettings(this.settings);
    }

    return this.settings;
  }

  async saveSettings(settings: Partial<Settings>): Promise<void> {
    const currentSettings = await this.getSettings();
    this.settings = { ...currentSettings, ...settings };

    // Ensure directory exists
    const dir = path.dirname(this.settingsPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(
      this.settingsPath,
      JSON.stringify(this.settings, null, 2),
      "utf-8",
    );
  }

  async resetSettings(): Promise<void> {
    this.settings = null;
    try {
      await fs.unlink(this.settingsPath);
    } catch (error) {
      // File might not exist, ignore
    }
    this.settings = defaultSettings;
    await this.saveSettings(this.settings);
  }

  async getSetting<K extends keyof Settings>(key: K): Promise<Settings[K]> {
    const settings = await this.getSettings();
    return settings[key];
  }

  async updateSetting<K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ): Promise<void> {
    const settings = await this.getSettings();
    await this.saveSettings({ [key]: value });
  }
}
