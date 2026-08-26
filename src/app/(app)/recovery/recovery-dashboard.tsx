'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ChevronRight,
  Clock3,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import MuscleBody, { type MuscleName } from '@/components/ui/MuscleBody';
import MuscleGroupInfoDialog from '@/components/recovery/muscle-group-info-dialog';
import { BODY_MUSCLE_GROUP_LABELS, type BodyMuscleGroup } from '@/lib/recovery/muscle-groups';
import type { MuscleReadinessGroup, RecoveryStatus } from '@/lib/recovery/read-model';
import {
  daysSinceCompletedWorkout,
  selectFreshRecoveryGroups,
} from '@/lib/recovery/ui-selectors';

type SummaryResponse = {
  modelVersion: string;
  generatedAt: string;
  lastCompletedWorkoutAt: string | null;
  groups: MuscleReadinessGroup[];
};

type VisibleRecoveryStatus = Exclude<RecoveryStatus, 'unknown'>;

const VISIBLE_RECOVERY_STATUSES: readonly VisibleRecoveryStatus[] = [
  'recovering',
  'light_only',
  'trainable',
  'ready',
];

const STATUS_COPY: Record<VisibleRecoveryStatus, { label: string; color: string; surface: string }> = {
  recovering: { label: 'Đang phục hồi', color: 'text-[var(--recovery-recovering)]', surface: 'bg-[var(--recovery-recovering)]' },
  light_only: { label: 'Chỉ nên tập nhẹ', color: 'text-[var(--recovery-light-only)]', surface: 'bg-[var(--recovery-light-only)]' },
  trainable: { label: 'Có thể tập', color: 'text-[var(--recovery-trainable)]', surface: 'bg-[var(--recovery-trainable)]' },
  ready: { label: 'Sẵn sàng', color: 'text-[var(--recovery-ready)]', surface: 'bg-[var(--recovery-ready)]' },
};

const MUSCLE_LABELS = BODY_MUSCLE_GROUP_LABELS as Partial<Record<MuscleName, string>>;

function LoadingState() {
  return (
    <div role="status" aria-live="polite" className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="h-32 animate-pulse rounded-2xl bg-black/5 motion-reduce:animate-none dark:bg-white/5" />
        <div className="h-32 animate-pulse rounded-2xl bg-black/5 motion-reduce:animate-none dark:bg-white/5" />
      </div>
      <div className="h-12 animate-pulse rounded-xl bg-black/5 motion-reduce:animate-none dark:bg-white/5" />
      <div className="mx-auto h-[430px] max-w-[280px] animate-pulse rounded-[2rem] bg-black/5 motion-reduce:animate-none dark:bg-white/5 sm:h-[520px]" />
      <span className="sr-only">Đang tải mức phục hồi cơ bắp</span>
    </div>
  );
}

type KpiCardProps = {
  value: number | null;
  label: string;
  description: string;
};

function RecoveryKpiCard({ value, label, description }: KpiCardProps) {
  return (
    <div className="card flex min-h-0 min-w-0 flex-col items-center justify-center rounded-xl border border-white/80 px-2 py-2 text-center shadow-neumorph-sm dark:border-white/10 sm:min-h-36 sm:rounded-2xl sm:px-5 sm:py-4">
      <span className="font-mono text-2xl font-extrabold tabular-nums text-ink sm:text-5xl">
        {value === null ? '--' : value}
      </span>
      <span className="mt-0.5 text-[10px] font-extrabold uppercase leading-tight tracking-wide text-ink sm:mt-2 sm:text-sm">
        {label}
      </span>
      <span className="sr-only">{description}</span>
    </div>
  );
}

