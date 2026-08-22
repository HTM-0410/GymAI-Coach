'use client';

import { ExternalLink, Link2, PlayCircle, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';

function getYoutubeEmbed(url: string) {
  try {
    const parsed = new URL(url);
    const id = parsed.hostname.includes('youtu.be')
      ? parsed.pathname.slice(1)
      : parsed.searchParams.get('v') ?? parsed.pathname.match(/\/embed\/([^/?]+)/)?.[1];
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

export default function VideoGuide() {
  const [input, setInput] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');
  const youtubeEmbed = useMemo(() => getYoutubeEmbed(videoUrl), [videoUrl]);

  function addVideo() {
    try {
      const parsed = new URL(input.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      setVideoUrl(parsed.toString());
      setInput('');
      setError('');
    } catch {
      setError('Dán một liên kết http hoặc https hợp lệ.');
    }
  }

  return (
    <section className="card corner-screws p-5">
      <h2 className="flex items-center gap-2 border-b border-chassis-lo pb-3 font-mono text-xs font-bold uppercase tracking-wider text-ink">
        <PlayCircle className="h-4 w-4 text-accent" strokeWidth={1.5} /> Video hướng dẫn
      </h2>

      {videoUrl ? (
        <div className="mt-4">
          {youtubeEmbed ? (
            <div className="aspect-video overflow-hidden rounded-lg bg-slate-950 shadow-inset">
              <iframe className="h-full w-full" src={youtubeEmbed} title="Video hướng dẫn bài tập" allowFullScreen />
            </div>
          ) : (
            <a href={videoUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-lg bg-chassis p-4 shadow-inset hover:text-accent">
              <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink"><Link2 className="h-4 w-4 shrink-0 text-accent" /> <span className="truncate">Mở video hướng dẫn</span></span>
              <ExternalLink className="h-4 w-4 shrink-0" />
            </a>
          )}
          <button onClick={() => setVideoUrl('')} className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted hover:text-danger"><X className="h-3.5 w-3.5" /> Xóa liên kết</button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="mb-3 text-sm leading-6 text-ink-secondary">Thêm video kỹ thuật từ YouTube, Vimeo hoặc một liên kết video công khai.</p>
          <div className="flex gap-2">
            <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addVideo()} placeholder="https://www.youtube.com/watch?v=..." className="input min-w-0 flex-1 py-2.5 text-xs" aria-label="Liên kết video hướng dẫn" />
            <button onClick={addVideo} className="btn-primary shrink-0 px-3 py-2.5" aria-label="Thêm video"><Plus className="h-4 w-4" /></button>
          </div>
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </div>
      )}
    </section>
  );
}