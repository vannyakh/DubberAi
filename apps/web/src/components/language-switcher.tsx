import { setLocale, useTranslation } from '@dubbercut/i18n';
import { LOCALES, type Locale } from '@/locales';
import { useLanguagePreferencesStore } from '@/preferences/language-preferences-store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  'kh-KH': 'ខ្មែរ',
};

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation('system');

  return (
    <Select
      value={i18n.language}
      onValueChange={(value) => {
        void setLocale(value as Locale);
        useLanguagePreferencesStore.getState().setUiLocale(value);
      }}
    >
      <SelectTrigger className="h-10 w-[130px]" aria-label={t('language')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {LOCALES.map((locale) => (
          <SelectItem key={locale} value={locale}>
            {LOCALE_LABELS[locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
