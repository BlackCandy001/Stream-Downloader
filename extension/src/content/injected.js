/**
 * Injected Script - Chạy trong context của trang web
 * Để intercept network requests
 */

(function () {
  // Đã inject rồi thì không làm gì nữa
  if (window.__streamDownloaderInjected) return;
  window.__streamDownloaderInjected = true;

  const GLOBAL_STREAM_REGEX =
    /https?(?::|\\:)(?:\/\/|\\\/\\\/)[^\s"'<>]+?\.(?:m3u8|mpd|m3u)(?:[^\s"'<>]*)/gi;

  function isStreamUrl(url) {
    if (!url || typeof url !== "string") return false;
    const lowerUrl = url.toLowerCase();
    // Quick check first
    if (
      lowerUrl.includes(".m3u8") ||
      lowerUrl.includes(".mpd") ||
      lowerUrl.includes(".m3u") ||
      lowerUrl.includes("%2em3u8") ||
      lowerUrl.includes("m3u8") ||
      lowerUrl.includes("playlist") ||
      lowerUrl.includes("manifest")
    )
      return true;
    // More complex regex check
    const regex = new RegExp(GLOBAL_STREAM_REGEX.source, "i");
    return regex.test(url);
  }

  function getTypeFromUrl(url) {
    const lowerUrl = url.toLowerCase();
    
    // Kiểm tra YouTube trước
    if (lowerUrl.includes("youtu.be") || lowerUrl.includes("youtube.com/watch")) {
      return "YOUTUBE";
    }

    if (lowerUrl.includes(".mpd") || lowerUrl.includes("%2empd")) return "DASH";
    if (lowerUrl.includes(".m3u8") || lowerUrl.includes("%2em3u8"))
      return "HLS";
    if (lowerUrl.includes(".m3u") || lowerUrl.includes("%2em3u")) return "M3U";

    // High confidence fallback
    if (lowerUrl.includes("m3u8")) return "HLS";
    if (lowerUrl.includes("mpd")) return "DASH";

    return "UNKNOWN";
  }

  // Helper lọc YouTube
  function shouldDetect(url, type) {
    const isYouTubePage = window.location.hostname.includes("youtube.com");
    if (isYouTubePage && type !== "YOUTUBE") {
      return false;
    }
    return true;
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
      const type = getTypeFromUrl(url);
      if (shouldDetect(url, type)) {
        window.postMessage(
          {
            type: "STREAM_URL_DETECTED",
            url: url,
            type: type,
          },
          "*",
        );
      }
    }
    return originalXHRSend.apply(this, arguments);
  };

  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    const url =
      typeof input === "string" ? input : input?.url || input?.toString();

    if (url && typeof url === "string" && isStreamUrl(url)) {
      const type = getTypeFromUrl(url);
      if (shouldDetect(url, type)) {
        window.postMessage(
          {
            type: "STREAM_URL_DETECTED",
            url: url,
            type: type,
          },
          "*",
        );
      }
    }

    return originalFetch.apply(this, [input, init]);
  };

  // Intercept WebSocket (cho HLS.js và các player khác)
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    if (url && typeof url === "string" && isStreamUrl(url)) {
      const type = "WEBSOCKET";
      if (shouldDetect(url, type)) {
        window.postMessage(
          {
            type: "STREAM_URL_DETECTED",
            url: url,
            type: type,
          },
          "*",
        );
      }
    }
    return new originalWebSocket(url, protocols);
  };

  console.log("[Stream Downloader] Injected script loaded");

  // SPA Path Change Proxy
  const _pushState = history.pushState;
  const _replaceState = history.replaceState;

  history.pushState = function () {
    _pushState.apply(this, arguments);
    window.postMessage({ type: "LOCATION_CHANGE" }, "*");
  };

  history.replaceState = function () {
    _replaceState.apply(this, arguments);
    window.postMessage({ type: "LOCATION_CHANGE" }, "*");
  };

  window.addEventListener("popstate", () => {
    window.postMessage({ type: "LOCATION_CHANGE" }, "*");
  });
})();
