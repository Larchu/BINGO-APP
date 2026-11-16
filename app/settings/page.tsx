import { Suspense } from 'react';
import { SettingsHistoryClient } from '@/components/SettingsHistoryClient';

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SettingsHistoryClient />
    </Suspense>
  );
}
