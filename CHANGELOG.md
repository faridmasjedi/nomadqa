# Versions

<!-- notabs -->

What changed in each version of NomadQA. The newest is on top. The current extension version is **{{version}}**.

## [1.0.1] · your own login domain

**Logins**
- The **Login page** of a login (Settings › Logins) now has **+ Add your domain address**: type your own My Domain, such as `https://yourcompany.my.salesforce.com`, and keep it with the login. The runner already took any address in `SF_LOGIN_PAGE`.

## [1.0.0] · the first release

NomadQA: testing for Salesforce, as a browser extension (Chrome and Edge) and a headless runner for CI. No packages.

**Test data**
- A plan (objects, how many, what goes under each), field rules (auto, fixed, list, weighted, pattern, range, dates, query), **Check without saving** (rolled back), **Create** after typing the org's name, CSV, an `@IsTest` factory class, recipes, **Batches** you can delete, **Find & clone**, and the org's own automation switch.

**Tests**
- **Inspector**: point at anything, see what it is, **Add** or **Add and click** to a test, exact paths, copy, Details, a step list while picking.
- **Recorder**: do it once; clicks, typing, lists, lookups and searches become steps; **+ Check**.
- **Tests**: steps in plain words (open, click, type, choose, search, check, wait, remember, query, data, log in), step groups, test groups, copy and paste, upload and download, **Run in …**, several at once, **Stop**, **Step by step on the page**, **Fix it on the page**.
- **Failure reports**: the step, why, expected, got, and a picture; an HTML report and JUnit; the Runs screen.
- **Agent**: your own AI writes the steps; NomadQA checks every step.

**Logins**
- **Start from the login page**: the NomadQA tab shows on Salesforce login pages; a test whose first step is `Log in` needs no session before it (**Run (logs in first)**, **Run from the login page**).
- A login can be a username and password **or an SFDX auth URL**; Salesforce's two-step login page is handled.

**Runner**
- `node nomadqa/runner/run.mjs`: Node 22 and Chrome, nothing to install. `report.html`, JUnit, pictures of failed steps; `--parallel`, `--group`.
- The run itself can be a user: `SF_AUTH_URL`, or `SF_USERNAME` + `SF_PASSWORD`, or `--as <login>`; per-user variables (`NOMADQA_AUTH_URL_<NAME>`…); a `.env` file or `--env-file`; a verification code with `--code-file` (one-off tests). If every test starts with `Log in`, no user is needed. Command-line options win over the environment.

**Website, downloads and guides**
- A website on GitHub Pages with tabs, a **Download** page, a **Versions** page, a **Words** page, 15 videos and GIFs, 12 examples shown as readable steps, and a **CI** guide: a quick start, one job per automation user, secrets in GitHub, AWS, Google Cloud, Azure Key Vault and Vault, other CI systems, keeping and debugging reports.
- `nomadqa-extension.zip` and `nomadqa-runner.zip` (unzip it in your repository), MIT licence, a security policy, and a branch-protection ruleset for `main`.

---

### How a release is made

1. A pull request merged into `main` keeps one **draft release** up to date for the version in `extension/manifest.json` (its notes are the top section of this file). Nothing is public.
2. To start a new release, bump the version in `extension/manifest.json` and `package.json` and put its section at the top of this file, in a pull request.
3. When you are ready, open **Releases**, check the draft, and press **Publish release**. GitHub makes the tag `nomadqa-vX.Y.Z` at that commit.
4. The publish run then **waits for an approval** (Actions › the run › **Review deployments** › *release* › **Approve**). Once approved it builds `nomadqa-extension.zip` and `nomadqa-runner.zip`, attaches them, and rebuilds the website: the Download and Versions pages show the new version.
