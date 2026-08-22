// Layer 3 — Coach chat
// Conversation context: profile + recent workouts + memory

import { createClient } from '@/lib/supabase/server';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function chatWithCoach(userId: string, messages: ChatMessage[]): Promise<string> {
  const supabase = await createClient();
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
  const { data: recent } = await supabase
    .from('workouts')
    .select('date, status, workout_exercises(phase, prescription_mode, workout_sets(weight, reps, rir, completed, set_type), exercises(name_vi, name))')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('date', { ascending: false })
    .limit(3);

  const goalViMap: Record<string, string> = {
    muscle_gain: 'Tăng cơ (Hypertrophy)',
    fat_loss: 'Giảm mỡ (Fat loss)',
    strength: 'Tăng sức mạnh (Strength)',
    general_fitness: 'Thể lực & Sức khỏe tổng quát',
  };
  const goalDisplay = goalViMap[profile?.goal ?? ''] || profile?.goal || 'Tập luyện thể hình';

  const ctx = `Bạn là Huấn Luyện Viên Cá Nhân AI (GymAI Coach).
QUY TẮC QUAN TRỌNG:
1. Trả lời HOÀN TOÀN bằng TIẾNG VIỆT tự nhiên, nhiệt huyết, súc tích (khoảng 60-90 từ). Tuyệt đối không dùng các cụm từ tiếng Anh như "Actionable advice:", "Key takeaways:", thay vào đó dùng "Lời khuyên hành động:" hoặc "Gợi ý cho bạn:".
2. Khi nhắc đến mục tiêu người dùng, luôn dùng tiếng Việt (ví dụ: "${goalDisplay}" thay vì mã kỹ thuật "muscle_gain").
3. Sử dụng icon phù hợp để thông tin sinh động, dễ đọc.
4. KHÔNG đưa lời khuyên y tế.

THÔNG TIN HỌC VIÊN:
- Tên: ${profile?.display_name ?? 'bạn'}
- Trình độ: ${profile?.experience_level ?? 'chưa rõ'}
- Mục tiêu: ${goalDisplay}
- Thể trạng: ${profile?.current_weight_kg ?? '?'}kg, cao ${profile?.height_cm ?? '?'}cm

LỊCH SỬ TẬP GẦN ĐÂY:
${(recent ?? []).slice(0, 3).map((w: any) => `- Ngày ${w.date}: ${(w.workout_exercises ?? [])
  .filter((we: any) => (we.phase ?? 'main') === 'main' && (we.prescription_mode ?? 'reps') === 'reps')
  .map((we: any) => `${we.exercises?.name_vi || we.exercises?.name}(${(we.workout_sets ?? [])
    .filter((s: any) => s.completed && (s.set_type ?? 'working') === 'working')
    .map((s: any) => `${s.weight}kg x ${s.reps} reps`).join(', ')})`).join('; ')}`).join('\n') || 'Chưa có dữ liệu'}

Hãy trả lời câu hỏi của học viên một cách thân thiện, rõ ràng, thực tế và dễ áp dụng ngay!`;

  const fullMessages = [{ role: 'user', content: ctx }, ...messages];

  // Gemini format
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
