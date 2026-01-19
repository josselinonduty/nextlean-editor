export * from "./logger";

export function formatProofTitle(title: string): string {
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function validateLeanCode(code: string): boolean {
  return code.trim().length > 0;
}

export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}
