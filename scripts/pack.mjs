// Packs two downloads with the system zip tool (nothing to install):
//   nomadqa-extension.zip  the browser extension (Load unpacked)
//   nomadqa-runner.zip     the headless runner for CI: unzip in your repository → nomadqa/runner/run.mjs
// `node scripts/pack.mjs [folder]` writes them in the folder (default: the repository root).
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = resolve(process.argv[2] ?? root);
mkdirSync(out, { recursive: true });
const version = JSON.parse(readFileSync(join(root, 'extension/manifest.json'), 'utf8')).version;

rmSync(join(out, 'nomadqa-extension.zip'), { force: true });
execFileSync('zip', ['-qr', join(out, 'nomadqa-extension.zip'), '.', '-x', '.*'], { cwd: join(root, 'extension') });

// The runner needs runner/run.mjs and extension/core (plain modules; the runner imports them by relative path)
const stage = mkdtempSync(join(tmpdir(), 'nomadqa-runner-'));
const base = join(stage, 'nomadqa');
mkdirSync(join(base, 'runner'), { recursive: true });
mkdirSync(join(base, 'extension'), { recursive: true });
cpSync(join(root, 'runner/run.mjs'), join(base, 'runner/run.mjs'));
cpSync(join(root, 'extension/core'), join(base, 'extension/core'), { recursive: true });
cpSync(join(root, '.env.example'), join(base, '.env.example'));
writeFileSync(
  join(base, 'README.txt'),
  `NomadQA ${version}: the headless runner.\n\nPut this "nomadqa" folder in your repository (or any machine with Node 22 and Chrome), then:\n\n  node nomadqa/runner/run.mjs tests/ --org my-sandbox\n  SF_AUTH_URL=... node nomadqa/runner/run.mjs tests/ --out nomadqa-reports\n\nGuide: https://github.com/faridmasjedi/nomadqa/blob/main/docs/ci.md\n`
);
rmSync(join(out, 'nomadqa-runner.zip'), { force: true });
execFileSync('zip', ['-qr', join(out, 'nomadqa-runner.zip'), 'nomadqa'], { cwd: stage });
rmSync(stage, { recursive: true, force: true });
console.log(`nomadqa-extension.zip, nomadqa-runner.zip (${version}) in ${out}`);
