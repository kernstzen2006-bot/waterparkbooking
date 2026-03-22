export function formatZar(cents: number): string {
  const r = (cents / 100).toFixed(0);
  return `R${r}`;
}
