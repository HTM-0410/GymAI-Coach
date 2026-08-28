import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COACH_MAX_OUTPUT_TOKENS,
  normalizeCoachReply,
  prepareCoachConversation,
  type CoachMessage,
} from '../src/lib/ai/coach-conversation';
import { createGeminiApiError } from '../src/lib/ai/gemini';

const welcome: CoachMessage = {
  role: 'assistant',
  content: 'Xin chào! Tôi là AI Coach của GymAI. Bạn cần hỗ trợ gì hôm nay?',
};

test('UI welcome is not sent to Gemini as a leading model turn', () => {
  const prepared = prepareCoachConversation([
    welcome,
    { role: 'user', content: 'Tôi nên tập mấy buổi mỗi tuần?' },
  ]);

  assert.deepEqual(prepared.messages, [
    { role: 'user', content: 'Tôi nên tập mấy buổi mỗi tuần?' },
  ]);
  assert.equal(prepared.hasVisibleAssistantMessage, true);
  assert.match(prepared.continuationRules, /KHÔNG chào lại/);
});

test('follow-up history remains ordered after removing the UI welcome', () => {
  const prepared = prepareCoachConversation([
    welcome,
    { role: 'user', content: '8 buổi thì sao?' },
    { role: 'assistant', content: '8 buổi là quá tải; nên duy trì 4 buổi.' },
    { role: 'user', content: '6 buổi thì sao?' },
  ]);

  assert.deepEqual(prepared.messages.map((message) => message.role), [
    'user', 'assistant', 'user',
  ]);
  assert.match(prepared.continuationRules, /tập trung so sánh tác động/);
  assert.match(prepared.continuationRules, /Không kể lại toàn bộ câu trả lời trước/);
});

test('continuation reply removes a repeated greeting and verbatim repeated blocks', () => {
  const history: CoachMessage[] = [
    welcome,
    { role: 'user', content: '8 buổi thì sao?' },
    { role: 'assistant', content: 'Bạn nên duy trì 4 buổi mỗi tuần.' },
    { role: 'user', content: '6 buổi thì sao?' },
  ];
  const reply = normalizeCoachReply(
    'Chào HTM! 🔥 6 buổi có thể thực hiện nếu chia tải hợp lý.\n\nBạn nên duy trì 4 buổi mỗi tuần.\n\n6 buổi có thể thực hiện nếu chia tải hợp lý.',
    history,
  );

  assert.equal(reply, '6 buổi có thể thực hiện nếu chia tải hợp lý.');
  assert.doesNotMatch(reply, /^Chào/i);
});

test('first reply may keep one short greeting when no welcome was supplied', () => {
  const messages: CoachMessage[] = [{ role: 'user', content: 'Tôi nên bắt đầu thế nào?' }];
  const prepared = prepareCoachConversation(messages);

  assert.equal(prepared.hasVisibleAssistantMessage, false);
  assert.match(prepared.continuationRules, /Có thể chào tối đa một câu ngắn/);
  assert.equal(normalizeCoachReply('Chào bạn! Hãy bắt đầu với 3 buổi.', messages), 'Chào bạn! Hãy bắt đầu với 3 buổi.');
});

test('a fully repeated continuation becomes a short request for the changed condition', () => {
  const history: CoachMessage[] = [
    welcome,
    { role: 'user', content: '8 buổi thì sao?' },
    { role: 'assistant', content: 'Bạn nên duy trì 4 buổi mỗi tuần.' },
    { role: 'user', content: 'Còn trường hợp của tôi?' },
  ];

  assert.equal(
    normalizeCoachReply('Chào HTM! Bạn nên duy trì 4 buổi mỗi tuần.', history),
    'Khuyến nghị trước vẫn giữ nguyên. Bạn hãy cho mình biết điều kiện nào đã thay đổi để mình điều chỉnh cụ thể.',
  );
});

test('a request for all InBody information gets comprehensive response guidance', () => {
  const prepared = prepareCoachConversation([
    welcome,
    { role: 'user', content: 'Toàn bộ thông tin InBody của tôi' },
  ]);

  assert.match(prepared.responseGuidance, /Không áp dụng giới hạn số từ cố định/);
  assert.match(prepared.responseGuidance, /thành phần cơ thể/);
  assert.match(prepared.responseGuidance, /phân tích vùng\/segmental/);
  assert.match(prepared.responseGuidance, /Nêu rõ mục nào chưa có dữ liệu/);
});

test('explicit concise requests remain concise without imposing that limit on other turns', () => {
  const concise = prepareCoachConversation([
    { role: 'user', content: 'Tóm tắt ngắn gọn tiến độ của tôi' },
  ]);
  const normal = prepareCoachConversation([
    { role: 'user', content: 'Tôi nên thay đổi lịch tập thế nào?' },
  ]);

  assert.match(concise.responseGuidance, /1-3 ý/);
  assert.match(normal.responseGuidance, /không cắt bỏ thông tin cần thiết/);
  assert.equal(COACH_MAX_OUTPUT_TOKENS, 2048);
});

test('Gemini provider errors retain safe status and reason for server-side diagnosis', () => {
  const error = createGeminiApiError(400, JSON.stringify({
    error: {
      status: 'INVALID_ARGUMENT',
      message: 'Request contains an invalid argument.',
      details: [{ reason: 'API_KEY_INVALID' }],
    },
  }));

  assert.equal(error.status, 400);
  assert.equal(error.providerStatus, 'INVALID_ARGUMENT');
  assert.equal(error.providerReason, 'API_KEY_INVALID');
  assert.match(error.message, /Request contains an invalid argument/);
});

test('mobile and full-page coach clients disable cache and do not expose raw provider errors', async () => {
  const { readFile } = await import('node:fs/promises');
  const widget = await readFile(new URL('../src/components/floating-coach-widget.tsx', import.meta.url), 'utf8');
  const page = await readFile(new URL('../src/app/(app)/coach/chat-client.tsx', import.meta.url), 'utf8');
  const route = await readFile(new URL('../src/app/api/ai/coach/route.ts', import.meta.url), 'utf8');

  for (const source of [widget, page]) {
    assert.match(source, /cache: 'no-store'/);
    assert.doesNotMatch(source, /data\.detail/);
  }
  assert.match(route, /Cache-Control': 'no-store'/);
  assert.match(route, /requestId/);
  assert.match(route, /status: 502/);
});
