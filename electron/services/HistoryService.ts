import fs from "fs/promises";
import path from "path";
import { app } from "electron";

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
  status: "completed" | "failed" | "cancelled";
  createdAt: string;
  completedAt?: string;
  duration: number;
  errorMessage?: string;
}

export class HistoryService {
  private historyPath: string;
  private history: HistoryRecord[] = [];

  constructor() {
    const userDataPath = app.getPath("userData");
    this.historyPath = path.join(userDataPath, "history.json");
  }

  async loadHistory(): Promise<HistoryRecord[]> {
    try {
      const data = await fs.readFile(this.historyPath, "utf-8");
      this.history = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is corrupted, start with empty history
      this.history = [];
    }
    return this.history;
  }

  async getHistory(filters?: any): Promise<HistoryRecord[]> {
    if (this.history.length === 0) {
      await this.loadHistory();
    }

    let result = [...this.history];

    if (filters) {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        result = result.filter(
          (h) =>
            h.filename.toLowerCase().includes(searchLower) ||
            h.url.toLowerCase().includes(searchLower),
        );
      }

      if (filters.status && filters.status.length > 0) {
        result = result.filter((h) => filters.status.includes(h.status));
      }

      if (filters.dateFrom) {
        result = result.filter(
          (h) => new Date(h.createdAt) >= filters.dateFrom,
        );
      }

      if (filters.dateTo) {
        result = result.filter((h) => new Date(h.createdAt) <= filters.dateTo);
      }
    }

    // Sort by createdAt descending
    result.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return result;
  }

  async addHistory(record: Omit<HistoryRecord, "id">): Promise<void> {
    await this.loadHistory();

    const newRecord: HistoryRecord = {
      ...record,
      id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    this.history.unshift(newRecord);
    await this.saveHistory();
  }

  async updateHistory(
    id: string,
    updates: Partial<HistoryRecord>,
  ): Promise<void> {
    await this.loadHistory();

    const index = this.history.findIndex((h) => h.id === id);
    if (index !== -1) {
      this.history[index] = { ...this.history[index], ...updates };
      await this.saveHistory();
    }
  }

  async deleteHistory(id: string): Promise<void> {
    await this.loadHistory();
    this.history = this.history.filter((h) => h.id !== id);
    await this.saveHistory();
  }

  async clearHistory(): Promise<void> {
    this.history = [];
    try {
      await fs.unlink(this.historyPath);
    } catch (error) {
      // File might not exist, ignore
    }
  }

  async exportHistory(
    format: "csv" | "json",
    outputPath: string,
  ): Promise<void> {
    await this.loadHistory();

    if (format === "json") {
      await fs.writeFile(
        outputPath,
        JSON.stringify(this.history, null, 2),
        "utf-8",
      );
    } else if (format === "csv") {
      const headers = [
        "ID",
        "URL",
        "Filename",
        "Status",
        "Size",
        "Date",
        "Duration",
      ];
      const escape = (val: any) => {
        const str = String(val || "");
        return `"${str.replace(/"/g, '""')}"`;
      };

      const rows = this.history.map((h) =>
        [
          h.id,
          h.url,
          h.filename,
          h.status,
          h.fileSize,
          h.createdAt,
          h.duration,
        ].map(escape),
      );

      const csv = [headers.map(escape), ...rows]
        .map((row) => row.join(","))
        .join("\n");
      await fs.writeFile(outputPath, csv, "utf-8");
    }
  }

  private async saveHistory(): Promise<void> {
    const userDataPath = app.getPath("userData");
    const dir = path.dirname(this.historyPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      this.historyPath,
      JSON.stringify(this.history, null, 2),
      "utf-8",
    );
  }

  async cleanupOldHistory(retentionDays: number): Promise<void> {
    await this.loadHistory();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const initialLength = this.history.length;
    this.history = this.history.filter(
      (h) => new Date(h.createdAt) >= cutoffDate,
    );

    if (this.history.length !== initialLength) {
      await this.saveHistory();
    }
  }
}
