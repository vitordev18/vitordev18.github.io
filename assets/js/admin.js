/* ============================================================
   admin.js — editor de conteúdo do portfólio

   Trabalha sobre uma cópia do assets/data/content.json guardada
   no navegador e devolve um arquivo pronto para commit. Não há
   servidor nem autenticação: o que esta página faz é montar,
   validar e exportar JSON.

   Estrutura:
   01. Estado e utilidades
   02. Descrição dos tipos (projetos, experiência, formação, certificados)
   03. Rascunho no localStorage
   04. Lista de itens
   05. Diálogo de edição
   06. Importação a partir do GitHub
   07. Abrir e baixar JSON
   08. Início
============================================================ */

import { normalize, validate, stats } from './content/model.js';

(function () {
  'use strict';

  /* ==========================================================
     01. ESTADO E UTILIDADES
  ========================================================== */

  const SOURCE = 'assets/data/content.json';
  const DRAFT_KEY = 'portfolio-admin-draft';
  const GH_USER = 'vitordev18';
  const LANGS = [
    { code: 'pt', label: 'Português' },
    { code: 'en', label: 'English' },
  ];

  /** Conteúdo em edição. */
  let model = null;
  /** Já difere do arquivo carregado? */
  let dirty = false;
  /** Aba aberta. */
  let activeType = 'projects';
  /** Item em edição: índice -1 significa "novo". */
  let editing = { type: null, index: -1 };
  /** Repositórios do GitHub, buscados sob demanda. */
  let repos = null;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const storage = {
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
        /* modo privado ou cota cheia: seguir sem rascunho */
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
  function make(tag, options) {
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

  /** Ícone traçado, no mesmo estilo do site. */
  function icon(path) {
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

  /** Lê 'title.pt' dentro de um objeto aninhado. */
  const dig = (obj, path) =>
    path.split('.').reduce((acc, part) => (acc === undefined || acc === null ? '' : acc[part]), obj);

  /** Escreve 'title.pt' criando os níveis que faltarem. */
  function plant(obj, path, value) {
    const parts = path.split('.');
    const last = parts.pop();
    const target = parts.reduce((acc, part) => {
      if (!acc[part]) acc[part] = {};
      return acc[part];
    }, obj);

    target[last] = value;
    return obj;
  }

  /** Texto vira identificador: minúsculas, sem acento, com hífens. */
  const slug = (text) =>
    String(text)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // tira acentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const clone = (value) => JSON.parse(JSON.stringify(value));

  /* ==========================================================
     02. DESCRIÇÃO DOS TIPOS

     Cada tipo diz como se chama, como resumir um item na lista,
     que campos o formulário mostra e como converter entre o
     formulário (chaves planas) e o JSON (objeto aninhado).
  ========================================================== */

  /** Campo com uma caixa por idioma. */
  const bilingual = (name, label, type, required) => ({
    name,
    label,
    type: type || 'text',
    bilingual: true,
    required: required !== false,
  });

  const TYPES = {
    projects: {
      key: 'projects',
      label: 'Projetos',
      singular: 'projeto',
      hint: 'A ordem aqui é a ordem dos cards no site. O primeiro card marcado como destaque ocupa a linha inteira.',
      title: (item) => dig(item, 'title.pt') || item.id,
      meta: (item) =>
        [item.category, item.badge === 'wip' ? 'em andamento' : item.badge === 'featured' ? 'destaque' : null,
         (item.tags || []).join(' · ')].filter(Boolean).join(' — '),
      github: true,
      blank: () => ({
        id: '', title: { pt: '', en: '' }, category: 'frontend', featured: false,
        badge: null, desc: { pt: '', en: '' }, tags: [], links: [],
      }),
      fields: () => [
        { name: 'id', label: 'Identificador', hint: 'Chave interna, sem espaço. Ex.: prime-photos', required: true },
        bilingual('title', 'Nome do projeto'),
        {
          name: 'category', label: 'Categoria', type: 'select',
          options: (model.categories || []).map((c) => ({ value: c.id, label: dig(c, 'label.pt') })),
        },
        {
          name: 'badge', label: 'Selo', type: 'select', required: false,
          options: [
            { value: '', label: 'nenhum' },
            { value: 'featured', label: 'Destaque' },
            { value: 'wip', label: 'Em andamento' },
          ],
        },
        { name: 'featured', label: 'Ocupar a linha inteira do grid', type: 'checkbox', required: false },
        bilingual('desc', 'Descrição', 'textarea'),
        { name: 'tags', label: 'Tecnologias', hint: 'Separadas por vírgula. Aparecem iguais nos dois idiomas.', required: false },
        { name: 'repoUrl', label: 'URL do repositório', type: 'url', required: false },
        { name: 'liveUrl', label: 'URL da demo (opcional)', type: 'url', required: false },
      ],
      toForm: (item) => ({
        id: item.id,
        'title.pt': dig(item, 'title.pt'), 'title.en': dig(item, 'title.en'),
        category: item.category || '',
        badge: item.badge || '',
        featured: Boolean(item.featured),
        'desc.pt': dig(item, 'desc.pt'), 'desc.en': dig(item, 'desc.en'),
        tags: (item.tags || []).join(', '),
        repoUrl: (item.links || []).filter((l) => l.type === 'code').map((l) => l.url)[0] || '',
        liveUrl: (item.links || []).filter((l) => l.type === 'live').map((l) => l.url)[0] || '',
      }),
      fromForm: (values) => {
        // A demo vem primeiro: é o link que ganha a seta no card.
        const links = [];
        if (values.liveUrl) links.push({ type: 'live', url: values.liveUrl });
        if (values.repoUrl) links.push({ type: 'code', url: values.repoUrl });

        return {
          id: values.id,
          title: { pt: values['title.pt'], en: values['title.en'] || values['title.pt'] },
          category: values.category,
          featured: Boolean(values.featured),
          badge: values.badge || null,
          desc: { pt: values['desc.pt'], en: values['desc.en'] || values['desc.pt'] },
          tags: values.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
          links,
        };
      },
      validate: (values) =>
        !values.repoUrl && !values.liveUrl ? 'Informe pelo menos a URL do repositório ou da demo.' : '',
    },

    experience: {
      key: 'experience',
      label: 'Experiência',
      singular: 'experiência',
      hint: 'Do trabalho mais recente para o mais antigo.',
      title: (item) => dig(item, 'role.pt') || item.id,
      meta: (item) => [dig(item, 'org.pt'), dig(item, 'period.pt')].filter(Boolean).join(' · '),
      blank: () => ({
        id: '', period: { pt: '', en: '' }, role: { pt: '', en: '' },
        org: { pt: '', en: '' }, desc: { pt: '', en: '' },
      }),
      fields: () => [
        { name: 'id', label: 'Identificador', hint: 'Ex.: moni, bracell', required: true },
        bilingual('period', 'Período', 'text'),
        bilingual('role', 'Cargo'),
        bilingual('org', 'Empresa, cidade e regime'),
        bilingual('desc', 'O que você fez', 'textarea'),
      ],
      toForm: (item) => flatten(item, ['period', 'role', 'org', 'desc']),
      fromForm: (values) => nest(values, ['period', 'role', 'org', 'desc']),
    },

    education: {
      key: 'education',
      label: 'Formação',
      singular: 'formação',
      hint: 'Cursos, graduações e certificações longas. Da mais recente para a mais antiga.',
      title: (item) => dig(item, 'role.pt') || item.id,
      meta: (item) => [dig(item, 'org.pt'), dig(item, 'period.pt')].filter(Boolean).join(' · '),
      blank: () => ({
        id: '', period: { pt: '', en: '' }, role: { pt: '', en: '' },
        org: { pt: '', en: '' }, desc: { pt: '', en: '' },
      }),
      fields: () => [
        { name: 'id', label: 'Identificador', hint: 'Ex.: tecnico, etec', required: true },
        bilingual('period', 'Período', 'text'),
        bilingual('role', 'Curso'),
        bilingual('org', 'Instituição'),
        bilingual('desc', 'Descrição', 'textarea'),
      ],
      toForm: (item) => flatten(item, ['period', 'role', 'org', 'desc']),
      fromForm: (values) => nest(values, ['period', 'role', 'org', 'desc']),
    },

    certificates: {
      key: 'certificates',
      label: 'Certificados',
      singular: 'grupo de certificados',
      hint: 'Os certificados ficam agrupados por assunto. O total de cursos e de horas exibido no site é somado a partir daqui.',
      title: (item) => dig(item, 'name.pt') || item.id,
      meta: (item) => {
        const { hours } = stats({ certificates: [item] });

        return `${(item.items || []).length} certificado(s)${hours ? ` · ${hours}h` : ''}`;
      },
      blank: () => ({ id: '', name: { pt: '', en: '' }, meta: { pt: '', en: '' }, items: [] }),
      fields: () => [
        { name: 'id', label: 'Identificador', hint: 'Ex.: a11y, js, htmlcss', required: true },
        bilingual('name', 'Nome do grupo'),
        bilingual('meta', 'Resumo', 'text', false),
        { name: 'items', label: 'Certificados', type: 'repeat', required: false },
      ],
      toForm: (item) => flatten(item, ['name', 'meta']),
      fromForm: (values, repeated) => {
        const base = nest(values, ['name', 'meta']);
        base.items = repeated;
        return base;
      },
      validate: (values, repeated) =>
        repeated.length === 0 ? 'Adicione pelo menos um certificado ao grupo.' : '',
    },
  };

  /** Item aninhado -> chaves planas do formulário. */
  function flatten(item, keys) {
    const values = { id: item.id };

    keys.forEach((key) => {
      LANGS.forEach((lang) => {
        values[`${key}.${lang.code}`] = dig(item, `${key}.${lang.code}`);
      });
    });

    return values;
  }

  /** Chaves planas do formulário -> item aninhado. */
  function nest(values, keys) {
    const item = { id: values.id };

    keys.forEach((key) => {
      item[key] = {
        pt: values[`${key}.pt`],
        en: values[`${key}.en`] || values[`${key}.pt`],
      };
    });

    return item;
  }

  const ORDER = ['projects', 'experience', 'education', 'certificates'];

  /* ==========================================================
     03. RASCUNHO
  ========================================================== */

  function markDirty() {
    dirty = true;
    storage.set(DRAFT_KEY, JSON.stringify(model));
    renderState();
    renderTabs();
  }

  function renderState() {
    const state = $('#state');
    const discard = $('#discard-btn');

    if (!state) return;

    if (dirty) {
      state.textContent = 'rascunho local · ainda não publicado';
      state.dataset.tone = 'dirty';
    } else {
      state.textContent = 'igual ao arquivo publicado';
      state.dataset.tone = 'clean';
    }

    if (discard) discard.hidden = !dirty;
  }

  /* ==========================================================
     04. ABAS E LISTA
  ========================================================== */

  function renderTabs() {
    const tabs = $('#tabs');
    if (!tabs) return;

    tabs.replaceChildren(
      ...ORDER.map((type) => {
        const spec = TYPES[type];
        const button = make('button', {
          className: 'tab',
          attrs: {
            type: 'button', role: 'tab', 'data-type': type,
            'aria-selected': String(type === activeType),
            'aria-controls': `panel-${type}`,
          },
          children: [
            make('span', { text: spec.label }),
            make('span', { className: 'tab__count', text: String((model[type] || []).length) }),
          ],
        });

        button.addEventListener('click', () => {
          activeType = type;
          renderTabs();
          renderPanels();
        });

        return button;
      })
    );
  }

  function itemButton(label, path, onClick, options) {
    const opts = options || {};
    const button = make('button', {
      className: `item__btn${opts.danger ? ' item__btn--danger' : ''}`,
      attrs: { type: 'button', 'aria-label': label, title: label, disabled: opts.disabled },
      children: [icon(path)],
    });

    button.addEventListener('click', onClick);
    return button;
  }

  function renderPanels() {
    const panels = $('#panels');
    if (!panels) return;

    panels.replaceChildren(
      ...ORDER.map((type) => {
        const spec = TYPES[type];
        const items = model[type] || [];

        const add = make('button', {
          className: 'btn btn--primary btn--sm',
          text: `Adicionar ${spec.singular}`,
          attrs: { type: 'button' },
        });
        add.addEventListener('click', () => openEditor(type, -1));

        const list = make('ol', { className: 'items', attrs: { id: `list-${type}` } });

        if (!items.length) {
          list.appendChild(
            make('li', { className: 'items__empty', text: `Nenhum item ainda. Use “Adicionar ${spec.singular}”.` })
          );
        }

        items.forEach((item, index) => {
          const row = make('li', {
            className: 'item',
            children: [
              make('span', { className: 'item__order', text: String(index + 1) }),
              make('div', {
                className: 'item__body',
                children: [
                  make('p', { className: 'item__title', text: spec.title(item) }),
                  make('span', { className: 'item__meta', text: spec.meta(item) }),
                ],
              }),
              make('div', {
                className: 'item__actions',
                children: [
                  itemButton('Mover para cima', 'M12 19V5M6 11l6-6 6 6', () => move(type, index, -1),
                    { disabled: index === 0 }),
                  itemButton('Mover para baixo', 'M12 5v14M6 13l6 6 6-6', () => move(type, index, 1),
                    { disabled: index === items.length - 1 }),
                  itemButton('Editar', 'M4 20h4l10-10-4-4L4 16v4zM14 6l4 4', () => openEditor(type, index)),
                  itemButton('Excluir', 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13', () => remove(type, index),
                    { danger: true }),
                ],
              }),
            ],
          });

          list.appendChild(row);
        });

        return make('section', {
          className: 'panel',
          attrs: { id: `panel-${type}`, role: 'tabpanel', hidden: type !== activeType },
          children: [
            make('div', {
              className: 'panel__head',
              children: [make('p', { className: 'panel__hint', text: spec.hint }), add],
            }),
            list,
          ],
        });
      })
    );
  }

  function move(type, index, delta) {
    const list = model[type];
    const target = index + delta;

    if (target < 0 || target >= list.length) return;

    [list[index], list[target]] = [list[target], list[index]];
    markDirty();
    renderPanels();
  }

  function remove(type, index) {
    const spec = TYPES[type];
    const name = spec.title(model[type][index]);

    if (!window.confirm(`Excluir “${name}”? Isso não pode ser desfeito.`)) return;

    model[type].splice(index, 1);
    markDirty();
    renderPanels();
  }

  /* ==========================================================
     05. DIÁLOGO DE EDIÇÃO
  ========================================================== */

  function fieldShell(field, control) {
    return make('div', {
      className: 'field',
      children: [
        make('label', {
          className: 'field__label',
          text: field.label + (field.required ? '' : ' (opcional)'),
          attrs: { for: control.id },
        }),
        control,
        field.hint ? make('span', { className: 'field__hint', text: field.hint }) : null,
      ],
    });
  }

  function input(field, name, value, langLabel) {
    const id = `f-${name.replace(/\./g, '-')}`;
    const tag = field.type === 'textarea' ? 'textarea' : field.type === 'select' ? 'select' : 'input';

    const control = make(tag, {
      className: 'field__input',
      attrs: {
        id,
        'data-field': name,
        type: tag === 'input' ? (field.type === 'url' ? 'url' : 'text') : null,
        rows: tag === 'textarea' ? 4 : null,
      },
    });

    if (field.type === 'select') {
      (field.options || []).forEach((option) => {
        control.appendChild(make('option', { text: option.label, attrs: { value: option.value } }));
      });
    }

    control.value = value === undefined || value === null ? '' : String(value);

    if (!langLabel) return control;

    return make('div', {
      className: 'field',
      children: [
        make('label', { className: 'field__lang', text: langLabel, attrs: { for: id } }),
        control,
      ],
    });
  }

  function buildField(field, values) {
    if (field.type === 'checkbox') {
      const id = `f-${field.name}`;
      const box = make('input', {
        className: 'field__check',
        attrs: { id, type: 'checkbox', 'data-field': field.name },
      });
      box.checked = Boolean(values[field.name]);

      return make('div', {
        className: 'field field__row',
        children: [box, make('label', { className: 'field__label', text: field.label, attrs: { for: id } })],
      });
    }

    if (field.type === 'repeat') return buildRepeat(field, values);

    if (field.bilingual) {
      return make('div', {
        className: 'field',
        children: [
          make('span', { className: 'field__label', text: field.label + (field.required ? '' : ' (opcional)') }),
          field.hint ? make('span', { className: 'field__hint', text: field.hint }) : null,
          make('div', {
            className: 'field-pair',
            children: LANGS.map((lang) =>
              input(field, `${field.name}.${lang.code}`, values[`${field.name}.${lang.code}`], lang.label)
            ),
          }),
        ],
      });
    }

    return fieldShell(field, input(field, field.name, values[field.name]));
  }

  /** Lista repetível — hoje só os certificados de um grupo. */
  function buildRepeat(field, values) {
    const list = make('div', { className: 'repeat', attrs: { id: 'repeat-list' } });

    const addRow = (cert) => {
      const data = cert || { title: '', hours: '', url: '', wip: false };

      const title = make('input', {
        className: 'field__input',
        attrs: { type: 'text', 'data-sub': 'title', placeholder: 'Nome do curso' },
      });
      const hours = make('input', {
        className: 'field__input',
        attrs: { type: 'number', min: '0', 'data-sub': 'hours', placeholder: 'horas' },
      });
      const url = make('input', {
        className: 'field__input',
        attrs: { type: 'url', 'data-sub': 'url', placeholder: 'https://…' },
      });
      const wip = make('input', { className: 'field__check', attrs: { type: 'checkbox', 'data-sub': 'wip' } });

      title.value = data.title || '';
      hours.value = data.hours ? String(data.hours) : '';
      url.value = data.url || '';
      wip.checked = Boolean(data.wip);

      const drop = make('button', {
        className: 'item__btn item__btn--danger',
        attrs: { type: 'button', 'aria-label': 'Remover certificado', title: 'Remover certificado' },
        children: [icon('M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13')],
      });

      const row = make('div', {
        className: 'repeat__item',
        children: [
          make('div', { className: 'repeat__grid', children: [title, hours] }),
          url,
          make('div', {
            className: 'repeat__foot',
            children: [
              make('label', { children: [wip, make('span', { text: 'em andamento (não conta nas horas)' })] }),
              drop,
            ],
          }),
        ],
      });

      drop.addEventListener('click', () => row.remove());
      list.appendChild(row);
    };

    (values.__items || []).forEach(addRow);

    const add = make('button', {
      className: 'btn btn--ghost btn--sm',
      text: 'Adicionar certificado',
      attrs: { type: 'button' },
    });
    add.addEventListener('click', () => addRow(null));

    return make('div', {
      className: 'field',
      children: [make('span', { className: 'field__label', text: field.label }), list, add],
    });
  }

  /** Lê as linhas repetíveis direto do DOM, preservando a ordem. */
  function readRepeat() {
    return $$('#repeat-list .repeat__item')
      .map((row) => {
        const get = (sub) => $(`[data-sub="${sub}"]`, row);
        const cert = {
          title: get('title').value.trim(),
          hours: Number(get('hours').value) || 0,
          url: get('url').value.trim(),
          wip: get('wip').checked,
        };

        if (cert.wip) cert.hours = 0;
        return cert;
      })
      .filter((cert) => cert.title && cert.url);
  }

  function openEditor(type, index) {
    const spec = TYPES[type];
    const isNew = index < 0;
    const item = isNew ? spec.blank() : clone(model[type][index]);

    editing = { type, index };

    const values = spec.toForm(item);
    if (type === 'certificates') values.__items = item.items || [];

    $('#editor-title').textContent = isNew
      ? `Novo ${spec.singular}`
      : `Editar ${spec.singular}`;
    $('#editor-error').textContent = '';

    const body = $('#editor-fields');
    const parts = spec.fields().map((field) => buildField(field, values));

    if (spec.github) parts.unshift(buildGithubImport());

    body.replaceChildren(...parts);
    $('#editor').showModal();
  }

  function closeEditor() {
    $('#editor').close();
    editing = { type: null, index: -1 };
  }

  function saveEditor(event) {
    event.preventDefault();

    const spec = TYPES[editing.type];
    const values = {};

    $$('#editor-fields [data-field]').forEach((control) => {
      values[control.dataset.field] = control.type === 'checkbox' ? control.checked : control.value.trim();
    });

    const repeated = spec.key === 'certificates' ? readRepeat() : [];
    const error = $('#editor-error');

    // --- validação ---
    const missing = spec
      .fields()
      .filter((field) => field.required !== false && field.type !== 'repeat' && field.type !== 'checkbox')
      .find((field) => {
        const key = field.bilingual ? `${field.name}.pt` : field.name;
        return !values[key];
      });

    if (missing) {
      error.textContent = `Preencha “${missing.label}”${missing.bilingual ? ' em português' : ''}.`;
      return;
    }

    values.id = slug(values.id);

    if (!values.id) {
      error.textContent = 'O identificador não pode ficar vazio.';
      return;
    }

    const clash = (model[spec.key] || []).some(
      (other, position) => other.id === values.id && position !== editing.index
    );

    if (clash) {
      error.textContent = `Já existe um item com o identificador “${values.id}”.`;
      return;
    }

    const custom = spec.validate ? spec.validate(values, repeated) : '';

    if (custom) {
      error.textContent = custom;
      return;
    }

    // --- grava ---
    const item = spec.fromForm(values, repeated);

    if (editing.index < 0) {
      model[spec.key].push(item);
    } else {
      model[spec.key][editing.index] = item;
    }

    markDirty();
    renderPanels();
    closeEditor();
  }

  /* ==========================================================
     06. IMPORTAÇÃO A PARTIR DO GITHUB
  ========================================================== */

  /** Tópicos do GitHub vêm em minúsculas; alguns merecem grafia própria. */
  const TECH_NAMES = {
    php: 'PHP', postgresql: 'PostgreSQL', mysql: 'MySQL', javascript: 'JavaScript',
    typescript: 'TypeScript', html: 'HTML', css: 'CSS', nodejs: 'Node.js', node: 'Node.js',
    cli: 'CLI', dart: 'Dart', flutter: 'Flutter', mobile: 'Mobile', laravel: 'Laravel',
    ejs: 'EJS', mongodb: 'MongoDB', express: 'Express', react: 'React',
    'react-native': 'React Native', expo: 'Expo', angular: 'Angular', java: 'Java',
    ecommerce: 'E-commerce', tcc: 'TCC', a11y: 'A11y', responsive: 'Responsivo',
    'github-pages': 'GitHub Pages', automation: 'Automação', email: 'E-mail',
    'no-dependencies': 'Zero-deps', portfolio: 'Portfólio', webpack: 'Webpack',
  };

  const prettyTech = (name) =>
    TECH_NAMES[name] || name.charAt(0).toUpperCase() + name.slice(1);

  function buildGithubImport() {
    const field = make('input', {
      className: 'field__input',
      attrs: { type: 'text', list: 'gh-repos', id: 'gh-repo', placeholder: 'nome-do-repositório' },
    });

    const datalist = make('datalist', { attrs: { id: 'gh-repos' } });
    const status = make('p', { className: 'gh-import__status', attrs: { id: 'gh-status' } });

    const button = make('button', {
      className: 'btn btn--ghost btn--sm',
      text: 'Preencher',
      attrs: { type: 'button' },
    });

    const fillOptions = () => {
      const taken = new Set(
        (model.projects || []).flatMap((project) =>
          (project.links || []).map((link) => link.url.replace(/\/+$/, '').split('/').pop().toLowerCase())
        )
      );

      datalist.replaceChildren(
        ...(repos || []).map((repo) =>
          make('option', {
            attrs: { value: repo.name },
            text: taken.has(repo.name.toLowerCase()) ? 'já está no portfólio' : repo.description || '',
          })
        )
      );

      status.textContent = `${(repos || []).length} repositórios carregados.`;
    };

    const load = () => {
      if (repos) return Promise.resolve(fillOptions());

      status.textContent = 'Buscando repositórios…';

      return fetch(`https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=updated`)
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then((data) => {
          repos = data.filter((repo) => !repo.fork);
          fillOptions();
        })
        .catch(() => {
          status.textContent = 'Não consegui falar com a API do GitHub. Preencha à mão.';
        });
    };

    button.addEventListener('click', () => {
      const wanted = field.value.trim().toLowerCase();
      const repo = (repos || []).find((candidate) => candidate.name.toLowerCase() === wanted);

      if (!repo) {
        status.textContent = 'Repositório não encontrado na lista.';
        return;
      }

      const set = (name, value) => {
        const control = $(`#editor-fields [data-field="${name}"]`);
        if (control) control.value = value;
      };

      const tags = [repo.language, ...(repo.topics || [])]
        .filter(Boolean)
        .map((tech) => prettyTech(String(tech).toLowerCase()));

      set('id', slug(repo.name));
      set('title.pt', repo.name);
      set('title.en', repo.name);
      set('desc.pt', repo.description || '');
      set('tags', [...new Set(tags)].join(', '));
      set('repoUrl', repo.html_url);
      set('liveUrl', repo.homepage || '');

      status.textContent = `“${repo.name}” carregado. Revise a descrição e escreva a versão em inglês.`;
    });

    load();

    return make('div', {
      className: 'gh-import',
      children: [
        make('span', { className: 'field__label', text: 'Importar do GitHub' }),
        make('span', {
          className: 'field__hint',
          text: 'Traz nome, descrição, linguagem, tópicos e URLs do repositório. O texto em inglês continua por sua conta.',
        }),
        make('div', { className: 'gh-import__row', children: [field, button] }),
        datalist,
        status,
      ],
    });
  }

  /* ==========================================================
     07. ABRIR E BAIXAR JSON
  ========================================================== */

  function exportJson() {
    model.updatedAt = new Date().toISOString().slice(0, 10);

    const text = `${JSON.stringify(model, null, 2)}\n`;
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = make('a', { attrs: { href: url, download: 'content.json' } });

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showDone();
  }

  function showDone() {
    const existing = $('.admin-done');
    if (existing) existing.remove();

    const note = make('p', {
      className: 'admin-done',
      children: [
        make('strong', { text: 'Arquivo baixado. ' }),
        make('span', { text: 'Substitua ' }),
        make('code', { text: 'assets/data/content.json' }),
        make('span', { text: ' pelo arquivo novo, confira o site e faça o commit.' }),
      ],
    });

    $('#main').appendChild(note);
  }

  function importJson(file) {
    file
      .text()
      .then((text) => {
        const data = JSON.parse(text);
        const errors = validate(data);

        if (errors.length) throw new Error(errors.slice(0, 3).join('; '));

        model = normalize(data);
        dirty = true;
        storage.set(DRAFT_KEY, JSON.stringify(model));
        renderState();
        renderTabs();
        renderPanels();
      })
      .catch((error) => {
        const state = $('#state');
        state.textContent = `JSON inválido: ${error.message}`;
        state.dataset.tone = 'error';
      });
  }

  function discardDraft() {
    if (!window.confirm('Descartar o rascunho e voltar ao conteúdo publicado?')) return;

    storage.remove(DRAFT_KEY);
    window.location.reload();
  }

  /* ==========================================================
     08. INÍCIO
  ========================================================== */

  function initTheme() {
    const toggle = $('#theme-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';

      document.documentElement.dataset.theme = next;
      storage.set('theme', next);
    });
  }

  function wire() {
    $('#editor-form').addEventListener('submit', saveEditor);
    $('#editor-close').addEventListener('click', closeEditor);
    $('#editor-cancel').addEventListener('click', closeEditor);
    $('#export-btn').addEventListener('click', exportJson);
    $('#discard-btn').addEventListener('click', discardDraft);

    $('#import-btn').addEventListener('click', () => $('#import-file').click());
    $('#import-file').addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) importJson(file);
      event.target.value = '';
    });
  }

  function start(data, fromDraft) {
    model = normalize(data);
    dirty = Boolean(fromDraft);

    renderState();
    renderTabs();
    renderPanels();
    wire();
  }

  initTheme();

  const draft = storage.get(DRAFT_KEY);

  if (draft) {
    try {
      start(JSON.parse(draft), true);
    } catch (error) {
      storage.remove(DRAFT_KEY);
    }
  }

  if (!model) {
    fetch(SOURCE, { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => start(data, false))
      .catch((error) => {
        const state = $('#state');
        state.textContent = `não consegui ler ${SOURCE} (${error.message}) — use “Abrir JSON”`;
        state.dataset.tone = 'error';
        start({ categories: [], projects: [], experience: [], education: [], certificates: [] }, false);
      });
  }
})();
