import enHome from './en/home.json';
import enSystem from './en/system.json';
import enStudio from './en/studio.json';
import khHome from './kh-KH/home.json';
import khSystem from './kh-KH/system.json';
import khStudio from './kh-KH/studio.json';

/** Translation namespaces for the web app. */
export const I18N_NAMESPACES = ['home', 'system', 'studio'] as const;
export type I18nNamespace = (typeof I18N_NAMESPACES)[number];

/** Supported locale codes. */
export const LOCALES = ['en', 'kh-KH'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_STORAGE_KEY = 'dubbercut-locale';

/** Bundled into i18next via `initI18n({ resources: localeResources, ... })`. */
export const localeResources = {
  en: {
    home: enHome,
    system: enSystem,
    studio: enStudio,
  },
  'kh-KH': {
    home: khHome,
    system: khSystem,
    studio: khStudio,
  },
} as const;
