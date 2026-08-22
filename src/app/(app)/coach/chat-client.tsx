'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, Bot, Zap, ArrowUpRight } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };

const promptSuggestions = [
  'Làm sao để vượt ngưỡng (plateau) Bench Press?',
  'Khi nào thì tôi cần một tuần Deload?',
  'Hướng dẫn sửa form Deadlift tránh đau lưng',
  'Cách phân chia Volume nhóm cơ lưng hợp lý',
];

export default function ChatClient() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Xin chào! Tôi là Trí tuệ Huấn luyện GymAI. Tôi có thể phân tích form tập, tối ưu volume, chiến lược deload, hay giải quyết tình trạng chững tạ của bạn. Bạn muốn bắt đầu từ đâu?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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
        setMessages((m) => [...m, { role: 'assistant', content: `Lỗi: ${data.detail ?? data.error ?? 'không rõ'}` }]);
      }
    } finally {
      setLoading(false);
    }
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    handleSend();
  }

  return (
    <div className="card shadow-neumorph rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col flex-1 min-h-0 border border-white/80 dark:border-white/10 h-full w-full">
      {/* ── COMPACT CHAT STATUS BAR ── */}
      <div className="px-4 py-2.5 border-b border-black/[0.05] dark:border-white/[0.08] bg-black/[0.015] dark:bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success ring-2 ring-success/30 led-pulse shrink-0" />
          <span className="text-xs font-bold text-ink">Huấn luyện viên trực tuyến</span>
        </div>

        <div>
          {messages.length > 1 && (
            <button
              type="button"
              onClick={() =>
                setMessages([
                  {
                    role: 'assistant',
                    content:
                      'Xin chào! Tôi là Trí tuệ Huấn luyện GymAI. Tôi có thể phân tích form tập, tối ưu volume, chiến lược deload, hay giải quyết tình trạng chững tạ của bạn. Bạn muốn bắt đầu từ đâu?',
                  },
                ])
              }
              className="text-[10px] font-mono text-ink-muted hover:text-accent px-2 py-1 rounded-md bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.08] transition-colors cursor-pointer"
              title="Xóa đoạn chat và bắt đầu lại"
            >
              Làm mới
            </button>
          )}
        </div>
      </div>

      {/* ── MESSAGE LIST ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}>
            <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-gradient-to-r from-accent to-accent-dim text-white shadow-accent font-medium'
                : 'bg-chassis shadow-inset text-ink border border-white/60 dark:border-white/5 relative'
            }`}>
              {m.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-black/[0.04] dark:border-white/[0.06]">
                  <Sparkles className="h-3 w-3 text-accent" strokeWidth={1.5} />
                  <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted font-bold">AI Coach Response</span>
                </div>
              )}
              <FormattedMessageContent content={m.content} isUser={m.role === 'user'} />
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-in fade-in duration-200">
            <div className="bg-chassis shadow-inset-sm border border-white/60 dark:border-white/5 rounded-2xl px-4 py-3 text-sm text-ink-secondary inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" strokeWidth={1.5} />
              <span className="font-mono text-xs uppercase tracking-wider font-semibold">AI đang phân tích chiến thuật…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* ── PROMPT SUGGESTION CHIPS ── */}
      {messages.length < 3 && (
        <div className="px-4 py-2 border-t border-black/[0.04] dark:border-white/[0.04] bg-black/[0.01] dark:bg-white/[0.01] flex items-center gap-2 overflow-x-auto">
          {promptSuggestions.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(prompt)}
              className="shrink-0 text-[11px] font-medium text-ink-secondary hover:text-accent bg-chassis border border-black/[0.06] dark:border-white/[0.08] hover:border-accent/40 rounded-lg px-2.5 py-1.5 transition-all flex items-center gap-1 group shadow-neumorph-sm"
            >
              <span>{prompt}</span>
              <ArrowUpRight className="h-3 w-3 text-ink-muted group-hover:text-accent transition-colors" />
            </button>
          ))}
        </div>
      )}

      {/* ── INPUT BAR ── */}
      <form onSubmit={send} className="border-t border-black/[0.06] dark:border-white/[0.08] p-3.5 sm:p-4 flex gap-2.5 bg-chassis-hi">
        <input
          className="input flex-1 h-10 px-3.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] text-xs sm:text-sm font-sans"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Hỏi AI Coach về form, volume, lịch tập..."
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn-primary h-10 px-4 rounded-xl shrink-0"
        >
          <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </form>
    </div>
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
    <div className="space-y-1.5 leading-relaxed text-sm">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} className="h-1.5" />;
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

