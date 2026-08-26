'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import {
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Image as ImageIcon,
  Layers3,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { EquipmentImage } from '@/components/ui/equipment-image';
import {
  EQUIPMENT_CATEGORIES,
  EquipmentCategoryId,
  WEIGHT_SUBCATEGORIES,
  WeightSubcategoryId,
  classifyEquipment,
  classifyWeightSubcategory,
} from '@/lib/equipment-categories';
import { preprocessImageForUpload } from '@/lib/client-image-preprocess';
import { getEquipmentDetectErrorMessage } from '@/lib/equipment-detect-errors';
import type { EquipmentItem } from './equipment-step';

type PrimaryFilterId =
  | 'all'
  | 'selected'
  | 'weights'
  | Exclude<EquipmentCategoryId, 'barbells' | 'dumbbells' | 'kettlebells'>;

const WEIGHT_CATEGORY_IDS = new Set<EquipmentCategoryId>(['barbells', 'dumbbells', 'kettlebells']);
const WEIGHT_FILTER_IMAGES = [
  '/equipment/categories/dumbbells.png',
  '/equipment/categories/kettlebells.png',
  '/equipment/categories/barbell.png',
];

const WEIGHT_FILTER_META: Record<WeightSubcategoryId, { imagePath: string; label: string }> = {
  dumbbells: { imagePath: '/equipment/categories/dumbbells.png', label: 'Tạ đơn' },
  kettlebells: { imagePath: '/equipment/categories/kettlebells.png', label: 'Tạ ấm' },
  barbells: { imagePath: '/equipment/categories/barbell.png', label: 'Tạ đòn' },
};

type Props = {
  open: boolean;
  equipment: EquipmentItem[];
  selected: string[];
  initialName: string;
  onClose: () => void;
  onSave: (name: string, equipmentIds: string[]) => void;
};

