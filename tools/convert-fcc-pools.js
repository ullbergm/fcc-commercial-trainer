#!/usr/bin/env node
/* Converts the FCC commercial element question pools (pools/el*.txt, extracted
 * from the official pool PDFs with `pdftotext -layout`) into data/questions.js
 * and the per-pool page maps in data/manual-pages.js.
 *
 * The pools are published by the FCC with answer keys, so the questions here
 * are the actual exam pool verbatim, not paraphrases. Each entry keeps its
 * official pool number in its id (prefixed with the element where the pool's
 * own numbering restarts at "1A1") and cites the physical page of the pool
 * PDF it appears on, which the app turns into a #page= deep link.
 *
 * Three source layouts:
 *  - keytopic (Elements 1, 3, 8): "1-1A1 stem" then "A." choices, sometimes
 *    in two columns, with "Answer Key:" lines per key topic.
 *  - gmdss (Elements 7, 7R, 9): "1A1 stem" then "A." choices one per line,
 *    with "Answers:" lines per key topic ("1A1 - A" or "1A1: A").
 *  - el6 (Element 6): the id alone on a line ("6A1"), the answer letter
 *    alone on the next, then the stem and "A.text" choices.
 *
 * Questions whose stem or choices reference a drawing ("Figure 3B1") are
 * skipped, as are the Element 6 entries whose answer text the FCC left
 * blank: the app renders text only and needs four real choices. Skips are
 * printed so the omissions stay visible.
 *
 * pdftotext drops a few glyphs the older PDFs encode in unmapped symbol
 * fonts (pi in Element 3 formulas). tools/pool-fixups.json restores those
 * strings, transcribed by eye from the rendered PDF pages. Run with
 * --list-suspects to print questions that look like they still contain a
 * mangled formula.
 */
const fs = require('fs');
const path = require('path');

const POOLS = [
  {
    key: 'el1', element: '1', section: 1, format: 'keytopic',
    sectionName: 'Basic Radio Law & Operating Practice (Element 1)',
  },
  {
    key: 'el3', element: '3', section: 3, format: 'keytopic',
    sectionName: 'General Radiotelephone (Element 3)',
  },
  {
    key: 'el6', element: '6', section: 6, format: 'el6',
    sectionName: 'Advanced Radiotelegraph (Element 6)',
  },
  {
    key: 'el7', element: '7', section: 7, format: 'gmdss', idPrefix: '7-',
    sectionName: 'GMDSS Radio Operating Practices (Element 7)',
  },
  {
    key: 'el7r', element: '7R', section: 17, format: 'gmdss', idPrefix: '7R-',
    sectionName: 'Restricted GMDSS Operating Practices (Element 7R)',
  },
  {
    key: 'el8', element: '8', section: 8, format: 'keytopic',
    sectionName: 'Ship Radar Techniques (Element 8)',
  },
  {
    key: 'el9', element: '9', section: 9, format: 'gmdss', idPrefix: '9-',
    sectionName: 'GMDSS Radio Maintenance (Element 9)',
  },
];

// id -> { question?, choices? } with the symbol-font glyphs restored.
const FIXUPS = require('./pool-fixups.json');

const FIGURE_RE = /\bFig(?:ure)?s?\.?\s*[0-9]/i;
const BLANK_RE = /left blank by the FCC/i;
// Lines that are page furniture, not question content.
const NOISE_RE = new RegExp([
  /^\s*(19|20)\d\d FCC Commercial Element/.source,
  /^\s*FCC (Commercial )?Element/.source,
  /^\s*SUBELEMENT\b/i.source,
  /^\s*Subelement\b/.source,
  /^\s*Key Topic\b/.source,
  /^\s*Section-[A-Z]\b/.source,
  /^\s*GMDSS-STCW/.source,
  /^\s*FCC . Element-9 GMDSS Maintainer/.source,
  /^\s*Page ?\d+\s*$/.source,
].join('|'));

