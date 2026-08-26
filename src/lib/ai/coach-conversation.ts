export type CoachMessage = { role: 'user' | 'assistant'; content: string };

export type PreparedCoachConversation = {
  messages: CoachMessage[];
  hasVisibleAssistantMessage: boolean;
  continuationRules: string;
  responseGuidance: string;
};

export const COACH_MAX_OUTPUT_TOKENS = 2048;

function normalizeBlock(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('vi')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * The clients render their own welcome message. It is UI copy, not a model
 * response, so it must not become the first `model` turn sent to Gemini.
 */
export function prepareCoachConversation(messages: CoachMessage[]): PreparedCoachConversation {
  const firstUserIndex = messages.findIndex((message) => message.role === 'user');
  const conversationMessages = firstUserIndex >= 0 ? messages.slice(firstUserIndex) : [];
  const hasVisibleAssistantMessage = messages.some((message) => message.role === 'assistant');
  const latestUserMessage = [...conversationMessages]
    .reverse()
    .find((message) => message.role === 'user')?.content ?? '';
  const normalizedRequest = normalizeBlock(latestUserMessage)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd');
  const asksForConciseAnswer = /\b(ngan gon|tom tat|mot cau|tra loi nhanh)\b/.test(normalizedRequest);
  const asksForDetailedAnswer = /\b(toan bo|day du|chi tiet|phan tich|giai thich|liet ke|ke hoach|so sanh)\b/.test(normalizedRequest);

  const continuationRules = hasVisibleAssistantMessage
    ? `Đây là lượt tiếp theo trong cùng một cuộc hội thoại.
- KHÔNG chào lại, KHÔNG gọi lại tên học viên và KHÔNG tự giới thiệu.
- Trả lời trực tiếp phần mới trong câu hỏi gần nhất. Nếu học viên đổi một con số hoặc điều kiện, tập trung so sánh tác động của thay đổi đó.
- Không kể lại toàn bộ câu trả lời trước. Chỉ nhắc kết luận cũ bằng tối đa một mệnh đề ngắn khi thật sự cần để tạo liên kết.
- Ưu tiên thông tin mới, khác biệt, đánh đổi và hành động tiếp theo; không lặp ý bằng cách đổi câu chữ.`
    : `Đây là lượt đầu tiên và chưa có lời chào nào hiển thị.
- Có thể chào tối đa một câu ngắn, sau đó trả lời thẳng câu hỏi.
- Không tự giới thiệu dài dòng và không gọi tên học viên nhiều lần.`;

  const responseGuidance = asksForConciseAnswer
    ? `Học viên yêu cầu câu trả lời ngắn. Trả lời trực tiếp trong 1-3 ý, vẫn giữ đủ cảnh báo an toàn cần thiết.`
    : asksForDetailedAnswer
      ? `Học viên yêu cầu câu trả lời đầy đủ/chi tiết.
- Không áp dụng giới hạn số từ cố định và không rút gọn chỉ để giữ câu trả lời ngắn.
- Bao quát mọi dữ liệu liên quan hiện có trong ngữ cảnh. Với dữ liệu InBody, tách rõ: thành phần cơ thể, phân tích vùng/segmental, mục tiêu kiểm soát cân nặng, ý nghĩa với mục tiêu tập luyện và hành động đề xuất.
- Nêu rõ mục nào chưa có dữ liệu; không tự tạo số liệu. Dùng tiêu đề ngắn hoặc danh sách để nội dung dài vẫn dễ đọc.`
      : `Điều chỉnh độ dài theo độ phức tạp của câu hỏi. Trả lời đủ để giải quyết câu hỏi, không kéo dài bằng nội dung lặp và cũng không cắt bỏ thông tin cần thiết để tuân theo một giới hạn số từ cố định.`;

  return {
    messages: conversationMessages,
    hasVisibleAssistantMessage,
    continuationRules,
    responseGuidance,
  };
}

function stripLeadingGreeting(value: string) {
  return value.replace(
    /^\s*(?:[>*#-]+\s*)?(?:xin\s+)?chào(?:\s+(?:bạn|anh|chị|em|[\p{L}\p{N}._-]+))?[\s!,.-:;\---]*(?:[\p{Extended_Pictographic}\uFE0F]\s*)*/iu,
    '',
  );
}

/**
 * Prompt rules handle semantic repetition. This final guard removes only
 * deterministic problems: a repeated greeting and verbatim repeated blocks.
 */
export function normalizeCoachReply(reply: string, messages: CoachMessage[]) {
  const hasVisibleAssistantMessage = messages.some((message) => message.role === 'assistant');
  const withoutGreeting = hasVisibleAssistantMessage ? stripLeadingGreeting(reply) : reply;
  const previousBlocks = new Set(
    messages
      .filter((message) => message.role === 'assistant')
      .flatMap((message) => message.content.split(/\n\s*\n/))
      .map(normalizeBlock)
      .filter(Boolean),
  );
  const seenInReply = new Set<string>();
  const uniqueBlocks = withoutGreeting
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => {
      const normalized = normalizeBlock(block);
      if (!normalized || previousBlocks.has(normalized) || seenInReply.has(normalized)) return false;
      seenInReply.add(normalized);
      return true;
    });

  if (uniqueBlocks.length === 0 && withoutGreeting.trim()) {
    return 'Khuyến nghị trước vẫn giữ nguyên. Bạn hãy cho mình biết điều kiện nào đã thay đổi để mình điều chỉnh cụ thể.';
  }

  return uniqueBlocks.join('\n\n').trim();
}
