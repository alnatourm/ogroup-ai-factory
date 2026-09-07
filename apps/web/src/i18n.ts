export const messages = {
  en: {
    appName: 'OGroup Product',
    welcome: 'Welcome',
  },
  ar: {
    appName: 'منتج OGroup',
    welcome: 'مرحباً',
  },
} as const;

export type Locale = keyof typeof messages;

export function localeDirection(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function translate(locale: Locale, key: keyof typeof messages.en): string {
  return messages[locale][key];
}
