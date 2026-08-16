# Contributing

Thanks for taking the time. This is a small static web app, so getting set up
takes about a minute and there is no build step to fight with.

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to help

- **Fix a question.** The bank was authored from the manual section by section,
  and some of it is certainly wrong. If an answer or explanation does not match
  the cited manual page, open a
  [question correction](https://github.com/ullbergm/nc-cdl-test-training/issues/new?template=question-correction.yml)
  or send the edit directly as a pull request.
- **Report a bug.** Use the
  [bug report template](https://github.com/ullbergm/nc-cdl-test-training/issues/new?template=bug-report.yml).
  Browser and device help a lot, since most of the tricky bugs are touch or
  layout related.
- **Report a vulnerability.** Do not open a public issue. Follow
  [SECURITY.md](SECURITY.md).
- **Write code.** Bug fixes and small, self-contained features are welcome. For
  anything large, open an issue first so we can agree on the shape before you
  spend the time.

## Getting set up

```
git clone https://github.com/ullbergm/nc-cdl-test-training.git
cd nc-cdl-test-training
npm install          # dev tooling only; the app itself has no dependencies
npm run serve        # http://localhost:8080
```

Opening `index.html` directly works too, though the service worker and a few
fetch paths only behave properly over http, so `npm run serve` is the safer
default.

## Before you open a pull request

Run everything CI runs:

```
npm run lint
npm test             # question bank validation + FSRS scheduler tests
npm run test:browser # end-to-end suite in headless Chrome or Chromium
```

Every line should say `PASS`. You can also open `tests/test.html` in a browser
and read the results at the bottom of the page, but that page clears
localStorage for its origin, so do not use the browser profile where you keep
real study progress.

## House rules for code

- No dependencies and no build step. The app ships the files in the repository
  exactly as they are: browser JavaScript, plain CSS, plain HTML. If a change
  would add a runtime dependency, open an issue first.
- Follow the style already in the file you are editing. `npm run lint` catches
  the rest.
- Anything user-visible needs to work on a phone. Most people study on one.
- Keep the DOM escaping helpers in place. Content goes through them for a
  reason, and the Content Security Policy in `index.html` is the second layer,
  not the first.
- If you touch `sw.js`, `index.html`, or the release workflow, be aware the
  validator cross-checks them: the precache list must exist in the repository
  and be staged at deploy, and the nav in `tests/test.html` must match
  `index.html`.

## Editing the question bank

`data/questions.js` is a plain JSON array behind a `const`. Each entry looks
like this:

```json
{
  "id": "s5-012",
  "section": 5,
  "sectionName": "Air Brakes",
  "question": "...",
  "choices": ["...", "...", "...", "..."],
  "answer": 1,
  "explanation": "...",
  "page": "5-3"
}
```

`npm test` enforces the rules: unique ids, unique question text, exactly four
distinct choices, `answer` as a 0-based index into them, `section` between 1 and
13, and `page` in the manual's `chapter-page` form. Every question must cite the
manual page it came from, and the explanation should say what that page says
rather than general trucking knowledge. If you add or remove questions, update
the count in the README, which the validator also checks.

Corrections should point at the cited page. If the page does not support the
current answer, say so in the pull request and the fix is easy to confirm.

The citation in the app links into the manual PDF, which numbers its pages
straight through while the manual prints section-relative labels in its footers.
`data/manual-pages.js` maps between the two, and the validator fails on a `page`
that is missing from it. A handful of labels are printed on more than one page,
so a question drawn from the second one needs an explicit `"pdfPage": 20` next to
its `"page"` to point the link at the right place.

## Commits and releases

Pull requests are merged with a merge commit, and your commits land on `main`
underneath it exactly as you wrote them. The commit messages are the
deliverable, not the pull request title, because
[release-please](https://github.com/googleapis/release-please) reads them
directly to build the changelog and pick the next version.

Write every commit message as a
[Conventional Commit](https://www.conventionalcommits.org/). The prefix decides
what happens at release time:

- `feat:` for a new capability, which bumps the minor version
- `fix:` for a bug fix, which bumps the patch version
- `chore:`, `docs:`, `test:`, `ci:`, and `refactor:` for everything else, which
  do not trigger a release on their own

Write the subject in the imperative and describe the effect, for example
`fix: roll back an answer abandoned before grading`. Add `!` after the type for
a breaking change. The body is where the reasoning goes: what the change does
and why, in prose. Do not start a body line with `feat:`, `fix:`, or another
type prefix. release-please reads bodies as well as subjects, so a stray prefix
down there becomes a second changelog entry for the same change.

Every `feat:` or `fix:` commit on your branch becomes its own changelog line, so
clean the branch up before asking for a merge. Squash the false starts and the
review fixups into the commit they belong to with `git rebase -i`, and keep one
commit per idea. Two unrelated changes can share a pull request as two commits,
but they should not share one commit.

Give the pull request itself a plain prose title, with no `feat:` or `fix:`
prefix. GitHub copies that title into the merge commit, and release-please reads
the whole message of every commit, body as well as subject, so a conventional
prefix down there turns into a changelog entry of its own. A conventionally
titled pull request therefore lists its one change twice. The description is
only ever read during review.

Both halves of that are checked, and both are required to merge. The
`Commit conventions` workflow runs [commitlint](https://commitlint.js.org/) over
every commit on the branch and rejects a pull request title that starts with a
type prefix, so a slip fails the pull request instead of quietly landing in the
changelog.

Squash and rebase merges are both turned off. Squash would flatten a branch into
a single changelog line and replace these commit bodies with the pull request
template, and GitHub cannot sign the commits a rebase merge creates, which the
branch protection on `main` requires.

Merging to `main` does not deploy. Releases happen when the release-please pull
request is merged, which tags the version, publishes the release notes, and
deploys to GitHub Pages after re-running the tests.

## Documentation and copy

Plain, direct prose. No emoji, no marketing voice, and no em dashes. Match the
tone of the README.

## A note on the manual

The NC Commercial Driver Manual is copyright AAMVA and is not included in this
repository. Download it from
[NCDMV](https://www.ncdot.gov/dmv/license-id/driver-licenses/new-drivers/Documents/commercial-driver-manual.pdf)
if you are working on the question bank. Do not paste long verbatim passages
into questions or explanations; write them in your own words and cite the page.
