// Layer 2 — Personalization
// Inputs: previous workouts per exercise, weight trend, RIR trend
// Sử dụng rule engine + Gemini explainer

import { createClient } from '@/lib/supabase/server';
import { progressionRule, detectPlateau, type Verdict, type SetRecord } from './rules';
import { callGemini } from './gemini';

type Result = {
  exercise_slug: string;
  exercise_name: string;
  previous: { weight: number; reps: number[]; rir: number[] } | null;
  verdict: Verdict;
  ai_explanation: string;
  suggested_weight: number;
  suggested_rep_min: number;
  suggested_rep_max: number;
  plateau: boolean;
};

export async function buildProgressionRecommendations(userId: string): Promise<Result[]> {
  const supabase = await createClient();
  // Lấy 6 buổi tập gần nhất + sets của chúng, join exercise info
  const { data: setsRaw } = await supabase
    .from('workout_sets')
    .select(`
      weight, reps, rir, set_type, completed, completed_at,
      workout_exercises!inner(
        exercise_id, target_rep_min, target_rep_max, target_rir,
        exercises(slug, name_vi, name),
        workouts!inner(user_id, date, status)
      )
    `)
    .eq('completed', true)
    .eq('workout_exercises.workouts.user_id', userId)
    .eq('workout_exercises.workouts.status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(200);

  const byExercise = new Map<string, any[]>();
  (setsRaw ?? []).forEach((row: any) => {
    const slug = row.workout_exercises?.exercises?.slug;
    if (!slug) return;
    if (!byExercise.has(slug)) byExercise.set(slug, []);
    byExercise.get(slug)!.push(row);
  });

  const results: Result[] = [];

  for (const [slug, rows] of byExercise) {
    // Group theo buổi tập (date)
    const byDate = new Map<string, any[]>();
    rows.forEach((r) => {
      const date = r.workout_exercises.workouts.date;
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push(r);
    });
    const sortedDates = [...byDate.keys()].sort();
    if (sortedDates.length === 0) continue;

    const lastDate = sortedDates[sortedDates.length - 1];
    const lastSets: SetRecord[] = (byDate.get(lastDate) ?? []).map((r) => ({
      set_number: r.set_number ?? 0,
      weight: r.weight, reps: r.reps, rir: r.rir,
      set_type: r.set_type ?? 'working', completed: r.completed ?? false,
    }));

    const target = rows[0].workout_exercises;
    const verdict = progressionRule(
      target.target_rep_min ?? 8,
      target.target_rep_max ?? 12,
      target.target_rir ?? 2,
      lastSets
    );

    // History cho plateau
    const history = sortedDates.map((d) => {
      const ds = byDate.get(d)!;
      return {
        weight: ds[0].weight ?? 0,
        reps: ds.map((s: any) => s.reps ?? 0),
        rir: ds.map((s: any) => s.rir ?? 0),
      };
    });
    const plateau = detectPlateau(history);

    const lastWeight = lastSets[lastSets.length - 1]?.weight ?? 0;
    const suggested = Math.max(0, lastWeight + verdict.weight_delta);
    const ex = rows[0].workout_exercises.exercises;

    // Gemini explainer (Layer 3)
    let aiExplanation = verdict.reason_vi;
    try {
      const prompt = `Bạn là AI coach. Đánh giá 1 lần gánh tạ và giải thích ngắn gọn cho user tiếng Việt:

Bài: ${ex.name_vi}
Rep range: ${target.target_rep_min}-${target.target_rep_max}
Target RIR: ${target.target_rir}
Sets gần nhất: ${JSON.stringify(lastSets.map((s) => ({ w: s.weight, r: s.reps, rir: s.rir })))}
Verdict rule engine: ${verdict.outcome} (delta ${verdict.weight_delta}kg)
Plateau: ${plateau.plateau}

Viết 1-2 câu giải thích ngắn (≤ 30 từ), giọng thân thiện. BẮT ĐẦU bằng 1 icon cảm xúc.`;
      aiExplanation = await callGemini({ prompt, temperature: 0.6, maxOutputTokens: 200 });
    } catch {}

    results.push({
      exercise_slug: slug,
      exercise_name: ex.name_vi ?? ex.name ?? slug,
      previous: {
        weight: lastWeight,
        reps: lastSets.map((s) => s.reps ?? 0),
        rir: lastSets.map((s) => s.rir ?? 0),
      },
      verdict,
      ai_explanation: aiExplanation.trim(),
      suggested_weight: suggested,
      suggested_rep_min: target.target_rep_min ?? 8,
      suggested_rep_max: target.target_rep_max ?? 12,
      plateau: plateau.plateau,
    });
  }

  return results.sort((a, b) => b.plateau === a.plateau ? 0 : b.plateau ? 1 : -1);
}