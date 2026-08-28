export type SimilarExerciseCandidate = {
  slug: string;
  name?: string | null;
  nameVi?: string | null;
  primaryMuscleVi?: string | null;
  exerciseType?: string | null;
  equipmentVi?: string[] | null;
};

function normalize(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .trim();
}

function sharesPrimaryMuscle(source: SimilarExerciseCandidate, candidate: SimilarExerciseCandidate) {
  const sourceMuscle = normalize(source.primaryMuscleVi);
  const candidateMuscle = normalize(candidate.primaryMuscleVi);
  if (!sourceMuscle || !candidateMuscle) return false;
  return sourceMuscle === candidateMuscle
    || sourceMuscle.includes(candidateMuscle)
    || candidateMuscle.includes(sourceMuscle);
}

export function rankSimilarExercises<T extends SimilarExerciseCandidate>(
  source: SimilarExerciseCandidate | null | undefined,
  candidates: T[],
  excludedSlugs: readonly string[] = [],
) {
  if (!source) return candidates.filter((candidate) => !excludedSlugs.includes(candidate.slug));
  const excluded = new Set([source.slug, ...excludedSlugs]);
  return candidates
    .filter((candidate) => !excluded.has(candidate.slug))
    .map((candidate, index) => {
      const sameMuscle = sharesPrimaryMuscle(source, candidate);
      const sameType = Boolean(source.exerciseType && candidate.exerciseType === source.exerciseType);
      const sourceEquipment = new Set((source.equipmentVi ?? []).map(normalize));
      const sameEquipment = (candidate.equipmentVi ?? []).some((item) => sourceEquipment.has(normalize(item)));
      return {
        candidate,
        index,
        sameMuscle,
        score: (sameMuscle ? 10 : 0) + (sameType ? 2 : 0) + (sameEquipment ? 1 : 0),
      };
    })
    .filter((item) => item.sameMuscle || (!normalize(source.primaryMuscleVi) && item.score > 0))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.candidate);
}
