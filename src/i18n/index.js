import ko from './ko.js';
import en from './en.js';
import ja from './ja.js';
export const dictionaries = { ko, en, ja };
let language = 'ko';
export function setLanguage(value, browserLanguage = globalThis.navigator?.language ?? 'ko') {
  const requested = value === 'auto' ? browserLanguage.split('-')[0] : value;
  language = Object.hasOwn(dictionaries, requested) ? requested : 'en';
  return language;
}
export const getLanguage = () => language;
export function t(key, params = {}) {
  const template = dictionaries[language][key] ?? dictionaries.ko[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
}
export function tuningName(tuning) {
  if (tuning.custom) return tuning.name;
  const key = `preset.${tuning.id}`;
  return dictionaries.ko[key] ? t(key) : tuning.name.replace(' (4복현)', '').replace(' (5현)', '');
}
