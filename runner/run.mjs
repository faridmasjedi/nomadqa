#!/usr/bin/env node
// NomadQA headless runner: runs NomadQA test files in Chrome, with nothing to install (Node 22+, Chrome).
//
//   node nomadqa/runner/run.mjs my-test.nomadqa.json [more.json | a-group.nomadqa-group.json | a.junit.xml | tests/]
//        --org uat [--group Smoke] [--logins logins.json] [--parallel 4] [--headed] [--out reports]
//
// A folder: every *.nomadqa.json and *.nomadqa-group.json in it (and its folders). --group runs only that group's
// tests. Reports in --out: report.html (for people: why each test failed, with a picture of the page), summary.md,
// a JUnit file per test (and per group) for CI, and a small picture of each failed step. On GitHub Actions the
// summary shows on the job's page and each failure is marked as an error.
//
// --parallel N runs N tests at the same time, each in a browser context of its own (its own cookies: a test that
// logs in as someone else does not change the others).
//
// "Log in" steps take their username and password from --logins (or NOMADQA_LOGINS, the same JSON):
//   { "sales-user": { "url": "https://test.salesforce.com", "username": "…", "password": "…" } }
// A .env file (or --env-file) in the folder you run from gives these variables locally; keep it out of git.
// The run's own user: SF_AUTH_URL (the user's SFDX auth URL), or SF_USERNAME + SF_PASSWORD (+ SF_LOGIN_PAGE), or
// --as <login> makes the run itself that user: the login's SFDX auth URL, or its username and password. Then the
// data and query steps run as that user too (no separate admin).
// or an SFDX auth URL instead of a password: { "sales-user": { "authUrl": "force://…" } }, or one environment variable
// per user: NOMADQA_AUTH_URL_SALES_USER=force://… (the login "sales-user"). A test that logs in runs in a browser
// context of its own, so the next test is not that user.
//
// Login: --org <alias> asks the Salesforce CLI for a one-time login link (sf org open --url-only); or, in CI without
// the CLI, --auth-url / SF_AUTH_URL: the org's SFDX auth URL (sf org display --verbose; keep it in a secret);
// or a login link itself with --login-url or NOMADQA_LOGIN_URL. The session stays in the browser and in memory: nothing is
// written but the reports (JUnit XML, and a screenshot of each failed step).
import { spawn, execFileSync } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Salesforce } from '../extension/core/salesforce.js';
import { sessionFromAuthUrl } from '../extension/core/authurl.js';
import { runTest, stepText, junit, groupJunit, testsFromFile } from '../extension/core/steps.js';
import { htmlReport, markdownSummary, failureLine } from '../extension/core/report.js';

const ENGINE = readFileSync(fileURLToPath(new URL('../extension/core/engine.js', import.meta.url)), 'utf8');

function args(argv) {
  const out = { files: [], headed: false, out: 'nomadqa-reports' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--org') out.org = argv[++i];
    else if (a === '--login-url') out.loginUrl = argv[++i];
    else if (a === '--auth-url') out.authUrl = argv[++i];
    else if (a === '--group') out.group = argv[++i];
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--logins') out.logins = argv[++i];
    else if (a === '--as') out.as = argv[++i];
    else if (a === '--env-file') out.envFile = argv[++i];
    else if (a === '--chrome') out.chrome = argv[++i];
    else if (a === '--parallel') out.parallel = Math.max(1, parseInt(argv[++i], 10) || 1);
    else if (a === '--headed') out.headed = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else out.files.push(a);
  }
  return out;
}

