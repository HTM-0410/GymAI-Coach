# TIP-EXERCISE-DATA-REBUILD

**Vai trò:** Chủ thầu → Thợ  
**Mục tiêu:** thay catalog exercise cũ bằng dataset Gym visual adapter, giữ provenance, chuẩn bị dịch tiếng Việt theo lô 5 và giữ web route hiện tại hoạt động.

## Quyết định

- Phạm vi thay thế chỉ là `data/exercises/`; không xóa `supabase/`, migrations, source code hay dữ liệu workout.
- Catalog cũ phải được archive trước khi replace; không dùng `git reset`/overwrite mất khả năng phục hồi.
- Dataset gốc ở `external/exercises-dataset/` là nguồn raw, không chỉnh trực tiếp.
- Media Gym visual chỉ dùng prototype/internal cho đến khi có license riêng; mọi record giữ attribution.
- Bản ghi import ban đầu có `translation_status=machine_pending`; không coi là bản dịch cuối.
- Một lần gọi LLM dịch đúng 5 bài, output phải trả đúng 5 slug.

## Acceptance criteria

- [ ] Source có 1.324 records, 1.324 GIF và 1.324 thumbnails.
- [ ] Catalog mới có 1.324 JSON, slug duy nhất, media path tồn tại.
- [ ] Mỗi record giữ `source_id`, `source_url`, `media_id`, `attribution`, `translation_status`.
- [ ] `npm run build` và validator loader không fail do schema mới.
- [ ] Lệnh translate có `--batch-size 5`, cache/resume, strict JSON cardinality.
- [ ] Không commit `.env`, API key, hoặc raw binary source nếu chưa được duyệt license.

## Completion report (initial import)

Sẽ ghi sau khi chạy `tsx scripts/import-gymvisual-dataset.ts --replace` và validator.

