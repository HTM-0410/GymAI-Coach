'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, SlidersHorizontal, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import {
  EquipmentPresetId,
  EQUIPMENT_PRESETS,
  resolvePresetEquipmentIds,
  inferPresetFromEquipmentIds,
} from '@/lib/equipment-presets';
import CustomGymSetupModal from './custom-gym-setup-modal';

export type EquipmentItem = {
  id: string;
  slug: string;
  name: string;
  name_vi: string | null;
  category: string | null;
  image_url: string | null;
};

type Props = {
  equipment: EquipmentItem[];
  selected: string[]; // list of equipment.id
  onChange: (next: string[]) => void;
  customGymName: string;
  onCustomGymNameChange: (name: string) => void;
  hideHeader?: boolean;
};

const VISIBLE_PRESET_IDS: EquipmentPresetId[] = ['none', 'home_basic', 'gym_standard', 'gym_full'];

const PRESET_VISUALS: Partial<Record<EquipmentPresetId, { src: string; position: string }>> = {
  none: { src: '/images/onboarding/training-none-v2.webp', position: '55% center' },
  home_basic: { src: '/images/onboarding/training-home-basic-v2.webp', position: '62% center' },
  gym_standard: { src: '/images/onboarding/training-gym-standard.webp', position: '67% center' },
  gym_full: { src: '/images/onboarding/training-gym-full.webp', position: '70% center' },
};

