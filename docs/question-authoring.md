# Maintaining the question bank

Unlike the manual-based trainers this app descends from, this bank is not
authored: the FCC publishes the actual examination question pools with answer
keys, and `data/questions.js` is those pools converted verbatim. The recipe
here is therefore about conversion, not writing. (The original authoring
recipe, for an exam that only has a study manual, lives in the upstream
[NC CDL trainer](https://github.com/ullbergm/nc-cdl-trainer/blob/main/docs/question-authoring.md).)

## The pipeline

```
pools/elN.pdf                    the FCC pool PDF, committed (US government work)
pools/elN.txt                    pdftotext -layout output, committed
tools/convert-fcc-pools.js       parses the txt, applies fixes, writes the bank
tools/pool-fixups.json           hand-transcribed repairs for glyphs the PDF lost
data/questions.js                generated: the bank
data/manual-pages.js             generated: page maps for the citation links
```

Regenerate after any change with:

```
node tools/convert-fcc-pools.js
npm test
```

## What the converter does

- Parses the three source layouts (Elements 1/3/8, Elements 7/7R/9, and
  Element 6 each print their pools differently; the header comment in the
  converter describes them).
- Reads the official answer keys, tolerating the misprints the pools carry
  (missing colons, an en-dash for a hyphen, a dropped element prefix).
- Corrects, via its `TYPOS` table, the few source misprints that would
  otherwise corrupt parsing: a question numbered "34D4" that belongs to topic
  36, an id printed "A6231" instead of "6A231". Each fix asserts its target
  text still exists, so a revised pool that fixes the typo upstream fails
  loudly instead of double-applying.
- Skips questions that reference a drawing (`Figure 3B1`), since the app
  renders text only, and the two Element 6 questions whose answer text the
  FCC left blank. It prints every skipped number when it runs.
- Applies `tools/pool-fixups.json`, which restores strings the PDF's own
  fonts mangled (pi in Element 3 formulas). Entries were transcribed by eye
  from the rendered pages: `pdftoppm -png -r 110 -f PAGE -l PAGE pools/el3.pdf out`
  renders a page for checking.
- Emits each question with its official pool number as its id, the element as
  its section, and the physical PDF page it appears on as its citation.

Run `node tools/convert-fcc-pools.js --list-suspects` to print questions that
look like they still contain a mangled formula (double spaces, orphaned `f L`
fragments) and have no fixup yet.

## Verbatim means verbatim

The pools contain the FCC's own typos ("defective rube", a repeated choice in
6A251 and 9-23C1) and they are reproduced as published. The exam is drawn
from the published pool, so matching it exactly is worth more than tidiness.
Fix only what breaks conversion or lost glyphs to font problems, and do it in
the converter's tables so the change is visible and reproducible, never by
editing `data/questions.js` by hand.

## When the FCC revises a pool

1. Download the new PDF from the
   [FCC examinations page](https://www.fcc.gov/wireless/bureau-divisions/mobility-division/commercial-radio-operator-license-program/examinations)
   into `pools/`, replacing the old one.
2. Re-extract the text: `pdftotext -layout pools/elN.pdf pools/elN.txt`.
3. Re-run the converter. Expect it to fail on typo-table entries the revision
   fixed; delete those entries. New layouts or new misprints surface as
   parse errors with the question number.
4. Run `npm test`, update the question counts stated in the README and
   `data/exam-config.js` prose, and update the pool title in the config's
   `manuals` map if the revision date changed.
