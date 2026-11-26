# CI, secrets and reports

Run each automation user's tests on every change, and get a report to debug when one breaks.

## How it works

You have automation users — each with its own profile, permission sets and licence — and a group of tests for each. The whole flow:

:::tabs
:::tab 1 · Create
A QA logs in **as the automation user** (username and password, or the user's SFDX auth URL), opens NomadQA and builds the tests there — pointing, recording or writing. They are saved in a **group named after the user**.
:::tab 2 · Store
**Download** the group and commit it: `tests/nomadqa/sales-rep/sales-rep.nomadqa-group.json`.
:::tab 3 · Run
CI logs in **as that user** from a secret and runs the group. Tests that passed yesterday must pass today: a regression run.
:::tab 4 · Debug
When one fails, the report is kept. A QA opens `report.html` (the step, why, expected, got, a picture), reproduces it in NomadQA as that user, fixes the test or reports the bug.
:::end

Each user is **one job**: its own credentials, its own group, its own report. Thirty users are thirty jobs side by side.

```
your-repo/
├─ nomadqa/                           ← the runner (nomadqa-runner.zip)
├─ tests/nomadqa/
│  ├─ sales-rep/sales-rep.nomadqa-group.json
│  ├─ service-agent/service-agent.nomadqa-group.json
│  └─ …one folder per automation user
└─ .github/workflows/nomadqa.yml      ← one job per user
```

Test data comes from the sandbox or from the tests' own `data` steps. Both run with **that user's own permissions** — nothing needs an administrator. The user must be allowed to read (and, for `data` steps, create) the records its tests use.

The runner's exit code: `0` all passed · `1` a test failed · `2` it could not run (no tests, no login, no Chrome).

## Create the tests

Do this once per automation user, in a sandbox.

:::tabs
:::tab Username and password
1. Open the sandbox's login page (`https://test.salesforce.com`) in Chrome or Edge with the extension installed ([Download](download.md)).
2. Log in as the automation user.
3. Click the **NomadQA** tab on the page's right edge.
:::tab SFDX auth URL
If you only have the user's SFDX auth URL (a file holding `force://…`):

```sh
sf org login sfdx-url --sfdx-url-file sales-rep.txt --alias sales-rep
sf org open --target-org sales-rep        # opens the browser, logged in as that user
```

Then click the **NomadQA** tab on the page's right edge.
:::end

Build the tests with the [Inspector](inspector.md), the [Recorder](recorder.md) or by hand in [Tests](tests.md). You already are that user, so the tests need **no Log in step**.

Then put them in a group named after the user, and download it:

1. In Tests, set each test's **Group** to **+ New group** › the user's name (for example `sales-rep`).
2. On the group's header press **Download**: one file, `sales-rep.nomadqa-group.json`, holds all of the user's tests.
3. Commit it as `tests/nomadqa/sales-rep/sales-rep.nomadqa-group.json`.

Run the group once in NomadQA (**Run all**) before you commit: a test that passes there passes in CI, because both use the same engine.

## Runner in your repo

The runner is two things: `runner/run.mjs` and the folder `extension/core/`. No packages. Choose how to bring them in.

:::tabs
:::tab Download the zip (recommended)
Download **`nomadqa-runner.zip`** from the [Download](download.md) page, unzip it in the root of your repository and commit the `nomadqa` folder it makes. The pipeline then needs no second checkout.

```
your-repo/nomadqa/
├─ runner/run.mjs
├─ extension/core/*.js
└─ README.txt
```

To update, download the newer zip and replace the folder.
:::tab I downloaded the extension
`nomadqa-extension.zip` holds `core/` but not the runner. Put the two pieces in your repository like this:

```
your-repo/nomadqa/
├─ runner/run.mjs        ← from the repository: runner/run.mjs
└─ extension/core/       ← the unzipped extension's  core/  folder
```

The runner finds `core` by the path `../extension/core` from `run.mjs`, so keep those names. (The runner zip does exactly this for you.)
:::tab Git submodule
```sh
git submodule add https://github.com/faridmasjedi/nomadqa.git nomadqa
git commit -m "add nomadqa"
```

In the workflow use `actions/checkout@v4` with `submodules: true`. Update with `git submodule update --remote nomadqa`.
:::tab Clone in the job
No files in your repository; the job fetches NomadQA each time. Pin a version with `ref:`.

```yaml
- uses: actions/checkout@v4
  with:
    repository: faridmasjedi/nomadqa
    ref: main
    path: nomadqa
```
:::end

## Secrets

CI needs each user's credentials. The runner reads them from **environment variables**: whatever store you use only has to put them there when the job starts.

| The run is that user — set one of | Variables |
| --- | --- |
| **SFDX auth URL** (recommended: no password, no MFA prompt) | `SF_AUTH_URL` = `force://…` |
| **Username and password** | `SF_USERNAME`, `SF_PASSWORD`, and `SF_LOGIN_PAGE` (`https://test.salesforce.com` for a sandbox or scratch org; the default is `https://login.salesforce.com`) |

**Get an SFDX auth URL** once per user, signed in as that user:

```sh
sf org login web --alias sales-rep --instance-url https://test.salesforce.com
sf org display --verbose --json --target-org sales-rep      # result.sfdxAuthUrl
```

**A login page that asks to verify the user cannot be passed.** Salesforce may send an email code or ask for multi-factor authentication when a user logs in from a machine it does not know, and a CI machine is always new. A username and password therefore works only where Salesforce does not ask: the CI's IP range is trusted (Setup › Network Access), or the test users are exempt from verification as your security team allows. An **SFDX auth URL does not ask**, so prefer it. A run never waits for a code by itself: it stops at once with a clear message and a screenshot of the page (`verification.jpg` in the reports). For a one-off test on your own computer you can give the code: `--code-file code.txt` makes the run wait up to 15 minutes for the emailed code to appear in that file. (NomadQA handles Salesforce's two-step login page — the username, then the password — and stops with a clear message at a verification page.)

