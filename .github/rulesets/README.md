# Branch protection for `main`

`protect-main.json` is a GitHub **repository ruleset**. GitHub reads rulesets as JSON (not YAML); this is the file to import.

What it does:

- `main` cannot be deleted or force-pushed.
- Changes reach `main` only through a **pull request** with **1 approval from a code owner**. `CODEOWNERS` makes the owner the only code owner, so only the owner's approval counts.
- The `test` check (the unit tests, `.github/workflows/test.yml`) must pass.
- Review conversations must be resolved; a new push dismisses an old approval.
- **Bypass:** the repository **admin** role (the owner) can bypass the rules **on pull requests**: the owner can merge their own pull request without a second approver. Nobody else can.

Apply it:

- In GitHub: **Settings › Rules › Rulesets › New ruleset › Import a ruleset** and choose `protect-main.json`; or
- With the CLI: `gh api repos/faridmasjedi/nomadqa/rulesets --method POST --input .github/rulesets/protect-main.json`

Notes: the bypass role id `5` is GitHub's *Repository admin* role. After the ruleset is active, direct pushes to `main` stop working for everyone: use pull requests.
