export function isMuscleReadinessEnabled(): boolean {
  return process.env.MUSCLE_READINESS_ENABLED !== 'false';
}

export function isMuscleReadinessClientEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MUSCLE_READINESS_ENABLED !== 'false';
}
