import assert from 'node:assert/strict';
import test from 'node:test';
import {
  navigationReply,
  requestsSuggestedWorkoutHandoff,
  resolveCoachNavigationAction,
} from '../src/lib/ai/coach-actions';
import {
  parseCoachWorkoutHandoff,
  selectProgramDayForSuggestion,
  workoutHandoffPrompt,
} from '../src/lib/ai/coach-workout-handoff';

test('explicit workout navigation opens the AI workout page', () => {
  const action = resolveCoachNavigationAction('Chuyển sang trang tập luyện');
  assert.deepEqual(action, {
    type: 'navigate',
    href: '/workouts/new',
    label: 'Mở trang tập luyện AI',
  });
  assert.match(navigationReply(action!), /đang chuyển bạn/);
});

test('navigation supports Vietnamese variants and core app destinations', () => {
  assert.equal(resolveCoachNavigationAction('Mở toàn bộ thông tin InBody của tôi')?.href, '/profile/body-composition');
  assert.equal(resolveCoachNavigationAction('Đưa tôi đến thư viện bài tập')?.href, '/exercises');
  assert.equal(resolveCoachNavigationAction('Vào báo cáo tuần')?.href, '/weekly');
  assert.equal(resolveCoachNavigationAction('Mở lịch sử buổi tập')?.href, '/workouts');
});

test('informational questions and negated commands never trigger navigation', () => {
  assert.equal(resolveCoachNavigationAction('Trang tập luyện có những tính năng gì?'), null);
  assert.equal(resolveCoachNavigationAction('Tôi không muốn chuyển sang trang tập luyện'), null);
  assert.equal(resolveCoachNavigationAction('Chưa cần mở báo cáo tuần'), null);
  assert.equal(resolveCoachNavigationAction('Mở trang thanh toán bên ngoài'), null);
});

test('a contextual workout command requests carrying the previous AI suggestion', () => {
  assert.equal(requestsSuggestedWorkoutHandoff('Chuyển sang trang tập luyện với bài tập này'), true);
  assert.equal(requestsSuggestedWorkoutHandoff('Chuyển sang trang tập luyện với lịch tập mà AI gợi ý'), true);
  assert.equal(requestsSuggestedWorkoutHandoff('Mở trang tập luyện theo lịch vừa gợi ý'), true);
  assert.equal(requestsSuggestedWorkoutHandoff('Chuyển trang tập luyện với bài tập đã tạo của tôi'), true);
  assert.equal(requestsSuggestedWorkoutHandoff('Chuyển lịch tập này sang trang tập luyện để bắt đầu tập'), true);
  assert.equal(requestsSuggestedWorkoutHandoff('Mở trang tập luyện'), false);
  const action = {
    ...resolveCoachNavigationAction('Chuyển sang trang tập luyện với bài tập này')!,
    workoutHandoff: { suggestion: 'Kéo xô rộng tay trên máy và kéo cáp ngang.' },
  };
  assert.match(navigationReply(action), /tạo sẵn bản nháp/);
});

test('workout handoff selects the matching active program day and builds a bounded prompt', () => {
  const programs = [{
    id: 'active-program',
    training_program_days: [
      { id: 'push-day', name: 'Buổi 1 - Đẩy', training_day_targets: [] },
      { id: 'pull-day', name: 'Buổi 2 - Kéo', training_day_targets: [{ muscles: { slug: 'back', name_vi: 'Lưng' } }] },
    ],
  }];
  const suggestion = 'Kéo xô rộng tay trên máy và kéo cáp ngang để tập Lưng.';

  assert.deepEqual(selectProgramDayForSuggestion(suggestion, programs, 'active-program'), {
    programId: 'active-program',
    dayId: 'pull-day',
  });
  assert.equal(parseCoachWorkoutHandoff(JSON.stringify({ suggestion }))?.suggestion, suggestion);
  assert.equal(parseCoachWorkoutHandoff('{bad json'), null);
  const longPrompt = workoutHandoffPrompt('x'.repeat(5000));
  assert.ok(longPrompt.length <= 4000);
  assert.ok(longPrompt.length > 1000, 'handoff must retain a detailed Coach workout instead of clipping it at 1,000 characters');
});
