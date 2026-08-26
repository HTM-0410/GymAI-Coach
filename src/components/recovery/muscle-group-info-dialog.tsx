'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Info, RefreshCw, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import MuscleGroupThumbnail from '@/components/recovery/muscle-group-thumbnail';
import {
  dedupeRecoveryActivities,
  recoveryActivityExerciseName,
  type RecoveryActivityReadRow,
} from '@/lib/recovery/activity';
import {
  formatActivityRecency,
  recoveryGroupStatusPresentation,
} from '@/lib/recovery/group-list-view';
import type { BodyMuscleGroup } from '@/lib/recovery/muscle-groups';
import type { MuscleReadinessGroup } from '@/lib/recovery/read-model';
import { getRecoveryGroupUiMetadata } from '@/lib/recovery/ui-metadata';

type RecoveryGroupDetailResponse = {
  generatedAt: string;
  group: MuscleReadinessGroup;
  recentLoads: RecoveryActivityReadRow[];
};

type Props = {
  group: BodyMuscleGroup | null;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLElement | SVGElement | null>;
};

export default function MuscleGroupInfoDialog({ group, onOpenChange, returnFocusRef }: Props) {
  const [detail, setDetail] = useState<RecoveryGroupDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const requestIdRef = useRef(0);
  const open = group !== null;
  const metadata = group ? getRecoveryGroupUiMetadata(group) : null;

  useEffect(() => {
    if (!group) {
      setDetail(null);
      setLoading(false);
      setError(false);
      return;
    }
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
  const detailIsCurrent = Boolean(group && detail?.group.group === group);
  const status = detailIsCurrent ? recoveryGroupStatusPresentation(detail!.group) : null;
  const score = detailIsCurrent && detail!.group.readiness !== null && !detail!.group.stale
    ? `${detail!.group.readiness}%`
    : null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{ position: 'fixed', inset: 0, zIndex: 50 }}
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out"
        />
        <Dialog.Content
          style={{ position: 'fixed', zIndex: 51 }}
          aria-describedby={metadata ? 'muscle-group-info-description' : undefined}
          onCloseAutoFocus={(event) => {
            const trigger = returnFocusRef.current;
            if (!trigger?.isConnected) return;
            event.preventDefault();
            trigger.focus();
          }}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto overscroll-contain rounded-t-3xl border border-white/15 bg-chassis-hi/90 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-md focus:outline-none sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-full sm:max-h-[85vh] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-6"
        >
          {metadata ? (
            <>
              <Dialog.Title className="pr-12 text-xl font-extrabold text-ink sm:text-2xl">
                {metadata.label}{score ? ` ${score}` : ''}
              </Dialog.Title>
              <Dialog.Description id="muscle-group-info-description" className="sr-only">
                Thông tin phục hồi và các bài tập gần đây của nhóm cơ {metadata.label}
              </Dialog.Description>
              <Dialog.Close
                className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full text-ink-muted transition hover:bg-black/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:hover:bg-white/10"
                aria-label="Đóng thông tin nhóm cơ"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Dialog.Close>

              {loading || (!detail && !error) || (detail !== null && !detailIsCurrent) ? (
                <div className="mt-5 space-y-4" role="status" aria-label={`Đang tải thông tin ${metadata.label}`}>
                  <div className="h-28 animate-pulse rounded-2xl bg-black/10 motion-reduce:animate-none dark:bg-white/10" />
                  <div className="h-36 animate-pulse rounded-2xl bg-black/10 motion-reduce:animate-none dark:bg-white/10" />
                  <span className="sr-only">Đang tải thông tin nhóm cơ</span>
                </div>
              ) : error || !detail ? (
                <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/10 p-5 text-center" role="alert">
                  <p className="font-bold text-ink">Không tải được thông tin {metadata.label.toLowerCase()}</p>
                  <button
                    type="button"
                    onClick={() => setRetryKey((value) => value + 1)}
                    className="btn-primary mt-4 inline-flex min-h-11 items-center gap-2 px-4 py-2"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" /> Thử lại
                  </button>
                </div>
              ) : (
                <div className="mt-5 space-y-6">
                  <section className="flex min-w-0 items-center gap-4" aria-label="Tóm tắt nhóm cơ">
                    <MuscleGroupThumbnail group={detail.group.group} mode="meaningful" className="h-20 w-20 sm:h-24 sm:w-24" sizes="96px" />
                    <div className="min-w-0">
                      <p className={`flex items-center gap-2 text-sm font-bold ${status?.textClass}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${status?.dotClass}`} aria-hidden="true" />
                        {status?.label}
                      </p>
                      <p className={`mt-1 font-mono text-4xl font-extrabold tabular-nums ${status?.textClass}`}>{score}</p>
                    </div>
                  </section>

                  <section aria-labelledby="muscle-group-what-title">
                    <h2 id="muscle-group-what-title" className="flex items-center gap-2 font-extrabold text-ink">
                      <Info className="h-4 w-4 text-accent" aria-hidden="true" /> Nhóm cơ này là gì?
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{metadata.anatomyDescription}</p>
                  </section>

                  <section aria-labelledby="muscle-group-recent-title">
                    <h2 id="muscle-group-recent-title" className="font-extrabold text-ink">
                      Các bài tập gần đây ảnh hưởng đến nhóm cơ này
                    </h2>
                    <div className="mt-3 overflow-hidden rounded-2xl border border-black/[0.06] bg-chassis dark:border-white/10">
                      {recentLoads.length === 0 ? (
                        <p className="p-4 text-sm text-ink-muted">Chưa có bài tập gần đây ảnh hưởng đến nhóm cơ này.</p>
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
                </div>
              )}
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
