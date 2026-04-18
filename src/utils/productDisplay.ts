export function getBuyFlowProductName(displayName: string): string {
  return displayName.replace(/\s+\([^)]*\)$/, '');
}
