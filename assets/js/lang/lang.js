/* ============================================================
   lang.js — idioma atual, tradução e aviso de troca

   t(key)          texto do dicionário no idioma atual
   pick({pt, en})  escolhe o lado do par vindo do content.json
   setLang(lang)   troca o idioma e avisa quem se inscreveu
   onChange(fn)    fn(lang) roda a cada setLang, na ordem de inscrição
============================================================ */

import DICTIONARY from './dictionary.js';

export const DEFAULT_LANG = 'pt';

export const LANGUAGES = {
  pt: { htmlLang: 'pt-BR', short: 'PT', native: 'Português' },
  en: { htmlLang: 'en', short: 'EN', native: 'English' },
};

/*
  Valores que envelhecem sozinhos. Ficam como {age} e {years} dentro das
  strings do dicionário e são calculados a cada carregamento da página, para
  não precisarem ser corrigidos à mão todo aniversário.
*/
const BIRTH_DATE = '2004-11-18';
const STUDY_START = '2023-01-04';

/** Anos completos entre uma data ISO e hoje. */
function yearsSince(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  const today = new Date();
  const monthsPassed = today.getMonth() + 1 - month;
  let years = today.getFullYear() - year;

  // Ainda não chegou a data neste ano? Então falta completar mais um.
  if (monthsPassed < 0 || (monthsPassed === 0 && today.getDate() < day)) years -= 1;

  return Math.max(years, 0);
}

const TOKENS = {
  '{age}': String(yearsSince(BIRTH_DATE)),
  '{years}': String(yearsSince(STUDY_START)),
};

const fillTokens = (text) =>
  Object.keys(TOKENS).reduce((acc, token) => acc.split(token).join(TOKENS[token]), text);

let current = DEFAULT_LANG;
const listeners = [];

export const getLang = () => current;

export function t(key) {
  const value = DICTIONARY[current][key] !== undefined ? DICTIONARY[current][key] : DICTIONARY[DEFAULT_LANG][key];

  return fillTokens(value !== undefined ? value : key);
}

export function pick(pair) {
  if (!pair) return '';

  return pair[current] || pair[DEFAULT_LANG] || '';
}

export function setLang(lang) {
  if (!LANGUAGES[lang]) return;

  current = lang;
  listeners.forEach((fn) => fn(lang));
}

export function onChange(fn) {
  listeners.push(fn);
}