function chromePath(given) {
  const list = [
    given,
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  const found = list.find((p) => existsSync(p));
  if (!found) throw new Error('Chrome not found: give --chrome <path> or set CHROME_PATH.');
  return found;
}

/** A small Chrome DevTools Protocol client over Node's own WebSocket. */
class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 0;
    this.waiting = new Map();
    this.listeners = [];
    this.opened = new Promise((ok, fail) => {
      this.ws.addEventListener('open', ok);
      this.ws.addEventListener('error', fail);
    });
    this.ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && this.waiting.has(msg.id)) {
        const { ok, fail } = this.waiting.get(msg.id);
        this.waiting.delete(msg.id);
        msg.error ? fail(new Error(msg.error.message)) : ok(msg.result);
      } else for (const l of this.listeners) l(msg);
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((ok, fail) => this.waiting.set(id, { ok, fail }));
  }
  once(method, sessionId, timeout = 60000) {
    return new Promise((ok, fail) => {
      const t = setTimeout(() => {
        this.listeners = this.listeners.filter((l) => l !== fn);
        fail(new Error(`Timed out waiting for ${method}`));
      }, timeout);
      const fn = (msg) => {
        if (msg.method === method && (!sessionId || msg.sessionId === sessionId)) {
          clearTimeout(t);
          this.listeners = this.listeners.filter((l) => l !== fn);
          ok(msg.params);
        }
      };
      this.listeners.push(fn);
    });
  }
  close() {
    this.ws.close();
  }
}