export default function RecoveryDashboard() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [view, setView] = useState<'front' | 'back'>('front');
  const [selectedGroup, setSelectedGroup] = useState<BodyMuscleGroup | null>(null);
  const groupDialogTriggerRef = useRef<HTMLElement | SVGElement | null>(null);
  const tabRefs = useRef<Record<'front' | 'back', HTMLButtonElement | null>>({
    front: null,
    back: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch('/api/recovery', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('recovery_read_failed');
        return response.json() as Promise<SummaryResponse>;
      })
      .then(setSummary)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(true);
      });
    return () => controller.abort();
  }, [retryKey]);

  const readinessScores = useMemo(() => Object.fromEntries(
    (summary?.groups ?? []).map((group) => [group.group, group.readiness]),
  ) as Partial<Record<MuscleName, number | null>>, [summary]);
  const hasStaleData = summary?.groups.some((group) => group.stale) ?? false;
  const freshGroups = useMemo(
    () => selectFreshRecoveryGroups(summary?.groups ?? []),
    [summary],
  );
  const daysSinceWorkout = daysSinceCompletedWorkout(
    summary?.lastCompletedWorkoutAt ?? null,
    summary?.generatedAt ?? new Date(),
  );

  function selectView(nextView: 'front' | 'back', moveFocus = false) {
    setView(nextView);
    if (moveFocus) tabRefs.current[nextView]?.focus();
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-chassis blueprint-grid">
      <div className="mx-auto w-full max-w-4xl px-3 pb-24 pt-3 sm:px-6 sm:pb-28 sm:pt-8">
        <header className="mb-3 sm:mb-6">
          <div className="mb-1 flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-accent sm:mb-2 sm:text-[10px]">
            <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Muscle Readiness V1
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-4xl">Phục hồi cơ bắp</h1>
          <p className="mt-1 text-xs leading-normal text-ink-secondary sm:mt-2 sm:max-w-2xl sm:text-sm sm:leading-relaxed">
            Ước tính từ nhật ký tập và thời gian nghỉ. Đau hoặc khó chịu thực tế luôn được ưu tiên hơn điểm số.
          </p>
        </header>

        {error ? (
          <section role="alert" className="card rounded-2xl border border-red-500/25 p-6 text-center shadow-neumorph-sm">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
            <h2 className="mt-3 font-bold text-ink">Không tải được dữ liệu phục hồi</h2>
            <p className="mt-1 text-sm text-ink-secondary">Kiểm tra kết nối rồi thử tải lại.</p>
            <button type="button" onClick={() => setRetryKey((value) => value + 1)} className="btn-primary mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm">
              <RefreshCw className="h-4 w-4" /> Thử lại
            </button>
          </section>
        ) : !summary ? <LoadingState /> : (
          <div className="space-y-3 sm:space-y-5">
            {hasStaleData && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-ink-secondary" role="status">
                Một số dữ liệu dùng mô hình cũ và không được tính vào nhóm cơ tươi mới hoặc nhóm có thể tập.
              </div>
            )}

            <section aria-label="Tóm tắt phục hồi" className="grid grid-cols-2 gap-2 sm:gap-4">
              <RecoveryKpiCard
                value={daysSinceWorkout}
                label="Ngày từ buổi tập cuối"
                description={daysSinceWorkout === null
                  ? 'Chưa có buổi tập hoàn thành'
                  : `${daysSinceWorkout} ngày từ buổi tập hoàn thành gần nhất`}
              />
              <Link
                href="/recovery/groups"
                className="group block min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-chassis sm:rounded-2xl"
                aria-label={`${freshGroups.length} nhóm cơ tươi mới. Xem tất cả nhóm cơ và độ phục hồi`}
              >
                <div className="relative">
                  <RecoveryKpiCard
                    value={freshGroups.length}
                    label="Nhóm cơ tươi mới"
                    description={`${freshGroups.length} nhóm đạt từ 90 phần trăm và có dữ liệu hiện hành`}
                  />
                  <ChevronRight className="absolute right-2 top-2 h-3.5 w-3.5 text-ink-muted transition-transform group-hover:translate-x-0.5 sm:right-3 sm:top-3 sm:h-4 sm:w-4" aria-hidden="true" />
                </div>
              </Link>
            </section>

            <section className="card rounded-2xl border border-white/80 p-2.5 shadow-neumorph-sm dark:border-white/10 sm:p-5">
              <div className="grid grid-cols-2 rounded-lg bg-black/5 p-0.5 dark:bg-white/5 sm:rounded-xl sm:p-1" role="tablist" aria-label="Mặt cơ thể">
                {(['front', 'back'] as const).map((item) => {
                  const selected = view === item;
                  return (
                    <button
                      key={item}
                      ref={(node) => { tabRefs.current[item] = node; }}
                      id={`recovery-${item}-tab`}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls="recovery-body-panel"
                      tabIndex={selected ? 0 : -1}
                      onClick={() => selectView(item)}
                      onKeyDown={(event) => {
                        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                        event.preventDefault();
                        selectView(item === 'front' ? 'back' : 'front', true);
                      }}
                      className={`min-h-9 rounded-md px-2 py-1 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:min-h-11 sm:rounded-lg sm:py-2 sm:text-sm ${selected ? 'bg-chassis-hi text-ink shadow-neumorph-sm' : 'text-ink-muted'}`}
                    >
                      {item === 'front' ? 'Mặt trước' : 'Mặt sau'}
                    </button>
                  );
                })}
              </div>
              <div
                id="recovery-body-panel"
                role="tabpanel"
                aria-labelledby={`recovery-${view}-tab`}
                className="mx-auto my-1 flex h-[46vh] max-h-[380px] min-h-[250px] w-full max-w-[190px] items-center justify-center sm:my-2 sm:h-auto sm:max-h-none sm:max-w-[225px]"
              >
                <MuscleBody
                  type={view}
                  interactive
                  readinessScores={readinessScores}
                  onSelectMuscle={(muscle, trigger) => {
                    groupDialogTriggerRef.current = trigger ?? null;
                    setSelectedGroup(muscle as BodyMuscleGroup);
                  }}
                  muscleLabels={MUSCLE_LABELS}
                  className="max-h-full w-auto"
                />
              </div>
              <p className="text-center text-[11px] text-ink-muted sm:text-xs">Chọn một vùng cơ để xem thông tin chi tiết.</p>
            </section>

            <section aria-labelledby="recovery-legend-title">
              <h2 id="recovery-legend-title" className="text-xs font-extrabold text-ink sm:text-sm">Chú thích mức phục hồi</h2>
              <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:mt-3 sm:grid-cols-4 sm:gap-2">
                {VISIBLE_RECOVERY_STATUSES.map((status) => {
                  const copy = STATUS_COPY[status];
                  return (
                  <li key={status} className="flex min-w-0 items-center gap-1.5 rounded-lg border border-black/5 bg-chassis-hi/70 px-2 py-1 text-[11px] font-semibold text-ink-secondary dark:border-white/10 sm:gap-2 sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs">
                    <span className={`h-2 w-2 shrink-0 rounded-full sm:h-2.5 sm:w-2.5 ${copy.surface}`} aria-hidden="true" />
                    <span className="truncate">{copy.label}</span>
                  </li>
                  );
                })}
              </ul>
            </section>

            <p className="flex items-start gap-2 rounded-xl border border-black/5 px-3 py-2 text-[11px] leading-relaxed text-ink-muted dark:border-white/10 sm:text-xs">
              <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Điểm phục hồi là ước tính hỗ trợ lập kế hoạch, không phải chẩn đoán y khoa.
            </p>
          </div>
        )}
      </div>

      <MuscleGroupInfoDialog
        group={selectedGroup}
        returnFocusRef={groupDialogTriggerRef}
        onOpenChange={(open) => {
          if (!open) setSelectedGroup(null);
        }}
      />

    </main>
  );
}

