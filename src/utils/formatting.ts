export function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

export function formatCapacity(used: number, max: number): string {
  return `${used}/${max}`;
}
