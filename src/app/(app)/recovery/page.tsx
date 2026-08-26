import RecoveryDashboard from './recovery-dashboard';
import { notFound } from 'next/navigation';
import { isMuscleReadinessEnabled } from '@/lib/recovery/feature-flags';

export default function RecoveryPage() {
  if (!isMuscleReadinessEnabled()) notFound();
  return <RecoveryDashboard />;
}
