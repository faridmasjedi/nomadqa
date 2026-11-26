# CI, secrets and reports

How to run NomadQA tests in your pipeline, where the login secret comes from, where the reports end up, and how to keep them when a test fails.

> These recipes use the runner's documented options and environment variables (`SF_AUTH_URL`, `--out`, exit codes). The runner itself is tested; the pipeline files below are templates — adjust names, versions and paths, and try them on a branch first.

## The idea, in three steps

1. **Get the runner into your repository** (a download, a submodule, or a clone).
2. **Log in without a person.** Give the runner an SFDX auth URL in a secret named `SF_AUTH_URL`.
3. **Run one command and keep the reports** — *even when the run fails*, which is when you need them.

```sh
node nomadqa/runner/run.mjs tests/nomadqa --out nomadqa-reports
```

Exit code: `0` all passed · `1` a test failed · `2` it could not run (no tests, no login, no Chrome).

## 1 · Get the runner into your repository

The runner is two things: `runner/run.mjs` and the folder `extension/core/`. Nothing else, and no packages. Choose how you bring them in.

:::tabs
:::tab Download the zip (recommended)
Download **`nomadqa-runner.zip`** from the [Download](download.md) page and unzip it in the root of your repository. Commit the `nomadqa` folder it makes — the pipeline then needs no second checkout.

```
your-repo/
├─ nomadqa/                       ← from nomadqa-runner.zip
│  ├─ runner/run.mjs
│  ├─ extension/core/*.js
│  └─ README.txt
├─ tests/nomadqa/                 ← your tests (Tests › Download saves *.nomadqa.json)
│  ├─ add-a-contact.nomadqa.json
│  └─ smoke.nomadqa-group.json
└─ .github/workflows/nomadqa.yml  ← the workflow below
```

To update, download the newer zip and replace the folder.
:::tab I downloaded the extension
`nomadqa-extension.zip` holds the extension, which contains `core/` but not the runner. Take the two pieces and put them in your repository like this:

```
your-repo/
└─ nomadqa/
   ├─ runner/run.mjs              ← from the repository: runner/run.mjs
   └─ extension/core/             ← the unzipped extension's  core/  folder
```

The runner finds `core` by the path `../extension/core` from `run.mjs`, so keep those names. (The runner zip does exactly this for you.)
:::tab Git submodule
```sh
git submodule add https://github.com/faridmasjedi/nomadqa.git nomadqa
git commit -m "add nomadqa"
```

In the workflow use `actions/checkout@v4` with `submodules: true`. Update with `git submodule update --remote nomadqa`.
:::tab Clone in the job
No files in your repository; the job fetches NomadQA each time (pin a version with `ref:`):

```yaml
- uses: actions/checkout@v4
  with:
    repository: faridmasjedi/nomadqa
    ref: main
    path: nomadqa
```

If NomadQA is private, add a `token:` that can read it.
:::end

## 2 · Get the login secret

Use a **sandbox or scratch org**, and if you can a dedicated integration user.

```sh
sf org login web --alias ci-sandbox --instance-url https://test.salesforce.com
sf org display --verbose --json -o ci-sandbox   # copy result.sfdxAuthUrl
```

The value looks like `force://PlatformCLI::<refresh token>@your-domain.my.salesforce.com`. **It is a password**: it lets anyone act as that user. Store it only in a secret store, never in the repository, a log or a test file.

- A scratch org made by `sf org create scratch` may show no `sfdxAuthUrl`; log in once with `sf org login web` (or `sf org login sfdx-url`) and read it again.
- The runner exchanges it for a session, in memory. Nothing is written but the reports.
- If the org restricts login IPs, hosted CI machines change address: allow the integration user's profile to log in from anywhere, or use a self-hosted runner with a fixed address.
- Tests that **Log in** as other users need their passwords: put them in a second secret `NOMADQA_LOGINS` (JSON, see [Run anywhere](runner.md)).

