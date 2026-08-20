export const LB_TO_KG = 0.45359237;

export type EquipmentDetectionCatalogItem = {
  slug: string;
  name_vi: string | null;
  category: string | null;
};

export function normalizeEquipmentWeightKg(value: number, unit: 'kg' | 'lb'): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Weight must be a positive number.');
  }
  const kg = unit === 'lb' ? value * LB_TO_KG : value;
  return Math.round(kg * 100) / 100;
}

export function buildEquipmentDetectionResponseSchema(validSlugs: string[]) {
  return {
    type: 'object',
    required: ['detected', 'dumbbells'],
    properties: {
      detected: {
        type: 'array',
        description: 'Thiết bị nhìn thấy rõ và map chính xác vào catalog.',
        items: {
          type: 'object',
          required: ['equipment_slug', 'quantity', 'confidence', 'evidence_vi'],
          properties: {
            equipment_slug: { type: 'string', enum: validSlugs },
            quantity: { type: 'integer', minimum: 1, maximum: 1000 },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            evidence_vi: { type: 'string', description: 'Dấu hiệu thị giác ngắn giải thích mapping.' },
          },
        },
      },
      dumbbells: {
        type: 'array',
        description: 'Từng mức trọng lượng tạ đơn đọc được trong ảnh. Gộp các quả cùng mức.',
        items: {
          type: 'object',
          required: ['raw_weight', 'raw_unit', 'quantity', 'confidence', 'label_read'],
          properties: {
            raw_weight: { type: 'number', minimum: 0.01, maximum: 500 },
            raw_unit: { type: 'string', enum: ['kg', 'lb'] },
            quantity: { type: 'integer', minimum: 1, maximum: 1000 },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            label_read: { type: 'string', description: 'Nhãn nhìn thấy, ví dụ 25 LB hoặc 12.5 KG.' },
          },
        },
      },
    },
  };
}

export function buildEquipmentDetectionPrompt(catalog: EquipmentDetectionCatalogItem[]) {
  const catalogList = catalog
    .map((item) => `- ${item.slug} | ${item.name_vi ?? item.slug} | nhóm: ${item.category ?? 'khác'}`)
    .join('\n');

  return `Bạn là chuyên gia kiểm kê thiết bị phòng gym từ ảnh. Quan sát kỹ hình dáng, cơ cấu chuyển động, tay cầm, ghế, dây cáp và chữ/nhãn trọng lượng nhìn thấy.

Catalog thiết bị hợp lệ:
${catalogList}

QUY TẮC BẮT BUỘC:
1. CHỈ trả equipment_slug có trong catalog. Không tự chế slug, không map theo tên bài tập.
2. Chỉ nhận thiết bị nhìn thấy đủ rõ. Nếu không chắc, bỏ qua thay vì đoán. Không coi ảnh/thumbnail trên màn hình là thiết bị thật.
3. Phân biệt bench/ghế với tạ đơn. Một quả tạ đơn có tay cầm ngắn nằm giữa hai đầu tạ và PHẢI map thành slug "dumbbell".
4. quantity là số thiết bị/quả thật sự nhìn thấy, không phải số cặp. Không đếm bóng, hình phản chiếu hay vật bị lặp.
5. Nếu có tạ đơn, ngoài detected còn điền dumbbells theo từng mức nhãn đọc được. Giữ nguyên số và unit trên nhãn: kg hoặc lb. Không tự đổi đơn vị trong phần raw.
6. Nếu không đọc chắc nhãn trọng lượng thì vẫn có thể detect dumbbell, nhưng KHÔNG thêm dòng vào dumbbells.
7. evidence_vi nêu dấu hiệu thị giác thật sự dùng để mapping, tối đa một câu ngắn.

Trả về duy nhất JSON theo schema đã cung cấp.`;
}
