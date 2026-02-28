import { useState, useCallback } from "react";
import { useDownloadStore } from "../store/downloadStore";

export interface ParseOptions {
  headers?: Record<string, string>;
  baseUrl?: string;
}

export interface ParseResult {
  success: boolean;
  streams?: any[];
  metadata?: any;
  error?: string;
}

export interface DownloadOptions {
  url: string;
  selectedStreamIds: string[];
  savePath: string;
  threadCount?: number;
  maxSpeed?: number;
  headers?: Record<string, string>;
  autoMerge?: boolean;
  customArgs?: string[];
  title?: string;
  type?: string;
}

export function useDownloader() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addDownload, updateDownload } = useDownloadStore();

  const parseStream = useCallback(
    async (url: string, options?: ParseOptions): Promise<ParseResult> => {
      setLoading(true);
      setError(null);

      try {
        const result = await window.electronAPI.streamParse(url, options || {});
        return result;
      } catch (err: any) {
        setError(err.message || "Failed to parse stream");
        return {
          success: false,
          error: err.message || "Failed to parse stream",
        };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const startDownload = useCallback(
    async (
      options: DownloadOptions,
    ): Promise<{ success: boolean; downloadId?: string; error?: string }> => {
      setLoading(true);
      setError(null);

      try {
        const result = await window.electronAPI.downloadStart({
          ...options,
          threadCount: options.threadCount || 8,
          autoMerge: options.autoMerge !== false,
        });

        if (result.success && result.downloadId) {
          // Add to store
          addDownload({
            id: result.downloadId,
            status: "downloading",
            progress: 0,
            speed: 0,
            downloadedBytes: 0,
            totalBytes: 1,
            downloadedSegments: 0,
            totalSegments: 100,
            options,
            url: options.url,
          });

          // Setup progress listener
          const unsubscribe = window.electronAPI.onDownloadProgress(
            (progress) => {
              if (progress.downloadId === result.downloadId) {
                updateDownload(progress.downloadId, {
                  progress: progress.progress,
                  speed: progress.speed,
                  downloadedBytes: progress.downloadedBytes,
                  totalBytes: progress.totalBytes,
                  eta: progress.eta,
                  downloadedSegments: progress.downloadedSegments,
                  totalSegments: progress.totalSegments,
                  status: progress.status,
                  outputPath: progress.outputPath,
                  // Forward error message when failed
                  ...(progress.status === "failed" && progress.errorMessage
                    ? { errorMessage: progress.errorMessage }
                    : {}),
                });

                if (
                  progress.status === "completed" ||
                  progress.status === "failed" ||
                  progress.status === "cancelled"
                ) {
                  unsubscribe();
                }
              }
            },
          );
        }

        return result;
      } catch (err: any) {
        setError(err.message || "Failed to start download");
        return {
          success: false,
          error: err.message || "Failed to start download",
        };
      } finally {
        setLoading(false);
      }
    },
    [addDownload, updateDownload],
  );

  const pauseDownload = useCallback(
    async (downloadId: string) => {
      try {
        await window.electronAPI.downloadPause(downloadId);
        updateDownload(downloadId, { status: "paused" });
      } catch (err: any) {
        console.error("Failed to pause download:", err);
      }
    },
    [updateDownload],
  );

  const resumeDownload = useCallback(
    async (downloadId: string) => {
      try {
        await window.electronAPI.downloadResume(downloadId);
        updateDownload(downloadId, { status: "downloading" });
      } catch (err: any) {
        console.error("Failed to resume download:", err);
      }
    },
    [updateDownload],
  );

  const cancelDownload = useCallback(
    async (downloadId: string) => {
      try {
        await window.electronAPI.downloadCancel(downloadId);
        updateDownload(downloadId, { status: "cancelled" });
      } catch (err: any) {
        console.error("Failed to cancel download:", err);
      }
    },
    [updateDownload],
  );

  const removeDownload = useCallback(
    async (downloadId: string, deleteFile = false) => {
      try {
        await window.electronAPI.downloadRemove(downloadId, deleteFile);
        const { removeDownload: removeFromStore } = useDownloadStore.getState();
        removeFromStore(downloadId);
      } catch (err: any) {
        console.error("Failed to remove download:", err);
      }
    },
    [],
  );

  return {
    loading,
    error,
    parseStream,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    removeDownload,
  };
}
