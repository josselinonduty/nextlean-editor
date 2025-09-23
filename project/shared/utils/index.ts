export function formatProofTitle(title: string): string {
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function validateLeanCode(code: string): boolean {
  return code.trim().length > 0;
}
