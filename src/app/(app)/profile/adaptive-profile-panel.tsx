'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  Brain,
  Clock3,
  HeartPulse,
  Plus,
  SlidersHorizontal,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Sparkles
} from 'lucide-react';

type Constraint = { id: string; region: string; side: string | null; severity: number; triggers: string[]; expires_at: string | null };
type Preference = { id: string; target_type: string; target_key: string; preference: string; strength: number; source: string };
type Readiness = { energy: number; sleep_quality: number | null; sleep_hours: number | null; stress: number | null; available_minutes: number; intent: string | null; expires_at: string };

const SIDE_LABELS: Record<string, string> = { left: 'Trái', right: 'Phải', both: 'Hai bên' };
const PREFERENCE_LABELS: Record<string, string> = { prefer: 'Ưu tiên', avoid: 'Hạn chế', exclude: 'Không dùng' };
const PREFERENCE_BADGE_COLORS: Record<string, string> = {
  prefer: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  avoid: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  exclude: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
};

export default function AdaptiveProfilePanel() {
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [busy, setBusy] = useState('');

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/personalization/profile', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setConstraints(data.constraints ?? []);
        setPreferences(data.preferences ?? []);
        setReadiness(data.readiness ?? null);
      } else {
        setMessage({ text: 'Chưa tải được dữ liệu cá nhân hoá. Bạn có thể thử lại.', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Lỗi kết nối mạng khi tải dữ liệu cá nhân hoá.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(kind: string, payload: object) {
    setBusy(kind);
    setMessage(null);
    try {
      const response = await fetch('/api/personalization/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setBusy('');
      if (!response.ok) {
        setMessage({ text: 'Không thể lưu. Hãy kiểm tra các giá trị và thử lại.', type: 'error' });
        return false;
      }
      setMessage({ text: 'Đã cập nhật dữ liệu cá nhân hoá thích ứng AI.', type: 'success' });
      setTimeout(() => setMessage(null), 4000);
      await load();
      return true;
    } catch {
      setBusy('');
      setMessage({ text: 'Có lỗi xảy ra khi lưu dữ liệu.', type: 'error' });
      return false;
    }
  }

  async function remove(kind: 'constraint' | 'preference', id: string) {
    setBusy(id);
    try {
      const response = await fetch(`/api/personalization/profile?kind=${kind}&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      setBusy('');
      if (!response.ok) {
        setMessage({ text: 'Không thể xoá mục này.', type: 'error' });
        return;
      }
      await load();
    } catch {
      setBusy('');
      setMessage({ text: 'Có lỗi xảy ra khi xoá mục.', type: 'error' });
    }
  }

  async function addConstraint(formData: FormData) {
    const expiryDays = Number(formData.get('expiryDays'));
    const expiresAt = expiryDays > 0 ? new Date(Date.now() + expiryDays * 86400000).toISOString() : null;
    const ok = await submit('constraint', {
      constraint: {
        region: formData.get('region'),
        side: formData.get('side') || null,
        severity: Number(formData.get('severity')),
        triggers: String(formData.get('triggers') ?? '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        expiresAt,
      },
    });
    if (ok) (document.getElementById('constraint-form') as HTMLFormElement)?.reset();
  }

  async function addPreference(formData: FormData) {
    const ok = await submit('preference', {
      preference: {
        targetType: formData.get('targetType'),
        targetKey: formData.get('targetKey'),
        preference: formData.get('preference'),
        strength: Number(formData.get('strength')),
      },
    });
    if (ok) (document.getElementById('preference-form') as HTMLFormElement)?.reset();
  }

  async function addReadiness(formData: FormData) {
    await submit('readiness', {
      readiness: {
        energy: Number(formData.get('energy')),
        sleepQuality: Number(formData.get('sleepQuality')),
        sleepHours: formData.get('sleepHours') ? Number(formData.get('sleepHours')) : null,
        stress: Number(formData.get('stress')),
        availableMinutes: Number(formData.get('availableMinutes')),
        discomfortRegions: String(formData.get('discomfort') ?? '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        intent: String(formData.get('intent') ?? '').trim() || null,
      },
    });
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Intro Header */}
      <div className="card rounded-2xl p-3.5 sm:p-6 border border-white/80 dark:border-white/10 shadow-neumorph">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-accent text-white shadow-accent shrink-0">
              <Brain className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-ink">Cá nhân hoá thích ứng theo ngữ cảnh</h3>
                <span className="font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/15 px-2 py-0.5 rounded-full">
                  AI Context
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-ink-secondary mt-0.5">
                Huấn luyện viên AI sẽ tự động điều chỉnh giáo án, tránh các động tác chấn thương và ưu tiên bài tập yêu thích
              </p>
            </div>
          </div>
          {loading && <span className="font-mono text-[10px] text-ink-muted shrink-0" role="status">Đang tải…</span>}
        </div>

        {message && (
          <div
            className={`mt-3 sm:mt-4 rounded-xl border px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs font-medium flex items-center gap-2 sm:gap-2.5 ${
              message.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-500'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}
      </div>



      {/* 2. Exercise & Equipment Preferences */}
      <details className="group card rounded-2xl border border-white/80 dark:border-white/10 p-3.5 sm:p-6 shadow-neumorph space-y-3 sm:space-y-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 sm:gap-3 focus:outline-none">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-accent/10 text-accent">
              <SlidersHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <span className="font-extrabold text-xs sm:text-sm text-ink block">Sở thích bài tập & Thiết bị</span>
              <span className="text-[11px] sm:text-xs text-ink-muted">Ưu tiên hoặc loại bỏ các bài tập & dụng cụ cụ thể</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-mono text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-black/5 dark:bg-white/5 text-ink-muted">
              {preferences.length ? `${preferences.length} sở thích` : 'Chưa thiết lập'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-ink-muted transition-transform group-open:rotate-180" />
          </div>
        </summary>

        {preferences.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1 sm:pt-2">
            {preferences.map((item) => (
              <span
                key={item.id}
                className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-mono font-bold border ${
                  PREFERENCE_BADGE_COLORS[item.preference] ?? 'bg-black/5 text-ink border-black/10'
                }`}
              >
                <span>{PREFERENCE_LABELS[item.preference] ?? item.preference}:</span>
                <span className="font-extrabold">{item.target_key}</span>
                <button
                  type="button"
                  onClick={() => remove('preference', item.id)}
                  aria-label={`Xoá sở thích ${item.target_key}`}
                  className="ml-1 opacity-70 hover:opacity-100 hover:text-rose-500 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <form id="preference-form" action={addPreference} className="pt-3 border-t border-black/5 dark:border-white/5 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label text-xs sm:text-sm">Phân loại</label>
            <select name="targetType" className="input text-xs sm:text-sm">
              <option value="style">Phong cách tập (Style)</option>
              <option value="exercise">Bài tập cụ thể (Exercise)</option>
              <option value="pattern">Kiểu chuyển động (Pattern)</option>
              <option value="equipment">Thiết bị tập (Equipment)</option>
            </select>
          </div>
          <div>
            <label className="label text-xs sm:text-sm">Tên bài / Mã thiết bị</label>
            <input name="targetKey" required maxLength={120} className="input text-xs sm:text-sm" placeholder="Ví dụ: Dumbbell, Barbell Bench Press" />
          </div>
          <div>
            <label className="label text-xs sm:text-sm">Mức độ ưu tiên</label>
            <select name="preference" className="input text-xs sm:text-sm">
              <option value="prefer">Ưu tiên xuất hiện</option>
              <option value="avoid">Hạn chế tần suất</option>
              <option value="exclude">Không bao giờ dùng</option>
            </select>
          </div>
          <div>
            <label className="label text-xs sm:text-sm">Độ mạnh (1-5)</label>
            <select name="strength" defaultValue="3" className="input text-xs sm:text-sm">
              <option value="1">1/5 - Nhẹ</option>
              <option value="2">2/5 - Vừa phải</option>
              <option value="3">3/5 - Tiêu chuẩn</option>
              <option value="4">4/5 - Rất cao</option>
              <option value="5">5/5 - Tuyệt đối</option>
            </select>
          </div>
          <button disabled={busy === 'preference'} className="btn-ghost sm:col-span-2 text-xs font-bold py-2 sm:py-2.5">
            <Plus className="h-4 w-4 text-accent" />
            <span>{busy === 'preference' ? 'Đang lưu…' : 'Thêm sở thích'}</span>
          </button>
        </form>
      </details>

      {/* 3. Daily Readiness Check-in */}
      <details className="group card rounded-2xl border border-white/80 dark:border-white/10 p-3.5 sm:p-6 shadow-neumorph space-y-3 sm:space-y-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 sm:gap-3 focus:outline-none">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <span className="font-extrabold text-xs sm:text-sm text-ink block">Check-in thể trạng hôm nay (Daily Readiness)</span>
              <span className="text-[11px] sm:text-xs text-ink-muted">Tự động cân chỉnh khối lượng buổi tập trong ngày</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-mono text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-black/5 dark:bg-white/5 text-ink-muted">
              {readiness ? `Năng lượng ${readiness.energy}/5 · ${readiness.available_minutes}p` : 'Chưa check-in'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-ink-muted transition-transform group-open:rotate-180" />
          </div>
        </summary>

        <form action={addReadiness} className="pt-2 grid gap-3 sm:gap-3.5 sm:grid-cols-2">
          <div>
            <label className="label text-xs sm:text-sm">Mức năng lượng (Energy)</label>
            <select name="energy" defaultValue={readiness?.energy ?? 3} className="input text-xs sm:text-sm">
              <option value="1">1/5 - Rất mệt mỏi</option>
              <option value="2">2/5 - Hơi uể oải</option>
              <option value="3">3/5 - Bình thường</option>
              <option value="4">4/5 - Sung sức</option>
              <option value="5">5/5 - Tràn đầy năng lượng</option>
            </select>
          </div>
          <div>
            <label className="label text-xs sm:text-sm">Chất lượng giấc ngủ</label>
            <select name="sleepQuality" defaultValue={readiness?.sleep_quality ?? 3} className="input text-xs sm:text-sm">
              <option value="1">1/5 - Ngủ chập chờn / Mất ngủ</option>
              <option value="2">2/5 - Ngủ chưa sâu</option>
              <option value="3">3/5 - Ngủ ổn định</option>
              <option value="4">4/5 - Ngủ ngon</option>
              <option value="5">5/5 - Phục hồi hoàn hảo</option>
            </select>
          </div>
          <div>
            <label className="label text-xs sm:text-sm">Số giờ ngủ đêm qua</label>
            <input name="sleepHours" type="number" min="0" max="24" step="0.5" defaultValue={readiness?.sleep_hours ?? ''} placeholder="Ví dụ: 7.5" className="input text-xs sm:text-sm" />
          </div>
          <div>
            <label className="label text-xs sm:text-sm">Mức độ căng thẳng (Stress)</label>
            <select name="stress" defaultValue={readiness?.stress ?? 3} className="input text-xs sm:text-sm">
              <option value="1">1/5 - Rất thư giãn</option>
              <option value="2">2/5 - Căng thẳng nhẹ</option>
              <option value="3">3/5 - Trung bình</option>
              <option value="4">4/5 - Căng thẳng cao</option>
              <option value="5">5/5 - Quá tải áp lực</option>
            </select>
          </div>
          <div>
            <label className="label text-xs sm:text-sm">Thời gian có thể tập hôm nay</label>
            <div className="relative">
              <Clock3 className="absolute left-3 top-3.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-ink-muted" />
              <input name="availableMinutes" type="number" min="5" max="360" defaultValue={readiness?.available_minutes ?? 60} className="input pl-9 sm:pl-10 text-xs sm:text-sm" aria-label="Thời gian có thể tập, phút" />
            </div>
          </div>
          <div>
            <label className="label text-xs sm:text-sm">Vùng cơ thể đang mỏi / khó chịu</label>
            <input name="discomfort" className="input text-xs sm:text-sm" placeholder="Ví dụ: Lưng dưới, Bắp chân" />
          </div>
          <div className="sm:col-span-2">
            <label className="label text-xs sm:text-sm">Ý định buổi tập hôm nay</label>
            <input name="intent" maxLength={240} defaultValue={readiness?.intent ?? ''} className="input text-xs sm:text-sm" placeholder="Ví dụ: Tập trung kỹ thuật chuẩn, Tập nhẹ phục hồi, Thử tạ nặng" />
          </div>
          <button disabled={busy === 'readiness'} className="btn-primary sm:col-span-2 text-xs font-bold py-2 sm:py-2.5">
            <span>{busy === 'readiness' ? 'Đang lưu…' : 'Lưu check-in thể trạng hôm nay'}</span>
          </button>
        </form>
      </details>
    </div>
  );
}
