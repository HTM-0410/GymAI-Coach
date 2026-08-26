import { progressionRule, type SetRecord, type Verdict } from '@/lib/ai/rules';

export type WorkoutFeedbackValue = {
  difficulty: number;
  energy: number;
  quality: number;
  note: string | null;
};

export type SummarySetInput = {
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rir?: number | null;
  perceivedEffort?: string | null;
  completed: boolean;
  setType: 'warmup' | 'working' | 'drop' | 'failure';
};

export type SummaryExerciseInput = {
  exerciseId: string;
  exerciseSlug: string;
  exerciseName: string;
  targetRepMin: number | null;
  targetRepMax: number | null;
  sets: SummarySetInput[];
};

export type PreviousExercisePerformance = {
  workoutId: string;
  completedAt: string | null;
  totalVolumeKg: number;
  totalReps: number;
  topWeightKg: number;
};

export type ExerciseAction = {
  exerciseId: string;
  title: string;
  action: string;
  outcome: Verdict['outcome'] | 'insufficient_data';
  confidence: number;
};

export type WorkoutSummaryInsight = {
  dataStatus: 'factual' | 'trend_ready';
  dataStatusLabel: string;
  headline: string;
  recap: string;
  comparison: string;
  nextSessionAction: string;
  recoveryNote: string;
  exerciseActions: ExerciseAction[];
};

type BuildWorkoutSummaryInput = {
  completionRate: number;
  completedSets: number;
  totalPlannedSets: number;
  durationMinutes: number;
  totalVolumeKg: number;
  totalReps: number;
  exercises: SummaryExerciseInput[];
  previousByExercise: Record<string, PreviousExercisePerformance>;
  feedback: WorkoutFeedbackValue | null;
  recoveryEstimate?: { minHours: number; maxHours: number; label: string } | null;
};

function completedWorkingSets(exercise: SummaryExerciseInput): SummarySetInput[] {
  return exercise.sets.filter((set) => set.completed && set.setType === 'working' && set.reps !== null);
}

function parsePainAreas(note: string | null | undefined): string[] {
  const match = note?.match(/^\[Đau\/khó chịu: ([^\]]+)\]/);
  return match ? match[1].split(',').map((item) => item.trim()).filter(Boolean) : [];
}

function currentPerformance(exercise: SummaryExerciseInput) {
  const sets = completedWorkingSets(exercise);
  return {
    volumeKg: sets.reduce((sum, set) => sum + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0),
    totalReps: sets.reduce((sum, set) => sum + (Number(set.reps) || 0), 0),
    topWeightKg: sets.reduce((max, set) => Math.max(max, Number(set.weight) || 0), 0),
  };
}

