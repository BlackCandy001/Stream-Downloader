/**
 * Sidebar Script - Firefox Extension
 * Handles UI and communication with background script
 */

// Polyfill for browser API
const browserAPI = typeof browser !== "undefined" ? browser : chrome;

// State
let streams = [];
let settings = {};
let appConnected = false;
let appUrl = "127.0.0.1:34567";

// DOM Elements
const refreshBtn = document.getElementById("refreshBtn");
const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");
const streamList = document.getElementById("streamList");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const clearAllBtn = document.getElementById("clearAllBtn");
const sendAllBtn = document.getElementById("sendAllBtn");
const autoSendToggle = document.getElementById("autoSendToggle");
const notificationsToggle = document.getElementById("notificationsToggle");
const serverUrlInput = document.getElementById("serverUrlInput");
const testConnectionBtn = document.getElementById("testConnectionBtn");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const totalCountEl = document.getElementById("totalCount");
const hlsCountEl = document.getElementById("hlsCount");
const dashCountEl = document.getElementById("dashCount");
const m3uCountEl = document.getElementById("m3uCount");

// Initialize
async function init() {
  console.log("[Sidebar] Initializing...");
  await loadSettings();
  await loadStreams();
  await checkAppConnection();
  setupEventListeners();
  setupRealTimeUpdates();
  console.log("[Sidebar] Initialized");
}

// Load settings
async function loadSettings() {
  try {
    const result = await browserAPI.storage.local.get(["settings"]);
    settings = result.settings || {
      autoSend: false,
      notifications: true,
      serverUrl: "localhost:34567",
    };

    autoSendToggle.checked = settings.autoSend || false;
    notificationsToggle.checked = settings.notifications !== false;
    serverUrlInput.value = settings.serverUrl || "127.0.0.1:34567";
    appUrl = serverUrlInput.value;
  } catch (error) {
    console.error("[Sidebar] Error loading settings:", error);
  }
}

// Load streams
async function loadStreams() {
  showLoading();

  try {
    const result = await browserAPI.runtime.sendMessage({
      action: "GET_STREAMS",
    });
    streams = result.streams || [];
    renderStreams();
    updateStats();
  } catch (error) {
    console.error("[Sidebar] Error loading streams:", error);
    streams = [];
    renderStreams();
  }

  hideLoading();
}

// Check app connection
async function checkAppConnection() {
  try {
    const result = await browserAPI.runtime.sendMessage({
      action: "CHECK_APP_CONNECTION",
      url: appUrl,
    });
    updateConnectionStatus(result.connected);
  } catch (error) {
    console.error("[Sidebar] Error checking connection:", error);
    updateConnectionStatus(false);
  }
}

// Update connection status UI
function updateConnectionStatus(connected) {
  appConnected = connected;

  if (connected) {
    statusDot.classList.remove("disconnected");
    statusDot.classList.add("connected");
    statusText.textContent = `Connected to ${appUrl}`;
    statusText.style.color = "var(--success-color)";
  } else {
    statusDot.classList.remove("connected");
    statusDot.classList.add("disconnected");
    statusText.textContent = `Disconnected (${appUrl})`;
    statusText.style.color = "var(--danger-color)";
  }
}

// Render streams list
function renderStreams() {
  const searchTerm = searchInput.value.toLowerCase();
  const filterType = typeFilter.value;

  // Filter streams
  let filteredStreams = streams.filter((stream) => {
    const matchesSearch =
      !searchTerm ||
      stream.url.toLowerCase().includes(searchTerm) ||
      (stream.pageTitle && stream.pageTitle.toLowerCase().includes(searchTerm));

    const matchesType = filterType === "all" || stream.type === filterType;

    return matchesSearch && matchesType;
  });

  // Update empty state
  if (filteredStreams.length === 0) {
    streamList.style.display = "none";
    emptyState.style.display = "flex";

    if (streams.length === 0) {
      emptyState.querySelector(".empty-title").textContent =
        "No streams detected";
      emptyState.querySelector(".empty-description").textContent =
        "Browse websites with video content to detect streams";
    } else {
      emptyState.querySelector(".empty-title").textContent =
        "No matching streams";
      emptyState.querySelector(".empty-description").textContent =
        "Try adjusting your search or filter";
    }

    return;
  }

  streamList.style.display = "block";
  emptyState.style.display = "none";

  // Render stream items
  streamList.innerHTML = filteredStreams
    .map(
      (stream) => `
    <div class="stream-item" data-id="${stream.id}">
      <div class="stream-header">
        <span class="stream-type ${stream.type?.toLowerCase() || "unknown"}">${stream.type || "UNKNOWN"}</span>
        <span class="stream-time">${formatTime(stream.timestamp)}</span>
      </div>
      <div class="stream-url" title="${escapeHtml(stream.url)}">${escapeHtml(stream.url)}</div>
      <div class="stream-meta">
        📄 ${escapeHtml(stream.pageTitle?.substring(0, 60) || "Unknown page")}
      </div>
      <div class="stream-actions">
        <button class="btn btn-secondary btn-copy" data-url="${escapeHtml(stream.url)}">
          📋 Copy
        </button>
        <button class="btn btn-primary btn-send" data-url="${escapeHtml(stream.url)}" ${appConnected ? "" : "disabled"}>
          📤 Send
        </button>
      </div>
    </div>
  `,
    )
    .join("");

  // Add event listeners
  streamList.querySelectorAll(".btn-copy").forEach((btn) => {
    btn.addEventListener("click", () => {
      copyToClipboard(btn.dataset.url);
    });
  });

  streamList.querySelectorAll(".btn-send").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await sendToApp(btn.dataset.url);
    });
  });

  updateStats();
}

