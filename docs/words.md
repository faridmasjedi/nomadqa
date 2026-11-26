# Words

A few words mean more than one thing in NomadQA. This page says which is which — and the docs use these names every time.

## Group

**Group** has three meanings. The docs never say "group" alone where it could be mistaken:

| Say | It is | Where you see it | In a file |
| --- | --- | --- | --- |
| **step group** | one step that holds other steps. It has a name, folds open and shut, runs as one step and fails as one step. It can hold step groups. | Tests: tick steps › **Group them**; the on-page list ▸ | `{ "action": "group", "name": "Open the Sales app", "steps": [ … ] }` |
| **test group** | a label on a test (Smoke, Regression, `sales-rep`). Tests with the same label are listed together and run together with **Run all**. | Tests: the **Group** box on a test, **+ New group**, **Run all** | `"group": "Smoke"` in the test |
| **group file** | the file you get when you **Download** a test group: every test of the group in one file. | the **Download** button on a test group's header | `*.nomadqa-group.json` with `{ "nomadqa": "group", "name": "sales-rep", "tests": [ … ] }` |

Two more that are conventions, not features:

- **A user's test group** — a test group named after an automation user (`sales-rep`). Its group file lives in `tests/nomadqa/sales-rep/`. See [CI](ci.md).
- **`--group`** in the runner picks one **test group** to run: `--group Smoke`.

*Not* a NomadQA word: Salesforce's **permission set group** and **public group**. When this documentation means one of those, it says so in full.

## Login

| Say | It is | Where |
| --- | --- | --- |
| **a login** | a name for a way to get in: a username and password, or an SFDX auth URL. Kept outside the tests. | Settings › Logins; `NOMADQA_LOGINS`, `.env`, `--logins` for the runner |
| **the Log in step** | a step `{ "action": "login", "login": "sales-rep" }`: log in with the login of that name. A test can start with it, from the login page. | Tests |
| **Log in as a user** | Salesforce's own *Login-As*: an administrator becomes another user. Needs an administrator and a setting; not a real login. | the step `loginas` |
| **the run's user** | who the headless run itself is (for its `data` and `query` steps): `SF_AUTH_URL`, or `SF_USERNAME` + `SF_PASSWORD`. | the runner's environment |

## Other words

| Word | Meaning |
| --- | --- |
| **session** | being logged in to an org in the browser. The extension needs one to run tests — except a test that starts with a **Log in** step, which makes its own. |
| **org** | one Salesforce environment: a sandbox, a scratch org, production. |
| **test** | a list of steps with a name. A file `*.nomadqa.json`. |
| **step** | one thing a test does or checks: open, click, type, check… [All steps](steps.md). |
| **run** | one execution of a test: its result, steps and time are kept in **Runs**. |
| **report** | the HTML page, and the JUnit file, a run leaves. [Reports](reports.md). |
| **recipe** | a saved plan for test data: which records, how many, their field rules. [Test data](test-data.md). |
| **batch** | the records NomadQA made in one go, kept so you can delete them. |
| **runner** | the headless command, `node nomadqa/runner/run.mjs`, for CI and your computer. [Runner](runner.md). |
| **extension** | the browser extension: Inspector, Recorder, Tests, Runs, Agent, Settings. [Download](download.md). |
