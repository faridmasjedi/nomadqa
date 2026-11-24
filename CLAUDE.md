# NomadQA — working notes

Testing for Salesforce: a Chrome/Edge extension (Manifest V3) and a headless runner for CI. **No packages**: plain
JavaScript modules the browser loads as they are, Node built-ins, Chrome. Keep it that way (no npm dependencies, no
build step).

## Layout

| Path | What |
| --- | --- |
| `extension/` | The extension. `app.html`/`app.js` = the NomadQA tab; `views/testing.js` = Inspector, Recorder, Tests, Runs, Settings |
| `extension/core/engine.js` | Runs a step in the Salesforce page (finds by what a person sees, or by an exact path). Classic script, injected |
| `extension/core/steps.js` | Step checks (`problem`), `stepper` (one step at a time, groups, data, logins), `runTest`, JUnit |
| `extension/core/words.js` | Step kinds, their boxes and sentences — shared by Tests, the on-page list and the runner |
| `extension/core/report.js` | HTML report for people, Markdown summary |
| `extension/content/page.js` | On-page list of steps, Inspector panel, Recorder (injected on demand) |
| `extension/content/keys.js`, `main.js` | Run before Salesforce's scripts / in the page's own world (see comments) |
| `runner/run.mjs` | Headless runner (Node 22 WebSocket + Chrome DevTools Protocol) |
| `RUN-ANYWHERE.md` | How people use the runner in any CI and share its reports (no shipped workflow file) |
| `test/` | Unit tests (`node:test`) |

## Commands

```sh
npm test                                    # unit tests (node --test test/*.test.mjs)
node scripts/pack.mjs                       # nomadqa-extension.zip
node runner/run.mjs tests/ --org my-sandbox # headless run
```

## Rules

- Every change ends with a fresh test build in `~/Desktop/nomadqa-test-build/` (unpacked `extension/` + zip) and a real
  check in a test org (unit tests are not enough: Salesforce pages behave differently).
- Keep screens simple; options rather than forced behaviour. Nothing heavy runs until the user clicks.
- Every write to an org asks the user first, with the org's name typed. Setup stays read-only for tests.
- Never write to orgs that are not test orgs; never print auth URLs, tokens or passwords.
- Git: stage files by name, lowercase commit subjects, small focused commits; no CI artifacts.
