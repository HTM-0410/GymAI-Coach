'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  MapPin,
  ChevronRight,
  Trash2,
  Dumbbell,
  Sparkles,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

type GymItem = {
  id: string;
  name: string;
  description: string | null;
  created_at?: string;
  gym_equipment: { count: number }[];
};

export default function GymsListClient({ initialGyms }: { initialGyms: GymItem[] }) {
  const router = useRouter();
  const [gyms, setGyms] = useState<GymItem[]>(initialGyms);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [cleanSuccess, setCleanSuccess] = useState(false);

  // Check if duplicates exist
  const names = gyms.map((g) => g.name.trim().toLowerCase());
  const hasDuplicates = new Set(names).size < names.length;

  // Handle delete single gym
  async function handleDeleteGym(e: React.MouseEvent, gymId: string, gymName: string) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Bạn có chắc muốn xóa phòng gym "${gymName}"?`)) return;

    setDeletingId(gymId);
    const supabase = createClient();
    try {
      await supabase.from('gym_equipment').delete().eq('gym_id', gymId);
      await supabase.from('gyms').delete().eq('id', gymId);
      setGyms((prev) => prev.filter((g) => g.id !== gymId));
      router.refresh();
    } catch (err) {
      console.error('Error deleting gym:', err);
    } finally {
      setDeletingId(null);
    }
  }

  // Handle clean duplicates automatically (keeps the one with the most equipment or newest)
  async function handleCleanDuplicates() {
    setIsCleaningDuplicates(true);
    const supabase = createClient();

    try {
      // Group by name
      const grouped: { [key: string]: GymItem[] } = {};
      gyms.forEach((g) => {
        const key = g.name.trim().toLowerCase();
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(g);
      });

      const idsToDelete: string[] = [];

      Object.values(grouped).forEach((list) => {
        if (list.length > 1) {
          // Sort by equipment count descending, then keep the first one
          list.sort((a, b) => {
            const countA = a.gym_equipment?.[0]?.count ?? 0;
            const countB = b.gym_equipment?.[0]?.count ?? 0;
            return countB - countA;
          });

          // All items except the first are marked for deletion
          for (let i = 1; i < list.length; i++) {
            idsToDelete.push(list[i].id);
          }
        }
      });

      if (idsToDelete.length > 0) {
        for (const id of idsToDelete) {
          await supabase.from('gym_equipment').delete().eq('gym_id', id);
          await supabase.from('gyms').delete().eq('id', id);
        }
        setGyms((prev) => prev.filter((g) => !idsToDelete.includes(g.id)));
        setCleanSuccess(true);
        setTimeout(() => setCleanSuccess(false), 4000);
        router.refresh();
      }
    } catch (err) {
      console.error('Error cleaning duplicates:', err);
    } finally {
      setIsCleaningDuplicates(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-24 space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(249,115,22,0.8)] led-pulse" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Cơ sở vật chất & Thiết bị
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-ink tracking-tight">Phòng gym của tôi</h1>
          <p className="text-sm text-ink-secondary mt-0.5 font-medium">
            {gyms.length} phòng gym đã cấu hình thiết bị tập luyện
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {hasDuplicates && (
            <button
              type="button"
              onClick={handleCleanDuplicates}
              disabled={isCleaningDuplicates}
              className="btn-ghost text-xs py-2.5 px-3.5 border border-accent/30 text-accent hover:bg-accent/10 inline-flex items-center gap-1.5 font-semibold"
            >
              {isCleaningDuplicates ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-accent" />
              )}
              <span>Dọn dẹp gym trùng lặp</span>
            </button>
          )}

          <Link href="/gyms/new" className="btn-primary inline-flex items-center gap-2 shrink-0">
            <Plus className="h-4 w-4" strokeWidth={2} />
            <span>Thêm gym</span>
          </Link>
        </div>
      </div>

      {/* Clean Success Alert */}
      {cleanSuccess && (
        <div className="card shadow-sm p-4 bg-success/10 border border-success/30 rounded-xl flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
          <span className="text-xs font-semibold text-ink">
            Đã dọn dẹp xong các phòng gym trùng lặp, giữ lại phòng tập có cấu hình đầy đủ nhất!
          </span>
        </div>
      )}

      {/* ── GYM LIST ── */}
      <section className="space-y-3.5">
        {gyms.map((g) => {
          const eqCount = g.gym_equipment?.[0]?.count ?? 0;
          const isCurrentDeleting = deletingId === g.id;

          return (
            <div
              key={g.id}
              className="card group p-5 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between border border-white/80 dark:border-white/10 shadow-neumorph-sm hover:shadow-neumorph relative overflow-hidden"
            >
              {/* Left Link Info */}
              <Link href={`/gyms/${g.id}`} className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent to-accent-dim text-white shadow-accent flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <MapPin className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-ink text-base tracking-tight group-hover:text-accent transition-colors truncate">
                    {g.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-ink-muted uppercase tracking-wider font-semibold">
                      <Dumbbell className="h-3 w-3 text-accent" />
                      {eqCount} thiết bị
                    </span>
                    {g.description && (
                      <span className="text-xs text-ink-muted truncate hidden sm:inline">
                        • {g.description}
                      </span>
                    )}
                  </div>
                </div>
              </Link>

              {/* Right Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleDeleteGym(e, g.id, g.name)}
                  disabled={isCurrentDeleting}
                  className="p-2 rounded-lg text-ink-muted hover:text-danger hover:bg-danger/10 transition-colors"
                  title="Xóa phòng gym"
                >
                  {isCurrentDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-danger" />
                  ) : (
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>

                <Link
                  href={`/gyms/${g.id}`}
                  className="p-2 text-ink-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </Link>
              </div>
            </div>
          );
        })}
      </section>

      {/* Empty State */}
      {gyms.length === 0 && (
        <div className="card shadow-neumorph-lg rounded-2xl p-12 text-center border border-white/80 dark:border-white/10 space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-accent/15 text-accent flex items-center justify-center mx-auto shadow-accent">
            <Dumbbell className="h-8 w-8" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink">Chưa có phòng gym nào</h3>
            <p className="text-xs text-ink-secondary mt-1">
              Thêm phòng tập của bạn để AI tự động chọn bài tập tương thích với thiết bị có sẵn.
            </p>
          </div>
          <Link href="/gyms/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Tạo phòng gym đầu tiên</span>
          </Link>
        </div>
      )}
    </div>
  );
}
