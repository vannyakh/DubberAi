import React, { useEffect } from 'react';
import { useAuthStore } from '@/stores';

/** Restores the persisted session (if any) when the app starts. */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const restore = useAuthStore((s) => s.restore);

  useEffect(() => {
    restore();
  }, [restore]);

  return <>{children}</>;
}