## 3 · GitHub Actions

### Add the secret

Repository **Settings › Secrets and variables › Actions › New repository secret** → name `SF_AUTH_URL`, value the auth URL.
For approval before a run touches an org, use an **Environment** (Settings › Environments) with required reviewers and put the secret there.

### The workflow

`.github/workflows/nomadqa.yml` in the repository that holds your tests (with the `nomadqa` folder committed):

```yaml
name: nomadqa
on:
  pull_request:
  workflow_dispatch:
  schedule:
    - cron: '0 3 * * *'          # nightly

concurrency:
  group: nomadqa-sandbox           # two runs must not use the same org at once
  cancel-in-progress: false

jobs:
  test:
    runs-on: ubuntu-latest         # has Node and Chrome
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Run the tests
        env:
          SF_AUTH_URL: ${{ secrets.SF_AUTH_URL }}
        run: node nomadqa/runner/run.mjs tests/nomadqa --group Smoke --parallel 2 --out nomadqa-reports
      - name: Keep the reports
        if: always()               # also when tests failed
        uses: actions/upload-artifact@v4
        with:
          name: nomadqa-reports
          path: nomadqa-reports/
          retention-days: 30
          if-no-files-found: ignore
```

Using the clone or submodule instead? Add the matching checkout from step 1 before "Run the tests".

### Where to find the result

