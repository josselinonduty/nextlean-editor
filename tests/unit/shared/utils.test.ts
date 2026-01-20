import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatProofTitle,
  validateLeanCode,
  debounce,
} from "#shared/utils/index";

describe("Shared Utilities", () => {
  describe("formatProofTitle", () => {
    it("should capitalize first letter", () => {
      expect(formatProofTitle("hello")).toBe("Hello");
    });

    it("should keep already capitalized titles", () => {
      expect(formatProofTitle("Hello")).toBe("Hello");
    });

    it("should handle single character", () => {
      expect(formatProofTitle("a")).toBe("A");
    });

    it("should handle empty string", () => {
      expect(formatProofTitle("")).toBe("");
    });

    it("should preserve rest of string", () => {
      expect(formatProofTitle("my proof title")).toBe("My proof title");
    });

    it("should handle strings starting with numbers", () => {
      expect(formatProofTitle("123 proof")).toBe("123 proof");
    });

    it("should handle unicode characters", () => {
      expect(formatProofTitle("über")).toBe("Über");
    });
  });

  describe("validateLeanCode", () => {
    it("should return true for valid code", () => {
      expect(validateLeanCode("theorem test : 1 = 1 := rfl")).toBe(true);
    });

    it("should return false for empty string", () => {
      expect(validateLeanCode("")).toBe(false);
    });

    it("should return false for whitespace only", () => {
      expect(validateLeanCode("   ")).toBe(false);
      expect(validateLeanCode("\t\n")).toBe(false);
    });

    it("should return true for code with leading/trailing whitespace", () => {
      expect(validateLeanCode("  theorem test  ")).toBe(true);
    });

    it("should return true for multiline code", () => {
      const code = `
        theorem test : 1 = 1 := by
          rfl
      `;
      expect(validateLeanCode(code)).toBe(true);
    });
  });

  describe("debounce", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should delay function execution", () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should cancel previous calls when called again", () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      vi.advanceTimersByTime(50);
      debouncedFn();
      vi.advanceTimersByTime(50);

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should pass arguments to the debounced function", () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn("arg1", "arg2");
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith("arg1", "arg2");
    });

    it("should use latest arguments when called multiple times", () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn("first");
      debouncedFn("second");
      debouncedFn("third");

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith("third");
    });

    it("should allow multiple separate calls after delay", () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn("first");
      vi.advanceTimersByTime(100);

      debouncedFn("second");
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenNthCalledWith(1, "first");
      expect(fn).toHaveBeenNthCalledWith(2, "second");
    });

    it("should work with zero delay", () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 0);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(0);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should handle typed functions", () => {
      const fn = vi.fn((a: number, b: string) => `${a}-${b}`);
      const debouncedFn = debounce(fn, 100);

      debouncedFn(42, "test");
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith(42, "test");
    });
  });
});