An auth URL (a refresh token) and a password both **let anyone act as that user**. Keep them in a secret store; never in the repository, a log or a test file. Salesforce allows only a few refresh tokens per user and connected app (by default 5; the oldest is revoked), so log each user in once and keep the URL.

**On your own computer** put the same variables in a file named `.env` in the folder you run from (`--env-file path` for another name). The runner reads it; a variable already set in the environment wins, so in CI the secrets win and no file is needed.

```sh
cp .env.example .env        # fill it in: SF_AUTH_URL, or SF_USERNAME and SF_PASSWORD
node nomadqa/runner/run.mjs tests/nomadqa/sales-rep
```

`.env` holds credentials: **never commit it** (this repository ignores it; add `.env` to your own `.gitignore`). `.env.example` shows the names.

**One user per job.** Name the secrets the same for every user and keep users apart with one **GitHub Environment** each; the job takes the environment of its user. In the other stores keep one secret per user and read it into the same variables.

:::tabs
:::tab GitHub
**Settings › Environments › New environment** → `sales-rep` → **Add environment secret** `SF_AUTH_URL` (or `SF_USERNAME` and `SF_PASSWORD`, plus the environment variable `SF_LOGIN_PAGE`). Repeat for each user. An environment can also require a reviewer before a job runs.

A job then says `environment: sales-rep` and reads `${{ secrets.SF_AUTH_URL }}` — see the workflow in *GitHub Actions*.

Without environments: repository secrets `SF_AUTH_URL_SALES_REP`, … and in the job `SF_AUTH_URL: ${{ secrets.SF_AUTH_URL_SALES_REP }}`.
:::tab AWS
**Secrets Manager** keeps one secret per user; GitHub Actions signs in with **OIDC**, so no AWS key is stored anywhere.

```sh
aws secretsmanager create-secret --name nomadqa/sales-rep/auth-url --secret-string "force://…"
```

```yaml
permissions:
  contents: read
  id-token: write

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/nomadqa-ci
      aws-region: eu-west-1
  - name: Read this user's secret
    run: |
      value=$(aws secretsmanager get-secret-value --secret-id "nomadqa/${{ matrix.user }}/auth-url" --query SecretString --output text)
      echo "::add-mask::$value"
      echo "SF_AUTH_URL=$value" >> "$GITHUB_ENV"
```

