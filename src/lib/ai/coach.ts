// Layer 3 - Coach chat
// Conversation context: profile + recent workouts + memory + live workout context

import { createClient } from '@/lib/supabase/server';
import { normalizeTrackingMode } from '@/lib/workouts/metrics';
import type { MinimalAIPersonalizationContext } from './personalization-context';
import { minimalPromptContext, personalizationFactors, type PersonalizationFactors } from './personalization-integration';
import {
  normalizeCoachReply,
  prepareCoachConversation,
  COACH_MAX_OUTPUT_TOKENS,
  type CoachMessage,
} from './coach-conversation';
import { extractWorkoutCoachActions, type WorkoutCoachAction } from './coach-actions';
import { createGeminiApiError, GeminiApiError, getGeminiModel } from './gemini';

export type ChatMessage = CoachMessage;

export type LiveWorkoutContext = {
  exerciseName?: string;
  exerciseSlug?: string;
  setNumber?: number;
  targetSets?: number;
  targetReps?: string;
  targetRir?: number | null;
  completedSets?: Array<{
    setNumber: number;
    weight?: number | null;
    reps?: number | null;
    rir?: number | null;
    perceivedEffort?: string | null;
  }>;
  currentWeight?: number | null;
  currentReps?: number | null;
  restRemaining?: number;
};

type GeminiContent = {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
};

type CoachGeminiBody = {
  systemInstruction?: { parts: Array<{ text: string }> };
  contents: GeminiContent[];
  generationConfig: { temperature: number; maxOutputTokens: number };
};

async function requestCoachGemini(body: CoachGeminiBody) {
  const apiKey = process.env.GEMINI_API_KEY ?? '';
  if (!apiKey) throw new Error('GEMINI_API_KEY missing');

  const model = getGeminiModel();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    },
  );
  const raw = await response.text();
  if (!response.ok) throw createGeminiApiError(response.status, raw);
  return JSON.parse(raw);
}

function shouldRetryFlattened(error: unknown) {
  return error instanceof GeminiApiError
    && error.status === 400
    && error.providerStatus === 'INVALID_ARGUMENT'
    && error.providerReason !== 'API_KEY_INVALID';
}

