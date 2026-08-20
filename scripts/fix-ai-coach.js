const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../data/exercises');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

// Fix the corrupted Vietnamese text patterns
function fixCorruptedVietnamese(str) {
  // Fix patterns like "D� li�u \u0011ang \u0011��c" -> "Dữ liệu đang được"
  return str
    .replace(/D[\s\S]*?li[\s\S]*?u[\s\S]*?/g, 'Dữ liệu ')
    .replace(/\u0011ang/g, 'đang')
    .replace(/\u0011/g, 'đ')
    .replace(/ c[\s\S]*?p/g, ' cập')
    .replace(/ nh[\s\S]*?t/g, ' nhật')
    .replace(/ b[\s\S]*?i/g, ' bởi')
    // Fix other common patterns
    .replace(/Bu[\s\S]*?i ti[\s\S]*?p/g, 'Buổi tiếp')
    .replace(/ theo:/g, ' theo:');
}

// Better approach: just replace all ai_coach with correct Vietnamese
let fixed = 0;
let errors = [];

files.forEach(file => {
  const filePath = path.join(dir, file);
  let raw;
  try {
    raw = fs.readFileSync(filePath);
  } catch {
    errors.push(file);
    return;
  }
  
  let content;
  try {
    content = JSON.parse(raw.toString('utf8'));
  } catch {
    errors.push(file);
    return;
  }
  
  let needsFix = false;
  
  // Check if ai_coach needs fixing
  if (content.ai_coach) {
    const coachStr = JSON.stringify(content.ai_coach);
    if (coachStr.includes('\u0011') || coachStr.includes('�') || /D[\s\S]*?li[\s\S]*?u/.test(coachStr)) {
      needsFix = true;
    }
  }
  
  if (needsFix) {
    // Get the exercise name
    const name = content.name_vi || content.name || file.replace('.json', '');
    
    // Fix ai_coach with correct Vietnamese
    content.ai_coach = {
      next_session_vi: `Buổi tiếp theo: ${name}`,
      rationale_vi: 'Dữ liệu đang được cập nhật bởi AI Coach.'
    };
    
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    fixed++;
    console.log(`Fixed ai_coach: ${file} -> ${name}`);
  }
});

if (errors.length > 0) {
  console.log(`\nErrors: ${errors.join(', ')}`);
}
console.log(`\nDone! Fixed: ${fixed}, Errors: ${errors.length}`);
