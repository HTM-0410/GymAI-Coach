'use client';

import { ChangeEvent, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertCircle, Camera, Check, ChevronDown, FilePenLine, Loader2, RefreshCw, ScanLine, Trash2, X } from 'lucide-react';
import {
  ALL_BODY_COMPOSITION_ALLOWED_USES,
  BODY_COMPOSITION_FIELDS,
  INBODY_EXTRACTION_FLAGS,
  type BodyCompositionExtraction,
  type BodyCompositionMetricKey,
  type BodyCompositionValues,
  type InBodySegments,
  InBodyAIAnalysisSchema,
  InBodySegmentsSchema,
  InBodyTargetValuesSchema,
  calculateBodyCompositionTrend,
  nullableNumber,
} from '@/lib/personalization/body-composition';
import type { Database } from '@/types/database';
import InBodyDetailedResults from '@/components/inbody-detailed-results';

type SegmentRow = Database['public']['Tables']['body_composition_segments']['Row'];
type Measurement = Database['public']['Tables']['body_composition_measurements']['Row'] & { body_composition_segments?: SegmentRow[] };
const EMPTY_VALUES: BodyCompositionValues = Object.fromEntries(BODY_COMPOSITION_FIELDS.map(({ key }) => [key, null])) as BodyCompositionValues;
const MAIN_METRIC_KEYS = new Set<BodyCompositionMetricKey>(['weightKg', 'skeletalMuscleMassKg', 'percentBodyFat']);

function savedInBodyDetails(measurement: Measurement) {
  const emptyMetric = () => ({ massKg: null, percentOfReference: null, evaluation: null as 'below' | 'normal' | 'above' | null });
  const emptySegment = () => ({ lean: emptyMetric(), fat: emptyMetric() });
  const segments: InBodySegments = {
    leftArm: emptySegment(), rightArm: emptySegment(), trunk: emptySegment(), leftLeg: emptySegment(), rightLeg: emptySegment(),
  };
  const uiSegment = { left_arm: 'leftArm', right_arm: 'rightArm', trunk: 'trunk', left_leg: 'leftLeg', right_leg: 'rightLeg' } as const;
  for (const row of measurement.body_composition_segments ?? []) {
    const segment = uiSegment[row.segment];
    const evaluation = row.device_evaluation === 'below' || row.device_evaluation === 'normal' || row.device_evaluation === 'above'
      ? row.device_evaluation
      : null;
    segments[segment][row.tissue_type] = {
      massKg: row.mass_kg,
      percentOfReference: row.percent_of_reference,
      evaluation,
    };
  }
  const targetSource = measurement.device_target_values && typeof measurement.device_target_values === 'object' && !Array.isArray(measurement.device_target_values)
    ? measurement.device_target_values as Record<string, unknown>
    : {};
  return {
    values: {
      weightKg: measurement.weight_kg,
      totalBodyWaterL: measurement.total_body_water_l,
      proteinKg: measurement.protein_kg,
      mineralKg: measurement.mineral_kg,
      skeletalMuscleMassKg: measurement.skeletal_muscle_mass_kg,
      bodyFatMassKg: measurement.body_fat_mass_kg,
      bmi: measurement.bmi,
      percentBodyFat: measurement.percent_body_fat,
      fatFreeMassKg: measurement.fat_free_mass_kg,
      basalMetabolicRateKcal: measurement.basal_metabolic_rate_kcal,
      waistHipRatio: measurement.waist_hip_ratio,
      visceralFatLevel: measurement.visceral_fat_level,
      skeletalMuscleIndex: measurement.skeletal_muscle_index,
      deviceScore: measurement.device_score,
    },
    segments: InBodySegmentsSchema.safeParse(segments).data,
    targetValues: InBodyTargetValuesSchema.safeParse(targetSource).data,
    analysis: InBodyAIAnalysisSchema.safeParse(targetSource.aiAnalysis).data,
  };
}

function localDateTimeValue(date = new Date()) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

function deltaLabel(value: number | null) {
  if (value === null) return '-';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
}

