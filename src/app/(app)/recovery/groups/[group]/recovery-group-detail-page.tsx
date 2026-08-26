'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock3,
  Info,
  RefreshCw,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import MuscleGroupThumbnail from '@/components/recovery/muscle-group-thumbnail';
import {
  dedupeRecoveryActivities,
  recoveryActivityExerciseName,
  type RecoveryActivityReadRow,
} from '@/lib/recovery/activity';
import {
  formatRecoveryProjection,
  recoveryConfidenceLabel,
} from '@/lib/recovery/group-detail-view';
import { formatActivityRecency, recoveryGroupStatusPresentation } from '@/lib/recovery/group-list-view';
import {
  type BodyMuscleGroup,
} from '@/lib/recovery/muscle-groups';
import type { MuscleReadinessGroup } from '@/lib/recovery/read-model';
import {
  RECOVERY_GROUP_UI_ITEMS,
  getRecoveryGroupUiMetadata,
} from '@/lib/recovery/ui-metadata';

type RecoveryGroupDetailResponse = {
  modelVersion: string;
  generatedAt: string;
  group: MuscleReadinessGroup;
  recentLoads: RecoveryActivityReadRow[];
  historyWindowDays: number;
};

type Props = {
  group: BodyMuscleGroup;
};

function DetailLoadingState() {
  return (
    <div className="space-y-5" role="status" aria-label="Đang tải chi tiết phục hồi">
      <div className="flex items-center gap-4 rounded-2xl border border-black/[0.06] bg-chassis-hi p-4 dark:border-white/10">
        <div className="h-24 w-24 shrink-0 animate-pulse rounded-2xl bg-black/10 motion-reduce:animate-none dark:bg-white/10" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-6 w-36 animate-pulse rounded bg-black/10 motion-reduce:animate-none dark:bg-white/10" />
          <div className="h-4 w-24 animate-pulse rounded bg-black/10 motion-reduce:animate-none dark:bg-white/10" />
        </div>
      </div>
      <div className="h-32 animate-pulse rounded-2xl bg-black/10 motion-reduce:animate-none dark:bg-white/10" />
      <div className="h-40 animate-pulse rounded-2xl bg-black/10 motion-reduce:animate-none dark:bg-white/10" />
      <span className="sr-only">Đang tải chi tiết phục hồi</span>
    </div>
  );
}

