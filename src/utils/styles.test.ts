import { describe, it, expect } from "vitest";
import { parseColor } from "./styles";

// Note: getPageStyles, extractCSSVariables, and getDocumentBackgroundColor
// require more complex DOM/CSSOM mocking that's beyond simple unit tests.
// We test parseColor which is a pure function.

describe("styles", () => {
  describe("parseColor", () => {
    describe("rgb format", () => {
      it("should parse rgb color", () => {
        expect(parseColor("rgb(255, 128, 64)")).toEqual([255, 128, 64]);
      });

      it("should parse rgb with no spaces", () => {
        expect(parseColor("rgb(100,200,50)")).toEqual([100, 200, 50]);
      });

      it("should parse rgb(0, 0, 0) as black", () => {
        expect(parseColor("rgb(0, 0, 0)")).toEqual([0, 0, 0]);
      });

      it("should parse rgb(255, 255, 255) as white", () => {
        expect(parseColor("rgb(255, 255, 255)")).toEqual([255, 255, 255]);
      });
    });

    describe("rgba format", () => {
      it("should parse rgba color ignoring alpha", () => {
        expect(parseColor("rgba(255, 128, 64, 0.5)")).toEqual([255, 128, 64]);
      });

      it("should parse fully opaque rgba", () => {
        expect(parseColor("rgba(100, 150, 200, 1)")).toEqual([100, 150, 200]);
      });

      it("should parse fully transparent rgba", () => {
        expect(parseColor("rgba(50, 100, 150, 0)")).toEqual([50, 100, 150]);
      });
    });

    describe("hex format", () => {
      it("should parse 6-digit hex color", () => {
        expect(parseColor("#ff8040")).toEqual([255, 128, 64]);
      });

      it("should parse uppercase hex color", () => {
        expect(parseColor("#FF8040")).toEqual([255, 128, 64]);
      });

      it("should parse #000000 as black", () => {
        expect(parseColor("#000000")).toEqual([0, 0, 0]);
      });

      it("should parse #ffffff as white", () => {
        expect(parseColor("#ffffff")).toEqual([255, 255, 255]);
      });

      it("should parse mixed case hex", () => {
        expect(parseColor("#AbCdEf")).toEqual([171, 205, 239]);
      });

      it("should parse common color hex values", () => {
        expect(parseColor("#ff0000")).toEqual([255, 0, 0]); // red
        expect(parseColor("#00ff00")).toEqual([0, 255, 0]); // green
        expect(parseColor("#0000ff")).toEqual([0, 0, 255]); // blue
      });
    });

    describe("fallback behavior", () => {
      it("should return white for unrecognized format", () => {
        expect(parseColor("not-a-color")).toEqual([255, 255, 255]);
      });

      it("should return white for empty string", () => {
        expect(parseColor("")).toEqual([255, 255, 255]);
      });

      it("should return white for named colors (not supported)", () => {
        // The parseColor function only handles rgb/rgba/hex
        expect(parseColor("red")).toEqual([255, 255, 255]);
        expect(parseColor("blue")).toEqual([255, 255, 255]);
      });

      it("should return white for hsl colors (not supported)", () => {
        expect(parseColor("hsl(120, 100%, 50%)")).toEqual([255, 255, 255]);
      });
    });

    describe("edge cases", () => {
      it("should handle hex with leading zeros", () => {
        expect(parseColor("#001122")).toEqual([0, 17, 34]);
      });

      it("should handle rgb with values at boundaries", () => {
        expect(parseColor("rgb(0, 0, 0)")).toEqual([0, 0, 0]);
        expect(parseColor("rgb(255, 255, 255)")).toEqual([255, 255, 255]);
      });

      it("should handle unusual rgb spacing according to regex", () => {
        // The regex expects: rgba?\((\d+),\s*(\d+),\s*(\d+)
        // It allows optional whitespace after commas but not before values
        expect(parseColor("rgb(255, 128, 64)")).toEqual([255, 128, 64]);
      });
    });
  });
});
