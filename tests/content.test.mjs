import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalize, validate, stats } from '../assets/js/content/model.js';

const real = JSON.parse(readFileSync(new URL('../assets/data/content.json', import.meta.url), 'utf8'));

const fixture = {
  version: 1,
  categories: [{ id: 'web', label: { pt: 'Web', en: 'Web' } }],
  projects: [
    { id: 'a', title: { pt: 'A' }, desc: { pt: 'a' }, category: 'web', links: [{ type: 'code', url: 'https://x' }] },
    { id: 'b', title: { pt: 'B' }, desc: { pt: 'b' }, category: 'web', links: [{ type: 'live', url: 'https://y' }] },
  ],
  experience: [{ id: 'e1', period: { pt: '2024' }, role: { pt: 'Dev' }, org: { pt: 'X' } }],
  education: [],
  certificates: [
    {
      id: 'g',
      name: { pt: 'G' },
      items: [
        { title: 'c1', url: 'https://c1', hours: 10 },
        { title: 'c2', url: 'https://c2', hours: '6' },
        { title: 'c3', url: 'https://c3', hours: 40, wip: true },
      ],
    },
  ],
};

test('content.json real é válido', () => {
  assert.deepEqual(validate(real), []);
  assert.equal(real.version, 1);
});

test('normalize não altera o content.json real', () => {
  assert.deepEqual(normalize(real), real);
});

test('stats conta a fixture e ignora certificados wip', () => {
  assert.deepEqual(stats(fixture), { projects: 2, companies: 1, education: 0, courses: 2, hours: 16 });
});

test('stats aguenta conteúdo vazio', () => {
  assert.deepEqual(stats({}), { projects: 0, companies: 0, education: 0, courses: 0, hours: 0 });
});

test('validate aponta listas faltando, id repetido e categoria desconhecida', () => {
  const bad = structuredClone(fixture);
  delete bad.education;
  bad.projects[1].id = 'a';
  bad.projects[0].category = 'nope';

  const errors = validate(bad).join('\n');
  assert.match(errors, /faltam as listas: education/);
  assert.match(errors, /id repetido “a”/);
  assert.match(errors, /categoria desconhecida “nope”/);
});

test('validate recusa o que não é objeto', () => {
  assert.equal(validate(null).length, 1);
  assert.equal(validate([]).length, 1);
});