Give the role `secretsmanager:GetSecretValue` on `nomadqa/*` only. For a username and password store `{"username":"…","password":"…"}` and split it with `jq -r .username` into `SF_USERNAME` and `SF_PASSWORD`.
:::tab Google Cloud
**Secret Manager** keeps one secret per user; **Workload Identity Federation** lets GitHub Actions read it with no long-lived key.

```sh
printf '%s' "force://…" | gcloud secrets create nomadqa-sales-rep-auth-url --data-file=-
```

```yaml
permissions:
  contents: read
  id-token: write

steps:
  - uses: google-github-actions/auth@v2
    with:
      workload_identity_provider: projects/123456789/locations/global/workloadIdentityPools/github/providers/github
      service_account: nomadqa@my-project.iam.gserviceaccount.com
  - id: secrets
    uses: google-github-actions/get-secretmanager-secrets@v2
    with:
      secrets: |-
        SF_AUTH_URL:my-project/nomadqa-${{ matrix.user }}-auth-url
  - name: Run the tests
    env:
      SF_AUTH_URL: ${{ steps.secrets.outputs.SF_AUTH_URL }}
    run: node nomadqa/runner/run.mjs tests/nomadqa/${{ matrix.user }} --out nomadqa-reports
```

Give the service account *Secret Manager Secret Accessor* on the `nomadqa-*` secrets.
:::tab Azure Key Vault
```sh
az keyvault secret set --vault-name my-vault --name nomadqa-sales-rep-auth-url --value "force://…"
```

In the job, after `azure/login`:

```sh
value=$(az keyvault secret show --vault-name my-vault --name "nomadqa-${USER_NAME}-auth-url" --query value -o tsv)
echo "::add-mask::$value"
echo "SF_AUTH_URL=$value" >> "$GITHUB_ENV"
```
:::tab Vault and others
**HashiCorp Vault**, 1Password, Doppler, Kubernetes secrets: read the value into `SF_AUTH_URL` right before the command.

```sh
export SF_AUTH_URL="$(vault kv get -field=auth_url secret/nomadqa/sales-rep)"
node nomadqa/runner/run.mjs tests/nomadqa/sales-rep --out nomadqa-reports
```
:::tab CI variables
GitLab, Jenkins, Azure DevOps and Bitbucket keep secrets as **masked variables**. Name them `SF_AUTH_URL_SALES_REP`, `SF_AUTH_URL_SERVICE_AGENT`, … and pick the one of the job's user:

```sh
key=$(echo "$USER_NAME" | tr 'a-z-' 'A-Z_')          # sales-rep → SALES_REP
export SF_AUTH_URL="$(printenv "SF_AUTH_URL_$key")"
```

See *Other CI* for the pipelines.
:::end

## GitHub Actions

`.github/workflows/nomadqa.yml`. One job per automation user, all at the same time, each in its own **Environment** with its own secrets:

```yaml
name: nomadqa
on:
  pull_request:
  workflow_dispatch:
  schedule:
    - cron: '0 3 * * *'                # every night

jobs:
  users:
    runs-on: ubuntu-latest             # has Node and Chrome
    timeout-minutes: 30
    strategy:
      fail-fast: false                 # one failing user must not cancel the others
      max-parallel: 6                  # six jobs at once
      matrix:
        user: [sales-rep, service-agent, finance-user]    # one entry per automation user
    environment: ${{ matrix.user }}    # that user's secrets
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Run ${{ matrix.user }}'s tests
        env:
          SF_AUTH_URL: ${{ secrets.SF_AUTH_URL }}          # the user's SFDX auth URL…
          SF_USERNAME: ${{ secrets.SF_USERNAME }}          # …or the user's username and password
          SF_PASSWORD: ${{ secrets.SF_PASSWORD }}
          SF_LOGIN_PAGE: ${{ vars.SF_LOGIN_PAGE }}         # https://test.salesforce.com for a sandbox
        run: node nomadqa/runner/run.mjs tests/nomadqa/${{ matrix.user }} --parallel 2 --out nomadqa-reports
      - name: Keep the reports
        if: always()                   # also when tests failed
        uses: actions/upload-artifact@v4
        with:
          name: nomadqa-reports-${{ matrix.user }}
          path: nomadqa-reports/
          retention-days: 30
          if-no-files-found: ignore

  all-reports:
    needs: users
    if: always()                       # also when a user's job failed
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          pattern: nomadqa-reports-*
          path: all-reports            # one folder per user
      - name: One summary for every user
        run: |
          for f in all-reports/*/summary.md; do
            echo "### $(basename "$(dirname "$f")")" >> "$GITHUB_STEP_SUMMARY"
            cat "$f" >> "$GITHUB_STEP_SUMMARY"
          done
      - uses: actions/upload-artifact@v4
        with:
          name: nomadqa-all-reports
          path: all-reports/
```

