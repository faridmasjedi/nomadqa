# Examples

Real tests, each run against a scratch org. They make their own data (and delete it), so they work in any org with Accounts, Contacts and Opportunities.

```sh
node runner/run.mjs examples/01-open-pages.nomadqa.json --org my-sandbox   # one test
node runner/run.mjs examples --group Smoke --org my-sandbox                # one group
```

In NomadQA: Tests › **Upload…**. Two groups are not meant to pass by default: **Demo-failing** (`11`) and **Needs-setup** (`12`).

| File | Shows |
| --- | --- |
| `01-open-pages` | open pages, wait until loaded, title / address / text / text that must not show |
| `02-add-a-contact` | click, type, save, the message, a query |
| `03-data-parent-and-children` | an account with contacts and opportunities |
| `04-find-remember-reuse` | find, save, remember, reuse `{{values}}` |
| `05-search` | a list's search box and Salesforce's search |
| `06-things-that-must-not-show` | buttons and text that must not be there; empty / filled in |
| `07-waits-and-optional-steps` | waits, keys, an optional step |
| `08-groups-of-steps` | groups, and groups in groups |
| `09-exact-paths` | XPath and JS paths |
| `10-page-structure` | counts, the page layout |
| `11-fails-on-purpose` | what a failure report looks like (group `Demo-failing`) |
| `needs-setup/12-log-in-as-a-user` | Login-As: needs that setting and a real user; not run here |

Details and patterns to copy: [docs/examples.md](../docs/examples.md).
