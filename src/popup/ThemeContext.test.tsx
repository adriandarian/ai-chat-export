import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./ThemeContext";

describe("ThemeContext", () => {
  beforeEach(() => {
    // Reset document attribute
    document.documentElement.removeAttribute("data-theme");

    // Setup chrome.storage mock
    vi.mocked(chrome.storage.local.get).mockImplementation((_, callback) => {
      (callback as (result: Record<string, unknown>) => void)({});
    });
    vi.mocked(chrome.storage.local.set).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("ThemeProvider", () => {
    it("should provide default light theme", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe("light");
    });

    it("should load saved theme from storage", async () => {
      vi.mocked(chrome.storage.local.get).mockImplementation((_, callback) => {
        (callback as (result: Record<string, unknown>) => void)({ theme: "dark" });
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      await waitFor(() => {
        expect(result.current.theme).toBe("dark");
      });
    });

    it("should set data-theme attribute on document", async () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      await waitFor(() => {
        expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      });

      act(() => {
        result.current.setTheme("dark");
      });

      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    it("should save theme to storage when changed", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme("dark");
      });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ theme: "dark" });
    });

    it("should allow switching between themes", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe("light");

      act(() => {
        result.current.setTheme("dark");
      });
      expect(result.current.theme).toBe("dark");

      act(() => {
        result.current.setTheme("light");
      });
      expect(result.current.theme).toBe("light");
    });
  });

  describe("useTheme", () => {
    it("should throw error when used outside ThemeProvider", () => {
      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow("useTheme must be used within a ThemeProvider");

      consoleError.mockRestore();
    });

    it("should return theme and setTheme function", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current).toHaveProperty("theme");
      expect(result.current).toHaveProperty("setTheme");
      expect(typeof result.current.setTheme).toBe("function");
    });
  });
});
