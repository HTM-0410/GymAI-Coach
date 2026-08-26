'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { EquipmentImage } from '@/components/ui/equipment-image';
import {
  ChevronLeft,
  Trash2,
  Edit2,
  Plus,
  Camera,
  Loader2,
  X,
  Search,
  Dumbbell,
  Sparkles,
  MapPin,
  Save,
  Check,
  Layers,
  CheckCircle2,
  Activity,
  Box,
  CircleDot,
  Zap,
  User,
  MoreHorizontal,
  TrendingUp,
  GitBranch,
  Cog,
  CheckSquare,
  Square,
  Scale,
  ZoomIn,
  Maximize2,
} from 'lucide-react';
import {
  EQUIPMENT_CATEGORIES,
  WEIGHT_SUBCATEGORIES,
  EquipmentCategoryId,
  classifyEquipment,
  classifyWeightSubcategory,
} from '@/lib/equipment-categories';
import { preprocessImageForUpload } from '@/lib/client-image-preprocess';
import { getEquipmentDetectErrorMessage } from '@/lib/equipment-detect-errors';

type EquipmentItem = {
  id: string;
  slug: string;
  name?: string | null;
  name_vi: string | null;
  category: string | null;
  image_url?: string | null;
};

type ScanDetectedItem = {
  equipment_slug: string;
  quantity: number;
  confidence: number;
  evidence_vi: string;
  selected: boolean;
};

type ScanDumbbellItem = {
  raw_weight: number;
  raw_unit: 'kg' | 'lb';
  weight_kg: number;
  quantity: number;
  confidence: number;
  label_read: string;
};

type ScanResult = {
  scanId: string | null;
  detected: ScanDetectedItem[];
  dumbbells: ScanDumbbellItem[];
};

type GymDetailProps = {
  gym: {
    id: string;
    name: string;
    description: string | null;
    gym_equipment: {
      equipment_id: string;
      quantity?: number;
      equipment: {
        id?: string;
        slug: string;
        name?: string | null;
        name_vi: string | null;
        category?: string | null;
        image_url?: string | null;
      } | null;
    }[];
  };
  allEquipment: EquipmentItem[];
  inventoryCard: React.ReactNode;
};

