/**
 * Browser API Compatibility Layer
 *
 * This module provides a unified API across different browsers (Chrome, Firefox, Safari, etc.)
 * It normalizes the differences between chrome.* and browser.* APIs.
 */

// Detect the current browser environment
export type BrowserType = "chrome" | "firefox" | "safari" | "edge" | "opera" | "brave" | "unknown";

export function detectBrowser(): BrowserType {
  const ua = navigator.userAgent.toLowerCase();

  // Check for Brave first (it also has Chrome in UA)
  if ((navigator as any).brave?.isBrave) {
    return "brave";
  }

  // Check user agent strings
  if (ua.includes("edg/")) {
    return "edge";
  }
  if (ua.includes("opr/") || ua.includes("opera")) {
    return "opera";
  }
  if (ua.includes("firefox")) {
    return "firefox";
  }
  if (ua.includes("safari") && !ua.includes("chrome")) {
    return "safari";
  }
  if (ua.includes("chrome")) {
    return "chrome";
  }

  return "unknown";
}

// Get the appropriate browser API namespace
function getBrowserAPI(): typeof chrome {
  // Firefox and Safari use the `browser` namespace with Promise-based APIs
  // Chrome and Chromium browsers use `chrome` namespace with callback-based APIs
  // Modern browsers often support both

  if (typeof browser !== "undefined") {
    // Firefox/Safari with native Promise support
    return browser as unknown as typeof chrome;
  }

  if (typeof chrome !== "undefined") {
    return chrome;
  }

  throw new Error("No browser extension API found");
}

// Export the unified browser API
export const browserAPI = getBrowserAPI();

// Promisified versions of common APIs for consistent async/await usage
export const browserAsync = {
  /**
   * Get items from storage
   */
  storage: {
    local: {
      get: (
        keys?: string | string[] | Record<string, any> | null,
      ): Promise<Record<string, any>> => {
        return new Promise((resolve, reject) => {
          browserAPI.storage.local.get(keys ?? null, (result) => {
            if (browserAPI.runtime.lastError) {
              reject(new Error(browserAPI.runtime.lastError.message));
            } else {
              resolve(result);
            }
          });
        });
      },
      set: (items: Record<string, any>): Promise<void> => {
        return new Promise((resolve, reject) => {
          browserAPI.storage.local.set(items, () => {
            if (browserAPI.runtime.lastError) {
              reject(new Error(browserAPI.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      },
      remove: (keys: string | string[]): Promise<void> => {
        return new Promise((resolve, reject) => {
          browserAPI.storage.local.remove(keys, () => {
            if (browserAPI.runtime.lastError) {
              reject(new Error(browserAPI.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      },
    },
    sync: {
      get: (
        keys?: string | string[] | Record<string, any> | null,
      ): Promise<Record<string, any>> => {
        return new Promise((resolve, reject) => {
          browserAPI.storage.sync.get(keys ?? null, (result) => {
            if (browserAPI.runtime.lastError) {
              reject(new Error(browserAPI.runtime.lastError.message));
            } else {
              resolve(result);
            }
          });
        });
      },
      set: (items: Record<string, any>): Promise<void> => {
        return new Promise((resolve, reject) => {
          browserAPI.storage.sync.set(items, () => {
            if (browserAPI.runtime.lastError) {
              reject(new Error(browserAPI.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      },
    },
  },

  /**
   * Send a message to the background script
   */
  runtime: {
    sendMessage: <T = any>(message: any): Promise<T> => {
      return new Promise((resolve, reject) => {
        browserAPI.runtime.sendMessage(message, (response) => {
          if (browserAPI.runtime.lastError) {
            reject(new Error(browserAPI.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    },
    getURL: (path: string): string => {
      return browserAPI.runtime.getURL(path);
    },
  },

  /**
   * Download a file
   */
  downloads: {
    download: (options: chrome.downloads.DownloadOptions): Promise<number> => {
      return new Promise((resolve, reject) => {
        browserAPI.downloads.download(options, (downloadId) => {
          if (browserAPI.runtime.lastError) {
            reject(new Error(browserAPI.runtime.lastError.message));
          } else {
            resolve(downloadId);
          }
        });
      });
    },
  },

  /**
   * Tab operations
   */
  tabs: {
    query: (queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> => {
      return new Promise((resolve, reject) => {
        browserAPI.tabs.query(queryInfo, (tabs) => {
          if (browserAPI.runtime.lastError) {
            reject(new Error(browserAPI.runtime.lastError.message));
          } else {
            resolve(tabs);
          }
        });
      });
    },
    sendMessage: <T = any>(tabId: number, message: any): Promise<T> => {
      return new Promise((resolve, reject) => {
        browserAPI.tabs.sendMessage(tabId, message, (response) => {
          if (browserAPI.runtime.lastError) {
            reject(new Error(browserAPI.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    },
  },
};

// Check if extension context is valid (useful for content scripts)
export function isExtensionContextValid(): boolean {
  try {
    return browserAPI?.runtime?.id !== undefined;
  } catch (_) {
    return false;
  }
}

// Get browser-specific info
export function getBrowserInfo() {
  const browser = detectBrowser();
  const manifest = browserAPI.runtime.getManifest();

  return {
    browser,
    extensionName: manifest.name,
    extensionVersion: manifest.version,
    manifestVersion: manifest.manifest_version,
  };
}

// Declare the `browser` global for TypeScript (Firefox/Safari)
declare global {
  const browser: typeof chrome | undefined;
}
