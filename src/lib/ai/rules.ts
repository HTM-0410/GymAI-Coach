// Progressive overload rule engine (deterministic)
// Nguyên tắc spec #25:
//   Nếu hoàn thành tất cả set + reps >= upper + RIR hợp lý → suggest tăng weight
//   Nếu reps thấp hoặc RIR=0 → giữ/giảm intensity
//
// Output: rule verdict + suggested next values + reason
// Gemini sau đó chỉ giải thích verdict bằng tiếng Việt

export type SetRecord = {
  set_number: number;
  weight: number | null;
  reps: number | null;
  rir: number | null;
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
  targetRepMin: number, targetRepMax: number, targetRir: number,
  sets: SetRecord[]
): Verdict {
  const workingSets = sets.filter((s) => s.set_type === 'working' && s.completed && s.reps != null);
  if (workingSets.length === 0) {
    return { outcome: 'maintain', weight_delta: 0, rep_shift: 0, rest_delta: 0, reason_vi: 'Chưa có đủ dữ liệu để đánh giá.', confidence: 0 };
  }

  // Tính reps trung bình + RIR trung bình + weight cố định trong set
  const reps = workingSets.map((s) => s.reps as number);
  const rirs = workingSets.map((s) => s.rir).filter((r) => r != null) as number[];
  const weights = workingSets.map((s) => s.weight ?? 0);
  const avgReps = avg(reps);
  const avgRir = rirs.length > 0 ? avg(rirs) : null;
  const allSameWeight = Math.max(...weights) === Math.min(...weights);
  const weight = weights[0];

  // Tiêu chí "hit the top of rep range + RIR đủ cao"
  const hitUpper = avgReps >= targetRepMax;
  const hitMid = avgReps >= (targetRepMin + targetRepMax) / 2;
  const rirOk = avgRir == null ? false : avgRir >= 1;       // không đến failure
  const rirComfortable = avgRir == null ? false : avgRir >= 2;
  const allCompleted = workingSets.length >= 3; // đủ set

  // === CASE 1: Progress ===
  if (allSameWeight && hitUpper && rirComfortable && allCompleted) {
    return {
      outcome: 'progress',
      weight_delta: INCREMENT_KG,
      rep_shift: 0,
      rest_delta: 0,
      reason_vi: `Reps trung bình ${avgReps.toFixed(1)} ≥ ${targetRepMax} và RIR trung bình ${avgRir?.toFixed(1)} ≥ 2 trên tất cả working sets. Đủ điều kiện tăng ${INCREMENT_KG}kg.`,
      confidence: 0.9,
    };
  }

  // === CASE 2: Maintain + minor progression ===
  if (allSameWeight && hitMid && rirOk && allCompleted) {
    return {
      outcome: 'maintain',
      weight_delta: 0,
      rep_shift: 0,
      rest_delta: 0,
      reason_vi: `Đạt gần giữa rep range với RIR ${avgRir?.toFixed(1) ?? '?'}. Giữ nguyên và cố thêm 1 rep buổi sau.`,
      confidence: 0.7,
    };
  }

  // === CASE 3: Deload (RIR=0 hoặc reps giảm mạnh) ===
  const repsDropping = reps.length >= 2 && reps[reps.length - 1] < reps[0] - 2;
  if (avgRir === 0 || repsDropping) {
    return {
      outcome: 'deload',
      weight_delta: -INCREMENT_KG,
      rep_shift: 0,
      rest_delta: 15,
      reason_vi: `Đến failure (RIR=0) hoặc reps giảm mạnh giữa các sets. Đề xuất giảm ${INCREMENT_KG}kg và tăng rest 15s.`,
      confidence: 0.8,
    };
  }

  // === CASE 4: Fallback maintain ===
  return {
    outcome: 'maintain',
    weight_delta: 0, rep_shift: 0, rest_delta: 0,
    reason_vi: 'Dữ liệu chưa đủ rõ để khuyến nghị — giữ nguyên buổi sau.',
    confidence: 0.4,
  };
}

function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Plateau detection: cùng weight, cùng reps ≥ 2 buổi liên tiếp, RIR tăng dần hoặc không
export function detectPlateau(history: { weight: number; reps: number[]; rir: number[] }[]): { plateau: boolean; reason?: string } {
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