# Step reference

Every step is a JSON object with an `action`. Any step can also have `"optional": true` (reported, the test goes on) and `"timeout": ms`. Values can use `{{name}}` from data, **find**, **remember**.

| Action | Says | Main boxes |
| --- | --- | --- |
| `open` | Open a page | `path` · or `object` + `name` · or `record` (`{{found}}`, an Id) |
| `click` | Click | `label` (what it says); `within` a section or dialog; `type` + `choose` in the list it opens; `css` an exact path |
| `fill` | Type into a field | `field` (label or API name), `value`; or `css` |
| `pick` | Choose in a list | `field`, `value` |
| `lookup` | Choose a record in a lookup | `field`, `value` |
| `check` | Tick or untick | `field`, `value` (`true`/`false`) |
| `search` | Search and choose | `text`; `box` where to type (empty: Salesforce's search); `choose` the result (empty: press Enter) |
| `wait` | Wait | `text` until it shows · `ms` · `until: "load"` |
| `press` | Press a key | `key` (Enter, Escape, Tab…) |
| `expect` | Check | see below |
| `remember` | Remember a value | `field`, `as` → `{{as}}` |
| `query` | Find records (SOQL) | `soql` (read-only), `count`, `save` |
| `data` | Make test data | `recipe` → `{{a-1}}`, `{{a-1.Name}}`; deleted after the test |
| `login` | Log in (a test can start with it, from the login page) | `login` — a login from Settings › Logins: a username and password, or an **SFDX auth URL**. In the runner: `NOMADQA_LOGINS`, `--logins`, or `NOMADQA_AUTH_URL_<NAME>` |
| `loginas` | Log in as a user | `user` — username or name; back to you at the end |
| `shot` | Take a screenshot | — |
| `group` | Step group (a group of steps) | `name`, `steps: [...]` |

## Checks (`expect`)

| `kind` | Checks | Extra boxes |
| --- | --- | --- |
| `text` | text on the page | `value` |
| `toast` | a message | `value`, `op` |
| `field` | a field's value | `field`, `value`, `op` |
| `title` | the page title | `value`, `op` |
| `url` | the address | `value`, `op` |
| `no-text` | text is **not** shown | `value` |
| `button` / `no-button` | a button or link is / is **not** shown (permissions) | `value`, `within` |
| `count` | how many `buttons`, `tabs`, `fields`, `sections`, `related lists`, `rows` | `what`, `within`, `op`, `value` |
| `place` | where a field is (column 1 is the left) | `field`, `section`, `row`, `col` |
| `recordtype` | the record type | `op`, `value` |
| `layout` | the page layout of who is logged in | `op`, `value` |
| `element` | an element by its exact path | `css`, optional `value` |

**`op`** — `contains` · `is` · `not` · `starts` · `empty` · `filled` · `more` · `less` · `matches` (a pattern). A field can be given by label or API name: `Title`, `Contact.Title`, `MobilePhone`.

## A test file

```json
{
  "nomadqa": "test",
  "version": 1,
  "name": "Add a contact to an account",
  "group": "Create",
  "cleanup": true,
  "steps": [ ... ]
}
```

A group file (a downloaded test group) is `*.nomadqa-group.json`; NomadQA's own JUnit reports can be uploaded to run again.
