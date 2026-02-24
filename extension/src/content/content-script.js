/**
 * Content Script - Detect m3u8/mpd URLs trên trang web
 * Tương thích với Firefox và Chrome/Edge
 */

// Polyfill cho chrome/browser API
const browserAPI = typeof browser !== "undefined" ? browser : chrome;

// URLs đã phát hiện
const detectedUrls = new Set();

// Patterns để detect stream URLs
const STREAM_PATTERNS = [
  /\.m3u8(\?.*)?$/i,
  /\.mpd(\?.*)?$/i,
  /\.m3u(\?.*)?$/i,
  /\/manifest\.(m3u8|mpd)/i,
  /\/playlist\.(m3u8|mpd)/i,
  /\/index\.(m3u8|mpd)/i,
  /\/master\.(m3u8|mpd)/i,
  /\/stream\.(m3u8|mpd)/i,
  /\/video\.(m3u8|mpd)/i,
  /\/live\.(m3u8|mpd)/i,
  /\/chunklist/i,
  /\/mystream/i,
];

// Global regex to search within text content (like scripts), not anchored to end of string
const GLOBAL_STREAM_REGEX = /https?:\/\/[^\s"'<>]+?\.(m3u8|mpd)[^\s"'<>]*/gi;

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Gửi URL về background script
function sendUrlToBackground(url, type, source) {
  if (detectedUrls.has(url)) return;

  detectedUrls.add(url);

  browserAPI.runtime
    .sendMessage({
      action: "STREAM_DETECTED",
      data: {
        url,
        type,
        source,
        timestamp: Date.now(),
        pageTitle: document.title,
        pageUrl: window.location.href,
      },
    })
    .catch((err) => console.log("Error sending message:", err));
}

// Detect từ network requests (qua injected script)
function injectNetworkObserver() {
  const script = document.createElement("script");

  // Firefox uses extension URL differently
  if (typeof browser !== "undefined") {
    script.src = browserAPI.extension.getURL("src/content/injected.js");
  } else {
    script.src = browserAPI.runtime.getURL("src/content/injected.js");
  }

  script.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);

  // Lắng nghe sự kiện từ injected script
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data.type !== "STREAM_URL_DETECTED") return;

    const { url, type } = event.data;
    sendUrlToBackground(url, type, "network");
  });
}

// Detect từ video elements
function detectVideoElements() {
  const videos = document.querySelectorAll("video");
  videos.forEach((video) => {
    const src = video.src || video.currentSrc;
    if (src && isStreamUrl(src)) {
      const type = src.includes(".mpd")
        ? "DASH"
        : src.includes(".m3u8")
          ? "HLS"
          : "UNKNOWN";
      sendUrlToBackground(src, type, "video-element");
    }

    // Detect source elements
    video.querySelectorAll("source").forEach((source) => {
      const src = source.src;
      if (src && isStreamUrl(src)) {
        const type = getTypeFromUrl(src);
        sendUrlToBackground(src, type, "video-source");
      }
    });
  });
}

// Detect từ JavaScript
function detectFromJavaScript() {
  // Override XMLHttpRequest
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
      sendUrlToBackground(url, type, "xhr");
    }
    return originalXHRSend.apply(this, arguments);
  };

  // Override fetch
  const originalFetch = window.fetch;
  window.fetch = function (input, ...args) {
    const url = typeof input === "string" ? input : input?.url;

    if (url && typeof url === "string" && isStreamUrl(url)) {
      const type = getTypeFromUrl(url);
      sendUrlToBackground(url, type, "fetch");
    }

    return originalFetch.apply(this, [input, ...args]);
  };
}

// Kiểm tra URL có phải stream URL không
function isStreamUrl(url) {
  if (!url || typeof url !== "string") return false;
  return STREAM_PATTERNS.some((pattern) => pattern.test(url));
}

// Lấy loại stream từ URL
function getTypeFromUrl(url) {
  if (url.includes(".mpd")) return "DASH";
  if (url.includes(".m3u8")) return "HLS";
  if (url.includes(".m3u")) return "M3U";
  return "UNKNOWN";
}

// Detect từ DOM
function detectFromDOM() {
  // Tìm trong các thẻ script
  document.querySelectorAll("script").forEach((script) => {
    const content = script.textContent || script.innerText;
    if (content) {
      // Use global regex for searching within script content
      const matches = content.match(GLOBAL_STREAM_REGEX);
      if (matches) {
        matches.forEach((url) => {
          try {
            const resolved = new URL(url, window.location.href).href;
            sendUrlToBackground(
              resolved,
              getTypeFromUrl(resolved),
              "script-content",
            );
          } catch (e) {
            // Invalid URL, skip
          }
        });
      }
    }
  });

  // Tìm trong các thẻ link
  document.querySelectorAll('link[rel="alternate"]').forEach((link) => {
    const href = link.href;
    if (href && isStreamUrl(href)) {
      sendUrlToBackground(href, getTypeFromUrl(href), "link-tag");
    }
  });
}

// Khởi chạy detection
function runDetection() {
  injectNetworkObserver();
  detectFromJavaScript();

  // Run initial detection
  detectVideoElements();
  detectFromDOM();

  // Debounced continuous detection
  const continuousDetection = debounce(() => {
    detectVideoElements();
    detectFromDOM();
  }, 500);

  // Setup MutationObserver for real-time DOM changes
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        shouldCheck = true;
        break;
      }
      if (mutation.type === "attributes") {
        const target = mutation.target;
        if (
          target.tagName === "VIDEO" ||
          target.tagName === "SOURCE" ||
          target.tagName === "SCRIPT"
        ) {
          shouldCheck = true;
          break;
        }
      }
    }

    if (shouldCheck) {
      continuousDetection();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "data-src"],
  });

  // Keep a fallback periodic check (less frequent)
  setInterval(() => {
    detectVideoElements();
    detectFromDOM();
  }, 5000);
}

// Start khi DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runDetection);
} else {
  runDetection();
}

// Listen for messages from popup
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "GET_DETECTED_URLS") {
    sendResponse({ urls: Array.from(detectedUrls) });
  }
  if (message.action === "CLEAR_DETECTED_URLS") {
    detectedUrls.clear();
    sendResponse({ success: true });
  }
  return true;
});

console.log("[Stream Downloader] Content script loaded");
