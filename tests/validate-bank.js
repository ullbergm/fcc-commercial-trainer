#!/usr/bin/env node
/* Validates data/questions.js: schema, unique ids, answer bounds, page format. */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'data', 'questions.js'), 'utf8');
eval(src.replace('const QUESTION_BANK', 'globalThis.QUESTION_BANK'));

const errors = [];
const ids = new Set();
const positions = [0, 0, 0, 0];

for (const q of QUESTION_BANK) {
  const label = q.id || '(missing id)';
  for (const field of ['id', 'section', 'sectionName', 'question', 'choices', 'answer', 'explanation', 'page']) {
    if (q[field] === undefined || q[field] === '') errors.push(`${label}: missing ${field}`);
  }
  if (ids.has(q.id)) errors.push(`${label}: duplicate id`);
  ids.add(q.id);
  if (!Array.isArray(q.choices) || q.choices.length !== 4) errors.push(`${label}: needs exactly 4 choices`);
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) errors.push(`${label}: answer out of range`);
  if (!Number.isInteger(q.section) || q.section < 1 || q.section > 13) errors.push(`${label}: bad section`);
  if (typeof q.page !== 'string' || !/^\d+-\d+$/.test(q.page)) errors.push(`${label}: bad page "${q.page}"`);
  if (Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3) positions[q.answer]++;
}

console.log(`${QUESTION_BANK.length} questions, answer positions ${positions.join('/')}`);
if (errors.length) {
  errors.forEach(e => console.error('ERROR ' + e));
  process.exit(1);
}
console.log('question bank OK');
