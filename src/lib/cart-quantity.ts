export function getActualCartAddedQuantity({
  currentQuantity,
  requestedQuantity,
  stockCount,
}: {
  currentQuantity: number;
  requestedQuantity: number;
  stockCount: number;
}) {
  const current = Math.max(0, Math.floor(Number(currentQuantity) || 0));
  const requested = Math.max(0, Math.floor(Number(requestedQuantity) || 0));
  const stock = Math.max(0, Math.floor(Number(stockCount) || 0));
  const nextQuantity = Math.min(current + requested, stock);
  return Math.max(0, nextQuantity - current);
}