To use the clone or submodule instead of a committed `nomadqa` folder, add that checkout before the run step (see *Runner in your repo*).

Pull requests from forks get no secrets: run on branches of the repository itself, on `workflow_dispatch`, or on a schedule.

## Other CI

The same job in other systems: pick the user's secret, run the folder, keep the folder. `USER_NAME` is the user's name (`sales-rep`); see *Secrets › CI variables* for the one-line mapping to `SF_AUTH_URL`.

:::tabs
:::tab GitLab CI
Masked variables `SF_AUTH_URL_SALES_REP`, … (Settings › CI/CD › Variables).

```yaml
nomadqa:
  image: node:22
  parallel:
    matrix:
      - USER_NAME: [sales-rep, service-agent, finance-user]
  before_script:
    - apt-get update && apt-get install -y chromium
  script:
    - key=$(echo "$USER_NAME" | tr 'a-z-' 'A-Z_')
    - export SF_AUTH_URL="$(printenv "SF_AUTH_URL_$key")"
    - CHROME_PATH=/usr/bin/chromium node nomadqa/runner/run.mjs tests/nomadqa/$USER_NAME --out nomadqa-reports
  artifacts:
    when: always
    expire_in: 30 days
    paths: [nomadqa-reports/]
    reports:
      junit: nomadqa-reports/*.junit.xml
```
:::tab Jenkins
A *Secret text* credential per user (`sf-auth-url-sales-rep`). The agent needs Node 22 and Chrome (or set `CHROME_PATH`).

```groovy
pipeline {
  agent any
  stages {
    stage('NomadQA') {
      matrix {
        axes { axis { name 'USER_NAME'; values 'sales-rep', 'service-agent', 'finance-user' } }
        stages {
          stage('Run') {
            steps {
              withCredentials([string(credentialsId: "sf-auth-url-${USER_NAME}", variable: 'SF_AUTH_URL')]) {
                sh 'node nomadqa/runner/run.mjs tests/nomadqa/$USER_NAME --out nomadqa-reports/$USER_NAME'
              }
            }
          }
        }
      }
    }
  }
  post {
    always {
      archiveArtifacts artifacts: 'nomadqa-reports/**', allowEmptyArchive: true
      junit allowEmptyResults: true, testResults: 'nomadqa-reports/**/*.junit.xml'
    }
  }
}
```
:::tab Azure DevOps
Secret variables `SF_AUTH_URL_SALES_REP`, … (or a variable group linked to Key Vault). Secrets are **not** passed to scripts automatically: map them in `env`.

```yaml
strategy:
  matrix:
    sales-rep:
      USER_NAME: sales-rep
    service-agent:
      USER_NAME: service-agent
steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '22.x'
  - script: |
      key=$(echo "$USER_NAME" | tr 'a-z-' 'A-Z_')
      export SF_AUTH_URL="$(printenv "SF_AUTH_URL_$key")"
      node nomadqa/runner/run.mjs tests/nomadqa/$USER_NAME --out nomadqa-reports
    displayName: NomadQA
    env:
      SF_AUTH_URL_SALES_REP: $(SF_AUTH_URL_SALES_REP)
      SF_AUTH_URL_SERVICE_AGENT: $(SF_AUTH_URL_SERVICE_AGENT)
  - task: PublishPipelineArtifact@1
    condition: always()
    inputs:
      targetPath: nomadqa-reports
      artifact: nomadqa-reports-$(USER_NAME)
  - task: PublishTestResults@2
    condition: always()
    inputs:
      testResultsFormat: JUnit
      testResultsFiles: 'nomadqa-reports/*.junit.xml'
```
:::tab Bitbucket and CircleCI
**Bitbucket Pipelines**: *secured* repository variables `SF_AUTH_URL_SALES_REP`, …

