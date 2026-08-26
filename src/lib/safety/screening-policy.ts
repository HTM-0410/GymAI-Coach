export type ScreeningDisposition = 'clear' | 'modify' | 'medical_review';

export interface ScreeningAnswers {
  hasChestPainOrDizziness?: boolean;
  hasKnownHeartMetabolicRenalDisease?: boolean;
  hasUnexplainedShortnessOfBreath?: boolean;
  isPhysicallyActiveRegularly?: boolean;
  injuryArea?: 'knee' | 'shoulder' | 'lower_back' | 'wrist' | 'ankle' | 'other' | null;
  injurySide?: 'left' | 'right' | 'bilateral' | null;
  injurySeverity?: 'mild' | 'moderate' | 'severe' | null;
  painTriggers?: string[];
  hasMedicalClearance?: boolean;
}

export interface ScreeningResult {
  disposition: ScreeningDisposition;
  policyVersion: '2026.1';
  reasonCodes: string[];
  guidanceVi: string;
  recommendedConstraints: Array<{
    region: string;
    side?: 'left' | 'right' | 'bilateral';
    severity: 'mild' | 'moderate' | 'severe';
    triggers: string[];
  }>;
}

/**
 * Pure deterministic ACSM-grounded preparticipation screening evaluation.
 */
export function evaluatePreparticipationScreening(answers: ScreeningAnswers): ScreeningResult {
  const reasonCodes: string[] = [];
  const recommendedConstraints: ScreeningResult['recommendedConstraints'] = [];

  // Red flags -> medical_review (ACSM major signs/symptoms)
  if (answers.hasChestPainOrDizziness) {
    reasonCodes.push('RED_FLAG_CARDIOVASCULAR_SYMPTOM');
  }
  if (answers.hasUnexplainedShortnessOfBreath) {
    reasonCodes.push('RED_FLAG_RESPIRATORY_SYMPTOM');
  }
  if (answers.hasKnownHeartMetabolicRenalDisease && !answers.hasMedicalClearance) {
    reasonCodes.push('KNOWN_DISEASE_WITHOUT_CLEARANCE');
  }

  if (reasonCodes.length > 0) {
    return {
      disposition: 'medical_review',
      policyVersion: '2026.1',
      reasonCodes,
      guidanceVi:
        'Dựa trên sàng lọc an toàn ban đầu, bạn có triệu chứng hoặc tình trạng cần được bác sĩ / chuyên gia y tế đánh giá trước khi bắt đầu chương trình tập tự phục vụ.',
      recommendedConstraints: [],
    };
  }

  // Joint / Musculoskeletal concerns -> modify
  if (answers.injuryArea) {
    const severity = answers.injurySeverity ?? 'moderate';
    const side = answers.injurySide ?? 'bilateral';
    const triggers = answers.painTriggers ?? [];

    if (answers.injuryArea === 'knee') {
      reasonCodes.push('KNEE_LOAD_LIMITATION');
      recommendedConstraints.push({
        region: 'knee',
        side,
        severity,
        triggers: triggers.length > 0 ? triggers : ['deep_flexion', 'high_impact', 'kneeling'],
      });
    } else if (answers.injuryArea === 'shoulder') {
      reasonCodes.push('SHOULDER_IMPINGEMENT_PRECAUTION');
      recommendedConstraints.push({
        region: 'shoulder',
        side,
        severity,
        triggers: triggers.length > 0 ? triggers : ['overhead_press', 'extreme_external_rotation'],
      });
    } else if (answers.injuryArea === 'lower_back') {
      reasonCodes.push('LUMBAR_SPINE_PROTECTION');
      recommendedConstraints.push({
        region: 'lower_back',
        side,
        severity,
        triggers: triggers.length > 0 ? triggers : ['heavy_spinal_loading', 'excessive_flexion'],
      });
    } else {
      reasonCodes.push('GENERAL_JOINT_MODIFICATION');
      recommendedConstraints.push({
        region: answers.injuryArea,
        side,
        severity,
        triggers,
      });
    }

    return {
      disposition: 'modify',
      policyVersion: '2026.1',
      reasonCodes,
      guidanceVi:
        'Bạn có thể tập luyện với các điều chỉnh an toàn tự động. AI và giáo án sẽ loại trừ hoặc giảm tải các bài tập tác động xấu lên vùng đau.',
      recommendedConstraints,
    };
  }

  // No red flags & no injuries
  return {
    disposition: 'clear',
    policyVersion: '2026.1',
    reasonCodes: ['NO_KNOWN_CONTRAINDICATIONS'],
    guidanceVi: 'Bạn đủ điều kiện thể lực để tham gia các chương trình tập luyện tiêu chuẩn.',
    recommendedConstraints: [],
  };
}
