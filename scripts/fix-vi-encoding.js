/**
 * Script sửa lỗi Vietnamese encoding trong JSON files.
 * Phát hiện các pattern bị mojibake và thay thế bằng ký tự tiếng Việt đúng.
 *
 * Các pattern thường gặp (UTF-8 bị decode như Latin-1):
 *   Ã¡ = á, Ã = à, Ã¢ = â, Ã¨ = è, Ã© = é, Ãª = ê, Ã¬ = ì, Ã­ = í,
 *   Ã² = ò, Ã³ = ó, Ã´ = ô, Ã¹ = ù, Ãº = ú, Ã½ = ý, Ä‘ = đ, Ä = Đ
 *
 * Sau khi decode các chuỗi này có thể trở thành ký tự hợp lệ, nhưng
 * cũng có thể còn lẫn các ký tự điều khiển hoặc UTF-8 bytes.
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../data/exercises');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

function fixString(str) {
  if (typeof str !== 'string') return str;

  // Bước 1: Chuyển chuỗi UTF-8 hiện tại sang Latin-1 view, rồi decode lại UTF-8.
  // Đây là cách phổ biến để un-mojibake Vietnamese.
  // Ví dụ: "Ã¡" (4 bytes) -> 0xC3 0xA1 (Latin-1) -> "á" (UTF-8 2 bytes)
  try {
    const bytes = Buffer.from(str, 'latin1');
    const decoded = bytes.toString('utf8');

    // Nếu decode thành công và không còn ký tự thay thế (U+FFFD), giữ kết quả
    if (!decoded.includes('\uFFFD')) {
      str = decoded;
    }
  } catch (e) {
    // Bỏ qua nếu không decode được
  }

  // Bước 2: Xử lý các pattern mojibake còn sót (ï¿½ là UTF-8 của U+FFFD bị encode Latin-1)
  str = str.replace(/ï¿½/g, '').replace(/\uFFFD/g, '');

  // Bước 3: Loại bỏ các control characters không hợp lệ (trừ \n, \r, \t)
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return str;
}

function fixObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'string') return fixString(item);
      if (typeof item === 'object' && item !== null) return fixObject(item);
      return item;
    });
  }

  if (typeof obj === 'object' && obj !== null) {
    const result = {};
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        result[key] = fixString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        result[key] = fixObject(obj[key]);
      } else {
        result[key] = obj[key];
      }
    }
    return result;
  }

  return obj;
}

// Chỉ xử lý các file có ký tự mojibake
let fixed = 0;
let alreadyOk = 0;
const errors = [];

for (const file of files) {
  const filePath = path.join(dir, file);

  try {
    const raw = fs.readFileSync(filePath);
    const content = JSON.parse(raw.toString('utf8'));

    // Detect: nếu có pattern mojibake tiếng Việt hoặc ký tự điều khiển
    const jsonStr = JSON.stringify(content);
    const hasMojibake = /Ã[¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿]|Ä[¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿]/.test(jsonStr);
    const hasControlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(jsonStr);

    if (hasMojibake || hasControlChars) {
      const fixedContent = fixObject(content);
      fs.writeFileSync(filePath, JSON.stringify(fixedContent, null, 2), 'utf8');
      fixed++;
    } else {
      alreadyOk++;
    }
  } catch (err) {
    errors.push(`${file}: ${err.message}`);
  }
}

console.log(`Fixed: ${fixed}, Already OK: ${alreadyOk}, Errors: ${errors.length}`);
if (errors.length > 0) console.log('\nErrors:', errors.slice(0, 10).join('\n'));
