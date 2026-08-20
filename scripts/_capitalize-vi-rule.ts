/**
 * Pure capitalize rule — tách ra để test độc lập.
 *
 * Title Case từng từ trong name_vi:
 * - Tách theo khoảng trắng và dấu gạch ngang.
 * - Mỗi token có dạng [prefix-non-letter][head-letter][rest].
 * - Viết hoa head-letter, phần còn lại lowercase.
 * - Bỏ qua acronym ≥3 chữ IN HOA liên tiếp (HIIT, TNT, BOSU...).
 * - Bỏ qua các token toàn số/ký tự đặc biệt (360, 5x5, 12kg).
 *
 * Lưu ý: nếu token bắt đầu bằng số rồi đến chữ (vd: "360đ", "5x5reps"), vẫn coi
 * phần chữ là từ mới và capitalize.
 */

export function capitalizeVi(input: string): string {
  if (!input) return input;

  const tokens = input.split(/(\s+|-)/); // giữ separator
  const out: string[] = [];

  for (const tok of tokens) {
    if (!tok) continue;
    if (/^(\s+|-)$/.test(tok)) {
      out.push(tok);
      continue;
    }

    // Tìm ký tự chữ (unicode) đầu tiên
    const firstLetter = tok.search(/\p{L}/u);
    if (firstLetter < 0) {
      // toàn số/ký tự đặc biệt
      out.push(tok);
      continue;
    }

    const prefix = tok.slice(0, firstLetter); // phần trước chữ (số/dấu)
    const headChar = tok.charAt(firstLetter);
    const rest = tok.slice(firstLetter + 1);

    // Acronym ≥3 chữ IN HOA liên tiếp đầu token → giữ nguyên
    const next1 = rest.charAt(0) || '';
    const next2 = rest.charAt(1) || '';
    const isUpper = (c: string) => c && c === c.toUpperCase() && c !== c.toLowerCase();
    if (isUpper(headChar) && isUpper(next1) && isUpper(next2)) {
      out.push(prefix + headChar + rest);
      continue;
    }

    // Viết hoa headChar, phần còn lại lowercase
    out.push(prefix + headChar.toUpperCase() + rest.toLowerCase());
  }

  return out.join('');
}
