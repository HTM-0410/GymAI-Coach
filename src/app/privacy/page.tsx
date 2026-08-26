import Link from 'next/link';

export const metadata = {
  title: 'Chính sách quyền riêng tư | GymAI Coach',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-chassis px-5 py-12 text-ink blueprint-grid">
      <article className="mx-auto max-w-3xl rounded-2xl border border-chassis-lo bg-chassis/95 p-6 shadow-neumorph-lg sm:p-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">GymAI Coach</p>
        <h1 className="mt-3 text-3xl font-bold">Chính sách quyền riêng tư</h1>
        <p className="mt-2 text-sm text-ink-muted">Cập nhật ngày 23/08/2026</p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-ink-secondary sm:text-base">
          <section>
            <h2 className="text-lg font-semibold text-ink">Thông tin chúng tôi xử lý</h2>
            <p className="mt-2">
              Khi bạn đăng nhập bằng Google, GymAI Coach nhận thông tin hồ sơ cơ bản mà bạn cho phép,
              gồm tên, địa chỉ email và ảnh đại diện. Ứng dụng cũng lưu dữ liệu bạn chủ động nhập như mục
              tiêu, lịch tập, thiết bị, nhật ký tập luyện và các chỉ số cơ thể.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">Mục đích sử dụng</h2>
            <p className="mt-2">
              Dữ liệu được dùng để xác thực tài khoản, cá nhân hoá kế hoạch tập luyện, theo dõi tiến độ,
              vận hành tính năng AI Coach và bảo vệ an toàn hệ thống. Chúng tôi không bán dữ liệu cá nhân.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">Lưu trữ và chia sẻ</h2>
            <p className="mt-2">
              Dữ liệu xác thực và ứng dụng được lưu qua Supabase. Một phần ngữ cảnh cần thiết có thể được
              gửi tới nhà cung cấp AI để tạo câu trả lời hoặc kế hoạch tập; dữ liệu được giới hạn theo chức
              năng đang sử dụng. Chúng tôi chỉ chia sẻ khi cần vận hành dịch vụ hoặc theo yêu cầu pháp luật.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">Quyền của bạn</h2>
            <p className="mt-2">
              Bạn có thể cập nhật thông tin hồ sơ, ngừng sử dụng dịch vụ hoặc yêu cầu truy cập, chỉnh sửa và
              xoá dữ liệu. Liên hệ{' '}
              <a className="text-accent hover:underline" href="mailto:hoangtruongminh22@gmail.com">
                hoangtruongminh22@gmail.com
              </a>{' '}
              để gửi yêu cầu liên quan đến quyền riêng tư.
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