| Where | What |
| --- | --- |
| **The run's Summary page** | a table of tests and, for each failure, the step and why (the runner writes it by itself) |
| **Annotations** on the run and the pull request | one error per failed test |
| **Artifacts** (bottom of the run's page) | `nomadqa-reports.zip`: download, unzip, open **`report.html`** |

Use `if: always()` to keep reports for every run, or `if: failure()` to keep them only when something failed. Artifacts are deleted after `retention-days` (default 90, at most as your plan allows).

### Show JUnit as a test list (optional)

The runner writes `*.junit.xml`. Any action that reads JUnit can list tests in the pull request, for example `dorny/test-reporter` (pointed at `nomadqa-reports/*.junit.xml`, reporter `java-junit`). Not needed for the summary and artifact above.

### Pull requests from forks

Secrets are **not** given to workflows from forks. Run NomadQA on branches of the repository itself, on `workflow_dispatch`, or on a schedule.

## 4 · Other places: secrets from Google Cloud and AWS, other CI

The runner only needs `SF_AUTH_URL` in its environment. Anything that can put a value there at run time works. Pick yours:

:::tabs
:::tab Google Cloud
**Secret Manager** keeps the value; **Workload Identity Federation** lets GitHub Actions read it with no long-lived key.

```sh
printf '%s' "$AUTH_URL" | gcloud secrets create nomadqa-sf-auth-url --data-file=-
```

#### In GitHub Actions

```yaml
permissions:
  contents: read
  id-token: write                      # for the federation

steps:
  - uses: google-github-actions/auth@v2
    with:
      workload_identity_provider: projects/123456789/locations/global/workloadIdentityPools/github/providers/github
      service_account: nomadqa@my-project.iam.gserviceaccount.com
  - id: secrets
    uses: google-github-actions/get-secretmanager-secrets@v2
    with:
      secrets: |-
        SF_AUTH_URL:my-project/nomadqa-sf-auth-url
  - name: Run the tests
    env:
      SF_AUTH_URL: ${{ steps.secrets.outputs.SF_AUTH_URL }}
    run: node nomadqa/runner/run.mjs tests/nomadqa --out nomadqa-reports
  - name: Keep the reports in Cloud Storage
    if: always()
    run: |
      gcloud storage cp --recursive nomadqa-reports \
        gs://my-qa-reports/nomadqa/${{ github.repository }}/${{ github.run_id }}/
```

The service account needs *Secret Manager Secret Accessor* on the secret and *Storage Object Creator* on the bucket.

#### Cloud Build (no GitHub needed)

```yaml
# cloudbuild.yaml
steps:
  - id: tests
    name: node:22
    entrypoint: bash
    secretEnv: ['SF_AUTH_URL']
    args:
      - -c
      - |
        apt-get update && apt-get install -y chromium
        CHROME_PATH=/usr/bin/chromium node nomadqa/runner/run.mjs tests/nomadqa --out nomadqa-reports; echo $? > exit-code
  - id: keep
    name: gcr.io/google.com/cloudsdktool/cloud-sdk
    args: ['gcloud', 'storage', 'cp', '--recursive', 'nomadqa-reports', 'gs://my-qa-reports/nomadqa/$BUILD_ID/']
  - id: result
    name: bash
    args: ['-c', 'exit $(cat exit-code)']      # fail the build after the reports are kept
availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/nomadqa-sf-auth-url/versions/latest
      env: SF_AUTH_URL
```


:::tab AWS

**Secrets Manager** keeps the value; GitHub Actions signs in with **OIDC** (no stored AWS keys).

```sh
aws secretsmanager create-secret --name nomadqa/sf-auth-url --secret-string "$AUTH_URL"
```

#### In GitHub Actions

```yaml
permissions:
  contents: read
  id-token: write

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/nomadqa-ci
      aws-region: eu-west-1
  - name: Read the secret
    run: |
      value=$(aws secretsmanager get-secret-value --secret-id nomadqa/sf-auth-url --query SecretString --output text)
      echo "::add-mask::$value"
      echo "SF_AUTH_URL=$value" >> "$GITHUB_ENV"
  - name: Run the tests
    run: node nomadqa/runner/run.mjs tests/nomadqa --out nomadqa-reports
  - name: Keep the reports in S3
    if: always()
    run: |
      aws s3 sync nomadqa-reports s3://my-qa-reports/nomadqa/${{ github.repository }}/${{ github.run_id }}/
```

The role needs `secretsmanager:GetSecretValue` on that secret and `s3:PutObject` on the bucket prefix.

#### AWS CodeBuild (`buildspec.yml`)

```yaml
version: 0.2
env:
  secrets-manager:
    SF_AUTH_URL: nomadqa/sf-auth-url
phases:
  install:
    runtime-versions:
      nodejs: 22
    commands:
      - apt-get update && apt-get install -y chromium
  build:
    commands:
      - CHROME_PATH=/usr/bin/chromium node nomadqa/runner/run.mjs tests/nomadqa --out nomadqa-reports
  post_build:                       # runs after a failed build phase too
    commands:
      - aws s3 sync nomadqa-reports s3://my-qa-reports/nomadqa/$CODEBUILD_BUILD_NUMBER/
artifacts:
  files:
    - 'nomadqa-reports/**/*'
reports:
  nomadqa:
    files: ['nomadqa-reports/*.junit.xml']
    file-format: JUNITXML
```

The `post_build` phase runs even when the tests failed, so the reports reach S3 either way. (CodeBuild's own `artifacts` and test `reports` sections are for a build that succeeds; do not rely on them for failed runs.)


:::tab GitLab CI
Variable: **Settings › CI/CD › Variables** → `SF_AUTH_URL`, *masked* and *protected*.

```yaml
nomadqa:
  image: node:22
  before_script:
    - apt-get update && apt-get install -y chromium
  script:
    - CHROME_PATH=/usr/bin/chromium node nomadqa/runner/run.mjs tests/nomadqa --out nomadqa-reports
  artifacts:
    when: always
    expire_in: 30 days
    paths: [nomadqa-reports/]
    reports:
      junit: nomadqa-reports/*.junit.xml
```
:::tab Jenkins
Credential: a *Secret text* with id `sf-auth-url`. The agent needs Node 22 and Chrome (or set `CHROME_PATH`).

```groovy
pipeline {
  agent any
  stages {
    stage('NomadQA') {
      steps {
        withCredentials([string(credentialsId: 'sf-auth-url', variable: 'SF_AUTH_URL')]) {
          sh 'node nomadqa/runner/run.mjs tests/nomadqa --out nomadqa-reports'
        }
      }
    }
  }
  post {
    always {
      archiveArtifacts artifacts: 'nomadqa-reports/**', allowEmptyArchive: true
      junit allowEmptyResults: true, testResults: 'nomadqa-reports/*.junit.xml'
    }
  }
}
```
:::tab Azure DevOps
Secret: a secret variable, or a variable group linked to Key Vault. Secrets are **not** passed to scripts automatically — map it in `env`.

```yaml
steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '22.x'
  - script: node nomadqa/runner/run.mjs tests/nomadqa --out nomadqa-reports
    displayName: NomadQA
    env:
      SF_AUTH_URL: $(SF_AUTH_URL)
  - task: PublishPipelineArtifact@1
    condition: always()
    inputs:
      targetPath: nomadqa-reports
      artifact: nomadqa-reports
  - task: PublishTestResults@2
    condition: always()
    inputs:
      testResultsFormat: JUnit
      testResultsFiles: 'nomadqa-reports/*.junit.xml'
```
:::tab Bitbucket and CircleCI
**Bitbucket Pipelines**: a *secured* repository variable `SF_AUTH_URL`.

```yaml
pipelines:
  default:
    - step:
        image: node:22
        script:
          - apt-get update && apt-get install -y chromium
          - CHROME_PATH=/usr/bin/chromium node nomadqa/runner/run.mjs tests/nomadqa --out nomadqa-reports
        artifacts:
          - nomadqa-reports/**
        after-script:               # runs after a failure too: copy the reports to storage here
          - echo "copy nomadqa-reports to S3 or another store"
```

**CircleCI**: a project environment variable or a context; use an image with a browser (`cimg/node:22.0-browsers`) and `store_artifacts` / `store_test_results` on `nomadqa-reports`. Steps after a failing step are skipped unless they are set to run always — check CircleCI's documentation for your version.
:::tab Vault and others
**HashiCorp Vault**, 1Password, Doppler, Azure Key Vault, Kubernetes secrets: read the value into the environment variable `SF_AUTH_URL` right before the command, for example

```sh
export SF_AUTH_URL="$(vault kv get -field=auth_url secret/nomadqa)"
node nomadqa/runner/run.mjs tests/nomadqa --out nomadqa-reports
```

Then copy the folder to storage (below).
:::end

## 5 · Getting the reports

| File in `--out` | For | Open it |
| --- | --- | --- |
| `report.html` | people | any browser; every test and step with its time, and for each failure why, expected and got, and the picture |
| `*.junit.xml` | your CI | your CI's test results tab, or NomadQA: Tests › **Upload…** runs that test again |
| `*-stepN.jpg` | people | the page when step N failed (also inside the report) |
| `summary.md` | the job page | a short table; on GitHub Actions it is shown on the run's Summary |

**Always upload the whole folder** — `report.html` and the pictures belong together.

## 6 · Keeping them: when a test fails, and for longer

The runner writes the reports before it exits with `1`, so a failed run still has them. What matters is that your pipeline **uploads on failure too**.

| Store | How | Good for |
| --- | --- | --- |
| **CI artifact** | `upload-artifact` with `if: always()` (or `failure()`), `retention-days` | the default: one click from the run, no setup |
| **Amazon S3** | `aws s3 sync nomadqa-reports s3://bucket/nomadqa/$RUN_ID/` | long retention, any team. Share with `aws s3 presign` (expiring link) or a bucket policy; a lifecycle rule deletes old runs |
| **Google Cloud Storage** | `gcloud storage cp --recursive nomadqa-reports gs://bucket/nomadqa/$RUN_ID/` | the same; share with a signed URL or IAM |
| **Azure Blob Storage** | `az storage blob upload-batch -d nomadqa -s nomadqa-reports --destination-path $RUN_ID` | Azure shops |
| **GitHub Pages** | publish the folder (only if the report may be public to those who can see the site; Pages on a private repository needs a paid plan) | a stable link |
| **SharePoint / network drive** | copy the folder | teams that live there |
| **A ticket or a chat** | attach `report.html` to Jira or the pull request, or post `summary.md` | the person who must act |

Tips:

- Put the **run id** in the path (`$GITHUB_RUN_ID`, `$BUILD_ID`, `$CI_PIPELINE_ID`) so runs do not overwrite each other.
- Keep failed runs longer than passed ones: use `if: failure()` for a second, long-retention upload.
- Reports can show screenshots of your org's data. Keep them where only the team can read, and use a sandbox with test data.

## 7 · Running it well

- **Groups**: run `--group Smoke` on every pull request and the full folder nightly.
- **Parallel**: `--parallel 2` is a good start; each test gets its own browser context. A message ("toast") check can be missed on a busy machine, so back important changes with a `query` step.
- **One org at a time**: use `concurrency` (GitHub) or a resource group so two pipelines do not fight over the same sandbox.
- **Test data** a test makes is deleted at its end; a run killed by the CI timeout can leave some behind — see Batches in the extension.
- **No retry option** exists; re-run the job.

## 8 · Many users: 30 test users, a group of tests for each

Your case: about 30 automation users, each with its own profile, permission set or permission set group, and a group of tests for each. Test data is made by one admin or integration user — the session of `SF_AUTH_URL`; the `data` and `query` steps always use it, whoever the screen is. NomadQA logs in **as each user** and runs that user's tests.

### How a test logs in as a user

A test starts with a **Log in** step that names a login. A login is a name for how to get in, kept **outside** the test file:

:::tabs
:::tab SFDX auth URL of each user (recommended)
Each user has an **SFDX auth URL** (a refresh token): no password, no login page, no MFA prompt. One secret per user, **named after the login**:

```sh
# once per user, signed in as that user
sf org login web --alias sales-rep --instance-url https://test.salesforce.com
sf org display --verbose --json -o sales-rep        # result.sfdxAuthUrl  → store it as a secret
```

Give the runner the secrets as environment variables — `NOMADQA_AUTH_URL_<NAME>` becomes the login `<name>` (lower case, `_` becomes `-`):

```sh
SF_AUTH_URL=...                          # the admin session: data and queries
NOMADQA_AUTH_URL_SALES_REP=force://...   # the login "sales-rep"
NOMADQA_AUTH_URL_SERVICE_AGENT=force://...   # the login "service-agent"
node nomadqa/runner/run.mjs tests/nomadqa --group Sales --parallel 3 --out nomadqa-reports
```

Or one JSON file for all of them (`--logins logins.json`, or the secret `NOMADQA_LOGINS`):

```json
{ "sales-rep":      { "authUrl": "force://…" },
  "service-agent":  { "authUrl": "force://…" } }
```

The test names the login, never the secret:

```json
{ "nomadqa": "test", "version": 1, "name": "Sales rep: no Delete, sees Opportunities", "group": "Sales", "cleanup": true,
  "steps": [
    { "action": "data", "recipe": { "name": "One account", "nodes": [ { "id": "a", "object": "Account", "count": 1 } ] } },
    { "action": "login", "login": "sales-rep" },
    { "action": "open", "record": "{{a-1}}" },
    { "action": "expect", "kind": "no-button", "value": "Delete" },
    { "action": "expect", "kind": "layout", "op": "contains", "value": "Sales" },
    { "action": "expect", "kind": "count", "what": "related lists", "op": "more", "value": "2" }
  ] }
```

- A real session of that user, so what you check is what that user's profile, permission sets, permission set groups and licence give. The `{{a-1}}` record was made by the admin.
- Every test that logs in runs in **its own browser context**, so the next test is not that user, and such tests run side by side with `--parallel`.
- Salesforce limits the refresh tokens a user can have per connected app (by default 5; the oldest is revoked). Log each user in once and keep the URL. If one is revoked the test says *Salesforce did not accept the auth URL*.
:::tab Username and password
One secret `NOMADQA_LOGINS` (JSON) with every user:

```json
{ "sales-rep":     { "url": "https://test.salesforce.com", "username": "sales.rep@acme.com.uat",  "password": "…" },
  "service-agent": { "url": "https://test.salesforce.com", "username": "agent@acme.com.uat",      "password": "…" } }
```

The test is the same as above (`{ "action": "login", "login": "sales-rep" }`). The runner types the username and password on the login page, so MFA, IP ranges and password rules apply — use test users that are exempt in a sandbox. Keep the JSON in a secret manager and rotate it.
:::tab One admin and Log in as
If you do not want 30 secrets: **Log in as a user** (Salesforce's Login-As) from the admin session, by username or name:

```json
{ "action": "loginas", "user": "sales.rep@acme.com.uat" }
```

Needs **Administrators Can Log in as Any User** (Setup › Login Access Policies). It shows what that user's profile and permission sets allow, but it is not a real login (no login page, MFA or IP rules). Not run live in the scratch org used for these docs: its Login-As is off.
:::end

### Where the 30 secrets live

Whatever holds them, the job only needs them in the environment (or in a file for `--logins`) when it runs.

:::tabs
:::tab GitHub secrets
One repository secret per user (`NOMADQA_AUTH_URL_SALES_REP`, …), or one secret `NOMADQA_LOGINS` with the whole JSON. In the job, list only the secrets that this group needs:

```yaml
    env:
      SF_AUTH_URL: ${{ secrets.SF_AUTH_URL }}
      NOMADQA_AUTH_URL_SALES_REP: ${{ secrets.NOMADQA_AUTH_URL_SALES_REP }}
      NOMADQA_AUTH_URL_SALES_MANAGER: ${{ secrets.NOMADQA_AUTH_URL_SALES_MANAGER }}
```

or `NOMADQA_LOGINS: ${{ secrets.NOMADQA_LOGINS }}`. A GitHub **Environment** per group (`environment: Sales`) keeps each group's secrets apart and can ask for approval.
:::tab AWS Secrets Manager
One secret holding the whole JSON is the simplest:

```sh
aws secretsmanager create-secret --name nomadqa/logins --secret-string file://logins.json
```

In the job (after `aws-actions/configure-aws-credentials`, see above):

```sh
aws secretsmanager get-secret-value --secret-id nomadqa/logins --query SecretString --output text > logins.json
node nomadqa/runner/run.mjs tests/nomadqa --logins logins.json --out nomadqa-reports
rm -f logins.json
```

With **one secret per user** (`nomadqa/persona/sales-rep`, …), build the file in the job:

```sh
aws secretsmanager list-secrets --filters Key=name,Values=nomadqa/persona/ --query 'SecretList[].Name' --output text | tr '\t' '\n' |
while read -r n; do
  v=$(aws secretsmanager get-secret-value --secret-id "$n" --query SecretString --output text)
  jq -n --arg k "${n##*/}" --arg v "$v" '{($k): {authUrl: $v}}'
done | jq -s 'add' > logins.json
```
:::tab Google Secret Manager
```sh
gcloud secrets create nomadqa-logins --data-file=logins.json
```

In the job (after `google-github-actions/auth`, see above):

```sh
gcloud secrets versions access latest --secret=nomadqa-logins > logins.json
node nomadqa/runner/run.mjs tests/nomadqa --logins logins.json --out nomadqa-reports
rm -f logins.json
```

Or one secret per user and `NOMADQA_AUTH_URL_<NAME>` variables from `get-secretmanager-secrets` (a `secrets:` line per user).
:::tab Vault and others
```sh
vault kv get -format=json secret/nomadqa/logins | jq '.data.data' > logins.json
node nomadqa/runner/run.mjs tests/nomadqa --logins logins.json --out nomadqa-reports
rm -f logins.json
```

Anything that can write that JSON file or set those variables works: Azure Key Vault, 1Password, Doppler, Kubernetes secrets.
:::end

Never upload `logins.json`: upload only the `nomadqa-reports` folder, and delete the file after the run.

### Put each user's tests in a group, and run a group per job

Give the tests of each user (or each family of users) a **group**: `Sales`, `Service`, `Finance`… (Tests › Group, or `"group"` in the file), or a folder each. A matrix then gives **one job per group**, all at once, and `--parallel` runs tests side by side inside:

```yaml
name: nomadqa-users
on:
  workflow_dispatch:
  schedule:
    - cron: '0 3 * * *'

jobs:
  users:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    strategy:
      fail-fast: false               # one failing group must not cancel the others
      max-parallel: 6                # six jobs at once
      matrix:
        group: [Sales, Service, Finance, Marketing, Community, Admin]
    environment: ${{ matrix.group }}   # each group's Environment holds its users' secrets
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Run this group
        env:
          SF_AUTH_URL: ${{ secrets.SF_AUTH_URL }}          # the admin session (repository secret)
          NOMADQA_LOGINS: ${{ secrets.NOMADQA_LOGINS }}    # this group's users (environment secret)
        run: node nomadqa/runner/run.mjs tests/nomadqa --group "${{ matrix.group }}" --parallel 3 --out nomadqa-reports
      - name: Keep this group's reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: nomadqa-reports-${{ matrix.group }}
          path: nomadqa-reports/
          retention-days: 30
          if-no-files-found: ignore

  all-reports:
    needs: users
    if: always()                      # also when a group failed
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          pattern: nomadqa-reports-*
          path: all-reports           # one folder per group
      - name: One summary for every group
        run: |
          for f in all-reports/*/summary.md; do echo "### $(basename "$(dirname "$f")")" >> "$GITHUB_STEP_SUMMARY"; cat "$f" >> "$GITHUB_STEP_SUMMARY"; done
      - uses: actions/upload-artifact@v4
        with:
          name: nomadqa-all-reports
          path: all-reports/
```

Other CI: GitLab `parallel: matrix`, Azure DevOps `strategy: matrix`, Jenkins `parallel` stages, CircleCI `parallelism`.

### Sizing and good manners

- **Start with 6 jobs × `--parallel 2`**, then raise. Each test that logs in opens its own browser context; a busy org or a small runner can miss a message ("toast") check, so back important changes with a `query`.
- All jobs share one org and one admin session for data: do not run two copies of the whole workflow at once (`concurrency`).
- Reports are **per job**: each group has its own `report.html`, JUnit and pictures. The last job gathers them into one artifact and one summary; the JUnit files can also go to your CI's test tab together.
- GitHub limits how many jobs run at once by plan (for example 20 on the free plan).
- Build each user's tests from the checks that show permissions: a button or link that must (not) be there, a field's place or value, the page layout, the record type, counts of tabs, fields and related lists.
- Checked live: the login by auth URL through a stand-in token endpoint (same user), the isolated browser per login test, and the environment-variable form. Not checked live: real distinct users and Login-As (your org).

## 9 · Troubleshooting

| You see | Do |
| --- | --- |
| `Chrome not found` | set `CHROME_PATH` or `--chrome /path`; install `chromium` on Debian/Ubuntu images |
| exit code `2`, `Give --org … --auth-url` | `SF_AUTH_URL` is empty (a secret is not passed to forks, or the `env:` line is missing) |
| `The auth URL should look like force://…` | the secret has extra quotes or a line break; paste only the `force://…` value |
| `Salesforce did not accept the auth URL` | the refresh token was revoked or the user/org changed: log in again and update the secret; check the login IP restrictions |
| everything slow | set a nearer region for self-hosted runners; reduce `--parallel` if the org throttles logins |
