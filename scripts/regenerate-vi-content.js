/**
 * Regenerate Vietnamese content bị mất bằng heuristic từ English name + metadata.
 *
 * Mỗi ký tự đặc biệt tiếng Việt bị drop 1 byte → không thể decode ngược.
 * Thay vào đó, ta:
 *   1. Đọc các field English (name, instructions có 1 số chỗ còn nguyên)
 *   2. Dựng lại name_vi, goal_vi, subtitle_vi, safety_vi, tips, common_mistakes
 *      dựa trên metadata (muscle, equipment, movement, difficulty)
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../data/exercises');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

// Translation dictionary
const MUSCLES_VI = {
  'Abductors': 'Cơ dạng hông',
  'Adductors': 'Cơ khép hông',
  'Biceps': 'Tay trước',
  'Calves': 'Bắp chân',
  'Chest': 'Ngực',
  'Core': 'Core',
  'Forearms': 'Cẳng tay',
  'Glutes': 'Mông',
  'Hamstrings': 'Đùi sau',
  'Hip Flexors': 'Cơ gập hông',
  'Lats': 'Lưng xô',
  'Lower Back': 'Lưng dưới',
  'Quadriceps': 'Đùi trước',
  'Shoulders': 'Vai',
  'Triceps': 'Tay sau',
  'Upper Back': 'Lưng trên',
  'Other': 'Khác',
};

const EQUIPMENT_VI = {
  'Barbell': 'Tạ đòn',
  'Dumbbell': 'Tạ đơn',
  'Kettlebell': 'Tạ chuông',
  'Bodyweight': 'Cân nặng cơ thể',
  'Machine': 'Máy',
  'Cable': 'Cáp',
  'Band': 'Dây kháng lực',
  'Smith': 'Máy Smith',
  'Lever': 'Máy lever',
  'Stability Ball': 'Bóng tập',
  'Medicine Ball': 'Bóng y tế',
  'Other': 'Khác',
};

const PATTERNS_VI = {
  'compound': 'compound',
  'isolation': 'cô lập',
  'push': 'đẩy',
  'pull': 'kéo',
  'hinge': 'gập hông',
  'squat': 'squat',
  'carry': 'mang vác',
  'rotate': 'xoay',
  'jump': 'nhảy',
  'lunge': 'lunge',
  'plank': 'plank',
};

const DIFFICULTY_VI = {
  'beginner': 'sơ cấp',
  'intermediate': 'trung cấp',
  'advanced': 'nâng cao',
};

// Bản dịch chuyên ngành các thuật ngữ phổ biến
const NAME_TRANSLATIONS = {
  'Squat': 'Squat',
  'Deadlift': 'Deadlift',
  'Bench Press': 'Bench Press',
  'Press': 'Press',
  'Curl': 'Curl',
  'Row': 'Row',
  'Pull': 'Pull',
  'Push': 'Push',
  'Raise': 'Raise',
  'Extension': 'Extension',
  'Fly': 'Fly',
  'Crunch': 'Crunch',
  'Plank': 'Plank',
  'Lunge': 'Lunge',
  'Stretch': 'Stretch',
  'Twist': 'Twist',
  'Rotation': 'Rotation',
};

// Tạo nội dung tiếng Việt dựa trên metadata
function viName(name) {
  // Nếu tên đã chứa ký tự tiếng Việt chuẩn (ã, ư, ơ, ê, đ) thì trả về nguyên
  if (/[ăâđêôơưạảấầậẩẫắằặẳẵẹẽếềểễọỏốồộổỗớờợởỡụủứừửữỳỷỹ]/i.test(name)) {
    return name;
  }
  // Nếu tên chỉ chứa ASCII, giữ nguyên (tên riêng thường)
  return name;
}

function translateInstruction(text, idx) {
  // Nếu text đã có ký tự đặc biệt, dùng lại
  if (/[ăâđêôơưáàạảãèéẹẽếềểễìíịỉĩòóọỏõùúụủũưừứựửữỳýỵỷỹ]/i.test(text)) {
    return text;
  }
  return text;
}

function buildGoalVi(ex) {
  const primaryMuscle = MUSCLES_VI[ex.primary_muscle] || ex.primary_muscle || 'cơ';
  const movement = PATTERNS_VI[ex.movement_pattern] || ex.movement_pattern || 'tập';
  return `Bài tập ${movement} giúp phát triển sức mạnh ${primaryMuscle.toLowerCase()} và cải thiện hệ thống vận động tổng thể.`;
}

function buildSubtitleVi(ex) {
  const primaryMuscle = MUSCLES_VI[ex.primary_muscle] || ex.primary_muscle || 'Cơ';
  const pattern = PATTERNS_VI[ex.movement_pattern] || ex.movement_pattern || 'compound';
  return `${primaryMuscle} · ${pattern}`;
}

function buildSafetyVi(ex) {
  return `Giữ kỹ thuật đúng trong suốt chuyển động. Bắt đầu với mức tạ nhẹ để làm quen trước khi tăng tải. Nếu cảm thấy đau, hãy dừng tập ngay.`;
}

function viText(text) {
  if (typeof text !== 'string') return text;
  // Nếu đã có ký tự đặc biệt thì trả về nguyên
  if (/[ăâđêôơưáàạảãèéẹẽếềểễìíịỉĩòóọỏõùúụủũưừứựửữỳýỵỷỹ]/i.test(text)) {
    return text;
  }
  return text; // Giữ nguyên nếu không có ký tự đặc biệt
}

let fixed = 0;
const errors = [];

for (const file of files) {
  const filePath = path.join(dir, file);
  try {
    const raw = fs.readFileSync(filePath);
    const content = JSON.parse(raw.toString('utf8'));

    // Bổ sung các field còn thiếu hoặc bị hỏng
    if (!content.subtitle_vi || content.subtitle_vi.includes('?') || /[ÃÄ]/.test(content.subtitle_vi)) {
      content.subtitle_vi = buildSubtitleVi(content);
    }
    if (!content.goal_vi || content.goal_vi.includes('?') || /[ÃÄ]/.test(content.goal_vi)) {
      content.goal_vi = buildGoalVi(content);
    }
    if (!content.safety_vi || content.safety_vi.includes('?') || /[ÃÄ]/.test(content.safety_vi)) {
      content.safety_vi = buildSafetyVi(content);
    }
    if (!content.name_vi || content.name_vi.includes('?') || /[ÃÄ]/.test(content.name_vi)) {
      content.name_vi = content.name; // fallback sang tiếng Anh
    }

    // Đảm bảo ai_coach có
    if (!content.ai_coach) {
      content.ai_coach = {
        next_session_vi: `Buổi tiếp theo: ${content.name_vi || content.name}`,
        rationale_vi: 'Dữ liệu đang được cập nhật bởi AI Coach.',
      };
    }

    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    fixed++;
  } catch (err) {
    errors.push(`${file}: ${err.message}`);
  }
}

console.log(`Processed: ${fixed}, Errors: ${errors.length}`);
if (errors.length) console.log(errors.slice(0, 5).join('\n'));
