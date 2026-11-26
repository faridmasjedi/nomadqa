# Examples

Every file in [`examples/`](https://github.com/faridmasjedi/nomadqa/tree/main/examples) is a real test, run against a scratch org. They make their own data, so they work in any org with Accounts, Contacts and Opportunities — and clean up after themselves.

```sh
node runner/run.mjs examples --org my-sandbox            # all of them
node runner/run.mjs examples --group Smoke --org my-sandbox
```

In NomadQA: Tests › **Upload…** and choose a file.

## What you get from them

- **Read**: each test is shown below as the sentences you see in Tests, so you learn the step words by reading real, working tests.
- **Run**: download a file and upload it in Tests, or run the whole folder headless — they make their own data and clean up.
- **Adapt**: every one follows the same shape — *make data → open → do → check the screen → check the database* — so you change the names and keep the shape.
- **Trust**: they were run against a scratch org on 26 Nov 2026: 01–10 pass, 11 fails on purpose, 12 was not run.

Limits: they assume the Sales app and standard Account, Contact and Opportunity; a custom org with other layouts or required fields may need a name or a field changed.

## Every example

Open **The steps** to read a test as sentences — the same words you see in Tests — or download the file.

### 01-open-pages

**Group:** Smoke · **Shows:** open pages, wait until loaded, check the title, the address, text, text that must **not** show, and take a screenshot.

**You learn:** The smallest useful test: a smoke check that the main pages open. Start here.

{{example:01-open-pages}}

### 02-add-a-contact

**Group:** Create · **Shows:** make an account, open it, **click** New Contact, **type**, save, check the **message**, and check the database with a **query**.

**You learn:** The full create flow: data → open → act → check the screen → check the database.

{{example:02-add-a-contact}}

### 03-data-parent-and-children

**Group:** Data · **Shows:** an account with 3 contacts and 2 opportunities, checked by queries and by the related lists.

**You learn:** How a **recipe** makes a parent with children and how `{{a-1}}` names the records.

{{example:03-data-parent-and-children}}

### 04-find-remember-reuse

**Group:** Data · **Shows:** **find** a record by query and **save** it, **remember** a field, edit it, and use the values later as `{{found.Name}}`.

**You learn:** How a test carries values from one step to the next.

{{example:04-find-remember-reuse}}

### 05-search

**Group:** Search · **Shows:** search a list's box, Salesforce's search at the top, and **choose** a result.

**You learn:** The two kinds of search and how a result is chosen.

{{example:05-search}}

### 06-things-that-must-not-show

**Group:** Permissions · **Shows:** a button or text that must **not** be there, and a field that is **empty** or **filled in**.

**You learn:** The checks for what a user must not see — the base of permission tests.

{{example:06-things-that-must-not-show}}

### 07-waits-and-optional-steps

**Group:** Smoke · **Shows:** waits, a key press, and an **optional** step that may be missing — the test goes on.

**You learn:** How to make a test steady, and how to allow a step to fail.

{{example:07-waits-and-optional-steps}}

### 08-groups-of-steps

**Group:** Groups · **Shows:** **groups** and a group in a group.

**You learn:** How steps are grouped, named, and read as one.

{{example:08-groups-of-steps}}

### 09-exact-paths

**Group:** Advanced · **Shows:** find, click and type by an exact **XPath** or **JS path**.

**You learn:** When nothing says what an element is, use its path.

{{example:09-exact-paths}}

### 10-page-structure

**Group:** Advanced · **Shows:** **count** tabs, related lists and buttons, and check the page **layout**.

**You learn:** Checks on how a page is made, not only what it says.

{{example:10-page-structure}}

### 11-fails-on-purpose

**Group:** Demo-failing · **Shows:** a failing test, to see what a failure report shows.

**You learn:** What you get when a test fails: step, why, expected, got, picture. Run it once to see.

{{example:11-fails-on-purpose}}

### 12-log-in-as-a-user

**Group:** Permissions · **Shows:** **log in as** another user.

**You learn:** Test what another user sees. Needs "Administrators Can Log in as Any User" and a real user name; **not run** in the scratch org used for these examples.

{{example:12-log-in-as-a-user}}

## Patterns worth copying

**Make your own data, then use it.**

```json
{ "action": "data", "recipe": { "name": "Demo", "nodes": [
  { "id": "a", "object": "Account", "count": 1,
    "rules": { "Name": { "kind": "pattern", "value": "NomadQA Demo {0000}" } } } ] } },
{ "action": "open", "record": "{{a-1}}" },
{ "action": "expect", "kind": "title", "value": "{{a-1.Name}}" }
```

**Check the database, not only the screen.**

```json
{ "action": "query", "soql": "SELECT Id FROM Contact WHERE AccountId = '{{a-1}}'", "count": 3 }
```

**Save a row, then use its values.**

```json
{ "action": "query", "soql": "SELECT Id, Name FROM Account WHERE Id = '{{a-1}}'", "save": "found" },
{ "action": "open", "record": "{{found}}" },
{ "action": "fill", "field": "Description", "value": "{{found.Name}}" }
```

**Let a step fail without failing the test.** Add `"optional": true` (and a short `"timeout": 2000`).

## Notes from running them

- A message ("toast") disappears quickly. If you run many tests at once (`--parallel`), a check for a message can be missed on a busy machine — add a `query` step as the safety net, as `02` does.
- After opening a page, a `wait` with `"until": "load"` makes the next step steadier.
