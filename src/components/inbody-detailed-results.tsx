'use client';

import { Activity, Brain, Dumbbell, Scale, Target } from 'lucide-react';
import {
  BODY_SEGMENTS,
  type InBodyAIAnalysis,
  type InBodySegments,
  type InBodyTargetValues,
  type BodyCompositionValues,
} from '@/lib/personalization/body-composition';

const SEGMENT_LABELS: Record<(typeof BODY_SEGMENTS)[number], string> = {
  leftArm: 'Tay trái',
  rightArm: 'Tay phải',
  trunk: 'Thân người',
  leftLeg: 'Chân trái',
  rightLeg: 'Chân phải',
};

const EVALUATION_LABELS = { below: 'Thấp', normal: 'Bình thường', above: 'Cao' } as const;

function numberLabel(value: number | null | undefined, unit: string, signed = false) {
  if (value == null) return '-';
  return `${signed && value > 0 ? '+' : ''}${value.toLocaleString('vi-VN')} ${unit}`.trim();
}

function evaluationClass(evaluation: 'below' | 'normal' | 'above' | null) {
  if (evaluation === 'normal') return 'text-emerald-700 dark:text-emerald-300';
  if (evaluation === 'above') return 'text-amber-700 dark:text-amber-300';
  if (evaluation === 'below') return 'text-sky-700 dark:text-sky-300';
  return 'text-ink-muted';
}

function GoalBar({ label, value, target, unit, metricNoun = '', deltaUnit = unit }: {
  label: string; value: number | null | undefined; target: number | null | undefined;
  unit: string; metricNoun?: string; deltaUnit?: string;
}) {
  if (value == null) return null;
  const ceiling = Math.max(value, target ?? 0, 1) * 1.35;
  const valueWidth = Math.min(100, Math.max(3, value / ceiling * 100));
  const targetLeft = target == null ? null : Math.min(98, Math.max(2, target / ceiling * 100));
  const comparison = target == null ? null : value - target;
  const distancePercent = comparison == null || target == null
    ? null
    : Math.abs(comparison) / Math.max(Math.abs(target), 1) * 100;
  const changeLevel = distancePercent == null
    ? { label: 'Chưa có mục tiêu', className: 'text-ink-muted' }
    : distancePercent <= 2
      ? { label: 'Gần mục tiêu', className: 'text-emerald-700 dark:text-emerald-300' }
      : distancePercent <= 5
        ? { label: 'Thay đổi nhỏ', className: 'text-sky-700 dark:text-sky-300' }
        : distancePercent <= 10
          ? { label: 'Thay đổi vừa', className: 'text-amber-700 dark:text-amber-300' }
          : { label: 'Thay đổi lớn', className: 'text-rose-700 dark:text-rose-300' };
  const actionText = comparison == null
    ? ''
    : Math.abs(comparison) < 0.05
      ? 'đã đạt mốc'
      : `cần ${comparison > 0 ? 'giảm' : 'tăng'} ${(Math.round(Math.abs(comparison) * 10) / 10).toLocaleString('vi-VN')} ${deltaUnit}${metricNoun ? ` ${metricNoun}` : ''}`;
  return <div className="grid min-w-0 gap-2 sm:grid-cols-[150px_minmax(0,1fr)_110px] sm:items-center">
    <div><strong className="block text-xs text-ink">{label}</strong><span className="font-mono text-[11px] text-ink-muted">{numberLabel(value, unit)}</span></div>
    <div className="relative h-7 overflow-hidden rounded-md bg-black/10 dark:bg-white/10">
      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent/55 to-accent" style={{ width: `${valueWidth}%` }} />
      {targetLeft != null && <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${targetLeft}%` }}><span className="absolute -top-0.5 left-1 whitespace-nowrap text-[9px] font-bold text-ink">Mục tiêu</span></div>}
    </div>
    <div className={`break-words text-[10px] font-bold ${changeLevel.className}`}><span className="block uppercase tracking-wide">{changeLevel.label}</span>{actionText && <span className="mt-0.5 block font-semibold normal-case text-ink-secondary">{actionText}</span>}</div>
  </div>;
}

function BmiBar({ value }: { value: number }) {
  const min = 10; const max = 40;
  const marker = Math.min(100, Math.max(0, (value - min) / (max - min) * 100));
  const status = value < 18.5 ? 'Thấp' : value < 25 ? 'Bình thường' : 'Cao';
  return <div className="grid min-w-0 gap-2 sm:grid-cols-[150px_minmax(0,1fr)_110px] sm:items-center">
    <div><strong className="block text-xs text-ink">BMI</strong><span className="font-mono text-[11px] text-ink-muted">{value.toLocaleString('vi-VN')} kg/m²</span></div>
    <div>
      <div className="relative flex h-7 overflow-hidden rounded-md text-center text-[9px] font-bold text-white"><div className="w-[28.3%] bg-sky-500/75 pt-1.5">Thấp</div><div className="w-[21.7%] bg-emerald-500/80 pt-1.5">Bình thường</div><div className="flex-1 bg-amber-500/80 pt-1.5">Cao</div><div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${marker}%` }} /></div>
      <div className="mt-1 flex justify-between font-mono text-[9px] text-ink-muted"><span>10</span><span>18,5</span><span>25</span><span>40+</span></div>
    </div>
    <span className="text-[10px] font-bold text-ink-secondary">{status}</span>
  </div>;
}

