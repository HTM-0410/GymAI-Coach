export type ObjectiveSet = {
  weight: number | null;
  reps: number | null;
  completed: boolean;
  set_type?: string | null;
};

export type LoadSuggestion = {
  weight: number | null;
  reps: number;
  restSeconds: number;
  action: 'establish' | 'hold' | 'reduce' | 'progress';
  reason: string;
  confidence: 'low' | 'medium' | 'high';
};

type SuggestionInput = {
  targetRepMin: number;
  targetRepMax: number;
  targetWeight: number | null;
  baseRestSeconds: number;
  currentSets: ObjectiveSet[];
  previousSets?: ObjectiveSet[];
  loadStepKg?: number;
  availableWeightsKg?: number[];
};

const validWorkingSets = (sets: ObjectiveSet[]) => sets.filter((set) =>
  set.completed
  && (set.set_type ?? 'working') === 'working'
  && set.weight != null
  && set.weight >= 0
  && set.reps != null
  && set.reps > 0,
);

function roundToStep(value: number, step: number) {
  if (step <= 0) return Math.max(0, value);
  return Math.max(0, Math.round(value / step) * step);
}

function normalizedInventory(weights: number[] | undefined) {
  return [...new Set((weights ?? []).filter((weight) => Number.isFinite(weight) && weight > 0))]
    .sort((a, b) => a - b);
}

function nearestLoad(target: number, inventory: number[]) {
  if (inventory.length === 0) return target;
  return inventory.reduce((best, value) =>
    Math.abs(value - target) < Math.abs(best - target) ? value : best,
  );
}

function nextLoad(weight: number, step: number, inventory: number[]) {
  const available = inventory.find((value) => value > weight + 0.01);
  if (available != null) return available;
  const percentageIncrease = weight * 0.025;
  return roundToStep(weight + Math.max(step, percentageIncrease), step);
}

function reducedLoad(weight: number, factor: number, step: number, inventory: number[]) {
  const target = weight * factor;
  const available = [...inventory].reverse().find((value) => value < weight - 0.01 && value <= target + 0.01);
  return available ?? roundToStep(target, step);
}

export function calculateTrainingVolume(sets: ObjectiveSet[]) {
  return validWorkingSets(sets).reduce((total, set) => (
    total + (set.weight ?? 0) * (set.reps ?? 0)
  ), 0);
}

export function suggestNextSet(input: SuggestionInput): LoadSuggestion {
  const min = Math.max(1, input.targetRepMin);
  const max = Math.max(min, input.targetRepMax);
  const midpoint = Math.round((min + max) / 2);
  const step = input.loadStepKg ?? 2.5;
  const inventory = normalizedInventory(input.availableWeightsKg);
  const baseRest = Math.max(30, input.baseRestSeconds);
  const current = validWorkingSets(input.currentSets);

  if (current.length > 0) {
    const last = current[current.length - 1];
    const first = current[0];
    const weight = last.weight ?? input.targetWeight ?? 0;
    const reps = last.reps ?? 0;
    const firstReps = first.reps ?? reps;
    const dropRatio = firstReps > 0 ? (firstReps - reps) / firstReps : 0;

    if (reps < min || dropRatio >= 0.2) {
      const severe = reps <= min - 3 || dropRatio >= 0.3;
      return {
        weight: reducedLoad(weight, severe ? 0.9 : 0.95, step, inventory),
        reps: midpoint,
        restSeconds: Math.min(300, baseRest + (severe ? 60 : 30)),
        action: 'reduce',
        reason: severe
          ? 'Reps giảm mạnh; giảm nhẹ tạ và nghỉ lâu hơn để giữ kỹ thuật.'
          : 'Chưa chạm đáy rep mục tiêu; giảm nhẹ tạ cho set kế tiếp.',
        confidence: current.length >= 2 ? 'high' : 'medium',
      };
    }

    return {
      weight,
      reps: Math.min(max, reps + (reps < max ? 1 : 0)),
      restSeconds: baseRest,
      action: 'hold',
      reason: reps >= max
        ? 'Đã đạt trần reps. Giữ tạ trong buổi này; tăng tạ ở buổi sau nếu mọi set đều đạt.'
        : 'Đang trong vùng reps mục tiêu; giữ tạ và thử thêm 1 rep.',
      confidence: 'high',
    };
  }

  const previous = validWorkingSets(input.previousSets ?? []);
  if (previous.length > 0) {
    const referenceWeight = previous[previous.length - 1].weight ?? input.targetWeight ?? 0;
    const allAtUpper = previous.length >= 2 && previous.every((set) => (set.reps ?? 0) >= max);
    return {
      weight: allAtUpper ? nextLoad(referenceWeight, step, inventory) : referenceWeight,
      reps: allAtUpper ? min : Math.min(max, Math.max(min, (previous[previous.length - 1].reps ?? min) + 1)),
      restSeconds: baseRest,
      action: allAtUpper ? 'progress' : 'hold',
      reason: allAtUpper
        ? 'Buổi trước mọi set đều đạt trần reps; tăng mức tạ nhỏ nhất và quay về đáy rep range.'
        : 'Tiếp tục mức tạ gần nhất và ưu tiên tăng reps trước khi tăng tạ.',
      confidence: previous.length >= 2 ? 'high' : 'medium',
    };
  }

  return {
    weight: input.targetWeight == null ? null : nearestLoad(input.targetWeight, inventory),
    reps: midpoint,
    restSeconds: baseRest,
    action: 'establish',
    reason: 'Chưa có lịch sử đủ tin cậy; dùng mức kế hoạch và ghi nhận buổi này làm mốc.',
    confidence: input.targetWeight == null ? 'low' : 'medium',
  };
}
