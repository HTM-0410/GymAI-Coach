// Progressive overload rule engine (deterministic)
// Objective double progression:
//   - increase reps inside the prescribed range first
//   - only increase load next session when every working set reaches the upper bound
//   - reduce load / extend rest when reps fall below the range or drop sharply
//
// Output: rule verdict + suggested next values + reason
// Gemini sau đó chỉ giải thích verdict bằng tiếng Việt

export type SetRecord = {
  set_number: number;
  weight: number | null;
  reps: number | null;
  rir?: number | null; // legacy data only; intentionally ignored by this engine
  set_type: 'warmup' | 'working' | 'drop' | 'failure';
  completed: boolean;
};

export type Verdict = {
  outcome: 'progress' | 'maintain' | 'deload' | 'substitute';
  weight_delta: number;     // +2.5, 0, -2.5, -5
  rep_shift: number;        // 0 hoặc +1
  rest_delta: number;       // giây
  reason_vi: string;        // rule reason (sau Gemini sẽ diễn đạt lại)
  confidence: number;       // 0..1
};

const INCREMENT_KG = 2.5;

export function progressionRule(
  targetRepMin: number, targetRepMax: number,
  sets: SetRecord[]
): Verdict {
  const workingSets = sets.filter((s) => s.set_type === 'working' && s.completed && s.reps != null);
  if (workingSets.length === 0) {
    return { outcome: 'maintain', weight_delta: 0, rep_shift: 0, rest_delta: 0, reason_vi: 'Chưa có đủ dữ liệu để đánh giá.', confidence: 0 };
  }

  // Only objective performance is used: completed reps and load.
  const reps = workingSets.map((s) => s.reps as number);
  const weights = workingSets.map((s) => s.weight ?? 0);
  const avgReps = avg(reps);
  const allSameWeight = Math.max(...weights) === Math.min(...weights);

  const hitUpper = reps.every((rep) => rep >= targetRepMax);
  const hitMid = avgReps >= (targetRepMin + targetRepMax) / 2;
  const enoughSets = workingSets.length >= 2;

  // === CASE 1: Progress ===
  if (allSameWeight && hitUpper && enoughSets) {
    return {
      outcome: 'progress',
      weight_delta: INCREMENT_KG,
      rep_shift: 0,
      rest_delta: 0,
      reason_vi: `Tất cả ${workingSets.length} working sets đều đạt ít nhất ${targetRepMax} reps ở cùng mức tạ. Buổi sau có thể tăng ${INCREMENT_KG}kg và quay về đáy rep range.`,
      confidence: 0.9,
    };
  }

  // === CASE 2: Maintain + minor progression ===
  if (allSameWeight && hitMid && enoughSets) {
    return {
      outcome: 'maintain',
      weight_delta: 0,
      rep_shift: 0,
      rest_delta: 0,
      reason_vi: `Reps trung bình ${avgReps.toFixed(1)} đang trong vùng mục tiêu. Giữ tạ và cố thêm 1 rep trước khi tăng tạ.`,
      confidence: 0.7,
    };
  }

  // === CASE 3: below range or a >=20% rep drop ===
  const repDropRatio = reps.length >= 2 && reps[0] > 0
    ? (reps[0] - reps[reps.length - 1]) / reps[0]
    : 0;
  const belowRange = reps[reps.length - 1] < targetRepMin;
  if (belowRange || repDropRatio >= 0.2) {
    return {
      outcome: 'deload',
      weight_delta: -INCREMENT_KG,
      rep_shift: 0,
      rest_delta: 30,
      reason_vi: `Set cuối dưới ${targetRepMin} reps hoặc giảm ít nhất 20% so với set đầu. Đề xuất giảm ${INCREMENT_KG}kg và nghỉ thêm 30 giây.`,
      confidence: 0.8,
    };
  }

  // === CASE 4: Fallback maintain ===
  return {
    outcome: 'maintain',
    weight_delta: 0, rep_shift: 0, rest_delta: 0,
    reason_vi: 'Dữ liệu chưa đủ rõ để khuyến nghị - giữ nguyên buổi sau.',
    confidence: 0.4,
  };
}

function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Plateau detection uses only repeatable objective values.
export function detectPlateau(history: { weight: number; reps: number[] }[]): { plateau: boolean; reason?: string } {
  if (history.length < 2) return { plateau: false };
  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  const sameWeight = Math.abs(last.weight - prev.weight) < 0.01;
  const sameReps = JSON.stringify(last.reps) === JSON.stringify(prev.reps);
  if (sameWeight && sameReps) {
    return { plateau: true, reason: `Reps không tăng trong 2 buổi liên tiếp ở cùng ${last.weight}kg` };
  }
  return { plateau: false };
}
