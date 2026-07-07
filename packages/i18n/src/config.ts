import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { I18nInitOptions } from './types';

export type { I18nInitOptions } from './types';

const DEFAULT_STORAGE_KEY = 'app-locale';

let runtime: {
  locales: readonly string[];
  defaultLocale: string;
  storageKey: string;
} | null = null;

function readStoredLocale(): string {
  if (!runtime) return 'en';
  if (typeof window === 'undefined') return runtime.defaultLocale;
  const stored = localStorage.getItem(runtime.storageKey);
  return stored && runtime.locales.includes(stored) ? stored : runtime.defaultLocale;
}

/** Shared i18next instance — import this from `@dubbercut/i18n`. */
export const i18nInstance = i18n.use(initReactI18next);

let initialized = false;

/**
 * Initialize once before rendering the React tree.
 * Each app passes its own `resources` from its local `locales/` folder.
 */
export async function initI18n(options: I18nInitOptions): Promise<typeof i18n> {
  if (initialized) return i18n;

  runtime = {
    locales: options.locales,
    defaultLocale: options.defaultLocale,
    storageKey: options.storageKey ?? DEFAULT_STORAGE_KEY,
  };

  await i18nInstance.init({
    resources: options.resources,
    lng: readStoredLocale(),
    fallbackLng: options.defaultLocale,
    supportedLngs: [...options.locales],
    ns: [...options.namespaces],
    defaultNS: options.defaultNS ?? options.namespaces[0],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

  initialized = true;
  return i18n;
}

export async function setLocale(locale: string): Promise<void> {
  if (!runtime?.locales.includes(locale)) return;
  await i18n.changeLanguage(locale);
  localStorage.setItem(runtime.storageKey, locale);
}

export function getLocale(): string {
  if (!runtime) return i18n.language;
  const current = i18n.language;
  return runtime.locales.includes(current) ? current : runtime.defaultLocale;
}
