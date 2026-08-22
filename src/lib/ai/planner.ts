import { callGemini } from './gemini';
import {
  AiWorkoutPlanSchema,
  PlannedExerciseSchema,
  WorkoutPlanSchema,
  type PlannedExercise,
  type WorkoutPlan,
} from './schema';
import { buildContext, candidateExercises, visibleExercisesBySlugs } from './context';
import {
  allocatePhaseBudgets,
  WorkoutOptionsSchema,
  type PrescriptionMode,
  type WorkoutPhase,
} from './workout-contract';
import {
  availableDumbbellWeights,
  formatDumbbellInventory,
  nearestDumbbellWeight,
} from '@/lib/dumbbell-inventory';

type CurrentDraftExercise = {
  exerciseSlug: string;
  name?: string;
  nameVi?: string | null;
  phase?: WorkoutPhase;
  prescriptionMode?: PrescriptionMode;
  targetSets?: number;
  targetRepMin?: number | null;
  targetRepMax?: number | null;
  targetWeight?: number | null;
  targetRir?: number | null;
  restSeconds?: number;
  durationSeconds?: number | null;
  holdSeconds?: number | null;
  perSide?: boolean;
  aiReason?: string;
};

type Args = {
  userId: string;
  profile: any;
  programDayId: string;
  gymId: string | null;
  durationMinutes: number;
  options?: { includeWarmup?: boolean; includeCooldown?: boolean };
  regeneratePhase?: WorkoutPhase;
  userPrompt?: string | null;
  currentExercises?: CurrentDraftExercise[] | null;
};

export type ReferencedCandidate = { ref: string; phase: WorkoutPhase; candidate: any };

const PHASE_ORDER: WorkoutPhase[] = ['warmup', 'main', 'cooldown'];

function estimateExerciseSeconds(exercise: PlannedExercise) {
  const transition = 20;
  const betweenSets = Math.max(0, exercise.target_sets - 1) * exercise.rest_seconds;
  if (exercise.prescription_mode === 'reps') {
    const averageReps = ((exercise.target_rep_min ?? 8) + (exercise.target_rep_max ?? 12)) / 2;
    return transition + exercise.target_sets * averageReps * 4 + betweenSets;
  }
  if (exercise.prescription_mode === 'time') {
    return transition + exercise.target_sets * (exercise.duration_seconds ?? 60) + betweenSets;
  }
  const sides = exercise.per_side ? 2 : 1;
  return transition + exercise.target_sets * (exercise.hold_seconds ?? 30) * sides + betweenSets;
}

export function validatePlan(
  exercises: PlannedExercise[],
  refs: Map<string, ReferencedCandidate>,
  options: { includeWarmup: boolean; includeCooldown: boolean },
  budgets: { warmup: number; main: number; cooldown: number },
) {
  const seen = new Set<string>();
  const phases = new Set<WorkoutPhase>();
  let previousRank = -1;
  const seconds: Record<WorkoutPhase, number> = { warmup: 0, main: 0, cooldown: 0 };

  for (const exercise of exercises) {
    const referenced = refs.get(exercise.exercise_slug);
    if (!referenced) throw new Error(`AI đã chọn mã ngoài candidate pool: ${exercise.exercise_slug}`);
    if (referenced.phase !== exercise.phase) throw new Error(`AI đặt sai phase cho ${exercise.exercise_slug}`);
    if (seen.has(referenced.candidate.id)) throw new Error(`AI đã chọn trùng bài: ${referenced.candidate.slug}`);
    seen.add(referenced.candidate.id);
    phases.add(exercise.phase);
    const rank = PHASE_ORDER.indexOf(exercise.phase);
    if (rank < previousRank) throw new Error('AI trả phase sai thứ tự');
    previousRank = rank;
    seconds[exercise.phase] += estimateExerciseSeconds(exercise);
  }

  if (!phases.has('main')) throw new Error('Kế hoạch thiếu phần tập chính');
  if (options.includeWarmup !== phases.has('warmup')) throw new Error('Kế hoạch không khớp tùy chọn khởi động');
  if (options.includeCooldown !== phases.has('cooldown')) throw new Error('Kế hoạch không khớp tùy chọn giãn cơ');
  for (const phase of PHASE_ORDER) {
    if (seconds[phase] > budgets[phase] * 60) {
      throw new Error(`Phần ${phase} vượt ngân sách ${budgets[phase]} phút`);
    }
  }
}

