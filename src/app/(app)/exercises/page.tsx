import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Plus } from 'lucide-react';
import ExerciseFilters from './exercise-filters';
import BodyMapStrip from './body-map-grid';
import EquipmentSidebar from './equipment-sidebar';
import SaveExerciseButton from '@/components/exercises/save-exercise-button';
import { filterExercises } from '@/lib/exercises';
import { createClient } from '@/lib/supabase/server';
import { fetchUserSavedExerciseSlugs } from '@/lib/saved-exercises';
import type { Difficulty, ExerciseType, MovementPattern } from '@/lib/exercises-types';
import {
  EXERCISE_TYPE_VI,
  DIFFICULTY_VI,
  formatMuscleVi,
} from '@/lib/exercises-i18n';
import {
  MUSCLE_CATEGORIES,
  classifyMuscle,
  groupByCategory,
  type MuscleCategoryId,
} from '@/lib/muscle-categories';
import {
  EQUIPMENT_CATEGORIES,
  classifyEquipments,
  type EquipmentCategoryId,
} from '@/lib/equipment-categories';

// ISR — exercises are stable for ~1 day; refresh hourly on edge.
// Note: page uses supabase server client which requires dynamic rendering.
export const revalidate = 3600;
export const dynamic = 'force-dynamic';

type SearchParams = {
  q?: string;
  muscle?: string;
  muscle_cat?: MuscleCategoryId;
  equipment?: string;
  difficulty?: Difficulty;
  exercise_type?: ExerciseType;
  movement_pattern?: MovementPattern;
  saved?: string;
  page?: string;
};

