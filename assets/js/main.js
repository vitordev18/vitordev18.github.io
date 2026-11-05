(function () {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
        return;
      }
    },
  };

  const LANG_KEY = 'lang';
  const DEFAULT_LANG = 'pt';

  const LANGUAGES = {
    pt: { htmlLang: 'pt-BR', short: 'PT', native: 'Português' },
    en: { htmlLang: 'en', short: 'EN', native: 'English' },
  };

  const I18N = window.I18N || { pt: {}, en: {} };

  /*
    Valores que envelhecem sozinhos. Ficam como {age} e {years} dentro das
    strings do i18n.js e são calculados a cada carregamento da página, para
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

  let currentLang = DEFAULT_LANG;

  /* Números dos data-stat. Os do content.json vêm de stats(); stack e contato não estão no JSON. */
  let counts = {};

  const t = (key) => {
    const dict = I18N[currentLang] || I18N[DEFAULT_LANG];
    const value = dict[key] !== undefined ? dict[key] : I18N[DEFAULT_LANG][key];

    return fillTokens(value !== undefined ? value : key);
  };

  const resolveLang = () => {
    const saved = storage.get(LANG_KEY);
    if (LANGUAGES[saved]) return saved;

    return (navigator.language || '').toLowerCase().indexOf('pt') === 0 ? 'pt' : 'en';
  };

  function applyTranslations() {
    $$('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });

    $$('[data-stat]').forEach((el) => {
      el.textContent = t(el.dataset.i18n)
        .replace('{n}', String(counts[el.dataset.stat] || 0))
        .replace('{h}', String(counts.hours || 0));
    });

    $$('[data-i18n-html]').forEach((el) => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });

    $$('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(';').forEach((pair) => {
        const [attr, key] = pair.split(':').map((part) => part.trim());
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });

    document.documentElement.lang = LANGUAGES[currentLang].htmlLang;
  }

  function initI18n() {
    if (!Object.keys(I18N[DEFAULT_LANG]).length) return;

    currentLang = resolveLang();

    const root = $('#lang');
    const toggle = $('#lang-toggle');
    const menu = $('#lang-menu');
    const code = $('#lang-code');
    const liveStatus = $('#lang-status');
    const options = menu ? $$('.lang__option', menu) : [];

    const setMenuOpen = (open) => {
      if (!menu || !toggle) return;

      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));

      if (!open) return;

      const checked = options.find((option) => option.dataset.lang === currentLang);
      (checked || options[0]).focus();
    };

    const setLang = (lang, userChoice) => {
      if (!LANGUAGES[lang]) return;

      currentLang = lang;
      applyTranslations();

      options.forEach((option) => {
        option.setAttribute('aria-checked', String(option.dataset.lang === lang));
      });

      if (code) code.textContent = LANGUAGES[lang].short;
      if (toggle) toggle.setAttribute('aria-label', `${t('a11y.lang')}: ${LANGUAGES[lang].native}`);

      if (!userChoice) return;

      storage.set(LANG_KEY, lang);
      if (liveStatus) liveStatus.textContent = t('lang.changed');
    };

    setLang(currentLang, false);

    if (!root || !toggle || !menu) return;

    toggle.addEventListener('click', () => {
      setMenuOpen(menu.hidden);
    });

    toggle.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

      event.preventDefault();
      setMenuOpen(true);
    });

    options.forEach((option) => {
      option.addEventListener('click', () => {
        setLang(option.dataset.lang, true);
        setMenuOpen(false);
        toggle.focus();
      });
    });

    menu.addEventListener('keydown', (event) => {
      const index = options.indexOf(document.activeElement);

      if (event.key === 'Escape') {
        setMenuOpen(false);
        toggle.focus();
        return;
      }

      if (event.key === 'Tab') {
        setMenuOpen(false);
        toggle.focus();
        return;
      }

      const moves = {
        ArrowDown: (index + 1) % options.length,
        ArrowUp: (index - 1 + options.length) % options.length,
        Home: 0,
        End: options.length - 1,
      };

      if (!(event.key in moves) || index < 0) return;

      event.preventDefault();
      options[moves[event.key]].focus();
    });

    document.addEventListener('click', (event) => {
      if (!menu.hidden && !root.contains(event.target)) setMenuOpen(false);
    });
  }

  function initTheme() {
    const toggle = $('#theme-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme;
      const next = current === 'dark' ? 'light' : 'dark';

      document.documentElement.dataset.theme = next;
      storage.set('theme', next);
    });
  }

  function initMobileMenu() {
    const toggle = $('#menu-toggle');
    const nav = $('#nav');
    if (!toggle || !nav) return;

    const setOpen = (open) => {
      const labelKey = open ? 'a11y.menuClose' : 'a11y.menuOpen';

      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.dataset.i18nAttr = `aria-label:${labelKey}`;
      toggle.setAttribute('aria-label', t(labelKey));
      document.body.style.overflow = open ? 'hidden' : '';
    };

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    $$('.nav__link', nav).forEach((link) => {
      link.addEventListener('click', () => setOpen(false));
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', (event) => {
      const clickedOutside = !nav.contains(event.target) && !toggle.contains(event.target);
      if (nav.classList.contains('is-open') && clickedOutside) setOpen(false);
    });

    window.matchMedia('(min-width: 901px)').addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  function initHeaderScroll() {
    const header = $('#header');
    if (!header) return;

    const update = () => header.classList.toggle('is-scrolled', window.scrollY > 8);

    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  function initScrollSpy() {
    const links = $$('.nav__link');
    const sections = links
      .map((link) => $(link.getAttribute('href')))
      .filter(Boolean);

    if (!sections.length) return;

    const setActive = (id) => {
      links.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (visible) setActive(visible.target.id);
      },
      {
        rootMargin: '-35% 0px -55% 0px',
        threshold: 0,
      }
    );

    sections.forEach((section) => observer.observe(section));
  }

  function initReveal() {
    // Marca o que já foi observado: a função roda duas vezes, uma no
    // carregamento e outra quando o content.js monta os cards do JSON.
    const items = $$('.reveal').filter((item) => !item.dataset.revealBound);
    if (!items.length) return;

    items.forEach((item) => {
      item.dataset.revealBound = '1';
    });

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const siblings = Array.from(entry.target.parentElement.children);
          const delay = Math.min(siblings.indexOf(entry.target), 4) * 80;

          setTimeout(() => entry.target.classList.add('is-visible'), delay);
          obs.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0 }
    );

    items.forEach((item) => observer.observe(item));

    let scheduled = false;

    const sweep = () => {
      scheduled = false;

      const pending = items.filter((item) => !item.classList.contains('is-visible'));

      pending.forEach((item) => {
        if (item.getBoundingClientRect().top >= window.innerHeight) return;

        observer.unobserve(item);
        item.classList.add('is-visible');
      });

      if (!pending.length) window.removeEventListener('scroll', schedule);
    };

    const schedule = () => {
      if (scheduled) return;

      scheduled = true;
      requestAnimationFrame(sweep);
    };

    window.addEventListener('scroll', schedule, { passive: true });
  }

  function initProjectFilters() {
    const filterBar = $('#filters');
    const projects = $$('#projects .project');
    if (!filterBar || !projects.length) return;

    filterBar.hidden = false;

    const buttons = $$('.filter', filterBar);

    const applyFilter = (category) => {
      projects.forEach((project) => {
        const matches = category === 'all' || project.dataset.category === category;
        project.classList.toggle('is-hidden', !matches);

        if (!matches) return;

        project.classList.add('is-visible');

        if (prefersReducedMotion) return;

        project.classList.remove('is-entering');
        void project.offsetWidth;
        project.classList.add('is-entering');
      });
    };

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        buttons.forEach((other) => {
          const isCurrent = other === button;
          other.classList.toggle('is-active', isCurrent);
          other.setAttribute('aria-selected', String(isCurrent));
        });

        applyFilter(button.dataset.filter);
      });
    });
  }

  function initContactForm() {
    const form = $('#contact-form');
    const status = $('#form-status');
    if (!form || !status) return;

    const DESTINATARIO = 'vrferreiraz18@gmail.com';
    const submitBtn = $('button[type="submit"]', form);

    const rules = {
      nome: (value) => (value.trim().length >= 2 ? '' : 'form.error.name'),
      email: (value) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? '' : 'form.error.email',
      mensagem: (value) =>
        value.trim().length >= 10 ? '' : 'form.error.message',
    };

    const setMessage = (el, key) => {
      if (key) {
        el.dataset.i18n = key;
        el.textContent = t(key);
        return;
      }

      delete el.dataset.i18n;
      el.textContent = '';
    };

    const setStatus = (key, kind) => {
      setMessage(status, key);
      status.className = kind ? `form__status ${kind}` : 'form__status';
    };

    const validateField = (field) => {
      const rule = rules[field.name];
      if (!rule) return true;

      const key = rule(field.value);
      const errorEl = $(`[data-error-for="${field.name}"]`, form);

      if (errorEl) setMessage(errorEl, key);
      field.setAttribute('aria-invalid', String(Boolean(key)));

      return !key;
    };

    $$('.field__input', form).forEach((field) => {
      field.addEventListener('blur', () => validateField(field));
      field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      });
    });

    const mailtoUrl = (data) => {
      const assunto = t('form.mail.subject').replace('{name}', data.get('nome'));
      const corpo = `${data.get('mensagem')}\n\n—\n${data.get('nome')}\n${data.get('email')}`;

      return `mailto:${DESTINATARIO}?subject=${encodeURIComponent(assunto)}` +
        `&body=${encodeURIComponent(corpo)}`;
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const fields = $$('.field__input', form);
      const isValid = fields.map(validateField).every(Boolean);

      if (!isValid) {
        setStatus('form.status.invalid', 'is-error');
        fields.find((field) => field.getAttribute('aria-invalid') === 'true')?.focus();
        return;
      }

      const data = new FormData(form);

      if (data.get('botcheck')) {
        setStatus('form.status.sent', 'is-ok');
        form.reset();
        return;
      }

      submitBtn.disabled = true;
      setStatus('form.status.sending');

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: data.get('access_key'),
            from_name: data.get('from_name'),
            subject: t('form.mail.subject').replace('{name}', data.get('nome')),
            replyto: data.get('email'),
            botcheck: '',
            nome: data.get('nome'),
            email: data.get('email'),
            mensagem: data.get('mensagem'),
          }),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.message || response.status);

        setStatus('form.status.sent', 'is-ok');
        form.reset();
      } catch (error) {
        console.error('[contato] falha no envio:', error);
        setStatus('form.status.failed', 'is-error');
        window.location.href = mailtoUrl(data);
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  function initContrast() {
    const ratioEl = $('#spec-ratio');
    const levelEl = $('#spec-level');
    if (!ratioEl || !levelEl) return;

    const channel = (value) => {
      const c = value / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };

    const luminance = (hex) => {
      const n = parseInt(hex.trim().slice(1), 16);

      return 0.2126 * channel((n >> 16) & 255) +
        0.7152 * channel((n >> 8) & 255) +
        0.0722 * channel(n & 255);
    };

    const update = () => {
      const styles = getComputedStyle(document.documentElement);
      const text = luminance(styles.getPropertyValue('--text'));
      const bg = luminance(styles.getPropertyValue('--bg'));
      const ratio = (Math.max(text, bg) + 0.05) / (Math.min(text, bg) + 0.05);

      ratioEl.textContent = `${ratio.toFixed(1)}:1`;
      levelEl.textContent = `· ${ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : '—'}`;
    };

    update();
    new MutationObserver(update).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  }

  function initYear() {
    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  /*
    Inicialização em duas etapas.

    A primeira roda de imediato, para que tema, menu, idioma e formulário
    funcionem sem depender de rede. A segunda espera o content.js montar
    projetos, experiência, formação e certificados a partir do JSON — só aí
    faz sentido traduzir esses nós, contá-los e ligar os filtros.
  */
  initReveal();
  initI18n();
  initTheme();
  initMobileMenu();
  initHeaderScroll();
  initContactForm();
  initContrast();
  initYear();

  function initDynamicContent(data) {
    const content = window.PortfolioContent;

    counts = Object.assign(content && content.stats ? content.stats(data) : {}, {
      stack: $$('#stack .tag__icon').length,
      contact: $$('.contact__aside .contact__item').length,
    });

    applyTranslations();
    initReveal();
    initScrollSpy();
    initProjectFilters();
  }

  const content = window.PortfolioContent;

  // O segundo argumento cobre a falha: mesmo sem o JSON, o resto liga.
  if (content && content.ready) {
    content.ready.then(initDynamicContent, initDynamicContent);
  } else {
    initDynamicContent();
  }
})();
