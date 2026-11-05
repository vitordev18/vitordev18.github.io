/* ============================================================
   dom.js — atalhos de navegador usados pelo site e pelo admin
============================================================ */

export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

/** localStorage que não quebra em modo privado ou com a cota cheia. */
export const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      /* segue sem salvar */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      /* idem */
    }
  },
};

/** Cria um elemento com classe, texto, atributos e filhos. */
export function make(tag, options) {
  const opts = options || {};
  const node = document.createElement(tag);

  if (opts.className) node.className = opts.className;
  if (opts.text !== undefined) node.textContent = opts.text;

  Object.keys(opts.attrs || {}).forEach((name) => {
    const value = opts.attrs[name];
    if (value !== null && value !== undefined && value !== false) {
      node.setAttribute(name, value === true ? '' : String(value));
    }
  });

  (opts.children || []).forEach((child) => child && node.appendChild(child));

  return node;
}

/** Ícone traçado (viewBox 24) com um único path. */
export function icon(path) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');

  svg.setAttribute('class', 'icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');

  const shape = document.createElementNS(NS, 'path');
  shape.setAttribute('d', path);
  svg.appendChild(shape);

  return svg;
}
