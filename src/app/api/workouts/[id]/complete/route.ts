import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import {
  createSupabaseRecoveryRepository,
  processCompletedWorkout,
} from '@/lib/recovery/process-workout.server';

export async function POST(
  _request: Request,
  context: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const service = createServiceClient();
    const result = await processCompletedWorkout({
      repository: createSupabaseRecoveryRepository(service),
      userId: user.id,
      workoutId: context.params.id,
    });
    if (!result) return NextResponse.json({ error: 'workout_not_found' }, { status: 404 });
    return NextResponse.json({ success: true, recovery: result });
  } catch (error) {
    console.error('Workout completion processing failed', error);
    return NextResponse.json({ error: 'completion_failed' }, { status: 500 });
  }
}
