import type { ProgramDetail, ProgramSummary } from './types';

export type CompatibilityStatus =
  | 'recommended'
  | 'compatible'
  | 'requires_confirmation'
  | 'blocked';

export interface UserCompatibilityContext {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null;
  preferredTrainingDays: number | null;
  preferredSessionMinutes: number | null;
  injuryAreas?: string[];
  screeningDisposition?: 'clear' | 'modify' | 'medical_review';
}

export interface CompatibilityEvaluation {
  status: CompatibilityStatus;
  policyVersion: '2026.1';
  score: number; // 0 - 100
  reasonCodes: string[];
  reasonsVi: string[];
  requiresExplicitReason: boolean;
}

export function evaluateProgramCompatibility(
  program: ProgramSummary | ProgramDetail | {
    id: string;
    name?: string;
    name_vi?: string | null;
    days_count?: number;
    days?: Array<{ id: string }>;
    duration_weeks?: number;
  },
  user: UserCompatibilityContext,
): CompatibilityEvaluation {
  const reasonCodes: string[] = [];
  const reasonsVi: string[] = [];
  let score = 100;

  // 1. Safety Screening Gate
  if (user.screeningDisposition === 'medical_review') {
    return {
      status: 'blocked',
      policyVersion: '2026.1',
      score: 0,
      reasonCodes: ['BLOCKED_MEDICAL_REVIEW_REQUIRED'],
      reasonsVi: ['Cần có đánh giá từ chuyên gia y tế trước khi kích hoạt chương trình tập luyện.'],
      requiresExplicitReason: true,
    };
  }

  const programDays = 'days_count' in program && typeof program.days_count === 'number'
    ? program.days_count
    : Array.isArray((program as any).days)
      ? (program as any).days.length
      : 3;

  const progName = (program.name || '').toLowerCase();
  const progNameVi = (program.name_vi || '').toLowerCase();
  const isPpl = progName.includes('ppl') || progName.includes('push pull legs') || programDays >= 5;
  const isBeginnerProgram = progName.includes('beginner') || progName.includes('khoi dong') || (programDays <= 3 && !isPpl);

  // 2. Injury & Knee Safety Gate
  const hasKneeInjury = (user.injuryAreas ?? []).includes('knee');
  if (hasKneeInjury && isPpl && programDays >= 5) {
    reasonCodes.push('SAFETY_HIGH_LOWER_BODY_VOLUME');
    reasonsVi.push('Lịch tập 5-6 buổi/tuần có thể gây quá tải cho tình trạng đầu gối hiện tại.');
    score -= 40;
  }

  // 3. Days per week mismatch
  const userDays = user.preferredTrainingDays ?? 2;
  if (programDays > userDays + 1) {
    reasonCodes.push('SCHEDULE_EXCEEDS_PREFERRED_DAYS');
    reasonsVi.push(`Giáo án có ${programDays} buổi/tuần, nhiều hơn mục tiêu ${userDays} buổi của bạn.`);
    score -= 30;
  } else if (programDays < userDays - 1) {
    reasonCodes.push('SCHEDULE_BELOW_PREFERRED_DAYS');
    reasonsVi.push(`Giáo án có ${programDays} buổi/tuần, ít hơn mục tiêu ${userDays} buổi của bạn.`);
    score -= 15;
  }

  // 4. Experience mismatch
  if (user.experienceLevel === 'beginner' && (isPpl || programDays >= 5)) {
    reasonCodes.push('EXPERIENCE_LEVEL_MISMATCH_ADVANCED');
    reasonsVi.push('Giáo án đòi hỏi thể lực và kỹ thuật nâng cao, không tối ưu cho người mới bắt đầu.');
    score -= 35;
  }

  // Determine status
  if (reasonCodes.length === 0 && (isBeginnerProgram || programDays === userDays)) {
    return {
      status: 'recommended',
      policyVersion: '2026.1',
      score: Math.max(90, score),
      reasonCodes: ['EXCELLENT_FIT'],
      reasonsVi: ['Rất phù hợp với kinh nghiệm, thời gian và thể trạng của bạn.'],
      requiresExplicitReason: false,
    };
  }

  if (score >= 70) {
    return {
      status: 'compatible',
      policyVersion: '2026.1',
      score,
      reasonCodes,
      reasonsVi,
      requiresExplicitReason: false,
    };
  }

  return {
    status: 'requires_confirmation',
    policyVersion: '2026.1',
    score: Math.max(20, score),
    reasonCodes,
    reasonsVi,
    requiresExplicitReason: true,
  };
}