function Overview({ values }: { values: BodyCompositionValues }) {
  const weight = values.weightKg;
  const fat = values.bodyFatMassKg;
  const lean = values.fatFreeMassKg;
  const fatPercent = weight && fat != null ? Math.min(100, Math.max(0, fat / weight * 100)) : values.percentBodyFat;
  const leanPercent = weight && lean != null ? Math.min(100, Math.max(0, lean / weight * 100)) : fatPercent == null ? null : 100 - fatPercent;
  return <section className="min-w-0 overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/[0.09] to-transparent p-3 sm:p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-accent" /><h3 className="font-extrabold text-ink">Tổng quan thành phần cơ thể</h3></div><p className="mt-1 text-xs text-ink-muted">Ảnh chụp tổng thể từ phép đo hiện tại, chưa phải đánh giá xu hướng.</p></div>
      {values.deviceScore != null && <div className="rounded-xl border border-accent/25 bg-white/45 px-4 py-2 text-center dark:bg-white/5"><span className="block text-[9px] font-bold uppercase text-ink-muted">Điểm InBody</span><strong className="font-mono text-xl text-accent">{values.deviceScore}</strong><span className="text-xs text-ink-muted"> / 100</span></div>}
    </div>
    <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(125px,1fr))] gap-2">
      {[
        ['Cân nặng', numberLabel(values.weightKg, 'kg')],
        ['Cơ xương (SMM)', numberLabel(values.skeletalMuscleMassKg, 'kg')],
        ['Mỡ cơ thể (PBF)', numberLabel(values.percentBodyFat, '%')],
        ['BMI', numberLabel(values.bmi, '')],
      ].map(([label, value]) => <div key={label} className="rounded-xl bg-white/45 p-3 dark:bg-white/5"><span className="block text-[10px] text-ink-muted">{label}</span><strong className="mt-1 block font-mono text-base text-ink">{value}</strong></div>)}
    </div>
    {leanPercent != null && fatPercent != null && <div className="mt-4">
      <div className="mb-1 flex flex-col gap-0.5 text-[10px] font-bold min-[420px]:flex-row min-[420px]:justify-between"><span className="text-emerald-700 dark:text-emerald-300">Khối không mỡ {numberLabel(lean, 'kg')}</span><span className="text-amber-700 dark:text-amber-300">Khối lượng mỡ {numberLabel(fat, 'kg')}</span></div>
      <div className="flex h-4 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"><div className="bg-emerald-500/75" style={{ width: `${leanPercent}%` }} /><div className="bg-amber-500/80" style={{ width: `${fatPercent}%` }} /></div>
      <div className="mt-1 flex justify-between font-mono text-[9px] text-ink-muted"><span>{leanPercent.toFixed(1)}% tổng cân nặng</span><span>{fatPercent.toFixed(1)}% tổng cân nặng</span></div>
    </div>}
    <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(125px,1fr))] gap-2">
      {[
        ['Nước cơ thể', numberLabel(values.totalBodyWaterL, 'L')],
        ['Chuyển hoá cơ bản', numberLabel(values.basalMetabolicRateKcal, 'kcal')],
        ['Mỡ nội tạng', numberLabel(values.visceralFatLevel, '')],
        ['Chỉ số cơ xương SMI', numberLabel(values.skeletalMuscleIndex, '')],
      ].map(([label, value]) => <div key={label} className="rounded-lg border border-black/5 p-2 dark:border-white/10"><span className="block text-[9px] text-ink-muted">{label}</span><strong className="font-mono text-xs text-ink">{value}</strong></div>)}
    </div>
  </section>;
}

