import { Suspense } from 'react';
import { ModeratorConsoleClient } from '@/components/ModeratorConsoleClient';

export default function ModeratorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ModeratorConsoleClient />
    </Suspense>
  );
}
