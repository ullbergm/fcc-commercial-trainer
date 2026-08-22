# Security Policy

## Reporting a vulnerability

Please report security issues privately rather than opening a public issue:

- Preferred: [GitHub private vulnerability reporting](https://github.com/ullbergm/fcc-commercial-trainer/security/advisories/new)
- Or email: magnus@ullberg.us

Include what you found, where (file and line if you have it), and steps to
reproduce. You can expect an acknowledgment within a few days. Please give a
reasonable window to ship a fix before disclosing publicly; fixes deploy to
the live site through the normal release process.

## Supported versions

Only the latest release is supported. It is what runs at
[fcc-commercial.ullberg.io](https://fcc-commercial.ullberg.io), and the service worker
prompts open tabs to reload onto it after each deploy. There are no
maintained older branches.

## Verifying a release

Each release carries `fcc-commercial-trainer-VERSION.tar.gz`, a copy of exactly the
files deployed to the live site, along with a Sigstore bundle
(`.tar.gz.intoto.jsonl`) signed by the release workflow. To check that a
download came from this repository's pipeline and not from somewhere else:

```
gh attestation verify fcc-commercial-trainer-VERSION.tar.gz \
  --repo ullbergm/fcc-commercial-trainer
```

Add `--bundle fcc-commercial-trainer-VERSION.tar.gz.intoto.jsonl` to verify offline
against the downloaded bundle instead of GitHub's attestation store.

## Scope

This is a static, dependency-free web app. There is no server, no account
system, and no data leaves the browser: all progress lives in the browser's
own localStorage and the optional export file the user saves themselves.

Reports that are in scope include:

- Cross-site scripting through rendered content. The app builds its DOM with
  `innerHTML` behind an escaping helper, and renders `CHANGELOG.md` through a
  minimal markdown converter; an escaping gap in either is a real bug. A
  [Content Security Policy](index.html) is in place as a second layer, so a
  working report would typically show a CSP bypass as well.
- Service worker cache poisoning or update-flow abuse (`sw.js`).
- Flaws in the import path (`Store.importJSON`) that let a crafted backup
  file execute code or corrupt more than the importing user's own data.
- Supply chain issues in the GitHub Actions release pipeline
  (`.github/workflows/`). Actions are pinned to commit SHAs; a report that a
  pinned SHA is compromised or that the pipeline can be made to deploy
  untrusted content is in scope.

Out of scope:

- Anything requiring physical access to the victim's unlocked device or
  browser profile. localStorage is readable by the device's user by design.
- Content accuracy of the study questions (use the
  [question correction template](https://github.com/ullbergm/fcc-commercial-trainer/issues/new?template=question-correction.yml)).
- Denial of service against GitHub Pages, and vulnerabilities in GitHub
  itself (report those to GitHub).
- The `eslint` dev dependency, unless it affects the published site.

## No secrets here

The repository and the deployed site contain no credentials, tokens, or user
data. If you believe you found a secret in the history, report it privately
anyway so it can be confirmed dead and rotated.
