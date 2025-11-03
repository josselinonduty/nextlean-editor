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
  isServer: boolean
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

function truncateMessage(message: any, maxLength: number = 500): string {
  const str =
    typeof message === "string" ? message : JSON.stringify(message, null, 2);
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.substring(0, maxLength)}... ${COLORS.dim}(${
    str.length
  } chars total)${COLORS.reset}`;
}

function parseMessage(message: any): {
  parsed: any;
  type: string;
  method?: string;
  id?: number;
} {
  try {
    const parsed = typeof message === "string" ? JSON.parse(message) : message;

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
      parsed: message,
      type: "raw",
    };
  }
}

export function logServerMessage(message: any, options: LogMessageOptions) {
  const { direction, peerId, truncate = true, maxLength = 500 } = options;
  const { parsed, type, method, id } = parseMessage(message);

  const arrow = direction === "incoming" ? "◀" : "▶";
  const directionStr = formatDirection(direction, true);
  const peerStr = peerId ? `${COLORS.gray}[${peerId}]${COLORS.reset}` : "";

  console.log(
    `\n${COLORS.bright}${arrow} ${directionStr}${COLORS.reset} ${peerStr}`
  );

  if (type === "request") {
    console.log(`  ${COLORS.yellow}Type:${COLORS.reset} Request`);
    console.log(
      `  ${COLORS.yellow}Method:${COLORS.reset} ${COLORS.bright}${method}${COLORS.reset}`
    );
    console.log(`  ${COLORS.yellow}ID:${COLORS.reset} ${id}`);
    if (parsed.params) {
      console.log(`  ${COLORS.yellow}Params:${COLORS.reset}`);
      console.log(
        `    ${
          truncate
            ? truncateMessage(parsed.params, maxLength)
            : JSON.stringify(parsed.params, null, 4).split("\n").join("\n    ")
        }`
      );
    }
  } else if (type === "notification") {
    console.log(`  ${COLORS.blue}Type:${COLORS.reset} Notification`);
    console.log(
      `  ${COLORS.blue}Method:${COLORS.reset} ${COLORS.bright}${method}${COLORS.reset}`
    );
    if (parsed.params) {
      console.log(`  ${COLORS.blue}Params:${COLORS.reset}`);
      console.log(
        `    ${
          truncate
            ? truncateMessage(parsed.params, maxLength)
            : JSON.stringify(parsed.params, null, 4).split("\n").join("\n    ")
        }`
      );
    }
  } else if (type === "response") {
    console.log(`  ${COLORS.magenta}Type:${COLORS.reset} Response`);
    console.log(`  ${COLORS.magenta}ID:${COLORS.reset} ${id}`);
    if (parsed.error) {
      console.log(`  ${COLORS.red}Error:${COLORS.reset}`);
      console.log(
        `    ${JSON.stringify(parsed.error, null, 4)
          .split("\n")
          .join("\n    ")}`
      );
    } else if (parsed.result) {
      console.log(`  ${COLORS.magenta}Result:${COLORS.reset}`);
      console.log(
        `    ${
          truncate
            ? truncateMessage(parsed.result, maxLength)
            : JSON.stringify(parsed.result, null, 4).split("\n").join("\n    ")
        }`
      );
    }
  } else {
    console.log(`  ${COLORS.gray}Type:${COLORS.reset} Raw/Unknown`);
    console.log(`  ${COLORS.gray}Data:${COLORS.reset}`);
    console.log(
      `    ${
        truncate
          ? truncateMessage(message, maxLength)
          : JSON.stringify(message, null, 4).split("\n").join("\n    ")
      }`
    );
  }
}

export function logClientMessage(message: any, options: LogMessageOptions) {
  const { direction, truncate = true, maxLength = 500 } = options;
  const { parsed, type, method, id } = parseMessage(message);

  const arrow = direction === "incoming" ? "◀" : "▶";
  const label =
    direction === "incoming" ? "Server → Client" : "Client → Server";

  console.log(
    `\n%c${arrow} ${label}`,
    `font-weight: bold; color: ${
      direction === "incoming" ? "#4ade80" : "#22d3ee"
    }`
  );

  if (type === "request") {
    console.log(
      `%cType: %cRequest`,
      "color: #fbbf24",
      "font-weight: bold; color: #fbbf24"
    );
    console.log(`%cMethod: %c${method}`, "color: #fbbf24", "font-weight: bold");
    console.log(`%cID: %c${id}`, "color: #fbbf24", "font-weight: bold");
    if (parsed.params) {
      console.log("%cParams:", "color: #fbbf24");
      console.log(
        truncate ? truncateMessage(parsed.params, maxLength) : parsed.params
      );
    }
  } else if (type === "notification") {
    console.log(
      `%cType: %cNotification`,
      "color: #60a5fa",
      "font-weight: bold; color: #60a5fa"
    );
    console.log(`%cMethod: %c${method}`, "color: #60a5fa", "font-weight: bold");
    if (parsed.params) {
      console.log("%cParams:", "color: #60a5fa");
      console.log(
        truncate ? truncateMessage(parsed.params, maxLength) : parsed.params
      );
    }
  } else if (type === "response") {
    console.log(
      `%cType: %cResponse`,
      "color: #c084fc",
      "font-weight: bold; color: #c084fc"
    );
    console.log(`%cID: %c${id}`, "color: #c084fc", "font-weight: bold");
    if (parsed.error) {
      console.log("%cError:", "color: #ef4444; font-weight: bold");
      console.error(parsed.error);
    } else if (parsed.result) {
      console.log("%cResult:", "color: #c084fc");
      console.log(
        truncate ? truncateMessage(parsed.result, maxLength) : parsed.result
      );
    }
  } else {
    console.log(
      `%cType: %cRaw/Unknown`,
      "color: #9ca3af",
      "font-weight: bold; color: #9ca3af"
    );
    console.log("%cData:", "color: #9ca3af");
    console.log(truncate ? truncateMessage(message, maxLength) : message);
  }
}
