/* ============================================================
   content.js — conteúdo editável do portfólio

   Projetos, experiência, formação e certificados não ficam mais
   escritos no HTML: eles vêm de assets/data/content.json, que a
   página admin.html sabe editar e exportar.

   Como conversa com o resto do site:
   1. lê o JSON;
   2. registra cada texto pt/en no dicionário do i18n.js, usando
      chaves geradas a partir do id do item;
   3. monta o DOM já com os atributos data-i18n, para que a troca
      de idioma continue funcionando exatamente como antes.

   O main.js espera window.PortfolioContent.ready antes de
   inicializar filtros, contadores e animações.
============================================================ */

window.PortfolioContent = (function () {
  'use strict';

  const SOURCE = 'assets/data/content.json';
  const LANGS = ['pt', 'en'];
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const ICON_EXTERNAL = 'M7 17L17 7M9 7h8v8';

  const I18N = (window.I18N = window.I18N || { pt: {}, en: {} });
  LANGS.forEach((lang) => {
    I18N[lang] = I18N[lang] || {};
  });

  /* ---------- utilidades ---------- */

  /** Grava um par {pt, en} no dicionário e devolve a chave criada. */
  function register(key, value) {
    const pair = value || {};

    LANGS.forEach((lang) => {
      I18N[lang][key] = pair[lang] || pair.pt || '';
    });

    return key;
  }

  /**
   * Cria um elemento. Se `i18n` vier junto, o texto é escrito pelo
   * dicionário depois — aqui entra só o valor em português, que serve
   * de conteúdo inicial e de fallback caso a chave suma.
   */
  function make(tag, options) {
    const opts = options || {};
    const node = document.createElement(tag);

    if (opts.className) node.className = opts.className;
    if (opts.text) node.textContent = opts.text;
    if (opts.i18n) node.dataset.i18n = opts.i18n;

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
    const id = project.id;
    const classes = ['project'];

    if (project.featured) classes.push('project--featured');
    classes.push('reveal');

    const head = make('header', { className: 'project__head' });

    if (project.badge) {
      head.appendChild(
        make('span', {
          className: 'project__badge',
          i18n: project.badge === 'wip' ? 'projects.wip' : 'projects.badge',
          text: project.badge === 'wip' ? 'Em andamento' : 'Destaque',
        })
      );
    }

    head.appendChild(
      make('h3', {
        className: 'project__title',
        i18n: register(`project.${id}.title`, project.title),
        text: (project.title || {}).pt,
      })
    );

    const tags = make('ul', { className: 'tags tags--sm' });
    (project.tags || []).forEach((tag) => {
      tags.appendChild(make('li', { className: 'tag', text: tag }));
    });

    const footer = make('footer', { className: 'project__links' });
    (project.links || []).forEach((link, index) => {
      // O primeiro link é o principal e leva a seta; os demais ficam discretos.
      const anchor = externalLink(link.url, index === 0 ? 'link' : 'link link--muted');
      const key = link.type === 'live' ? 'projects.link.live' : 'projects.link.code';
      const label = link.type === 'live' ? 'Ver online' : 'Código';

      anchor.appendChild(make('span', { i18n: key, text: label }));
      if (index === 0) anchor.appendChild(icon(ICON_EXTERNAL));

      footer.appendChild(anchor);
    });

    return make('article', {
      className: classes.join(' '),
      attrs: { 'data-category': project.category || '' },
      children: [
        head,
        make('p', {
          className: 'project__desc',
          i18n: register(`project.${id}.desc`, project.desc),
          text: (project.desc || {}).pt,
        }),
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
        i18n: 'projects.filter.all',
        text: 'Todos',
        attrs: { type: 'button', role: 'tab', 'aria-selected': 'true', 'data-filter': 'all' },
      }),
    ];

    (data.categories || [])
      .filter((category) => used.has(category.id))
      .forEach((category) => {
        buttons.push(
          make('button', {
            className: 'filter',
            i18n: register(`category.${category.id}`, category.label),
            text: (category.label || {}).pt,
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

  function timelineItem(prefix, item) {
    const field = (name, tag, className) =>
      make(tag, {
        className: className,
        i18n: register(`${prefix}.${item.id}.${name}`, item[name]),
        text: (item[name] || {}).pt,
      });

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

  function renderTimeline(elementId, prefix, items) {
    const list = document.getElementById(elementId);
    if (!list) return;

    list.replaceChildren(...items.map((item) => timelineItem(prefix, item)));
  }

  /* ---------- certificados ---------- */

  function certGroup(group) {
    const head = make('p', {
      className: 'cert-group__head',
      children: [
        make('span', {
          className: 'cert-group__name',
          i18n: register(`cert.${group.id}.name`, group.name),
          text: (group.name || {}).pt,
        }),
        make('span', {
          className: 'cert-group__meta',
          i18n: register(`cert.${group.id}.meta`, group.meta),
          text: (group.meta || {}).pt,
        }),
      ],
    });

    const list = make('ul', { className: 'cert-list' });

    (group.items || []).forEach((cert) => {
      const anchor = externalLink(cert.url, cert.wip ? 'cert cert--wip' : 'cert');
      anchor.textContent = cert.title;

      // data-hours alimenta o total de horas exibido no resumo.
      if (!cert.wip && cert.hours) anchor.dataset.hours = String(cert.hours);

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
    register('content.error', {
      pt: 'Não consegui carregar esta seção agora. O conteúdo está no meu GitHub.',
      en: 'I could not load this section right now. The content is on my GitHub.',
    });

    ['projects', 'experience-list', 'education-list', 'cert-groups'].forEach((id) => {
      const target = document.getElementById(id);
      if (!target || target.children.length) return;

      const link = externalLink('https://github.com/vitordev18', 'link');
      link.appendChild(make('span', { i18n: 'content.error', text: I18N.pt['content.error'] }));

      target.replaceChildren(make('p', { className: 'content-error', children: [link] }));
    });
  }

  /* ---------- carregamento ---------- */

  const ready = fetch(SOURCE, { cache: 'no-cache' })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      renderProjects(data);
      renderTimeline('experience-list', 'exp', data.experience || []);
      renderTimeline('education-list', 'edu', data.education || []);
      renderCertificates(data.certificates || []);

      return data;
    })
    .catch((error) => {
      // Acontece, por exemplo, ao abrir o index.html direto pelo file://,
      // onde o navegador bloqueia fetch. Rodar um servidor local resolve.
      console.warn('[content] falha ao carregar', SOURCE, error);
      renderFallback();

      return null;
    });

  return { ready: ready, source: SOURCE };
})();
