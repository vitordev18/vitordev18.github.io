/* ============================================================
   model.js — formato do content.json num lugar só

   Usado pelo site (render), pelo admin (editor) e pelos testes
   (node --test). Não toca no DOM.
============================================================ */

export const VERSION = 1;
export const LISTS = ['categories', 'projects', 'experience', 'education', 'certificates'];

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (pair, lang = 'pt') => (isObject(pair) && typeof pair[lang] === 'string' ? pair[lang].trim() : '');

/** Devolve uma cópia com todas as listas presentes e certificados em andamento sem horas. */
export function normalize(raw) {
  const data = isObject(raw) ? JSON.parse(JSON.stringify(raw)) : {};

  data.version = data.version || VERSION;
  LISTS.forEach((list) => {
    if (!Array.isArray(data[list])) data[list] = [];
  });

  data.certificates.forEach((group) => {
    if (!Array.isArray(group.items)) group.items = [];
    group.items.forEach((cert) => {
      cert.hours = cert.wip ? 0 : Number(cert.hours) || 0;
    });
  });

  return data;
}

/** Lista de problemas em português. Vazia quando o conteúdo está bom. */
export function validate(raw) {
  if (!isObject(raw)) return ['O conteúdo precisa ser um objeto JSON.'];

  const errors = [];

  if (raw.version !== undefined && raw.version !== VERSION) {
    errors.push(`versão ${raw.version} não suportada (esperado ${VERSION})`);
  }

  const missing = LISTS.filter((list) => !Array.isArray(raw[list]));
  if (missing.length) errors.push(`faltam as listas: ${missing.join(', ')}`);

  LISTS.filter((list) => Array.isArray(raw[list])).forEach((list) => {
    const seen = new Set();

    raw[list].forEach((item, index) => {
      const where = `${list}[${index}]`;

      if (!isObject(item) || !item.id) {
        errors.push(`${where}: sem id`);
        return;
      }
      if (seen.has(item.id)) errors.push(`${where}: id repetido “${item.id}”`);
      seen.add(item.id);
    });
  });

  const categories = new Set((Array.isArray(raw.categories) ? raw.categories : []).map((c) => c && c.id));
  const each = (list, check) =>
    (Array.isArray(raw[list]) ? raw[list] : []).forEach((item, index) => {
      if (isObject(item)) check(item, `${list}[${index}]`);
    });

  each('categories', (item, where) => {
    if (!text(item.label)) errors.push(`${where}: falta label.pt`);
  });

  each('projects', (item, where) => {
    if (!text(item.title)) errors.push(`${where}: falta title.pt`);
    if (!text(item.desc)) errors.push(`${where}: falta desc.pt`);
    if (!categories.has(item.category)) errors.push(`${where}: categoria desconhecida “${item.category}”`);
    if (item.badge != null && !['featured', 'wip'].includes(item.badge)) {
      errors.push(`${where}: selo inválido “${item.badge}”`);
    }
    const links = Array.isArray(item.links) ? item.links : [];
    if (!links.some((link) => link && link.url)) errors.push(`${where}: precisa de pelo menos um link`);
    links.forEach((link, i) => {
      if (!link || !['code', 'live'].includes(link.type)) errors.push(`${where}.links[${i}]: tipo inválido`);
    });
  });

  ['experience', 'education'].forEach((list) =>
    each(list, (item, where) => {
      ['period', 'role', 'org'].forEach((field) => {
        if (!text(item[field])) errors.push(`${where}: falta ${field}.pt`);
      });
    })
  );

  each('certificates', (group, where) => {
    if (!text(group.name)) errors.push(`${where}: falta name.pt`);
    if (!Array.isArray(group.items)) {
      errors.push(`${where}: items precisa ser uma lista`);
      return;
    }
    group.items.forEach((cert, i) => {
      if (!cert || !cert.title || !cert.url) errors.push(`${where}.items[${i}]: falta título ou URL`);
      else if (!(Number(cert.hours) >= 0)) errors.push(`${where}.items[${i}]: horas inválidas`);
    });
  });

  return errors;
}

/** Hash curto estilo git (7 hex) derivado do id: estável entre recargas e idiomas. FNV-1a 32 bits. */
export function shortHash(id) {
  let hash = 0x811c9dc5;

  for (const char of String(id)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, 7);
}

/** Números exibidos no site. Certificados em andamento (wip) não contam. */
export function stats(content) {
  const data = normalize(content);
  const done = data.certificates.flatMap((group) => group.items).filter((cert) => !cert.wip);

  return {
    projects: data.projects.length,
    companies: data.experience.length,
    education: data.education.length,
    courses: done.length,
    hours: done.reduce((total, cert) => total + cert.hours, 0),
  };
}
