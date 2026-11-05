/* ============================================================
   content.js — conteúdo editável do portfólio

   Projetos, experiência, formação e certificados não ficam mais
   escritos no HTML: eles vêm de assets/data/content.json, que a
   página admin.html sabe editar e exportar.

   Como conversa com o resto do site:
   1. lê o JSON;
   2. monta o DOM no idioma atual, com pick() para os pares {pt, en}
      do JSON e t() para os rótulos fixos do dicionário;
   3. remonta tudo quando o idioma muda (onChange do lang.js).

   O main.js espera window.PortfolioContent.ready antes de
   inicializar filtros, contadores e animações.
============================================================ */

import { normalize, stats } from './content/model.js';
import { t, pick, onChange } from './lang/lang.js';

window.PortfolioContent = (function () {
  'use strict';

  const SOURCE = 'assets/data/content.json';
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const ICON_EXTERNAL = 'M7 17L17 7M9 7h8v8';

  /* ---------- utilidades ---------- */

  /** Cria um elemento com classe, texto, atributos e filhos. */
  function make(tag, options) {
    const opts = options || {};
    const node = document.createElement(tag);

    if (opts.className) node.className = opts.className;
    if (opts.text) node.textContent = opts.text;

    Object.keys(opts.attrs || {}).forEach((name) => {
      node.setAttribute(name, opts.attrs[name]);
    });

    (opts.children || []).forEach((child) => child && node.appendChild(child));

    return node;
  }

  /** Ícone de seta usado nos links dos cards. */
  function icon(path) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');

    const shape = document.createElementNS(SVG_NS, 'path');
    shape.setAttribute('d', path);
    svg.appendChild(shape);

    return svg;
  }

  /** Link externo com rel de segurança sempre preenchido. */
  function externalLink(url, className) {
    return make('a', {
      className: className,
      attrs: { href: url, target: '_blank', rel: 'noopener noreferrer' },
    });
  }

  /* ---------- projetos ---------- */

  function projectCard(project) {
    const classes = ['project'];

    if (project.featured) classes.push('project--featured');
    classes.push('reveal');

    const head = make('header', { className: 'project__head' });

    if (project.badge) {
      head.appendChild(
        make('span', {
          className: 'project__badge',
          text: t(project.badge === 'wip' ? 'projects.wip' : 'projects.badge'),
        })
      );
    }

    head.appendChild(make('h3', { className: 'project__title', text: pick(project.title) }));

    const tags = make('ul', { className: 'tags tags--sm' });
    (project.tags || []).forEach((tag) => {
      tags.appendChild(make('li', { className: 'tag', text: tag }));
    });

    const footer = make('footer', { className: 'project__links' });
    (project.links || []).forEach((link, index) => {
      // O primeiro link é o principal e leva a seta; os demais ficam discretos.
      const anchor = externalLink(link.url, index === 0 ? 'link' : 'link link--muted');
      const key = link.type === 'live' ? 'projects.link.live' : 'projects.link.code';

      anchor.appendChild(make('span', { text: t(key) }));
      if (index === 0) anchor.appendChild(icon(ICON_EXTERNAL));

      footer.appendChild(anchor);
    });

    return make('article', {
      className: classes.join(' '),
      attrs: { 'data-category': project.category || '' },
      children: [
        head,
        make('p', { className: 'project__desc', text: pick(project.desc) }),
        tags,
        footer,
      ],
    });
  }

  function renderProjects(data) {
    const list = document.getElementById('projects');
    const filters = document.getElementById('filters');

    if (list) {
      list.replaceChildren(...data.projects.map(projectCard));
    }

    if (!filters) return;

    // Só entram no filtro as categorias que realmente têm projeto.
    const used = new Set(data.projects.map((project) => project.category));
    const buttons = [
      make('button', {
        className: 'filter is-active',
        text: t('projects.filter.all'),
        attrs: { type: 'button', role: 'tab', 'aria-selected': 'true', 'data-filter': 'all' },
      }),
    ];

    data.categories
      .filter((category) => used.has(category.id))
      .forEach((category) => {
        buttons.push(
          make('button', {
            className: 'filter',
            text: pick(category.label),
            attrs: {
              type: 'button',
              role: 'tab',
              'aria-selected': 'false',
              'data-filter': category.id,
            },
          })
        );
      });

    filters.replaceChildren(...buttons);
  }

  /* ---------- experiência e formação ---------- */

  function timelineItem(item) {
    const field = (name, tag, className) => make(tag, { className: className, text: pick(item[name]) });

    return make('li', {
      className: 'timeline__item reveal',
      children: [
        field('period', 'span', 'timeline__period'),
        field('role', 'h3', 'timeline__role'),
        field('org', 'p', 'timeline__org'),
        field('desc', 'p', 'timeline__desc'),
      ],
    });
  }

  function renderTimeline(elementId, items) {
    const list = document.getElementById(elementId);
    if (!list) return;

    list.replaceChildren(...items.map(timelineItem));
  }

  /* ---------- certificados ---------- */

  function certGroup(group) {
    const head = make('p', {
      className: 'cert-group__head',
      children: [
        make('span', { className: 'cert-group__name', text: pick(group.name) }),
        make('span', { className: 'cert-group__meta', text: pick(group.meta) }),
      ],
    });

    const list = make('ul', { className: 'cert-list' });

    (group.items || []).forEach((cert) => {
      const anchor = externalLink(cert.url, cert.wip ? 'cert cert--wip' : 'cert');
      anchor.textContent = cert.title;

      list.appendChild(make('li', { children: [anchor] }));
    });

    return make('li', { className: 'cert-group', children: [head, list] });
  }

  function renderCertificates(groups) {
    const list = document.getElementById('cert-groups');
    if (!list) return;

    list.replaceChildren(...groups.map(certGroup));
  }

  /* ---------- falha de carregamento ---------- */

  /**
   * Se o JSON não carregar, cada seção recebe um aviso curto com link
   * para o GitHub em vez de ficar vazia e sem explicação.
   */
  function renderFallback() {
    ['projects', 'experience-list', 'education-list', 'cert-groups'].forEach((id) => {
      const target = document.getElementById(id);
      if (!target || target.children.length) return;

      // data-i18n deixa o main.js retraduzir o aviso na troca de idioma.
      const link = externalLink('https://github.com/vitordev18', 'link');
      const label = make('span', { text: t('content.error') });
      label.dataset.i18n = 'content.error';
      link.appendChild(label);

      target.replaceChildren(make('p', { className: 'content-error', children: [link] }));
    });
  }

  function render(data) {
    renderProjects(data);
    renderTimeline('experience-list', data.experience);
    renderTimeline('education-list', data.education);
    renderCertificates(data.certificates);
  }

  /* ---------- carregamento ---------- */

  let loaded = null;

  // Inscrito antes do main.js (este módulo roda primeiro): na troca de
  // idioma o DOM novo já existe quando o main.js reaplica filtro e reveal.
  onChange(() => {
    if (loaded) render(loaded);
  });

  const ready = fetch(SOURCE, { cache: 'no-cache' })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((raw) => {
      const data = normalize(raw);

      loaded = data;
      render(data);

      return data;
    })
    .catch((error) => {
      // Acontece, por exemplo, ao abrir o index.html direto pelo file://,
      // onde o navegador bloqueia fetch. Rodar um servidor local resolve.
      console.warn('[content] falha ao carregar', SOURCE, error);
      renderFallback();

      return null;
    });

  return { ready: ready, source: SOURCE, stats: stats };
})();
