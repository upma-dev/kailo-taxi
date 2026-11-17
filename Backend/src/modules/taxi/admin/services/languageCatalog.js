// Catalog of languages an admin can add. Names are produced by the runtime's ICU data
// (Intl.DisplayNames), so no external service is needed.
const CODES = [
  'en', 'hi', 'bn', 'te', 'mr', 'ta', 'gu', 'ur', 'kn', 'ml', 'pa', 'or', 'as', 'ne', 'sd', 'ks', 'sa', 'kok', 'mai', 'doi', 'mni', 'sat', 'bho',
  'ar', 'zh', 'es', 'fr', 'de', 'pt', 'ru', 'ja', 'ko', 'it', 'tr', 'vi', 'th', 'id', 'ms', 'fa', 'he', 'nl', 'pl', 'uk', 'ro', 'el', 'cs', 'sv',
  'hu', 'fi', 'da', 'no', 'sk', 'bg', 'hr', 'sr', 'sl', 'lt', 'lv', 'et', 'sw', 'af', 'am', 'si', 'my', 'km', 'lo', 'ka', 'hy', 'az', 'uz', 'kk',
  'mn', 'ps', 'fil', 'ca', 'eu', 'gl', 'is', 'ga', 'cy', 'sq', 'mk', 'bs', 'mt', 'zu', 'xh', 'yo', 'ig', 'ha', 'so',
];

const safeNames = (locale) => {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' });
  } catch {
    return null;
  }
};

const english = safeNames('en');

export const getLanguageCatalog = () =>
  CODES.map((code) => {
    const name = english?.of(code) || code;
    const native = safeNames(code)?.of(code) || name;
    return { code, name, native_name: native };
  }).filter((item) => item.name && item.name !== item.code)
    .sort((a, b) => a.name.localeCompare(b.name));
