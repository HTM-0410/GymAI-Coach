/**
 * Decode Vietnamese strings từ file bị mojibake nhiều cấp.
 *
 * Pattern: file gốc viết bằng UTF-8 đúng, nhưng khi đọc bằng Windows-1252
 * sẽ ra các bytes như "Ã ", "Äa", "Æ°" v.v.
 *
 * Sau đó bytes đó lại được save thành UTF-8, tạo ra "Ãƒ ", "Ã„a", "Ã†Â°".
 *
 * Ví dụ:
 *   "ữ" (UTF-8: 0xC6 0xB0) → save as Windows-1252 bytes → "Æ°" (2 chars)
 *   → save as UTF-8 again → "Ã†Â°" (6 bytes)
 *
 * Nếu giải mã ngược 1 lần về Latin-1 rồi decode UTF-8 ta được chuỗi
 * chứa ký tự "Æ°". Decode lần nữa về Latin-1 rồi UTF-8 ta được "ữ".
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../data/exercises');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

function unMojibake(s) {
  if (typeof s !== 'string') return s;

  let prev = s;
  for (let i = 0; i < 5; i++) {
    try {
      const next = Buffer.from(prev, 'latin1').toString('utf8');
      if (next === prev || next.includes('\uFFFD')) break;
      prev = next;
    } catch {
      break;
    }
  }

  // Loại bỏ control chars và replacement char
  prev = prev.replace(/[\uFFFD]/g, '');
  prev = prev.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return prev;
}

function walk(obj) {
  if (Array.isArray(obj)) return obj.map(walk);
  if (obj && typeof obj === 'object') {
    const r = {};
    for (const k in obj) r[k] = walk(obj[k]);
    return r;
  }
  if (typeof obj === 'string') return unMojibake(obj);
  return obj;
}

let processed = 0;
const errors = [];

for (const file of files) {
  const filePath = path.join(dir, file);
  try {
    const raw = fs.readFileSync(filePath);
    const content = JSON.parse(raw.toString('utf8'));
    const fixedContent = walk(content);
    fs.writeFileSync(filePath, JSON.stringify(fixedContent, null, 2), 'utf8');
    processed++;
  } catch (err) {
    errors.push(`${file}: ${err.message}`);
  }
}

console.log(`Processed: ${processed}, Errors: ${errors.length}`);
if (errors.length) console.log(errors.slice(0, 10).join('\n'));
