export interface LanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
  countryCode: string;
  flag: string;
}

export interface DeclaredLanguagePair {
  key: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export const LEGACY_TARGET_LANGUAGE_SETTING_KEY = 'targetLanguage';
export const DECLARED_LANGUAGE_PAIRS_SETTING_KEY = 'declaredLanguagePairs';
export const ACTIVE_LANGUAGE_PAIR_SETTING_KEY = 'activeLanguagePair';
export const DEFAULT_TARGET_LANGUAGE = 'en';
export const CUSTOM_LANGUAGE_FLAG = '🌐';

export const TARGET_LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', countryCode: 'US', flag: '🇺🇸' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', countryCode: 'DE', flag: '🇩🇪' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Espanol', countryCode: 'ES', flag: '🇪🇸' },
  { code: 'fr', label: 'French', nativeLabel: 'Francais', countryCode: 'FR', flag: '🇫🇷' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano', countryCode: 'IT', flag: '🇮🇹' },
  { code: 'ja', label: 'Japanese', nativeLabel: 'Nihongo', countryCode: 'JP', flag: '🇯🇵' },
  { code: 'ko', label: 'Korean', nativeLabel: 'Hangugo', countryCode: 'KR', flag: '🇰🇷' },
  { code: 'pl', label: 'Polish', nativeLabel: 'Polski', countryCode: 'PL', flag: '🇵🇱' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Portugues', countryCode: 'PT', flag: '🇵🇹' },
  { code: 'uk', label: 'Ukrainian', nativeLabel: 'Ukrainska', countryCode: 'UA', flag: '🇺🇦' }
];

export function normalizeLanguageTag(code?: string | null): string | undefined {
  if (!code) {
    return undefined;
  }

  const sanitizedCode = code.trim().replaceAll('_', '-').replace(/\s+/g, '');
  if (!sanitizedCode) {
    return undefined;
  }

  return sanitizedCode
    .split('-')
    .filter(Boolean)
    .map((part, index) => {
      if (index === 0) {
        return part.toLowerCase();
      }
      if (part.length === 2 || /^\d{3}$/.test(part)) {
        return part.toUpperCase();
      }
      if (part.length === 4) {
        return `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`;
      }
      return part.toLowerCase();
    })
    .join('-');
}

export function getLanguageOption(code: string): LanguageOption | undefined {
  const normalizedCode = normalizeLanguageTag(code);
  if (!normalizedCode) {
    return undefined;
  }

  const primaryLanguage = normalizedCode.split('-')[0];
  return TARGET_LANGUAGE_OPTIONS.find(
    (language) => language.code === normalizedCode || language.code === primaryLanguage
  );
}

export function getLanguageLabel(code: string): string {
  const normalizedCode = normalizeLanguageTag(code);
  const languageOption = normalizedCode ? getLanguageOption(normalizedCode) : undefined;

  return languageOption?.label ?? normalizedCode ?? code;
}

export function getLanguageFlag(code: string): string {
  return getLanguageOption(code)?.flag ?? CUSTOM_LANGUAGE_FLAG;
}

export function buildLanguagePairKey(sourceLanguage: string, targetLanguage: string): string {
  return `${sourceLanguage}:${targetLanguage}`;
}

export function createLanguagePair(
  sourceLanguage: string,
  targetLanguage: string
): DeclaredLanguagePair {
  return {
    key: buildLanguagePairKey(sourceLanguage, targetLanguage),
    sourceLanguage,
    targetLanguage
  };
}

export function getLanguagePairFlags(pair: DeclaredLanguagePair): string {
  return `${getLanguageFlag(pair.sourceLanguage)}->${getLanguageFlag(pair.targetLanguage)}`;
}

export function getLanguagePairLabel(pair: DeclaredLanguagePair): string {
  return `${getLanguageLabel(pair.sourceLanguage)} -> ${getLanguageLabel(pair.targetLanguage)}`;
}

export function getDefaultLanguagePair(targetLanguage = DEFAULT_TARGET_LANGUAGE): DeclaredLanguagePair {
  const normalizedTargetLanguage = normalizeLanguageTag(targetLanguage) ?? DEFAULT_TARGET_LANGUAGE;
  const browserLanguage = normalizeLanguageTag(
    typeof navigator !== 'undefined' ? navigator.language : undefined
  );
  const fallbackSourceLanguage = normalizedTargetLanguage.startsWith('de') ? 'en' : 'de';
  const sourceLanguage = browserLanguage && browserLanguage !== normalizedTargetLanguage
    ? browserLanguage
    : fallbackSourceLanguage;

  return createLanguagePair(sourceLanguage, normalizedTargetLanguage);
}
