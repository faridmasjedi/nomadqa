# Videos and GIFs

Recorded in a real scratch org with the real extension: every video is a whole journey, from opening NomadQA to the result. No gray bars, no cuts in the middle of a step.

## Start here

### The NomadQA tour

<video src="media/video/00-tour.mp4" controls muted preload="metadata" poster="media/poster/00-tour.jpg"></video>

## Build a test

| Video | Shows |
| --- | --- |
| [**From the Inspector to a saved test**](media/video/01-inspector-to-test.mp4) (1:50) | open NomadQA › Inspector › Inspect it · hover and pin · **Add** · **Details** · **Copy** · **By its exact path** · **Add** vs **Add and click** · **Just click** · **⇆** · follow a link · **Open in Tests** › **New test from them** |
| [**From the Recorder to a saved test**](media/video/02-recorder-to-test.mp4) (1:10) | open NomadQA › Recorder › **Record in …** · App Launcher choice as one step · a list search · **+ Check** · **Stop** · **Save as a test** |
| [**Write a test and keep it organized**](media/video/03-write-and-organize-tests.mp4) (1:15) | **+ New test** · step kinds · groups of steps · test groups · copy a step · **Download** · **Upload…** |
| [**Start from the login page**](media/video/09-login-from-the-login-page.mp4) (2:00) | NomadQA on a Salesforce login page · a login saved in Settings · **Run (logs in first)** · logged in: **Run in …** and **Run from the login page** · the same logins from a `.env` file in a terminal, two tests side by side |
| [**The Agent**](media/video/07-agent.mp4) (1:00) | Settings › provider · a sentence · **Write the steps** · a wrong step flagged · **Save and run** |

## Run, fix and share

| Video | Shows |
| --- | --- |
| [**Run a test, and fix it**](media/video/04-run-fix-and-step-by-step.mp4) (2:20) | **Run in …** opens a tab and does it · a group, several at once · a failure and its picture · **Fix it on the page** · ▶ ▶▶ ✎ ▭ · **Save to the test** |
| [**Where the reports are**](media/video/05-reports.mp4) (1:00) | the result box · **Runs** · **Report** (HTML) · **JUnit** |
| [**Run it anywhere**](media/video/08-headless-and-ci.mp4) (1:00) | the headless command, its output, the report file |

## Test data

| Video | Shows |
| --- | --- |
| [**Find & clone**](media/video/10-find-and-clone.mp4) (1:20) | find records · pick · clone with the contacts under them · 3 copies · a name pattern · preview · **Check** (a duplicate rule stops them) · **Save even when a duplicate rule matches** · **Create** · **Batches** · delete |
| [**Test data**](media/video/06-test-data.mp4) (1:30) | a plan with children · rules · preview · **Check** (rolled back) · **Create** (type the org's name) · **Batches** · delete |

## One feature at a time (GIFs)

| Feature | GIF |
| --- | --- |
| Point and pin | [inspector-point-and-pin](media/gif/inspector-point-and-pin.gif) |
| Add and click | [inspector-add-and-click](media/gif/inspector-add-and-click.gif) |
| By its exact path | [inspector-exact-path](media/gif/inspector-exact-path.gif) |
| Recorder | [recorder](media/gif/recorder.gif) |
| Write a test | [write-a-test](media/gif/write-a-test.gif) |
| Groups of steps | [groups-of-steps](media/gif/groups-of-steps.gif) |
| Test groups | [test-groups](media/gif/test-groups.gif) |
| Run opens a tab | [run](media/gif/run.gif) |
| Run a group | [run-a-group](media/gif/run-a-group.gif) |
| Fail, then fix on the page | [fail-and-fix](media/gif/fail-and-fix.gif) |
| Step by step | [step-by-step](media/gif/step-by-step.gif) |
| Runs | [runs](media/gif/runs.gif) |
| The report | [report](media/gif/report.gif) |
| Test data plan | [test-data](media/gif/test-data.gif) |
| Check and create | [check-and-create](media/gif/check-and-create.gif) |
| Batches | [batches](media/gif/batches.gif) |
| Find & clone | [clone](media/gif/clone.gif) |
| Agent | [agent](media/gif/agent.gif) |
| Start from the login page | [login-from-the-login-page](media/gif/login-from-the-login-page.gif) |
| Both ways to run a login-first test | [login-both-options](media/gif/login-both-options.gif) |
| Logins from a `.env` file | [env-run](media/gif/env-run.gif) |
| Headless | [headless](media/gif/headless.gif) |

Notes: the headless clip replays the real output of `node runner/run.mjs` with the waits shortened. The login video logs in with an SFDX auth URL through a stand-in token endpoint (it hands back the scratch org's own session, so the user is the same), and hides Salesforce's login-page promo panel, which errors in automation. The terminal part replays the runner's real output; the `.env` line shows `force://…` instead of the secret. The Agent video uses a stand-in AI that returns a prepared answer (see [Agent](agent.md)).
