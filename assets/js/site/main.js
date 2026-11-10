/* ============================================================
   site/main.js — ponto de entrada do index.html

   Liga idioma, tema, menu, reveal, filtros e contadores. O
   conteúdo do JSON vem de content/render.js e o formulário de
   site/contact.js.
============================================================ */

// render.js vem antes do lang.js de propósito: ele precisa se inscrever
// em onChange antes deste arquivo (ver restoreDynamicContent).
import { ready } from '../content/render.js';
import { stats } from '../content/model.js';
import { t, setLang as changeLang, onChange, getLang, LANGUAGES } from '../lang/lang.js';
import { $, $$, storage } from '../lib/dom.js';
import { initContactForm } from './contact.js';

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const LANG_KEY = 'lang';
  /* Números dos data-stat. Os do content.json vêm de stats(); stack e contato não estão no JSON. */
  let counts = {};
  let contentReady = false;

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

    document.documentElement.lang = LANGUAGES[getLang()].htmlLang;
  }

  function initI18n() {
    const initial = resolveLang();

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

      const checked = options.find((option) => option.dataset.lang === getLang());
      (checked || options[0]).focus();
    };

    const setLang = (lang, userChoice) => {
      if (!LANGUAGES[lang]) return;

      // Os inscritos em onChange remontam o conteúdo e retraduzem a página.
      changeLang(lang);

      options.forEach((option) => {
        option.setAttribute('aria-checked', String(option.dataset.lang === lang));
      });

      if (code) code.textContent = LANGUAGES[lang].short;
      if (toggle) toggle.setAttribute('aria-label', `${t('a11y.lang')}: ${LANGUAGES[lang].native}`);

      if (!userChoice) return;

      storage.set(LANG_KEY, lang);
      if (liveStatus) liveStatus.textContent = t('lang.changed');
    };

    setLang(initial, false);

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

      // O sheet cobre a tela: o teclado e o leitor de tela não devem alcançar o que está atrás.
      $$('#conteudo, .site-footer').forEach((el) => {
        el.inert = open;
      });
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
    // carregamento e outra quando o render.js monta os cards do JSON.
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

  /* Fica aqui, e não nos botões, porque o render.js remonta os botões na troca de idioma. */
  let activeFilter = 'all';

  /** Marca o botão do filtro ativo e esconde os cards de fora. `animate` só no clique. */
  function applyFilter(animate) {
    $$('#filters .filter').forEach((button) => {
      const isCurrent = button.dataset.filter === activeFilter;
      button.classList.toggle('is-active', isCurrent);
      button.setAttribute('aria-selected', String(isCurrent));
      // Roving tabindex: só a aba ativa entra na ordem do Tab; as setas cuidam do resto.
      button.tabIndex = isCurrent ? 0 : -1;
    });

    const panel = $('#projects');
    if (panel && $('#filters .filter')) {
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', `filter-${activeFilter}`);
    }

    $$('#projects .project').forEach((project) => {
      const matches = activeFilter === 'all' || project.dataset.category === activeFilter;
      project.classList.toggle('is-hidden', !matches);

      if (!matches || !animate) return;

      project.classList.add('is-visible');

      if (prefersReducedMotion) return;

      project.classList.remove('is-entering');
      void project.offsetWidth;
      project.classList.add('is-entering');
    });
  }

  function initProjectFilters() {
    const filterBar = $('#filters');
    if (!filterBar || !$$('#projects .project').length) return;

    filterBar.hidden = false;

    filterBar.addEventListener('click', (event) => {
      const button = event.target.closest('.filter');
      if (!button) return;

      activeFilter = button.dataset.filter;
      applyFilter(true);
    });

    // Padrão de tablist do ARIA: setas trocam de aba, Home/End vão para as pontas.
    filterBar.addEventListener('keydown', (event) => {
      const buttons = $$('.filter', filterBar);
      const index = buttons.indexOf(document.activeElement);
      if (index < 0) return;

      const moves = {
        ArrowRight: (index + 1) % buttons.length,
        ArrowLeft: (index - 1 + buttons.length) % buttons.length,
        Home: 0,
        End: buttons.length - 1,
      };
      if (!(event.key in moves)) return;

      event.preventDefault();
      const next = buttons[moves[event.key]];
      activeFilter = next.dataset.filter;
      applyFilter(true);
      next.focus();
    });

    applyFilter(false);
  }

  /** Depois que o render.js remonta as seções num novo idioma: nada pisca e o filtro continua. */
  function restoreDynamicContent() {
    $$('.reveal').forEach((item) => {
      if (item.dataset.revealBound) return;

      item.dataset.revealBound = '1';
      item.classList.add('is-visible');
    });

    applyFilter(false);
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
    funcionem sem depender de rede. A segunda espera o render.js montar
    projetos, experiência, formação e certificados a partir do JSON — só aí
    faz sentido traduzir esses nós, contá-los e ligar os filtros.
  */
  initReveal();
  onChange(() => {
    applyTranslations();
    // Antes do JSON chegar não há o que restaurar; o initDynamicContent cuida da primeira vez.
    if (contentReady) restoreDynamicContent();
  });
  initI18n();
  initTheme();
  initMobileMenu();
  initHeaderScroll();
  initContactForm();
  initContrast();
  initYear();

  function initDynamicContent(data) {
    contentReady = true;

    counts = Object.assign(stats(data), {
      stack: $$('#stack .tag__icon').length,
      contact: $$('.contact__aside .contact__item').length,
    });

    applyTranslations();
    initReveal();
    initScrollSpy();
    initProjectFilters();
  }

  // O segundo argumento cobre a falha: mesmo sem o JSON, o resto liga.
  ready.then(initDynamicContent, () => initDynamicContent(null));
})();
