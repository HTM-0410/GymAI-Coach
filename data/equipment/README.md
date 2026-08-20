# Equipment Catalog — GymAI Coach

> Canonical reference cho mọi dụng cụ tập gym trong hệ thống.

## File nguồn

- **Canonical data**: [`equipment-catalog.ts`](./equipment-catalog.ts) — TypeScript object với 102 thiết bị.
- **DB seed**: [`../../scripts/seed-exercises-data.ts`](../../scripts/seed-exercises-data.ts) — `EQUIPMENT_SEED` mirror catalog, dùng để upsert vào Supabase `equipment` table.
- **Resolver**: [`../../scripts/sync-exercises.ts`](../../scripts/sync-exercises.ts) — `EQUIPMENT_ALIASES` map các surface form (Tiếng Việt + English) về slug chuẩn.
- **Migration JSON**: [`../../scripts/migrate-exercise-equipment.ts`](../../scripts/migrate-exercise-equipment.ts) — chuẩn hoá tất cả `equipment[]` trong `data/exercises/*.json` về canonical Vietnamese name.
- **Migration DB**: [`../../supabase/migrations/20260820000000_normalize_equipment_catalog.sql`](../../supabase/migrations/20260820000000_normalize_equipment_catalog.sql) — hợp nhất bản ghi trùng và chuyển mapping FK an toàn.

## Categories taxonomy

| Slug         | Label VN     | Mô tả                                          | Số lượng |
| ------------ | ------------ | ---------------------------------------------- | -------- |
| `free_weight`| Tạ tự do     | Barbell, dumbbell, kettlebell, plate, cambered | 9        |
| `machine`    | Máy tập      | Cable, Smith, leg press, GHR, reverse hyper... | 49       |
| `bodyweight` | Tự trọng     | Pull-up bar, dip, parallel bars, rings         | 5        |
| `cardio`     | Cardio       | Treadmill, bike, rower, ski erg...             | 11       |
| `furniture`  | Nội thất     | Bench, mat, stability ball, BOSU, preacher...  | 10       |
| `accessory`  | Phụ kiện     | Band, ab wheel, foam roller, rope, TRX...      | 18       |
|              |              | **TOTAL**                                      | **102**  |

## Convention

| Field          | Bắt buộc | Mô tả                                                                 |
| -------------- | -------- | --------------------------------------------------------------------- |
| `slug`         | ✓        | kebab-case, bất biến. FK giữa equipment, exercise_equipment, gym_equipment, profile_equipment. |
| `name`         | ✓        | Tên tiếng Anh canonical (NSCA / ACSM). Dùng cho UI EN.               |
| `name_vi`      | ✓        | Tên tiếng Việt chuẩn. Dùng cho UI VN và làm key resolve từ JSON.     |
| `category`     | ✓        | 1 trong 6: `free_weight`, `machine`, `bodyweight`, `cardio`, `furniture`, `accessory`. |
| `description_vi` | ✓      | 1 câu ≤ 80 ký tự. Tooltip / onboarding / help text.                   |
| `aliases_vi`   |          | Vietnamese surface variants (ví dụ "Tạ đơn" ↔ "Tạ đôi").             |
| `aliases_en`   |          | English variants (ví dụ "EZ Bar" ↔ "EZ Barbell").                     |

## Equipment Modifiers (không phải dụng cụ)

`weighted`, `assisted` — modifier trên bài tập, tách riêng khỏi `equipment[]`:

- `weighted`: bài có thêm tạ (vest/đĩa/đai).
- `assisted`: bài dùng dây/máy hỗ trợ để giảm tải.

Trong exercise JSON:
```json
{
  "equipment": ["Xà đơn"],
  "modifiers": ["weighted"]
}
```

## Mapping coverage hiện tại

Trên 1,324 file exercise JSON: **26 unique equipment strings**, mapping coverage **100%** (không có string nào unmapped) sau khi áp catalog này.

## Cách dùng catalog

### Trong code

```ts
import { EQUIPMENT_CATALOG, getEquipmentBySlug, listByCategory } from '@/data/equipment/equipment-catalog';

const barbell = getEquipmentBySlug('barbell');   // → { name: 'Barbell', name_vi: 'Thanh tạ đòn', ... }
const machines = listByCategory('machine');      // → 16 rows
```

### Resolve từ raw string

```ts
import { buildVietnameseSlugMap } from '@/data/equipment/equipment-catalog';

const map = buildVietnameseSlugMap();
const slug = map.get('thanh đòn');  // → 'barbell'
```

### Migrate dữ liệu

```bash
npx tsx scripts/migrate-exercise-equipment.ts --dry-run   # xem trước
npx tsx scripts/migrate-exercise-equipment.ts              # áp dụng
```