function mainFallback(refs: ReferencedCandidate[], budget: number): PlannedExercise[] {
  const shortSession = budget <= 15;
  const sets = shortSession ? 2 : 3;
  const rest = shortSession ? 60 : 90;
  const perExerciseSeconds = sets * 40 + (sets - 1) * rest + 20;
  const count = Math.max(1, Math.min(7, refs.length, Math.floor((budget * 60) / perExerciseSeconds)));
  return refs.slice(0, count).map(({ ref }) => ({
    exercise_slug: ref,
    phase: 'main',
    prescription_mode: 'reps',
    target_sets: sets,
    target_rep_min: 8,
    target_rep_max: 12,
    target_weight: null,
    target_rir: 2,
    rest_seconds: rest,
    duration_seconds: null,
    hold_seconds: null,
    per_side: false,
    ai_reason: 'Phương án dự phòng phù hợp thời lượng và thiết bị hiện có.',
  }));
}

function accessoryFallback(
  phase: 'warmup' | 'cooldown',
  refs: ReferencedCandidate[],
  budget: number,
): PlannedExercise[] {
  const count = Math.max(1, Math.min(refs.length, budget >= 5 ? 2 : 1));
  const secondsPerExercise = Math.max(30, Math.floor((budget * 60 - count * 20) / count));
  return refs.slice(0, count).map(({ ref, candidate }) => {
    const staticHold = phase === 'cooldown' && candidate.workout_role === 'static_stretch';
    if (staticHold) {
      return {
        exercise_slug: ref,
        phase,
        prescription_mode: 'hold' as const,
        target_sets: 1,
        target_rep_min: null,
        target_rep_max: null,
        target_weight: null,
        target_rir: null,
        rest_seconds: 0,
        duration_seconds: null,
        hold_seconds: Math.min(90, Math.max(20, Math.floor(secondsPerExercise / 2))),
        per_side: true,
        ai_reason: 'Bài đã được duyệt cho phần giãn cơ sau buổi tập.',
      };
    }
    return {
      exercise_slug: ref,
      phase,
      prescription_mode: 'time' as const,
      target_sets: 1,
      target_rep_min: null,
      target_rep_max: null,
      target_weight: null,
      target_rir: null,
      rest_seconds: 0,
      duration_seconds: Math.min(180, secondsPerExercise),
      hold_seconds: null,
      per_side: false,
      ai_reason: phase === 'warmup'
        ? 'Bài đã được duyệt để chuẩn bị vận động trước phần tập chính.'
        : 'Bài đã được duyệt để hạ nhịp sau phần tập chính.',
    };
  });
}

export function deterministicFallback(
  byPhase: Record<WorkoutPhase, ReferencedCandidate[]>,
  options: { includeWarmup: boolean; includeCooldown: boolean },
  budgets: { warmup: number; main: number; cooldown: number },
) {
  return [
    ...(options.includeWarmup ? accessoryFallback('warmup', byPhase.warmup, budgets.warmup) : []),
    ...mainFallback(byPhase.main, budgets.main),
    ...(options.includeCooldown ? accessoryFallback('cooldown', byPhase.cooldown, budgets.cooldown) : []),
  ];
}

export function preserveNonTargetPhases(
  generated: PlannedExercise[],
  current: CurrentDraftExercise[] | null | undefined,
  targetPhase: WorkoutPhase | undefined,
  byPhase: Record<WorkoutPhase, ReferencedCandidate[]>,
) {
  if (!targetPhase || !current?.length) return generated;
  return PHASE_ORDER.flatMap((phase) => {
    if (phase === targetPhase) return generated.filter((exercise) => exercise.phase === phase);
    const preserved = current
      .filter((exercise) => (exercise.phase ?? 'main') === phase)
      .map((exercise) => {
        const referenced = byPhase[phase].find((item) => item.candidate.slug === exercise.exerciseSlug);
        if (!referenced) {
          throw new Error(`Không thể xác minh để giữ nguyên bài ${exercise.exerciseSlug} trong phase ${phase}.`);
        }
        const mode = exercise.prescriptionMode ?? 'reps';
        return PlannedExerciseSchema.parse({
          exercise_slug: referenced.ref,
          phase,
          prescription_mode: mode,
          target_sets: exercise.targetSets ?? (mode === 'reps' ? 3 : 1),
          target_rep_min: mode === 'reps' ? (exercise.targetRepMin ?? 8) : null,
          target_rep_max: mode === 'reps' ? (exercise.targetRepMax ?? 12) : null,
          target_weight: mode === 'reps' ? (exercise.targetWeight ?? null) : null,
          target_rir: mode === 'reps' ? (exercise.targetRir ?? 2) : null,
          rest_seconds: mode === 'reps' ? (exercise.restSeconds ?? 90) : (exercise.restSeconds ?? 0),
          duration_seconds: mode === 'time' ? (exercise.durationSeconds ?? 60) : null,
          hold_seconds: mode === 'hold' ? (exercise.holdSeconds ?? 30) : null,
          per_side: mode === 'reps' ? false : (exercise.perSide ?? false),
          ai_reason: exercise.aiReason ?? 'Giữ nguyên từ bản nháp hiện tại.',
        });
      });
    return preserved;
  });
}

