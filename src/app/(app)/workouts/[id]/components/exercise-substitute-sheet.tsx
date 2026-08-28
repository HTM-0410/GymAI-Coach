'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Dumbbell, Loader2, X } from 'lucide-react';

type Substitute = {
  exercise_id: string;
  exercise_slug: string;
  name: string;
  name_vi: string;
  difficulty: string | null;
  exercise_type: string | null;
  required_equipment: string[];
  reason: string;
  confidence: number;
};

export default function ExerciseSubstituteSheet({
  isOpen,
  workoutId,
  workoutExerciseId,
  currentName,
  onClose,
  onSwapped,
}: {
  isOpen: boolean;
  workoutId: string;
  workoutExerciseId: string;
  currentName: string;
  onClose: () => void;
  onSwapped: () => void;
}) {
  const [substitutes, setSubstitutes] = useState<Substitute[]>([]);
  const [loading, setLoading] = useState(false);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSubstitutes([]);
    fetch(`/api/workouts/${workoutId}/exercises/${workoutExerciseId}/substitutes`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.detail ?? body.error ?? 'Không thể tải bài thay thế');
        return body;
      })
      .then((body) => setSubstitutes(body.substitutes ?? []))
      .catch((requestError: Error) => {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [isOpen, workoutExerciseId, workoutId]);

  async function swapExercise(substitute: Substitute) {
    if (swappingId) return;
    setSwappingId(substitute.exercise_id);
    setError(null);
    try {
      const response = await fetch(`/api/workouts/${workoutId}/exercises/${workoutExerciseId}/substitutes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ exerciseId: substitute.exercise_id }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail ?? body.error ?? 'Không thể đổi bài tập');
      onSwapped();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể đổi bài tập');
    } finally {
      setSwappingId(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-black/10 bg-chassis-hi shadow-2xl dark:border-white/15 dark:bg-[#0f141d] sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-black/[0.06] px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-base font-extrabold text-ink">Máy đang bận? Đổi bài tương tự</h2>
            <p className="mt-1 text-xs text-ink-secondary">
              Thay <strong className="text-ink">{currentName}</strong> bằng bài cùng cơ chính, phù hợp thiết bị tại gym đã chọn.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng danh sách bài thay thế" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-black/5 hover:text-ink dark:hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-muted">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              Đang tìm bài phù hợp với phòng gym...
            </div>
          )}
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-3 text-xs text-red-600 dark:text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {!loading && !error && substitutes.length === 0 && (
            <div className="py-12 text-center">
              <p className="font-bold text-ink">Chưa có bài thay thế phù hợp</p>
              <p className="mt-1 text-xs text-ink-secondary">Gym hiện tại không có thiết bị tương thích cho bài cùng cơ chính.</p>
            </div>
          )}
          {substitutes.map((substitute) => (
            <button
              key={substitute.exercise_id}
              type="button"
              disabled={Boolean(swappingId)}
              onClick={() => swapExercise(substitute)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-black/[0.07] bg-chassis p-3.5 text-left transition hover:border-accent/40 hover:bg-accent/[0.04] disabled:opacity-60 dark:border-white/10"
            >
              <div className="min-w-0">
                <h3 className="truncate text-sm font-extrabold text-ink">{substitute.name_vi || substitute.name}</h3>
                <p className="mt-1 text-[11px] text-ink-secondary">{substitute.reason}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-bold text-accent">
                    Cùng cơ chính
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-black/[0.04] px-2 py-0.5 font-mono text-[10px] text-ink-secondary dark:bg-white/[0.06]">
                    <Dumbbell className="h-3 w-3" />
                    {substitute.required_equipment.length > 0 ? substitute.required_equipment.join(', ') : 'bodyweight'}
                  </span>
                </div>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-white">
                {swappingId === substitute.exercise_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </span>
            </button>
          ))}
        </div>

        <div className="border-t border-black/[0.06] p-4 dark:border-white/10">
          <button type="button" onClick={onClose} className="w-full rounded-xl border border-black/10 py-2.5 text-xs font-bold text-ink hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5">
            Tiếp tục bài hiện tại
          </button>
        </div>
      </div>
    </div>
  );
}
