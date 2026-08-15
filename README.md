# NC CDL Trainer

Practice questions with spaced repetition for the North Carolina commercial driver
license knowledge tests. The bank has 388 multiple-choice questions covering all 13
sections of the [NC Commercial Driver Manual](https://www.ncdot.gov/dmv/license-id/driver-licenses/new-drivers/Documents/commercial-driver-manual.pdf),
and every question cites the manual page it was drawn from.

**Live at [nc-cdl.ullberg.io](https://nc-cdl.ullberg.io)** — or run it yourself:
no build step, no dependencies, no server, just open `index.html` in a browser.
All progress is stored locally in the browser (localStorage) and never sent to a
server — there is no backend and no tracking. Settings has export/import for backups
or moving between devices.

## Modes

- **Study** — the spaced-repetition queue: due reviews plus a daily allotment of new
  cards. Wrong answers come back a few cards later in the same session; correct
  answers are rated Hard/Good/Easy, which tells the scheduler how the recall felt.
- **Misses** — re-drills every question whose last answer was wrong, without touching
  the review schedule. Answering one correctly removes it from the pool.
- **Exam** — mock knowledge tests in the real format: no feedback until the end, 80%
  to pass. The list mirrors the actual NC test structure (General Knowledge, Air
  Brakes, Combination Vehicles, and the endorsement tests) and shows only the tests
  selected in Settings. Missed exam questions feed the Misses pool.
- **Browse** — the whole bank by manual section, with each card's schedule and accuracy.
- **Stats** — mastery counts, day streak, 7-day due forecast, per-section accuracy,
  exam history.

Under **Settings → Tests I'm studying for**, check only the tests you're taking next
(say, General Knowledge + Air Brakes + Combination for a first Class A attempt).
Everything else stays out of the queue until you check it, and progress on unchecked
sections is kept.

## Scheduling

The scheduler is an implementation of [FSRS-6](https://github.com/open-spaced-repetition)
(Free Spaced Repetition Scheduler) with its published default parameters. FSRS models
each card with three quantities:

- **Difficulty** — how hard this card is for you, on a 1–10 scale, nudged by each answer.
- **Stability** — how durable the memory is: the number of days until recall probability
  falls to 90%. Successful reviews multiply it; a miss collapses it.
- **Retrievability** — the predicted chance of recalling the card right now, decaying
  along a power-law forgetting curve.

Each review updates difficulty and stability from your rating, then schedules the next
review for the day retrievability is predicted to hit the target — just before you'd
likely forget. Intervals stretch quickly for cards you keep getting right and reset
for cards you miss. Same-day repeats use FSRS-6's separate short-term memory formula.

## Studying for a date

Set your test date in Settings and the scheduler optimizes for that day instead of
indefinite retention:

- The retention target ramps from 90% to 95% over the final three weeks.
- No review is scheduled past the exam; anything later is pulled back to exam day.
- If the daily new-card pace is too slow to cover every remaining question in time,
  it's raised automatically (your stored setting is untouched — the boost is shown on
  the home screen and disappears when the date is cleared).
- In the last five days a **Final review sweep** appears: every card, weakest memory
  first, ignoring due dates.

No exam date means open-ended mode: your own pace, 90% target. The same applies
automatically once the date passes.

## Layout

```
index.html               app shell
css/style.css            styling (light/dark via prefers-color-scheme)
js/fsrs.js               FSRS-6 scheduler
js/storage.js            localStorage persistence, export/import
js/app.js                UI and session logic
data/questions.js        question bank (388 questions, tagged by section and manual page)
tests/validate-bank.js   question bank schema checks (node)
tests/test.html          end-to-end tests driven through the real UI
```

## Releases and deployment

Two workflows in `.github/workflows/`:

- **CI** (`ci.yml`) — validates the question bank and runs the browser test suite on
  every push to `main` and every pull request.
- **Release** (`release.yml`) — [release-please](https://github.com/googleapis/release-please)
  watches `main` and maintains a release PR from
  [Conventional Commit](https://www.conventionalcommits.org/) messages (`feat:`,
  `fix:`, `chore:`, …). Merging that PR tags a version, publishes a GitHub release
  with a generated changelog, and only then deploys to
  [nc-cdl.ullberg.io](https://nc-cdl.ullberg.io) — ordinary pushes to `main` don't
  touch the live site. The deploy job re-runs the tests before publishing.

One-time setup after publishing the repo:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. **Settings → Pages → Custom domain:** `nc-cdl.ullberg.io`, then check
   **Enforce HTTPS** once the certificate is issued
3. In DNS, add a `CNAME` record pointing `nc-cdl` at your GitHub Pages hostname
   (`<username>.github.io`)
4. **Settings → Actions → General → Workflow permissions:** enable
   *Allow GitHub Actions to create and approve pull requests* (release-please
   needs it to open the release PR)

To run the tests locally:

```
node tests/validate-bank.js
chromium --headless=new --disable-gpu --virtual-time-budget=8000 \
  --dump-dom tests/test.html | grep -o 'RESULTS::[^<]*' | tr '|' '\n'
```

Every line should say `PASS`. Opening `tests/test.html` in a normal browser works
too — the results are printed at the bottom of the page. Note that the test page
clears the app's localStorage for its origin, so don't run it in the same browser
profile where you keep real study progress.

## Accuracy

The questions were authored from the manual's text, section by section. Accuracy is
not guaranteed — each question carries the manual page it came from (like `5-3`), so
verify anything important against the source. The actual DMV exam questions are not
publicly available, and no claim is made that these match or resemble them; this is a
study aid for the manual's content, not a copy of the test. If a question reads wrong,
check the cited page and edit `data/questions.js` (a plain JSON array).

The manual PDF itself is copyright AAMVA and isn't included in this repository —
download it from NCDMV at the link above.

## License

[MIT](LICENSE)
