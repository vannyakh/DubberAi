import React, { useEffect } from 'react';
import { useAppStore, useAuthStore } from '@/stores';

/** Restores persisted session and app mode when the app starts. */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const restore = useAuthStore((s) => s.restore);
  const hydrate = useAppStore((s) => s.hydrate);
  const enterCloudMode = useAppStore((s) => s.enterCloudMode);

  useEffect(() => {
    (async () => {
      await hydrate();
      await restore();
      if (useAuthStore.getState().user) {
        await enterCloudMode();
      }
    })();
  }, [restore, hydrate, enterCloudMode]);

  return <>{children}</>;
}
