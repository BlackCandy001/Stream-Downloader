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
  syncDownloadProgress: (progress: any) => void;
}

export const useDownloadStore = create<DownloadStore>()(
  persist(
    (set) => ({
      downloads: [],

      addDownload: (download) => {
        set((state) => {
          if (state.downloads.find((d) => d.id === download.id)) {
            return state;
          }
          return {
            downloads: [...state.downloads, download],
          };
        });
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

      syncDownloadProgress: (progress) => {
        set((state) => {
          const index = state.downloads.findIndex((d) => d.id === progress.downloadId);
          const taskData = {
            id: progress.downloadId,
            status: progress.status,
            progress: progress.progress,
            speed: progress.speed,
            downloadedBytes: progress.downloadedBytes,
            totalBytes: progress.totalBytes,
            eta: progress.eta,
            downloadedSegments: progress.downloadedSegments,
            totalSegments: progress.totalSegments,
            outputPath: progress.outputPath,
            errorMessage: progress.errorMessage,
          };

          if (index === -1) {
            // Add if it's an active/pending task, OR if it's a finished task we haven't seen yet
            return {
              downloads: [
                ...state.downloads,
                {
                  ...taskData,
                  options: {},
                  filename:
                    progress.title ||
                    "Download " +
                      progress.downloadId.substring(progress.downloadId.length - 4),
                  url: progress.url || "Auto-detected stream",
                },
              ],
            };
          }

          // Update existing
          const newDownloads = [...state.downloads];
          newDownloads[index] = { ...newDownloads[index], ...taskData };
          return { downloads: newDownloads };
        });
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