// Misprinted question numbers in the source PDFs, corrected before parsing.
// Element 9 prints topic 36's fourth question as "34D4", which would both
// collide with the real 34D4 and pick up its answer key; Element 6 prints
// 6A231 as "A6231"; Element 9 also glues 36D1 to its stem.
const TYPOS = {
  el6: [['\nA6231\n', '\n6A231\n']],
  el9: [
    ['\n36D1Which', '\n36D1 Which'],
    ['\n34D4 How can reception of certain NAVTEX broadcasts be prevented?',
      '\n36D4 How can reception of certain NAVTEX broadcasts be prevented?'],
  ],
};

const read = pool => {
  let raw = fs.readFileSync(path.join(__dirname, '..', 'pools', `${pool.key}.txt`), 'utf8');
  for (const [from, to] of TYPOS[pool.key] || []) {
    if (!raw.includes(from)) throw new Error(`${pool.key}: typo fix "${from.trim()}" no longer matches`);
    raw = raw.replace(from, to);
  }
  return raw;
};

// Iterate lines, tracking the physical PDF page via form feeds.
function* pages(raw) {
  let page = 1;
  for (let line of raw.split('\n')) {
    const breaks = (line.match(/\f/g) || []).length;
    if (breaks) { page += breaks; line = line.replace(/\f/g, ''); }
    yield { line, page };
  }
}

/* keytopic and gmdss formats share the loop; they differ in the id pattern
 * and the answer-key spelling. */
function parseListed(pool) {
  const raw = read(pool);
  const idRe = pool.format === 'keytopic'
    ? /^\s*(\d-\d+[A-Z]\d+)\s+(.*)$/
    : /^\s*(\d+[A-Z]\d+)\s+(.*)$/;

  // Answer key: every "1-1A1: A" / "1A1 - A" pair anywhere in the text. Some
  // Element 1 entries lack the separator ("1-10B6 A"), so it is optional;
  // that can also match a question stem that happens to open with a bare
  // A/B/C/D word, but the real key entry always comes later in the file and
  // overwrites it.
  const answers = {};
  const pairRe = pool.format === 'keytopic'
    ? /(\d-\d+[A-Z]\d+)\s*:?\s+([A-D])\b/g
    : /(\d+[A-Z]\d+)\s*[-–:]\s*([A-D])\b/g;
  for (const m of raw.matchAll(pairRe)) answers[m[1]] = 'ABCD'.indexOf(m[2]);
  // One Element 3 key line drops the element prefix ("13B1: C"); restore it,
  // but only on Answer Key lines where a bare id is unambiguous.
  if (pool.format === 'keytopic') {
    for (const line of raw.split('\n')) {
      if (!/Answer Key/.test(line)) continue;
      for (const m of line.matchAll(/(?:^|\s)(\d+[A-Z]\d+)\s*:\s*([A-D])\b/g)) {
        answers[`${pool.element}-${m[1]}`] = 'ABCD'.indexOf(m[2]);
      }
    }
  }

  const questions = [];
  let cur = null;
  const flush = () => { if (cur) questions.push(cur); cur = null; };

  // Choice starts on a line. Choices are usually one per line ("A. text")
  // but some Element 1 pages lay them out in two columns ("A. text   C.
  // text" over "B. text   D. text"), and the pools carry typos like "D No
  // radio..." with the dot missing and "C, An LED" with a comma. A
  // punctuated letter is trusted at the line start or mid-line after 2+
  // spaces; a bare letter only at the line start, and only when it is the
  // first letter still missing from the question.
  const choiceStarts = (line, expected) => {
    const starts = [];
    const rx = /(^|\s{2,})([A-D])([.),]\s*|\s+)/g;
    for (let m; (m = rx.exec(line)); ) {
      const atStart = m.index === 0;
      const punctuated = /[.),]/.test(m[3]);
      if (!punctuated && !(atStart && m[2] === expected)) continue;
      starts.push({ letter: m[2], from: m.index + m[1].length, text: rx.lastIndex });
    }
    return starts;
  };

  for (const { line: rawLine, page } of pages(raw)) {
    let line = rawLine;
    if (/Answer Key|^\s*Answers\s*:/.test(line)) { flush(); continue; }
    if (/^\s*-\s*\d+\s*-\s*$/.test(line)) continue; // "- 16 -" page footer
    if (NOISE_RE.test(line)) { flush(); continue; }
    if (!line.trim()) continue;

    const q = line.match(idRe) || bareId(line, pool);
    if (q) {
      flush();
      cur = { id: q[1], page, question: q[2], choices: {}, last: null };
      continue;
    }
    if (!cur) continue;

    line = line.trim();
    const expected = 'ABCD'.split('').find(l => !cur.choices[l]);
    const starts = choiceStarts(line, expected);
    const head = (starts.length ? line.slice(0, starts[0].from) : line).trim();
    if (head) { // text before the first choice continues the previous run
      if (cur.last) cur.choices[cur.last] += ' ' + head;
      else cur.question += ' ' + head;
    }
    starts.forEach((s, i) => {
      const end = i + 1 < starts.length ? starts[i + 1].from : line.length;
      cur.choices[s.letter] = line.slice(s.text, end).trim();
      cur.last = s.letter;
    });
  }
  flush();
  return { questions, answers };
}

