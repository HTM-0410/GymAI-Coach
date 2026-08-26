import { notFound } from 'next/navigation';
import { isMuscleReadinessEnabled } from '@/lib/recovery/feature-flags';
import RecoveryGroupsPage from './recovery-groups-page';

export default function RecoveryGroupListRoute() {
  if (!isMuscleReadinessEnabled()) notFound();
  return <RecoveryGroupsPage />;
}
