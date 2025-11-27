import { describe, it, expect } from "vitest";

describe("download utils", () => {
  describe("downloadBlob", () => {
    it("should be importable", async () => {
      const downloadModule = await import("./download");
      expect(downloadModule.downloadBlob).toBeDefined();
    });
  });
});
