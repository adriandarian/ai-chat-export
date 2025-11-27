import React from "react";
import ReactDOM from "react-dom/client";
import styles from "../style.css?inline";
import { ContentApp } from "./ContentApp";

// Suppress HMR errors when extension context is invalidated
const isContextValid = () => {
  try {
    return chrome?.runtime?.id !== undefined;
  } catch (_) {
    return false;
  }
};

// Global error handler to catch and suppress HMR-related errors
const originalErrorHandler = window.onerror;
window.onerror = (message, source, lineno, colno, error) => {
  // Suppress "Extension context invalidated" errors from HMR client
  if (
    typeof message === "string" &&
    (message.includes("Extension context invalidated") ||
      message.includes("HMRPort is not initialized"))
  ) {
    // Silently ignore HMR errors when context is invalidated
    if (!isContextValid()) {
      return true; // Prevent default error handling
    }
  }

  // Call original error handler for other errors
  if (originalErrorHandler) {
    return originalErrorHandler.call(window, message, source, lineno, colno, error);
  }
  return false;
};

// Also catch unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason?.message || reason?.toString() || "";

  // Suppress HMR-related promise rejections
  if (
    message.includes("Extension context invalidated") ||
    message.includes("HMRPort is not initialized") ||
    message.includes("context invalidated")
  ) {
    if (!isContextValid()) {
      event.preventDefault(); // Prevent default error handling
      return;
    }
  }
});

const rootId = "ai-chat-export-root";
let reactRoot: ReactDOM.Root | null = null;

// Ensure DOM is ready before initializing
const initContentScript = () => {
  // Check if extension context is still valid
  try {
    if (!chrome?.runtime?.id) {
      // Extension context invalidated, skip initialization
      return;
    }
  } catch (_) {
    // Extension context invalidated, skip initialization
    return;
  }

  // Wait for body if not ready
  if (!document.body) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initContentScript);
      return;
    }
    // If still no body, wait a bit more
    setTimeout(initContentScript, 100);
    return;
  }

  let host = document.getElementById(rootId);

  if (!host) {
    host = document.createElement("div");
    host.id = rootId;
    host.style.position = "absolute";
    host.style.top = "0";
    host.style.left = "0";
    host.style.zIndex = "2147483647";
    host.style.pointerEvents = "none"; // Host lets events pass through
    document.body.appendChild(host);
  }

  // Create Shadow DOM
  const shadowRoot = host.shadowRoot || host.attachShadow({ mode: "open" });

  // Check if React root already exists
  const existingAppRoot = shadowRoot.querySelector("#app-root");
  if (existingAppRoot) {
    if (reactRoot) {
      // We have a valid react root, don't re-initialize
      return;
    } else {
      // Old disconnected root exists from extension reload, clean it up
      existingAppRoot.remove();
    }
  }

  // Clean up old style if it exists (in case of extension reload)
  const oldStyle = shadowRoot.querySelector("style");
  if (oldStyle) {
    oldStyle.remove();
  }

  // Add styles
  const styleElement = document.createElement("style");
  styleElement.textContent = styles;
  shadowRoot.appendChild(styleElement);

  // Create a root for React
  const appRoot = document.createElement("div");
  appRoot.id = "app-root";
  // appRoot inherits pointer-events: none from host, which is what we want.
  // Interactive children will override this.
  shadowRoot.appendChild(appRoot);

  // Create and store the React root
  reactRoot = ReactDOM.createRoot(appRoot);
  reactRoot.render(
    <React.StrictMode>
      <ContentApp />
    </React.StrictMode>,
  );
};

// Listen for extension context invalidation
try {
  chrome.runtime.onConnect.addListener((port) => {
    port.onDisconnect.addListener(() => {
      // Extension context was invalidated
      console.warn("Extension context invalidated, cleaning up...");
      // Clean up React root if it exists
      if (reactRoot) {
        try {
          reactRoot.unmount();
          reactRoot = null;
        } catch (_) {
          // Ignore errors during cleanup
        }
      }
    });
  });
} catch (_) {
  // Context already invalidated, ignore
}

// Initialize immediately if DOM is ready, otherwise wait
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initContentScript);
} else {
  initContentScript();
}
