# Plan xây dựng bộ dữ liệu bài tập chuẩn từ ExerciseLibrary.app

Ngày lập kế hoạch: 2026-08-19  
Phạm vi: tên chuẩn, video demo, metadata có provenance, mô tả tiếng Việt do LLM sinh theo lô 5 bài, và cổng duyệt của Admin.

## 1. Kết quả cần đạt

Mỗi bản ghi được phép xuất bản phải truy ngược được về:

1. URL trang bài tập gốc trên `exerciselibrary.app` và ngày crawl.
2. ID bài tập, URL video gốc, HTTP status/content-type/size, SHA-256 của file đã tải (nếu được phép lưu bản sao).
3. Các field lấy trực tiếp từ nguồn và các field do LLM suy luận; không trộn hai loại này.
4. Tập frame đã dùng để kiểm tra động tác, cùng trạng thái `pending | approved | rejected` của người duyệt.
5. Model, prompt version, request/response hash và token/cost của lần gọi LLM.

Không coi một JSON vượt schema là “đúng” nếu video không tồn tại, tên không khớp, encoding hỏng, hoặc chưa qua human review.

## 2. Sự thật đã kiểm tra và các điểm phải khóa

- Trang chủ mô tả thư viện 8,000+ bài, lọc theo muscle/equipment và có video demo. Trang detail được index với route dạng `/exercise/{category}/{slug}`; ví dụ Barbell Bench Press là `/exercise/bench-press/barbell-bench-press`.
- Detail page hiển thị các trường có giá trị tham chiếu trực tiếp: tên, muscle chính/phụ, force, mechanic, difficulty và hướng dẫn từng bước. Đây là nguồn ưu tiên cho metadata, không để LLM tự đoán khi trang đã có dữ liệu.
- Trong repo, scraper đã quan sát endpoint nội bộ `GET /api/exercises?limit=300&gender=Male&page=N`; endpoint này không phải API công khai/ổn định nên phải có contract test và fallback crawl từ directory/detail page.
- Repo đang dùng CDN R2 theo mẫu `https://pub-51593a4f184f42908b6377b56bf19486.r2.dev/{gender}/{id6}01.mp4`. Đây chỉ là pattern đã quan sát trong code/data, chưa phải cam kết cấp phép hay SLA. Mỗi URL phải được kiểm tra riêng.
- Artifact hiện có 907 file `data/exercises/*.json`, trong khi snapshot `.el-full-list.json` chỉ có 186 item; không được suy ra coverage 8,000+ từ một snapshot không đầy đủ.
- Một số JSON/schema hiện có dấu hiệu mojibake (`Ē`, `Ồ`, `!`, ...). Phải chặn ở quality gate trước khi nhập dữ liệu mới.
- `scripts/generate-exercises-batch.ts` mặc định `BATCH_SIZE=10`; phải đổi cấu hình thành 5 và kiểm thử rằng **một HTTP request LLM nhận đúng 5 bài và trả đúng 5 phần tử**, không phải 5 request song song.
- `scripts/batch-llm-processor.ts` có fallback API key hard-code trong source. Phải xóa/rotate key, chỉ đọc secret từ environment/server-side; không chạy script này trước khi xử lý secret.

## 3. Schema canonical đề xuất

Giữ schema UI hiện tại làm projection, nhưng thêm một lớp raw/canonical để không mất bằng chứng:

```text
exercise_source_record
  source, source_page_url, source_exercise_id, source_slug, crawled_at
  name_en, source_primary_muscles[], source_secondary_muscles[]
  source_equipment[], source_force, source_mechanic, source_difficulty
  source_instructions[], source_tags[], raw_payload_hash

exercise_media_record
  exercise_id, source_video_url, local_object_key (nullable)
  gender, http_status, content_type, bytes, duration_ms, width, height
  sha256, downloaded_at, license_status, video_quality_status

exercise_ai_content
  exercise_id, name_vi, subtitle_vi, goal_vi, instructions_vi[]
  tips_vi[], common_mistakes_vi[], safety_vi, setup
  model, prompt_version, batch_id, generated_at, response_hash

exercise_review
  exercise_id, reviewer, status, checked_video, checked_name
  checked_muscles, checked_instructions, notes, reviewed_at
```

