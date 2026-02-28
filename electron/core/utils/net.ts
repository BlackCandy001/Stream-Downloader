import { net } from "electron";

/**
 * Wrapper with timeout to avoid hung requests in Electron main process.
 * Prefers electron's net.fetch for better browser-like behavior and proxy support.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 30000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Use electron's net.fetch if available
    const fetchFn = typeof net !== "undefined" && net.fetch ? net.fetch : fetch;

    // @ts-ignore
    const response = await fetchFn(url, {
      ...options,
      signal: controller.signal,
    });

    return response as unknown as Response;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw new Error(`Fetch failed for ${url}: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}