async function launch(opts) {
  const profile = mkdtempSync(join(tmpdir(), 'nomadqa-'));
  const chrome = spawn(
    chromePath(opts.chrome),
    [
      ...(opts.headed ? [] : ['--headless=new']),
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1440,900',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
  const wsUrl = await new Promise((ok, fail) => {
    let buf = '';
    const t = setTimeout(() => fail(new Error('Chrome did not start.')), 30000);
    chrome.stderr.on('data', (d) => {
      buf += d;
      const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf);
      if (m) {
        clearTimeout(t);
        ok(m[1]);
      }
    });
    chrome.on('exit', () => fail(new Error('Chrome closed at start.')));
  });
  const cdp = new Cdp(wsUrl);
  await cdp.opened;
  const first = await tab(cdp);
  return {
    cdp,
    ...first,
    /** A tab in a browser context of its own, logged in with a copy of the first tab's cookies. */
    async isolated() {
      const { browserContextId } = await cdp.send('Target.createBrowserContext', { disposeOnDetach: true });
      const { cookies } = await cdp.send('Storage.getCookies', {});
      await cdp.send('Storage.setCookies', {
        browserContextId,
        cookies: cookies.map((c) => ({
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path,
          secure: c.secure,
          httpOnly: c.httpOnly,
          ...(c.sameSite ? { sameSite: c.sameSite } : {}),
          ...(c.expires > 0 ? { expires: c.expires } : {}),
        })),
      });
      const t = await tab(cdp, browserContextId);
      return {
        ...t,
        async close() {
          await cdp.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
        },
      };
    },
    async close() {
      cdp.close();
      chrome.kill();
      await sleep(500);
      rmSync(profile, { recursive: true, force: true });
    },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A tab (in a browser context, or the first one) and its driver for the step engine. */
async function tab(cdp, browserContextId) {
  let { targetId } = await cdp.send('Target.createTarget', {
    url: 'about:blank',
    ...(browserContextId ? { browserContextId } : {}),
  });
  let { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  // A click that opens a new tab (Setup from the gear): the test goes on in it
  await cdp.send('Target.setDiscoverTargets', { discover: true }).catch(() => {});
  let opened = null;
  cdp.listeners.push((msg) => {
    if (msg.method === 'Target.targetCreated' && msg.params.targetInfo.openerId === targetId)
      opened = msg.params.targetInfo.targetId;
  });
  async function follow() {
    targetId = opened;
    opened = null;
    ({ sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true }));
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    await sleep(1500);
    await inPage('__nomadqa.ready(90000)').catch(() => {});
  }

  /** Evaluates in NomadQA's own isolated world (where Lightning's components are plain DOM). */
  async function inPage(expression, tries = 6) {
    for (let i = 0; ; i++) {
      try {
        const tree = await cdp.send('Page.getFrameTree', {}, sessionId);
        const world = await cdp.send(
          'Page.createIsolatedWorld',
          { frameId: tree.frameTree.frame.id, worldName: 'nomadqa' },
          sessionId
        );
        await cdp.send('Runtime.evaluate', { contextId: world.executionContextId, expression: ENGINE }, sessionId);
        const r = await cdp.send(
          'Runtime.evaluate',
          { contextId: world.executionContextId, expression, awaitPromise: true, returnByValue: true },
          sessionId
        );
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'page error');
        return r.result.value;
      } catch (e) {
        if (i >= tries || !/context|navigat|destroyed|not found|Cannot find/i.test(e.message)) throw e;
        await sleep(1000);
      }
    }
  }

  const driver = {
    async open(url) {
      const loaded = cdp.once('Page.loadEventFired', sessionId, 90000);
      await cdp.send('Page.navigate', { url }, sessionId);
      await loaded;
      await inPage('__nomadqa.ready(90000)');
    },
    // The login form makes the page go away: it runs once, never again on the next page
    // A step runs once, never again (a click must not happen twice). The login form makes the page go away.
    async step(s) {
      if (s.action === 'login-form') return inPage(`__nomadqa.run(${JSON.stringify(s)})`, 0).catch(() => undefined);
      // A tab opened late by the step before (Setup from the gear can take a moment): the test goes on there first
      if (opened) await follow();
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const before = await inPage('location.href', 2).catch(() => '');
      // Waits and checks press nothing: when the page loads again under them, they run again on the new page
      const repeatable = ['wait', 'expect', 'remember'].includes(s.action);
      let r;
      for (let tries = 0; tries < 3; tries++) {
        r = await inPage(`__nomadqa.run(${JSON.stringify({ ...s, __id: id })})`, 0).catch((e) =>
          /context|navigat|destroyed|not found|Cannot find/i.test(e.message)
            ? undefined
            : { ok: false, message: e.message }
        );
        if (r !== undefined && r !== null) break;
        // The page went away while the step ran (another app reloads the whole page)
        await sleep(1500);
        await inPage('__nomadqa.ready(60000)').catch(() => {});
        const marked = await inPage(`sessionStorage.getItem('nomadqa.pressed') === ${JSON.stringify(id)}`).catch(
          () => false
        );
        if (marked) {
          r = { ok: true, message: 'Done; the page loaded again after it.' };
          break;
        }
        if (repeatable && tries < 2) continue;
        const now = await inPage('location.href', 2).catch(() => '');
        r =
          !repeatable && now !== before
            ? { ok: true, message: 'Done; the page loaded again after it.' }
            : { ok: false, message: 'No answer from the page (it loaded again while the step ran).' };
        break;
      }
      if (opened) {
        await follow();
        r = { ...r, message: [r.message, 'Went on in the new tab it opened.'].filter(Boolean).join(' ') };
      }
      return r;
    },
    async load(url) {
      const loaded = cdp.once('Page.loadEventFired', sessionId, 90000);
      await cdp.send('Page.navigate', { url }, sessionId);
      await loaded;
    },
    url: () => inPage('location.href'),
    // After the login form is sent: the redirects end on Lightning (or stay on a login or verification page)
    async settle(timeout = 90000) {
      const end = Date.now() + timeout;
      let still = 0;
      let last = '';
      while (Date.now() < end) {
        await sleep(700);
        const now = await inPage('location.href', 2).catch(() => '');
        if (/\/lightning\//.test(now)) return void (await inPage('__nomadqa.ready(60000)'));
        still = now && now === last ? still + 1 : 0;
        last = now;
        if (still > 12) return;
      }
    },
    async shot() {
      // A small picture (JPEG): only failed steps take one
      const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 60 }, sessionId);
      return `data:image/jpeg;base64,${r.data}`;
    },
  };
  async function session(host) {
    const { cookies } = await cdp.send('Network.getCookies', { urls: [`https://${host}`] }, sessionId);
    return cookies.find((c) => c.name === 'sid')?.value;
  }
  return {
    driver,
    session,
    async login(url) {
      const loaded = cdp.once('Page.loadEventFired', sessionId, 120000);
      await cdp.send('Page.navigate', { url }, sessionId);
      await loaded;
      await inPage('__nomadqa.ready(120000)');
    },
  };
}

/** Test files given, or found in the folders given: *.nomadqa.json, *.nomadqa-group.json (and JUnit files given). */
function testFiles(paths) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.nomadqa(-group)?\.json$/.test(name)) out.push(p);
    }
  };
  for (const p of paths) {
    if (!existsSync(p)) throw new Error(`No file or folder “${p}”.`);
    if (statSync(p).isDirectory()) walk(p);
    else out.push(p);
  }
  return out;
}