// Update stats
function updateStats() {
  totalCountEl.textContent = streams.length;
  hlsCountEl.textContent = streams.filter((s) => s.type === "HLS").length;
  dashCountEl.textContent = streams.filter((s) => s.type === "DASH").length;
  m3uCountEl.textContent = streams.filter((s) => s.type === "M3U").length;
}

// Copy to clipboard
async function copyToClipboard(url) {
  try {
    await navigator.clipboard.writeText(url);
    showNotification("URL copied!", "success");
  } catch (error) {
    showNotification("Failed to copy URL", "error");
  }
}

// Send to app
async function sendToApp(url) {
  const stream = streams.find((s) => s.url === url);

  if (!stream) {
    showNotification("Stream not found", "error");
    return;
  }

  try {
    const result = await browserAPI.runtime.sendMessage({
      action: "SEND_TO_APP",
      data: stream,
    });

    if (result.success) {
      showNotification("Sent successfully!", "success");
    } else {
      showNotification(
        "Failed to send: " + (result.error || "Unknown error"),
        "error",
      );
    }
  } catch (error) {
    showNotification("Error: " + error.message, "error");
  }
}

// Send all streams
async function sendAllStreams() {
  if (streams.length === 0) {
    showNotification("No streams to send", "info");
    return;
  }

  if (!appConnected) {
    showNotification("App not connected", "error");
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const stream of streams) {
    try {
      const result = await browserAPI.runtime.sendMessage({
        action: "SEND_TO_APP",
        data: stream,
      });
      if (result.success) successCount++;
      else failCount++;
    } catch (e) {
      failCount++;
    }
  }

  showNotification(
    `Sent ${successCount}/${streams.length} streams`,
    successCount > 0 ? "success" : "error",
  );
}

// Clear all streams
async function clearAllStreams() {
  if (streams.length === 0) return;

  try {
    await browserAPI.runtime.sendMessage({ action: "CLEAR_STREAMS" });
    streams = [];
    renderStreams();
    // No notification on successful clear
  } catch (error) {
    console.error("[Sidebar] Failed to clear streams:", error);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Refresh button
  refreshBtn.addEventListener("click", async () => {
    refreshBtn.style.transform = "rotate(360deg)";
    await loadStreams();
    await checkAppConnection();
    setTimeout(() => {
      refreshBtn.style.transform = "rotate(0deg)";
    }, 300);
  });

  // Server URL input
  serverUrlInput.addEventListener("change", async () => {
    appUrl = serverUrlInput.value.trim();
    settings.serverUrl = appUrl;
    await saveSettings();
    await checkAppConnection();
  });

  // Test connection button
  testConnectionBtn.addEventListener("click", async () => {
    await checkAppConnection();
  });

  // Search input
  searchInput.addEventListener("input", () => {
    renderStreams();
  });

  // Type filter
  typeFilter.addEventListener("change", () => {
    renderStreams();
  });

  // Clear all button
  clearAllBtn.addEventListener("click", clearAllStreams);

  // Send all button
  sendAllBtn.addEventListener("click", sendAllStreams);

  // Auto-send toggle
  autoSendToggle.addEventListener("change", async () => {
    settings.autoSend = autoSendToggle.checked;
    await saveSettings();
  });

  // Notifications toggle
  notificationsToggle.addEventListener("change", async () => {
    settings.notifications = notificationsToggle.checked;
    await saveSettings();
  });

  // Save server URL on input change (already handled above)
}

// Save settings
async function saveSettings() {
  try {
    settings.serverUrl = appUrl;
    await browserAPI.storage.local.set({ settings });
    console.log("[Sidebar] Settings saved:", settings);
  } catch (error) {
    console.error("[Sidebar] Error saving settings:", error);
  }
}

// Setup real-time updates from background script
function setupRealTimeUpdates() {
  browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "STREAMS_UPDATED") {
      console.log("[Sidebar] Streams updated, refreshing...");
      loadStreams();
      sendResponse({ success: true });
    }

    if (message.action === "CONNECTION_CHANGED") {
      console.log("[Sidebar] Connection changed:", message.connected);
      updateConnectionStatus(message.connected);
      sendResponse({ success: true });
    }

    return true;
  });
}

// Utility functions
function showLoading() {
  loadingState.style.display = "flex";
  streamList.style.display = "none";
  emptyState.style.display = "none";
}

function hideLoading() {
  loadingState.style.display = "none";
}

function showNotification(message, type = "info") {
  // Simple notification using browser API if available
  if (type === "success") {
    console.log("✅", message);
  } else if (type === "error") {
    console.error("❌", message);
  } else {
    console.log("ℹ️", message);
  }
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Start the app
init();

// Periodic connection check
setInterval(checkAppConnection, 30000);
