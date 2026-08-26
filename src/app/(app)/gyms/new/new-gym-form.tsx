'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Camera, Loader2, X, Plus, Search, Check, Dumbbell, Sparkles } from 'lucide-react';
import { EQUIPMENT_CATEGORIES, classifyEquipment } from '@/lib/equipment-categories';
import { preprocessImageForUpload } from '@/lib/client-image-preprocess';
import { getEquipmentDetectErrorMessage } from '@/lib/equipment-detect-errors';

type Eq = { id: string; slug: string; name_vi: string | null; category: string | null };

export default function NewGymForm({ equipment }: { equipment: Eq[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => scanCleanupRef.current?.(), []);

  function clearScanPreview() {
    scanCleanupRef.current?.();
    scanCleanupRef.current = null;
    setScanPreview(null);
  }

  function toggle(slug: string) {
    const next = new Set(selected);
    if (next.has(slug)) next.delete(slug); else next.add(slug);
    setSelected(next);
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (scanCleanupRef.current) {
      scanCleanupRef.current();
      scanCleanupRef.current = null;
    }

    setScanLoading(true);
    setScanError(null);
    try {
      const { file: processedFile, previewUrl, cleanup } = await preprocessImageForUpload(file);
      scanCleanupRef.current = cleanup;
      setScanPreview(previewUrl);

      const fd = new FormData();
      fd.append('image', processedFile);
      const res = await fetch('/api/equipment/detect', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({ error: 'network_error' }));
      if (!res.ok) {
        const msg = getEquipmentDetectErrorMessage(data?.error, data?.message);
        throw new Error(msg);
      }
      const detected: { equipment_slug: string }[] = data.detected ?? [];
      setSelected((prev) => {
        const next = new Set(prev);
        detected.forEach((d) => next.add(d.equipment_slug));
        return next;
      });
    } catch (err: any) {
      setScanError(err.message ?? 'Không thể phân tích ảnh');
    } finally {
      setScanLoading(false);
    }
  }

  async function save() {
    if (!name.trim()) return;
    setIsSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsSaving(false);
      return;
    }

    try {
      const { data: gym, error } = await supabase
        .from('gyms')
        .insert({ owner_user_id: user.id, name: name.trim(), description: description.trim() || null })
        .select('id')
        .single();

      if (error || !gym) {
        alert('Lỗi lưu phòng gym: ' + (error?.message || 'Không rõ nguyên nhân'));
        setIsSaving(false);
        return;
      }

      // Auto-include bodyweight along with selected physical equipment
      const bodyweightItem = equipment.find((e) => e.slug === 'bodyweight');
      const selectedSlugs = new Set(selected);
      if (bodyweightItem) selectedSlugs.add('bodyweight');

      if (selectedSlugs.size > 0) {
        const eqRows = equipment
          .filter((e) => selectedSlugs.has(e.slug))
          .map((e) => ({ gym_id: gym.id, equipment_id: e.id }));
        await supabase.from('gym_equipment').insert(eqRows);
      }

      router.push(`/gyms/${gym.id}`);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setIsSaving(false);
    }
  }

  const filteredEquipment = equipment.filter((eq) => {
    if (eq.slug === 'bodyweight' || classifyEquipment(eq) === 'no-equipment') return false;

    const matchesSearch =
      (eq.name_vi && eq.name_vi.toLowerCase().includes(searchQuery.toLowerCase())) ||
      eq.slug.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeCategory === 'all') return true;
    if (activeCategory === 'selected') return selected.has(eq.slug);

    const cat = classifyEquipment(eq);
    return cat === activeCategory;
  });

  return (
    <div className="card shadow-neumorph-lg rounded-2xl p-6 space-y-6 border border-white/80 dark:border-white/10">
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)] led-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">
              Bước 01 / 02
            </span>
          </div>

          <h2 className="text-xl font-bold text-ink">Thông tin phòng gym</h2>

          <div className="space-y-1.5">
            <label className="label text-xs font-semibold">Tên phòng tập *</label>
            <input
              className="input font-sans text-sm h-11"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: VinUni Gym, California Fitness, Home Gym..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="label text-xs font-semibold">Mô tả / Ghi chú (tuỳ chọn)</label>
            <textarea
              className="input font-sans text-xs min-h-24 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Phòng gym tại tầng B1, có đầy đủ rack gánh đùi, tạ đơn đến 40kg..."
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!name.trim()}
              className="btn-primary"
            >
              Tiếp theo: Chọn thiết bị →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/[0.04] dark:border-white/[0.06]">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)] led-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">
                  Bước 02 / 02
                </span>
              </div>
              <h2 className="text-lg font-bold text-ink mt-0.5">
                Thiết bị có sẵn ({selected.size}/{equipment.length})
              </h2>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary text-xs py-2 px-3 inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Camera className="h-4 w-4" strokeWidth={1.5} />
              <span>{scanLoading ? 'Đang phân tích...' : 'Chọn ảnh để AI quét'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onPickPhoto}
            />
          </div>

          {scanPreview && (
            <div className="card shadow-inset-sm p-3.5 flex items-center gap-3 bg-chassis-hi border border-accent/30 rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={scanPreview} className="h-12 w-12 rounded-lg object-cover shadow-neumorph-sm" alt="scan" />
              <div className="flex-1 text-xs">
                {scanLoading ? (
                  <span className="inline-flex items-center gap-2 text-ink-secondary font-semibold">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    AI đang phân tích ảnh...
                  </span>
                ) : scanError ? (
                  <span className="text-danger font-mono text-xs font-bold uppercase tracking-wider">ERR: {scanError}</span>
                ) : (
                  <span className="text-success font-semibold flex items-center gap-1">
                    <Sparkles className="h-4 w-4" />
                    Đã tự động chọn các thiết bị phát hiện trong ảnh!
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={clearScanPreview}
                className="text-ink-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Search bar & Category tabs */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" strokeWidth={1.5} />
              <input
                className="input pl-10 h-9 text-xs font-sans rounded-xl"
                placeholder="Tìm nhanh thiết bị..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === 'all'
                    ? 'bg-accent text-white shadow-accent'
                    : 'bg-black/[0.03] dark:bg-white/[0.05] text-ink-secondary hover:text-ink'
                }`}
              >
                Tất cả ({equipment.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('selected')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === 'selected'
                    ? 'bg-accent text-white shadow-accent'
                    : 'bg-black/[0.03] dark:bg-white/[0.05] text-ink-secondary hover:text-ink'
                }`}
              >
                ✓ Đã chọn ({selected.size})
              </button>

              {EQUIPMENT_CATEGORIES.filter((cat) => cat.id !== 'no-equipment').map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeCategory === cat.id
                      ? 'bg-accent text-white shadow-accent'
                      : 'bg-black/[0.03] dark:bg-white/[0.05] text-ink-secondary hover:text-ink'
                  }`}
                >
                  {cat.label_vi}
                </button>
              ))}
            </div>
          </div>

          {/* Equipment Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
            {filteredEquipment.map((eq) => {
              const isChecked = selected.has(eq.slug);
              return (
                <button
                  key={eq.id}
                  type="button"
                  onClick={() => toggle(eq.slug)}
                  className={`p-2.5 rounded-xl text-left border flex items-center justify-between gap-1.5 transition-all ${
                    isChecked
                      ? 'bg-accent/15 border-accent/40 text-accent font-bold shadow-xs'
                      : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.06] text-ink hover:border-black/20'
                  }`}
                >
                  <span className="text-xs truncate">{eq.name_vi ?? eq.slug}</span>
                  <div
                    className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                      isChecked ? 'bg-accent border-accent text-white' : 'border-black/20 text-transparent'
                    }`}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between pt-3 border-t border-black/[0.04] dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-ghost text-xs"
            >
              ← Quay lại
            </button>
            <button
              type="button"
              onClick={save}
              disabled={isSaving}
              className="btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-4 shadow-accent"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>Hoàn tất & Lưu phòng gym</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
