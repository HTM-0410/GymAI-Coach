/**
 * Re-export loader từ exercises-db.ts để callers không cần đổi import path.
 *
 * Source-of-truth đã chuyển từ data/exercises/*.json sang Supabase DB.
 * Media đã chuyển từ public/exercise-media/ lên Supabase Storage.
 *
 * Xem:
 *   - src/lib/exercises-db.ts        - DB loader (active)
 *   - scripts/upload-exercise-media.ts - upload 2648 files lên Storage
 *   - scripts/sync-exercises.ts        - full-replace DB sync
 */

export {
  getAllExercises,
  getExerciseBySlug,
  getAllExerciseSummaries,
  filterExercises,
  getExerciseFacets,
  getResolvedAlternatives,
  resetExerciseCache,
  toSummary,
} from './exercises-db';
export type { ExerciseFilter, ResolvedAlternative } from './exercises-db';
