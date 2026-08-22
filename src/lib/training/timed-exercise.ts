export type TimerSnapshot = {
  targetSeconds: number;
  remainingSeconds: number;
  running: boolean;
  updatedAtMs: number;
};

export function advanceTimer(snapshot: TimerSnapshot, nowMs: number): TimerSnapshot {
  if (!snapshot.running) return { ...snapshot, updatedAtMs: nowMs };
  const elapsed = Math.max(0, Math.floor((nowMs - snapshot.updatedAtMs) / 1000));
  if (elapsed === 0) return snapshot;
  return {
    ...snapshot,
    remainingSeconds: Math.max(0, snapshot.remainingSeconds - elapsed),
    running: snapshot.remainingSeconds - elapsed > 0,
    updatedAtMs: nowMs,
  };
}

export function pauseTimer(snapshot: TimerSnapshot, nowMs: number) {
  return { ...advanceTimer(snapshot, nowMs), running: false, updatedAtMs: nowMs };
}

export function resumeTimer(snapshot: TimerSnapshot, nowMs: number) {
  return snapshot.remainingSeconds > 0 ? { ...snapshot, running: true, updatedAtMs: nowMs } : snapshot;
}

export function resetTimer(targetSeconds: number, nowMs: number): TimerSnapshot {
  return { targetSeconds, remainingSeconds: targetSeconds, running: false, updatedAtMs: nowMs };
}

export function restoreTimer(snapshot: TimerSnapshot, nowMs: number) {
  return snapshot.running ? advanceTimer(snapshot, nowMs) : { ...snapshot, updatedAtMs: nowMs };
}
