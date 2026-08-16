#!/usr/bin/env node
/* Validates data/questions.js (schema, unique ids, answer bounds, page format)
 * and checks that the test shell's nav matches index.html. */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'data', 'questions.js'), 'utf8');
eval(src.replace('const QUESTION_BANK', 'globalThis.QUESTION_BANK'));
const pagesSrc = fs.readFileSync(path.join(__dirname, '..', 'data', 'manual-pages.js'), 'utf8');
eval(pagesSrc.replace('const MANUAL_PAGES', 'globalThis.MANUAL_PAGES'));

// The PDF ends a few pages past the last labelled one (back matter), so allow
// a little slack above the highest mapped page.
const MANUAL_LAST_PAGE = Math.max(...Object.values(MANUAL_PAGES)) + 5;

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
  // Without a mapping the citation cannot deep link into the PDF, so it would
  // silently fall back to plain text.
  else if (!MANUAL_PAGES[q.page]) errors.push(`${label}: page "${q.page}" is not in data/manual-pages.js`);
  if (q.pdfPage !== undefined && (!Number.isInteger(q.pdfPage) || q.pdfPage < 1 || q.pdfPage > MANUAL_LAST_PAGE)) {
    errors.push(`${label}: bad pdfPage "${q.pdfPage}"`);
  }
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

// sw.js precaches CORE with cache.addAll, which is all-or-nothing: one bad
// path and the new worker never installs, silently killing offline support
// and update toasts on the live site. Every entry must exist in the repo (or
// be generated at deploy time) and be covered by the release staging step.
const root = path.join(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const coreSrc = (sw.match(/const CORE = \[([\s\S]*?)\];/) || ['', ''])[1];
const core = [...coreSrc.matchAll(/'([^']+)'/g)].map(m => m[1]);
if (core.length < 5) errors.push('sw.js: could not parse the CORE precache list');
const release = fs.readFileSync(path.join(root, '.github', 'workflows', 'release.yml'), 'utf8');
const staged = ((release.match(/cp -r (.+) dist\//) || ['', ''])[1]).split(/\s+/);
for (const entry of core) {
  const p = entry === './' ? 'index.html' : entry;
  const generatedAtDeploy = release.includes(`dist/${p}`);
  if (!fs.existsSync(path.join(root, p)) && !generatedAtDeploy) {
    errors.push(`sw.js CORE entry "${entry}" does not exist and is not generated at deploy`);
  }
  if (!staged.includes(p.split('/')[0]) && !generatedAtDeploy) {
    errors.push(`sw.js CORE entry "${entry}" is not staged by release.yml`);
  }
}

// README states the bank size in prose; fail when it drifts from the bank.
// Counts under 100 (per-exam question counts and the like) are ignored.
const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
const readmeCounts = [...readme.matchAll(/\b(\d+) (?:multiple-choice )?questions\b/g)]
  .map(m => Number(m[1]))
  .filter(n => n >= 100);
if (!readmeCounts.length) {
  errors.push('README no longer states the bank size (expected "N questions" somewhere)');
}
readmeCounts.filter(n => n !== QUESTION_BANK.length).forEach(n =>
  errors.push(`README says ${n} questions but the bank has ${QUESTION_BANK.length}`));

// Answer-length tell: if the correct choice is disproportionately often the
// longest (or shortest) option, test-savvy users can score without knowing the
// material. Chance for either is ~25%; warn well before it becomes a pattern.
let longestCorrect = 0, shortestCorrect = 0;
for (const q of QUESTION_BANK) {
  if (!Array.isArray(q.choices) || q.choices.length !== 4) continue;
  const lens = q.choices.map(c => String(c).length);
  const others = lens.filter((_, i) => i !== q.answer);
  if (lens[q.answer] > Math.max(...others)) longestCorrect++;
  if (lens[q.answer] < Math.min(...others)) shortestCorrect++;
}
const pct = n => Math.round((n / QUESTION_BANK.length) * 100);
console.log(`${QUESTION_BANK.length} questions, answer positions ${positions.join('/')}`);
console.log(`answer-length: correct is uniquely longest in ${pct(longestCorrect)}%, uniquely shortest in ${pct(shortestCorrect)}% (chance ~25%)`);
if (pct(longestCorrect) > 35) {
  console.warn('WARN correct answers skew long; "pick the longest" beats chance. Rebalance before it grows.');
}
if (errors.length) {
  errors.forEach(e => console.error('ERROR ' + e));
  process.exit(1);
}
console.log('question bank and test shell OK');