const PAGE_SIZE = 50;

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const savedSlugs = await fetchUserSavedExerciseSlugs(user?.id);
  const savedSlugSet = new Set(savedSlugs);

  // Step 1: Apply secondary filter (không gồm muscle_cat, không gồm equipment_category)
  // để có 1 pool chung để đếm count cho body-map strip + equipment sidebar.
  const allExercises = await filterExercises({
    q: sp?.q,
    difficulty: sp?.difficulty,
    movement_pattern: sp?.movement_pattern,
    exercise_type: sp?.exercise_type,
  });

  // Đếm bài theo muscle category dựa trên allExercises (chưa lọc muscle_cat)
  const groupedAll = groupByCategory(allExercises);
  const categoryCounts = MUSCLE_CATEGORIES.map((cat) => ({
    category: cat,
    count: groupedAll.get(cat.id)?.items.length ?? 0,
  }));

  // Đếm bài theo equipment category (đã loại bỏ filter equipment hiện tại,
  // nhưng vẫn áp dụng các filter khác).
  const equipmentCounts = new Map<EquipmentCategoryId, number>();
  for (const cat of EQUIPMENT_CATEGORIES) equipmentCounts.set(cat.id, 0);
  for (const ex of allExercises) {
    const cats = classifyEquipments(ex.equipment);
    for (const c of cats) {
      equipmentCounts.set(c, (equipmentCounts.get(c) ?? 0) + 1);
    }
  }

  // Step 2: Apply muscle_cat + equipment_category + saved filter để list dưới grid
  let displayed = allExercises;
  let activeCategory = null;
  if (sp?.muscle_cat) {
    activeCategory = MUSCLE_CATEGORIES.find((c) => c.id === sp.muscle_cat) ?? null;
    if (activeCategory) {
      displayed = displayed.filter(
        (ex) => classifyMuscle(ex.primary_muscle)?.id === activeCategory!.id,
      );
    }
  }

  const activeEquipmentCat = sp?.equipment ?? null;
  if (activeEquipmentCat) {
    displayed = displayed.filter((ex) =>
      classifyEquipments(ex.equipment).has(activeEquipmentCat as EquipmentCategoryId),
    );
  }

  // Filter by bookmarked / saved
  if (sp?.saved === 'true') {
    displayed = displayed.filter((ex) => savedSlugSet.has(ex.slug));
  }

  // Pagination
  const totalCount = displayed.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPageRaw = Number.parseInt(sp?.page ?? '1', 10);
  const currentPage = Math.min(
    Math.max(1, Number.isFinite(currentPageRaw) ? currentPageRaw : 1),
    totalPages,
  );
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, totalCount);
  const pageItems = displayed.slice(pageStart, pageEnd);

  // Build href giữ nguyên filter khi đổi trang
  const buildPageHref = (p: number): string => {
    const params = new URLSearchParams();
    if (sp?.q) params.set('q', sp.q);
    if (sp?.muscle) params.set('muscle', sp.muscle);
    if (sp?.muscle_cat) params.set('muscle_cat', sp.muscle_cat);
    if (sp?.equipment) params.set('equipment', sp.equipment);
    if (sp?.difficulty) params.set('difficulty', sp.difficulty);
    if (sp?.exercise_type) params.set('exercise_type', sp.exercise_type);
    if (sp?.movement_pattern) params.set('movement_pattern', sp.movement_pattern);
    if (sp?.saved) params.set('saved', sp.saved);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `/exercises?${qs}` : '/exercises';
  };

  // Compact page numbers: 1 … (curr-1) curr (curr+1) … last
  const pageNumbers = (curr: number, total: number): (number | '…')[] => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const set = new Set<number>([1, total, curr, curr - 1, curr + 1]);
    const sorted = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
    const out: (number | '…')[] = [];
    let prev = 0;
    for (const n of sorted) {
      if (prev && n - prev > 1) out.push('…');
      out.push(n);
      prev = n;
    }
    return out;
  };

  return (
    <main className="min-h-screen bg-chassis blueprint-grid w-full">
      <div className="max-w-6xl mx-auto px-4 pt-4 sm:pt-6 pb-24 space-y-4 sm:space-y-5 w-full max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="hidden sm:flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                Thư viện bài tập
              </span>
            </div>
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">Bài tập</h1>
              <span className="font-mono text-xs sm:text-sm text-ink-secondary font-bold">
                {sp?.saved === 'true'
                  ? `(${totalCount} đã lưu)`
                  : activeCategory
                    ? `(${totalCount} · ${activeCategory.name_vi})`
                    : `(${totalCount})`}
              </span>
            </div>
          </div>
          <Link
            href="/exercises/new"
            className="btn-primary hidden sm:inline-flex items-center gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Tạo bài tập với AI
          </Link>
        </div>

        {/* STICKY FILTER HEADER ON MOBILE (sm:static) */}
        <div className="sticky top-14 z-30 -mx-4 px-4 py-2.5 bg-chassis/95 dark:bg-[#0c1017]/95 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] shadow-xs sm:shadow-none sm:border-none sm:bg-transparent sm:backdrop-blur-none sm:static sm:mx-0 sm:px-0 sm:py-0 space-y-2">
          {/* BODY MAP STRIP — horizontal scrolling muscle filter */}
          <section>
            <BodyMapStrip categories={categoryCounts} />
          </section>

          {/* Unified Search & Filters */}
          <section className="lg:hidden">
            <ExerciseFilters
              savedCount={savedSlugs.length}
              equipmentCategories={EQUIPMENT_CATEGORIES}
              equipmentCounts={equipmentCounts}
            />
          </section>
        </div>

        {/* Main + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_290px] gap-5 items-start">
          {/* Main column */}
          <div className="space-y-4 min-w-0">
            {/* Search & Filters on Desktop (hidden on mobile, rendered in sticky header above) */}
            <section className="hidden lg:block">
              <ExerciseFilters
                savedCount={savedSlugs.length}
                equipmentCategories={EQUIPMENT_CATEGORIES}
                equipmentCounts={equipmentCounts}
              />
            </section>

            {/* Results */}
            {pageItems.length === 0 ? (
              <div className="card p-12 text-center border border-white/80 dark:border-white/10 shadow-neumorph-sm">
                {sp?.saved === 'true' ? (
                  <div className="space-y-2 max-w-sm mx-auto">
                    <p className="font-mono text-sm text-ink font-bold uppercase tracking-wider">
                      Bạn chưa lưu bài tập nào.
                    </p>
                    <p className="text-xs text-ink-secondary leading-relaxed font-medium">
                      Nhấn vào biểu tượng Bookmark góc trên của mỗi bài tập để lưu lại vào bộ sưu tập yêu thích của bạn!
                    </p>
                  </div>
                ) : (
                  <p className="font-mono text-sm text-ink-muted uppercase tracking-wider font-semibold">
                    Không tìm thấy bài tập nào khớp bộ lọc.
                  </p>
                )}
              </div>
            ) : (
              <>
                <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {pageItems.map((ex) => (
                    <Link
                      key={ex.slug}
                      href={`/exercises/${ex.slug}`}
                      className="card group overflow-hidden flex flex-col hover:-translate-y-1.5 hover:border-accent/40 transition-all duration-300 border border-white/80 dark:border-white/10 shadow-neumorph-sm hover:shadow-neumorph relative"
                    >
                      {/* Subtle top-right accent glow */}
                      <div className="absolute -top-6 -right-6 w-20 h-20 bg-accent/5 rounded-full blur-xl group-hover:bg-accent/20 transition-all pointer-events-none" />

                      <div className="relative aspect-square overflow-hidden bg-chassis-lo/40 dark:bg-black/50 border-b border-chassis-lo/40 dark:border-white/5">
                        {ex.gallery_main?.match(/\.(mp4|webm|ogg)$/i) || ex.gallery_main?.includes('r2') ? (
                          <video
                            src={ex.gallery_main}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : ex.gallery_main ? (
                          <Image
                            src={ex.gallery_main}
                            alt={ex.name_vi}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-chassis-lo/20">
                            <svg viewBox="0 0 48 48" fill="none" className="h-10 w-10 opacity-20">
                              <path
                                d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4Zm0 36c-8.82 0-16-7.18-16-16S15.18 8 24 8s16 7.18 16 16-7.18 16-16 16Zm-4-22a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm8 0a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-8 6h8v2h-8v-2Z"
                                fill="currentColor"
                              />
                            </svg>
                          </div>
                        )}

                        {/* Muscle Category Tag on image */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-mono font-bold text-white uppercase tracking-wider">
                          {formatMuscleVi(ex.primary_muscle)}
                        </div>

                        {/* Bookmark / Save Button */}
                        <SaveExerciseButton
                          exerciseSlug={ex.slug}
                          initialSaved={savedSlugSet.has(ex.slug)}
                          variant="card"
                        />
                      </div>

                      <div className="p-3 flex flex-col gap-1.5 flex-1 justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h3 className="font-bold text-ink text-xs leading-snug line-clamp-2 min-h-[2.25rem] group-hover:text-accent transition-colors">
                              {ex.name_vi}
                            </h3>
                            <ChevronRight
                              className="h-3.5 w-3.5 text-ink-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5"
                              strokeWidth={2}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-ink-muted font-mono uppercase tracking-wider font-semibold pt-1.5 border-t border-black/[0.04] dark:border-white/5">
                          <span className="bg-black/[0.04] dark:bg-white/10 px-1.5 py-0.5 rounded text-ink-secondary dark:text-ink font-bold">
                            {EXERCISE_TYPE_VI[ex.exercise_type] ?? ex.exercise_type}
                          </span>
                          <span>·</span>
                          <span className="text-ink-muted">
                            {DIFFICULTY_VI[ex.difficulty] ?? ex.difficulty}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </section>

                {/* Pagination */}
                <nav
                  className="mt-6 card p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 border border-white/80 dark:border-white/10 shadow-neumorph-sm"
                  aria-label="Pagination"
                >
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                    Hiển thị {pageStart + 1}-{pageEnd} / {totalCount} bài
                  </p>
                  <div className="flex items-center gap-1.5">
                    {currentPage > 1 ? (
                      <Link
                        href={buildPageHref(currentPage - 1)}
                        aria-label="Trang trước"
                        className="h-9 min-w-9 px-2 inline-flex items-center justify-center rounded-xl bg-chassis border border-white/80 dark:border-white/10 shadow-neumorph-sm text-xs font-mono font-bold text-ink hover:text-accent hover:shadow-neumorph transition-all"
                      >
                        ‹
                      </Link>
                    ) : (
                      <span
                        aria-disabled="true"
                        className="h-9 min-w-9 px-2 inline-flex items-center justify-center rounded-xl border border-ink/10 text-xs font-mono font-bold text-ink-muted opacity-30 cursor-not-allowed"
                      >
                        ‹
                      </span>
                    )}

                    {pageNumbers(currentPage, totalPages).map((p, i) =>
                      p === '…' ? (
                        <span
                          key={`gap-${i}`}
                          className="h-9 min-w-9 px-2 inline-flex items-center justify-center text-xs font-mono font-bold text-ink-muted select-none"
                        >
                          …
                        </span>
                      ) : p === currentPage ? (
                        <span
                          key={`p-${p}`}
                          aria-current="page"
                          className="h-9 min-w-9 px-2.5 inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dim text-white text-xs font-mono font-bold shadow-accent border-t border-white/30"
                        >
                          {p}
                        </span>
                      ) : (
                        <Link
                          key={`p-${p}`}
                          href={buildPageHref(p)}
                          aria-label={`Trang ${p}`}
                          className="h-9 min-w-9 px-2.5 inline-flex items-center justify-center rounded-xl bg-chassis border border-white/80 dark:border-white/10 shadow-neumorph-sm text-xs font-mono font-bold text-ink hover:text-accent hover:shadow-neumorph transition-all"
                        >
                          {p}
                        </Link>
                      ),
                    )}

                    {currentPage < totalPages ? (
                      <Link
                        href={buildPageHref(currentPage + 1)}
                        aria-label="Trang sau"
                        className="h-9 min-w-9 px-2 inline-flex items-center justify-center rounded-xl bg-chassis border border-white/80 dark:border-white/10 shadow-neumorph-sm text-xs font-mono font-bold text-ink hover:text-accent hover:shadow-neumorph transition-all"
                      >
                        ›
                      </Link>
                    ) : (
                      <span
                        aria-disabled="true"
                        className="h-9 min-w-9 px-2 inline-flex items-center justify-center rounded-xl border border-ink/10 text-xs font-mono font-bold text-ink-muted opacity-30 cursor-not-allowed"
                      >
                        ›
                      </span>
                    )}
                  </div>
                </nav>
              </>
            )}
          </div>

          {/* Right sidebar — equipment filter (13 categories from exerciselibrary.app) */}
          <EquipmentSidebar
            categories={EQUIPMENT_CATEGORIES}
            counts={equipmentCounts}
            active={activeEquipmentCat}
          />
        </div>
      </div>
    </main>
  );
}
