## What this changes

<!-- What the change does and why, for whoever reviews it. The commit messages
     are what lands on main, so this can stay short if they already say it.
     Link the issue it closes, like "Closes #12". -->

## How it was tested

<!-- Which of the checks below you ran, plus anything you tried by hand:
     browser and device for UI changes, the manual page you verified against
     for question bank changes. -->

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run test:browser`

## Checklist

- [ ] Every commit is a [Conventional Commit](https://www.conventionalcommits.org/)
      (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `ci:`, `refactor:`). They
      land on `main` unchanged, and every `feat:` and `fix:` becomes a changelog
      line
- [ ] The title above is plain prose with no type prefix. GitHub copies it into
      the merge commit, where a prefix would duplicate the changelog entry
- [ ] The branch is cleaned up: no fixup or work-in-progress commits, one commit
      per idea
- [ ] No new runtime dependencies and no build step
- [ ] Question bank changes cite the manual page, and the README count still
      matches
- [ ] User-visible changes work on a phone