// Element 1 misprints one id as "13A3" (no hyphen); accept the bare form
// when its first digit is the pool's element number.
function bareId(line, pool) {
  if (pool.format !== 'keytopic') return null;
  const m = line.match(/^\s*(\d)(\d+[A-Z]\d+)\s+(.*)$/);
  if (m && m[1] === pool.element) return [null, `${m[1]}-${m[2]}`, m[3]];
  return null;
}

/* Element 6: "6A1" alone on a line, the answer letter alone on the next,
 * then stem lines, then "A.text" choices (no space after the dot). */
function parseEl6(pool) {
  const questions = [];
  const answers = {};
  let cur = null;
  let want = null; // 'answer' right after an id line
  const flush = () => { if (cur) questions.push(cur); cur = null; };

  for (const { line: rawLine, page } of pages(read(pool))) {
    const line = rawLine.trim();
    if (NOISE_RE.test(rawLine)) continue;
    if (!line) continue;

    const id = line.match(/^(6[A-Z]?\d+)$/);
    if (id) { flush(); cur = { id: id[1], page, question: '', choices: {}, last: null }; want = 'answer'; continue; }
    if (!cur) continue;
    if (want === 'answer' && /^[A-D]$/.test(line)) {
      answers[cur.id] = 'ABCD'.indexOf(line);
      want = null;
      continue;
    }
    want = null;
    const c = line.match(/^([A-D])[.)]\s*(.*)$/);
    if (c) { cur.choices[c[1]] = c[2]; cur.last = c[1]; continue; }
    // 6A241 runs the stem and "A.Greater gain..." together on one line;
    // split on the first missing letter, but only right after sentence
    // punctuation so an "A." inside prose cannot trigger it.
    const expected = 'ABCD'.split('').find(l => !cur.choices[l]);
    const inline = expected && line.match(new RegExp(`^(.*[?:.])\\s+(${expected})\\.\\s*(\\S.*)$`));
    if (inline) {
      if (cur.last) cur.choices[cur.last] += ' ' + inline[1];
      else cur.question += (cur.question ? ' ' : '') + inline[1];
      cur.choices[inline[2]] = inline[3];
      cur.last = inline[2];
      continue;
    }
    if (cur.last) cur.choices[cur.last] += ' ' + line;
    else cur.question += (cur.question ? ' ' : '') + line;
  }
  flush();
  return { questions, answers };
}