// Map category icon components
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'all': Layers,
  'selected': CheckCircle2,
  'weights': Dumbbell,
  'cables': GitBranch,
  'machines': Cog,
  'bands': Activity,
  'bench': Box,
  'pull-up-dip': TrendingUp,
  'balls': CircleDot,
  'cardio-machines': Zap,
  'accessories': Box,
  'no-equipment': User,
  'other': MoreHorizontal,
};
// Memoized Card component for modal grid to guarantee fast renders and 0 lag across 107 items
const ModalEquipmentCard = React.memo(function ModalEquipmentCard({
  item,
  isChecked,
  disabled,
  onToggle,
  onZoom,
}: {
  item: EquipmentItem;
  isChecked: boolean;
  disabled: boolean;
  onToggle: (item: EquipmentItem) => void;
  onZoom: (item: EquipmentItem) => void;
}) {
  return (
    <div
      onClick={() => onToggle(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onToggle(item);
        }
      }}
      aria-pressed={isChecked}
      aria-disabled={disabled}
      className={`p-3.5 rounded-2xl text-left border flex items-center gap-3.5 transition-all duration-150 group relative select-none cursor-pointer ${
        isChecked
          ? 'bg-accent/[0.08] border-accent shadow-sm dark:bg-accent/15 dark:border-accent ring-1 ring-accent/30'
          : 'bg-white dark:bg-[#141b26] border-black/[0.06] dark:border-white/[0.08] text-ink dark:text-slate-100 hover:border-accent/40 dark:hover:border-accent/40 hover:bg-slate-50/80 dark:hover:bg-[#172030]'
      }`}
    >
      {/* Visual Thumbnail with Zoom Action */}
      <div className="relative shrink-0 group/img">
        <EquipmentImage
          src={item.image_url}
          slug={item.slug}
          nameVi={item.name_vi}
          nameEn={item.name}
          category={item.category}
          size="md"
          aspectRatio="4/3"
          className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] shadow-2xs w-20 h-15 sm:w-24 sm:h-18 shrink-0"
        />

        {/* Zoom In Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onZoom(item);
          }}
          className="absolute inset-0 m-auto h-7 w-7 rounded-lg bg-black/60 hover:bg-accent text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 focus:opacity-100 transition-all duration-150 shadow-md backdrop-blur-xs"
          aria-label={`Phóng to ảnh ${item.name_vi || item.name || item.slug}`}
          title="Phóng to ảnh"
        >
          <ZoomIn className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      </div>

      {/* Equipment Details - Full display with break-words without ellipsis cut-off */}
      <div className="flex-1 min-w-0 py-0.5">
        <div
          className={`text-xs sm:text-sm tracking-tight leading-snug transition-colors break-words ${
            isChecked
              ? 'font-bold text-accent dark:text-accent'
              : 'font-semibold text-ink dark:text-slate-100 group-hover:text-accent'
          }`}
        >
          {item.name_vi || item.name || item.slug}
        </div>
        <div className="font-mono text-[10px] text-ink-muted dark:text-slate-400 uppercase tracking-wider mt-1 break-words">
          {item.name || item.slug}
        </div>
      </div>

      {/* Right Checkbox */}
      <div
        className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
          isChecked
            ? 'bg-accent border-accent text-white shadow-xs'
            : 'border-black/20 dark:border-white/20 text-transparent group-hover:border-accent/50 bg-black/[0.02] dark:bg-white/[0.02]'
        }`}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </div>
    </div>
  );
});

export default function GymDetailClient({ gym, allEquipment, inventoryCard }: GymDetailProps) {
  const router = useRouter();
  const [name, setName] = useState(gym.name);
  const [description, setDescription] = useState(gym.description || '');
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  // Selected equipment IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(gym.gym_equipment.map((ge) => ge.equipment_id)),
  );
  const [isUpdatingEq, setIsUpdatingEq] = useState(false);
  const [previewEquipment, setPreviewEquipment] = useState<EquipmentItem | null>(null);

  // Modal State for Adding Equipment
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // AI Camera Scan inside Modal
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isConfirmingScan, setIsConfirmingScan] = useState(false);
  const [scanConfirmed, setScanConfirmed] = useState(false);
  const [isCustomEquipmentOpen, setIsCustomEquipmentOpen] = useState(false);
  const [customEquipmentName, setCustomEquipmentName] = useState('');
  const [customEquipmentFile, setCustomEquipmentFile] = useState<File | null>(null);
  const [customEquipmentPreview, setCustomEquipmentPreview] = useState<string | null>(null);
  const [isSubmittingCustomEquipment, setIsSubmittingCustomEquipment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customFileInputRef = useRef<HTMLInputElement>(null);

  // Delete modal state
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Handle Remove single equipment directly from main view
  async function handleRemoveEquipment(eqId: string) {
    const next = new Set(selectedIds);
    next.delete(eqId);
    setSelectedIds(next);

    const supabase = createClient();
    try {
      await supabase
        .from('gym_equipment')
        .delete()
        .eq('gym_id', gym.id)
        .eq('equipment_id', eqId);
    } catch (err) {
      console.error('Error removing equipment:', err);
    }
  }

  // Handle Toggle inside Modal with instant optimistic update
  const toggleEquipmentInModal = useCallback(async (eq: EquipmentItem) => {
    const supabase = createClient();

    setSelectedIds((prev) => {
      const next = new Set(prev);
      const isCurrentlySelected = next.has(eq.id);
      if (isCurrentlySelected) {
        next.delete(eq.id);
        supabase
          .from('gym_equipment')
          .delete()
          .eq('gym_id', gym.id)
          .eq('equipment_id', eq.id)
          .then(({ error }) => {
            if (error) console.error('Error removing equipment:', error);
          });
      } else {
        next.add(eq.id);
        supabase
          .from('gym_equipment')
          .insert({ gym_id: gym.id, equipment_id: eq.id })
          .then(({ error }) => {
            if (error) console.error('Error adding equipment:', error);
          });
      }
      return next;
    });
  }, [gym.id]);

  // Bulk Select/Deselect all items currently filtered in category
  async function handleSelectAllInView(items: EquipmentItem[], shouldSelect: boolean) {
    const next = new Set(selectedIds);
    const supabase = createClient();
    setIsUpdatingEq(true);

    try {
      if (shouldSelect) {
        const toAdd: { gym_id: string; equipment_id: string }[] = [];
        items.forEach((item) => {
          if (!next.has(item.id)) {
            next.add(item.id);
            toAdd.push({ gym_id: gym.id, equipment_id: item.id });
          }
        });
        if (toAdd.length > 0) {
          await supabase.from('gym_equipment').insert(toAdd);
        }
      } else {
        const idsToRemove = items.map((i) => i.id).filter((id) => next.has(id));
        idsToRemove.forEach((id) => next.delete(id));
        if (idsToRemove.length > 0) {
          await supabase
            .from('gym_equipment')
            .delete()
            .eq('gym_id', gym.id)
            .in('equipment_id', idsToRemove);
        }
      }
      setSelectedIds(next);
    } catch (err) {
      console.error('Error bulk updating:', err);
    } finally {
      setIsUpdatingEq(false);
    }
  }

  // Save Name & Description
  async function handleSaveInfo() {
    if (!name.trim()) return;
    setIsSavingInfo(true);
    const supabase = createClient();
    try {
      await supabase
        .from('gyms')
        .update({ name: name.trim(), description: description.trim() || null })
        .eq('id', gym.id);
      setIsEditingInfo(false);
      router.refresh();
    } catch (err) {
      console.error('Error saving gym info:', err);
    } finally {
      setIsSavingInfo(false);
    }
  }

  // Delete Gym
  async function handleDeleteGym() {
    setIsDeleting(true);
    const supabase = createClient();
    try {
      await supabase.from('gym_equipment').delete().eq('gym_id', gym.id);
      await supabase.from('gyms').delete().eq('id', gym.id);
      router.push('/gyms');
      router.refresh();
    } catch (err) {
      console.error('Error deleting gym:', err);
      setIsDeleting(false);
    }
  }

  const scanCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => scanCleanupRef.current?.(), []);

  function clearScanPreview() {
    scanCleanupRef.current?.();
    scanCleanupRef.current = null;
    setScanPreview(null);
  }

  // AI Photo Scan
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
    setScanResult(null);
    setScanConfirmed(false);
    try {
      const { file: processedFile, previewUrl, cleanup } = await preprocessImageForUpload(file);
      scanCleanupRef.current = cleanup;
      setScanPreview(previewUrl);

      const fd = new FormData();
      fd.append('image', processedFile);
      fd.append('gymId', gym.id);
      const res = await fetch('/api/equipment/detect', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({ error: 'network_error' }));
      if (!res.ok) {
        const msg = getEquipmentDetectErrorMessage(data?.error, data?.message);
        throw new Error(msg);
      }
      setScanResult({
        scanId: data.scanId ?? null,
        detected: (data.detected ?? []).map((item: Omit<ScanDetectedItem, 'selected'>) => ({
          ...item,
          selected: item.confidence >= 0.5,
        })),
        dumbbells: data.dumbbells ?? [],
      });
    } catch (err: any) {
      setScanError(err.message ?? 'Không thể phân tích ảnh');
    } finally {
      setScanLoading(false);
    }
  }

  async function confirmScanResult() {
    if (!scanResult) return;
    setIsConfirmingScan(true);
    setScanError(null);
    const supabase = createClient();

    try {
      const selectedDetected = scanResult.detected.filter((item) => item.selected);
      const detectedMap = new Map(selectedDetected.map((item) => [item.equipment_slug, item]));

      if (scanResult.dumbbells.length > 0) {
        const detectedDumbbell = detectedMap.get('dumbbell');
        detectedMap.set('dumbbell', {
          equipment_slug: 'dumbbell',
          quantity: scanResult.dumbbells.reduce((sum, item) => sum + item.quantity, 0),
          confidence: Math.max(...scanResult.dumbbells.map((item) => item.confidence)),
          evidence_vi: detectedDumbbell?.evidence_vi ?? 'Có mức trọng lượng tạ đơn đã được xác nhận.',
          selected: true,
        });
      }

      const equipmentRows = [...detectedMap.values()].flatMap((item) => {
        const equipment = allEquipment.find((candidate) => candidate.slug === item.equipment_slug);
        return equipment ? [{ gym_id: gym.id, equipment_id: equipment.id, quantity: item.quantity }] : [];
      });

      if (equipmentRows.length > 0) {
        const { error: equipmentError } = await supabase
          .from('gym_equipment')
          .upsert(equipmentRows, { onConflict: 'gym_id,equipment_id' });
        if (equipmentError) throw equipmentError;
      }

      if (scanResult.dumbbells.length > 0) {
        const { error: inventoryError } = await supabase
          .from('gym_dumbbell_inventory')
          .upsert(
            scanResult.dumbbells.map((item) => ({
              gym_id: gym.id,
              weight_kg: item.weight_kg,
              quantity: item.quantity,
            })),
            { onConflict: 'gym_id,weight_kg' },
          );
        if (inventoryError) throw inventoryError;
      }

      if (scanResult.scanId) {
        const { error: scanStatusError } = await supabase
          .from('equipment_scans')
          .update({ status: 'accepted' })
          .eq('id', scanResult.scanId);
        if (scanStatusError) throw scanStatusError;
      }

      const next = new Set(selectedIds);
      equipmentRows.forEach((row) => next.add(row.equipment_id));
      setSelectedIds(next);
      setScanConfirmed(true);
      setScanResult(null);
      router.refresh();
    } catch (err: any) {
      setScanError(err?.message ?? 'Không thể lưu kết quả nhận diện.');
    } finally {
      setIsConfirmingScan(false);
    }
  }

  function onPickCustomEquipmentPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomEquipmentFile(file);
    setCustomEquipmentPreview(URL.createObjectURL(file));
  }

  async function submitCustomEquipment() {
    if (!customEquipmentName.trim() || !customEquipmentFile) {
      setScanError('Hãy nhập tên và chụp ảnh thiết bị trước khi gửi.');
      return;
    }
    setIsSubmittingCustomEquipment(true);
    setScanError(null);
    try {
      const form = new FormData();
      form.append('gymId', gym.id);
      form.append('name', customEquipmentName.trim());
      form.append('image', customEquipmentFile);
      const response = await fetch('/api/equipment/custom', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Không thể lưu thiết bị mới.');

      if (data.equipment?.id) {
        setSelectedIds((current) => new Set(current).add(data.equipment.id));
      }
      setScanConfirmed(true);
      setScanResult(null);
      setIsCustomEquipmentOpen(false);
      setCustomEquipmentName('');
      setCustomEquipmentFile(null);
      setCustomEquipmentPreview(null);
      router.refresh();
    } catch (err: any) {
      setScanError(err?.message ?? 'Không thể lưu thiết bị mới.');
    } finally {
      setIsSubmittingCustomEquipment(false);
    }
  }

  // Physical equipment list (excludes bodyweight as it is implicitly available everywhere)
  const physicalEquipmentList = useMemo(
    () => allEquipment.filter((eq) => eq.slug !== 'bodyweight' && classifyEquipment(eq) !== 'no-equipment'),
    [allEquipment],
  );

  // Group active physical equipment by category for the main display
  const activeEquipmentList = useMemo(
    () => physicalEquipmentList.filter((eq) => selectedIds.has(eq.id)),
    [physicalEquipmentList, selectedIds],
  );

  const visibleSelectedCount = activeEquipmentList.length;

  const activeGroupedByCategory: { [catId: string]: { label: string; items: EquipmentItem[] } } = useMemo(() => {
    const grouped: { [catId: string]: { label: string; items: EquipmentItem[] } } = {};
    activeEquipmentList.forEach((eq) => {
      const catId = classifyEquipment(eq);
      const catMeta = EQUIPMENT_CATEGORIES.find((c) => c.id === catId);
      const catLabel = catMeta?.label_vi || 'Thiết bị khác';

      if (!grouped[catId]) {
        grouped[catId] = { label: catLabel, items: [] };
      }
      grouped[catId].items.push(eq);
    });
    return grouped;
  }, [activeEquipmentList]);

  // Count all available physical equipment per category; selected count has its own row.
  const categoryEquipmentCounts: Record<string, number> = useMemo(() => {
    const counts: Record<string, number> = {};
    physicalEquipmentList.forEach((eq) => {
      const catId = classifyEquipment(eq);
      counts[catId] = (counts[catId] || 0) + 1;
    });
    return counts;
  }, [physicalEquipmentList]);

  // Modal filtered equipment with multi-field search (name_vi, name, slug)
  const modalFilteredEquipment = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return physicalEquipmentList.filter((eq) => {
      const matchesSearch =
        !q ||
        (eq.name_vi && eq.name_vi.toLowerCase().includes(q)) ||
        (eq.name && eq.name.toLowerCase().includes(q)) ||
        eq.slug.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (activeCategory === 'all') return true;
      if (activeCategory === 'selected') return selectedIds.has(eq.id);

      const cat = classifyEquipment(eq);
      return cat === activeCategory;
    });
  }, [physicalEquipmentList, searchQuery, activeCategory, selectedIds]);

  const allFilteredSelected =
    modalFilteredEquipment.length > 0 &&
    modalFilteredEquipment.every((eq) => selectedIds.has(eq.id));

  const modalWeightSections = useMemo(() => {
    return WEIGHT_SUBCATEGORIES.map((section) => ({
      ...section,
      items: modalFilteredEquipment.filter((eq) => classifyWeightSubcategory(eq) === section.id),
    })).filter((section) => section.items.length > 0);
  }, [modalFilteredEquipment]);

  const renderModalEquipmentCard = (eq: EquipmentItem) => (
    <ModalEquipmentCard
      key={eq.id}
      item={eq}
      isChecked={selectedIds.has(eq.id)}
      disabled={isUpdatingEq}
      onToggle={toggleEquipmentInModal}
      onZoom={setPreviewEquipment}
    />
  );

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-24 space-y-6">
      {/* ── TOP BREADCRUMB & DELETE ACTION ── */}
      <div className="flex items-center justify-between">
        <Link
          href="/gyms"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-accent transition-colors bg-chassis border border-black/[0.06] dark:border-white/[0.08] px-3 py-1.5 rounded-lg shadow-neumorph-sm"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          <span>Danh sách phòng gym</span>
        </Link>

        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-danger hover:bg-danger/10 border border-danger/20 px-3 py-1.5 rounded-lg transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>Xóa Gym</span>
        </button>
      </div>

      {/* ── GYM HEADER HERO CARD ── */}
      <div className="card shadow-neumorph rounded-2xl p-6 border border-white/80 dark:border-white/10 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-5">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-accent to-accent-dim text-white flex items-center justify-center shadow-accent shrink-0">
              <MapPin className="h-7 w-7" strokeWidth={1.75} />
            </div>

            <div className="flex-1 min-w-0">
              {isEditingInfo ? (
                <div className="space-y-3">
                  <div>
                    <label className="font-mono text-[10px] uppercase font-bold text-ink-muted block mb-1">
                      Tên phòng gym
                    </label>
                    <input
                      className="input h-10 text-sm font-sans"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="VD: VinUni Gym..."
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] uppercase font-bold text-ink-muted block mb-1">
                      Mô tả / Ghi chú
                    </label>
                    <textarea
                      className="input min-h-16 text-xs resize-none font-sans"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="VD: Tầng B1, mở cửa 6h-22h..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveInfo}
                      disabled={isSavingInfo || !name.trim()}
                      className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1"
                    >
                      {isSavingInfo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Lưu thay đổi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setName(gym.name);
                        setDescription(gym.description || '');
                        setIsEditingInfo(false);
                      }}
                      className="btn-ghost text-xs py-1.5 px-3"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="h-2 w-2 rounded-full bg-success led-pulse" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted font-bold">
                      Gym Profile
                    </span>
                  </div>
                  <h1 className="text-2xl font-extrabold text-ink tracking-tight flex items-center gap-2">
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => setIsEditingInfo(true)}
                      className="text-ink-muted hover:text-accent p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      title="Chỉnh sửa thông tin"
                    >
                      <Edit2 className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </h1>
                  <p className="text-xs text-ink-secondary mt-1 font-medium leading-relaxed">
                    {description || 'Chưa có mô tả cho phòng gym này.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action CTA Buttons */}
          <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-2.5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-black/[0.04] dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary text-xs py-2.5 px-4 inline-flex items-center gap-2 shadow-accent w-full sm:w-auto justify-center"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              <span>Thêm thiết bị mới</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(true);
                setTimeout(() => fileInputRef.current?.click(), 150);
              }}
              className="btn-ghost text-xs py-2 px-3 inline-flex items-center gap-1.5 border border-accent/30 text-accent hover:bg-accent/10 w-full sm:w-auto justify-center"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Quét AI từ ảnh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── SECTION: THIẾT BỊ HIỆN CÓ TẠI PHÒNG GYM (DEDICATED VISUAL VIEW) ── */}
      <div className="card shadow-neumorph rounded-2xl p-6 border border-white/80 dark:border-white/10 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.04] dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center border border-accent/30 shadow-xs">
              <Dumbbell className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink tracking-tight flex items-center gap-2">
                <span>Thiết bị hiện có trong phòng</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 font-bold">
                  {visibleSelectedCount} món
                </span>
              </h2>
              <p className="text-xs text-ink-secondary mt-0.5 font-medium">
                Các thiết bị này sẽ được AI ưu tiên sử dụng khi tạo giáo án luyện tập.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="text-xs font-bold text-accent hover:text-accent-dim inline-flex items-center gap-1 hover:underline"
          >
            <span>+ Thêm / Chỉnh sửa</span>
            <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
          </button>
        </div>

        {/* ── CURRENT EQUIPMENT GROUPED BY CATEGORY ── */}
        {visibleSelectedCount > 0 ? (
          <div className="space-y-6">
            {Object.entries(activeGroupedByCategory).map(([catId, { label, items }]) => {
              const IconComp = CATEGORY_ICONS[catId] || Dumbbell;
              return (
                <div key={catId} className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <IconComp className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
                    <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
                      {label} ({items.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {items.map((eq) => (
                      <div
                        key={eq.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-[#111722] border border-black/[0.06] dark:border-white/[0.08] flex items-center gap-3.5 group hover:border-accent/40 hover:shadow-neumorph-sm transition-all relative overflow-hidden shadow-2xs"
                      >
                        <div className="relative shrink-0 group/img">
                          <EquipmentImage
                            src={eq.image_url}
                            slug={eq.slug}
                            nameVi={eq.name_vi}
                            nameEn={eq.name}
                            category={eq.category}
                            size="md"
                            aspectRatio="4/3"
                            className="rounded-xl border border-black/[0.04] dark:border-white/[0.06] shadow-2xs w-20 h-15 sm:w-22 sm:h-16.5 shrink-0"
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewEquipment(eq)}
                            className="absolute inset-0 m-auto h-7 w-7 rounded-lg bg-black/60 hover:bg-accent text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 focus:opacity-100 transition-all duration-150 shadow-md backdrop-blur-xs"
                            aria-label={`Phóng to ảnh ${eq.name_vi || eq.name || eq.slug}`}
                            title="Phóng to ảnh"
                          >
                            <ZoomIn className="h-3.5 w-3.5" strokeWidth={2.25} />
                          </button>
                        </div>

                        <div className="min-w-0 flex-1 py-0.5">
                          <div className="text-xs font-bold text-ink dark:text-slate-100 tracking-tight leading-snug break-words group-hover:text-accent transition-colors">
                            {eq.name_vi || eq.name || eq.slug}
                          </div>
                          <div className="font-mono text-[9px] text-ink-muted dark:text-slate-400 uppercase tracking-wider truncate mt-1">
                            {eq.name || eq.slug}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveEquipment(eq.id)}
                          className="h-7 w-7 rounded-lg text-ink-muted hover:text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 flex items-center justify-center transition-all shrink-0 self-center opacity-80 group-hover:opacity-100"
                          aria-label={`Bỏ ${eq.name_vi || eq.slug} khỏi phòng gym`}
                          title="Bỏ thiết bị này khỏi phòng gym"
                        >
                          <X className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12 space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-ink-muted flex items-center justify-center mx-auto">
              <Layers className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">Phòng gym này chưa có thiết bị nào</h3>
              <p className="text-xs text-ink-secondary mt-1 max-w-sm mx-auto">
                Bấm vào nút bên dưới để chọn các thiết bị hoặc chụp ảnh phòng gym để AI quét tự động.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Mở danh sách thêm thiết bị</span>
            </button>
          </div>
        )}
      </div>

      {inventoryCard}

      {/* ── REDESIGNED HIGH-TECH 2-COLUMN MODAL: THÊM THIẾT BỊ VÀO PHÒNG GYM ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="shadow-2xl rounded-2xl max-w-4xl w-full border border-black/10 dark:border-white/10 bg-white dark:bg-[#0c1017] flex flex-col h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Top Header */}
            <div className="p-4 sm:p-5 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-slate-50 dark:bg-[#111722]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center border border-accent/30 shadow-xs shrink-0">
                  <Plus className="h-5 w-5" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-ink dark:text-white tracking-tight">
                    Chọn thiết bị cho &quot;{name}&quot;
                  </h2>
                  <p className="text-xs text-ink-secondary dark:text-slate-400 mt-0.5">
                    Đã tích chọn: <strong className="text-accent font-mono">{visibleSelectedCount}</strong> / {physicalEquipmentList.length} thiết bị
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Chọn ảnh từ thư viện để AI quét thiết bị"
                  className="btn-ghost text-xs py-1.5 px-3 inline-flex items-center gap-1.5 border border-accent/30 text-accent hover:bg-accent/10 shrink-0"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>{scanLoading ? 'Đang quét...' : 'Chọn ảnh AI quét'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onPickPhoto}
                />
                <input
                  ref={customFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  onChange={onPickCustomEquipmentPhoto}
                />

                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* AI Scan Feedback Alert */}
            {scanPreview && (
              <div className="p-3 mx-4 sm:mx-5 mt-3 card shadow-inset-sm flex items-center gap-3 bg-chassis-hi border border-accent/30 rounded-xl shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={scanPreview} className="h-10 w-10 rounded-lg object-cover shadow-neumorph-sm" alt="scan" />
                <div className="flex-1 text-xs">
                  {scanLoading ? (
                    <span className="inline-flex items-center gap-2 text-ink-secondary font-semibold">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                      AI đang phân tích ảnh...
                    </span>
                  ) : scanError ? (
                    <span className="text-danger font-mono text-xs font-bold uppercase">ERR: {scanError}</span>
                  ) : scanConfirmed ? (
                    <span className="text-success font-semibold flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      Đã xác nhận và lưu thiết bị cùng kho tạ đơn.
                    </span>
                  ) : scanResult ? (
                    <span className="text-accent font-semibold flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      Đã nhận diện xong. Hãy kiểm tra trước khi lưu.
                    </span>
                  ) : (
                    <span className="text-ink-secondary font-semibold">Chưa có kết quả nhận diện.</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={clearScanPreview}
                  className="text-ink-muted hover:text-ink p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {scanResult && !scanLoading && (
              <div className="mx-4 sm:mx-5 mt-3 rounded-xl border border-accent/25 bg-accent/[0.04] p-3 space-y-3 shrink-0 max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-ink">Xác Nhận Kết Quả AI</h3>
                    <p className="text-[10px] text-ink-muted mt-0.5">Bỏ chọn mapping sai và sửa số lượng trước khi lưu vào phòng.</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsCustomEquipmentOpen(true)}
                      className="btn-ghost text-[10px] py-1.5 px-2.5 inline-flex items-center gap-1 border border-accent/30 text-accent"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Không nhận diện được? Thêm thiết bị
                    </button>
                    <button type="button" onClick={confirmScanResult} disabled={isConfirmingScan} className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
                    {isConfirmingScan ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Xác Nhận & Lưu
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {scanResult.detected.map((item, index) => {
                    const equipment = allEquipment.find((candidate) => candidate.slug === item.equipment_slug);
                    return (
                      <label key={`${item.equipment_slug}-${index}`} className={`rounded-xl border p-2.5 flex items-center gap-3 cursor-pointer transition-all ${item.selected ? 'border-accent/40 bg-white/90 dark:bg-white/[0.06] shadow-xs' : 'border-black/[0.06] dark:border-white/[0.06] opacity-60'}`}>
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => setScanResult((current) => current ? ({
                            ...current,
                            detected: current.detected.map((row, rowIndex) => rowIndex === index ? { ...row, selected: e.target.checked } : row),
                          }) : current)}
                          className="accent-[#f97316]"
                        />
                        <EquipmentImage
                          src={equipment?.image_url}
                          slug={item.equipment_slug}
                          nameVi={equipment?.name_vi}
                          nameEn={equipment?.name}
                          category={equipment?.category}
                          size="xs"
                          aspectRatio="4/3"
                          className="rounded-lg shrink-0 border border-black/[0.04] dark:border-white/[0.06]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-ink dark:text-slate-100 truncate">{equipment?.name_vi ?? item.equipment_slug}</div>
                          <div className="text-[9px] text-ink-muted dark:text-slate-400 truncate">{Math.round(item.confidence * 100)}% · {item.evidence_vi}</div>
                        </div>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={item.quantity}
                          onChange={(e) => setScanResult((current) => current ? ({
                            ...current,
                            detected: current.detected.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Math.max(1, Number(e.target.value) || 1) } : row),
                          }) : current)}
                          className="input h-8 w-16 px-2 text-center text-xs"
                          aria-label={`Số lượng ${equipment?.name_vi ?? item.equipment_slug}`}
                        />
                      </label>
                    );
                  })}
                </div>

                {scanResult.dumbbells.length > 0 && (
                  <div className="rounded-lg border border-accent/20 bg-white/60 dark:bg-white/[0.03] p-2.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                      <Scale className="h-3.5 w-3.5" />
                      Trọng Lượng Tạ Đơn Đã Chuẩn Hóa
                    </div>
                    {scanResult.dumbbells.map((item, index) => (
                      <div key={`${item.weight_kg}-${index}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-xs">
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-ink">{item.label_read || `${item.raw_weight} ${item.raw_unit}`}</span>
                          {item.raw_unit === 'lb' && <span className="text-ink-muted"> → {item.weight_kg} kg</span>}
                          <span className="text-[9px] text-ink-muted ml-1">({Math.round(item.confidence * 100)}%)</span>
                        </div>
                        <input
                          type="number"
                          min="0.25"
                          max="200"
                          step="0.01"
                          value={item.weight_kg}
                          onChange={(e) => setScanResult((current) => current ? ({
                            ...current,
                            dumbbells: current.dumbbells.map((row, rowIndex) => rowIndex === index ? { ...row, weight_kg: Math.max(0.25, Number(e.target.value) || 0.25) } : row),
                          }) : current)}
                          className="input h-8 w-24 px-2 text-center font-mono text-xs"
                          aria-label={`Trọng lượng tạ đơn dòng ${index + 1}`}
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            value={item.quantity}
                            onChange={(e) => setScanResult((current) => current ? ({
                              ...current,
                              dumbbells: current.dumbbells.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Math.max(1, Number(e.target.value) || 1) } : row),
                            }) : current)}
                            className="input h-8 w-16 px-2 text-center text-xs"
                            aria-label={`Số lượng tạ đơn dòng ${index + 1}`}
                          />
                          <span className="text-[9px] text-ink-muted">quả</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {scanResult.detected.length === 0 && scanResult.dumbbells.length === 0 && (
                  <p className="text-xs text-ink-secondary text-center py-2">Không thấy thiết bị đủ rõ để mapping. Hãy chụp gần hơn và đủ sáng.</p>
                )}
              </div>
            )}

            {isCustomEquipmentOpen && (
              <div className="mx-4 sm:mx-5 mt-3 rounded-xl border border-accent/30 bg-accent/[0.04] p-3 space-y-3 shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-ink dark:text-white">Thêm thiết bị chưa có trong hệ thống</h3>
                    <p className="text-[10px] text-ink-muted mt-0.5">Chụp rõ toàn bộ thiết bị, đặt tên để lưu riêng vào phòng và gửi yêu cầu bổ sung cho admin.</p>
                  </div>
                  <button type="button" onClick={() => setIsCustomEquipmentOpen(false)} className="p-1 text-ink-muted hover:text-ink" aria-label="Đóng form thêm thiết bị">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2.5 items-end">
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Tên thiết bị</span>
                    <input
                      value={customEquipmentName}
                      onChange={(e) => setCustomEquipmentName(e.target.value)}
                      placeholder="Ví dụ: Máy kéo cáp đôi"
                      maxLength={120}
                      className="input h-9 w-full text-xs"
                    />
                  </label>
                  <button type="button" onClick={() => customFileInputRef.current?.click()} className="btn-ghost h-9 px-3 text-xs inline-flex items-center justify-center gap-1.5 border border-accent/30 text-accent">
                    <Camera className="h-3.5 w-3.5" />
                    {customEquipmentFile ? 'Chụp lại ảnh' : 'Chụp thiết bị'}
                  </button>
                </div>
                {customEquipmentPreview && (
                  <div className="flex items-center gap-2 text-[10px] text-ink-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={customEquipmentPreview} alt="Ảnh thiết bị mới" className="h-14 w-20 rounded-lg object-cover border border-accent/20" />
                    <span>Ảnh sẽ được gửi kèm yêu cầu để admin xem xét.</span>
                  </div>
                )}
                <button type="button" onClick={submitCustomEquipment} disabled={isSubmittingCustomEquipment || !customEquipmentName.trim() || !customEquipmentFile} className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-50">
                  {isSubmittingCustomEquipment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Lưu thiết bị & Gửi yêu cầu admin
                </button>
              </div>
            )}

            {/* ── 2-COLUMN MASTER DETAIL BODY ── */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Column: Visual Categories List */}
              <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-black/[0.06] dark:border-white/[0.08] p-3 overflow-y-auto bg-slate-50/50 dark:bg-[#0c1017] shrink-0">
                <div className="text-[10px] font-mono uppercase tracking-widest text-ink-muted dark:text-slate-400 font-bold px-2 py-1 hidden md:block">
                  Danh mục phân loại
                </div>

                <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0 scrollbar-none">
                  {/* Option 1: All */}
                  <button
                    type="button"
                    onClick={() => setActiveCategory('all')}
                    className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 md:w-full text-left ${
                      activeCategory === 'all'
                        ? 'bg-accent text-white shadow-accent font-bold'
                        : 'text-ink-secondary dark:text-slate-300 hover:text-ink dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Layers className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                      <span className="truncate">Tất cả thiết bị</span>
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ${
                      activeCategory === 'all' ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-ink-muted dark:text-slate-400'
                    }`}>
                      {physicalEquipmentList.length}
                    </span>
                  </button>

                  {/* Option 2: Selected only */}
                  <button
                    type="button"
                    onClick={() => setActiveCategory('selected')}
                    className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 md:w-full text-left ${
                      activeCategory === 'selected'
                        ? 'bg-accent text-white shadow-accent font-bold'
                        : 'text-ink-secondary dark:text-slate-300 hover:text-ink dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                      <span className="truncate">Đã tích chọn</span>
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ${
                      activeCategory === 'selected' ? 'bg-white/20 text-white' : 'bg-accent/15 text-accent border border-accent/20'
                    }`}>
                      {visibleSelectedCount}
                    </span>
                  </button>

                  <div className="h-px bg-black/[0.06] dark:bg-white/[0.08] my-1 hidden md:block" />

                  {/* Equipment Categories */}
                  {EQUIPMENT_CATEGORIES.filter((cat) => cat.id !== 'no-equipment').map((cat) => {
                    const IconComp = CATEGORY_ICONS[cat.id] || Dumbbell;
                    const count = categoryEquipmentCounts[cat.id] || 0;
                    const isActive = activeCategory === cat.id;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 md:w-full text-left ${
                          isActive
                            ? 'bg-accent text-white shadow-accent font-bold'
                            : 'text-ink-secondary dark:text-slate-300 hover:text-ink dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <IconComp className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                          <span className="truncate">{cat.label_vi}</span>
                        </div>
                        {count > 0 && (
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ${
                            isActive ? 'bg-white/20 text-white' : 'bg-accent/15 text-accent dark:bg-accent/20 dark:text-accent'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Panel: Search Bar + Filtered Equipment Grid */}
              <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-5 bg-white dark:bg-[#0f141d]">
                {/* Search Bar & Quick Bulk Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 shrink-0">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted dark:text-slate-400" strokeWidth={1.5} />
                    <input
                      className="input pl-10 h-10 text-xs font-sans rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-slate-50/50 dark:bg-[#151c28] text-ink dark:text-white placeholder:text-ink-muted dark:placeholder:text-slate-500"
                      placeholder="Tìm nhanh theo tên (VD: Bench press, Cáp, Hack Squat, Tạ đơn 20kg...)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Bulk Select / Deselect in this category */}
                  {modalFilteredEquipment.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSelectAllInView(modalFilteredEquipment, !allFilteredSelected)}
                      disabled={isUpdatingEq}
                      className="btn-ghost text-xs py-2 px-3 inline-flex items-center gap-1.5 border border-black/[0.08] dark:border-white/[0.1] dark:text-slate-300 hover:border-accent/40 font-semibold shrink-0"
                    >
                      {allFilteredSelected ? (
                        <>
                          <Square className="h-3.5 w-3.5 text-danger" />
                          <span>Bỏ chọn tất cả ({modalFilteredEquipment.length})</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare className="h-3.5 w-3.5 text-accent" />
                          <span>Chọn tất cả ({modalFilteredEquipment.length})</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Equipment Cards Grid */}
                <div className="flex-1 overflow-y-auto pr-1">
                  {activeCategory === 'weights' ? (
                    <div className="space-y-5">
                      {modalWeightSections.map((section) => (
                        <section key={section.id} className="space-y-2.5">
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted dark:text-slate-400">
                              {section.label_vi} ({section.items.length})
                            </h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
                            {section.items.map(renderModalEquipmentCard)}
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
                      {modalFilteredEquipment.map(renderModalEquipmentCard)}
                    </div>
                  )}

                  {modalFilteredEquipment.length === 0 && (
                    <div className="text-center py-16">
                      <p className="text-xs text-ink-muted dark:text-slate-400 font-medium">
                        Không tìm thấy thiết bị nào phù hợp với bộ lọc hiện tại.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between bg-slate-50 dark:bg-[#111722] shrink-0">
              <span className="text-xs font-semibold text-ink-secondary dark:text-slate-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success led-pulse" />
                <span>Tự động lưu trực tiếp khi bạn tích chọn.</span>
              </span>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="btn-primary text-xs py-2 px-6 shadow-accent"
              >
                Xong / Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EQUIPMENT IMAGE LIGHTBOX MODAL (XEM ẢNH PHÓNG TO) ── */}
      {previewEquipment && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewEquipment(null)}
        >
          <div
            className="relative w-full max-w-lg bg-chassis border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Title and Close Button */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/20 mb-1">
                  {previewEquipment.category || 'Thiết bị'}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-ink dark:text-white leading-tight break-words">
                  {previewEquipment.name_vi || previewEquipment.name || previewEquipment.slug}
                </h3>
                <p className="font-mono text-xs text-ink-muted dark:text-slate-400 uppercase tracking-wider mt-0.5 break-words">
                  {previewEquipment.name || previewEquipment.slug}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPreviewEquipment(null)}
                className="h-8 w-8 rounded-xl bg-black/5 dark:bg-white/10 text-ink-muted hover:text-ink dark:hover:text-white flex items-center justify-center transition-colors shrink-0"
                aria-label="Đóng xem ảnh"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Large Image Canvas */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-white dark:bg-[#0c1017] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center shadow-inner p-3">
              <EquipmentImage
                src={previewEquipment.image_url}
                slug={previewEquipment.slug}
                nameVi={previewEquipment.name_vi}
                nameEn={previewEquipment.name}
                category={previewEquipment.category}
                size="full"
                aspectRatio="4/3"
                priority
                className="w-full h-full border-0 rounded-none bg-transparent"
              />
            </div>

            {/* Footer / Status & Toggle Action */}
            <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
              <div className="text-xs text-ink-muted dark:text-slate-400">
                {selectedIds.has(previewEquipment.id) ? (
                  <span className="text-accent font-bold flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} /> Đã chọn vào phòng gym
                  </span>
                ) : (
                  <span>Chưa chọn cho phòng gym</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => toggleEquipmentInModal(previewEquipment)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  selectedIds.has(previewEquipment.id)
                    ? 'bg-danger/10 text-danger hover:bg-danger/20 border border-danger/30'
                    : 'btn-primary shadow-accent'
                }`}
              >
                {selectedIds.has(previewEquipment.id) ? (
                  <>
                    <X className="h-3.5 w-3.5" /> Bỏ khỏi phòng
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Chọn thiết bị này
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="card shadow-2xl rounded-2xl p-6 max-w-sm w-full border border-danger/30 space-y-4 bg-chassis animate-in zoom-in-95 duration-150">
            <div className="h-10 w-10 rounded-xl bg-danger/15 text-danger flex items-center justify-center border border-danger/30">
              <Trash2 className="h-5 w-5" strokeWidth={1.5} />
            </div>

            <div>
              <h3 className="text-base font-bold text-ink">Xác nhận xóa phòng gym?</h3>
              <p className="text-xs text-ink-secondary mt-1 font-medium">
                Hành động này sẽ xóa vĩnh viễn <strong>&quot;{gym.name}&quot;</strong> và cấu hình thiết bị liên quan.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="btn-ghost text-xs py-2 px-3"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteGym}
                disabled={isDeleting}
                className="bg-danger text-white hover:bg-danger/90 font-bold text-xs py-2 px-4 rounded-lg inline-flex items-center gap-1.5 transition-all shadow-md"
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