`data/exercises/<slug>.json` chỉ là bản publish/projection. Nên thêm `source` (không chỉ `media_metadata.source`) và `review_status`; dữ liệu raw không bị ghi đè khi AI regenerate.

## 4. Pipeline thực thi

### Phase A - Crawl và discovery

1. Crawl directory/list API trong browser context, lưu raw response và pagination metadata. Tạo `source_exercise_id -> canonical source URL` map; slug chỉ là khóa phụ vì có thể trùng.
2. Với từng ID, mở detail page để lấy metadata server-rendered/JSON-LD và bắt network request. Nếu endpoint nội bộ thay đổi, chuyển sang route crawl thay vì sửa dữ liệu thủ công.
3. Chuẩn hóa Unicode bằng UTF-8 NFC; giữ nguyên `name_en` nguồn. Chuẩn hóa equipment/muscle qua bảng mapping có version, không dùng fuzzy match tự động cho các biến thể nguy hiểm.
4. Deduplicate theo `(source, source_exercise_id)`; cảnh báo nếu cùng tên nhưng khác ID hoặc cùng video cho nhiều tên.

### Phase B - Lấy và xem video

1. Chỉ tải video khi `license_status` đã được xác nhận hoặc Admin chọn “allow local copy”; nếu chưa rõ quyền, lưu URL để stream và không commit binary.
2. Downloader phải hỗ trợ resume, retry exponential, checksum, giới hạn concurrency (3), timeout, content-length tối đa và không ghi đè file đã có hash đúng.
3. Kiểm tra `HTTP 200/206`, `video/mp4`, magic bytes, kích thước hợp lý; không chấp nhận HTML lỗi được trả về với status 200.
4. Dùng ffprobe/ffmpeg (hoặc thư viện tương đương) lấy duration, dimensions, fps, codec và trích frame đầu/giữa/cuối + mỗi 1-2 giây. Tạo contact sheet và lưu ngoài Git nếu file lớn.
5. Video QA theo checklist: đúng người/thiết bị/bài tập, thấy đủ biên độ, hướng chuyển động, số bên (left/right), không bị cắt mất setup, không thay thế bằng clip của biến thể khác. `video_quality_status=pass` chỉ sau người duyệt xác nhận; vision LLM chỉ là candidate.

### Phase C - Chuẩn bị lô LLM đúng 5 bài

Mỗi lần gọi là một request duy nhất:

```json
{
  "batch_id": "el-0001",
  "exercises": [ /* đúng 5 item */ ],
  "evidence": [
    {"slug":"...", "name_en":"...", "source_fields":{}, "frame_paths":["..."]}
  ]
}
```

Prompt bắt buộc yêu cầu JSON array đúng 5 phần tử, mỗi phần tử có `slug` bất biến. LLM được phép viết bản dịch/mô tả, nhưng không được thay đổi `name_en`, source muscles/equipment, video URL, hoặc tự bịa chi tiết không thấy trong source/frame. Nếu không chắc, trả `needs_review` và lý do.

Schema validation phải chạy ngay sau response: parse JSON, kiểm tra đúng 5 slug, enum, độ dài, Unicode, dấu câu và cấm placeholder. Retry chỉ cho toàn lô khi JSON lỗi; không tự merge phần tử từ response lỗi.

### Phase D - Human review và publish

1. Hiển thị 5 bài cùng video/contact sheet, field nguồn, field AI và diff.
2. Reviewer xác nhận riêng tên, video, muscle/equipment, instructions, safety; có thể sửa tiếng Việt mà không mất raw AI response.
3. Chỉ record `approved` mới sync sang Supabase/`data/exercises`; reject tạo reason và đưa vào retry queue.
4. Publish atomically theo batch; ghi audit log và version. Không xóa bản cũ.

