import http from "http";
import { IncomingMessage, ServerResponse } from "http";

// Local server để giao tiếp với browser extension
const PORT = 34567;
const HOST = "127.0.0.1";

export interface StreamData {
  url: string;
  type: string;
  title?: string;
  source?: string;
  timestamp: number;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export class LocalServer {
  private server: http.Server | null = null;
  private streams: StreamData[] = [];
  private onStreamReceived?: (stream: StreamData) => void;

  constructor() {}

  start(onStreamReceived?: (stream: StreamData) => void): Promise<boolean> {
    return new Promise((resolve) => {
      this.onStreamReceived = onStreamReceived;

      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on("error", (error: any) => {
        if (error.code === "EADDRINUSE") {
          console.log(`[LocalServer] Port ${PORT} already in use`);
          resolve(false);
        } else {
          console.error("[LocalServer] Error:", error);
          resolve(false);
        }
      });

      this.server.listen(PORT, HOST, () => {
        console.log(`[LocalServer] Running on http://${HOST}:${PORT}`);
        resolve(true);
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log("[LocalServer] Stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    // Enable CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = req.url || "/";

    // Health check
    if (url === "/api/health" && req.method === "GET") {
      this.sendResponse(res, { success: true, message: "OK" });
      return;
    }

    // Get all streams
    if (url === "/api/streams" && req.method === "GET") {
      this.sendResponse(res, { success: true, data: this.streams });
      return;
    }

    // Add stream
    if (url === "/api/stream" && req.method === "POST") {
      const body = await this.readBody(req);
      try {
        const data = JSON.parse(body);

        if (data.action === "add_stream") {
          const stream: StreamData = data.data;

          // Check duplicate
          const exists = this.streams.some((s) => s.url === stream.url);
          if (!exists) {
            this.streams.unshift(stream);

            // Keep only last 50
            if (this.streams.length > 50) {
              this.streams = this.streams.slice(0, 50);
            }

            // Notify app
            if (this.onStreamReceived) {
              this.onStreamReceived(stream);
            }

            console.log(`[LocalServer] New stream: ${stream.url}`);
            this.sendResponse(res, { success: true, message: "Stream added" });
          } else {
            this.sendResponse(res, {
              success: false,
              message: "Duplicate URL",
            });
          }
        } else {
          this.sendResponse(res, { success: false, message: "Unknown action" });
        }
      } catch (error: any) {
        this.sendResponse(res, { success: false, message: error.message });
      }
      return;
    }

    // Clear streams
    if (url === "/api/streams/clear" && req.method === "POST") {
      this.streams = [];
      this.sendResponse(res, { success: true, message: "Streams cleared" });
      return;
    }

    // 404
    res.writeHead(404);
    res.end("Not Found");
  }

  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        resolve(body);
      });
    });
  }

  private sendResponse(res: ServerResponse, data: ApiResponse): void {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }

  getStreams(): StreamData[] {
    return this.streams;
  }

  clearStreams(): void {
    this.streams = [];
  }
}
