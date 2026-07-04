/**
 * errorsのユニットテスト
 * F-001: 3Dモデル表示機能
 */

import { categorizeError, ERROR_MESSAGES } from "../errors";

describe("errors", () => {
  describe("categorizeError", () => {
    it("should categorize 404 errors as FILE_NOT_FOUND", () => {
      const error = new Error("404 Not Found");
      const result = categorizeError(error);

      expect(result).toBe(ERROR_MESSAGES.FILE_NOT_FOUND);
    });

    it("should categorize 'not found' errors as FILE_NOT_FOUND", () => {
      const error = new Error("Model not found");
      const result = categorizeError(error);

      expect(result).toBe(ERROR_MESSAGES.FILE_NOT_FOUND);
    });

    it("should categorize invalid format errors as INVALID_FORMAT", () => {
      const error = new Error("Invalid VRM format");
      const result = categorizeError(error);

      expect(result).toBe(ERROR_MESSAGES.INVALID_FORMAT);
    });

    it("should categorize parse errors as INVALID_FORMAT", () => {
      const error = new Error("Failed to parse model");
      const result = categorizeError(error);

      expect(result).toBe(ERROR_MESSAGES.INVALID_FORMAT);
    });

    it("should categorize WebGL errors as WEBGL_NOT_SUPPORTED", () => {
      const error = new Error("WebGL context lost");
      const result = categorizeError(error);

      expect(result).toBe(ERROR_MESSAGES.WEBGL_NOT_SUPPORTED);
    });

    it("should categorize context errors as WEBGL_NOT_SUPPORTED", () => {
      const error = new Error("Failed to get WebGL context");
      const result = categorizeError(error);

      expect(result).toBe(ERROR_MESSAGES.WEBGL_NOT_SUPPORTED);
    });

    it("should categorize memory errors as MEMORY_ERROR", () => {
      const error = new Error("Out of memory");
      const result = categorizeError(error);

      expect(result).toBe(ERROR_MESSAGES.MEMORY_ERROR);
    });

    it("should categorize heap errors as MEMORY_ERROR", () => {
      const error = new Error("JavaScript heap out of memory");
      const result = categorizeError(error);

      expect(result).toBe(ERROR_MESSAGES.MEMORY_ERROR);
    });

    it("should categorize network errors as NETWORK_ERROR", () => {
      const error = new Error("Network request failed");
      const result = categorizeError(error);

      expect(result).toBe(ERROR_MESSAGES.NETWORK_ERROR);
    });

    it("should categorize fetch errors as NETWORK_ERROR", () => {
      const error = new Error("Failed to fetch model");
      const result = categorizeError(error);

      expect(result).toBe(ERROR_MESSAGES.NETWORK_ERROR);
    });

    it("should categorize timeout errors as NETWORK_ERROR", () => {
      const error = new Error("Request timeout");
      const result = categorizeError(error);

      expect(result).toBe(ERROR_MESSAGES.NETWORK_ERROR);
    });

    it("should categorize unknown errors as UNKNOWN_ERROR", () => {
      const error = new Error("Something went wrong");
      const result = categorizeError(error);

      expect(result).toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
    });

    it("should handle empty error messages", () => {
      const error = new Error("");
      const result = categorizeError(error);

      expect(result).toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
    });

    it("should be case-insensitive", () => {
      const error1 = new Error("404 NOT FOUND");
      const error2 = new Error("404 not found");
      const error3 = new Error("404 NoT FoUnD");

      expect(categorizeError(error1)).toBe(ERROR_MESSAGES.FILE_NOT_FOUND);
      expect(categorizeError(error2)).toBe(ERROR_MESSAGES.FILE_NOT_FOUND);
      expect(categorizeError(error3)).toBe(ERROR_MESSAGES.FILE_NOT_FOUND);
    });
  });

  describe("ERROR_MESSAGES", () => {
    it("should have all required error messages", () => {
      expect(ERROR_MESSAGES.FILE_NOT_FOUND).toBeDefined();
      expect(ERROR_MESSAGES.INVALID_FORMAT).toBeDefined();
      expect(ERROR_MESSAGES.WEBGL_NOT_SUPPORTED).toBeDefined();
      expect(ERROR_MESSAGES.MEMORY_ERROR).toBeDefined();
      expect(ERROR_MESSAGES.NETWORK_ERROR).toBeDefined();
      expect(ERROR_MESSAGES.UNKNOWN_ERROR).toBeDefined();
    });

    it("should have user-friendly messages", () => {
      // すべてのメッセージが空でないことを確認
      Object.values(ERROR_MESSAGES).forEach((message) => {
        expect(message.length).toBeGreaterThan(0);
        // 日本語が含まれていることを確認
        expect(message).toMatch(/[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF]/);
      });
    });
  });
});