## 5. Cấu trúc thư mục và lệnh dự kiến

```text
data/raw/exerciselibrary/<crawl-date>/*.json
data/canonical/exercises/*.json
data/ai-runs/<batch-id>/{request,response,frames.json}
data/review/queue.jsonl
public/videos/                 # chỉ khi license cho phép; ưu tiên object storage
scripts/crawl-exerciselibrary.ts
scripts/verify-exercise-videos.ts
scripts/generate-exercise-content.ts  # BATCH_SIZE=5
scripts/validate-exercise-dataset.ts
```

Lệnh tối thiểu cần có: `crawl --dry-run`, `media verify --limit 5`, `llm --batch-size 5 --dry-run`, `llm --resume`, `review export`, `validate --strict`. Mọi lệnh phải resumable và tạo manifest thay vì sửa âm thầm file nguồn.

## 6. Quality gates / acceptance criteria

- Coverage: 100% record có source ID + canonical URL; không có duplicate ID/slug.
- Media: 100% record publish có video URL kiểm tra được; checksum và metadata đầy đủ; không có HTML/zero-byte.
- Semantic: name/muscle/equipment lấy từ source hoặc mapping đã duyệt; video QA pass.
- LLM: mỗi request đúng 5 bài, output đúng 5 slug; 0 schema error sau retry; prompt/model/version truy vết được.
- Language: UTF-8 NFC, không mojibake, không tiếng Anh chen trong field `*_vi` trừ thuật ngữ được allowlist.
- Safety: mọi bài có safety note; bài không đủ bằng chứng bị `needs_review`, không publish tự động.
- Regression: chạy validator hiện tại và test route detail; không làm thay đổi các JSON cũ ngoài migration có manifest.

## 7. Thứ tự triển khai được khuyến nghị

1. Chốt license/điều khoản sử dụng và rotate secret bị hard-code.
2. Viết crawler raw + manifest, chạy pilot 10 bài (2 lô LLM × 5).
3. Tải/xem 5 video pilot, sửa mapping và checklist đến khi reviewer pass 100%.
4. Implement LLM request 5 bài + strict parser/retry/cache; đo token/cost và tỷ lệ reject.
5. Mở rộng 100-120 bài MVP; mỗi batch publish sau review, theo dõi missing/duplicate/encoding.
6. Sau khi pipeline ổn định mới mở rộng toàn catalog; không crawl 8,000+ một lần nếu chưa có rate-limit, storage và license budget.

## 8. Rủi ro cần quyết định trước khi code production

- `exerciselibrary.app` có cho phép tải lại/phân phối video hay chỉ nhúng/stream? Nếu chưa có câu trả lời, lưu URL + attribution, không mirror video.
- Endpoint `/api/exercises` là private implementation detail; cần fallback route crawl và snapshot contract.
- Video nam/nữ có thể là biến thể khác nhau; gender phải là một field bắt buộc, không overwrite cùng `slug`.
- LLM nhìn frame tĩnh không chứng minh đầy đủ chuyển động; review người vẫn là gate bắt buộc.
- Supabase schema hiện có `exercise_media` nhưng thiếu provenance chi tiết; nên migration bổ sung source URL, hash, license, review status trước khi bulk sync.

## Nguồn tham khảo đã kiểm tra

- [ExerciseLibrary.app homepage](https://www.exerciselibrary.app/) - mô tả catalog/filter/video.
- [Barbell Bench Press detail](https://www.exerciselibrary.app/exercise/bench-press/barbell-bench-press) - cấu trúc metadata và hướng dẫn hiển thị.
- [ExerciseLibrary API page](https://www.exerciselibrary.com/api/) - nguồn tên gần giống, **không phải** cùng domain; chỉ dùng để cảnh báo nhầm nguồn/API.

