// Layer 3 — Coach chat
// Conversation context: profile + recent workouts + memory

import { callGemini } from './gemini';
import { createClient } from '@/lib/supabase/server';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function chatWithCoach(userId: string, messages: ChatMessage[]): Promise<string> {
  const supabase = await createClient();
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
  const { data: recent } = await supabase
    .from('workouts')
    .select('date, status, workout_exercises(workout_sets(weight, reps, rir, completed), exercises(name_vi, name))')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('date', { ascending: false })
    .limit(3);

  const ctx = `Bạn là AI Personal Coach cho GymAI Coach. Trả lời tiếng Việt, ngắn gọn, thực tế, KHÔNG đưa lời khuyên y tế.

USER CONTEXT:
- Tên: ${profile?.display_name ?? 'bạn'}
- Kinh nghiệm: ${profile?.experience_level ?? 'chưa rõ'}
- Mục tiêu: ${profile?.goal ?? 'chưa rõ'}
- Cân nặng: ${profile?.current_weight_kg ?? '?'}kg, cao: ${profile?.height_cm ?? '?'}cm

BUỔI TẬP GẦN ĐÂY:
${(recent ?? []).slice(0, 3).map((w: any) => `- ${w.date}: ${(w.workout_exercises ?? []).map((we: any) => `${we.exercises?.name_vi}(${(we.workout_sets ?? []).filter((s: any) => s.completed).map((s: any) => `${s.weight}x${s.reps}@${s.rir ?? '?'}RIR`).join(',')})`).join('; ')}`).join('\n') || 'chưa có'}

Trả lời ngắn gọn (≤ 80 từ), dùng icon phù hợp, đưa ra 1-2 actionable advice.`;

  const fullMessages = [{ role: 'user', content: ctx }, ...messages];

  // Gemini chấp nhận format này
  const contents = fullMessages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite'}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 400 } }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}