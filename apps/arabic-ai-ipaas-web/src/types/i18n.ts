export type SupportedLanguage = 'ar' | 'en';
export type TextDirection = 'rtl' | 'ltr';

export interface I18nContextType {
  language: SupportedLanguage;
  direction: TextDirection;
  setLanguage: (lang: SupportedLanguage) => void;
  toggleLanguage: () => void;
  t: (key: string, defaultText?: string) => string;
}
