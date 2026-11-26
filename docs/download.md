# Download

Current version: **{{version}}** · what changed: [Versions](versions.md)

<div class="grid dl">
<div class="c"><h3>The extension</h3><p>For Chrome and Edge: point, record, write and run tests in your org.</p><p><a class="btn" href="download/nomadqa-extension.zip">⬇ nomadqa-extension.zip</a></p></div>
<div class="c"><h3>The runner</h3><p>For your CI or your computer: the same tests, headless. Unzip it in your repository.</p><p><a class="btn" href="download/nomadqa-runner.zip">⬇ nomadqa-runner.zip</a></p></div>
</div>

## Install the extension

:::tabs
:::tab Chrome
1. Download and unzip `nomadqa-extension.zip` to a folder you will keep (the browser reads it from there).
2. Open `chrome://extensions` and turn on **Developer mode**.
3. **Load unpacked** and choose the unzipped folder.
4. Log in to a sandbox or scratch org in the same browser and click the **NomadQA** tab on the page's right edge.
:::tab Microsoft Edge
1. Download and unzip `nomadqa-extension.zip` to a folder you will keep.
2. Open `edge://extensions` and turn on **Developer mode** (left side).
3. **Load unpacked** and choose the unzipped folder.
4. Log in to a sandbox or scratch org in the same browser and click the **NomadQA** tab on the page's right edge.
:::tab From the source
```sh
git clone https://github.com/faridmasjedi/nomadqa.git
```

Then **Load unpacked** and choose its `extension` folder. To update, `git pull` and press the reload icon of NomadQA on the extensions page.
:::end

To update from a zip: download the new one, replace the folder's contents and press reload on the extensions page.

## Use the runner

```sh
unzip nomadqa-runner.zip              # makes ./nomadqa/runner and ./nomadqa/extension/core
node nomadqa/runner/run.mjs tests/ --org my-sandbox
```

Node 22 and Chrome are all it needs. In a repository, commit the `nomadqa` folder and see [CI, secrets and reports](ci.md).

## What is in the zips

| File | Contains |
| --- | --- |
| `nomadqa-extension.zip` | the extension: `manifest.json`, `app.html`, `core/`, `content/`, `views/`, icons |
| `nomadqa-runner.zip` | `nomadqa/runner/run.mjs`, `nomadqa/extension/core/` and a short `README.txt` |

Checksums (SHA-256) of version {{version}}:

```
{{sha:ext}}  nomadqa-extension.zip
{{sha:runner}}  nomadqa-runner.zip
```

## Other ways and older versions

- All published versions, with their notes: [GitHub Releases](https://github.com/faridmasjedi/nomadqa/releases).
- The newest source as a zip: [main.zip](https://github.com/faridmasjedi/nomadqa/archive/refs/heads/main.zip).
