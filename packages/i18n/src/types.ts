import type { Resource } from 'i18next';

/** Options passed by each app when bootstrapping i18n. */
export interface I18nInitOptions {
  /** i18next resource map — defined in the app (e.g. apps/web/src/locales). */
  resources: Resource;
  /** Supported locale codes, e.g. `['en', 'kh-KH']`. */
  locales: readonly string[];
  /** Initial / fallback locale. */
  defaultLocale: string;
  /** Translation namespaces, e.g. `['home', 'system', 'studio']`. */
  namespaces: readonly string[];
  /** Default namespace (defaults to the first entry in `namespaces`). */
  defaultNS?: string;
  /** localStorage key for persisting the user's locale choice. */
  storageKey?: string;
}
