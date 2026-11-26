/** Display helper for remaining stock (hardcoded UI waits on live count). */
export function stockLabel(remaining: number | null, soldOut: boolean): string {
  if (soldOut) return " · Sold out";
  if (remaining === null) return " · …";
  return ` · ${remaining} left`;
}
