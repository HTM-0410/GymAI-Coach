import Link from 'next/link';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Info,
  Lightbulb,
  PlayCircle,
  Plus,
  ShieldAlert,
  Target,
  TrendingUp,
} from 'lucide-react';
import VideoGuide from '@/app/exercise-demo/video-guide';
import UserPerformance from '@/components/exercise/UserPerformance';
import ExerciseMedia from './exercise-media';
import SaveExerciseButton from '@/components/exercises/save-exercise-button';
import { createClient } from '@/lib/supabase/server';
import { fetchUserSavedExerciseSlugs } from '@/lib/saved-exercises';
import {
  getAllExercises,
  getExerciseBySlug,
  getResolvedAlternatives,
} from '@/lib/exercises';
import { MOVEMENT_PATTERN_VI } from '@/lib/exercises-i18n';

// ISR — exercises are stable for ~1 day; refresh hourly.
// Note: page uses supabase server client which requires dynamic rendering.
export const revalidate = 3600;
export const dynamic = 'force-dynamic';

type SlugParams = { slug: string };

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`card corner-screws p-5 border border-white/80 dark:border-white/10 shadow-neumorph-sm ${className}`}>{children}</section>;
}

function PanelTitle({ icon: Icon, children }: { icon: typeof Info; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 border-b border-chassis-lo/60 pb-3 font-mono text-xs font-bold uppercase tracking-wider text-ink">
      <Icon className="h-4 w-4 text-accent" strokeWidth={2} />
      {children}
    </h2>
  );
}

