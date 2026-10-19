export function availableCopies(owned: number, forTrade: number) {
  if (!Number.isInteger(owned) || owned < 0) return 0;
  if (!Number.isInteger(forTrade) || forTrade < 0) return 0;
  return Math.min(forTrade, owned);
}

export function reservedCopies(owned: number, forTrade: number) {
  return Math.max(0, owned - availableCopies(owned, forTrade));
}
