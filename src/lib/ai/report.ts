// Weekly AI report - tổng hợp 7 ngày qua
import { createClient } from '@/lib/supabase/server';
import { callGemini } from './gemini';
import { isMainRepsExercise } from '@/lib/training/workout-phases';
import type { MinimalAIPersonalizationContext } from './personalization-context';
import { bodyCompositionNarrative, personalizationFactors, type PersonalizationFactors } from './personalization-integration';

export type ReportDataStatus = 'insufficient_data' | 'factual' | 'trend_ready';

export type WeeklyReport = {
  period: { from: string; to: string };
  data_status: ReportDataStatus;
  totals: {
    workouts: number;
    total_sets: number;
    total_volume_kg: number;
    avg_session_min: number | null;
  };
  muscles_hit: Record<string, number>;
  feedback_avg: { difficulty: number | null; energy: number | null; quality: number | null };
  weight_change_kg: number | null;
  prs: { exercise_slug: string; record_type: string; value: number }[];
  ai_summary: string;
  body_composition_note: string | null;
  personalization: PersonalizationFactors;
};

export async function generateWeeklyReport(
  userId: string,
  personalization?: MinimalAIPersonalizationContext,
): Promise<WeeklyReport> {
  const supabase = await createClient();
  const today = new Date();
  const from = new Date(today.getTime() - 7 * 86400_000).toISOString().slice(0, 10);

  const [workoutsRes, setsRes, weightRes, prsRes, feedbackRes] = await Promise.all([
    supabase.from('workouts').select('id, status, started_at, completed_at, planned_duration, workout_exercises(workout_exercises.muscles_via_targets)').eq('user_id', userId).gte('date', from).eq('status', 'completed'),
    supabase.from('workout_sets').select('weight, reps, set_type, completed, workout_exercises!inner(phase, prescription_mode, workouts!inner(user_id, date, status))').eq('completed', true).eq('workout_exercises.workouts.user_id', userId).eq('workout_exercises.workouts.status', 'completed').gte('workout_exercises.workouts.date', from),
    supabase.from('body_weight_logs').select('weight_kg, recorded_date').eq('user_id', userId).gte('recorded_date', from).order('recorded_date'),
    supabase.from('personal_records').select('record_type, value, exercises(slug), achieved_at').eq('user_id', userId).gte('achieved_at', from.toString()),
    supabase.from('workout_feedback').select('difficulty, energy, quality, workouts!inner(user_id, date, status)').eq('workouts.user_id', userId).eq('workouts.status', 'completed').gte('workouts.date', from),
  ]);

  const workouts = workoutsRes.data ?? [];
  const sets = setsRes.data ?? [];
  const weights = weightRes.data ?? [];
  const prs = prsRes.data ?? [];
  const feedback = feedbackRes.data ?? [];

  const mainWorkingSets = sets.filter((s: any) =>
    isMainRepsExercise(s.workout_exercises ?? {}) &&
    s.set_type !== 'warmup',
  );
  const totalSets = mainWorkingSets.length;
  const totalVolume = mainWorkingSets
    .filter((s: any) => s.weight && s.reps)
    .reduce((acc: number, s: any) => acc + Number(s.weight) * Number(s.reps), 0);

  const sessions = workouts
    .map((w: any) => w.started_at && w.completed_at ? Math.round((new Date(w.completed_at).getTime() - new Date(w.started_at).getTime()) / 60000) : null)
    .filter(Boolean) as number[];
  const avgSession = sessions.length > 0 ? sessions.reduce((a, b) => a + b, 0) / sessions.length : null;

  const fbAvg = (key: 'difficulty' | 'energy' | 'quality') => {
    const arr = feedback.map((f: any) => f[key]).filter((v: any) => v != null);
    return arr.length > 0 ? Number((arr.reduce((a: number, b: number) => a + b, 0) / arr.length).toFixed(1)) : null;
  };

  const weightChange = weights.length >= 2
    ? Number(weights[weights.length - 1].weight_kg) - Number(weights[0].weight_kg)
    : null;

  const prList = prs.map((p: any) => ({
    exercise_slug: p.exercises?.slug ?? '',
    record_type: p.record_type,
    value: Number(p.value),
  }));
  const bodyCompositionNote = bodyCompositionNarrative(personalization);

  // 0 completed workouts: Return insufficient_data immediately without calling Gemini
  if (workouts.length === 0) {
    return {
      period: { from, to: today.toISOString().slice(0, 10) },
      data_status: 'insufficient_data',
      totals: {
        workouts: 0,
        total_sets: 0,
        total_volume_kg: 0,
        avg_session_min: null,
      },
      muscles_hit: {},
      feedback_avg: { difficulty: null, energy: null, quality: null },
      weight_change_kg: weightChange != null ? Number(weightChange.toFixed(1)) : null,
      prs: [],
      ai_summary: 'Chưa ghi nhận buổi tập nào hoàn tất trong 7 ngày qua. Hãy hoàn thành buổi tập đầu tiên để AI Coach tổng hợp dữ liệu thực tế và phân tích tiến độ cho bạn.',
      body_composition_note: bodyCompositionNote,
      personalization: personalizationFactors(personalization, { includeBodyComposition: true, includePerformance: true }),
    };
  }

  const dataStatus: ReportDataStatus = workouts.length >= 3 ? 'trend_ready' : 'factual';

  // AI Narrative grounded strictly on facts
  let aiSummary = '';
  try {
    const prompt = `Bạn là AI coach gym. Viết báo cáo tuần ngắn gọn (1 đoạn 60-90 từ tiếng Việt) dựa hoàn toàn trên dữ liệu thực tế sau:

Số buổi tập hoàn tất: ${workouts.length} buổi
Tổng hiệp tập chính: ${totalSets} sets
Tổng tải tích lũy: ${Math.round(totalVolume)} kg
Thời lượng trung bình mỗi buổi: ${avgSession ? Math.round(avgSession) + ' phút' : 'chưa rõ'}
Đánh giá buổi tập trung bình: Độ khó=${fbAvg('difficulty') ?? 'chưa có'}/5, Năng lượng=${fbAvg('energy') ?? 'chưa có'}/5, Form=${fbAvg('quality') ?? 'chưa có'}/5
Cân nặng thay đổi: ${weightChange != null ? weightChange.toFixed(1) + 'kg' : 'không có'}
Kỷ lục mới: ${prList.length === 0 ? 'không có' : prList.map((p) => `${p.exercise_slug}=${p.value}`).join(', ')}
Thành phần cơ thể: ${bodyCompositionNote ?? 'không có'}

QUY TẮC BẮT BUỘC:
- Dùng đúng số buổi tập thực tế (${workouts.length} buổi), KHÔNG được gọi là 0 buổi hoặc tuần nghỉ xả hơi nếu ${workouts.length} > 0.
- KHÔNG đưa khẳng định sinh lý học hoặc liều dinh dưỡng cứng nhắc khi thiếu thông tin.
- Giữ giọng khuyến khích, súc tích, chuyên nghiệp.`;

    aiSummary = await callGemini({ prompt, temperature: 0.5, maxOutputTokens: 300 });
  } catch (e) {
    aiSummary = `Tuần qua bạn đã hoàn thành ${workouts.length} buổi tập với tổng ${totalSets} sets chính và ${Math.round(totalVolume)} kg volume.`;
  }

  return {
    period: { from, to: today.toISOString().slice(0, 10) },
    data_status: dataStatus,
    totals: {
      workouts: workouts.length,
      total_sets: totalSets,
      total_volume_kg: totalVolume,
      avg_session_min: avgSession ? Math.round(avgSession) : null,
    },
    muscles_hit: {},
    feedback_avg: { difficulty: fbAvg('difficulty'), energy: fbAvg('energy'), quality: fbAvg('quality') },
    weight_change_kg: weightChange != null ? Number(weightChange.toFixed(1)) : null,
    prs: prList,
    ai_summary: aiSummary.trim(),
    body_composition_note: bodyCompositionNote,
    personalization: personalizationFactors(personalization, { includeBodyComposition: true, includePerformance: true }),
  };
}
