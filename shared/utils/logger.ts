interface LogMessageOptions {
  direction: "incoming" | "outgoing";
  peerId?: string;
  truncate?: boolean;
  maxLength?: number;
}

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

function formatDirection(
  direction: "incoming" | "outgoing",
  isServer: boolean,
): string {
  if (isServer) {
    return direction === "incoming"
      ? `${COLORS.cyan}Client → Server${COLORS.reset}`
      : `${COLORS.green}Server → Client${COLORS.reset}`;
  } else {
    return direction === "incoming"
      ? `${COLORS.green}Server → Client${COLORS.reset}`
      : `${COLORS.cyan}Client → Server${COLORS.reset}`;
  }
}

interface ParsedMessage {
  method?: string;
  id?: number;
  result?: unknown;
  error?: { message: string };
}

function truncateMessage(message: unknown, maxLength: number = 500): string {
  const str =
    typeof message === "string" ? message : JSON.stringify(message, null, 2);
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.substring(0, maxLength)}... ${COLORS.dim}(${
    str.length
  } chars total)${COLORS.reset}`;
}

function parseMessage(message: unknown): {
  parsed: ParsedMessage;
  type: string;
  method?: string;
  id?: number;
} {
  try {
    const parsed: ParsedMessage =
      typeof message === "string"
        ? JSON.parse(message)
        : (message as ParsedMessage);

    let type = "unknown";
    if (parsed.method && parsed.id !== undefined) {
      type = "request";
    } else if (parsed.method) {
      type = "notification";
    } else if (parsed.result !== undefined || parsed.error !== undefined) {
      type = "response";
    }

    return {
      parsed,
      type,
      method: parsed.method,
      id: parsed.id,
    };
  } catch {
    return {
      parsed: message as ParsedMessage,
      type: "raw",
    };
  }
}

export function logServerMessage(
  message: unknown,
  options: LogMessageOptions,
): void {
  const { direction, peerId } = options;
  const { parsed, type, method } = parseMessage(message);

  const directionStr = formatDirection(direction, true);
  const peerStr = peerId ? ` ${COLORS.gray}[${peerId}]${COLORS.reset}` : "";

  if (type === "request" || type === "notification") {
    console.log(
      `${directionStr}${peerStr} ${COLORS.yellow}${method}${COLORS.reset}`,
    );
  } else if (type === "response" && parsed.error) {
    console.error(
      `${directionStr}${peerStr} ${COLORS.red}Error: ${parsed.error.message}${COLORS.reset}`,
    );
  }
}

export function logClientMessage(
  message: unknown,
  options: LogMessageOptions,
): void {
  const { direction } = options;
  const { parsed, type, method } = parseMessage(message);

  const color = direction === "incoming" ? "#4ade80" : "#22d3ee";
  const dirLabel =
    direction === "incoming" ? "Server → Client" : "Client → Server";

  if (type === "request" || type === "notification") {
    console.log(
      `%c${dirLabel} %c${method}`,
      `font-weight: bold; color: ${color}`,
      "font-weight: bold",
    );
  } else if (type === "response" && parsed.error) {
    console.error(
      `%c${dirLabel} Error: %c${parsed.error.message}`,
      `color: #ef4444; font-weight: bold`,
      "color: #ef4444",
    );
  }
}
