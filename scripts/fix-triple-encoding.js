const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../data/exercises');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

// Triple-decode: try to decode multiple levels of corruption
function fixTripleEncoding(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      let str = obj[key];
      
      // Pattern 1: Already corrupted (latin1 bytes interpreted as utf8)
      // "ToÃ\xa0n" -> "Toàn"
      if (/[Ã][A-Za-z]/.test(str)) {
        str = Buffer.from(str, 'latin1').toString('utf8');
      }
      
      // Pattern 2: Double corrupted - try again
      // "Toàn" might become something else if we decode again
      // Actually let's check for the replacement character pattern
      if (str.includes('ï¿½')) {
        // Triple decode
        str = Buffer.from(str, 'latin1').toString('utf8');
        if (str.includes('ï¿½') || str.includes('�')) {
          str = Buffer.from(str, 'latin1').toString('utf8');
        }
      }
      
      // Remove control characters except newlines and tabs
      str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      obj[key] = str;
    } else if (Array.isArray(obj[key])) {
      obj[key] = obj[key].map(item => {
        if (typeof item === 'string') {
          let str = item;
          if (/[Ã][A-Za-z]/.test(str)) {
            str = Buffer.from(str, 'latin1').toString('utf8');
          }
          if (str.includes('ï¿½')) {
            str = Buffer.from(str, 'latin1').toString('utf8');
            if (str.includes('ï¿½') || str.includes('�')) {
              str = Buffer.from(str, 'latin1').toString('utf8');
            }
          }
          str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
          return str;
        }
        return item;
      });
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      fixTripleEncoding(obj[key]);
    }
  }
  return obj;
}

let fixed = 0;
let alreadyOk = 0;

files.forEach(file => {
  const filePath = path.join(dir, file);
  const raw = fs.readFileSync(filePath);
  
  let content;
  try {
    content = JSON.parse(raw.toString('utf8'));
  } catch {
    console.log(`Parse error: ${file}`);
    return;
  }
  
  const jsonStr = JSON.stringify(content);
  
  // Check if file needs fixing
  const needsFix = /[Ã][A-Za-z]/.test(jsonStr) || 
                   /ï¿½/.test(jsonStr) || 
                   /[�]/.test(jsonStr) ||
                   /[\x01-\x08\x0B\x0C\x0E-\x1F]/.test(jsonStr);
  
  if (needsFix) {
    fixTripleEncoding(content);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    fixed++;
    console.log(`Fixed: ${file}`);
  } else {
    alreadyOk++;
  }
});

console.log(`\nDone! Fixed: ${fixed}, Already OK: ${alreadyOk}, Total: ${files.length}`);