export async function chatWithCoach(
  userId: string,
  messages: ChatMessage[],
  personalization?: MinimalAIPersonalizationContext,
  workoutContext?: LiveWorkoutContext,
): Promise<{ reply: string; personalization: PersonalizationFactors; actions?: WorkoutCoachAction[] }> {
  const supabase = await createClient();
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
  const { data: recent } = await supabase
    .from('workouts')
    .select('date, status, workout_exercises(phase, prescription_mode, tracking_mode, target_weight, workout_sets(weight, reps, rir, note, completed, set_type), exercises(name_vi, name))')
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
  const sharedContext = minimalPromptContext(personalization, 'coach');
  const conversation = prepareCoachConversation(messages);

  let workoutLiveSnippet = '';
  if (workoutContext && workoutContext.exerciseName) {
    const effortLabels: Record<string, string> = {
      too_hard: 'Quá sức',
      hard: 'Nặng',
      appropriate: 'Vừa sức',
      easy: 'Nhẹ',
    };
    const completedStr = (workoutContext.completedSets ?? [])
      .map((s) => `Set ${s.setNumber}: ${s.weight ?? '?'}kg x ${s.reps ?? '?'} reps (Cảm nhận: ${effortLabels[s.perceivedEffort ?? ''] || (s.rir != null ? `RIR ${s.rir}` : 'chưa ghi')})`)
      .join('; ');

    workoutLiveSnippet = `
BỐI CẢNH BUỔI TẬP ĐANG DIỄN RA TRỰC TIẾP (HỌC VIÊN ĐANG ĐỨNG TẬP TẠI GYM):
- Bài tập đang tập: ${workoutContext.exerciseName}
- Hiệp hiện tại: Hiệp ${workoutContext.setNumber ?? 1} / ${workoutContext.targetSets ?? 3}
- Mục tiêu hiệp này: ${workoutContext.targetReps ?? '8-12'} reps (Mục tiêu RIR ${workoutContext.targetRir ?? 2})
- Mức tạ hiện chuẩn bị: ${workoutContext.currentWeight ?? '?'} kg, ${workoutContext.currentReps ?? '?'} reps
- Các hiệp đã hoàn thành của bài này: ${completedStr || 'Chưa hoàn thành hiệp nào'}
${workoutContext.restRemaining ? `- Đang trong thời gian nghỉ: Còn ${workoutContext.restRemaining} giây` : ''}

QUY TẮC KHI ĐANG TRONG WORKOUT:
- Trả lời thật ngắn gọn, súc tích (1-3 câu), đi thẳng vào vấn đề vì học viên đang tập mệt.
- Nếu học viên hỏi về mức tạ/số reps/nghỉ ngơi, hãy đưa ra con số cụ thể rõ ràng (ví dụ: "Dùng mức tạ 65kg cho 8-10 reps" hoặc "Nghỉ thêm 2 phút") để giao diện tự tạo nút bấm áp dụng cho người dùng!`;
  }

  const ctx = `Bạn là Huấn Luyện Viên Cá Nhân AI (GymAI Coach).
QUY TẮC QUAN TRỌNG:
1. Trả lời HOÀN TOÀN bằng TIẾNG VIỆT tự nhiên, nhiệt huyết. Không áp dụng giới hạn số từ cố định; độ dài phải phù hợp với yêu cầu và lượng dữ liệu cần giải thích. Tuyệt đối không dùng các cụm từ tiếng Anh như "Actionable advice:", "Key takeaways:", thay vào đó dùng "Lời khuyên hành động:" hoặc "Gợi ý cho bạn:".
2. Khi nhắc đến mục tiêu người dùng, luôn dùng tiếng Việt (ví dụ: "${goalDisplay}" thay vì mã kỹ thuật "muscle_gain").
3. Sử dụng icon phù hợp để thông tin sinh động, dễ đọc.
4. KHÔNG đưa lời khuyên y tế.
5. Phân biệt rõ: lịch tập/set đã hoàn thành là "nhật ký đã ghi nhận"; một lần đo là "baseline đã xác nhận"; nhận định suy ra phải gọi là "gợi ý/suy luận".
6. Giới hạn vận động do người dùng khai chỉ là context tập luyện, không phải chẩn đoán. Nếu có triệu chứng nguy hiểm, khuyên dừng tập và gặp chuyên gia y tế.
7. Mỗi đoạn chỉ trình bày một ý. Không lặp lại cùng một kết luận ở phần mở đầu và phần cuối.
${workoutLiveSnippet}

QUY TẮC DUY TRÌ MẠCH HỘI THOẠI:
${conversation.continuationRules}

YÊU CẦU VỀ ĐỘ DÀI VÀ MỨC ĐỘ CHI TIẾT CHO LƯỢT NÀY:
${conversation.responseGuidance}

THÔNG TIN HỌC VIÊN:
- Tên: ${profile?.display_name ?? 'bạn'}
- Trình độ: ${profile?.experience_level ?? 'chưa rõ'}
- Mục tiêu: ${goalDisplay}
- Thể trạng: ${profile?.current_weight_kg ?? '?'}kg, cao ${profile?.height_cm ?? '?'}cm

NGỮ CẢNH CÁ NHÂN HOÁ TỐI THIỂU (không chứa ảnh/định danh bản đo):
${sharedContext ? JSON.stringify(sharedContext) : 'Không có dữ liệu cá nhân hoá; dùng fallback chung.'}

LỊCH SỬ TẬP GẦN ĐÂY:
${(recent ?? []).slice(0, 3).map((w: any) => `- Ngày ${w.date}: ${(w.workout_exercises ?? [])
  .filter((we: any) => (we.phase ?? 'main') === 'main' && normalizeTrackingMode(we.tracking_mode ?? we.prescription_mode, {
    targetWeight: we.target_weight,
    actualWeight: (we.workout_sets ?? []).find((set: any) => Number(set.weight) > 0)?.weight,
  }) === 'weight_reps')
  .map((we: any) => `${we.exercises?.name_vi || we.exercises?.name}(${(we.workout_sets ?? [])
    .filter((s: any) => s.completed && (s.set_type ?? 'working') === 'working')
    .map((s: any) => `${s.weight}kg x ${s.reps} reps`).join(', ')})`).join('; ')}`).join('\n') || 'Chưa có dữ liệu'}

Hãy trả lời câu hỏi gần nhất của học viên một cách thân thiện, rõ ràng, thực tế và dễ áp dụng ngay!`;

  // Gemini format
  const contents: GeminiContent[] = conversation.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const generationConfig = { temperature: 0.5, maxOutputTokens: COACH_MAX_OUTPUT_TOKENS };
  let data;
  try {
    data = await requestCoachGemini({
      systemInstruction: { parts: [{ text: ctx }] },
      contents,
      generationConfig,
    });
  } catch (error) {
    if (!shouldRetryFlattened(error)) throw error;

    const transcript = conversation.messages
      .map((message) => `${message.role === 'assistant' ? 'AI Coach' : 'Học viên'}: ${message.content}`)
      .join('\n');
    data = await requestCoachGemini({
      contents: [{
        role: 'user',
        parts: [{ text: `${ctx}\n\nHỘI THOẠI HIỆN TẠI:\n${transcript}` }],
      }],
      generationConfig,
    });
  }
  const rawReply = normalizeCoachReply(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '', messages);
  const actions = extractWorkoutCoachActions(rawReply);

  return {
    reply: rawReply,
    actions: actions.length > 0 ? actions : undefined,
    personalization: personalizationFactors(personalization, { includeBodyComposition: true, includePerformance: true }),
  };
}
