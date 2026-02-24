import axios, { AxiosInstance } from "axios";

export class HTTPClient {
  private instance: AxiosInstance;

  constructor(headers: Record<string, string> = {}) {
    this.instance = axios.create({
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        ...headers,
      },
      timeout: 30000,
    });
  }

  async get(
    url: string,
    responseType: "text" | "arraybuffer" = "text",
  ): Promise<any> {
    const response = await this.instance.get(url, { responseType });
    return response.data;
  }
}

export const httpClient = new HTTPClient();