export default function InBodyDetailedResults({ values, segments, targetValues, analysis }: {
  values?: BodyCompositionValues | null;
  segments?: InBodySegments | null;
  targetValues?: InBodyTargetValues | null;
  analysis?: InBodyAIAnalysis | null;
}) {
  const hasTargets = targetValues && Object.values(targetValues).some((value) => value != null);
  const hasSegments = segments && BODY_SEGMENTS.some((segment) =>
    segments[segment].lean.massKg != null || segments[segment].fat.massKg != null);

  if (!hasTargets && !hasSegments && !analysis) return null;

  const muscleTarget = values?.skeletalMuscleMassKg != null && targetValues?.muscleControlKg != null
    ? values.skeletalMuscleMassKg + targetValues.muscleControlKg : null;
  const fatTarget = values?.bodyFatMassKg != null && targetValues?.fatControlKg != null
    ? Math.max(0, values.bodyFatMassKg + targetValues.fatControlKg) : null;
  const pbfTarget = fatTarget != null && targetValues?.targetWeightKg
    ? fatTarget / targetValues.targetWeightKg * 100 : null;

  return <div className="min-w-0 space-y-4">
    {values && <Overview values={values} />}
    {hasTargets && <div className="flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/[0.08] p-3 text-xs text-ink-secondary"><Target className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" /><div><strong className="text-ink">Nguồn mục tiêu: thiết bị InBody</strong><p className="mt-0.5">Các mốc cân nặng, tăng cơ và giảm mỡ được Gemini đọc từ phiếu InBody. AI chỉ diễn giải và gợi ý cách tập; đây chưa phải mục tiêu do bạn tự chọn.</p></div></div>}
    {values && <section className="min-w-0 overflow-hidden rounded-2xl border border-black/5 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.02] sm:p-4">
      <div className="flex items-center gap-2"><Scale className="h-4 w-4 text-accent" /><h3 className="font-extrabold text-ink">Biểu đồ Cơ - Mỡ</h3></div>
      <p className="mt-1 text-xs text-ink-muted">Thanh màu là số hiện tại; vạch đen là mục tiêu do thiết bị InBody ghi trên phiếu.</p>
      <p className="mt-2 rounded-lg bg-black/[0.035] px-3 py-2 text-[10px] text-ink-muted dark:bg-white/5"><strong className="text-ink-secondary">Mức thay đổi cần thiết</strong> được tính theo khoảng cách tương đối tới mục tiêu: gần mục tiêu ≤2%, nhỏ ≤5%, vừa ≤10%, lớn &gt;10%. Đây không phải mức độ nguy hiểm hay tốc độ nên thay đổi.</p>
      <div className="mt-4 space-y-4">
        <GoalBar label="Cân nặng" value={values.weightKg} target={targetValues?.targetWeightKg} unit="kg" />
        <GoalBar label="Khối lượng cơ xương (SMM)" value={values.skeletalMuscleMassKg} target={muscleTarget} unit="kg" metricNoun="cơ" />
        <GoalBar label="Khối lượng mỡ" value={values.bodyFatMassKg} target={fatTarget} unit="kg" metricNoun="mỡ" />
      </div>
      {(values.bmi != null || values.percentBodyFat != null) && <div className="mt-5 border-t border-black/10 pt-4 dark:border-white/10">
        <h4 className="text-xs font-extrabold text-ink">Phân tích BMI và PBF</h4>
        <div className="mt-3 space-y-4">
          {values.bmi != null && <BmiBar value={values.bmi} />}
          <GoalBar label="Tỷ lệ mỡ cơ thể (PBF)" value={values.percentBodyFat} target={pbfTarget} unit="%" metricNoun="PBF" deltaUnit="điểm %" />
        </div>
      </div>}
    </section>}
    {analysis && <section className="min-w-0 overflow-hidden rounded-2xl border border-accent/25 bg-accent/[0.07] p-3 sm:p-4">
      <div className="flex items-center gap-2"><Brain className="h-4 w-4 text-accent" /><h3 className="font-extrabold text-ink">AI phân tích chỉ số</h3></div>
      <p className="mt-2 text-sm leading-6 text-ink-secondary">{analysis.summaryVi}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div><p className="text-xs font-bold text-ink">Điểm đáng chú ý</p><ul className="mt-1 space-y-1 text-xs text-ink-secondary">{analysis.highlightsVi.map((item) => <li key={item}>• {item}</li>)}</ul></div>
        <div><p className="text-xs font-bold text-ink">Trọng tâm tập luyện</p><ul className="mt-1 space-y-1 text-xs text-ink-secondary">{analysis.trainingFocusVi.map((item) => <li key={item}>• {item}</li>)}</ul></div>
      </div>
      <p className="mt-3 text-[11px] text-ink-muted">{analysis.disclaimerVi}</p>
    </section>}

    {hasSegments && segments && <section className="min-w-0 overflow-hidden rounded-2xl border border-black/5 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.02] sm:p-4">
      <div className="flex items-center gap-2"><Dumbbell className="h-4 w-4 text-accent" /><h3 className="font-extrabold text-ink">Phân bố cơ và mỡ theo vùng</h3></div>
      <p className="mt-1 text-xs text-ink-muted">Khối lượng và tỷ lệ so với mức tham chiếu của thiết bị InBody.</p>
      <div className="mt-3 grid gap-2 sm:hidden">
        {BODY_SEGMENTS.map((segment) => {
          const value = segments[segment];
          return <article key={segment} className="rounded-xl border border-black/5 bg-white/40 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <h4 className="text-xs font-bold text-ink">{SEGMENT_LABELS[segment]}</h4>
            <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
              <div><span className="block text-[10px] text-ink-muted">Cơ nạc</span><strong className="text-ink">{numberLabel(value.lean.massKg, 'kg')}</strong><span className="mt-0.5 block text-[10px] text-ink-muted">{numberLabel(value.lean.percentOfReference, '%')} tham chiếu</span><span className={`mt-1 block text-[10px] font-bold ${evaluationClass(value.lean.evaluation)}`}>{value.lean.evaluation ? EVALUATION_LABELS[value.lean.evaluation] : '-'}</span></div>
              <div><span className="block text-[10px] text-ink-muted">Mỡ</span><strong className="text-ink">{numberLabel(value.fat.massKg, 'kg')}</strong><span className="mt-0.5 block text-[10px] text-ink-muted">{numberLabel(value.fat.percentOfReference, '%')} tham chiếu</span><span className={`mt-1 block text-[10px] font-bold ${evaluationClass(value.fat.evaluation)}`}>{value.fat.evaluation ? EVALUATION_LABELS[value.fat.evaluation] : '-'}</span></div>
            </div>
          </article>;
        })}
      </div>
      <div className="mt-3 hidden max-w-full overflow-x-auto sm:block">
        <table className="w-full min-w-[620px] text-left text-xs">
          <thead className="text-ink-muted"><tr className="border-b border-black/10 dark:border-white/10"><th className="p-2">Vùng cơ thể</th><th className="p-2">Cơ nạc</th><th className="p-2">Đánh giá cơ</th><th className="p-2">Mỡ</th><th className="p-2">Đánh giá mỡ</th></tr></thead>
          <tbody>{BODY_SEGMENTS.map((segment) => {
            const value = segments[segment];
            return <tr key={segment} className="border-b border-black/5 last:border-0 dark:border-white/5">
              <th className="p-2 font-bold text-ink">{SEGMENT_LABELS[segment]}</th>
              <td className="p-2 font-mono text-ink">{numberLabel(value.lean.massKg, 'kg')} <span className="text-ink-muted">· {numberLabel(value.lean.percentOfReference, '%')}</span></td>
              <td className={`p-2 font-bold ${evaluationClass(value.lean.evaluation)}`}>{value.lean.evaluation ? EVALUATION_LABELS[value.lean.evaluation] : '-'}</td>
              <td className="p-2 font-mono text-ink">{numberLabel(value.fat.massKg, 'kg')} <span className="text-ink-muted">· {numberLabel(value.fat.percentOfReference, '%')}</span></td>
              <td className={`p-2 font-bold ${evaluationClass(value.fat.evaluation)}`}>{value.fat.evaluation ? EVALUATION_LABELS[value.fat.evaluation] : '-'}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section>}

    {hasTargets && targetValues && <section className="min-w-0 overflow-hidden rounded-2xl border border-black/5 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.02] sm:p-4">
      <div className="flex items-center gap-2"><Scale className="h-4 w-4 text-accent" /><h3 className="font-extrabold text-ink">Kiểm soát cân nặng và chuyển hoá</h3></div>
      <div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-3">
        {[
          ['Cân nặng mục tiêu', numberLabel(targetValues.targetWeightKg, 'kg')],
          ['Điều chỉnh cân nặng', numberLabel(targetValues.weightControlKg, 'kg', true)],
          ['Điều chỉnh mỡ', numberLabel(targetValues.fatControlKg, 'kg', true)],
          ['Điều chỉnh cơ', numberLabel(targetValues.muscleControlKg, 'kg', true)],
          ['Mức độ béo phì', numberLabel(targetValues.obesityDegreePercent, '%')],
          ['Năng lượng khuyến nghị', numberLabel(targetValues.recommendedCalorieIntakeKcal, 'kcal')],
        ].map(([label, value]) => <div key={label} className="rounded-xl bg-white/45 p-3 dark:bg-white/5"><span className="block text-[10px] text-ink-muted">{label}</span><strong className="mt-1 block font-mono text-sm text-ink">{value}</strong></div>)}
      </div>
    </section>}
  </div>;
}
