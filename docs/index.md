<div class="hero">
<img src="media/icon.png" alt="NomadQA" width="96" style="margin:0 auto;border:0;box-shadow:none;border-radius:22px">
<h1>NomadQA</h1>
<p>Testing for Salesforce, in plain words. A browser extension to point, record and run tests — and a headless runner for your CI. <b>No packages. No build step.</b></p>
<div class="cta"><a class="btn" href="download.html">⬇ Download {{version}}</a><a class="btn alt" href="getting-started.html">Get started in 2 minutes</a><a class="btn alt" href="videos.html">Watch the videos</a><a class="btn alt" href="https://github.com/faridmasjedi/nomadqa">GitHub</a></div>
</div>

<video src="media/video/00-tour.mp4" controls muted preload="metadata" poster="media/poster/00-tour.jpg"></video>

*The NomadQA tour — [all the videos](videos.md).*

## What you can do

<div class="grid">
<div class="c"><h3>Point at anything</h3><img src="media/gif/inspector-point-and-pin.gif" alt="The Inspector"><p>Hover to see what a thing is, pin it, and add a check or a click to your test.</p></div>
<div class="c"><h3>Add, or Add and click</h3><img src="media/gif/inspector-add-and-click.gif" alt="Add and click"><p>Add puts the step in; Add and click also does it, so you keep picking where you land.</p></div>
<div class="c"><h3>Do it once</h3><img src="media/gif/recorder.gif" alt="The Recorder"><p>Use Salesforce as usual. Clicks, typing, lists, lookups and searches become steps.</p></div>
<div class="c"><h3>Write it in words</h3><img src="media/gif/write-a-test.gif" alt="Writing a test"><p>Open, click, type, choose, search, check — each step reads back as a sentence.</p></div>
<div class="c"><h3>Keep them organized</h3><img src="media/gif/test-groups.gif" alt="Test groups"><p>Group steps, group tests (Smoke, Regression…), copy, download, upload.</p></div>
<div class="c"><h3>Run it for you</h3><img src="media/gif/run.gif" alt="Running a test"><p>A tab of your org opens and NomadQA does the steps. One at a time, or 2–8 at once.</p></div>
<div class="c"><h3>Fix it on the page</h3><img src="media/gif/fail-and-fix.gif" alt="A failure, then the fix"><p>The step, what was expected, what the page had, a picture — then fix it on the real page.</p></div>
<div class="c"><h3>Step by step</h3><img src="media/gif/step-by-step.gif" alt="Step by step on the page"><p>▶ one step, ▶▶ to the end; change a step and save it back to the test.</p></div>
<div class="c"><h3>Make test data</h3><img src="media/gif/test-data.gif" alt="Test data"><p>Real-looking records with their links, checked in a rolled-back transaction first.</p></div>
<div class="c"><h3>Reports</h3><img src="media/gif/report.gif" alt="The report"><p>One HTML page for people, JUnit for your CI — in Runs, and from the runner.</p></div>
<div class="c"><h3>Ask the Agent</h3><img src="media/gif/agent.gif" alt="The Agent"><p>Say what to test; your AI writes the steps and NomadQA checks every one.</p></div>
<div class="c"><h3>Run it anywhere</h3><img src="media/gif/headless.gif" alt="The headless runner"><p>One command in any CI. The same engine, the same tests.</p></div>
</div>

## Download

<div class="grid dl">
<div class="c"><h3>The extension</h3><p>Chrome and Edge · version {{version}}</p><p><a class="btn" href="download/nomadqa-extension.zip">⬇ nomadqa-extension.zip</a></p></div>
<div class="c"><h3>The runner</h3><p>For CI and your computer · version {{version}}</p><p><a class="btn" href="download/nomadqa-runner.zip">⬇ nomadqa-runner.zip</a></p></div>
<div class="c"><h3>What changed</h3><p>Every version, with its notes.</p><p><a class="btn alt" href="versions.html">Versions</a></p></div>
</div>

How to install them: [Download](download.md).

## Why it is different

- **Steps name what a person sees** — buttons by what they say, fields by their label. Never CSS or ids, so tests survive Salesforce's releases. (When you need an exact path, you can use one.)
- **One engine** runs your steps in the browser and in headless Chrome alike. A test that passes in the extension passes in CI.
- **Safe by default.** Every write to an org asks you to type the org's name first. Setup stays read-only for tests. Nothing heavy runs until you click.
- **No packages.** Plain JavaScript the browser loads as it is; Node 22 and Chrome for the runner.

## Where next

| I want to… | Read |
| --- | --- |
| Download it | [Download](download.md) · [Versions](versions.md) |
| Install it and run a first test | [Get started](getting-started.md) |
| Build, run, edit and use tests — every way | [Tests](tests.md) |
| Copy a test that already works | [Examples](examples.md) |
| Run tests in GitHub Actions, GitLab, Jenkins… | [Run anywhere](runner.md) |
| See where the reports are | [Reports](reports.md) |
| Let an AI write the first draft | [Agent](agent.md) |
| Look up a step | [Step reference](steps.md) |