function parsePool(pool) {
  const { questions, answers } =
    pool.format === 'el6' ? parseEl6(pool) : parseListed(pool);

  const bank = [];
  const skipped = [];
  for (const q of questions) {
    q.choices = ['A', 'B', 'C', 'D'].map(l => q.choices[l]).filter(c => c !== undefined);
    const bankId = (pool.idPrefix || '') + q.id;
    const fix = FIXUPS[bankId];
    if (fix) {
      if (fix.question) q.question = fix.question;
      if (fix.choices) q.choices = fix.choices;
    }
    const text = [q.question, ...q.choices].join(' ');
    if (FIGURE_RE.test(text) || BLANK_RE.test(text)) { skipped.push(q.id); continue; }
    if (q.choices.length !== 4) {
      throw new Error(`${pool.key} ${q.id}: parsed ${q.choices.length} choices`);
    }
    if (answers[q.id] === undefined) {
      throw new Error(`${pool.key} ${q.id}: no answer key entry`);
    }
    bank.push({
      id: bankId,
      section: pool.section,
      sectionName: pool.sectionName,
      question: tidy(q.question),
      choices: q.choices.map(tidy),
      answer: answers[q.id],
      manual: pool.key,
      page: String(q.page),
    });
  }
  return { bank, skipped, keyed: Object.keys(answers).length };
}

// Undo pdftotext artifacts that are safe to fix mechanically.
function tidy(s) {
  return s
    .replace(/\s+/g, ' ')
    // The angle sign in polar notation ("2490 ohms, /38.5 degrees") extracts
    // as a slash; restore the sign so the notation reads as intended.
    .replace(/, \/(-?\d)/g, ', ∠$1')
    .trim();
}

function listSuspects(allBanks) {
  const SUSPECT_RE = /( {2,}|\b[REIXZ][LCs]?2\b|= *f\b|\/ *2 *f\b|\b2 *f *[LC]\b|\bsq\.? ?rt\b)/;
  for (const q of allBanks) {
    if (FIXUPS[q.id]) continue;
    const text = [q.question, ...q.choices].join(' | ');
    if (SUSPECT_RE.test(text)) console.log(`${q.id}: ${text}`);
  }
}

const all = [];
const pageMaps = {};
let published = 0;
let skippedTotal = 0;
for (const pool of POOLS) {
  const { bank, skipped, keyed } = parsePool(pool);
  all.push(...bank);
  pageMaps[pool.key] = Math.max(...bank.map(q => Number(q.page)));
  published += bank.length + skipped.length;
  skippedTotal += skipped.length;
  console.log(`${pool.key}: ${bank.length} questions (answer key covers ${keyed}; ` +
    `skipped ${skipped.length}: ${skipped.join(', ') || 'none'})`);
}
console.log(`total: ${all.length} of ${published} published questions (${skippedTotal} skipped)`);

if (process.argv.includes('--list-suspects')) {
  listSuspects(all);
  process.exit(0);
}

const header = `/* Question bank converted from the FCC commercial operator license
   examination question pools (Elements 1, 3, 6, 7, 7R, 8, and 9) by
   tools/convert-fcc-pools.js. Do not edit by hand: fix the converter or
   tools/pool-fixups.json and regenerate. Each question keeps its official
   pool number in its id and cites the physical page of the pool PDF it
   appears on. */
`;
fs.writeFileSync(path.join(__dirname, '..', 'data', 'questions.js'),
  header + 'const QUESTION_BANK = ' + JSON.stringify(all, null, 1) + ';\n');

// Identity maps from the page label a question carries to the physical PDF
// page, one per pool, consumed by data/exam-config.js for #page= links.
const maps = Object.entries(pageMaps).map(([key, last]) => {
  const entries = [];
  for (let p = 1; p <= last; p++) entries.push(`  '${p}': ${p}`);
  return ` ${key}: {\n${entries.join(',\n')},\n }`;
});
fs.writeFileSync(path.join(__dirname, '..', 'data', 'manual-pages.js'),
  `/* Generated by tools/convert-fcc-pools.js. Do not edit by hand.
   The question pool PDFs cite their own physical pages, so each pool's map
   is the identity; it exists because the engine translates printed page
   labels to physical pages through a map, and other exams' manuals number
   their pages differently. */
const MANUAL_PAGES = {
${maps.join(',\n')},
};
`);
console.log(`wrote data/questions.js with ${all.length} questions`);
