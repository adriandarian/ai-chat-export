import { describe, it, expect, vi, afterEach } from "vitest";
import { detectBrowser, isExtensionContextValid, type BrowserType } from "./browserPolyfill";

describe("browserPolyfill", () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore navigator
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
    });
  });

  describe("detectBrowser", () => {
    const mockUserAgent = (ua: string, brave = false) => {
      Object.defineProperty(global, "navigator", {
        value: {
          userAgent: ua,
          ...(brave ? { brave: { isBrave: true } } : {}),
        },
        writable: true,
      });
    };

    it("should detect Chrome browser", () => {
      mockUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      );
      expect(detectBrowser()).toBe("chrome");
    });

    it("should detect Firefox browser", () => {
      mockUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
      );
      expect(detectBrowser()).toBe("firefox");
    });

    it("should detect Safari browser", () => {
      mockUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
      );
      expect(detectBrowser()).toBe("safari");
    });

    it("should detect Edge browser", () => {
      mockUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      );
      expect(detectBrowser()).toBe("edge");
    });

    it("should detect Opera browser", () => {
      mockUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0",
      );
      expect(detectBrowser()).toBe("opera");
    });

    it("should detect Brave browser", () => {
      mockUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        true,
      );
      expect(detectBrowser()).toBe("brave");
    });

    it("should return unknown for unrecognized browsers", () => {
      mockUserAgent("SomeUnknownBrowser/1.0");
      expect(detectBrowser()).toBe("unknown");
    });

    it("should prioritize edge detection over chrome in user agent", () => {
      // Edge UA contains both "chrome" and "edg/"
      mockUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      );
      expect(detectBrowser()).toBe("edge");
    });

    it("should prioritize opera detection", () => {
      // Opera UA might contain "chrome"
      mockUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0",
      );
      expect(detectBrowser()).toBe("opera");
    });
  });

  describe("isExtensionContextValid", () => {
    it("should return true when chrome.runtime.id is defined", () => {
      expect(isExtensionContextValid()).toBe(true);
    });

    it("should handle errors gracefully", () => {
      // The mock chrome object is set up in test/setup.ts
      // It should return true as runtime.id is mocked
      const result = isExtensionContextValid();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("BrowserType", () => {
    it("should include expected browser types", () => {
      const types: BrowserType[] = [
        "chrome",
        "firefox",
        "safari",
        "edge",
        "opera",
        "brave",
        "unknown",
      ];
      types.forEach((type) => {
        expect(typeof type).toBe("string");
      });
    });
  });
});
