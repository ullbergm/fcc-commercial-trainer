# NC CDL Trainer

[![CI](https://github.com/ullbergm/nc-cdl-test-training/actions/workflows/ci.yml/badge.svg)](https://github.com/ullbergm/nc-cdl-test-training/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/ullbergm/nc-cdl-test-training)](https://github.com/ullbergm/nc-cdl-test-training/releases)
[![License: MIT](https://img.shields.io/github/license/ullbergm/nc-cdl-test-training)](LICENSE)
[![Live site](https://img.shields.io/website?url=https%3A%2F%2Fnc-cdl.ullberg.io&label=nc-cdl.ullberg.io)](https://nc-cdl.ullberg.io)

[![Questions](https://img.shields.io/badge/questions-422-blue)](data/questions.js)
[![Dependencies](https://img.shields.io/badge/dependencies-none-blue)](package.json)
[![PWA](https://img.shields.io/badge/PWA-offline%20ready-blue)](manifest.webmanifest)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-blue)](CONTRIBUTING.md)
[![Conventional Commits](https://img.shields.io/badge/conventional%20commits-1.0.0-blue)](https://www.conventionalcommits.org/en/v1.0.0/)

Practice questions with spaced repetition for the North Carolina commercial driver
license knowledge tests. The bank has 422 multiple-choice questions covering all 13
sections of the [NC Commercial Driver Manual](https://www.ncdot.gov/dmv/license-id/driver-licenses/new-drivers/Documents/commercial-driver-manual.pdf),
and every question cites the manual page it was drawn from, as a link that opens the
PDF at that page.

Live at [nc-cdl.ullberg.io](https://nc-cdl.ullberg.io), or run it yourself. There is
no build step, no dependencies, and no server. Just open `index.html` in a browser.
All progress is stored locally in the browser and never sent anywhere. Settings has
export and import for backups or for moving between devices.

<p align="center">
  <img src="docs/screenshots/home.png" width="500" alt="Home screen with due review, new card, and miss counts, an exam countdown banner, and a projected score for each test">
</p>
<p align="center">
  <a href="docs/screenshots/README.md">More screenshots</a>
</p>

## Modes

- **Study**: the spaced repetition queue. Due reviews plus a daily allotment of new
  cards, drawn round-robin across the selected sections and interleaved with the
  reviews. Wrong answers come back a few cards later in the same session. Correct
  answers are rated Hard, Good, or Easy, which tells the scheduler how the recall felt.
  Feel like doing more once the queue is empty? The home and session-complete screens
  offer 5, 10, or 25 extra new cards; the extra applies to today only and your
  configured pace is untouched.
- **Misses**: re-drills every question whose last answer was wrong, without touching
  the review schedule. Answering one correctly removes it from the pool.
- **Exam**: mock knowledge tests in the real format. No feedback until the end, and
  80% to pass. The list mirrors the actual NC test structure (General Knowledge, Air
  Brakes, Combination Vehicles, and the endorsement tests) and shows only the tests
  selected in Settings. Missed exam questions feed the Misses pool.
- **Browse**: the whole bank by manual section, with each card's schedule and accuracy.
- **Stats**: exam readiness, mastery counts, day streak, 7-day due forecast,
  per-section accuracy, and exam history.

On a keyboard, 1 through 4 pick an answer, Enter continues after a wrong answer,
and 1/2/3 (or Enter for Good) grade a correct one. A stray tap is not final: an
Undo button (or the U key) on the feedback screen takes back the answer and asks
the question again, as long as you have not yet continued or graded. The buttons
show badges for their shortcut keys on devices with a mouse and keyboard; on
touch screens the badges stay hidden.

In Settings, under "Tests I'm studying for", check only the tests you are taking
next, for example General Knowledge, Air Brakes, and Combination Vehicles for a
first Class A attempt. Everything else stays out of the queue until you check it,
and progress on unchecked sections is kept.

## Scheduling

The scheduler implements [FSRS-6](https://github.com/open-spaced-repetition)
(Free Spaced Repetition Scheduler) with its published default parameters. FSRS
models each card with three quantities:

- Difficulty: how hard the card is for you, on a scale of 1 to 10, adjusted by
  each answer.
- Stability: how durable the memory is, measured as the number of days until recall
  probability falls to 90%. Successful reviews grow it, and a miss collapses it.
- Retrievability: the predicted chance of recalling the card right now, which decays
  along a power-law forgetting curve.

Each review updates difficulty and stability from your rating, then schedules the
next review for the day retrievability is predicted to reach the target, shortly
before you would likely forget. Intervals grow quickly for cards you keep getting
right and reset for cards you miss. Repeat answers within the same day use a
separate short-term memory formula. Intervals of three days or more get a small
deterministic fuzz (up to about 5%) so cards learned together drift apart
instead of always coming due on the same day.

Every scheduled review is also appended to a compact log (question, rating,
timestamp) that is kept with your progress and included in backups. Nothing
reads it yet; it exists so a future version can fit the FSRS parameters to
your actual review history instead of the published defaults, which the
aggregate card state alone could never support.

## Studying for a date

Set your test date in Settings and the scheduler optimizes for that day instead of
indefinite retention:

- The retention target ramps from 90% to 95% over the final three weeks.
- No review is scheduled past the exam. Anything that would land later is pulled
  back to exam day.
- If the daily new-card pace is too slow to cover every remaining question in time,
  it is raised automatically. Your stored setting is untouched, the boost is shown
  on the home screen, and it goes away when the date is cleared.
- In the last five days a "Final review sweep" appears on the home screen. It goes
  through every card, weakest memory first, ignoring due dates.

Without an exam date the app runs at your own pace with the normal 90% target. The
same applies automatically once the date passes.

## Am I ready

The home screen projects a score for each test you are studying for, and Stats
breaks the same projection down with the odds and what is dragging it. Both come
from the memory model the scheduler already maintains, so the number moves with
your actual reviews rather than with a running average of past answers.

Each question is one trial: either the answer is recalled, at the retrievability
FSRS predicts for the moment of the test, or it is not and the guess still lands
one time in four. A question you have never seen is a straight guess. The real
test draws its questions from a much larger pool, so the projected score is the
pool average, and the spread around it accounts for both the draw and the recall
itself. The chance of passing is the probability that the draw clears 80%.

Two counts explain a low projection. Unseen questions are the ones the queue has
not reached yet. Rusty ones have been studied but are predicted to fall below the
90% recall the scheduler targets by test day, which is what the review queue is
there to fix. Without an exam date the projection is for taking the test today.

The projection assumes the bank is representative of the real test, which is a
study aid's assumption, not a promise. Treat it as a direction, not a score
report.

## Layout

```
index.html               app shell
css/style.css            styling (light/dark follows the device; Settings can force either)
js/fsrs.js               FSRS-6 scheduler
js/readiness.js          projected score and pass odds per test
js/storage.js            localStorage persistence, export/import
js/app.js                UI and session logic
data/questions.js        question bank (422 questions, tagged by section and manual page)
data/manual-pages.js     manual page labels to PDF page numbers, for the citation links
data/exam-config.js      what exam this is: tests, pass mark, manual links, exam-specific prose
tools/                   regenerates that map from a local copy of the manual PDF
sw.js                    service worker (offline cache, only active on the hosted site)
manifest.webmanifest     PWA manifest, lets the app be installed to a home screen
icons/                   app icons (icon.svg is the source, PNGs rendered from it)
tests/validate-bank.js   question bank schema checks (node)
tests/fsrs-test.js       FSRS scheduler property tests (node)
tests/readiness-test.js  readiness projection tests, incl. a Monte Carlo check (node)
tests/test.html          end-to-end tests driven through the real UI
tests/run-browser.sh     headless-Chrome runner for test.html (local + CI)
docs/screenshots/        README images and the script that regenerates them
```

On the hosted site the app is an installable PWA: a service worker caches
everything on first load, so it keeps working offline, and "Add to home screen"
installs it like an app. Each release stamps its version into the service
worker, so open tabs notice the new deploy, show a "new version is ready"
toast, and switch over cleanly on reload; otherwise the release is picked up
on the next load.

## Building a trainer for another exam

The engine under `js/` knows nothing about the CDL, and the test suites derive
their assertions from the config and the bank, so a trainer for a different
manual-based exam is a matter of replacing data and identity files. Create a
new repository from this one and touch:

- `data/questions.js`: the new question bank, tagged by section and manual page
- `data/exam-config.js`: the tests and exams, pass mark, manual links, storage
  keys, and every piece of prose that names the exam
- `data/manual-pages.js`: regenerate with `node tools/gen-manual-pages.js`; the
  footer-label parsing in that script is written for the CDL manual, so adjust
  it to the new manual's page numbering
- `css/style.css`: the token blocks at the top set all colors and the
  progress-bar texture; the rules below them are exam-neutral
- `index.html`: title, meta description, canonical URL, brand text, favicon,
  theme color
- `manifest.webmanifest`, `icons/`, `CNAME`: PWA identity and hosting
- `sw.js`: the cache-name prefix
- `.github/ISSUE_TEMPLATE/question-correction.yml`: names the manual in its
  field description
- `docs/screenshots/seed.js`: the demo scenario behind the README screenshots
- `README.md` itself

Two engine assumptions to keep in mind: every question offers exactly four
choices, and questions cite one page of one manual (multiple manuals are
supported through the `manuals` map in the config; a manual without a public
URL renders its citations as plain text instead of PDF links).

## Releases and deployment

Two workflows in `.github/workflows/`:

- CI (`ci.yml`) validates the question bank and runs the browser test suite on every
  push to `main` and every pull request.
- Release (`release.yml`) uses [release-please](https://github.com/googleapis/release-please)
  to maintain a release PR from [Conventional Commit](https://www.conventionalcommits.org/)
  messages. Merging that PR tags a version, publishes a GitHub release with a
  generated changelog, and deploys to GitHub Pages. Ordinary pushes to `main` do not
  touch the live site. The deploy job re-runs the tests before publishing.

To run the checks locally:

```
npm install          # one time, dev tooling only (the app itself has no dependencies)
npm run lint
npm test             # question bank validation, FSRS scheduler, readiness projection
npm run test:browser # end-to-end suite in headless Chrome or Chromium
```

Every line should say `PASS`. Opening `tests/test.html` in a normal browser also
works, with the results printed at the bottom of the page. The test page clears the
app's localStorage for its origin, so do not run it in the browser profile where you
keep real study progress.

## Accuracy

The questions were authored from the manual's text, section by section. Accuracy is
not guaranteed. Each question carries the manual page it came from (like `5-3`) and
links to that page in the PDF, so verify anything important against the source. The actual DMV exam questions are not
publicly available, and no claim is made that these questions match or resemble
them. This is a study aid for the manual's content, not a copy of the test. If a
question reads wrong, check the cited page and edit `data/questions.js`, which is a
plain JSON array.

The manual PDF is copyright AAMVA and is not included in this repository. Download
it from NCDMV at the link above.

The citation links point into that hosted PDF with a `#page=` fragment, which counts
physical pages rather than the section-relative labels printed in the footers, so
`data/manual-pages.js` maps between the two. The map is built from the July 2014
revision; if NCDMV publishes a new one, download it and re-run
`node tools/gen-manual-pages.js` (needs `pdftotext`) so the links keep landing on the
right pages.

## License

[MIT](LICENSE)
