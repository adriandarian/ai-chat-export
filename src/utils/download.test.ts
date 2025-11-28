import { describe, it, expect } from "vitest";
import { downloadBlob, downloadBlobWithPicker } from "./download";

describe("download utils", () => {
  describe("downloadBlob", () => {
    it("should be importable", async () => {
      const downloadModule = await import("./download");
      expect(downloadModule.downloadBlob).toBeDefined();
    });

    it("should be a function", () => {
      expect(typeof downloadBlob).toBe("function");
    });
  });

  describe("downloadBlobWithPicker", () => {
    it("should be importable", async () => {
      const downloadModule = await import("./download");
      expect(downloadModule.downloadBlobWithPicker).toBeDefined();
    });

    it("should be a function", () => {
      expect(typeof downloadBlobWithPicker).toBe("function");
    });

    it("should return a promise", () => {
      const blob = new Blob(["test"], { type: "text/plain" });
      const result = downloadBlobWithPicker(blob, "test.txt", "Test file", {});
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe("blob creation", () => {
    it("should create blob with correct content type for text", () => {
      const blob = new Blob(["test content"], { type: "text/plain" });
      expect(blob.type).toBe("text/plain");
      expect(blob.size).toBe(12);
    });

    it("should create blob with correct content type for JSON", () => {
      const blob = new Blob(['{"key": "value"}'], { type: "application/json" });
      expect(blob.type).toBe("application/json");
    });

    it("should create blob with correct content type for HTML", () => {
      const blob = new Blob(["<html></html>"], { type: "text/html" });
      expect(blob.type).toBe("text/html");
    });

    it("should create blob with correct content type for markdown", () => {
      const blob = new Blob(["# Heading"], { type: "text/markdown" });
      expect(blob.type).toBe("text/markdown");
    });
  });
});