```yaml
pipelines:
  default:
    - parallel:
        - step:
            name: sales-rep
            image: node:22
            script:
              - apt-get update && apt-get install -y chromium
              - SF_AUTH_URL="$SF_AUTH_URL_SALES_REP" CHROME_PATH=/usr/bin/chromium node nomadqa/runner/run.mjs tests/nomadqa/sales-rep --out nomadqa-reports
            artifacts:
              - nomadqa-reports/**
            after-script:               # runs after a failure too: copy the reports to storage here
              - echo "copy nomadqa-reports to S3 or another store"
```

**CircleCI**: project environment variables or a context; use an image with a browser (`cimg/node:22.0-browsers`) and `store_artifacts` / `store_test_results` on `nomadqa-reports`. Steps after a failing step are skipped unless set to run always — check CircleCI's documentation for your version.
:::tab Google Cloud Build
Secret Manager secret per user, read with `availableSecrets`. One build per user (set `_USER` in the trigger).

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
        CHROME_PATH=/usr/bin/chromium node nomadqa/runner/run.mjs tests/nomadqa/$_USER --out nomadqa-reports; echo $? > exit-code
  - id: keep
    name: gcr.io/google.com/cloudsdktool/cloud-sdk
    args: ['gcloud', 'storage', 'cp', '--recursive', 'nomadqa-reports', 'gs://my-qa-reports/nomadqa/$BUILD_ID/$_USER/']
  - id: result
    name: bash
    args: ['-c', 'exit $(cat exit-code)']      # fail the build after the reports are kept
availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/nomadqa-$_USER-auth-url/versions/latest
      env: SF_AUTH_URL
```
:::tab AWS CodeBuild
`buildspec.yml`. One build per user (set `USER_NAME` as a build environment variable).

```yaml
version: 0.2
env:
  secrets-manager:
    SF_AUTH_URL: nomadqa/sales-rep/auth-url     # one project per user, or read it in a command
phases:
  install:
    runtime-versions:
      nodejs: 22
    commands:
      - apt-get update && apt-get install -y chromium
  build:
    commands:
      - CHROME_PATH=/usr/bin/chromium node nomadqa/runner/run.mjs tests/nomadqa/$USER_NAME --out nomadqa-reports
  post_build:                       # runs after a failed build phase too
    commands:
      - aws s3 sync nomadqa-reports s3://my-qa-reports/nomadqa/$CODEBUILD_BUILD_NUMBER/$USER_NAME/
```

The `post_build` phase runs even when the tests failed, so the reports reach S3 either way. (CodeBuild's own `artifacts` and `reports` sections are for a build that succeeds; do not rely on them for failed runs.)
:::end

## Reports and debugging

**When a test fails, the run is not lost.** The runner writes its reports before it exits with `1`; your pipeline only has to keep them (`if: always()` in GitHub Actions).

| File in `--out` | For | What it is |
| --- | --- | --- |
| `report.html` | QAs | one page: every test and step with its time and, for each failure, **why**, **expected**, **got**, Salesforce's messages and a **picture** of the page. Opens in any browser |
| `*.junit.xml` | CI, and NomadQA | your CI's test tab; **Tests › Upload…** in NomadQA runs that test again |
| `*-stepN.jpg` | QAs | the page when step N failed (also in the report) |
| `summary.md` | the job page | a short table; GitHub Actions shows it on the run's Summary |

**Where to find them on GitHub Actions:** the run's **Summary** (table, one error per failed test), and **Artifacts** at the bottom of the run's page: `nomadqa-reports-sales-rep.zip` → unzip → open `report.html`.

### A QA debugs a failure

1. **Read the report**: the failed step, why, expected and got, and the picture. A wrong value is a bug; a missing button may be a changed permission or a changed label.
2. **Reproduce as that user**: log in to the sandbox as the automation user (see *Create the tests*), open NomadQA.
3. **Tests › Upload…** and choose the group file from the repository, or the `*.junit.xml` from the artifact. **Run** it, or open **Step by step on the page** to watch each step; **Fix it on the page** takes you to the step that failed.
4. **Fix the test** (change a step, a label, a path) and run it again — or file the bug.
5. **Download** the group again, commit it, and let CI prove it passes.

### Keeping them longer

| Store | How | Good for |
| --- | --- | --- |
| **CI artifact** | `upload-artifact` with `if: always()`, `retention-days` | the default: one click from the run |
| **Amazon S3** | `aws s3 sync nomadqa-reports s3://bucket/nomadqa/$RUN_ID/$USER/` | long retention; share with `aws s3 presign` |
| **Google Cloud Storage** | `gcloud storage cp --recursive nomadqa-reports gs://bucket/nomadqa/$RUN_ID/$USER/` | the same; share with a signed URL |
| **Azure Blob Storage** | `az storage blob upload-batch -d nomadqa -s nomadqa-reports --destination-path $RUN_ID/$USER` | Azure teams |
| **GitHub Pages** | publish the folder (only if everyone who can see the site may see the report) | a stable link |
| **A ticket or a chat** | attach `report.html` to Jira or the pull request, or post `summary.md` | the person who must act |

