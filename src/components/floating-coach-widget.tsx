'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  Send,
  Loader2,
  Sparkles,
  X,
  RotateCcw,
  ArrowUpRight,
} from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };

const promptSuggestions = [
  'Làm sao để vượt ngưỡng (plateau) Bench Press?',
  'Khi nào thì tôi cần một tuần Deload?',
  'Thực đơn tăng cơ 1 ngày cho gymer',
  'Hướng dẫn sửa form Deadlift tránh đau lưng',
];

export default function FloatingCoachWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'Xin chào! Tôi là AI Coach của GymAI. Tôi có thể giải đáp về kỹ thuật form bài tập, tính toán volume, chiến lược deload, dinh dưỡng hay vượt ngưỡng chững tạ. Bạn cần hỗ trợ gì hôm nay?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTeaser, setShowTeaser] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  async function handleSend(textToSend?: string) {
    const text = textToSend || input;
    if (!text.trim() || loading) return;
    const next: Msg[] = [...messages, { role: 'user', content: text.trim() }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(-10) }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: `Lỗi: ${data.detail ?? data.error ?? 'không rõ'}` },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Không thể kết nối đến máy chủ AI. Vui lòng thử lại sau.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setMessages([
      {
        role: 'assistant',
        content:
          'Xin chào! Tôi là AI Coach của GymAI. Tôi có thể giải đáp về kỹ thuật form bài tập, tính toán volume, chiến lược deload, dinh dưỡng hay vượt ngưỡng chững tạ. Bạn cần hỗ trợ gì hôm nay?',
      },
    ]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSend();
  }

  useEffect(() => {
    function handleOpenEvent() {
      setIsOpen(true);
    }
    window.addEventListener('open-ai-coach', handleOpenEvent);
    return () => window.removeEventListener('open-ai-coach', handleOpenEvent);
  }, []);

  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleScroll() {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 700);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  return (
    <>
      {/* ── FLOATING MASCOT BUTTON (Bottom Right Thumb Zone) ── */}
      <div className="fixed right-4 bottom-24 sm:right-6 sm:bottom-6 z-50 flex items-center gap-2">
        {/* Optional Teaser Bubble on Desktop (auto-hides after click) */}
        {!isOpen && showTeaser && (
          <div className="hidden md:flex items-center gap-2 bg-chassis-hi dark:bg-[#0f141d] text-ink text-xs font-semibold px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/15 shadow-neumorph-sm animate-in fade-in slide-in-from-right-3 duration-300">
            <span className="h-2 w-2 rounded-full bg-accent led-pulse" />
            <span>Hỏi AI Coach</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowTeaser(false);
              }}
              className="text-ink-muted hover:text-ink ml-1 text-[10px] cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Mascot Muscular Robot FAB (Smart Scroll-Aware & Thumb Optimized) */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setShowTeaser(false);
          }}
          className={`group relative h-12 w-12 sm:h-14 sm:w-14 rounded-full p-0.5 transition-all duration-300 transform active:scale-95 cursor-pointer select-none ${
            isScrolling && !isOpen
              ? 'opacity-40 scale-90 translate-x-1 hover:opacity-100 hover:scale-100 hover:translate-x-0'
              : 'opacity-100 scale-100 translate-x-0'
          } ${
            isOpen
              ? 'ring-2 ring-accent shadow-[0_0_24px_rgba(249,115,22,0.7)] scale-105'
              : 'ring-2 ring-accent/70 shadow-[0_0_16px_rgba(249,115,22,0.4)] hover:scale-108 hover:ring-accent hover:shadow-[0_0_24px_rgba(249,115,22,0.6)]'
          }`}
          aria-label={isOpen ? 'Đóng AI Coach' : 'Mở AI Coach'}
        >
          {/* Circular Muscular Robot Avatar */}
          <div className="relative w-full h-full rounded-full overflow-hidden bg-black/60 border border-accent/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/ai-coach-avatar.jpg"
              alt="GymAI Muscular Coach Robot"
              className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-300"
            />

            {/* Glowing Visor Ambient Accent */}
            <div className="absolute inset-0 bg-gradient-to-t from-accent/25 via-transparent to-transparent opacity-70 pointer-events-none" />
          </div>

          {/* Green Online Status Beacon */}
          <span className="absolute top-0 right-0 h-3.5 w-3.5 rounded-full bg-success ring-2 ring-chassis dark:ring-[#0c1017] shadow-[0_0_8px_rgba(34,197,94,0.9)] led-pulse" />
        </button>
      </div>

      {/* ── POPUP CHAT WINDOW ── */}
      {isOpen && (
        <>
          {/* Mobile Backdrop overlay to close when clicking outside on small screens */}
          <div
            className="sm:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />

          <div
            className="fixed z-50 animate-in fade-in zoom-in-95 duration-200
                       inset-x-3 top-16 bottom-24
                       sm:inset-auto sm:right-6 sm:bottom-24 sm:w-[410px] sm:h-[580px]
                       bg-chassis-hi/95 dark:bg-[#0c1017]/95 backdrop-blur-2xl
                       border border-black/[0.08] dark:border-white/15
                       rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* ── POPUP HEADER ── */}
            <div className="px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative h-8 w-8 rounded-xl overflow-hidden border border-accent/40 shadow-xs bg-black shrink-0">
                  <Image
                    src="/images/ai-coach-avatar.jpg"
                    alt="AI Coach"
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 leading-tight">
                    <span className="text-xs font-extrabold text-ink">GymAI Coach</span>
                    <span className="text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-accent/15 text-accent border border-accent/30">
                      PRO
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success led-pulse" />
                    <span className="text-[9px] font-mono text-ink-muted">Trực tuyến · Sẵn sàng</span>
                  </div>
                </div>
              </div>

              {/* Header Action Tools */}
              <div className="flex items-center gap-1">
                {messages.length > 1 && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="h-7 px-2 rounded-lg text-ink-muted hover:text-accent hover:bg-black/5 dark:hover:bg-white/5 text-[10px] font-mono font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Bắt đầu lại đoạn chat mới"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Làm mới</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 rounded-lg text-ink-muted hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Đóng khung chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── POPUP MESSAGE LIST ── */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 custom-scrollbar">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  } animate-in fade-in duration-200`}
                >
                  <div
                    className={`max-w-[88%] sm:max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-gradient-to-r from-accent to-accent-dim text-white shadow-accent font-medium rounded-br-xs'
                        : 'bg-chassis shadow-inset text-ink border border-black/[0.04] dark:border-white/5 rounded-bl-xs relative'
                    }`}
                  >
                    {m.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-black/[0.04] dark:border-white/[0.06]">
                        <Sparkles className="h-3 w-3 text-accent" strokeWidth={1.5} />
                        <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted font-bold">
                          AI Coach
                        </span>
                      </div>
                    )}
                    <FormattedMessageContent content={m.content} isUser={m.role === 'user'} />
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start animate-in fade-in duration-200">
                  <div className="bg-chassis shadow-inset-sm border border-black/[0.04] dark:border-white/5 rounded-2xl px-3.5 py-2.5 text-xs text-ink-secondary inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" strokeWidth={1.5} />
                    <span className="font-mono text-xs uppercase tracking-wider font-semibold">
                      AI đang suy nghĩ…
                    </span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* ── PROMPT SUGGESTIONS (Compact horizontal scroll) ── */}
            {messages.length < 3 && (
              <div className="px-3 py-1.5 border-t border-black/[0.04] dark:border-white/[0.04] bg-black/[0.01] dark:bg-white/[0.01] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {promptSuggestions.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="shrink-0 text-[10px] font-medium text-ink-secondary hover:text-accent bg-chassis border border-black/[0.06] dark:border-white/[0.08] hover:border-accent/40 rounded-lg px-2 py-1 transition-all flex items-center gap-1 group shadow-xs cursor-pointer"
                  >
                    <span>{prompt}</span>
                    <ArrowUpRight className="h-2.5 w-2.5 text-ink-muted group-hover:text-accent" />
                  </button>
                ))}
              </div>
            )}

            {/* ── INPUT FORM BAR ── */}
            <form
              onSubmit={handleSubmit}
              className="border-t border-black/[0.06] dark:border-white/[0.08] p-2.5 sm:p-3 flex gap-2 bg-chassis-hi/80 shrink-0"
            >
              <input
                ref={inputRef}
                className="input flex-1 h-9 px-3 rounded-xl border border-black/[0.06] dark:border-white/[0.08] text-xs font-sans placeholder:text-ink-muted"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi AI Coach về form, volume, lịch tập..."
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="btn-primary h-9 px-3.5 rounded-xl shrink-0 cursor-pointer"
                aria-label="Gửi tin nhắn"
              >
                <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}

function FormattedMessageContent({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  // Pre-process common AI raw artifacts and English phrases
  const cleaned = content
    .replace(/\*\*Actionable advice:\*\*/gi, '🎯 **Gợi ý hành động:**')
    .replace(/Actionable advice:/gi, '🎯 **Gợi ý hành động:**')
    .replace(/\*\*Key takeaways:\*\*/gi, '📌 **Ghi nhớ chính:**')
    .replace(/\(muscle_gain\)/gi, '(Tăng cơ)')
    .replace(/\(fat_loss\)/gi, '(Giảm mỡ)')
    .replace(/\(strength\)/gi, '(Tăng sức mạnh)');

  const lines = cleaned.split('\n');

  return (
    <div className="space-y-1 leading-relaxed text-xs sm:text-sm">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} className="h-1" />;
        }

        // Parse **bold** parts
        const parts = line.split(/(\*\*.*?\*\*)/g);

        return (
          <p key={lineIdx} className="leading-relaxed">
            {parts.map((part, partIdx) => {
              if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                return (
                  <strong key={partIdx} className="font-extrabold text-ink dark:text-white">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              // Clean any standalone unmatched **
              const cleanPart = part.replace(/\*\*/g, '');
              return <span key={partIdx}>{cleanPart}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}
