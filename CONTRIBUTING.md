# Contributing

Thanks for taking the time. This is a small static web app, so getting set up
takes about a minute and there is no build step to fight with.

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to help

- **Fix a question.** The bank is converted from the FCC's published question
  pools, so most errors would be conversion errors. If a question does not
  match the cited pool page, open a
  [question correction](https://github.com/ullbergm/fcc-commercial-test-training/issues/new?template=question-correction.yml)
  or send the edit directly as a pull request.
- **Report a bug.** Use the
  [bug report template](https://github.com/ullbergm/fcc-commercial-test-training/issues/new?template=bug-report.yml).
  Browser and device help a lot, since most of the tricky bugs are touch or
  layout related.
- **Report a vulnerability.** Do not open a public issue. Follow
  [SECURITY.md](SECURITY.md).
- **Write code.** Bug fixes and small, self-contained features are welcome. For
  anything large, open an issue first so we can agree on the shape before you
  spend the time.

## Getting set up

```
git clone https://github.com/ullbergm/fcc-commercial-test-training.git
cd fcc-commercial-test-training
npm install          # dev tooling only; the app itself has no dependencies
npm run serve        # http://localhost:8081
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

`data/questions.js` is generated, not hand-written: the FCC publishes the
examination question pools with answer keys, and `tools/convert-fcc-pools.js`
converts them verbatim from the PDFs committed under `pools/`. Do not edit
`data/questions.js` directly; change the converter (or its typo and fixup
tables) and regenerate, as described in
[docs/question-authoring.md](docs/question-authoring.md):

```
node tools/convert-fcc-pools.js
npm test
```

Each entry keeps its official pool number as its id (like `3-21C4`), the
element as its `section`, and the physical page of the pool PDF it appears on
as its `page`, which the app turns into a deep link. `npm test` enforces the
schema: unique ids, exactly four choices, `answer` as a 0-based index, and a
`page` on every question that resolves through `data/manual-pages.js`.

Corrections should point at the cited pool page. If the pool PDF does not
match what the app shows, say so in the pull request and the fix is easy to
confirm; if the app matches the pool, the question is correct by definition,
FCC typos included.

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

## A note on the pools

The FCC question pool PDFs are United States government works, which is why
they can live in this repository under `pools/` and why the questions can be
reproduced verbatim. If the FCC publishes a revised pool, follow the update
steps in [docs/question-authoring.md](docs/question-authoring.md).
