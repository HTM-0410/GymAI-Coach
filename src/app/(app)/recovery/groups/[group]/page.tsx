import { notFound } from 'next/navigation';
import { isMuscleReadinessEnabled } from '@/lib/recovery/feature-flags';
import { isBodyMuscleGroup } from '@/lib/recovery/read-model';
import RecoveryGroupDetailPage from './recovery-group-detail-page';

export default function RecoveryGroupDetailRoute({ params }: { params: { group: string } }) {
  if (!isMuscleReadinessEnabled()) notFound();
  const group = params.group.toUpperCase();
  if (!isBodyMuscleGroup(group)) notFound();
  return <RecoveryGroupDetailPage group={group} />;
}
