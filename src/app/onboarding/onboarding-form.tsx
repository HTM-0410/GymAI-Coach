'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ChevronRight } from 'lucide-react';
import EquipmentStep, { EquipmentItem } from './equipment-step';

type Profile = {
  id?: string;
  display_name?: string | null;
  height_cm?: number | null;
  current_weight_kg?: number | null;
  experience_level?: 'beginner' | 'intermediate' | 'advanced' | null;
  goal?: 'muscle_gain' | 'strength_gain' | 'fat_loss' | 'maintenance' | null;
  preferred_training_days?: number | null;
  preferred_session_duration?: number | null;
};

const expOptions: [Profile['experience_level'], string][] = [
  ['beginner',     'Mới bắt đầu'],
  ['intermediate', 'Trung cấp'],
  ['advanced',     'Nâng cao'],
];

const goalOptions: [Profile['goal'], string][] = [
  ['muscle_gain',    'Tăng cơ'],
  ['strength_gain',  'Tăng sức mạnh'],
  ['fat_loss',       'Giảm mỡ'],
  ['maintenance',    'Duy trì thể lực'],
];

function ToggleOption({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-lg px-4 py-3 text-sm font-medium transition-all duration-150 text-center
        ${selected
          ? 'bg-accent text-white shadow-accent font-bold'
          : 'bg-chassis shadow-neumorph-sm text-ink-secondary hover:text-ink hover:-translate-y-0.5'
        }`}>
      {label}
    </button>
  );
}

const TOTAL_STEPS = 4;

export default function OnboardingForm({
  initial,
  equipment,
  preselectedEquipment,
}: {
  initial: Profile | null;
  equipment: EquipmentItem[];
  preselectedEquipment: string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(initial?.display_name ?? '');
  const [height, setHeight] = useState(initial?.height_cm?.toString() ?? '');
  const [weight, setWeight] = useState(initial?.current_weight_kg?.toString() ?? '');
  const [experience, setExperience] = useState<Profile['experience_level']>(initial?.experience_level ?? null);
  const [goal, setGoal] = useState<Profile['goal']>(initial?.goal ?? null);
  const [days, setDays] = useState<number>(initial?.preferred_training_days ?? 4);
  const [duration, setDuration] = useState<number>(initial?.preferred_session_duration ?? 60);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(preselectedEquipment);

  async function save() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Chưa đăng nhập'); setLoading(false); return; }

    // Step 1 — upsert profile with all collected fields + mark step.
    const { data: profileRow, error: upsertErr } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        height_cm: height ? Number(height) : null,
        current_weight_kg: weight ? Number(weight) : null,
        experience_level: experience,
        goal,
        preferred_training_days: days,
        preferred_session_duration: duration,
        onboarding_step: 4,
      })
      .eq('user_id', user.id)
      .select('id')
      .single();

    if (upsertErr) { setError(upsertErr.message); setLoading(false); return; }

    const profileId = (profileRow as any)?.id;

    // Step 2 — sync profile_equipment (delete-all-then-insert for simplicity).
    if (profileId) {
      const { error: delErr } = await supabase
        .from('profile_equipment')
        .delete()
        .eq('profile_id', profileId);
      if (delErr) { setError(delErr.message); setLoading(false); return; }

      if (selectedEquipment.length > 0) {
        const rows = selectedEquipment.map((equipment_id) => ({
          profile_id: profileId,
          equipment_id,
        }));
        const { error: insErr } = await supabase
          .from('profile_equipment')
          .insert(rows);
        if (insErr) { setError(insErr.message); setLoading(false); return; }
      }
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="card shadow-neumorph-lg rounded-2xl p-8">
      {/* LED progress bar (4 segments now) */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div className={`h-3 flex-1 rounded-full transition-all duration-300 ${
              s <= step ? 'bg-accent shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'bg-chassis shadow-inset-sm'
            }`} />
            {s < TOTAL_STEPS && (
              <span className={`h-3 w-3 rounded-full flex-shrink-0 ${
                s < step ? 'bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]' : 'bg-chassis-lo'
              }`} />
            )}
          </div>
        ))}
        <span className="font-mono text-[10px] text-ink-muted uppercase tracking-widest ml-2 shrink-0">
          {step}/{TOTAL_STEPS}
        </span>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)] led-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Step 01</span>
            </div>
            <h2 className="text-xl font-bold text-ink">Thông tin cơ bản</h2>
          </div>

          <div>
            <label className="label">Tên hiển thị</label>
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Hoàng"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Chiều cao (cm)</label>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="170"
                min={100}
                max={250}
              />
            </div>
            <div>
              <label className="label">Cân nặng (kg)</label>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="70"
                min={20}
                max={300}
                step={0.1}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!displayName}
              className="btn-primary"
            >
              Tiếp theo <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)] led-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Step 02</span>
            </div>
            <h2 className="text-xl font-bold text-ink">Kinh nghiệm & Mục tiêu</h2>
          </div>

          <div>
            <label className="label">Kinh nghiệm tập gym</label>
            <div className="grid grid-cols-3 gap-3">
              {expOptions.map(([v, label]) => (
                <ToggleOption key={v} label={label} selected={experience === v} onClick={() => setExperience(v)} />
              ))}
            </div>
          </div>

          <div>
            <label className="label">Mục tiêu chính</label>
            <div className="grid grid-cols-2 gap-3">
              {goalOptions.map(([v, label]) => (
                <ToggleOption key={v} label={label} selected={goal === v} onClick={() => setGoal(v)} />
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="btn-ghost"> Quay lại</button>
            <button
              onClick={() => setStep(3)}
              disabled={!experience || !goal}
              className="btn-primary"
            >
              Tiếp theo <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)] led-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Step 03</span>
            </div>
            <h2 className="text-xl font-bold text-ink">Lịch tập mong muốn</h2>
          </div>

          <div>
            <label className="label">
              Số ngày tập / tuần:{' '}
              <span className="text-accent font-mono font-bold">{days} ngày</span>
            </label>
            <input
              type="range"
              min={1}
              max={7}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full accent-[#f97316]"
            />
            <div className="flex justify-between mt-1">
              {[1,2,3,4,5,6,7].map((d) => (
                <span key={d} className="font-mono text-[10px] text-ink-muted">{d}</span>
              ))}
            </div>
          </div>

          <div>
            <label className="label">
              Thời lượng mỗi buổi:{' '}
              <span className="text-accent font-mono font-bold">{duration} phút</span>
            </label>
            <input
              type="range"
              min={15}
              max={240}
              step={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-[#f97316]"
            />
            <div className="flex justify-between mt-1">
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              <span className="font-mono text-[10px] text-ink-muted">15'</span>
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              <span className="font-mono text-[10px] text-ink-muted">60'</span>
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              <span className="font-mono text-[10px] text-ink-muted">120'</span>
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              <span className="font-mono text-[10px] text-ink-muted">180'</span>
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              <span className="font-mono text-[10px] text-ink-muted">240'</span>
            </div>
          </div>

          {error && (
            <div className="bg-chassis shadow-inset-sm rounded-md px-4 py-3">
              <p className="font-mono text-xs text-danger">
                <span className="font-bold uppercase tracking-wider mr-1">ERR:</span>
                {error}
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="btn-ghost"> Quay lại</button>
            <button onClick={() => setStep(4)} className="btn-primary">
              Tiếp theo <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <EquipmentStep
            equipment={equipment}
            selected={selectedEquipment}
            onChange={setSelectedEquipment}
          />

          {error && (
            <div className="bg-chassis shadow-inset-sm rounded-md px-4 py-3">
              <p className="font-mono text-xs text-danger">
                <span className="font-bold uppercase tracking-wider mr-1">ERR:</span>
                {error}
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(3)} className="btn-ghost"> Quay lại</button>
            <button onClick={save} disabled={loading} className="btn-primary">
              {loading ? 'Đang khởi tạo…' : 'Hoàn tất'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
