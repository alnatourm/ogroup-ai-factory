export type ProductLanguage = 'ar' | 'en';
export type ProductPlatform = 'web' | 'api' | 'mobile';

export interface ProductTemplateConfig {
  productName: string;
  market: string;
  industry: string;
  platforms: ProductPlatform[];
  languages: ProductLanguage[];
  defaultLanguage: ProductLanguage;
}

export function defineProduct(config: ProductTemplateConfig): ProductTemplateConfig {
  if (!config.productName.trim()) throw new Error('PRODUCT_NAME_REQUIRED');
  if (!config.market.trim()) throw new Error('PRODUCT_MARKET_REQUIRED');
  if (!config.industry.trim()) throw new Error('PRODUCT_INDUSTRY_REQUIRED');
  if (config.platforms.length === 0) throw new Error('PRODUCT_PLATFORM_REQUIRED');
  if (config.languages.length === 0) throw new Error('PRODUCT_LANGUAGE_REQUIRED');
  if (!config.languages.includes(config.defaultLanguage)) {
    throw new Error('DEFAULT_LANGUAGE_NOT_ENABLED');
  }
  return Object.freeze({
    ...config,
    productName: config.productName.trim(),
    market: config.market.trim(),
    industry: config.industry.trim(),
    platforms: [...new Set(config.platforms)],
    languages: [...new Set(config.languages)],
  });
}

export function textDirection(language: ProductLanguage): 'rtl' | 'ltr' {
  return language === 'ar' ? 'rtl' : 'ltr';
}