export default function BodyCompositionClient({ initialMeasurements, setupError }: {
  initialMeasurements: Measurement[]; setupError: boolean;
}) {
  const [measurements, setMeasurements] = useState(initialMeasurements);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'manual' | 'scan'>('scan');
  const [values, setValues] = useState<BodyCompositionValues>(EMPTY_VALUES);
  const [measuredAt, setMeasuredAt] = useState(localDateTimeValue());
  const [deviceBrand, setDeviceBrand] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [comparability, setComparability] = useState<'high' | 'medium' | 'low'>('medium');
  const [extraction, setExtraction] = useState<BodyCompositionExtraction | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [scanFingerprint, setScanFingerprint] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trend = useMemo(() => calculateBodyCompositionTrend(measurements), [measurements]);
  const workflowBusy = busy === 'extract' || busy === 'save';

  function updateValue(key: BodyCompositionMetricKey, raw: unknown) {
    setValues((current) => ({ ...current, [key]: nullableNumber(raw) }));
  }

  function handleModalOpenChange(nextOpen: boolean) {
    if (!nextOpen && workflowBusy) return;
    setModalOpen(nextOpen);
    if (nextOpen) {
      setMode('scan');
      setValues(EMPTY_VALUES);
      setMeasuredAt(localDateTimeValue());
      setDeviceBrand('');
      setDeviceModel('');
      setComparability('medium');
      setExtraction(null);
      setSelectedImage(null);
      setScanFingerprint(null);
      setMessage('');
    }
  }

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setMessage('Chỉ hỗ trợ JPEG, PNG hoặc WebP.'); return; }
    if (file.size > 15 * 1024 * 1024) { setMessage('Ảnh gốc quá lớn. Hãy chọn ảnh dưới 15 MB.'); return; }
    setSelectedImage(file); setExtraction(null); setScanFingerprint(null);
    await extract(file);
  }

  async function extract(imageFile = selectedImage) {
    if (!imageFile) return;
    setBusy('extract'); setMessage('Đang gửi ảnh trực tiếp đến Gemini 3.5 Flash-Lite để đọc chỉ số…');
    try {
      const form = new FormData();
      form.append('image', imageFile, imageFile.name || 'inbody-upload');
      form.append('consent', INBODY_EXTRACTION_FLAGS.consent);
      const response = await fetch('/api/inbody/extract', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.reason || data?.error || 'extract_failed');
      const result = data.extraction as BodyCompositionExtraction;
      setScanFingerprint(data.scanFingerprint ?? null);
      setExtraction(result); setValues({ ...EMPTY_VALUES, ...result.values });
      if (result.measuredAt) setMeasuredAt(localDateTimeValue(new Date(result.measuredAt)));
      setDeviceBrand(result.deviceBrand ?? 'InBody'); setDeviceModel(result.deviceModel ?? '');
      setComparability('high');
      setMessage('Đã sẵn sàng kiểm tra.');
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'extraction_failed';
      setMessage(reason === 'invalid_model_output'
        ? 'Ảnh chưa đủ rõ để nhận diện chỉ số. Hãy chụp thẳng phiếu, đủ sáng và để phiếu chiếm phần lớn khung hình.'
        : reason === 'duplicate_scan'
          ? 'Phiếu InBody này đã được lưu trước đó (trùng số điện thoại và thời gian đo). Không cần quét lại.'
        : `Không thể đọc ảnh (${reason}). Hãy thử lại, chọn ảnh khác hoặc nhập thủ công.`);
    } finally {
      setBusy('');
    }
  }

  async function refresh() {
    const response = await fetch('/api/body-composition', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    setMeasurements(data.measurements ?? []);
  }

  async function save() {
    const parsedMeasuredAt = Date.parse(measuredAt);
    if (!Number.isFinite(parsedMeasuredAt)) { setMessage('Hãy chọn thời điểm đo hợp lệ.'); return; }
    setBusy('save'); setMessage('');
    try {
      const response = await fetch('/api/body-composition', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
          source: mode === 'scan' ? 'inbody_sheet' : 'manual',
          measuredAt: new Date(parsedMeasuredAt).toISOString(), measuredTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          deviceBrand: deviceBrand || null, deviceModel: deviceModel || null, values,
          extractionMethod: mode === 'scan' && extraction ? 'vision' : 'manual',
          extractionProvider: mode === 'scan' && extraction ? 'google_gemini' : null,
          extractionConfidence: extraction?.overallConfidence ?? null, comparability,
          segments: extraction?.segments,
          targetValues: extraction?.targetValues,
          analysis: extraction?.analysis,
          scanFingerprint,
          allowedUses: [...ALL_BODY_COMPOSITION_ALLOWED_USES], reviewed: true,
        }),
      });
      const saved = await response.json();
      if (!response.ok) throw new Error(saved?.error || 'save_failed');
      setValues(EMPTY_VALUES); setExtraction(null); setMeasuredAt(localDateTimeValue());
      setSelectedImage(null); setScanFingerprint(null);
      await refresh();
      setModalOpen(false);
      setMessage('Đã lưu kết quả.');
    } catch (error) {
      setMessage(error instanceof Error && error.message === 'duplicate_scan'
        ? 'Phiếu InBody này đã được lưu trước đó. Không tạo thêm bản trùng.'
        : 'Không thể lưu. Hãy kiểm tra thời điểm đo và các khoảng giá trị.');
    } finally {
      setBusy('');
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Xoá phép đo này? Hành động không thể hoàn tác.')) return;
    setBusy(id);
    const response = await fetch(`/api/body-composition/${id}`, { method: 'DELETE' });
    setBusy('');
    if (!response.ok) { setMessage('Không thể xoá phép đo.'); return; }
    setMeasurements((current) => current.filter((item) => item.id !== id));
    setMessage('Đã xoá phép đo.');
  }

  function metricField(field: (typeof BODY_COMPOSITION_FIELDS)[number]) {
    const confidence = extraction?.confidence[field.key];
    const needsReview = Boolean(extraction && (confidence === null || confidence === undefined || confidence < 0.75));
    return <label key={field.key}>
      <span className="label">{field.label} {field.unit && `(${field.unit})`}</span>
      <input type="number" step={field.step} value={values[field.key] ?? ''} onChange={(event) => updateValue(field.key, event.target.value)} className={`input ${needsReview ? 'border-amber-500/60' : ''}`} aria-describedby={needsReview ? `${field.key}-review` : undefined} />
      {needsReview && <span id={`${field.key}-review`} className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300"><AlertCircle className="h-3 w-3" />Kiểm tra lại</span>}
    </label>;
  }

  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});
  const allOpen = useMemo(() => {
    if (!measurements.length) return false;
    return measurements.every((m, idx) => openDetails[m.id] ?? (idx === 0));
  }, [measurements, openDetails]);

  const toggleAll = () => {
    const nextState = !allOpen;
    const next: Record<string, boolean> = {};
    measurements.forEach((m) => { next[m.id] = nextState; });
    setOpenDetails(next);
  };

  return (
    <Dialog.Root open={modalOpen} onOpenChange={handleModalOpenChange}>
    <div className="min-w-0 space-y-6">
      {setupError && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-ink" role="alert"><strong>Chưa kết nối được dữ liệu thành phần cơ thể.</strong><p className="mt-1 text-ink-secondary">Migration nền tảng có thể chưa được áp dụng. Không có ảnh hay dữ liệu nào được gửi.</p></div>}
      {message && !modalOpen && <div className="flex items-start gap-2 rounded-xl border border-accent/25 bg-accent/10 p-3 text-sm text-ink" role="status"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{message}</div>}

      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="card min-w-0 rounded-2xl border border-white/70 p-3 shadow-neumorph-lg sm:p-5">
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-black/5 dark:border-white/5">
            <div className="min-w-0">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">Lịch sử đo</span>
              <div className="flex items-center gap-3">
                <h2 className="text-base sm:text-lg font-extrabold text-ink">{measurements.length ? `${measurements.length} phép đo đã xác nhận` : 'Tạo mốc đầu tiên'}</h2>
                {measurements.length > 1 && (
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-xs font-bold text-accent bg-accent/10 hover:bg-accent/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    {allOpen ? 'Thu gọn tất cả' : 'Bật tất cả'}
                  </button>
                )}
              </div>
            </div>
            <Dialog.Trigger asChild>
              <button type="button" disabled={setupError} className="btn-primary w-full justify-center text-xs sm:w-auto">
                <FilePenLine className="h-4 w-4" />Thêm kết quả InBody
              </button>
            </Dialog.Trigger>
          </div>

          {!measurements.length ? (
            <div className="recessed-bay mt-5 p-6 text-center">
              <ScanLine className="mx-auto h-9 w-9 text-accent" />
              <p className="mt-3 font-bold text-ink">Chưa có dữ liệu</p>
              <p className="mt-1 text-sm text-ink-secondary">Nhập vài chỉ số chính là đủ. InBody hoàn toàn tùy chọn.</p>
            </div>
          ) : (
            <div className="mt-4 min-w-0 space-y-4">
              {measurements.map((item, index) => {
                const isOpen = openDetails[item.id] ?? (index === 0);
                const details = savedInBodyDetails(item);

                return (
                  <details
                    key={item.id}
                    className="group recessed-bay min-w-0 rounded-2xl border border-black/5 dark:border-white/10 p-0 shadow-sm transition-all"
                    open={isOpen}
                    onToggle={(e) => {
                      const target = e.currentTarget as HTMLDetailsElement;
                      setOpenDetails((prev) => ({ ...prev, [item.id]: target.open }));
                    }}
                  >
                    {/* Sticky Pin Header when scrolling */}
                    <summary className="sticky top-14 md:top-0 z-30 flex cursor-pointer list-none items-center justify-between gap-3 bg-chassis/95 dark:bg-[#121620]/95 px-3.5 py-3 sm:px-5 sm:py-3.5 backdrop-blur-xl border-b border-black/5 dark:border-white/10 rounded-t-2xl transition-all shadow-sm select-none">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <p className="font-black text-sm sm:text-base text-ink">{new Date(item.measured_at).toLocaleDateString('vi-VN')}</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent font-mono text-[9px] sm:text-[10px] font-bold">
                            {index === 0 ? (measurements.length === 1 ? 'Baseline hiện tại' : 'Mới nhất') : 'Lịch sử'}
                          </span>
                          <span className="font-mono text-[10px] text-ink-muted hidden sm:inline">
                            · {item.source === 'inbody_sheet' ? 'InBody đã đối chiếu' : 'Nhập thủ công'}
                          </span>
                        </div>

                        {/* Quick preview metrics */}
                        {item.weight_kg != null && (
                          <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 font-mono text-[11px] text-ink-secondary flex-wrap">
                            <span className="font-bold text-ink">{item.weight_kg} kg</span>
                            {item.skeletal_muscle_mass_kg != null && <span className="text-emerald-600 dark:text-emerald-400">· SMM {item.skeletal_muscle_mass_kg} kg</span>}
                            {item.percent_body_fat != null && <span className="text-amber-600 dark:text-amber-400">· PBF {item.percent_body_fat}%</span>}
                            {item.device_score != null && <span className="text-accent font-bold">· {item.device_score}đ InBody</span>}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                          {isOpen ? 'Thu gọn' : 'Bật xem'}
                        </span>
                        <div className="h-7 w-7 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-ink-muted group-hover:text-accent transition-colors">
                          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
                        </div>
                      </div>
                    </summary>

                    {/* Expanded Content */}
                    <div className="p-3 sm:p-5 min-w-0">
                      <InBodyDetailedResults {...details} />
                      <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                        <span className="text-xs text-ink-muted font-mono">{item.device_brand || 'Thiết bị đo'} {item.device_model || ''}</span>
                        <button
                          type="button"
                          disabled={busy === item.id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            remove(item.id);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-danger px-2.5 py-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />Xoá
                        </button>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </div>

        <aside className="min-w-0 lg:sticky lg:top-4 self-start">
          <div className="card rounded-2xl border border-white/70 p-5 shadow-neumorph-sm">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">Insight</span>
            <h2 className="mt-1 font-extrabold text-ink">{measurements.length < 2 ? 'Baseline, chưa phải xu hướng' : trend ? 'Thay đổi giữa hai lần đo' : 'Chưa đủ điều kiện so sánh'}</h2>
            {trend ? (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  ['Cân nặng', trend.weightKg, 'kg'],
                  ['Cơ xương', trend.skeletalMuscleMassKg, 'kg'],
                  ['Mỡ', trend.percentBodyFat, '%'],
                ].map(([label, value, unit]) => (
                  <div key={String(label)} className="recessed-bay rounded-lg p-2 text-center">
                    <span className="block text-[10px] text-ink-muted">{label}</span>
                    <strong className="font-mono text-sm text-ink">{deltaLabel(value as number | null)} {value !== null ? unit : ''}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-secondary">
                {measurements.length < 2 ? 'Thêm lần đo thứ hai trong điều kiện và thiết bị tương đồng để xem thay đổi.' : 'Hai lần gần nhất khác thiết bị hoặc có độ so sánh thấp.'}
              </p>
            )}
            <p className="mt-3 text-xs text-ink-muted">Các thay đổi chỉ mô tả số đo, không đánh giá tốt/xấu và không phải chẩn đoán.</p>
          </div>
        </aside>
      </section>
    </div>

    <Dialog.Portal>
      <Dialog.Overlay style={{ position: 'fixed', zIndex: 60 }} className="inset-0 bg-black/65 backdrop-blur-sm" />
      <Dialog.Content style={{ position: 'fixed', left: '50%', top: '50%', zIndex: 70 }} role="dialog" aria-modal="true" aria-labelledby="inbody-modal-title" onEscapeKeyDown={(event) => { if (workflowBusy) event.preventDefault(); }} onPointerDownOutside={(event) => { if (workflowBusy) event.preventDefault(); }} className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto overflow-x-hidden rounded-2xl border border-white/70 bg-chassis p-4 shadow-2xl focus:outline-none dark:border-white/10 sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">Phép đo mới</span><Dialog.Title id="inbody-modal-title" className="text-xl font-extrabold text-ink">Thêm kết quả InBody</Dialog.Title><Dialog.Description className="mt-1 text-xs text-ink-secondary">Chụp phiếu để đọc tự động hoặc nhập thủ công.</Dialog.Description></div><Dialog.Close asChild><button type="button" disabled={workflowBusy} aria-label="Đóng cửa sổ thêm kết quả InBody" className="rounded-lg p-2 text-ink-muted hover:bg-black/5 hover:text-ink focus:outline-none focus:ring-2 focus:ring-accent/60 disabled:opacity-40 dark:hover:bg-white/5"><X className="h-5 w-5" /></button></Dialog.Close></div>

        {message && <div className="mt-4 flex items-start gap-2 rounded-xl border border-accent/25 bg-accent/10 p-3 text-sm text-ink" role="status">{workflowBusy ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-accent" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />}{message}</div>}

        {mode === 'scan' && !extraction && <div className="recessed-bay mt-5 rounded-xl p-5">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={selectImage} className="sr-only" aria-label="Chụp hoặc tải ảnh InBody" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy === 'extract'} className="btn-primary w-full"><Camera className="h-4 w-4" />{busy === 'extract' ? 'Đang phân tích bằng Gemini 3.5 Flash-Lite…' : 'Chụp hoặc tải ảnh'}</button>
          <p className="mt-3 text-xs text-ink-secondary">Ảnh được gửi trực tiếp đến Google Gemini 3.5 Flash-Lite để đọc chỉ số và không được GymAI lưu lại.</p>
        </div>}

        {(mode === 'manual' || extraction) && <div className="mt-5">
          {extraction && <p className="mb-4 text-xs text-ink-secondary">Kiểm tra nhanh các số chính. Mục có độ tin cậy thấp được đánh dấu “Kiểm tra lại”.</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label><span className="label">Thời điểm đo</span><input type="datetime-local" value={measuredAt} onChange={(e) => setMeasuredAt(e.target.value)} className="input" required /></label>
            {BODY_COMPOSITION_FIELDS.filter((field) => MAIN_METRIC_KEYS.has(field.key)).map(metricField)}
          </div>
          {extraction && <div className="mt-5"><InBodyDetailedResults values={values} segments={extraction.segments} targetValues={extraction.targetValues} analysis={extraction.analysis} /></div>}
          <details className="mt-4 rounded-xl border border-black/5 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]"><summary className="cursor-pointer text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-accent/60">Chỉ số khác (tuỳ chọn)</summary><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label><span className="label">Hãng thiết bị</span><input value={deviceBrand} onChange={(e) => setDeviceBrand(e.target.value)} maxLength={80} className="input" placeholder="Ví dụ: InBody" /></label><label><span className="label">Model thiết bị</span><input value={deviceModel} onChange={(e) => setDeviceModel(e.target.value)} maxLength={80} className="input" placeholder="Ví dụ: InBody270" /></label><label><span className="label">Khả năng so sánh lần sau</span><select value={comparability} onChange={(e) => setComparability(e.target.value as typeof comparability)} className="input"><option value="high">Cao - cùng thiết bị/điều kiện</option><option value="medium">Trung bình</option><option value="low">Thấp - điều kiện khác</option></select></label>{BODY_COMPOSITION_FIELDS.filter((field) => !MAIN_METRIC_KEYS.has(field.key)).map(metricField)}</div></details>
          <button type="button" onClick={save} disabled={busy === 'save' || setupError} className="btn-primary mt-5 w-full">{busy === 'save' ? <><Loader2 className="h-4 w-4 animate-spin" />Đang lưu…</> : <><Check className="h-4 w-4" />Lưu kết quả</>}</button>
        </div>}

        {mode === 'scan' && !extraction && <div className="mt-4 flex flex-wrap gap-4">{selectedImage && <button type="button" onClick={() => void extract()} disabled={busy === 'extract'} className="inline-flex items-center gap-2 text-sm font-semibold text-accent disabled:opacity-50"><RefreshCw className="h-4 w-4" />Thử lại</button>}<button type="button" onClick={() => { setMode('manual'); setExtraction(null); setMessage(''); }} disabled={workflowBusy} className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted disabled:opacity-50"><FilePenLine className="h-4 w-4" />Nhập thủ công</button></div>}
        {mode === 'scan' && extraction && <button type="button" onClick={() => void extract()} disabled={!selectedImage || busy === 'extract'} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-accent disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" />Thử đọc lại</button>}
      </Dialog.Content>
    </Dialog.Portal>
    </Dialog.Root>
  );
}