/** A one-time login link from an SFDX auth URL (force://clientId:secret:refreshToken@instance): no CLI needed. */
async function fromAuthUrl(authUrl) {
  return (await sessionFromAuthUrl(authUrl)).frontdoor;
}

/** Does the test (or a group in it) log in as someone? Such a test runs in a browser context of its own. */
const logsIn = (steps) => (steps ?? []).some((s) => s.action === 'login' || s.action === 'loginas' || logsIn(s.steps));

/** The run's own login with a username and a password: the login page, then Lightning. → the org's host for the API. */
async function loginWithPassword(browser, l) {
  const d = browser.driver;
  const url = l.url || 'https://login.salesforce.com';
  await d.load(url.startsWith('http') ? url : `https://${url}`);
  let typed;
  let link = false;
  for (let k = 0; k < 5; k++) {
    typed = await d.step({ action: 'login-form', username: l.username, password: l.password ?? '' });
    // "Log In with Username" was clicked: the form shows next; no answer just after it: the page is loading
    if (typed?.link || (!typed && link)) {
      link = true;
      await sleep(2500);
      continue;
    }
    break;
  }
  if (typed && typed.ok === false) throw new Error(typed.message);
  await d.settle();
  const now = await d.url();
  if (!/\/lightning\//.test(now))
    throw new Error(
      `Still not in Salesforce (${now.slice(0, 80)}): a wrong username or password, or Salesforce asks to verify it is you.`
    );
  return new URL(now).host.replace(/\.lightning\.force\.com$/, '.my.salesforce.com').replace(/\.my\.salesforce-setup\.com$/, '.my.salesforce.com');
}

/** KEY=value lines of a .env file become environment variables; a variable already set (the CI's own) wins. */
function loadEnvFile(path) {
  let n = 0;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^(["'])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) {
      process.env[m[1]] = value;
      n++;
    }
  }
  return n;
}

const gh = (s) =>
  String(s ?? '')
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A');

async function main() {
  const opts = args(process.argv.slice(2));
  // Locally: a .env file in the folder you run from (or --env-file <path>) holds the logins; in CI the secrets are
  // already environment variables and win. Keep .env out of git.
  const envFile = opts.envFile ?? (existsSync('.env') ? '.env' : '');
  if (envFile) {
    if (!existsSync(envFile)) throw new Error(`No env file “${envFile}”.`);
    console.log(`Using ${envFile} (${loadEnvFile(envFile)} variable(s) from it)`);
  }
  opts.group = opts.group || process.env.NOMADQA_GROUP || '';
  if (opts.help || !opts.files.length) {
    console.log(
      'Usage: node nomadqa/runner/run.mjs <test.nomadqa.json | group.json | report.junit.xml | folder…> (--as <login> | --org <alias> | --auth-url <sfdx auth url>) [--group <name>] [--logins logins.json] [--env-file .env] [--parallel N] [--headed] [--out <folder>]'
    );
    process.exit(opts.help ? 0 : 2);
  }
  const logins = JSON.parse(opts.logins ? readFileSync(opts.logins, 'utf8') : process.env.NOMADQA_LOGINS || '{}');
  // One secret per user: NOMADQA_AUTH_URL_SALES_REP=force://… is the login "sales-rep" (a Log in step names it)
  for (const [key, value] of Object.entries(process.env)) {
    const m = /^NOMADQA_AUTH_URL_(.+)$/.exec(key);
    if (m && value) logins[m[1].toLowerCase().replace(/_/g, '-')] = { authUrl: value };
  }
  // --as <login>: the run itself is that user (their SFDX auth URL, or their username and password)
  const asName = opts.as ?? process.env.NOMADQA_AS;
  const asLogin = asName ? logins[asName] : null;
  if (asName && !asLogin)
    throw new Error(`No login “${asName}” for --as: add it to --logins / NOMADQA_LOGINS, or set NOMADQA_AUTH_URL_${asName.toUpperCase().replace(/-/g, '_')}.`);
  // The run's own user with a username and a password: --as <login>, or SF_USERNAME + SF_PASSWORD (SF_LOGIN_PAGE:
  // https://login.salesforce.com by default; https://test.salesforce.com for a sandbox or scratch org)
  const byEnv =
    process.env.SF_USERNAME && !opts.authUrl && !opts.loginUrl && !opts.org && !process.env.SF_AUTH_URL && !process.env.NOMADQA_AUTH_URL && !process.env.NOMADQA_LOGIN_URL
      ? { url: process.env.SF_LOGIN_PAGE || 'https://login.salesforce.com', username: process.env.SF_USERNAME, password: process.env.SF_PASSWORD ?? '' }
      : null;
  const passwordLogin = asLogin && !asLogin.authUrl && asLogin.username ? asLogin : byEnv;
  const authUrl = opts.authUrl ?? asLogin?.authUrl ?? process.env.SF_AUTH_URL ?? process.env.NOMADQA_AUTH_URL;
  const loginUrl =
    opts.loginUrl ??
    process.env.NOMADQA_LOGIN_URL ??
    (authUrl
      ? await fromAuthUrl(authUrl)
      : opts.org
      ? JSON.parse(execFileSync('sf', ['org', 'open', '--url-only', '--json', '-o', opts.org], { encoding: 'utf8' }))
          .result.url
      : undefined);
  if (!loginUrl && !passwordLogin)
    throw new Error('Give --as <login>, --org <alias> (Salesforce CLI), --auth-url (SF_AUTH_URL) or --login-url.');
  let host = loginUrl ? new URL(loginUrl).host : '';
  // A test, a group of tests, or a JUnit report NomadQA wrote: every test in it
  const tests = testFiles(opts.files)
    .flatMap((f) => {
      const text = readFileSync(f, 'utf8');
      const list = testsFromFile(text);
      const group = /^\s*\{/.test(text) && JSON.parse(text).nomadqa === 'group' ? JSON.parse(text).name : '';
      return list.map((test, i) => ({
        file: list.length > 1 ? `${f.replace(/\.(json|xml)$/, '')}-${i + 1}.json` : f,
        test,
        group: group || test.group || '',
      }));
    })
    .filter((t) => !opts.group || t.group.toLowerCase() === opts.group.toLowerCase());
  if (!tests.length) throw new Error(opts.group ? `No test in the group “${opts.group}”.` : 'No tests found.');
  const groups = new Map();
  mkdirSync(opts.out, { recursive: true });
  const browser = await launch(opts);
  let failedTests = 0;
  try {
    let sid;
    if (passwordLogin) {
      console.log(`Logging in as ${asName ?? passwordLogin.username}…`);
      host = await loginWithPassword(browser, passwordLogin);
      sid = await browser.session(host);
    } else {
      console.log(`Logging in to ${host}…`);
      await browser.login(loginUrl);
      sid = await browser.session(host);
    }
    if (!sid) throw new Error('Logged in, but no session was found for the API.');
    const sf = new Salesforce(host, sid);
    const parallel = Math.min(opts.parallel ?? 1, tests.length);
    const runOne = async ({ file, test, group }, driver) => {
      const lines = [`\n${test.name ?? basename(file)}`];
      const say = (line) => (parallel > 1 ? lines.push(line) : console.log(line));
      if (parallel === 1) console.log(lines.shift());
      // Another user must not stay logged in for the next test: those tests get a context of their own
      const own = logsIn(test.steps) ? await browser.isolated() : null;
      const run = await runTest(test, {
        driver: own?.driver ?? driver,
        sf,
        logins,
        onStep: (i, r) => {
          const mark = r.ok ? '✓' : r.ok === null ? '·' : '✕';
          say(`  ${mark} ${i + 1}. ${stepText(test.steps[i])}${r.ok === false ? `\n      ${r.message}` : ''}`);
        },
      }).catch((e) => ({ ok: false, ms: 0, results: [{ ok: false, message: e.message, ms: 0 }] }));
      await own?.close();
      const stem = basename(file).replace(/\.json$/, '');
      writeFileSync(join(opts.out, `${stem}.junit.xml`), junit(test, run));
      run.results.forEach((r, i) => {
        if (r.shot)
          writeFileSync(join(opts.out, `${stem}-step${i + 1}.jpg`), Buffer.from(r.shot.split(',')[1], 'base64'));
      });
      // On GitHub Actions: the failure shows as an error on the run's page
      if (!run.ok && process.env.GITHUB_ACTIONS)
        console.log(`::error title=${gh(`NomadQA: ${test.name ?? stem}`)}::${gh(failureLine(test, run))}`);
      say(
        `  ${run.ok ? 'passed' : 'FAILED'} in ${(run.ms / 1000).toFixed(1)} s${
          run.cleaned ? ` · ${run.cleaned} test record(s) deleted` : ''
        }`
      );
      // Side by side, a test's lines are written together when it ends
      if (parallel > 1) console.log(lines.join('\n'));
      if (!run.ok) failedTests++;
      return { group, test, run };
    };
    const results = new Array(tests.length);
    if (parallel === 1) for (const [k, t] of tests.entries()) results[k] = await runOne(t, browser.driver);
    else {
      console.log(`${tests.length} tests, ${parallel} at a time…`);
      let next = 0;
      await Promise.all(
        Array.from({ length: parallel }, async () => {
          const tab = await browser.isolated();
          try {
            while (next < tests.length) {
              const k = next++;
              results[k] = await runOne(tests[k], tab.driver);
            }
          } finally {
            await tab.close();
          }
        })
      );
    }
    const done = results.filter(Boolean);
    for (const { group, test, run } of done)
      if (group) groups.set(group, [...(groups.get(group) ?? []), { test, run }]);
    // For people: one page with every test, why each failure failed, and a picture of the page
    const names = [...new Set(done.map((x) => x.group).filter(Boolean))];
    const title = names.length === 1 && done.every((x) => x.group) ? `Group “${names[0]}”` : 'NomadQA tests';
    const items = done.map(({ group, test, run }) => ({ test: { ...test, group }, run }));
    writeFileSync(join(opts.out, 'report.html'), htmlReport({ title, org: host, items }));
    const md = markdownSummary({ title, org: host, items });
    writeFileSync(join(opts.out, 'summary.md'), md);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
    // One report for each group as well
    for (const [name, list] of groups)
      writeFileSync(
        join(opts.out, `${name.replace(/[^\w-]+/g, '-').toLowerCase()}.group.junit.xml`),
        groupJunit(name, list)
      );
  } finally {
    await browser.close();
  }
  console.log(`\n${tests.length - failedTests} of ${tests.length} test(s) passed · reports in ${opts.out}`);
  process.exit(failedTests ? 1 : 0);
}

main().catch((e) => {
  console.error(`NomadQA: ${e.message}`);
  process.exit(2);
});
