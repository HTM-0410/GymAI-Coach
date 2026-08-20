// Layer 3 — Exercise substitution
// Tìm bài thay thế theo: cùng primary muscle + equipment có sẵn + difficulty phù hợp

import { createClient } from '@/lib/supabase/server';
import { callGemini } from './gemini';

export type Substitute = {
  exercise_slug: string;
  name_vi: string;
  difficulty: string | null;
  exercise_type: string | null;
  required_equipment: string[];
  reason: string;
  confidence: number;
};

export async function findSubstitutes(args: {
  userId: string;
  exerciseSlug: string;
  gymId: string | null;
  limit?: number;
}): Promise<Substitute[]> {
  const supabase = await createClient();
  const { data: ex } = await supabase
    .from('exercises')
    .select('id, slug, exercise_muscles(role, muscles(slug, name_vi)), exercise_equipment(required, equipment(slug, name_vi)), difficulty, exercise_type')
    .eq('slug', args.exerciseSlug)
    .maybeSingle();
  if (!ex) return [];

  const primaryMuscles = ((ex as any).exercise_muscles ?? [])
    .filter((m: any) => m.role === 'primary')
    .map((m: any) => m.muscles?.slug)
    .filter(Boolean);

  // Equipment đang có trong gym
  let gymEquipment: string[] = [];
  if (args.gymId) {
    const { data: ge } = await supabase
      .from('gym_equipment')
      .select('equipment(slug)')
      .eq('gym_id', args.gymId);
    gymEquipment = (ge ?? []).map((r: any) => r.equipment?.slug).filter(Boolean);
  }

  // Lấy exercises khác cùng primary muscle
  const { data: candidates } = await supabase
    .from('exercise_muscles')
    .select('exercises!inner(id, slug, name_vi, difficulty, exercise_type, status, owner_user_id, exercise_equipment(required, equipment(slug)))')
    .eq('role', 'primary')
    .in('muscles.slug', primaryMuscles.length > 0 ? primaryMuscles : ['_none_'])
    .neq('exercises.slug', args.exerciseSlug);

  const allCands = ((candidates ?? []) as any[])
    .map((c) => c.exercises)
    .filter((e: any) => e && e.status === 'published' && (!e.owner_user_id || e.owner_user_id === args.userId));

  // Filter equipment
  const filtered = allCands.filter((c: any) => {
    const required = (c.exercise_equipment ?? []).map((e: any) => e.equipment?.slug).filter(Boolean);
    if (required.length === 0) return true;
    if (gymEquipment.length === 0) return true;
    return required.every((slug: string) => gymEquipment.includes(slug));
  });

  // Nếu Gemini ranking được thì gọi; nếu không thì fallback top 5
  const top = filtered.slice(0, 12);
  if (top.length === 0) return [];

  const candList = top.map((c: any) =>
    `- ${c.slug} (${c.name_vi}, ${c.difficulty}, ${c.exercise_type}, equipment: ${(c.exercise_equipment ?? []).map((e: any) => e.equipment?.slug).join(',') || 'none'})`
  ).join('\n');

  try {
    const prompt = `Gợi ý bài thay thế cho "${ex.slug}". Chọn TOP ${args.limit ?? 5} phù hợp nhất từ candidates (cùng primary muscle, equipment phù hợp, không trùng bài gốc).

CANDIDATES:
${candList}

Trả về JSON:
[{ "exercise_slug": "...", "reason": "1 câu ngắn ≤ 15 từ", "confidence": 0.0-1.0 }]`;

    const raw = await callGemini({ prompt, jsonSchema: true, temperature: 0.3, maxOutputTokens: 400 });
    const ranked = JSON.parse(raw) as { exercise_slug: string; reason: string; confidence: number }[];

    const bySlug = new Map(top.map((c: any) => [c.slug, c]));
    return ranked
      .map((r) => {
        const c = bySlug.get(r.exercise_slug);
        if (!c) return null;
        return {
          exercise_slug: c.slug,
          name_vi: c.name_vi,
          difficulty: c.difficulty,
          exercise_type: c.exercise_type,
          required_equipment: (c.exercise_equipment ?? []).map((e: any) => e.equipment?.slug).filter(Boolean),
          reason: r.reason,
          confidence: r.confidence,
        } as Substitute;
      })
      .filter(Boolean) as Substitute[];
  } catch {
    return top.slice(0, args.limit ?? 5).map((c: any) => ({
      exercise_slug: c.slug,
      name_vi: c.name_vi,
      difficulty: c.difficulty,
      exercise_type: c.exercise_type,
      required_equipment: (c.exercise_equipment ?? []).map((e: any) => e.equipment?.slug).filter(Boolean),
      reason: 'Cùng primary muscle, equipment phù hợp',
      confidence: 0.5,
    }));
  }
}