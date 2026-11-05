/* ============================================================
   contact.js — formulário de contato

   Valida no blur, envia pelo Web3Forms e, se falhar, abre o
   aplicativo de e-mail (mailto) com a mensagem já preenchida.
============================================================ */

import { $, $$ } from '../lib/dom.js';
import { t } from '../lang/lang.js';

export function initContactForm() {
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
