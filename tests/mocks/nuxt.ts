import { vi } from "vitest";
import { ref, computed, readonly, watch } from "vue";

export { ref, computed, readonly, watch };

export const useState = vi.fn(<T>(key: string, init?: () => T) =>
  ref(init ? init() : undefined),
);

export const useCookie = vi.fn(
  <T>(
    _key: string,
    options?: { default?: () => T; watch?: boolean },
  ): { value: T } => {
    const cookieValue = options?.default ? options.default() : undefined;
    return ref(cookieValue) as unknown as { value: T };
  },
);

export const useColorMode = vi.fn(() => ({
  preference: "dark",
  value: "dark",
}));

export const useToast = vi.fn(() => ({
  add: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
}));

export const useRoute = vi.fn(() => ({
  query: {},
  params: {},
  path: "/",
  name: "index",
}));

export const navigateTo = vi.fn();

export const useRuntimeConfig = vi.fn(() => ({
  public: {},
}));

export const defineEventHandler = vi.fn(
  (handler: (...args: unknown[]) => unknown) => handler,
);

export const readBody = vi.fn();

export const createError = vi.fn(
  (options: { statusCode: number; statusMessage: string }) => {
    const error = new Error(options.statusMessage) as Error & {
      statusCode: number;
    };
    error.statusCode = options.statusCode;
    return error;
  },
);

export const getRouterParam = vi.fn((_event: unknown, param: string) => param);
