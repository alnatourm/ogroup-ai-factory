import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { I18nContextType, SupportedLanguage, TextDirection } from '../types/i18n.js';
import { translations } from './translations.js';

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('ar');

  const direction: TextDirection = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', direction);
  }, [language, direction]);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  const t = (key: string, defaultText?: string): string => {
    const langDict = translations[language] || translations.ar;
    return langDict[key] || defaultText || key;
  };

  return (
    <I18nContext.Provider value={{ language, direction, setLanguage, toggleLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
