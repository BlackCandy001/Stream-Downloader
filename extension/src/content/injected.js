/**
 * Injected Script - Chạy trong context của trang web
 * Để intercept network requests
 */

(function () {
  // Đã inject rồi thì không làm gì nữa
  if (window.__streamDownloaderInjected) return;
  window.__streamDownloaderInjected = true;

  const GLOBAL_STREAM_REGEX = /https?:\/\/[^\s"'<>]+?\.(m3u8|mpd)[^\s"'<>]*/i;

  function isStreamUrl(url) {
    if (!url || typeof url !== "string") return false;
    const lowerUrl = url.toLowerCase();
    // Quick check first
    if (
      lowerUrl.includes(".m3u8") ||
      lowerUrl.includes(".mpd") ||
      lowerUrl.includes(".m3u")
    )
      return true;
    // More complex regex check
    return GLOBAL_STREAM_REGEX.test(url);
  }

  function getTypeFromUrl(url) {
    if (url.includes(".mpd")) return "DASH";
    if (url.includes(".m3u8")) return "HLS";
    if (url.includes(".m3u")) return "M3U";
    return "UNKNOWN";
  }

  // Intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...args) {
    this._url = url;
    return originalXHROpen.apply(this, [method, url, ...args]);
  };

  XMLHttpRequest.prototype.send = function () {
    const url = this._url;
    if (url && typeof url === "string" && isStreamUrl(url)) {
      window.postMessage(
        {
          type: "STREAM_URL_DETECTED",
          url: url,
          type: getTypeFromUrl(url),
        },
        "*",
      );
    }
    return originalXHRSend.apply(this, arguments);
  };

  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    const url =
      typeof input === "string" ? input : input?.url || input?.toString();

    if (url && typeof url === "string" && isStreamUrl(url)) {
      window.postMessage(
        {
          type: "STREAM_URL_DETECTED",
          url: url,
          type: getTypeFromUrl(url),
        },
        "*",
      );
    }

    return originalFetch.apply(this, [input, init]);
  };

  // Intercept WebSocket (cho HLS.js và các player khác)
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    if (url && typeof url === "string" && isStreamUrl(url)) {
      window.postMessage(
        {
          type: "STREAM_URL_DETECTED",
          url: url,
          type: "WEBSOCKET",
        },
        "*",
      );
    }
    return new originalWebSocket(url, protocols);
  };

  console.log("[Stream Downloader] Injected script loaded");
})();