export async function generateWorkoutPlan(args: Args): Promise<WorkoutPlan> {
  const options = WorkoutOptionsSchema.parse(args.options ?? {});
  const safetyText = args.userPrompt?.toLowerCase() ?? '';
  if (/(đau ngực|khó thở|chóng mặt|ngất|chấn thương cấp|acute injury)/i.test(safetyText)) {
    throw new Error('Không thể tự tạo buổi tập với triệu chứng nguy cơ. Hãy dừng tập và tham khảo chuyên gia y tế phù hợp.');
  }
  const budgets = allocatePhaseBudgets(args.durationMinutes, options);
  const context = await buildContext(args);
  const enabledPhases = PHASE_ORDER.filter((phase) => (
    phase === 'main'
    || (phase === 'warmup' && options.includeWarmup)
    || (phase === 'cooldown' && options.includeCooldown)
  ));
  const candidateResults = await Promise.all(
    enabledPhases.map(async (phase) => [phase, await candidateExercises(args, context, phase)] as const),
  );
  const rawByPhase: Record<WorkoutPhase, any[]> = { warmup: [], main: [], cooldown: [] };
  candidateResults.forEach(([phase, candidates]) => { rawByPhase[phase] = candidates; });

  if (args.regeneratePhase && args.currentExercises?.length) {
    const nonTarget = args.currentExercises.filter((exercise) => (exercise.phase ?? 'main') !== args.regeneratePhase);
    const phaseBySlug = new Map(nonTarget.map((exercise) => [exercise.exerciseSlug, {
      phase: exercise.phase ?? 'main',
      mode: exercise.prescriptionMode ?? 'reps',
    }]));
    const preservedCandidates = await visibleExercisesBySlugs(args, [...phaseBySlug.keys()], phaseBySlug, context);
    const resolvedSlugs = new Set(preservedCandidates.map((candidate: any) => candidate.slug));
    const unresolved = nonTarget.find((exercise) => !resolvedSlugs.has(exercise.exerciseSlug));
    if (unresolved) {
      throw new Error(`Không thể xác minh bài ${unresolved.exerciseSlug}; không thể giữ nguyên phase ngoài mục đang tạo lại.`);
    }
    preservedCandidates.forEach((candidate: any) => {
      const phase = phaseBySlug.get(candidate.slug)!.phase;
      if (!rawByPhase[phase].some((item) => item.slug === candidate.slug)) rawByPhase[phase].push(candidate);
    });
  }

  for (const phase of enabledPhases) {
    if (rawByPhase[phase].length === 0) {
      const label = phase === 'warmup' ? 'khởi động' : phase === 'cooldown' ? 'giãn cơ' : 'tập chính';
      throw new Error(`Chưa có bài ${label} đã được duyệt phù hợp nhóm cơ và thiết bị đã chọn.`);
    }
  }

  const prefixes: Record<WorkoutPhase, string> = { warmup: 'W', main: 'M', cooldown: 'C' };
  const byPhase: Record<WorkoutPhase, ReferencedCandidate[]> = { warmup: [], main: [], cooldown: [] };
  const allRefs: ReferencedCandidate[] = [];
  for (const phase of enabledPhases) {
    byPhase[phase] = rawByPhase[phase].map((candidate, index) => ({
      ref: `${prefixes[phase]}_${String(index + 1).padStart(3, '0')}`,
      phase,
      candidate,
    }));
    allRefs.push(...byPhase[phase]);
  }
  const refMap = new Map(allRefs.map((item) => [item.ref, item]));

  const targetMuscles = ((context.programDay as any)?.training_day_targets ?? [])
    .map((target: any) => `${target.muscles?.name_vi}(${target.role}=${target.target_sets}set)`)
    .join(', ');
  const recent = (context.recentSets as any[]).slice(0, 10).map((set) =>
    `${set.workout_exercises?.exercises?.slug}:${set.weight}x${set.reps}@${set.rir ?? '?'}RIR`).join('; ');
  const candidateList = allRefs.map(({ ref, phase, candidate }) =>
    `- ${ref} | phase=${phase} | role=${candidate.workout_role ?? 'main_strength'} | ${candidate.slug} | ${candidate.name_vi || candidate.name} | cơ=${candidate.primary_muscle_vi || 'chung'} | difficulty=${candidate.difficulty} | equipment=${(candidate.equipment_slugs ?? []).join(', ') || 'bodyweight'}`
  ).join('\n');
  const currentDraft = args.currentExercises?.length
    ? `\nDRAFT HIỆN TẠI (giữ phase của bài còn phù hợp):\n${args.currentExercises.map((exercise) =>
        `- ${exercise.phase ?? 'main'} | ${exercise.exerciseSlug} | ${exercise.prescriptionMode ?? 'reps'}`
      ).join('\n')}`
    : '';
  const userDirective = args.userPrompt?.trim()
    ? `\nYÊU CẦU NGƯỜI DÙNG: "${args.userPrompt.trim()}". Chỉ áp dụng nếu không vi phạm candidate pool, phase, quyền truy cập, an toàn và time budget.`
    : '';

  const prompt = `Bạn là AI personal trainer. Lập buổi tập JSON có cấu trúc theo phase.
User: ${args.profile.display_name}; kinh nghiệm=${args.profile.experience_level}; mục tiêu=${args.profile.goal}
Ngày tập: ${(context.programDay as any)?.name}; nhóm cơ=${targetMuscles}
Tổng thời gian=${args.durationMinutes} phút; budgets=${JSON.stringify(budgets)}
Gym equipment=${context.gymEquipment.join(', ') || 'unrestricted'}; dumbbell=${formatDumbbellInventory(context.dumbbellInventory)}
Lịch sử gần đây=${recent || 'chưa có'}${currentDraft}${userDirective}

CANDIDATES (chỉ dùng đúng ref):
${candidateList}

RÀNG BUỘC KHÔNG ĐƯỢC GHI ĐÈ:
- Chỉ trả phase đã bật, đúng thứ tự warmup -> main -> cooldown; mỗi phase có ít nhất 1 bài.
- Không trùng ref. Main dùng prescription_mode=reps. Warmup dùng time. Cooldown dùng time hoặc hold; static_stretch ưu tiên hold.
- reps: sets 1-10, rep range 1-50, rest 30-600, RIR 0-10, duration/hold=null.
- time: target_sets=1, duration_seconds 30-180, reps/weight/RIR/hold=null.
- hold: target_sets=1, hold_seconds 20-90, reps/weight/RIR/duration=null; per_side=true nếu thực hiện hai bên.
- Ước lượng không vượt budget từng phase. Với reps tính khoảng 4 giây/rep + rest giữa sets.
- Yêu cầu tự do không được thay đổi quyền truy cập, thiết bị, taxonomy, an toàn hoặc time budget.
${args.regeneratePhase ? `- Chỉ thay đổi phase=${args.regeneratePhase}; các phase khác phải giữ nguyên theo draft hiện tại.` : ''}

JSON: {"phases":[{"phase":"warmup|main|cooldown","exercises":[{"exercise_slug":"W_001","phase":"warmup","prescription_mode":"time","target_sets":1,"target_rep_min":null,"target_rep_max":null,"target_weight":null,"target_rir":null,"rest_seconds":0,"duration_seconds":90,"hold_seconds":null,"per_side":false,"ai_reason":"..."}]}]}`;

  let planned: PlannedExercise[];
  try {
    const raw = await callGemini({ prompt, jsonSchema: true, temperature: 0.35, maxOutputTokens: 2400 });
    const parsed = AiWorkoutPlanSchema.parse(JSON.parse(raw));
    planned = parsed.phases.flatMap((phase) => phase.exercises);
    if (!args.regeneratePhase) validatePlan(planned, refMap, options, budgets);
  } catch {
    planned = deterministicFallback(byPhase, options, budgets);
  }
  planned = preserveNonTargetPhases(planned, args.currentExercises, args.regeneratePhase, byPhase);
  validatePlan(planned, refMap, options, budgets);

  const dumbbellWeights = availableDumbbellWeights(context.dumbbellInventory);
  const recentWeightMap = new Map<string, number>();
  (context.recentSets as any[]).forEach((set) => {
    const slug = set.workout_exercises?.exercises?.slug;
    const value = Number(set.weight);
    if (slug && value > 0 && !recentWeightMap.has(slug)) recentWeightMap.set(slug, value);
  });

  const resolved = planned.map((exercise) => {
    const referenced = refMap.get(exercise.exercise_slug)!;
    const candidate = referenced.candidate;
    const canonicalSlug = candidate.slug;
    if (exercise.prescription_mode !== 'reps' || !candidate.equipment_slugs?.includes('dumbbell') || dumbbellWeights.length === 0) {
      return { ...exercise, exercise_slug: canonicalSlug, target_weight: null };
    }
    const desired = exercise.target_weight ?? recentWeightMap.get(canonicalSlug);
    return {
      ...exercise,
      exercise_slug: canonicalSlug,
      target_weight: desired ? nearestDumbbellWeight(desired, dumbbellWeights) : null,
    };
  });

  return WorkoutPlanSchema.parse({ options, phase_budgets: budgets, exercises: resolved });
}
