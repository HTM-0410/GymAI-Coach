/**
 * Script để generate lại Vietnamese content từ English.
 * Vietnamese content bị corrupt từ nguồn gốc, script này sẽ tạo lại.
 */

const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../data/exercises');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

// Bản đồ dịch cơ bản English -> Vietnamese
const translations = {
  // Exercise names
  'Deadlift': 'Deadlift',
  'Bench Press': 'Bench Press', 
  'Squat': 'Squat',
  'Pull Up': 'Chống đẩy',
  'Push Up': 'Hít đất',
  
  // Movement patterns
  'compound': 'compound',
  'isolation': 'cô lập',
  'push': 'đẩy',
  'pull': 'kéo',
  'hinge': 'gập',
  'squat': 'ngồi xổm',
  'carry': 'carry',
  
  // Muscles
  'Chest': 'Ngực',
  'Back': 'Lưng',
  'Shoulders': 'Vai',
  'Biceps': 'Tay trước',
  'Triceps': 'Tay sau',
  'Quadriceps': 'Bắp chân trước',
  'Hamstrings': 'Bắp chân sau',
  'Glutes': 'Mông',
  'Core': 'Bụng',
  'Calves': 'Bắp chân',
  'Forearms': 'Cẳng tay',
  
  // Equipment
  'Barbell': 'Tạ đòn',
  'Dumbbell': 'Tạ đôi',
  'Kettlebell': 'Tạ chuông',
  'Bodyweight': 'Cân nặng cơ thể',
  'Machine': 'Máy',
  'Cable': 'Cable',
  'Band': 'Band',
  'Other': 'Khác',
  
  // Difficulty
  'beginner': 'Người mới',
  'intermediate': 'Trung bình',
  'advanced': 'Nâng cao',
  
  // Common phrases
  'Build': 'Phát triển',
  'Strength': 'sức mạnh',
  'Muscle': 'cơ bắp',
  'Endurance': 'sức bền',
  'Flexibility': 'linh hoạt',
  'targeted': 'nhắm vào',
  'multiple': 'nhiều',
  'muscle groups': 'nhóm cơ',
  'full body': 'toàn thân',
  'lower body': 'nửa dưới',
  'upper body': 'nửa trên',
};

// Vietnamese content templates
function generateVietnameseContent(ex) {
  const name = ex.name_vi || ex.name;
  const muscle = ex.primary_muscle || 'Cơ';
  const equipment = ex.equipment?.[0] || 'Khác';
  const difficulty = ex.difficulty || 'intermediate';
  
  return {
    name_vi: name,
    subtitle_vi: `Bài tập ${getMovementPatternText(ex.movement_pattern)} cho ${muscle}`,
    goal_vi: `Phát triển sức mạnh và khối lượng cơ ${muscle} thông qua chuyển động ${getMovementPatternText(ex.movement_pattern)}.`,
    safety_vi: `Chú ý giữ lưng thẳng và kiểm soát trọng lượng trong suốt chuyển động. Nếu cảm thấy đau, dừng tập ngay.`,
    ai_coach: {
      next_session_vi: `Buổi tiếp theo: ${name}`,
      rationale_vi: 'Dữ liệu đang được cập nhật bởi AI Coach.'
    }
  };
}

function getMovementPatternText(pattern) {
  const patterns = {
    'compound': 'compound (nhiều nhóm cơ)',
    'isolation': 'cô lập',
    'push': 'đẩy',
    'pull': 'kéo',
    'hinge': 'gập',
    'squat': 'ngồi xổm',
    'carry': 'di chuyển',
    'rotate': 'xoay',
    'jump': 'nhảy'
  };
  return patterns[pattern] || pattern;
}

// Check which files need Vietnamese content fix
let needFix = 0;
let alreadyOk = 0;

files.forEach(file => {
  const filePath = path.join(dir, file);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Check if content has encoding issues
  const jsonStr = JSON.stringify(content);
  const hasGarbledChars = /[\x80-\xFF]/.test(jsonStr) && /[Ã]/.test(jsonStr);
  
  if (hasGarbledChars) {
    needFix++;
  } else {
    alreadyOk++;
  }
});

console.log(`Files needing fix: ${needFix}`);
console.log(`Files OK: ${alreadyOk}`);
console.log(`Total: ${files.length}`);

// Don't auto-fix - just report for now
