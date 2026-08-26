'use client';

import { useState, useRef, useEffect, ChangeEvent, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  Check,
  Loader2,
  AlertCircle,
  X,
  RefreshCw,
  ScanLine,
  FilePenLine,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import {
  ALL_BODY_COMPOSITION_ALLOWED_USES,
  BODY_COMPOSITION_FIELDS,
  INBODY_EXTRACTION_FLAGS,
  type BodyCompositionExtraction,
  type BodyCompositionMetricKey,
  type BodyCompositionValues,
  nullableNumber,
} from '@/lib/personalization/body-composition';
import InBodyDetailedResults from '@/components/inbody-detailed-results';

const EMPTY_VALUES: BodyCompositionValues = Object.fromEntries(
  BODY_COMPOSITION_FIELDS.map(({ key }) => [key, null])
) as BodyCompositionValues;

const MAIN_METRIC_KEYS = new Set<BodyCompositionMetricKey>([
  'weightKg',
  'skeletalMuscleMassKg',
  'percentBodyFat',
  'bodyFatMassKg',
  'bmi',
  'basalMetabolicRateKcal',
]);

function localDateTimeValue(date = new Date()) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

interface InBodyScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (measurement: { weightKg?: number | null; bmi?: number | null }) => void;
}

export default function InBodyScanModal({ isOpen, onClose, onSaved }: InBodyScanModalProps) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [values, setValues] = useState<BodyCompositionValues>(EMPTY_VALUES);
  const [measuredAt, setMeasuredAt] = useState(localDateTimeValue());
  const [deviceBrand, setDeviceBrand] = useState('InBody');
  const [deviceModel, setDeviceModel] = useState('');
  const [comparability, setComparability] = useState<'high' | 'medium' | 'low'>('high');
  const [extraction, setExtraction] = useState<BodyCompositionExtraction | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [scanFingerprint, setScanFingerprint] = useState<string | null>(null);
  const [busy, setBusy] = useState<'extract' | 'save' | ''>('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showOptionalMetrics, setShowOptionalMetrics] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const workflowBusy = busy === 'extract' || busy === 'save';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSelectedImage(null);
      setScanFingerprint(null);
      setExtraction(null);
      setValues(EMPTY_VALUES);
      setErrorMessage('');
      setSuccessMessage('');
      setBusy('');
      setMode('scan');
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !workflowBusy && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, workflowBusy, onClose]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  function updateValue(key: BodyCompositionMetricKey, raw: unknown) {
    setValues((current) => ({ ...current, [key]: nullableNumber(raw) }));
  }

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMessage('Chỉ hỗ trợ file ảnh JPEG, PNG hoặc WebP.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('Kích thước ảnh vượt quá 15 MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setExtraction(null);
    setScanFingerprint(null);
    setSelectedImage(file);
    await extract(file);
  }

  const extract = useCallback(
    async (imageFile = selectedImage) => {
      if (!imageFile) return;
      setBusy('extract');
      setErrorMessage('');

      try {
        const form = new FormData();
        form.append('image', imageFile, imageFile.name || 'inbody-upload');
        form.append('consent', INBODY_EXTRACTION_FLAGS.consent);

        const response = await fetch('/api/inbody/extract', {
          method: 'POST',
          body: form,
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data?.reason || data?.error || 'extraction_failed');
        const result = data.extraction as BodyCompositionExtraction;
        setScanFingerprint(data.scanFingerprint ?? null);

        setExtraction(result);
        setValues({ ...EMPTY_VALUES, ...result.values });
        if (result.measuredAt) {
          setMeasuredAt(localDateTimeValue(new Date(result.measuredAt)));
        }
        setDeviceBrand(result.deviceBrand ?? 'InBody');
        setDeviceModel(result.deviceModel ?? '');
        setComparability('high');
        setSuccessMessage('AI đã trích xuất thành công các chỉ số! Hãy kiểm tra lại bên dưới.');
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'extraction_failed';
        setErrorMessage(reason === 'invalid_model_output'
          ? 'Ảnh chưa đủ rõ để nhận diện chỉ số. Hãy chụp thẳng phiếu, đủ sáng và để phiếu chiếm phần lớn khung hình.'
          : reason === 'duplicate_scan'
            ? 'Phiếu InBody này đã được lưu trước đó (trùng số điện thoại và thời gian đo). Không cần quét lại.'
          : `Không thể tự động đọc chỉ số (${reason}). Bạn có thể thử lại, đổi ảnh rõ hơn hoặc chuyển sang Nhập thủ công.`);
      } finally {
        setBusy('');
      }
    },
    [selectedImage]
  );

  async function handleSave() {
    const parsedMeasuredAt = Date.parse(measuredAt);
    if (!Number.isFinite(parsedMeasuredAt)) {
      setErrorMessage('Thời điểm đo không hợp lệ.');
      return;
    }

    setBusy('save');
    setErrorMessage('');

    try {
      const response = await fetch('/api/body-composition', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source: mode === 'scan' ? 'inbody_sheet' : 'manual',
          measuredAt: new Date(parsedMeasuredAt).toISOString(),
          measuredTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          deviceBrand: deviceBrand || null,
          deviceModel: deviceModel || null,
          values,
          extractionMethod: mode === 'scan' && extraction ? 'vision' : 'manual',
          extractionProvider: mode === 'scan' && extraction ? 'google_gemini' : null,
          extractionConfidence: extraction?.overallConfidence ?? null,
          segments: extraction?.segments,
          targetValues: extraction?.targetValues,
          analysis: extraction?.analysis,
          scanFingerprint,
          comparability,
          allowedUses: [...ALL_BODY_COMPOSITION_ALLOWED_USES],
          reviewed: true,
        }),
      });

      const saved = await response.json();
      if (!response.ok) throw new Error(saved?.error === 'duplicate_scan'
        ? 'Phiếu InBody này đã được lưu trước đó. Không tạo thêm bản trùng.'
        : 'Không thể lưu kết quả InBody.');

      if (onSaved) {
        onSaved({
          weightKg: values.weightKg,
          bmi: values.bmi,
        });
      }

      onClose();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Lỗi khi lưu dữ liệu.');
    } finally {
      setBusy('');
    }
  }

  function renderMetricInput(field: (typeof BODY_COMPOSITION_FIELDS)[number]) {
    const confidence = extraction?.confidence[field.key];
    const needsReview = Boolean(
      extraction && (confidence === null || confidence === undefined || confidence < 0.75)
    );

    return (
      <div key={field.key} className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-ink flex items-center gap-1">
            <span>{field.label}</span>
            {field.unit && <span className="text-ink-muted text-[10px]">({field.unit})</span>}
          </label>
          {needsReview && (
            <span className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5">
              <AlertCircle className="h-3 w-3" /> Cần xem lại
            </span>
          )}
        </div>
        <input
          type="number"
          step={field.step}
          value={values[field.key] ?? ''}
          onChange={(e) => updateValue(field.key, e.target.value)}
          placeholder="-"
          className={`input h-10 px-3 rounded-xl border text-sm font-bold bg-white dark:bg-[#0d1117] ${
            needsReview
              ? 'border-amber-500/60 bg-amber-500/[0.04]'
              : 'border-black/10 dark:border-white/10'
          }`}
        />
      </div>
    );
  }

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6"
      style={{ position: 'fixed', inset: 0, zIndex: 99999 }}
    >
      {/* 1. Backdrop Overlay */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
        onClick={() => !workflowBusy && onClose()}
      />

      {/* 2. Modal Content Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inbody-modal-title"
        className="relative z-10 w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#f0f2f5] dark:bg-[#161b22] text-[#1e293b] dark:text-[#f8fafc] border border-black/10 dark:border-white/15 p-5 sm:p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-black/10 dark:border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">
                AI Body Composition Vision
              </span>
            </div>
            <h2
              id="inbody-modal-title"
              className="text-xl sm:text-2xl font-black text-ink tracking-tight flex items-center gap-2"
            >
              <ScanLine className="h-6 w-6 text-accent" />
              Quét & Trích xuất InBody AI
            </h2>
            <p className="text-xs text-ink-secondary mt-1">
              Tự động nhận diện các chỉ số thành phần cơ thể từ phiếu đo InBody với AI Gemini Vision
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={workflowBusy}
            aria-label="Đóng"
            className="h-9 w-9 rounded-xl flex items-center justify-center text-ink-muted hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-accent/10 border border-accent/20 px-3.5 py-2 text-xs text-ink-secondary">
          <AlertCircle className="h-4 w-4 shrink-0 text-accent" />
          <span className="leading-tight">Ảnh được gửi trực tiếp đến Google Gemini 3.5 Flash-Lite để đọc chỉ số và không được GymAI lưu lại.</span>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="mt-4 flex rounded-xl bg-black/5 dark:bg-white/5 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('scan');
              setErrorMessage('');
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer ${
              mode === 'scan'
                ? 'bg-accent text-white shadow-sm'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <Camera className="h-4 w-4" />
            <span>Quét phiếu InBody (Khuyên dùng)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('manual');
              setErrorMessage('');
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer ${
              mode === 'manual'
                ? 'bg-accent text-white shadow-sm'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <FilePenLine className="h-4 w-4" />
            <span>Nhập số thủ công</span>
          </button>
        </div>

        {/* Notifications / Errors */}
        {errorMessage && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-500">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-500">
            <Check className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ── MODE: SCAN INBODY ── */}
        {mode === 'scan' && (
          <div className="mt-4 space-y-4">
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={selectImage} className="sr-only" aria-label="Tải ảnh phiếu InBody" />
            {!extraction && <button type="button" onClick={() => fileInputRef.current?.click()} disabled={workflowBusy} className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {busy === 'extract' ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Gemini 3.5 Flash-Lite đang phân tích…</span></> : <><Camera className="h-4 w-4" /><span>Chụp hoặc tải ảnh</span></>}
            </button>}
            {selectedImage && !extraction && busy !== 'extract' && <div className="flex items-center gap-3">
              <button type="button" onClick={() => void extract()} className="flex-1 btn-primary py-2.5 text-xs"><RefreshCw className="h-4 w-4" />Thử lại</button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 rounded-xl border border-black/10 dark:border-white/10 px-3 py-2.5 text-xs font-bold text-ink">Chọn ảnh khác</button>
            </div>}
          </div>
        )}

        {/* ── FORM REVIEW / EDIT METRICS (Always visible if manual or after scan) ── */}
        {(mode === 'manual' || extraction) && (
          <div className="mt-6 space-y-4 pt-4 border-t border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-ink flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-accent" />
                Đối chiếu & Điều chỉnh chỉ số
              </span>
              <span className="text-[11px] text-ink-muted">Bạn có thể chỉnh sửa nếu cần</span>
            </div>

            {/* General Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label text-ink font-bold">Thời điểm đo</label>
                <input
                  type="datetime-local"
                  value={measuredAt}
                  onChange={(e) => setMeasuredAt(e.target.value)}
                  className="input h-10 px-3 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold bg-white dark:bg-[#0d1117] text-ink"
                  required
                />
              </div>

              <div>
                <label className="label text-ink font-bold">Hãng thiết bị</label>
                <input
                  value={deviceBrand}
                  onChange={(e) => setDeviceBrand(e.target.value)}
                  maxLength={80}
                  placeholder="InBody"
                  className="input h-10 px-3 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold bg-white dark:bg-[#0d1117] text-ink"
                />
              </div>

              <div>
                <label className="label text-ink font-bold">Model thiết bị (Tuỳ chọn)</label>
                <input
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  maxLength={80}
                  placeholder="Ví dụ: 270 / 570"
                  className="input h-10 px-3 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold bg-white dark:bg-[#0d1117] text-ink"
                />
              </div>
            </div>

            {/* Main Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {BODY_COMPOSITION_FIELDS.filter((f) => MAIN_METRIC_KEYS.has(f.key)).map(
                renderMetricInput
              )}
            </div>

            {extraction && <InBodyDetailedResults values={values} segments={extraction.segments} targetValues={extraction.targetValues} analysis={extraction.analysis} />}

            {/* Optional Advanced Metrics Accordion */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowOptionalMetrics(!showOptionalMetrics)}
                className="flex items-center justify-between w-full p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-bold text-ink-secondary hover:text-ink transition-colors cursor-pointer"
              >
                <span>Chỉ số chi tiết khác (Nước, Protein, Khoáng chất, Mỡ nội tạng...)</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    showOptionalMetrics ? 'rotate-180 text-accent' : ''
                  }`}
                />
              </button>

              {showOptionalMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
                  {BODY_COMPOSITION_FIELDS.filter((f) => !MAIN_METRIC_KEYS.has(f.key)).map(
                    renderMetricInput
                  )}
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="pt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={workflowBusy}
                className="flex-1 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 px-4 py-3 text-xs font-bold text-ink-secondary hover:text-ink transition-colors cursor-pointer"
              >
                Huỷ bỏ
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={workflowBusy}
                className="flex-[2] btn-primary py-3 text-xs font-bold flex items-center justify-center gap-2 shadow-accent shadow-md cursor-pointer"
              >
                {busy === 'save' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang lưu kết quả vào hệ thống…</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" strokeWidth={3} />
                    <span>Lưu kết quả & Áp dụng</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