function formatPercent(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function buildExerciseAction(
  exercise: SummaryExerciseInput,
  feedback: WorkoutFeedbackValue | null,
): ExerciseAction {
  const sets = completedWorkingSets(exercise);
  const targetMin = exercise.targetRepMin;
  const targetMax = exercise.targetRepMax;

  if (sets.length === 0 || targetMin === null || targetMax === null) {
    return {
      exerciseId: exercise.exerciseId,
      title: exercise.exerciseName,
      action: 'Chưa đủ dữ liệu rep mục tiêu để đề xuất thay đổi tải.',
      outcome: 'insufficient_data',
      confidence: 0,
    };
  }

  const painAreas = parsePainAreas(feedback?.note);
  const hasPain = feedback?.quality === 1;
  const isFatigued = feedback?.quality === 3 || (feedback?.energy ?? 3) <= 2;
  const ruleSets: SetRecord[] = sets.map((set) => ({
    set_number: set.setNumber,
    weight: set.weight,
    reps: set.reps,
    rir: set.rir,
    set_type: set.setType,
    completed: set.completed,
  }));
  const verdict = progressionRule(targetMin, targetMax, ruleSets);
  const currentWeight = sets.reduce((max, set) => Math.max(max, Number(set.weight) || 0), 0);

  if (hasPain) {
    const areaText = painAreas.length > 0 ? ` ở ${painAreas.join(', ')}` : '';
    return {
      exerciseId: exercise.exerciseId,
      title: exercise.exerciseName,
      action: `Không tăng tải khi còn đau hoặc khó chịu${areaText}. Chỉ tập lại khi vận động không làm triệu chứng tăng lên.`,
      outcome: 'maintain',
      confidence: 0.95,
    };
  }

  if (isFatigued && verdict.outcome === 'progress') {
    return {
      exerciseId: exercise.exerciseId,
      title: exercise.exerciseName,
      action: `Hiệu suất đủ điều kiện tăng tải, nhưng phản hồi phục hồi chưa tốt. Giữ ${currentWeight} kg và đánh giá lại sau khởi động buổi tới.`,
      outcome: 'maintain',
      confidence: 0.9,
    };
  }

  if (verdict.outcome === 'progress') {
    return {
      exerciseId: exercise.exerciseId,
      title: exercise.exerciseName,
      action: `Tất cả hiệp đã chạm ${targetMax} reps. Buổi tới thử ${currentWeight + verdict.weight_delta} kg và quay về ${targetMin}-${targetMax} reps.`,
      outcome: verdict.outcome,
      confidence: verdict.confidence,
    };
  }

  if (verdict.outcome === 'deload') {
    return {
      exerciseId: exercise.exerciseId,
      title: exercise.exerciseName,
      action: `Giữ kỹ thuật làm ưu tiên. Thử giảm còn ${Math.max(0, currentWeight + verdict.weight_delta)} kg và nghỉ thêm ${verdict.rest_delta} giây.`,
      outcome: verdict.outcome,
      confidence: verdict.confidence,
    };
  }

  const reps = sets.map((set) => Number(set.reps) || 0);
  const bestReps = Math.max(...reps);
  return {
    exerciseId: exercise.exerciseId,
    title: exercise.exerciseName,
    action: `Giữ ${currentWeight} kg. Mục tiêu trước mắt là đưa mọi hiệp lên gần ${targetMax} reps trước khi tăng tạ. Hiệp tốt nhất hiện tại: ${bestReps} reps.`,
    outcome: verdict.outcome,
    confidence: verdict.confidence,
  };
}

export function buildWorkoutSummaryInsight(input: BuildWorkoutSummaryInput): WorkoutSummaryInsight {
  const matchedExercises = input.exercises.filter((exercise) => input.previousByExercise[exercise.exerciseId]);
  const dataStatus = matchedExercises.length > 0 ? 'trend_ready' : 'factual';
  const painAreas = parsePainAreas(input.feedback?.note);
  const hasPain = input.feedback?.quality === 1;
  const isFatigued = input.feedback?.quality === 3 || (input.feedback?.energy ?? 3) <= 2;
  const exerciseActions = input.exercises.map((exercise) => buildExerciseAction(exercise, input.feedback));

  let headline = input.completionRate >= 90
    ? 'Bạn đã hoàn thành đúng kế hoạch hôm nay.'
    : 'Buổi tập đã được ghi nhận, nhưng khối lượng chưa đạt kế hoạch.';

  if (hasPain) {
    headline = 'Hoàn thành buổi tập, nhưng ưu tiên hiện tại là kiểm soát đau hoặc khó chịu.';
  } else if (isFatigued) {
    headline = 'Hiệu suất ổn, nhưng trạng thái hồi phục chưa sẵn sàng để tăng tải.';
  }

  const recap = `${input.completedSets}/${input.totalPlannedSets} hiệp đã hoàn thành trong ${input.durationMinutes} phút, với ${Math.round(input.totalVolumeKg).toLocaleString('vi-VN')} kg tổng tải và ${input.totalReps} reps.`;

  let comparison = 'Đây là mốc dữ liệu đầu tiên cho các bài trong buổi này. Cần thêm ít nhất một lần lặp lại để đánh giá xu hướng.';
  if (matchedExercises.length > 0) {
    const currentVolume = matchedExercises.reduce((sum, exercise) => sum + currentPerformance(exercise).volumeKg, 0);
    const previousVolume = matchedExercises.reduce(
      (sum, exercise) => sum + input.previousByExercise[exercise.exerciseId].totalVolumeKg,
      0,
    );
    if (previousVolume > 0) {
      const delta = ((currentVolume - previousVolume) / previousVolume) * 100;
      comparison = `Trên ${matchedExercises.length} bài có lịch sử tương ứng, tổng tải thay đổi ${formatPercent(delta)} so với lần gần nhất.`;
    } else {
      comparison = `Đã tìm thấy lịch sử cho ${matchedExercises.length} bài, nhưng dữ liệu tải trước đó chưa đủ để tính mức thay đổi.`;
    }
  }

  let nextSessionAction = exerciseActions[0]?.action ?? 'Giữ kế hoạch hiện tại cho đến khi có thêm dữ liệu thực tế.';
  if (input.completionRate < 90 && !hasPain && !isFatigued) {
    nextSessionAction = 'Không cần tập bù dồn các hiệp đã bỏ qua. Giữ đúng lịch buổi tiếp theo và ưu tiên hoàn thành ổn định trước khi tăng tải.';
  } else if (hasPain) {
    const areaText = painAreas.length > 0 ? ` ở ${painAreas.join(', ')}` : '';
    nextSessionAction = `Không tăng tải khi còn đau hoặc khó chịu${areaText}. Nếu triệu chứng kéo dài, tăng lên hoặc ảnh hưởng sinh hoạt, nên trao đổi với chuyên gia y tế phù hợp.`;
  } else if (isFatigued) {
    nextSessionAction = 'Giữ mức tạ hiện tại. Chỉ áp dụng đề xuất tăng tải nếu phần khởi động buổi tới cho cảm giác hồi phục bình thường.';
  }

  const recoveryRange = input.recoveryEstimate
    ? `${input.recoveryEstimate.minHours}-${input.recoveryEstimate.maxHours} giờ`
    : '24-48 giờ';
  let recoveryNote = `Khối lượng buổi này gợi ý khoảng hồi phục ${recoveryRange}. Đây là ước tính; trạng thái thực tế trước buổi sau vẫn là tiêu chí chính.`;
  if (isFatigued) {
    recoveryNote = `Bạn đã báo mệt mỏi hoặc năng lượng thấp. Ưu tiên ngủ, ăn và uống đủ theo nhu cầu; chỉ tập nặng lại khi khởi động cho thấy hiệu suất đã trở về bình thường.`;
  }
  if (hasPain) {
    recoveryNote = 'Đau hoặc khó chịu không nên được xử lý như mệt cơ thông thường. Tránh động tác làm triệu chứng tăng và không dùng mốc thời gian hồi phục để ép quay lại tập.';
  }

  return {
    dataStatus,
    dataStatusLabel: dataStatus === 'trend_ready' ? 'Có dữ liệu so sánh' : 'Mốc ban đầu',
    headline,
    recap,
    comparison,
    nextSessionAction,
    recoveryNote,
    exerciseActions,
  };
}