export default function CustomGymSetupModal({
  open,
  equipment,
  selected,
  initialName,
  onClose,
  onSave,
}: Props) {
  const [draftName, setDraftName] = useState('');
  const [draftSelected, setDraftSelected] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<PrimaryFilterId>('all');
  const [activeWeightFilter, setActiveWeightFilter] = useState<WeightSubcategoryId>('dumbbells');
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const previewCleanupRef = useRef<(() => void) | null>(null);

  const bodyweightEquipmentIds = useMemo(
    () => equipment.filter((item) => classifyEquipment(item) === 'no-equipment').map((item) => item.id),
    [equipment],
  );
  const bodyweightEquipmentIdSet = useMemo(() => new Set(bodyweightEquipmentIds), [bodyweightEquipmentIds]);
  const selectableEquipment = useMemo(
    () => equipment.filter((item) => !bodyweightEquipmentIdSet.has(item.id)),
    [bodyweightEquipmentIdSet, equipment],
  );
  const visibleSelectedCount = useMemo(
    () => [...draftSelected].filter((id) => !bodyweightEquipmentIdSet.has(id)).length,
    [bodyweightEquipmentIdSet, draftSelected],
  );

  useEffect(() => {
    if (!open) {
      previewCleanupRef.current?.();
      previewCleanupRef.current = null;
      setScanPreview(null);
      return;
    }
    previewCleanupRef.current?.();
    previewCleanupRef.current = null;
    setScanPreview(null);
    setDraftName(initialName || 'Phòng tập của tôi');
    setDraftSelected(new Set([...selected, ...bodyweightEquipmentIds]));
    setSearchQuery('');
    setActiveFilter('all');
    setActiveWeightFilter('dumbbells');
    setShowImageMenu(false);
    setScanError(null);
    setScanMessage(null);
  }, [open, initialName, selected, bodyweightEquipmentIds]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => nameInputRef.current?.focus(), 80);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !scanLoading) onClose();
    }
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, scanLoading]);

  useEffect(
    () => () => {
      previewCleanupRef.current?.();
    },
    [],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<EquipmentCategoryId, number>();
    equipment.forEach((item) => {
      const category = classifyEquipment(item);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    });
    return counts;
  }, [equipment]);

  const visibleCategories = useMemo(
    () => EQUIPMENT_CATEGORIES.filter(
      (category) => category.id !== 'no-equipment'
        && !WEIGHT_CATEGORY_IDS.has(category.id)
        && (categoryCounts.get(category.id) ?? 0) > 0,
    ),
    [categoryCounts],
  );

  const weightCount = useMemo(
    () => [...WEIGHT_CATEGORY_IDS].reduce((total, category) => total + (categoryCounts.get(category) ?? 0), 0),
    [categoryCounts],
  );

  const weightSubcategoryCounts = useMemo(() => {
    const counts = new Map<WeightSubcategoryId, number>();
    equipment.forEach((item) => {
      const category = classifyEquipment(item);
      if (!WEIGHT_CATEGORY_IDS.has(category)) return;
      const subcategory = classifyWeightSubcategory(item);
      counts.set(subcategory, (counts.get(subcategory) ?? 0) + 1);
    });
    return counts;
  }, [equipment]);

  const filteredEquipment = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('vi');
    return selectableEquipment.filter((item) => {
      if (activeFilter === 'selected' && !draftSelected.has(item.id)) return false;
      if (activeFilter === 'weights') {
        const category = classifyEquipment(item);
        if (!WEIGHT_CATEGORY_IDS.has(category) || classifyWeightSubcategory(item) !== activeWeightFilter) return false;
      } else if (activeFilter !== 'all' && activeFilter !== 'selected') {
        if (classifyEquipment(item) !== activeFilter) return false;
      }
      if (!query) return true;
      return [item.name_vi, item.name, item.slug]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase('vi').includes(query));
    });
  }, [activeFilter, activeWeightFilter, draftSelected, searchQuery, selectableEquipment]);

  function toggleEquipment(id: string) {
    if (bodyweightEquipmentIdSet.has(id)) return;
    setDraftSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearPreview() {
    previewCleanupRef.current?.();
    previewCleanupRef.current = null;
    setScanPreview(null);
    setScanError(null);
    setScanMessage(null);
  }

  async function handleImageFile(file: File) {
    setScanLoading(true);
    setScanError(null);
    setScanMessage(null);
    previewCleanupRef.current?.();
    previewCleanupRef.current = null;

    try {
      const processed = await preprocessImageForUpload(file);
      previewCleanupRef.current = processed.cleanup;
      setScanPreview(processed.previewUrl);

      const formData = new FormData();
      formData.append('image', processed.file);
      const response = await fetch('/api/equipment/detect', { method: 'POST', body: formData });
      const payload = await response.json().catch(() => ({ error: 'network_error' }));
      if (!response.ok) {
        throw new Error(getEquipmentDetectErrorMessage(payload?.error, payload?.message));
      }

      const idsBySlug = new Map(equipment.map((item) => [item.slug, item.id]));
      const detectedIds = (payload.detected ?? [])
        .map((item: { equipment_slug?: string }) => idsBySlug.get(item.equipment_slug ?? ''))
        .filter((id: string | undefined): id is string => Boolean(id) && !bodyweightEquipmentIdSet.has(id!));

      setDraftSelected((current) => {
        const next = new Set(current);
        detectedIds.forEach((id: string) => next.add(id));
        return next;
      });
      setScanMessage(
        detectedIds.length > 0
          ? `AI đã thêm ${detectedIds.length} thiết bị. Hãy kiểm tra lại trước khi lưu.`
          : 'AI chưa nhận diện được thiết bị phù hợp trong ảnh này.',
      );
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Không thể phân tích ảnh thiết bị.');
    } finally {
      setScanLoading(false);
    }
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setShowImageMenu(false);
    if (file) void handleImageFile(file);
  }

  function chooseImageSource(source: 'camera' | 'gallery') {
    setShowImageMenu(false);
    if (source === 'camera') cameraInputRef.current?.click();
    else galleryInputRef.current?.click();
  }

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      // Inline positioning intentionally outranks `.noise-overlay > *`, which
      // otherwise turns body-level portal children back into position: relative.
      style={{ position: 'fixed', inset: 0, zIndex: 120 }}
      className="dark flex items-end justify-center bg-[#05070b]/80 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !scanLoading) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-gym-title"
        className="flex h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[24px] border border-white/10 bg-chassis shadow-[0_28px_90px_rgba(0,0,0,0.62)] sm:h-auto sm:max-h-[92dvh] sm:rounded-[24px]"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-chassis-lo bg-chassis-hi px-4 py-2.5 sm:px-5">
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-ink-muted">
                Phòng tập cá nhân
              </span>
            </div>
            <h3 id="custom-gym-title" className="truncate text-base font-black text-ink">
              Thiết lập phòng tập
            </h3>
          </div>
          <div className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-accent/20 bg-accent/10 px-3">
            <span className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">Đã chọn</span>
            <span className="font-mono text-sm font-black text-accent">{visibleSelectedCount}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={scanLoading}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-chassis-lo text-ink-muted transition-colors hover:border-accent/40 hover:text-ink disabled:opacity-40"
            aria-label="Đóng thiết lập phòng tập"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="space-y-4 p-4 sm:p-5">
            <div className="grid items-end gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-1.5">
                <label htmlFor="custom-gym-name" className="label text-[10px] font-bold">
                  Tên phòng tập
                </label>
                <input
                  ref={nameInputRef}
                  id="custom-gym-name"
                  value={draftName}
                  maxLength={80}
                  onChange={(event) => setDraftName(event.target.value)}
                  className="input min-h-[44px] w-full text-sm font-semibold"
                  placeholder="VD: Phòng tập tại nhà"
                />
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowImageMenu((current) => !current)}
                  disabled={scanLoading}
                  aria-expanded={showImageMenu}
                  aria-haspopup="menu"
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/[0.08] px-4 text-xs font-black text-ink transition-colors hover:border-accent/60 hover:bg-accent/[0.13] disabled:opacity-50 lg:w-auto"
                >
                  {scanLoading ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : <Camera className="h-4 w-4 text-accent" />}
                  Quét ảnh AI
                  <ChevronDown className={clsx('h-3.5 w-3.5 text-ink-muted transition-transform', showImageMenu && 'rotate-180')} />
                </button>
                {showImageMenu && !scanLoading && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+8px)] z-30 grid min-w-[210px] grid-cols-2 gap-1 rounded-xl border border-chassis-lo bg-chassis-hi p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.5)]"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => chooseImageSource('camera')}
                      className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg px-3 text-[11px] font-bold text-ink-secondary hover:bg-accent/10 hover:text-accent"
                    >
                      <Camera className="h-4 w-4" /> Chụp ảnh
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => chooseImageSource('gallery')}
                      className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg px-3 text-[11px] font-bold text-ink-secondary hover:bg-accent/10 hover:text-accent"
                    >
                      <ImageIcon className="h-4 w-4" /> Thư viện
                    </button>
                  </div>
                )}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  onChange={onFileChange}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>
            </div>

            {(scanPreview || scanLoading || scanError || scanMessage) && (
              <div className="flex items-center gap-3 rounded-xl border border-chassis-lo bg-chassis-hi p-3">
                {scanPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={scanPreview} alt="Ảnh phòng tập đang phân tích" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="h-12 w-12 shrink-0 rounded-lg bg-chassis shadow-inset-sm" />
                )}
                <div className="min-w-0 flex-1 text-[11px] leading-relaxed">
                  {scanLoading && (
                    <span className="inline-flex items-center gap-2 font-semibold text-ink-secondary">
                      <Loader2 className="h-4 w-4 animate-spin text-accent" /> AI đang phân tích thiết bị…
                    </span>
                  )}
                  {!scanLoading && scanError && <span className="font-semibold text-danger">{scanError}</span>}
                  {!scanLoading && !scanError && scanMessage && <span className="font-semibold text-success">{scanMessage}</span>}
                </div>
                {!scanLoading && scanPreview && (
                  <button type="button" onClick={clearPreview} className="p-2 text-ink-muted hover:text-ink" aria-label="Bỏ ảnh đã chọn">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            <div className="sticky top-0 z-20 -mx-4 space-y-3 border-y border-chassis-lo bg-chassis/95 px-4 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:-mx-5 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Tìm tạ, ghế, máy cáp…"
                    className="input min-h-[44px] w-full pl-10 pr-10 text-xs"
                    aria-label="Tìm thiết bị"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-ink-muted hover:text-ink"
                      aria-label="Xóa tìm kiếm"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {visibleSelectedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setDraftSelected(new Set(bodyweightEquipmentIds))}
                    className="min-h-[40px] shrink-0 rounded-xl px-3 text-[11px] font-bold text-ink-muted hover:bg-danger/10 hover:text-danger"
                  >
                    Bỏ chọn tất cả
                  </button>
                )}
              </div>

              <div
                className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="tablist"
                aria-label="Nhóm thiết bị"
              >
                <UtilityFilterButton
                  id="all"
                  label="Tất cả"
                  count={selectableEquipment.length}
                  icon={<Layers3 className="h-4 w-4" />}
                  active={activeFilter === 'all'}
                  onClick={setActiveFilter}
                />
                <UtilityFilterButton
                  id="selected"
                  label="Đã chọn"
                  count={visibleSelectedCount}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  active={activeFilter === 'selected'}
                  onClick={setActiveFilter}
                />
                <CategoryFilterButton
                  id="weights"
                  label="Tạ"
                  count={weightCount}
                  imagePaths={WEIGHT_FILTER_IMAGES}
                  active={activeFilter === 'weights'}
                  onClick={setActiveFilter}
                />
                {visibleCategories.map((category) => (
                  <CategoryFilterButton
                    key={category.id}
                    id={category.id as PrimaryFilterId}
                    label={category.label_vi}
                    count={categoryCounts.get(category.id) ?? 0}
                    imagePaths={[category.iconPath]}
                    active={activeFilter === category.id}
                    onClick={setActiveFilter}
                  />
                ))}
              </div>

              {activeFilter === 'weights' && (
                <div className="grid grid-cols-3 gap-2 rounded-2xl border border-accent/20 bg-accent/[0.045] p-2" aria-label="Loại tạ">
                  {WEIGHT_SUBCATEGORIES.map((subcategory) => (
                    <WeightSubcategoryButton
                      key={subcategory.id}
                      id={subcategory.id}
                      label={WEIGHT_FILTER_META[subcategory.id].label}
                      imagePath={WEIGHT_FILTER_META[subcategory.id].imagePath}
                      count={weightSubcategoryCounts.get(subcategory.id) ?? 0}
                      active={activeWeightFilter === subcategory.id}
                      onClick={setActiveWeightFilter}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredEquipment.map((item) => {
                const isSelected = draftSelected.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleEquipment(item.id)}
                    aria-pressed={isSelected}
                    className={clsx(
                      'group relative overflow-hidden rounded-xl border bg-chassis-hi text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      isSelected
                        ? 'border-accent shadow-[0_0_0_1px_rgba(249,115,22,0.45)]'
                        : 'border-chassis-lo hover:-translate-y-0.5 hover:border-accent/35',
                    )}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-white">
                      <EquipmentImage
                        src={item.image_url}
                        slug={item.slug}
                        nameVi={item.name_vi}
                        nameEn={item.name}
                        category={item.category}
                        aspectRatio="4/3"
                        className="h-full w-full rounded-none border-0"
                      />
                      <span
                        className={clsx(
                          'absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border transition-colors',
                          isSelected
                            ? 'border-accent bg-accent text-white shadow-accent'
                            : 'border-black/20 bg-black/35 text-transparent backdrop-blur-sm',
                        )}
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className={clsx('line-clamp-2 text-xs font-bold leading-snug', isSelected ? 'text-accent' : 'text-ink')}>
                        {item.name_vi ?? item.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredEquipment.length === 0 && (
              <div className="rounded-2xl border border-dashed border-chassis-lo py-10 text-center">
                <p className="text-xs font-semibold text-ink-secondary">Không có thiết bị phù hợp bộ lọc.</p>
                <button type="button" onClick={() => { setSearchQuery(''); setActiveFilter('all'); }} className="mt-2 text-[11px] font-bold text-accent">
                  Xóa bộ lọc
                </button>
              </div>
            )}
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-chassis-lo bg-chassis-hi px-4 py-3.5 sm:px-6">
          <p className="hidden text-[10px] leading-relaxed text-ink-muted sm:block">
            AI chỉ thêm gợi ý. Danh sách bạn xác nhận mới được lưu.
          </p>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} disabled={scanLoading} className="btn-ghost min-h-[44px] px-4 text-xs">
              Hủy
            </button>
            <button
              type="button"
              onClick={() => onSave(draftName.trim(), [...draftSelected])}
              disabled={!draftName.trim() || scanLoading}
              className="btn-primary min-h-[44px] px-5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              Lưu phòng tập · {visibleSelectedCount}
            </button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function UtilityFilterButton({
  id,
  label,
  count,
  icon,
  active,
  onClick,
}: {
  id: Extract<PrimaryFilterId, 'all' | 'selected'>;
  label: string;
  count: number;
  icon: React.ReactNode;
  active: boolean;
  onClick: (id: PrimaryFilterId) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onClick(id)}
      className={clsx(
        'inline-flex min-h-[54px] min-w-[108px] shrink-0 items-center gap-2 rounded-xl border px-3 text-left transition-all',
        active
          ? 'border-accent bg-accent text-white shadow-accent'
          : 'border-chassis-lo bg-chassis-hi text-ink-secondary hover:border-accent/35 hover:text-ink',
      )}
    >
      <span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', active ? 'bg-white/15' : 'bg-chassis text-ink-muted')}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-black leading-tight">{label}</span>
        <span className={clsx('mt-1 block font-mono text-[8px]', active ? 'text-white/70' : 'text-ink-muted')}>
          {count} thiết bị
        </span>
      </span>
    </button>
  );
}

function CategoryFilterButton({
  id,
  label,
  count,
  imagePaths,
  active,
  onClick,
}: {
  id: PrimaryFilterId;
  label: string;
  count: number;
  imagePaths: string[];
  active: boolean;
  onClick: (id: PrimaryFilterId) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onClick(id)}
      className={clsx(
        'group inline-flex min-h-[54px] min-w-[128px] shrink-0 items-center gap-2 rounded-xl border px-2.5 text-left transition-all',
        active
          ? 'border-accent bg-accent/15 text-ink shadow-[0_0_0_1px_rgba(249,115,22,0.35)]'
          : 'border-chassis-lo bg-chassis-hi text-ink-secondary hover:border-accent/35 hover:text-ink',
      )}
    >
      {imagePaths.length === 1 ? (
        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white">
          <Image src={imagePaths[0]} alt="" fill sizes="36px" className="object-cover" />
        </span>
      ) : (
        <span className="relative flex h-9 w-[46px] shrink-0 items-center">
          {imagePaths.map((path, index) => (
            <span
              key={path}
              className="relative h-7 w-7 overflow-hidden rounded-full border border-chassis-hi bg-white shadow-sm"
              style={{ marginLeft: index === 0 ? 0 : -9, zIndex: imagePaths.length - index }}
            >
              <Image src={path} alt="" fill sizes="28px" className="object-cover" />
            </span>
          ))}
        </span>
      )}
      <span className="min-w-0">
        <span className={clsx('block truncate text-[10px] font-black leading-tight', active && 'text-accent')}>{label}</span>
        <span className="mt-1 block font-mono text-[8px] text-ink-muted">{count} thiết bị</span>
      </span>
    </button>
  );
}

function WeightSubcategoryButton({
  id,
  label,
  imagePath,
  count,
  active,
  onClick,
}: {
  id: WeightSubcategoryId;
  label: string;
  imagePath: string;
  count: number;
  active: boolean;
  onClick: (id: WeightSubcategoryId) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onClick(id)}
      className={clsx(
        'flex min-h-[52px] min-w-0 items-center gap-2 rounded-xl border px-2 text-left transition-all',
        active
          ? 'border-accent bg-accent text-white shadow-accent'
          : 'border-transparent bg-chassis-hi text-ink-secondary hover:border-accent/30 hover:text-ink',
      )}
    >
      <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-white">
        <Image src={imagePath} alt="" fill sizes="32px" className="object-cover" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-black">{label}</span>
        <span className={clsx('mt-0.5 block font-mono text-[8px]', active ? 'text-white/70' : 'text-ink-muted')}>
          {count}
        </span>
      </span>
    </button>
  );
}
