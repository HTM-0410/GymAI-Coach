'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import MuscleGroupThumbnail from '@/components/recovery/muscle-group-thumbnail';
import MuscleGroupInfoDialog from '@/components/recovery/muscle-group-info-dialog';
import {
  formatActivityRecency,
  normalizeRecoverySummaryGroups,
  recoveryGroupStatusPresentation,
  selectRecoveryGroupsForSection,
  type RecoverySummaryGroup,
} from '@/lib/recovery/group-list-view';
import { selectFreshRecoveryGroups } from '@/lib/recovery/ui-selectors';
import type { BodyMuscleGroup } from '@/lib/recovery/muscle-groups';

type RecoverySummaryResponse = {
  modelVersion: string;
  generatedAt: string;
  lastCompletedWorkoutAt: string | null;
  groups: RecoverySummaryGroup[];
};

const SECTIONS = [
  { key: 'main', label: 'Nhóm cơ chính' },
  { key: 'accessory', label: 'Nhóm cơ bổ trợ' },
] as const;

function LoadingState() {
  return (
    <div className="space-y-7" role="status" aria-label="Đang tải danh sách phục hồi">
      {[8, 2].map((count, sectionIndex) => (
        <section key={count} aria-hidden="true">
          <div className="mb-3 h-4 w-32 animate-pulse rounded bg-black/10 motion-reduce:animate-none dark:bg-white/10" />
          <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-chassis-hi dark:border-white/10">
            {Array.from({ length: count }, (_, index) => (
              <div
                key={index}
                className={`flex min-h-[88px] items-center gap-3 px-3 py-3 sm:px-4 ${index > 0 ? 'border-t border-black/[0.06] dark:border-white/10' : ''}`}
              >
                <div className="h-16 w-16 shrink-0 animate-pulse rounded-2xl bg-black/10 motion-reduce:animate-none dark:bg-white/10" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-28 animate-pulse rounded bg-black/10 motion-reduce:animate-none dark:bg-white/10" />
                  <div className="h-3 w-44 max-w-full animate-pulse rounded bg-black/10 motion-reduce:animate-none dark:bg-white/10" />
                </div>
                <div className="h-6 w-12 animate-pulse rounded bg-black/10 motion-reduce:animate-none dark:bg-white/10" />
              </div>
            ))}
          </div>
          {sectionIndex === 0 ? <div className="h-1" /> : null}
        </section>
      ))}
      <span className="sr-only">Đang tải danh sách phục hồi</span>
    </div>
  );
}

function RecoveryGroupRow({
  group,
  onSelect,
}: {
  group: RecoverySummaryGroup;
  onSelect: (group: BodyMuscleGroup, trigger: HTMLButtonElement) => void;
}) {
  const status = recoveryGroupStatusPresentation(group);
  const activity = group.latestActivity;
  const activityCopy = activity
    ? `${activity.exerciseName}, ${formatActivityRecency(activity.occurredAt)}`
    : 'Chưa có bài tập gần đây';
  const scoreCopy = group.readiness === null || group.stale ? '--' : `${group.readiness}%`;

  return (
    <button
      type="button"
      onClick={(event) => onSelect(group.group, event.currentTarget)}
      className="group flex min-h-[88px] w-full min-w-0 items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-black/[0.025] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent dark:hover:bg-white/[0.035] sm:px-4"
      aria-label={`${group.label}, ${scoreCopy}, ${status.label}. ${activityCopy}. Mở thông tin`}
    >
      <MuscleGroupThumbnail group={group.group} mode="decorative" className="h-16 w-16 rounded-xl sm:h-[72px] sm:w-[72px]" />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-extrabold text-ink">{group.label}</span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${status.textClass}`}>
            <span className={`h-2 w-2 shrink-0 rounded-full ${status.dotClass}`} aria-hidden="true" />
            {status.label}
          </span>
        </span>
        <span className="mt-1 block truncate text-sm text-ink-muted">{activityCopy}</span>
      </span>
      <span className={`shrink-0 font-mono text-xl font-extrabold tabular-nums sm:text-2xl ${status.textClass}`}>
        {scoreCopy}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </button>
  );
}

export default function RecoveryGroupsPage() {
  const [summary, setSummary] = useState<RecoverySummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<BodyMuscleGroup | null>(null);
  const groupDialogTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetch('/api/recovery', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('recovery_read_failed');
        return response.json() as Promise<RecoverySummaryResponse>;
      })
      .then((data) => setSummary({ ...data, groups: normalizeRecoverySummaryGroups(data.groups) }))
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retryKey]);

  const freshCount = useMemo(
    () => summary ? selectFreshRecoveryGroups(summary.groups).length : 0,
    [summary],
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-chassis px-3 pb-28 pt-4 text-ink sm:px-6 sm:pt-6 md:pb-10 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 flex min-w-0 items-center gap-3 sm:mb-8">
          <Link
            href="/recovery"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-black/10 bg-chassis-hi text-ink-secondary shadow-neumorph-sm transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:border-white/10"
            aria-label="Quay lại Phục hồi cơ bắp"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">Nhóm cơ và độ phục hồi</h1>
            <p className="mt-0.5 text-sm text-ink-muted">
              {summary ? `${freshCount}/10 nhóm tươi mới` : 'Theo dõi mức sẵn sàng của từng nhóm cơ'}
            </p>
          </div>
        </header>

        {loading ? (
          <LoadingState />
        ) : error || !summary ? (
          <section role="alert" className="rounded-2xl border border-red-500/25 bg-red-500/10 p-6 text-center shadow-neumorph-sm">
            <h2 className="font-extrabold text-ink">Không tải được danh sách phục hồi</h2>
            <p className="mt-2 text-sm text-ink-secondary">Kiểm tra kết nối và thử tải lại dữ liệu.</p>
            <button
              type="button"
              onClick={() => setRetryKey((value) => value + 1)}
              className="btn-primary mt-4 inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Thử lại
            </button>
          </section>
        ) : (
          <div className="space-y-8">
            {SECTIONS.map((section) => {
              const groups = selectRecoveryGroupsForSection(summary.groups, section.key);
              return (
                <section key={section.key} aria-labelledby={`recovery-section-${section.key}`}>
                  <h2 id={`recovery-section-${section.key}`} className="mb-3 text-xs font-extrabold uppercase tracking-[0.12em] text-ink-secondary">
                    {section.label}
                  </h2>
                  <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-chassis-hi shadow-neumorph-sm dark:border-white/10">
                    {groups.map((group, index) => (
                      <div key={group.group} className={index > 0 ? 'border-t border-black/[0.06] dark:border-white/10' : ''}>
                        <RecoveryGroupRow
                          group={group}
                          onSelect={(selected, trigger) => {
                            groupDialogTriggerRef.current = trigger;
                            setSelectedGroup(selected);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
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
