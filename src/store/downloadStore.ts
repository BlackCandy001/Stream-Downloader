import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface DownloadTask {
  id: string;
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
  options: any;
  filename?: string;
  outputPath?: string;
  url?: string;
  errorMessage?: string; // Error detail when status = "failed"
}

interface DownloadStore {
  downloads: DownloadTask[];
  addDownload: (download: DownloadTask) => void;
  updateDownload: (id: string, updates: Partial<DownloadTask>) => void;
  removeDownload: (id: string) => void;
  clearCompleted: () => void;
  loadDownloads: () => Promise<void>;
}

export const useDownloadStore = create<DownloadStore>()(
  persist(
    (set) => ({
      downloads: [],

      addDownload: (download) => {
        set((state) => ({
          downloads: [...state.downloads, download],
        }));
      },

      updateDownload: (id, updates) => {
        set((state) => ({
          downloads: state.downloads.map((d) =>
            d.id === id ? { ...d, ...updates } : d,
          ),
        }));
      },

      removeDownload: (id) => {
        set((state) => ({
          downloads: state.downloads.filter((d) => d.id !== id),
        }));
      },

      clearCompleted: () => {
        set((state) => ({
          downloads: state.downloads.filter(
            (d) =>
              d.status !== "completed" &&
              d.status !== "cancelled" &&
              d.status !== "failed",
          ),
        }));
      },

      loadDownloads: async () => {
        try {
          const downloads = await window.electronAPI.downloadGetAll();
          set({ downloads });
        } catch (error) {
          console.error("Failed to load downloads:", error);
        }
      },
    }),
    {
      name: "download-storage",
      partialize: (state) => ({
        downloads: state.downloads.filter(
          (d) => d.status !== "downloading" && d.status !== "pending",
        ),
      }),
    },
  ),
);
