# Security

NomadQA works with Salesforce sessions and logins, so security reports are welcome and taken seriously.

## Report a vulnerability

Please **do not open a public issue** for a security problem.

Use GitHub's private reporting: on this repository open **Security › Report a vulnerability**. Only the maintainer sees the report. Please include:

- what you found and where (file, step, screen);
- how to reproduce it, and what an attacker could do with it;
- the NomadQA version (`extension/manifest.json`) and your browser.

You will get an answer as soon as the maintainer can; this is a one-person project, so there is no guaranteed time, but a report is never ignored. Once it is fixed, the fix is released and the report can be made public with your credit, if you want it.

## What counts

In scope:

- the **extension** (`extension/`): anything that exposes a Salesforce session, a saved login, an AI key or test data to a page or a person it should not reach;
- the **runner** (`runner/`) and the **step engine** (`extension/core/`): leaking a secret into a log, a report or a file; running something a test file should not be able to run;
- the **documentation and examples**, if following them would expose a secret.

Out of scope: problems in Salesforce itself (report those to Salesforce), and anything that needs access to your computer or your org that you already have.

## Good to know

- Logins, SFDX auth URLs, passwords and AI keys stay **in your browser** (the extension) or **in your environment** (the runner). A test file only names a login; it never holds the secret.
- The extension sends only to your Salesforce org, and to the AI provider you choose in Settings (only your sentence and the org's object names — never records).
- The runner writes reports, JUnit files and pictures of failed steps. They can show your org's data: keep them where only your team can read, and use a sandbox.
- Keep `.env` out of git (this repository ignores it) and keep secrets in your CI's secret store.
- Please test only on orgs you own or may test in.

## Supported versions

The latest release (and `main`). Older versions are not patched.
