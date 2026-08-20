'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, Save } from 'lucide-react';

type Content = {
  description: string;
  instructions: string[];
  tips: string[];
  common_mistakes: string[];
  suggested_equipment: string[];
  suggested_primary_muscles: string[];
  suggested_secondary_muscles: string[];
  difficulty: string;
  exercise_type: string;
  default_rest_seconds: number;
  default_rir: number;
};

export default function ExerciseAiClient() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const [saveAsCustom, setSaveAsCustom] = useState(false);
  const [saving, setSaving] = useState(false);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true); setError(null); setContent(null);
    try {
      const res = await fetch('/api/ai/exercise-content', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), saveAsCustom }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Lỗi');
      setContent(data.content);
      if (data.exerciseId) router.push('/exercises');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false); setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Generator form */}
      <form onSubmit={generate} className="card shadow-neumorph rounded-xl p-5 space-y-4">
        <div>
          <label className="label">Tên bài tập (tiếng Anh hoặc Việt)</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Barbell Bench Press / Đẩy ngực thanh đòn" required />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer">
          <input type="checkbox" checked={saveAsCustom} onChange={(e) => setSaveAsCustom(e.target.checked)} className="accent-[#f97316] rounded" />
          Lưu thành custom exercise (của tôi)
        </label>
        <button disabled={loading || saving} className="btn-primary w-full inline-flex items-center justify-center gap-2">
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" />AI đang tạo nội dung…</>
            : saving
              ? <><Loader2 className="h-4 w-4 animate-spin" />Đang lưu…</>
              : saveAsCustom
                ? <><Save className="h-4 w-4" />Tạo + Lưu</>
                : <><Sparkles className="h-4 w-4" />Tạo nội dung</>}
        </button>
        {error && (
          <div className="bg-chassis shadow-inset-sm rounded-md px-4 py-2">
            <p className="font-mono text-xs text-danger font-bold uppercase tracking-wider">ERR: {error}</p>
          </div>
        )}
      </form>

      {/* Generated content */}
      {content && (
        <div className="card shadow-neumorph rounded-xl p-5 space-y-5">
          <div>
            <span className="label">Mô tả</span>
            <p className="text-sm text-ink leading-relaxed">{content.description}</p>
          </div>
          <div>
            <span className="label">Cách thực hiện</span>
            <ol className="list-decimal list-inside text-sm space-y-1 text-ink-secondary">
              {content.instructions.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>
          {content.tips.length > 0 && (
            <div>
              <span className="label">Tips</span>
              <ul className="text-sm space-y-1 text-ink-secondary">
                {content.tips.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
          )}
          {content.common_mistakes.length > 0 && (
            <div>
              <span className="label">Lỗi thường gặp</span>
              <ul className="text-sm space-y-1 text-ink-secondary">
                {content.common_mistakes.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-chassis-lo">
            <div><span className="label">Độ khó</span><div className="text-sm font-medium text-ink">{content.difficulty}</div></div>
            <div><span className="label">Loại</span><div className="text-sm font-medium text-ink">{content.exercise_type}</div></div>
            <div><span className="label">Nghỉ</span><div className="text-sm font-medium text-ink">{content.default_rest_seconds}s</div></div>
            <div><span className="label">RIR</span><div className="text-sm font-medium text-ink">{content.default_rir}</div></div>
          </div>
          {(content.suggested_primary_muscles.length + content.suggested_secondary_muscles.length + content.suggested_equipment.length) > 0 && (
            <div>
              <span className="label">Gợi ý</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {content.suggested_primary_muscles.map((m) => <span key={m} className="chip text-xs active">{m} ●</span>)}
                {content.suggested_secondary_muscles.map((m) => <span key={m} className="chip text-xs">{m}</span>)}
                {content.suggested_equipment.map((e) => <span key={e} className="chip text-xs">{e}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
