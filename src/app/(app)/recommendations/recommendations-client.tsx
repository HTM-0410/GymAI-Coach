'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, ArrowDown, Minus, CheckCircle2, XCircle, Loader2, Brain } from 'lucide-react';

type Rec = {
  id: string; recommendation_type: string; target_type: string; target_id: string | null;
  current_value: any; suggested_value: any; reason: string; confidence: number; status: string;
  created_at: string;
};

export default function RecommendationsClient({ initialPending }: { initialPending: Rec[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(initialPending);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true); setGenError(null);
    try {
      const res = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'progression' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Lỗi');
      const newRecs: Rec[] = (data.recommendations ?? []).map((r: any) => ({
        id: `temp-${r.exercise_slug}`,
        recommendation_type: 'weight_progression',
        target_type: 'exercise',
        target_id: null,
        current_value: r.previous,
        suggested_value: { weight: r.suggested_weight, verdict: r.verdict.outcome, delta: r.verdict.weight_delta },
        reason: r.ai_explanation,
        confidence: r.verdict.confidence,
        status: 'pending',
        created_at: new Date().toISOString(),
      }));
      setPending((prev) => [...newRecs, ...prev]);
      router.refresh();
    } catch (e: any) {
      setGenError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function review(id: string, decision: 'accepted' | 'rejected') {
    if (id.startsWith('temp-')) { setPending((p) => p.filter((r) => r.id !== id)); return; }
    const res = await fetch('/api/ai/review', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recommendationId: id, decision }),
    });
    if (res.ok) { setPending((p) => p.filter((r) => r.id !== id)); router.refresh(); }
  }

  return (
    <div>
      {/* Header panel */}
      <div className="card shadow-neumorph rounded-xl p-5 mb-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-5 w-5 text-accent" strokeWidth={1.5} />
              <h2 className="font-bold text-ink">Phân tích tiến bộ</h2>
            </div>
            <p className="text-sm text-ink-secondary mt-1 leading-relaxed">
              AI xem lịch sử + rule engine + Gemini để đề xuất tăng/giảm tạ.
            </p>
          </div>
          <button onClick={generate} disabled={generating} className="btn-primary inline-flex items-center gap-2 shrink-0">
            {generating ? <><Loader2 className="h-4 w-4 animate-spin" />Đang phân tích…</> : <><Brain className="h-4 w-4" />Tạo đề xuất</>}
          </button>
        </div>
        {genError && (
          <div className="mt-3 bg-chassis shadow-inset-sm rounded-md px-4 py-2">
            <p className="font-mono text-xs text-danger font-bold uppercase tracking-wider">ERR: {genError}</p>
          </div>
        )}
      </div>

      {pending.length === 0 ? (
        <div className="card shadow-neumorph-lg rounded-2xl p-10 text-center">
          <span className="h-3 w-3 rounded-full bg-accent shadow-[0_0_8px_rgba(249,115,22,0.5)] led-pulse mx-auto mb-3 block" />
          <p className="font-mono text-sm text-ink-muted uppercase tracking-wider">Chưa có đề xuất pending.</p>
        </div>
      ) : (
        <section className="space-y-4">
          {pending.map((r) => (
            <RecommendationCard key={r.id} rec={r} onAccept={() => review(r.id, 'accepted')} onReject={() => review(r.id, 'rejected')} />
          ))}
        </section>
      )}
    </div>
  );
}

function RecommendationCard({ rec, onAccept, onReject }: { rec: Rec; onAccept: () => void; onReject: () => void }) {
  const delta = rec.suggested_value?.delta ?? 0;
  const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const color = delta > 0 ? 'text-success' : delta < 0 ? 'text-warn' : 'text-ink-muted';

  return (
    <div className="card shadow-neumorph rounded-xl p-5">
      <div className="flex items-start gap-4">
        {/* Direction indicator */}
        <div className={`shrink-0 h-11 w-11 rounded-xl bg-chassis shadow-neumorph-sm flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">
            {rec.recommendation_type.replace('_', ' ')}
          </div>
          <p className="text-sm text-ink leading-relaxed mb-2">{rec.reason}</p>
          {rec.suggested_value?.weight != null && (
            <div className="bg-chassis shadow-inset-sm rounded-lg px-3 py-2 mb-2">
              <div className="flex items-center gap-3 font-mono text-sm">
                <span className="text-ink-muted">{rec.current_value?.previous?.weight ?? '?'}kg</span>
                <span className="text-ink-muted">→</span>
                <span className="font-extrabold text-accent">{rec.suggested_value.weight}kg</span>
                {rec.suggested_value?.verdict && (
                  <span className={`chip text-[10px] ml-auto ${rec.suggested_value.verdict === 'progressive_overload' ? 'active' : ''}`}>
                    {rec.suggested_value.verdict}
                  </span>
                )}
              </div>
            </div>
          )}
          <div className="font-mono text-[10px] text-ink-muted uppercase tracking-wider">
            Confidence: {(rec.confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>
      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-chassis-lo">
        <button onClick={onReject} className="btn-ghost inline-flex items-center justify-center gap-2 text-sm">
          <XCircle className="h-4 w-4" strokeWidth={1.5} /> Bỏ qua
        </button>
        <button onClick={onAccept} className="btn-primary inline-flex items-center justify-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} /> Chấp nhận
        </button>
      </div>
    </div>
  );
}
