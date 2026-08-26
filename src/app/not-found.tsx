import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-chassis blueprint-grid flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#111317]/80 backdrop-blur-md p-8 text-center shadow-lg">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 font-mono text-[10px] uppercase tracking-widest text-accent mb-4">
          404 // NOT FOUND
        </div>
        <h1 className="text-2xl font-extrabold text-ink tracking-tight mb-2">Trang không tồn tại</h1>
        <p className="text-xs text-ink-muted leading-relaxed mb-6">
          Địa chỉ yêu cầu không tìm thấy hoặc đã được di chuyển.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:opacity-90 transition-opacity"
        >
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
