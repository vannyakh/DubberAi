import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { i18nInstance } from './config';

interface I18nProviderProps {
  children: ReactNode;
}

/** Wrap the app after `initI18n()` resolves. */
export function I18nProvider({ children }: I18nProviderProps) {
  return <I18nextProvider i18n={i18nInstance}>{children}</I18nextProvider>;
}
