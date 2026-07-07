/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider, initI18n } from '@dubbercut/i18n';
import {
  DEFAULT_LOCALE,
  I18N_NAMESPACES,
  LOCALE_STORAGE_KEY,
  LOCALES,
  localeResources,
} from './locales';
import { ThemeProvider } from './context/ThemeContext';
import { TooltipProvider } from './components/ui/tooltip';
import { Toaster } from './components/ui/sonner';
import { DesktopTitleBar } from './components/desktop-title-bar';
import { AppRouter } from './routers';
import './index.css';

/**
 * In the Electron desktop app the window is frameless: render the custom
 * app bar above the app and confine pages to the remaining space (the
 * `.desktop-app` class rescopes `h-screen`-style utilities to 100%).
 */
function Shell() {
  if (!window.desktop) return <AppRouter />;
  return (
    <div className="desktop-app bg-background flex h-screen w-screen flex-col overflow-hidden">
      <DesktopTitleBar />
      <div className="relative min-h-0 flex-1">
        <AppRouter />
      </div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

initI18n({
  resources: localeResources,
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  namespaces: I18N_NAMESPACES,
  defaultNS: 'system',
  storageKey: LOCALE_STORAGE_KEY,
}).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <TooltipProvider delayDuration={500}>
              <Shell />
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </I18nProvider>
    </StrictMode>,
  );
});
