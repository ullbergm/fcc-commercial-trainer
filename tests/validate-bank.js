#!/usr/bin/env node
/* Validates data/questions.js (schema, unique ids, answer bounds, page format)
 * and checks that the test shell's nav matches index.html. */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'data', 'questions.js'), 'utf8');
eval(src.replace('const QUESTION_BANK', 'globalThis.QUESTION_BANK'));
const pagesSrc = fs.readFileSync(path.join(__dirname, '..', 'data', 'manual-pages.js'), 'utf8');
eval(pagesSrc.replace('const MANUAL_PAGES', 'globalThis.MANUAL_PAGES'));
const cfgSrc = fs.readFileSync(path.join(__dirname, '..', 'data', 'exam-config.js'), 'utf8');
eval(cfgSrc.replace('const EXAM_CONFIG', 'globalThis.EXAM_CONFIG'));

// A PDF ends a few pages past the last labelled one (back matter), so allow
// a little slack above the highest mapped page when bounding pdfPage.
const lastPage = {};
for (const [key, m] of Object.entries(EXAM_CONFIG.manuals)) {
  if (m.pages) lastPage[key] = Math.max(...Object.values(m.pages)) + 5;
}

const errors = [];
const ids = new Set();
const questionTexts = new Map();
const positions = [0, 0, 0, 0];
const norm = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();

for (const q of QUESTION_BANK) {
  const label = q.id || '(missing id)';
  // Explanations are optional for an exam whose questions come verbatim from
  // a published pool with nothing further to say; the config opts out.
  const required = ['id', 'section', 'sectionName', 'question', 'choices', 'answer'];
  if (EXAM_CONFIG.requireExplanations !== false) required.push('explanation');
  for (const field of required) {
    if (q[field] === undefined || q[field] === '') errors.push(`${label}: missing ${field}`);
  }
  if (ids.has(q.id)) errors.push(`${label}: duplicate id`);
  ids.add(q.id);
  // The FCC pools repeat a stem with different choices (within a pool and
  // across elements), and Element 7R repeats Element 7 questions verbatim,
  // so only a full match within one section is an error.
  const qn = norm(q.section + ' :: ' + q.question + ' :: ' + (Array.isArray(q.choices) ? q.choices.join(' | ') : ''));
  if (questionTexts.has(qn)) errors.push(`${label}: duplicate question (also ${questionTexts.get(qn)})`);
  questionTexts.set(qn, q.id);
  if (!Array.isArray(q.choices) || q.choices.length !== 4) errors.push(`${label}: needs exactly 4 choices`);
  // Two pool questions repeat a choice in the published PDFs themselves
  // (6A251 prints A twice, 9-23C1 prints B twice); the bank reproduces the
  // pools verbatim, so those two are not authoring accidents.
  else if (new Set(q.choices.map(norm)).size !== 4
      && !['6A251', '9-23C1'].includes(q.id)) errors.push(`${label}: duplicate choices`);
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) errors.push(`${label}: answer out of range`);
  if (!Number.isInteger(q.section) || q.section < 1) errors.push(`${label}: bad section`);
  // Citations are optional (an exam may have nothing citable) unless the
  // config demands them, but a question that carries one must resolve
  // cleanly through the config either way.
  const mkey = q.manual || 'default';
  const manual = EXAM_CONFIG.manuals[mkey];
  if (q.manual !== undefined && !manual) errors.push(`${label}: unknown manual "${q.manual}"`);
  if (EXAM_CONFIG.requireCitations && q.page === undefined) errors.push(`${label}: missing page`);
  if (q.page !== undefined) {
    if (typeof q.page !== 'string' || !q.page.trim()) errors.push(`${label}: bad page "${q.page}"`);
    else if (q.page && !manual) errors.push(`${label}: cites a page but the config lists no "${mkey}" manual`);
    // Without a mapping the citation cannot deep link into the PDF, so it
    // would silently fall back to plain text.
    else if (manual.url && manual.pages && !manual.pages[q.page] && q.pdfPage === undefined) {
      errors.push(`${label}: page "${q.page}" is not in the "${mkey}" manual's pages map`);
    }
  }
  if (q.pdfPage !== undefined && (!Number.isInteger(q.pdfPage) || q.pdfPage < 1
      || (lastPage[mkey] && q.pdfPage > lastPage[mkey]))) {
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
// Counts well under the bank size (per-exam question counts and the like)
// are ignored; the cap keeps that working for a fork with a small bank.
const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
const readmeCounts = [...readme.matchAll(/\b(\d+) (?:multiple-choice )?questions\b/g)]
  .map(m => Number(m[1]))
  .filter(n => n >= Math.min(100, QUESTION_BANK.length));
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
