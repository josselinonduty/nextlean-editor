import { vi } from "vitest";
import { ref, computed, readonly } from "vue";

export { ref, computed, readonly };

vi.stubGlobal("ref", ref);
vi.stubGlobal("computed", computed);
vi.stubGlobal("readonly", readonly);

vi.stubGlobal(
  "useState",
  vi.fn(<T>(key: string, init?: () => T) => ref(init ? init() : undefined)),
);

vi.stubGlobal(
  "useCookie",
  vi.fn(
    <T>(
      _key: string,
      options?: { default?: () => T; watch?: boolean },
    ): { value: T } => {
      const cookieValue = options?.default ? options.default() : undefined;
      return ref(cookieValue) as unknown as { value: T };
    },
  ),
);

vi.stubGlobal(
  "useColorMode",
  vi.fn(() => ({
    preference: "dark",
    value: "dark",
  })),
);

vi.stubGlobal(
  "useToast",
  vi.fn(() => ({
    add: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  })),
);

vi.stubGlobal(
  "useRoute",
  vi.fn(() => ({
    query: {},
    params: {},
    path: "/",
    name: "index",
  })),
);

vi.stubGlobal("navigateTo", vi.fn());

vi.stubGlobal(
  "watch",
  vi.fn(
    (
      source: unknown,
      callback: (newVal: unknown, oldVal: unknown) => void,
      options?: { immediate?: boolean },
    ) => {
      if (options?.immediate) {
        const value =
          typeof source === "function"
            ? (source as () => unknown)()
            : undefined;
        callback(value, undefined);
      }
      return vi.fn();
    },
  ),
);

export const createMockFetch = (responses: Map<string, Response>) => {
  return vi.fn((url: string | URL | Request, init?: RequestInit) => {
    const urlString =
      typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
    const method = init?.method || "GET";
    const key = `${method}:${urlString}`;

    const response = responses.get(key) || responses.get(urlString);
    if (response) {
      return Promise.resolve(response);
    }

    return Promise.resolve(
      new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        statusText: "Not Found",
      }),
    );
  });
};

export const createMockResponse = (
  data: unknown,
  options: { ok?: boolean; status?: number; statusText?: string } = {},
): Response => {
  const { ok = true, status = 200, statusText = "OK" } = options;
  return {
    ok,
    status,
    statusText,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
    redirected: false,
    type: "basic",
    url: "",
    clone: () => createMockResponse(data, options),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    bytes: () => Promise.resolve(new Uint8Array()),
  } as Response;
};
