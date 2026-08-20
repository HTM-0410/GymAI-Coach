const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../data/exercises');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

function hasDoubleEncoding(str) {
  return /Ã[A-Za-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(str);
}

function fixDoubleEncoding(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      if (hasDoubleEncoding(obj[key])) {
        obj[key] = Buffer.from(obj[key], 'latin1').toString('utf8');
      }
    } else if (Array.isArray(obj[key])) {
      obj[key] = obj[key].map(item => {
        if (typeof item === 'string' && hasDoubleEncoding(item)) {
          return Buffer.from(item, 'latin1').toString('utf8');
        }
        return item;
      });
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      fixDoubleEncoding(obj[key]);
    }
  }
  return obj;
}

function fixAiCoach(obj) {
  if (obj.ai_coach) {
    let needsFix = false;
    
    // Check if ai_coach has encoding issues
    const coachStr = JSON.stringify(obj.ai_coach);
    if (hasDoubleEncoding(coachStr)) {
      needsFix = true;
    }
    
    // Also check the template strings we added
    const template1 = 'Dữ liệu đang được cập nhật bởi AI Coach.';
    const template2 = `Buổi tiếp theo: ${obj.name_vi}`;
    
    if (needsFix) {
      fixDoubleEncoding(obj.ai_coach);
    }
    
    // Re-write with correct Vietnamese
    obj.ai_coach = {
      next_session_vi: `Buổi tiếp theo: ${obj.name_vi}`,
      rationale_vi: 'Dữ liệu đang được cập nhật bởi AI Coach.'
    };
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
  
  if (hasDoubleEncoding(jsonStr) || (content.ai_coach && hasDoubleEncoding(JSON.stringify(content.ai_coach)))) {
    fixDoubleEncoding(content);
    fixAiCoach(content);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    fixed++;
    console.log(`Fixed: ${file}`);
  } else if (content.ai_coach && hasDoubleEncoding(JSON.stringify(content.ai_coach))) {
    fixAiCoach(content);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    fixed++;
    console.log(`Fixed ai_coach: ${file}`);
  } else {
    alreadyOk++;
  }
});

console.log(`\nDone! Fixed: ${fixed}, Already OK: ${alreadyOk}, Total: ${files.length}`);