export default function EquipmentStep({
  equipment,
  selected,
  onChange,
  customGymName,
  onCustomGymNameChange,
  hideHeader = false,
}: Props) {
  const bodyweightEquipmentIds = useMemo(
    () => equipment.filter((item) => item.slug === 'bodyweight').map((item) => item.id),
    [equipment],
  );
  const bodyweightEquipmentIdSet = useMemo(() => new Set(bodyweightEquipmentIds), [bodyweightEquipmentIds]);
  const selectableSelected = useMemo(
    () => selected.filter((id) => !bodyweightEquipmentIdSet.has(id)),
    [bodyweightEquipmentIdSet, selected],
  );
  const [activePreset, setActivePreset] = useState<EquipmentPresetId>(() =>
    inferPresetFromEquipmentIds(selectableSelected, equipment),
  );
  const [showCustomEditor, setShowCustomEditor] = useState(false);

  // Sync inferred preset if selected changes externally
  useEffect(() => {
    const inferred = inferPresetFromEquipmentIds(selectableSelected, equipment);
    if (activePreset !== 'custom' && inferred !== activePreset) {
      setActivePreset(inferred);
    }
  }, [selectableSelected, equipment, activePreset]);

  const selectedSet = useMemo(() => new Set(selectableSelected), [selectableSelected]);

  function withBodyweight(ids: string[]) {
    return [...new Set([...ids, ...bodyweightEquipmentIds])];
  }

  function handleSelectPreset(presetId: EquipmentPresetId) {
    setActivePreset(presetId);
    onCustomGymNameChange('');

    if (presetId === 'none') {
      onChange(withBodyweight([]));
    } else if (presetId === 'gym_full') {
      onChange(withBodyweight(resolvePresetEquipmentIds('gym_full', equipment)));
    } else {
      const presetIds = resolvePresetEquipmentIds(presetId, equipment);
      onChange(withBodyweight(presetIds));
    }
  }

  function openCustomEditor() {
    setShowCustomEditor(true);
  }

  function saveCustomGym(name: string, equipmentIds: string[]) {
    onChange(equipmentIds);
    onCustomGymNameChange(name);
    setActivePreset('custom');
    setShowCustomEditor(false);
  }

  return (
    <div className="space-y-5">
      {!hideHeader && <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)] led-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Step 04</span>
          </div>
          <h2 className="text-xl font-bold text-ink">Điều kiện tập luyện</h2>
          <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
            Chọn nơi bạn thường tập. AI sẽ chỉ đề xuất bài phù hợp với thiết bị có sẵn.
          </p>
        </div>
        <div className="text-right shrink-0 bg-chassis shadow-neumorph-sm rounded-xl px-3 py-1.5 border border-chassis-lo">
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Thiết bị</p>
          <p className="font-mono text-sm font-bold text-accent">{selectedSet.size}</p>
        </div>
      </div>}

      {/* Preset Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3" role="radiogroup" aria-label="Chọn điều kiện tập luyện">
        {EQUIPMENT_PRESETS.filter((preset) => VISIBLE_PRESET_IDS.includes(preset.id)).map((preset, index) => {
          const isSelected = activePreset === preset.id;
          const visual = PRESET_VISUALS[preset.id];

          let countLabel = '';
          if (preset.id === 'none') {
            countLabel = '0 thiết bị';
          } else if (preset.id === 'gym_full') {
            countLabel = `${resolvePresetEquipmentIds('gym_full', equipment).length} thiết bị`;
          } else {
            const count = resolvePresetEquipmentIds(preset.id, equipment).length;
            countLabel = `~${count} thiết bị`;
          }

          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSelectPreset(preset.id)}
              className={clsx(
                'group relative isolate min-h-[142px] overflow-hidden rounded-[16px] border text-left transition-[transform,border-color,box-shadow] duration-300 sm:min-h-[158px]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-chassis',
                isSelected
                  ? 'border-accent/80 shadow-[0_0_0_1px_rgba(249,115,22,0.25),0_14px_30px_rgba(0,0,0,0.24)]'
                  : 'border-white/[0.08] shadow-[0_12px_28px_rgba(0,0,0,0.18)] hover:-translate-y-0.5 hover:border-white/[0.18]',
              )}
            >
              {visual && (
                <div
                  className="absolute inset-0 scale-[1.02] bg-cover opacity-85 brightness-[1.18] saturate-110 contrast-[1.03] transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                  style={{ backgroundImage: `url(${visual.src})`, backgroundPosition: visual.position }}
                  aria-hidden="true"
                />
              )}
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#06080c] from-[5%] via-[#07090d]/88 via-[38%] to-transparent to-[76%]"
                aria-hidden="true"
              />
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/45 to-transparent" aria-hidden="true" />

              <div className="relative z-10 flex min-h-[142px] flex-col justify-between p-3.5 sm:min-h-[158px] sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono text-[10px] font-bold tracking-[0.22em] text-white/75 drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={clsx(
                      'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider backdrop-blur-md',
                      isSelected
                        ? 'border-accent/50 bg-accent/85 text-white'
                        : 'border-white/10 bg-black/50 text-white/70',
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
                    {countLabel}
                  </span>
                </div>

                <div>
                  <div
                    className={clsx(
                      'mb-2 h-0.5 rounded-full transition-all duration-300',
                      isSelected ? 'w-10 bg-accent' : 'w-6 bg-white/35 group-hover:w-9 group-hover:bg-accent/80',
                    )}
                    aria-hidden="true"
                  />
                  <p className="text-base font-bold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,1)] sm:text-lg">
                    {preset.title}
                  </p>
                  <p className="mt-1 text-xs font-medium leading-snug text-white/80 drop-shadow-[0_2px_6px_rgba(0,0,0,1)]">
                    {preset.subtitle}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={openCustomEditor}
        className={clsx(
          'group flex min-h-[72px] w-full items-center gap-3 rounded-[14px] border bg-white/[0.025] p-4 text-left transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          activePreset === 'custom' ? 'border-accent/60 bg-accent/[0.07]' : 'border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.04]',
        )}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-accent/25 bg-accent/10 text-accent">
          <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink">
            {customGymName || 'Tự thiết lập phòng tập của bạn'}
          </span>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-muted">
            {customGymName
              ? `${selectedSet.size} thiết bị · Nhấn để chỉnh sửa`
              : 'Đặt tên, chọn theo nhóm hoặc thêm nhanh bằng ảnh'}
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-ink-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" />
      </button>

      <CustomGymSetupModal
        open={showCustomEditor}
        equipment={equipment}
        selected={selected}
        initialName={customGymName}
        onClose={() => setShowCustomEditor(false)}
        onSave={saveCustomGym}
      />
    </div>
  );
}
