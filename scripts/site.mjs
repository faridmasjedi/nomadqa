// Builds the GitHub Pages site: docs/*.md → site/*.html (plain Node, no packages). `node scripts/site.mjs`
import { readdirSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, cpSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { stepText } from '../extension/core/steps.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const docs = join(root, 'docs');
const out = join(root, 'site');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slug = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
const link = (href) => (/^(https?:|#|mailto:)/.test(href) ? href : href.replace(/\.md(#|$)/, '.html$1'));

function inline(s) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => (codes.push(`<code>${esc(c)}</code>`), `\u0000${codes.length - 1}\u0000`));
  s = s.replace(/<(?!\/?(?:kbd|br|b|i|em|strong|a|img|span|video|source|details|summary)\b)/g, '&lt;');
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, h) => `<a href="${link(h)}">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[i]);
}

let tabCount = 0;
function render(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  let html = '', i = 0, toc = [];
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) {
      const lang = l.slice(3).trim(); const buf = [];
      for (i++; i < lines.length && !/^```/.test(lines[i]); i++) buf.push(lines[i]);
      i++; html += `<pre><code class="lang-${lang}">${esc(buf.join('\n'))}</code></pre>\n`; continue;
    }
    if (/^:::tabs\s*$/.test(l)) { // :::tabs · :::tab Name … :::tab Other … :::end
      const panels = []; let cur = null;
      for (i++; i < lines.length && !/^:::end\s*$/.test(lines[i]); i++) {
        const t = /^:::tab (.+)$/.exec(lines[i]);
        if (t) { cur = { name: t[1].trim(), lines: [] }; panels.push(cur); } else if (cur) cur.lines.push(lines[i]);
      }
      i++;
      const id = `t${++tabCount}`;
      html += `<div class="tabs"><div class="tablist" role="tablist">${panels.map((p, n) => `<button role="tab" id="${id}-${n}" aria-controls="${id}-p${n}" aria-selected="${n === 0}" tabindex="${n === 0 ? 0 : -1}">${inline(p.name)}</button>`).join('')}</div>${panels.map((p, n) => `<div class="tabpanel" role="tabpanel" id="${id}-p${n}" aria-labelledby="${id}-${n}"${n ? ' hidden' : ''}>${render(p.lines.join('\n')).html}</div>`).join('')}</div>\n`;
      continue;
    }
    if (/^<(div|video|figure|details|p|img|table)\b/.test(l)) { // raw block, until a blank line
      const buf = []; for (; i < lines.length && lines[i].trim() !== ''; i++) buf.push(lines[i]); html += buf.join('\n') + '\n'; continue;
    }
    const h = /^(#{1,4}) (.*)/.exec(l);
    if (h) { const t = inline(h[2]); const id = slug(h[2]); if (h[1].length === 2) toc.push([id, h[2].replace(/`/g, '')]); html += `<h${h[1].length} id="${id}">${t}</h${h[1].length}>\n`; i++; continue; }
    if (/^\|/.test(l) && /^\|[\s:|-]+\|?\s*$/.test(lines[i + 1] ?? '')) {
      const cells = (r) => r.replace(/^\||\|\s*$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
      const head = cells(l); i += 2; const rows = [];
      for (; i < lines.length && /^\|/.test(lines[i]); i++) rows.push(cells(lines[i]));
      html += `<div class="table"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>\n`; continue;
    }
    if (/^\s*([-*]|\d+\.) /.test(l)) {
      const ordered = /^\s*\d+\./.test(l); const items = [];
      for (; i < lines.length && (/^\s*([-*]|\d+\.) /.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length)); i++) {
        if (/^\s*([-*]|\d+\.) /.test(lines[i])) items.push(lines[i].replace(/^\s*([-*]|\d+\.) /, '')); else items[items.length - 1] += ' ' + lines[i].trim();
      }
      html += `<${ordered ? 'ol' : 'ul'}>${items.map((x) => `<li>${inline(x)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>\n`; continue;
    }
    if (/^> /.test(l)) { const buf = []; for (; i < lines.length && /^> ?/.test(lines[i]); i++) buf.push(lines[i].replace(/^> ?/, '')); html += `<blockquote>${inline(buf.join(' '))}</blockquote>\n`; continue; }
    if (l.trim() === '' || /^<!--.*-->\s*$/.test(l)) { i++; continue; }
    const buf = []; for (; i < lines.length && lines[i].trim() !== '' && !/^(#{1,4} |```|\||\s*([-*]|\d+\.) |> |<(div|video|figure|details))/.test(lines[i]); i++) buf.push(lines[i]);
    html += `<p>${inline(buf.join(' '))}</p>\n`;
  }
  return { html, toc };
}

const NAV = [
  ['index', 'Home'], ['getting-started', 'Start'], ['inspector', 'Inspector'], ['recorder', 'Recorder'],
  ['tests', 'Tests'], ['reports', 'Reports'], ['test-data', 'Test data'], ['agent', 'Agent'], ['runner', 'Runner'], ['ci', 'CI'], ['examples', 'Examples'], ['steps', 'Steps'], ['words', 'Words'], ['videos', 'Videos'], ['download', 'Download'], ['versions', 'Versions'],
];
const CSS = readFileSync(join(docs, 'site.css'), 'utf8');
const TABS_JS = `(function(){function setup(t){var tl=t.querySelector(':scope > .tablist'),tabs=[].slice.call(tl.querySelectorAll(':scope > [role=tab]')),panels=[].slice.call(t.querySelectorAll(':scope > .tabpanel'));function pick(n,keep){tabs.forEach(function(b,k){b.setAttribute('aria-selected',k===n);b.tabIndex=k===n?0:-1;panels[k].hidden=k!==n});if(t.classList.contains('page-tabs')&&!keep)history.replaceState(null,'','#'+panels[n].id)}tabs.forEach(function(b,n){b.onclick=function(){pick(n)};b.onkeydown=function(e){var k=e.key==='ArrowRight'?n+1:e.key==='ArrowLeft'?n-1:-1;if(k>=0&&k<tabs.length){pick(k);tabs[k].focus()}}});t.pick=pick;t.panels=panels}document.querySelectorAll('.tabs').forEach(setup);function fromHash(){var id=decodeURIComponent(location.hash.slice(1));if(!id)return;var el=document.getElementById(id);if(!el)return;var p=el.closest('.tabpanel');while(p){var t=p.parentElement;var n=t.panels.indexOf(p);if(n>=0&&p.hidden)t.pick(n,true);p=t.closest('.tabpanel')}el.scrollIntoView()}fromHash();addEventListener('hashchange',fromHash)})();`;
const page = (file, title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title === 'Home' ? 'NomadQA — testing for Salesforce' : `${title} · NomadQA`}</title><meta name="description" content="Testing for Salesforce: a Chrome/Edge extension and a headless runner for CI. No packages.">
<link rel="icon" href="media/icon.png"><style>${CSS}</style></head><body>
<header><a class="brand" href="index.html"><img src="media/icon.png" alt="" width="28" height="28">NomadQA</a>
<nav>${NAV.map(([f, t]) => `<a href="${f}.html"${f === file ? ' class="on"' : ''}>${t}</a>`).join('')}<a href="https://github.com/faridmasjedi/nomadqa">GitHub</a></nav></header>
<main><article>${body}</article></main>
<script>${TABS_JS}</script><noscript><style>.tabpanel[hidden]{display:block}</style></noscript>
<footer>NomadQA · plain JavaScript, no packages · <a href="https://github.com/faridmasjedi/nomadqa">source</a></footer></body></html>`;

/** A page's sections (## headings) become tabs; the text before the first one stays above them. */
function pageWithTabs(md) {
  if (/<!--\s*notabs\s*-->/.test(md)) return render(md).html;
  const lines = md.replace(/\r/g, '').split('\n');
  const intro = []; const sections = []; let fence = false; let cur = null;
  for (const l of lines) {
    if (/^```/.test(l)) fence = !fence;
    const h = !fence && /^## (.+)$/.exec(l);
    if (h) { cur = { title: h[1].replace(/^\d+\s*[·.]\s*/, '').replace(/`/g, ''), lines: [] }; sections.push(cur); continue; }
    (cur ? cur.lines : intro).push(l);
  }
  if (sections.length < 3) return render(md).html;
  const id = `pt${++tabCount}`;
  const ids = sections.map((x) => slug(x.title));
  return render(intro.join('\n')).html +
    `<div class="tabs page-tabs"><div class="tablist" role="tablist">${sections.map((x, n) => `<button role="tab" id="${id}-${n}" aria-controls="${ids[n]}" aria-selected="${n === 0}" tabindex="${n === 0 ? 0 : -1}">${esc(x.title)}</button>`).join('')}</div>` +
    sections.map((x, n) => `<div class="tabpanel" role="tabpanel" id="${ids[n]}" aria-labelledby="${id}-${n}"${n ? ' hidden' : ''}>${render(x.lines.join('\n')).html}</div>`).join('') + '</div>';
}

// ---- releases: the published GitHub Releases are the source of truth for "the latest version" and its downloads.
// (Before the first release, and in a local build with no network, the site offers the current build as a preview.)
async function publishedReleases() {
  try {
    const raw = process.env.NOMADQA_RELEASES_FILE
      ? JSON.parse(readFileSync(process.env.NOMADQA_RELEASES_FILE, 'utf8'))
      : await (await fetch('https://api.github.com/repos/faridmasjedi/nomadqa/releases?per_page=50', { headers: { accept: 'application/vnd.github+json', ...(process.env.GH_TOKEN ? { authorization: `Bearer ${process.env.GH_TOKEN}` } : {}) } })).json();
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((r) => !r.draft && /^nomadqa-v\d+\.\d+\.\d+$/.test(r.tag_name))
      .map((r) => ({ version: r.tag_name.replace(/^nomadqa-v/, ''), date: (r.published_at ?? '').slice(0, 10), pre: Boolean(r.prerelease), assets: Object.fromEntries((r.assets ?? []).map((a) => [a.name, { url: a.browser_download_url, digest: String(a.digest ?? '').replace(/^sha256:/, '') }])) }));
  } catch {
    return [];
  }
}
const manifestVersion = JSON.parse(readFileSync(join(root, 'extension/manifest.json'), 'utf8')).version;
const releases = await publishedReleases();
const latest = releases[0] ?? null;
const version = latest ? latest.version : manifestVersion;
const previewWanted = !releases.some((r) => r.version === manifestVersion); // the build on main, not released yet
const LATEST = 'https://github.com/faridmasjedi/nomadqa/releases/latest/download';
const sha = { ext: '', runner: '' };
mkdirSync(join(out, 'download'), { recursive: true });
if (previewWanted) {
  execFileSync('node', [join(root, 'scripts/pack.mjs'), join(out, 'download')], { stdio: 'ignore' });
  for (const [k, f] of [['ext', 'nomadqa-extension'], ['runner', 'nomadqa-runner']])
    if (!latest) sha[k] = createHash('sha256').update(readFileSync(join(out, 'download', `${f}.zip`))).digest('hex');
}
if (latest) {
  sha.ext = latest.assets['nomadqa-extension.zip']?.digest || '(see the release page)';
  sha.runner = latest.assets['nomadqa-runner.zip']?.digest || '(see the release page)';
}
// a download link in the docs: the latest release when there is one, else the preview build of this site
const downloadLink = (name) => (latest ? `${LATEST}/${name}` : `download/${name}`);

// ---- older versions: their zips are built from git (a commit), so each can be downloaded
const versions = JSON.parse(readFileSync(join(docs, 'versions.json'), 'utf8'));
const gitOut = (args, opts = {}) => execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'], ...opts });
function versionZips(v) {
  const dir = join(out, 'download', 'versions'); mkdirSync(dir, { recursive: true });
  const made = {};
  try { gitOut(['rev-parse', '--verify', `${v.ref}^{commit}`]); } catch { console.warn(`version ${v.version}: ${v.ref} is not in this clone (checkout with fetch-depth: 0)`); return made; }
  const tmp = mkdtempSync(join(tmpdir(), 'nomadqa-v-'));
  const untar = (paths, into) => { mkdirSync(into, { recursive: true }); const tar = gitOut(['archive', '--format=tar', v.ref, ...paths], { maxBuffer: 1 << 28 }); execFileSync('tar', ['-x', '-C', into], { input: tar }); };
  untar(['extension'], tmp);
  execFileSync('zip', ['-qr', join(dir, `nomadqa-extension-${v.version}.zip`), '.', '-x', '.*'], { cwd: join(tmp, 'extension') });
  made.ext = `download/versions/nomadqa-extension-${v.version}.zip`;
  if (v.runner) {
    untar(['runner/run.mjs', 'extension/core'], join(tmp, 'nomadqa'));
    execFileSync('zip', ['-qr', join(dir, `nomadqa-runner-${v.version}.zip`), 'nomadqa'], { cwd: tmp });
    made.runner = `download/versions/nomadqa-runner-${v.version}.zip`;
  }
  rmSync(tmp, { recursive: true, force: true });
  return made;
}
const links = (ext, runner) => `${ext ? `<a href="${ext}">extension</a>` : '—'}${runner ? ` · <a href="${runner}">runner</a>` : ''}`;
const versionRows = [];
if (previewWanted)
  versionRows.push(`<tr><td><b>${manifestVersion}</b><br><em>preview of the next release, in review</em></td><td>now</td><td>${links('download/nomadqa-extension.zip', 'download/nomadqa-runner.zip')}</td></tr>`);
for (const r of releases)
  versionRows.push(`<tr><td><b>${r.version}</b><br><em>${r === latest ? 'latest' : 'release'}${r.pre ? ' (pre-release)' : ''}</em></td><td>${r.date}</td><td>${links(r.assets[`nomadqa-extension-${r.version}.zip`]?.url, r.assets[`nomadqa-runner-${r.version}.zip`]?.url)}</td></tr>`);
for (const v of versions) {
  if (releases.some((r) => r.version === v.version)) continue;
  const z = versionZips(v);
  versionRows.push(`<tr><td><b>${v.version}</b><br><em>${v.note ?? 'pre-release'}</em></td><td>${v.date ?? ''}</td><td>${links(z.ext, z.runner)}</td></tr>`);
}
const versionsTable = `<div class="table"><table><thead><tr><th>Version</th><th>Date</th><th>Download</th></tr></thead><tbody>${versionRows.join('')}</tbody></table></div>`;
const prereleaseNote = latest ? '' : `> **Pre-release build.** The first release is published after review. This is the build that becomes it.`;

// ---- examples: each file as the steps a person reads, with the file to download
mkdirSync(join(out, 'examples'), { recursive: true });
const exampleFiles = [];
for (const dir of ['', 'needs-setup']) for (const f of readdirSync(join(root, 'examples', dir)).filter((x) => x.endsWith('.nomadqa.json'))) exampleFiles.push(join(dir, f));
const stepLine = (st, depth = 0) => st.action === 'group'
  ? `<li><b>${esc(stepText(st))}</b><ol>${(st.steps ?? []).map((c) => stepLine(c, depth + 1)).join('')}</ol></li>`
  : `<li>${esc(stepText(st))}${st.optional ? ' <em>(optional)</em>' : ''}</li>`;
const exampleHtml = (name) => {
  const file = exampleFiles.find((f) => f.endsWith(`${name}.nomadqa.json`));
  if (!file) return `<p><em>example ${name} not found</em></p>`;
  const json = readFileSync(join(root, 'examples', file), 'utf8');
  const t = JSON.parse(json);
  copyFileSync(join(root, 'examples', file), join(out, 'examples', file.split('/').pop()));
  return `<details class="ex"><summary>The steps (${t.steps.length}) · group <b>${esc(t.group ?? '—')}</b></summary><ol class="steps">${t.steps.map((st) => stepLine(st)).join('')}</ol><p><a href="examples/${file.split('/').pop()}" download>⬇ ${file.split('/').pop()}</a></p><details><summary>The JSON</summary><pre><code>${esc(json.trim())}</code></pre></details></details>`;
};
const prepare = (text) => text
  .replaceAll('docs/media/', 'media/').replaceAll('](docs/', '](')
  .replaceAll('](download/nomadqa-extension.zip)', `](${downloadLink('nomadqa-extension.zip')})`).replaceAll('href="download/nomadqa-extension.zip"', `href="${downloadLink('nomadqa-extension.zip')}"`).replaceAll('href="download/nomadqa-runner.zip"', `href="${downloadLink('nomadqa-runner.zip')}"`)
  .replaceAll('{{version}}', version).replaceAll('{{sha:ext}}', sha.ext).replaceAll('{{sha:runner}}', sha.runner)
  .replaceAll('{{prerelease-note}}', prereleaseNote)
  .replace(/^\{\{example:([\w-]+)\}\}$/gm, (_, n) => exampleHtml(n));

const sources = readdirSync(docs).filter((x) => x.endsWith('.md')).map((f) => [f.replace(/\.md$/, ''), join(docs, f)]);
sources.push(['runner', join(root, 'RUN-ANYWHERE.md')]); // one source for the guide, on GitHub and on the site
sources.push(['versions', join(root, 'CHANGELOG.md')]);
for (const [name, file] of sources) {
  let md = prepare(readFileSync(file, 'utf8'));
  if (name === 'versions') md = md.replace(/^(What changed[^\n]*\n)/m, `$1\n${versionsTable}\n`);
  const html = name === 'index' ? render(md).html : pageWithTabs(md);
  const title = NAV.find(([n]) => n === name)?.[1] ?? name;
  writeFileSync(join(out, `${name}.html`), page(name, title, html));
}
cpSync(join(docs, 'media'), join(out, 'media'), { recursive: true });
writeFileSync(join(out, '.nojekyll'), '');
console.log(`site/ built: ${readdirSync(out).filter((x) => x.endsWith('.html')).length} pages, version ${version}`);
