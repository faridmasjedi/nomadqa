// Builds the GitHub Pages site: docs/*.md → site/*.html (plain Node, no packages). `node scripts/site.mjs`
import { readdirSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, copyFileSync } from 'node:fs';
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
    if (l.trim() === '') { i++; continue; }
    const buf = []; for (; i < lines.length && lines[i].trim() !== '' && !/^(#{1,4} |```|\||\s*([-*]|\d+\.) |> |<(div|video|figure|details))/.test(lines[i]); i++) buf.push(lines[i]);
    html += `<p>${inline(buf.join(' '))}</p>\n`;
  }
  return { html, toc };
}

const NAV = [
  ['index', 'Home'], ['getting-started', 'Start'], ['inspector', 'Inspector'], ['recorder', 'Recorder'],
  ['tests', 'Tests'], ['reports', 'Reports'], ['test-data', 'Test data'], ['agent', 'Agent'], ['runner', 'Runner'], ['ci', 'CI'], ['examples', 'Examples'], ['steps', 'Steps'], ['videos', 'Videos'], ['download', 'Download'], ['versions', 'Versions'],
];
const CSS = readFileSync(join(docs, 'site.css'), 'utf8');
const page = (file, title, body, toc) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title === 'Home' ? 'NomadQA — testing for Salesforce' : `${title} · NomadQA`}</title><meta name="description" content="Testing for Salesforce: a Chrome/Edge extension and a headless runner for CI. No packages.">
<link rel="icon" href="media/icon.png"><style>${CSS}</style></head><body>
<header><a class="brand" href="index.html"><img src="media/icon.png" alt="" width="28" height="28">NomadQA</a>
<nav>${NAV.map(([f, t]) => `<a href="${f}.html"${f === file ? ' class="on"' : ''}>${t}</a>`).join('')}<a href="https://github.com/faridmasjedi/nomadqa">GitHub</a></nav></header>
<main class="${file === 'index' ? 'home' : toc.length > 1 ? '' : 'solo'}">${file !== 'index' && toc.length > 1 ? `<aside><b>On this page</b>${toc.map(([id, t]) => `<a href="#${id}">${esc(t)}</a>`).join('')}</aside>` : ''}<article>${body}</article></main>
<script>document.querySelectorAll('.tabs').forEach(function(t){var tabs=[].slice.call(t.querySelectorAll('[role=tab]')),panels=[].slice.call(t.querySelectorAll('[role=tabpanel]'));function pick(n){tabs.forEach(function(b,k){b.setAttribute('aria-selected',k===n);b.tabIndex=k===n?0:-1;panels[k].hidden=k!==n})}tabs.forEach(function(b,n){b.onclick=function(){pick(n)};b.onkeydown=function(e){var k=e.key==='ArrowRight'?n+1:e.key==='ArrowLeft'?n-1:-1;if(k>=0&&k<tabs.length){pick(k);tabs[k].focus()}}})});</script><noscript><style>.tabpanel[hidden]{display:block}</style></noscript>
<footer>NomadQA · plain JavaScript, no packages · <a href="https://github.com/faridmasjedi/nomadqa">source</a></footer></body></html>`;

// ---- downloads: the zips are built with the site, so the links always match this version
const version = JSON.parse(readFileSync(join(root, 'extension/manifest.json'), 'utf8')).version;
mkdirSync(join(out, 'download'), { recursive: true });
execFileSync('node', [join(root, 'scripts/pack.mjs'), join(out, 'download')], { stdio: 'ignore' });
const sha = {};
for (const [k, f] of [['ext', 'nomadqa-extension'], ['runner', 'nomadqa-runner']]) {
  sha[k] = createHash('sha256').update(readFileSync(join(out, 'download', `${f}.zip`))).digest('hex');
  copyFileSync(join(out, 'download', `${f}.zip`), join(out, 'download', `${f}-${version}.zip`));
}

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
  .replaceAll('{{version}}', version).replaceAll('{{sha:ext}}', sha.ext).replaceAll('{{sha:runner}}', sha.runner)
  .replace(/^\{\{example:([\w-]+)\}\}$/gm, (_, n) => exampleHtml(n));

const sources = readdirSync(docs).filter((x) => x.endsWith('.md')).map((f) => [f.replace(/\.md$/, ''), join(docs, f)]);
sources.push(['runner', join(root, 'RUN-ANYWHERE.md')]); // one source for the guide, on GitHub and on the site
sources.push(['versions', join(root, 'CHANGELOG.md')]);
for (const [name, file] of sources) {
  const { html, toc } = render(prepare(readFileSync(file, 'utf8')));
  const title = NAV.find(([n]) => n === name)?.[1] ?? name;
  writeFileSync(join(out, `${name}.html`), page(name, title, html, toc));
}
cpSync(join(docs, 'media'), join(out, 'media'), { recursive: true });
writeFileSync(join(out, '.nojekyll'), '');
console.log(`site/ built: ${readdirSync(out).filter((x) => x.endsWith('.html')).length} pages, version ${version}`);
