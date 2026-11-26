# Versions

What changed in each version of NomadQA. The newest is on top. The current extension version is **{{version}}**.

## [1.0.0] · 2026-11-26

The first release. Test data, testing (Inspector, Recorder, Tests, Runs, Agent), the headless runner — and, new in this version, logging in as each of many users, a website and downloads.

**New: many users**
- **Log in with an SFDX auth URL**: a login in Settings › Logins can hold a user's SFDX auth URL instead of a password. The test goes in without a login page. In the runner: `NOMADQA_LOGINS`, `--logins`, or one environment variable per user, `NOMADQA_AUTH_URL_SALES_REP` = the login `sales-rep`.
- **A browser context of its own for every test that logs in** (`Log in`, `Log in as a user`), in the runner: the next test is not that user, and such tests run side by side with `--parallel`.
- A guide for **30 users, a group of tests for each**: secrets in GitHub, AWS, Google Cloud or Vault, and one job per group.

**New: website, downloads, examples**
- **Website** (GitHub Pages) with 15 pages: Home, Start, Inspector, Recorder, Tests, Reports, Test data, Agent, Runner, CI, Examples, Steps, Videos, Download, Versions — with tabs where there are alternatives.
- **Download page**: `nomadqa-extension.zip` and `nomadqa-runner.zip` (unzip it in your repository and run `node nomadqa/runner/run.mjs`: no clone, no packages), with checksums. A release workflow publishes both with these notes.
- **9 videos and 18 GIFs**, recorded in a real scratch org with the real extension: every video is a whole journey (open NomadQA → point or record → save → run → report).
- **12 examples**, each shown as readable steps with its file to download.
- **CI, secrets and reports**: GitHub Actions with repository secrets, Google Cloud, AWS, GitLab, Jenkins, Azure DevOps, Bitbucket and CircleCI; how to keep reports when a test fails.

**Everything built before** is listed below, by day.

## [0.2.0] · 2026-11-20 → 2026-11-25 · pre-release

Testing for Salesforce: Inspector, Recorder, Tests, Runs, Agent and the headless runner. (Built as a pre-release; the version number stayed 0.2.0 while these were added, so they are listed by day. They are all part of 1.0.0.)

**25 Nov**
- A guide to run tests anywhere (`RUN-ANYWHERE.md`); NomadQA moved to its own repository; the unit tests run on every push.

**24 Nov**
- **Wait until the page has loaded** (the page and Setup's frames loaded, no spinner, nothing changing).
- **Stop** a running test or group; the step ends now, test data is still deleted.
- **Groups in groups**, and stepping through a step inside a group; **pick from tests**.
- Exact match for short labels; steadier paths; JavaScript links in Setup; fixes for pages that load again and tabs that open late.

**23 Nov**
- **Exact element paths** (CSS selector, XPath, or DevTools' "JS path") for click, type and check; **Copy** and **⌖ Pick on the page**.
- The step list can sit **under the page**; groups on the list; **↗** opens a step in NomadQA; **Close its tab after** a test.

**22 Nov**
- **Inspector**: lists every org you are logged in to with its tabs; **Add to a test** and **Add and click**; a step list while picking; **+ Find a record**; **Details** tab; **Click, then type and choose…**; **Search and choose…**; Setup pages are read-only.
- **Tests**: step by step on the page, **Fix it on the page**, groups of steps, **Run all** for a group of tests (one at a time or several at once), **Log in** and **Log in as a user**, checks for counts, places, record types and page layouts, fields by API name, **search**, **remember**, **query** with save.
- **Failure reports**: the step, why, expected, got, and a picture; an HTML report and JUnit; the headless command.
- **Recorder** follows tabs and page loads and merges "button + choice" into one step.

**21 Nov**
- Tables, a Log bar, live progress, **Find & clone**, the **Pattern** rule "with random added", **Records above**, recipes, org choice, its own tab and icon.

**20 Nov**
- The step engine, the page Inspector and Recorder, the Tests and Runs screens, the Agent and the headless runner (first versions); the **automation switch**.

## [0.1.0] · 2026-11-20 · pre-release

**Test data**: a plan (objects, how many, what goes under each), field rules (auto, fixed, list, weighted, pattern, range, dates, query), **Check without saving** (rolled back), **Create** after typing the org's name, CSV files, an `@IsTest` factory class, recipes and **batches** you can delete.

---

### How a release is made

1. Add a heading `## [x.y.z] · date` with what changed.
2. Set the same version in `extension/manifest.json` and `package.json`.
3. Tag it `nomadqa-vX.Y.Z` and push the tag. The release workflow runs the tests, builds `nomadqa-extension.zip` and `nomadqa-runner.zip`, and publishes a GitHub Release with the notes of that version.
