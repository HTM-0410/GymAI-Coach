import Link from 'next/link';

export const metadata = {
  title: 'Điều khoản sử dụng | GymAI Coach',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-chassis px-5 py-12 text-ink blueprint-grid">
      <article className="mx-auto max-w-3xl rounded-2xl border border-chassis-lo bg-chassis/95 p-6 shadow-neumorph-lg sm:p-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">GymAI Coach</p>
        <h1 className="mt-3 text-3xl font-bold">Điều khoản sử dụng</h1>
        <p className="mt-2 text-sm text-ink-muted">Cập nhật ngày 23/08/2026</p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-ink-secondary sm:text-base">
          <section>
            <h2 className="text-lg font-semibold text-ink">Chấp nhận điều khoản</h2>
            <p className="mt-2">
              Khi tạo tài khoản hoặc sử dụng GymAI Coach, bạn đồng ý với các điều khoản này và Chính sách
              quyền riêng tư của ứng dụng. Bạn chịu trách nhiệm bảo mật tài khoản và thông tin đăng nhập.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">Phạm vi dịch vụ</h2>
            <p className="mt-2">
              GymAI Coach cung cấp công cụ lập kế hoạch, ghi nhật ký và gợi ý tập luyện bằng AI. Nội dung chỉ
              mang tính tham khảo, không phải chẩn đoán, điều trị hay tư vấn y khoa chuyên nghiệp.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">An toàn tập luyện</h2>
            <p className="mt-2">
              Bạn cần tự đánh giá thể trạng, sử dụng kỹ thuật phù hợp và dừng tập khi có dấu hiệu bất thường.
              Nếu có bệnh lý, chấn thương hoặc nghi ngờ về sức khoẻ, hãy tham khảo bác sĩ hoặc chuyên gia đủ
              chuyên môn trước khi áp dụng gợi ý của ứng dụng.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">Sử dụng hợp lệ</h2>
            <p className="mt-2">
              Không được lạm dụng dịch vụ, truy cập trái phép, gây gián đoạn hệ thống hoặc sử dụng ứng dụng
              cho mục đích vi phạm pháp luật. Dịch vụ có thể được cập nhật hoặc tạm ngừng để bảo trì và cải tiến.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">Liên hệ</h2>
            <p className="mt-2">
              Mọi câu hỏi về điều khoản có thể gửi tới{' '}
              <a className="text-accent hover:underline" href="mailto:hoangtruongminh22@gmail.com">
                hoangtruongminh22@gmail.com
              </a>.
            </p>
          </section>
        </div>

        <Link className="mt-10 inline-flex font-semibold text-accent hover:underline" href="/">
          ← Quay lại GymAI Coach
        </Link>
      </article>
    </main>
  );
}