export default async function ExerciseDetailPage({ params }: { params: Promise<SlugParams> }) {
  const { slug } = await params;
  const ex = await getExerciseBySlug(slug);
  if (!ex) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const savedSlugs = await fetchUserSavedExerciseSlugs(user?.id);
  const isSaved = savedSlugs.includes(slug);

  const alternatives = await getResolvedAlternatives(slug);
  const primaryMuscle = ex.primary_muscle;
  const secondaryMuscle = ex.secondary_muscles.join(', ') || '—';
  const equipmentNames = ex.equipment.join(', ') || '—';
  const gallery = ex.gallery;
  const galleryViews = Array.isArray(gallery.views) ? gallery.views : [];
  const animationUrl = gallery.animation ?? galleryViews[0]?.src ?? null;

  return (
    <main className="min-h-screen bg-chassis blueprint-grid">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <Link
          href="/exercises"
          className="mb-5 inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-ink-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Thư viện bài tập
        </Link>

        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                Chi tiết bài tập
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">{ex.name_vi}</h1>
            <p className="mt-0.5 font-mono text-sm font-medium text-ink-secondary">{ex.name}</p>
            <p className="mt-1 text-sm text-ink-secondary">{ex.subtitle_vi}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ex.tags.map((tag) => (
                <span key={tag} className="chip cursor-default text-[10px]">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            <SaveExerciseButton
              exerciseSlug={ex.slug}
              initialSaved={isSaved}
              variant="button"
            />
            <button
              aria-disabled="true"
              title="Sẽ kết nối buổi tập trong TIP-011"
              className="btn-primary fixed inset-x-4 bottom-4 z-30 justify-center md:static md:inset-auto md:z-auto"
            >
              <Plus className="h-4 w-4" />
              Thêm vào buổi tập
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
          <div className="space-y-5">
            <Panel className="p-3">
              <ExerciseMedia
                jpgUrl={gallery.main}
                gifUrl={animationUrl}
                name={ex.name_vi}
                caption={gallery.caption_vi ?? ex.name_vi}
              />
              {galleryViews.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {galleryViews.map((view, idx) => (
                    <div
                      key={view.src ?? idx}
                      className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-white dark:bg-black/40 ${
                        idx === 0 ? 'border-accent' : 'border-chassis-lo dark:border-white/10'
                      }`}
                    >
                      {view.src && /\.(mp4|webm|ogg)$/i.test(view.src) ? (
                        <video
                          src={view.src}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="h-full w-full object-contain"
                        />
                      ) : view.src ? (
                        <Image
                          src={view.src}
                          alt={view.label}
                          fill
                          unoptimized={view.src.endsWith('.gif')}
                          className="object-contain p-1"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-chassis-lo">
                          <Dumbbell className="h-5 w-5 text-ink-muted opacity-40" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel>
              <PanelTitle icon={Target}>Mục tiêu bài tập</PanelTitle>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-secondary">{ex.goal_vi}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-chassis p-3 shadow-inset">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Cơ chính
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink">{primaryMuscle}</p>
                </div>
                <div className="rounded-lg bg-chassis p-3 shadow-inset">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Cơ phụ
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink">{secondaryMuscle}</p>
                </div>
                <div className="rounded-lg bg-chassis p-3 shadow-inset">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Kiểu chuyển động
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {MOVEMENT_PATTERN_VI[ex.movement_pattern] ?? ex.movement_pattern}
                  </p>
                </div>
              </div>
            </Panel>

            <Panel>
              <PanelTitle icon={PlayCircle}>Cách thực hiện</PanelTitle>
              <ol className="mt-3">
                {ex.instructions.map((step, idx) => (
                  <li
                    key={idx}
                    className="flex gap-3 border-b border-chassis-lo py-3 last:border-0"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent font-mono text-xs font-bold text-white shadow-accent">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <p className="pt-1 text-sm leading-6 text-ink-secondary">{step}</p>
                  </li>
                ))}
              </ol>
            </Panel>

            <VideoGuide />

            <div className="grid gap-5 md:grid-cols-2">
              <Panel>
                <PanelTitle icon={Lightbulb}>Mẹo kỹ thuật</PanelTitle>
                <ul className="mt-3 space-y-3">
                  {ex.tips.map((tip, idx) => (
                    <li
                      key={idx}
                      className="flex gap-2 text-sm leading-6 text-ink-secondary"
                    >
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel>
                <PanelTitle icon={ShieldAlert}>Lỗi thường gặp</PanelTitle>
                <ul className="mt-3 space-y-3">
                  {ex.common_mistakes.map((mistake, idx) => (
                    <li
                      key={idx}
                      className="flex gap-2 text-sm leading-6 text-ink-secondary"
                    >
                      <ShieldAlert className="mt-1 h-4 w-4 shrink-0 text-warn" />
                      {mistake}
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
            <Panel>
              <PanelTitle icon={Info}>Thông số & thiết lập</PanelTitle>
              <dl className="mt-2">
                {[
                  ['Nhóm cơ chính', primaryMuscle],
                  ['Nhóm cơ phụ', secondaryMuscle],
                  ['Dụng cụ', equipmentNames],
                  ['Số hiệp', ex.setup.sets],
                  ['Số lần', ex.setup.reps],
                  ['RIR', ex.setup.rir],
                  ['Nghỉ', `${ex.setup.rest_seconds} giây`],
                  ['Tempo', ex.setup.tempo],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-3 border-b border-chassis-lo py-2.5 last:border-0"
                  >
                    <dt className="font-mono text-[10px] font-bold uppercase tracking-wide text-ink-secondary">
                      {label}
                    </dt>
                    <dd className="text-right text-xs font-semibold text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <Panel>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" />
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                  AI Coach đề xuất
                </p>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-ink">
                {ex.ai_coach.next_session_vi}
              </p>
              <p className="mt-2 text-xs leading-5 text-ink-secondary">
                {ex.ai_coach.rationale_vi}
              </p>
              <button
                aria-disabled="true"
                title="Sẽ kết nối AI Coach trong TIP-015"
                className="btn-primary mt-4 w-full text-xs"
              >
                Áp dụng cho buổi tiếp theo
              </button>
            </Panel>

            <Panel>
              <PanelTitle icon={Clock3}>Lưu ý an toàn</PanelTitle>
              <p className="mt-3 text-sm leading-6 text-ink-secondary">{ex.safety_vi}</p>
            </Panel>
          </aside>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Panel>
            <PanelTitle icon={TrendingUp}>Hiệu suất gần đây</PanelTitle>
            <UserPerformance exerciseSlug={slug} />
          </Panel>

          <Panel>
            <PanelTitle icon={Dumbbell}>Bài thay thế</PanelTitle>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {alternatives.length > 0 ? (
                alternatives.slice(0, 3).map((alt) => (
                  <Link
                    key={alt.slug}
                    href={`/exercises/${alt.slug}`}
                    className="block rounded-lg bg-chassis p-2 shadow-neumorph-sm transition-transform hover:scale-[1.02]"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-md">
                      {(alt.image ?? gallery.main) ? (
                        <Image
                          src={alt.image ?? gallery.main}
                          alt={alt.name_vi}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-chassis">
                          <Dumbbell className="h-8 w-8 text-ink-muted opacity-30" />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-xs font-bold text-ink">{alt.name_vi}</p>
                    <span className="font-mono text-[9px] uppercase text-ink-muted">Bài thay thế</span>
                  </Link>
                ))
              ) : (
                <p className="col-span-3 text-sm text-ink-muted">Chưa có bài thay thế.</p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
