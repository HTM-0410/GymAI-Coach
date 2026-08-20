const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../data/exercises');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

let fixed = 0;
let alreadyOk = 0;

files.forEach(file => {
  const filePath = path.join(dir, file);
  const raw = fs.readFileSync(filePath);
  
  // Try to detect encoding and convert
  let content;
  
  // Check if it's valid UTF-8
  try {
    content = JSON.parse(raw.toString('utf8'));
  } catch {
    // Try Latin-1 (Windows-1252) which often happens with Vietnamese
    try {
      const latin1Content = raw.toString('latin1');
      content = JSON.parse(latin1Content);
      // Re-encode to proper UTF-8
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
      fixed++;
      console.log(`Fixed: ${file}`);
    } catch {
      console.log(`Failed: ${file}`);
    }
    return;
  }
  
  // Check if ai_coach exists
  if (!content.ai_coach) {
    content.ai_coach = {
      next_session_vi: `Buổi tiếp theo: ${content.name_vi}`,
      rationale_vi: 'Dữ liệu đang được cập nhật bởi AI Coach.'
    };
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    fixed++;
    console.log(`Added ai_coach: ${file}`);
  } else {
    alreadyOk++;
  }
});

console.log(`\nDone! Fixed: ${fixed}, Already OK: ${alreadyOk}, Total: ${files.length}`);