Put the **run id** in the path so runs never overwrite each other, keep failed runs longer than passed ones, and remember that reports can show screenshots of your org's data: keep them where only the team can read, and use a sandbox.

## Many users

**Add a user** (the 31st):

1. Create the tests as that user and download the group (*Create the tests*).
2. Commit it as `tests/nomadqa/<user>/<user>.nomadqa-group.json`.
3. Create a GitHub Environment `<user>` with `SF_AUTH_URL` (or `SF_USERNAME` and `SF_PASSWORD`).
4. Add `<user>` to the `matrix.user` list.

**Sizing**

- Start with `max-parallel: 6` and `--parallel 2`, then raise. GitHub limits concurrent jobs by plan (for example 20 on the free plan).
- Each test opens its own browser context. A busy org or a small runner can miss a message ("toast") check, so back important changes with a `query` step.
- Each user's job logs in once. Salesforce limits concurrent logins and API calls per org, not per job; spread the schedule if you see throttling.
- Reports are **per user**: each job has its own `report.html`, JUnit and pictures. The last job gathers them into one artifact and one summary; the JUnit files can also go to your CI's test tab together.

**One job for several users** (when you prefer one run): keep each user's login outside the tests and let a test say who to be with a `Log in` step:

```sh
NOMADQA_AUTH_URL_SALES_REP=force://…        # the login "sales-rep"
NOMADQA_AUTH_URL_SERVICE_AGENT=force://…    # the login "service-agent"
SF_AUTH_URL=force://…                       # the user the run starts as (data and queries)
node nomadqa/runner/run.mjs tests/nomadqa --parallel 3 --out nomadqa-reports
```

```json
{ "action": "login", "login": "sales-rep" }
```

A test that logs in runs in a browser context of its own, so the next test is not that user. (`Log in as a user` — Salesforce's Login-As — needs an administrator and is not needed for this flow.)

## Troubleshooting

| You see | Do |
| --- | --- |
| `Chrome not found` | set `CHROME_PATH` or `--chrome /path`; install `chromium` on Debian or Ubuntu images |
| exit code `2`, `Give --as … --auth-url …` | `SF_AUTH_URL` (or `SF_USERNAME` and `SF_PASSWORD`) is empty: a secret was not passed (a fork, a missing `env:` line, or the wrong environment) |
| `The auth URL should look like force://…` | the secret has extra quotes or a line break; paste only the `force://…` value |
| `Salesforce did not accept the auth URL` | the refresh token was revoked or the user changed: log in again with `sf org login web`, read the new URL and update the secret; check the login IP restrictions |
| `Salesforce asks to verify the user (a code sent by email)` | the machine is new to Salesforce: trust the CI's IP range in Setup › Network Access, or use an SFDX auth URL, which does not ask. `verification.jpg` in the reports shows the page |
| `Still not in Salesforce … a wrong username or password` | check the password and `SF_LOGIN_PAGE` (sandbox: `https://test.salesforce.com`; production: `https://login.salesforce.com`) |
| login works but data steps fail | that user lacks permission to create or read the records: fix the user's permission set, or use records that exist in the sandbox |
| tests are slow | lower `--parallel`; use a nearer runner |
