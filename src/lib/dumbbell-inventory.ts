export type DumbbellInventoryItem = {
  weight_kg: number;
  quantity: number;
};

export function sortDumbbellInventory<T extends DumbbellInventoryItem>(items: T[]): T[] {
  return [...items].sort((a, b) => Number(a.weight_kg) - Number(b.weight_kg));
}

export function availableDumbbellWeights(
  items: DumbbellInventoryItem[],
  minimumQuantity = 1,
): number[] {
  return sortDumbbellInventory(items)
    .filter((item) => Number(item.quantity) >= minimumQuantity)
    .map((item) => Number(item.weight_kg));
}

export function nearestDumbbellWeight(target: number, availableWeights: number[]): number | null {
  if (!Number.isFinite(target) || availableWeights.length === 0) return null;

  return [...availableWeights].sort((a, b) => {
    const distance = Math.abs(a - target) - Math.abs(b - target);
    return distance === 0 ? a - b : distance;
  })[0];
}

export function dumbbellWeightAtOrBelow(ceiling: number, availableWeights: number[]): number | null {
  if (!Number.isFinite(ceiling) || availableWeights.length === 0) return null;
  const safeWeights = availableWeights.filter((weight) => Number.isFinite(weight) && weight <= ceiling);
  return safeWeights.length > 0 ? Math.max(...safeWeights) : null;
}

export function formatDumbbellInventory(items: DumbbellInventoryItem[]): string {
  if (items.length === 0) return 'chưa khai báo chi tiết mức tạ';
  return sortDumbbellInventory(items)
    .map((item) => `${Number(item.weight_kg)}kg × ${item.quantity} quả`)
    .join(', ');
}
