'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  Send,
  Loader2,
  Sparkles,
  X,
  Bot,
  RotateCcw,
  CheckCircle2,
  Dumbbell,
  Clock,
  Plus,
} from 'lucide-react';
import type { WorkoutCoachAction } from '@/lib/ai/coach-actions';
import type { LiveWorkoutContext } from '@/lib/ai/coach';

type Msg = {
  role: 'user' | 'assistant';
  content: string;
  actions?: WorkoutCoachAction[];
};

const COACH_AVATAR_SRC = '/images/landing/gym-ai-robot-head-logo.png';

type WorkoutAICoachSheetProps = {
  workoutContext: LiveWorkoutContext;
  onApplyWeight?: (weightKg: number) => void;
  onApplyReps?: (reps: number) => void;
  onAdjustRest?: (seconds: number) => void;
  onAddSet?: () => void;
  hasProactiveNotification?: boolean;
};

export default function WorkoutAICoachSheet({
  workoutContext,
  onApplyWeight,
  onApplyReps,
  onAdjustRest,
  onAddSet,
  hasProactiveNotification = false,
}: WorkoutAICoachSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content: `Chào bạn! Tôi đang theo dõi bài **${
        workoutContext.exerciseName || 'tập này'
      }**. Bạn đang cần gợi ý gì cho hiệp này?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [appliedActionKey, setAppliedActionKey] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  // Contextual quick actions based on workout state
  const quickActions = React.useMemo(() => {
    const actions: string[] = [];
    if (workoutContext.restRemaining && workoutContext.restRemaining > 0) {
      actions.push('Set sau nên tập thế nào?', 'Tôi thấy hiệp vừa rồi hơi nặng', 'Nên nghỉ bao lâu cho bài này?');
    } else if ((workoutContext.completedSets?.length ?? 0) === 0) {
      actions.push('Nên bắt đầu với mức tạ bao nhiêu?', 'Mẹo kỹ thuật quan trọng nhất của bài này?', 'Chiến thuật chia hiệp chuẩn khoa học?');
    } else {
      actions.push('Phân tích tiến độ các set vừa rồi', 'Tôi có nên tăng thêm tạ không?', 'Khi nào nên dừng để tránh quá tải?');
    }
    return actions;
  }, [workoutContext.restRemaining, workoutContext.completedSets]);

  async function handleSend(textToSend?: string) {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: Msg = { role: 'user', content: text.trim() };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: nextMsgs.slice(-8).map(({ role, content }) => ({ role, content })),
          workoutContext,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.reply,
            actions: data.actions as WorkoutCoachAction[] | undefined,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Lỗi kết nối AI: ${data.detail ?? data.error ?? 'vui lòng thử lại'}`,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Không thể gửi tin nhắn. Hãy kiểm tra kết nối mạng của bạn.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleExecuteAction(action: WorkoutCoachAction, key: string) {
    setAppliedActionKey(key);
    if (action.type === 'apply_weight' && onApplyWeight) {
      onApplyWeight(action.weightKg);
    } else if (action.type === 'apply_reps' && onApplyReps) {
      onApplyReps(action.reps);
    } else if (action.type === 'adjust_rest' && onAdjustRest) {
      onAdjustRest(action.restSeconds);
    } else if (action.type === 'add_set' && onAddSet) {
      onAddSet();
    }
  }

  return (
    <>
      {/* ── FLOATING ROBOT MASCOT BUTTON ── */}
      <div className="fixed bottom-6 right-4 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative h-13 w-13 rounded-2xl bg-gradient-to-tr from-accent to-[#ea580c] p-0.5 shadow-[0_8px_25px_rgba(249,115,22,0.45)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer group"
          title="Mở AI Gym Coach"
          aria-label="Mở AI Gym Coach"
        >
          <div className="h-full w-full rounded-[14px] bg-chassis-hi dark:bg-[#121824] flex items-center justify-center relative overflow-hidden">
            <Image
              src={COACH_AVATAR_SRC}
              alt="AI Coach"
              width={34}
              height={34}
              className="object-contain"
            />
          </div>

          {/* Proactive Notification Dot */}
          {hasProactiveNotification && (
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-accent border-2 border-chassis animate-ping" />
          )}
          {hasProactiveNotification && (
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-accent border-2 border-chassis" />
          )}
        </button>
      </div>

      {/* ── AI COACH BOTTOM SHEET ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg h-[75vh] max-h-[640px] flex flex-col rounded-t-3xl bg-chassis-hi dark:bg-[#0c121d] border border-black/10 dark:border-white/15 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250"
            role="dialog"
            aria-modal="true"
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.08] bg-chassis-lo/50">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-accent/15 flex items-center justify-center overflow-hidden shrink-0 border border-accent/30">
                  <Image
                    src={COACH_AVATAR_SRC}
                    alt="AI Coach"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-ink flex items-center gap-1.5 leading-none">
                    <span>GymAI Live Coach</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                      Trực tuyến
                    </span>
                  </h3>
                  <p className="text-[10px] font-mono text-ink-muted mt-0.5 truncate max-w-[240px]">
                    {workoutContext.exerciseName ? `Bài: ${workoutContext.exerciseName}` : 'Đang theo dõi buổi tập'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Actions Scroll Bar */}
            <div className="px-3 py-2 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] shrink-0 bg-chassis">
              {quickActions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(q)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-black/[0.04] dark:bg-white/[0.06] hover:bg-accent/15 hover:text-accent border border-black/5 dark:border-white/10 text-ink-secondary whitespace-nowrap transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 overscroll-contain">
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        isUser
                          ? 'bg-accent text-white font-medium rounded-br-xs shadow-xs'
                          : 'bg-black/[0.04] dark:bg-white/[0.06] text-ink border border-black/[0.04] dark:border-white/[0.08] rounded-bl-xs'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Actionable buttons if assistant provided them */}
                    {!isUser && msg.actions && msg.actions.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-2 pl-1">
                        {msg.actions.map((act, actIdx) => {
                          const key = `${idx}-${actIdx}`;
                          const isApplied = appliedActionKey === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleExecuteAction(act, key)}
                              disabled={isApplied}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-extrabold transition-all cursor-pointer ${
                                isApplied
                                  ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 opacity-80'
                                  : 'bg-accent text-white hover:brightness-110 shadow-xs active:scale-95'
                              }`}
                            >
                              {isApplied ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Đã áp dụng!</span>
                                </>
                              ) : (
                                <>
                                  {act.type === 'apply_weight' && <Dumbbell className="h-3.5 w-3.5" />}
                                  {act.type === 'adjust_rest' && <Clock className="h-3.5 w-3.5" />}
                                  {act.type === 'add_set' && <Plus className="h-3.5 w-3.5" />}
                                  <span>{act.label}</span>
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-ink-muted bg-black/[0.02] dark:bg-white/[0.02] p-2.5 rounded-xl w-fit">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                  <span>Coach đang tính toán phân tích...</span>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 border-t border-black/[0.06] dark:border-white/[0.08] bg-chassis flex items-center gap-2 shrink-0"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi AI Coach về bài tập, mức tạ..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/10 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="h-9 w-9 rounded-xl bg-accent text-white flex items-center justify-center shadow-xs hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
