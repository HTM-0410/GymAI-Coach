'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

import { ThemeToggle } from '@/components/theme-toggle';

export default function ProfileForm({ initial, email }: { initial: any; email: string }) {
  const [displayName, setDisplayName] = useState(initial?.display_name ?? '');
  const [height, setHeight] = useState(initial?.height_cm?.toString() ?? '');
  const [weight, setWeight] = useState(initial?.current_weight_kg?.toString() ?? '');
  const [experience, setExperience] = useState<any>(initial?.experience_level ?? '');
  const [goal, setGoal] = useState<any>(initial?.goal ?? '');
  const [days, setDays] = useState(initial?.preferred_training_days ?? 4);
  const [duration, setDuration] = useState(initial?.preferred_session_duration ?? 60);
  const [unit, setUnit] = useState(initial?.unit_system ?? 'metric');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true); setSaved(false);
    const supabase = createClient();
    await supabase.from('profiles').update({
      display_name: displayName,
      height_cm: height ? Number(height) : null,
      current_weight_kg: weight ? Number(weight) : null,
      experience_level: experience,
      goal,
      preferred_training_days: days,
      preferred_session_duration: duration,
      unit_system: unit,
    }).eq('user_id', initial.user_id);
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="card shadow-neumorph-lg rounded-2xl p-8 space-y-6 border border-white/80 dark:border-white/10">
      {/* Email badge */}
      <div className="bg-chassis shadow-inset-sm rounded-lg px-4 py-2 border border-white/40 dark:border-white/5">
        <p className="font-mono text-xs text-ink-muted uppercase tracking-wider">{email}</p>
      </div>

      {/* Theme selection */}
      <div>
        <label className="label">Chế độ giao diện (Theme)</label>
        <ThemeToggle variant="segmented" className="w-full justify-between" />
      </div>

      {/* Display name */}
      <div>
        <label className="label">Tên hiển thị</label>
        <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Hoàng" />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Chiều cao (cm)</label>
          <input className="input" type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="170" />
        </div>
        <div>
          <label className="label">Cân nặng (kg)</label>
          <input className="input" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70" />
        </div>
        <div>
          <label className="label">Đơn vị</label>
          <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="metric">Metric</option>
            <option value="imperial">Imperial</option>
          </select>
        </div>
      </div>

      {/* Experience */}
      <div>
        <label className="label">Kinh nghiệm</label>
        <select className="input" value={experience ?? ''} onChange={(e) => setExperience(e.target.value)}>
          <option value="">— Chưa chọn —</option>
          <option value="beginner">Mới bắt đầu</option>
          <option value="intermediate">Trung cấp</option>
          <option value="advanced">Nâng cao</option>
        </select>
      </div>

      {/* Goal */}
      <div>
        <label className="label">Mục tiêu</label>
        <select className="input" value={goal ?? ''} onChange={(e) => setGoal(e.target.value)}>
          <option value="">— Chưa chọn —</option>
          <option value="muscle_gain">Tăng cơ</option>
          <option value="strength_gain">Tăng sức mạnh</option>
          <option value="fat_loss">Giảm mỡ</option>
          <option value="maintenance">Duy trì thể lực</option>
        </select>
      </div>

      {/* Training days */}
      <div>
        <label className="label">Số ngày / tuần: <span className="text-accent font-bold">{days}</span></label>
        <input type="range" min={1} max={7} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full accent-[#f97316]" />
        <div className="flex justify-between mt-1">
          {[1,2,3,4,5,6,7].map((d) => <span key={d} className="font-mono text-[10px] text-ink-muted">{d}</span>)}
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="label">Phút / buổi: <span className="text-accent font-bold">{duration}</span></label>
        <input type="range" min={15} max={240} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full accent-[#f97316]" />
        <div className="flex justify-between mt-1">
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          <span className="font-mono text-[10px] text-ink-muted">15'</span>
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          <span className="font-mono text-[10px] text-ink-muted">120'</span>
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          <span className="font-mono text-[10px] text-ink-muted">240'</span>
        </div>
      </div>

      {/* Save button */}
      <button onClick={save} disabled={saving} className="btn-primary w-full">
        {saving ? 'Đang lưu…' : saved ? 'Đã lưu' : 'Lưu thay đổi'}
      </button>

      {/* Quick links */}
      <div className="border-t border-chassis-lo pt-5 space-y-3">
        <Link href="/profile/weight" className="flex items-center gap-2 text-sm text-accent hover:text-accent-dim transition-colors font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
          Ghi cân nặng hôm nay
        </Link>
        <Link href="/auth/logout" className="flex items-center gap-2 text-sm text-danger hover:opacity-80 transition-opacity font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-danger shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
          Đăng xuất
        </Link>
      </div>
    </div>
  );
}
