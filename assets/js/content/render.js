/* ============================================================
   content/render.js — conteúdo editável do portfólio

   Projetos, experiência, formação e certificados não ficam mais
   escritos no HTML: eles vêm de assets/data/content.json, que a
   página admin.html sabe editar e exportar.

   Como conversa com o resto do site:
   1. lê o JSON;
   2. monta o DOM no idioma atual, com pick() para os pares {pt, en}
      do JSON e t() para os rótulos fixos do dicionário;
   3. remonta tudo quando o idioma muda (onChange do lang.js).

   O site/main.js espera `ready` antes de inicializar filtros,
   contadores e animações. `ready` resolve com o conteúdo
   normalizado, ou null se o JSON não carregar.
============================================================ */

import { normalize, shortHash } from './model.js';
import { t, pick, onChange } from '../lang/lang.js';
import { make, icon } from '../lib/dom.js';

export const { ready } = (function () {
  'use strict';

  const SOURCE = 'assets/data/content.json';

  const ICON_EXTERNAL = 'M7 17L17 7M9 7h8v8';

  /* ---------- utilidades ---------- */

  /** Link externo com rel de segurança sempre preenchido. */
  function externalLink(url, className) {
    return make('a', {
      className: className,
      attrs: { href: url, target: '_blank', rel: 'noopener noreferrer' },
    });
  }

  /* ---------- projetos ---------- */

  /** Partes comuns ao card em destaque e às linhas. */
  function projectParts(project, categories) {
    const category = categories.find((item) => item.id === project.category);

    const meta = make('p', {
      className: 'project__meta',
      children: [
        make('span', { text: category ? pick(category.label) : project.category }),
        // Espaço real entre os dois: o gap do CSS não chega ao leitor de tela.
        project.badge === 'wip' ? document.createTextNode(' ') : null,
        project.badge === 'wip'
          ? make('span', { className: 'project__wip', text: t('projects.wip') })
          : null,
      ],
    });

    const tags = make('ul', { className: 'tags tags--sm' });
    (project.tags || []).forEach((tag) => {
      tags.appendChild(make('li', { className: 'tag', text: tag }));
    });

    const links = make('div', { className: 'project__links' });
    (project.links || []).forEach((link, index) => {
      // O primeiro link é o principal e leva a seta; os demais ficam discretos.
      const anchor = externalLink(link.url, index === 0 ? 'link' : 'link link--muted');
      const key = link.type === 'live' ? 'projects.link.live' : 'projects.link.code';

      anchor.appendChild(make('span', { text: t(key) }));
      if (index === 0) anchor.appendChild(icon(ICON_EXTERNAL));

      links.appendChild(anchor);
    });

    return {
      title: make('h3', { className: 'project__title', text: pick(project.title) }),
      desc: make('p', { className: 'project__desc', text: pick(project.desc) }),
      meta,
      tags,
      links,
    };
  }

  function featuredCard(project, categories) {
    const parts = projectParts(project, categories);

    return make('article', {
      className: 'project project--featured reveal',
      attrs: { 'data-category': project.category || '' },
      children: [
        // Painel decorativo: o nome já está no h3.
        make('div', {
          className: 'project__art',
          attrs: { 'aria-hidden': 'true' },
          children: [make('span', { text: pick(project.title) })],
        }),
        make('div', {
          className: 'project__body',
          children: [
            make('span', { className: 'project__badge', text: t('projects.badge') }),
            parts.title,
            parts.meta,
            parts.desc,
            parts.tags,
            parts.links,
          ],
        }),
      ],
    });
  }

  function projectRow(project, number, categories) {
    const parts = projectParts(project, categories);

    return make('li', {
      className: 'project project--row reveal',
      attrs: { 'data-category': project.category || '' },
      children: [
        make('span', {
          className: 'project__index',
          attrs: { 'aria-hidden': 'true' },
          text: String(number).padStart(2, '0'),
        }),
        make('div', { className: 'project__main', children: [parts.title, parts.meta, parts.desc] }),
        parts.tags,
        parts.links,
      ],
    });
  }

  function renderProjects(data) {
    const list = document.getElementById('projects');
    const filters = document.getElementById('filters');

    if (list) {
      // O primeiro marcado como destaque vira o card largo; o resto vira lista de linhas.
      const featured = data.projects.find((project) => project.featured);
      const rows = make('ol', { className: 'rows' });

      data.projects
        .filter((project) => project !== featured)
        .forEach((project, index) => rows.appendChild(projectRow(project, index + 1, data.categories)));

      list.replaceChildren(...[featured && featuredCard(featured, data.categories), rows].filter(Boolean));
    }

    if (!filters) return;

    // Só entram no filtro as categorias que realmente têm projeto.
    // tabindex, aria-selected e is-active são acertados pelo applyFilter do site/main.js.
    const used = new Set(data.projects.map((project) => project.category));
    const tab = (id, label) =>
      make('button', {
        className: 'filter',
        text: label,
        attrs: {
          type: 'button',
          role: 'tab',
          id: `filter-${id}`,
          'aria-controls': 'projects',
          'aria-selected': 'false',
          tabindex: '-1',
          'data-filter': id,
        },
      });

    filters.replaceChildren(
      tab('all', t('projects.filter.all')),
      ...data.categories
        .filter((category) => used.has(category.id))
        .map((category) => tab(category.id, pick(category.label)))
    );
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

  /** Experiência como `git log`: hash do id, período como data, cargo como mensagem, empresa como autor. */
  function commitItem(item, index) {
    const meta = make('p', {
      className: 'commit__meta',
      children: [
        make('span', { className: 'commit__hash', text: shortHash(item.id) }),
        // O primeiro item é o trabalho atual: o HEAD do log.
        index === 0 ? make('span', { className: 'commit__head', text: 'HEAD' }) : null,
        make('span', { className: 'commit__date', text: pick(item.period) }),
      ],
    });

    return make('li', {
      className: 'commit reveal',
      children: [
        meta,
        make('h3', { className: 'commit__msg', text: pick(item.role) }),
        make('p', {
          className: 'commit__author',
          children: [
            make('span', { className: 'commit__label', text: `${t('experience.author')}:` }),
            make('span', { text: ` ${pick(item.org)}` }),
          ],
        }),
        make('p', { className: 'commit__desc', text: pick(item.desc) }),
      ],
    });
  }

  function renderLog(elementId, items) {
    const list = document.getElementById(elementId);
    if (!list) return;

    list.replaceChildren(...items.map(commitItem));
  }

  /* ---------- certificados ---------- */

  function certGroup(group, open) {
    const head = make('summary', {
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

    const details = make('details', {
      className: 'cert-group__details',
      attrs: { 'data-id': group.id, open: open },
      children: [head, list],
    });

    return make('li', { className: 'cert-group', children: [details] });
  }

  function renderCertificates(groups) {
    const list = document.getElementById('cert-groups');
    if (!list) return;

    // A troca de idioma remonta a lista: quem estava aberto continua aberto.
    const open = new Set(
      Array.from(list.querySelectorAll('details[open]'), (details) => details.dataset.id)
    );

    list.replaceChildren(...groups.map((group) => certGroup(group, open.has(group.id))));
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

      // data-i18n deixa o site/main.js retraduzir o aviso na troca de idioma.
      const link = externalLink('https://github.com/vitordev18', 'link');
      const label = make('span', { text: t('content.error') });
      label.dataset.i18n = 'content.error';
      link.appendChild(label);

      target.replaceChildren(make('p', { className: 'content-error', children: [link] }));
    });
  }

  function render(data) {
    renderProjects(data);
    renderLog('experience-list', data.experience);
    renderTimeline('education-list', data.education);
    renderCertificates(data.certificates);
  }

  /* ---------- carregamento ---------- */

  let loaded = null;

  // Inscrito antes do site/main.js (este módulo roda primeiro): na troca de
  // idioma o DOM novo já existe quando o site/main.js reaplica filtro e reveal.
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

  return { ready: ready };
})();
