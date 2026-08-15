#!/usr/bin/env node
/* Validates data/questions.js (schema, unique ids, answer bounds, page format)
 * and checks that the test shell's nav matches index.html. */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'data', 'questions.js'), 'utf8');
eval(src.replace('const QUESTION_BANK', 'globalThis.QUESTION_BANK'));

const errors = [];
const ids = new Set();
const questionTexts = new Map();
const positions = [0, 0, 0, 0];
const norm = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();

for (const q of QUESTION_BANK) {
  const label = q.id || '(missing id)';
  for (const field of ['id', 'section', 'sectionName', 'question', 'choices', 'answer', 'explanation', 'page']) {
    if (q[field] === undefined || q[field] === '') errors.push(`${label}: missing ${field}`);
  }
  if (ids.has(q.id)) errors.push(`${label}: duplicate id`);
  ids.add(q.id);
  const qn = norm(q.question);
  if (questionTexts.has(qn)) errors.push(`${label}: duplicate question text (also ${questionTexts.get(qn)})`);
  questionTexts.set(qn, q.id);
  if (!Array.isArray(q.choices) || q.choices.length !== 4) errors.push(`${label}: needs exactly 4 choices`);
  else if (new Set(q.choices.map(norm)).size !== 4) errors.push(`${label}: duplicate choices`);
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) errors.push(`${label}: answer out of range`);
  if (!Number.isInteger(q.section) || q.section < 1 || q.section > 13) errors.push(`${label}: bad section`);
  if (typeof q.page !== 'string' || !/^\d+-\d+$/.test(q.page)) errors.push(`${label}: bad page "${q.page}"`);
  if (Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3) positions[q.answer]++;
}

// tests/test.html duplicates the app shell's nav markup; the e2e suite drives
// the app through it, so fail loudly if the two ever drift apart.
const navViews = file => {
  const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const nav = (html.match(/<nav[\s\S]*?<\/nav>/) || [''])[0];
  return [...nav.matchAll(/data-view="([^"]+)"/g)].map(m => m[1]).join(',');
};
const appNav = navViews('index.html');
const testNav = navViews('tests/test.html');
if (!appNav || appNav !== testNav) {
  errors.push(`nav drift: index.html has [${appNav}] but tests/test.html has [${testNav}]`);
}

console.log(`${QUESTION_BANK.length} questions, answer positions ${positions.join('/')}`);
if (errors.length) {
  errors.forEach(e => console.error('ERROR ' + e));
  process.exit(1);
}
console.log('question bank and test shell OK');
