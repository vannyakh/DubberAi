import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

const DRAG: CSSProperties = { WebkitAppRegion: 'drag' } as CSSProperties;
const NO_DRAG: CSSProperties = { WebkitAppRegion: 'no-drag' } as CSSProperties;

/**
 * Custom frame app bar for the Electron desktop app (the window itself is
 * frameless). The whole strip is a drag region; interactive elements opt
 * out. macOS keeps its inset traffic lights (we just pad around them),
 * Windows/Linux get rendered minimize / maximize / close controls.
 */
export function DesktopTitleBar() {
  const desktop = window.desktop;
  const [maximized, setMaximized] = useState(false);
  const isMac = desktop?.platform === 'darwin';

  useEffect(() => {
    if (!desktop || isMac) return;
    desktop.window.isMaximized().then(setMaximized);
    return desktop.window.onMaximizedChanged(setMaximized);
  }, [desktop, isMac]);

  if (!desktop) return null;

  return (
    <header
      style={DRAG}
      className="bg-background border-border/50 flex h-9 shrink-0 items-center justify-between border-b select-none"
    >
      <div className={`flex items-center gap-2 ${isMac ? 'pl-20' : 'pl-3'}`}>
        <span className="text-foreground/80 text-xs font-semibold tracking-wide">DubberCut</span>
      </div>

      {isMac ? (
        <div className="pr-3" />
      ) : (
        <div style={NO_DRAG} className="flex h-full items-stretch">
          <button
            onClick={() => desktop.window.minimize()}
            className="text-foreground/70 hover:bg-foreground/10 w-12 text-center"
            title="Minimize"
            aria-label="Minimize"
          >
            <svg className="mx-auto" width="10" height="10" viewBox="0 0 10 10">
              <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
          <button
            onClick={() => desktop.window.toggleMaximize()}
            className="text-foreground/70 hover:bg-foreground/10 w-12 text-center"
            title={maximized ? 'Restore' : 'Maximize'}
            aria-label={maximized ? 'Restore' : 'Maximize'}
          >
            {maximized ? (
              <svg className="mx-auto" width="10" height="10" viewBox="0 0 10 10">
                <rect x="0" y="2.5" width="7" height="7" fill="none" stroke="currentColor" />
                <path d="M2.5 2.5 v-2 h7 v7 h-2" fill="none" stroke="currentColor" />
              </svg>
            ) : (
              <svg className="mx-auto" width="10" height="10" viewBox="0 0 10 10">
                <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" />
              </svg>
            )}
          </button>
          <button
            onClick={() => desktop.window.close()}
            className="text-foreground/70 w-12 text-center hover:bg-red-600 hover:text-white"
            title="Close"
            aria-label="Close"
          >
            <svg className="mx-auto" width="10" height="10" viewBox="0 0 10 10">
              <path d="M0 0 L10 10 M10 0 L0 10" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
        </div>
      )}
    </header>
  );
}