export default function RecoveryGroupDetailPage({ group }: Props) {
  const router = useRouter();
  const metadata = getRecoveryGroupUiMetadata(group);
  const [detail, setDetail] = useState<RecoveryGroupDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    setDetail(null);
    setLoading(true);
    setError(false);
    fetch(`/api/recovery/${encodeURIComponent(group)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('recovery_detail_failed');
        return response.json() as Promise<RecoveryGroupDetailResponse>;
      })
      .then((responseDetail) => {
        if (requestIdRef.current !== requestId || responseDetail.group.group !== group) return;
        setDetail(responseDetail);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted || requestIdRef.current !== requestId) return;
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted && requestIdRef.current === requestId) setLoading(false);
      });
    return () => controller.abort();
  }, [group, retryKey]);

  const recentLoads = useMemo(
    () => dedupeRecoveryActivities(detail?.recentLoads ?? []),
    [detail],
  );
  const detailIsCurrent = detail?.group.group === group;
  const status = detailIsCurrent ? recoveryGroupStatusPresentation(detail.group) : null;
  const score = !detailIsCurrent || detail.group.readiness === null || detail.group.stale
    ? '--'
    : `${detail.group.readiness}%`;

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push('/recovery/groups');
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-chassis pb-28 text-ink md:pb-10">
      <div className="mx-auto w-full max-w-3xl px-3 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        <header className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-black/10 bg-chassis-hi text-ink-secondary shadow-neumorph-sm transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:border-white/10"
            aria-label="Quay lại trang trước"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Chi tiết phục hồi</p>
            <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">{metadata.label}</h1>
          </div>
        </header>
      </div>

      <nav
        aria-label="Chọn nhóm cơ"
        className="sticky top-0 z-20 mt-5 border-y border-black/[0.06] bg-chassis/95 py-3 backdrop-blur dark:border-white/10"
      >
        <div className="mx-auto flex w-full max-w-3xl gap-2 overflow-x-auto px-3 [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
          {RECOVERY_GROUP_UI_ITEMS.map((item) => {
            const selected = item.group === group;
            return (
              <Link
                key={item.group}
                href={`/recovery/groups/${item.group.toLowerCase()}`}
                aria-current={selected ? 'page' : undefined}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${selected ? 'border-accent bg-accent text-white shadow-accent' : 'border-black/10 bg-chassis-hi text-ink-secondary hover:border-accent/40 hover:text-ink dark:border-white/10'}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mx-auto w-full max-w-3xl px-3 pt-5 sm:px-6 sm:pt-7 lg:px-8">
        {loading || (detail !== null && !detailIsCurrent) ? (
          <DetailLoadingState />
        ) : error || !detail ? (
          <section role="alert" className="rounded-2xl border border-red-500/25 bg-red-500/10 p-6 text-center shadow-neumorph-sm">
            <h2 className="font-extrabold text-ink">Không tải được chi tiết phục hồi</h2>
            <p className="mt-2 text-sm text-ink-secondary">Dữ liệu của {metadata.label.toLowerCase()} chưa tải được. Hãy thử lại.</p>
            <button
              type="button"
              onClick={() => setRetryKey((value) => value + 1)}
              className="btn-primary mt-4 inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Thử lại
            </button>
          </section>
        ) : (
          <div className="space-y-5">
            <section className="card rounded-2xl border border-white/80 p-4 shadow-neumorph-sm dark:border-white/10 sm:p-5" aria-labelledby="group-summary-title">
              <div className="flex min-w-0 items-center gap-4">
                <MuscleGroupThumbnail group={group} mode="meaningful" className="h-24 w-24 sm:h-28 sm:w-28" sizes="112px" />
                <div className="min-w-0 flex-1">
                  <h2 id="group-summary-title" className="text-xl font-extrabold text-ink">{metadata.label}</h2>
                  <p className={`mt-1 flex items-center gap-2 text-sm font-bold ${status?.textClass}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${status?.dotClass}`} aria-hidden="true" />
                    {status?.label}
                  </p>
                  <p className={`mt-2 font-mono text-4xl font-extrabold tabular-nums ${status?.textClass}`}>{score}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ink-secondary">{metadata.anatomyDescription}</p>
            </section>

            <section className="rounded-2xl border border-black/[0.06] bg-chassis-hi p-4 dark:border-white/10 sm:p-5" aria-labelledby="recovery-reason-title">
              <h2 id="recovery-reason-title" className="flex items-center gap-2 font-extrabold text-ink">
                <Info className="h-4 w-4 text-accent" aria-hidden="true" /> Vì sao có mức này?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{detail.group.explanation}</p>
              <p className="mt-3 text-xs font-semibold text-ink-muted">
                Nguồn điểm: {detail.group.readinessSource === 'default' ? 'Mặc định khi chưa có tải cơ hiện hành' : 'Mô hình phục hồi từ nhật ký tập'}
              </p>
              {detail.group.limitingMuscle ? (
                <p className="mt-3 text-xs font-semibold text-ink-muted">Cơ đang giới hạn: {detail.group.limitingMuscle.nameVi}</p>
              ) : null}
              {detail.group.stale ? (
                <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-relaxed text-ink-secondary">
                  Dữ liệu này dùng mô hình cũ và không được xem là sẵn sàng cho đến khi được cập nhật.
                </p>
              ) : null}
            </section>

            <section aria-labelledby="recovery-projection-title">
              <h2 id="recovery-projection-title" className="flex items-center gap-2 font-extrabold text-ink">
                <Target className="h-4 w-4 text-accent" aria-hidden="true" /> Mốc dự kiến
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
                {([
                  ['60%', detail.group.projectedAt.r60],
                  ['80%', detail.group.projectedAt.r80],
                  ['90%', detail.group.projectedAt.r90],
                ] as const).map(([label, value]) => (
                  <div key={label} className="min-w-0 rounded-xl border border-black/[0.06] bg-chassis-hi px-2 py-3 text-center dark:border-white/10 sm:px-3">
                    <p className="font-mono text-sm font-extrabold text-accent">{label}</p>
                    <p className="mt-1 break-words text-xs leading-snug text-ink-secondary">
                      {formatRecoveryProjection(value, detail.generatedAt)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="recovery-activity-title">
              <div className="flex items-end justify-between gap-3">
                <h2 id="recovery-activity-title" className="flex items-center gap-2 font-extrabold text-ink">
                  <Clock3 className="h-4 w-4 text-accent" aria-hidden="true" /> Hoạt động gần đây
                </h2>
                <p className="shrink-0 text-xs text-ink-muted">{detail.historyWindowDays} ngày</p>
              </div>
              <div className="mt-3 overflow-hidden rounded-2xl border border-black/[0.06] bg-chassis-hi dark:border-white/10">
                {recentLoads.length === 0 ? (
                  <p className="p-4 text-sm text-ink-muted">Chưa có bài tập tác động trong 14 ngày gần đây.</p>
                ) : recentLoads.map((load, index) => (
                  <article
                    key={load.workout_exercise_id}
                    className={`flex min-w-0 items-center justify-between gap-3 p-4 ${index > 0 ? 'border-t border-black/[0.06] dark:border-white/10' : ''}`}
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-ink">{recoveryActivityExerciseName(load)}</h3>
                      <p className="mt-1 text-xs text-ink-muted">{load.completed_set_count} hiệp hoàn thành</p>
                    </div>
                    <time dateTime={load.occurred_at} className="shrink-0 text-xs text-ink-muted">
                      {formatActivityRecency(load.occurred_at, detail.generatedAt)}
                    </time>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-black/[0.06] bg-chassis-hi p-4 dark:border-white/10" aria-labelledby="recovery-confidence-title">
              <h2 id="recovery-confidence-title" className="flex items-center gap-2 text-sm font-extrabold text-ink">
                <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" /> Độ tin cậy dữ liệu
              </h2>
              <p className="mt-2 text-sm text-ink-secondary">{recoveryConfidenceLabel(detail.group.confidence)}</p>
            </section>

            <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs leading-relaxed text-ink-secondary">
              Điểm phục hồi là ước tính hỗ trợ lập kế hoạch, không phải chẩn đoán y khoa. Nếu đau, chóng mặt hoặc khó chịu bất thường, hãy dừng tập và ưu tiên đánh giá thực tế.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
