#!/usr/bin/env node
// AnimeForge AI browser driver — zero dependencies.
//
// Drives the running Next.js app (http://localhost:3000) through a real
// headless Chrome via the DevTools Protocol. Node 22.4+ ships an unflagged
// global `WebSocket` (and `fetch`), so nothing needs installing. Tested on v24.
//
// Usage:
//   node driver.mjs script.txt          # run commands from a file
//   node driver.mjs - <<'EOF' ...       # run commands from stdin
//   node driver.mjs -e "nav http://localhost:3000" -e screenshot
//
// Env:
//   CHROME_PATH   override Chrome/Edge exe (auto-detected on Windows otherwise)
//   WAIT_MS       wait/wait-text timeout in ms (default 40000)
//   CDP_PORT      DevTools port (default 9222). If something is already
//                 listening there, the driver reuses that Chrome and leaves
//                 it running; otherwise it launches its own and kills it on exit.
//   KEEP=1        never kill Chrome on exit (leave it for the next run)
//   SHOTS_DIR     where screenshots land (default ./shots next to this file)
//   BASE_URL      default target for a bare `nav` (default http://localhost:3000)
//   HEADFUL=1     show the browser window (debugging)
//
// Commands (one per line; blank lines and `#` comments ignored):
//   nav <url|path>           navigate; waits for the load event
//   wait <css>               wait until selector exists (WAIT_MS timeout, default 40s)
//   wait-text <substring>    wait until document body text contains substring
//   click <css>              click first match (element.click())
//   click-text <substring>   click the first button/link/[role] whose text contains substring
//   fill <css> <value>       set an input's value React-safely, fire input+change
//   press <css> <key>        focus selector, dispatch a key (e.g. Enter)
//   text <css>               print innerText of first match
//   attr <css> <name>        print an attribute value
//   count <css>              print number of matches
//   eval <expression>        evaluate JS in the page, print JSON result
//   url                      print current location.href
//   screenshot [name]        save PNG to SHOTS_DIR (default: shot-<n>.png)
//   sleep <ms>               wait
//   console                  dump collected console + page errors so far
//   assert-no-errors         exit non-zero if any console error / exception seen

import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, isAbsolute, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.CDP_PORT || 9222);
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SHOTS_DIR = process.env.SHOTS_DIR || join(HERE, 'shots');
const KEEP = process.env.KEEP === '1';
const HEADFUL = process.env.HEADFUL === '1';

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error('Chrome not found. Set CHROME_PATH=/path/to/chrome.exe');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function endpointAlive() {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/version`, { signal: AbortSignal.timeout(500) });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// ---- CDP client -----------------------------------------------------------
class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.sessionId = null;
    this.console = [];
    this.errors = [];
    ws.addEventListener('message', (ev) => this._onMessage(ev));
  }

  _onMessage(ev) {
    const msg = JSON.parse(ev.data);
    if (msg.id != null && this.pending.has(msg.id)) {
      const { resolve, reject } = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
      return;
    }
    const m = msg.method;
    if (m === 'Runtime.consoleAPICalled') {
      const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? a.unserializableValue ?? '').join(' ');
      const line = `[${msg.params.type}] ${text}`;
      this.console.push(line);
      if (msg.params.type === 'error') this.errors.push(line);
    } else if (m === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      const line = `[exception] ${d.exception?.description || d.text}`;
      this.console.push(line);
      this.errors.push(line);
    } else if (m === 'Log.entryAdded') {
      const e = msg.params.entry;
      const line = `[log:${e.level}] ${e.text}`;
      this.console.push(line);
      // A missing /favicon.ico (this app ships none) logs a resource 404 on
      // every page. That's noise, not a bug — keep it visible, not fatal.
      const noise = /Failed to load resource.*\b(404|favicon)/i.test(e.text);
      if (e.level === 'error' && !noise) this.errors.push(line);
    }
  }

  send(method, params = {}, useSession = true) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (useSession && this.sessionId) payload.sessionId = this.sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 30000);
    });
  }

  async evaluate(expression, awaitPromise = true) {
    const r = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise,
      userGesture: true,
    });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    }
    return r.result?.value;
  }
}

async function connect() {
  let chromeProc = null;
  let info = await endpointAlive();
  const reused = !!info;

  if (!info) {
    const chrome = findChrome();
    const userDir = join(process.env.TEMP || '/tmp', `animeforge-cdp-${PORT}`);
    const args = [
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${userDir}`,
      `--window-size=${process.env.WINDOW_SIZE || '1440,1900'}`,
      'about:blank',
    ];
    if (!HEADFUL) args.unshift('--headless=new');
    chromeProc = spawn(chrome, args, { detached: true, stdio: 'ignore' });
    chromeProc.unref();
    for (let i = 0; i < 60 && !info; i++) {
      await sleep(250);
      info = await endpointAlive();
    }
    if (!info) throw new Error('Chrome did not expose a DevTools endpoint in time');
  }

  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });

  const cdp = new CDP(ws);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' }, false);
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true }, false);
  cdp.sessionId = sessionId;
  cdp.targetId = targetId;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  // Pin a deterministic viewport so screenshots are stable and the dashboard's
  // fixed sidebar isn't clipped (headless window sizing alone is unreliable).
  const [vw, vh] = (process.env.WINDOW_SIZE || '1440,1900').split(',').map(Number);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: vw, height: vh, deviceScaleFactor: 1, mobile: false,
  }).catch(() => {});
  await cdp.send('Runtime.runIfWaitingForDebugger').catch(() => {});
  return { cdp, chromeProc, reused };
}

// ---- command runner -----------------------------------------------------
function parseArgs() {
  const argv = process.argv.slice(2);
  const inline = [];
  const files = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '-e') inline.push(argv[++i]);
    else if (argv[i] === '-') files.push('-');
    else files.push(argv[i]);
  }
  return { inline, files };
}

async function loadCommands() {
  const { inline, files } = parseArgs();
  let lines = [...inline];
  for (const f of files) {
    if (f === '-') {
      lines = lines.concat(readFileSync(0, 'utf8').split('\n'));
    } else {
      lines = lines.concat(readFileSync(resolve(f), 'utf8').split('\n'));
    }
  }
  if (lines.length === 0) lines = readFileSync(0, 'utf8').split('\n');
  return lines
    .map((l) => l.replace(/\r$/, '').trim())
    .filter((l) => l && !l.startsWith('#'));
}

const jsStr = (s) => JSON.stringify(String(s));

const WAIT_MS = Number(process.env.WAIT_MS || 40000); // cold Next route compiles are slow

async function waitFor(cdp, predicateExpr, label, timeoutMs = WAIT_MS) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await cdp.evaluate(predicateExpr)) return;
    await sleep(200);
  }
  throw new Error(`timeout waiting for ${label}`);
}

let shotN = 0;

async function runCommand(cdp, line) {
  const sp = line.indexOf(' ');
  const cmd = sp === -1 ? line : line.slice(0, sp);
  const rest = sp === -1 ? '' : line.slice(sp + 1).trim();

  switch (cmd) {
    case 'nav': {
      let url = rest || BASE_URL;
      if (url.startsWith('/')) url = BASE_URL.replace(/\/$/, '') + url;
      const loaded = new Promise((res) => {
        const h = (ev) => {
          const m = JSON.parse(ev.data);
          if (m.method === 'Page.loadEventFired') {
            cdp.ws.removeEventListener('message', h);
            res();
          }
        };
        cdp.ws.addEventListener('message', h);
        setTimeout(res, 45000);
      });
      await cdp.send('Page.navigate', { url });
      await loaded;
      await sleep(400);
      console.log(`nav -> ${url}`);
      break;
    }
    case 'wait':
      await waitFor(cdp, `!!document.querySelector(${jsStr(rest)})`, `selector ${rest}`);
      console.log(`found ${rest}`);
      break;
    case 'wait-text':
      await waitFor(
        cdp,
        `(document.body?.innerText||'').includes(${jsStr(rest)})`,
        `text ${JSON.stringify(rest)}`,
      );
      console.log(`saw text: ${rest}`);
      break;
    case 'click': {
      const ok = await cdp.evaluate(
        `(()=>{const e=document.querySelector(${jsStr(rest)});if(!e)return false;e.scrollIntoView({block:'center'});e.click();return true;})()`,
      );
      if (!ok) throw new Error(`click: no element for ${rest}`);
      await sleep(300);
      console.log(`click ${rest}`);
      break;
    }
    case 'click-text': {
      const ok = await cdp.evaluate(`(()=>{
        const needle=${jsStr(rest)};
        const nodes=[...document.querySelectorAll('button,a,[role=button],[role=tab],[role=menuitem]')];
        const el=nodes.find(n=>(n.innerText||n.textContent||'').includes(needle));
        if(!el)return false;
        el.scrollIntoView({block:'center'});el.click();return true;
      })()`);
      if (!ok) throw new Error(`click-text: nothing clickable containing ${JSON.stringify(rest)}`);
      await sleep(300);
      console.log(`click-text ${rest}`);
      break;
    }
    case 'fill': {
      const s2 = rest.indexOf(' ');
      const sel = rest.slice(0, s2);
      const val = rest.slice(s2 + 1);
      const ok = await cdp.evaluate(`(()=>{
        const el=document.querySelector(${jsStr(sel)});
        if(!el)return false;
        const proto=el.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;
        const setter=Object.getOwnPropertyDescriptor(proto,'value').set;
        setter.call(el, ${jsStr(val)});
        el.dispatchEvent(new Event('input',{bubbles:true}));
        el.dispatchEvent(new Event('change',{bubbles:true}));
        return true;
      })()`);
      if (!ok) throw new Error(`fill: no element for ${sel}`);
      console.log(`fill ${sel} = ${val}`);
      break;
    }
    case 'press': {
      const s2 = rest.indexOf(' ');
      const sel = rest.slice(0, s2);
      const key = rest.slice(s2 + 1);
      await cdp.evaluate(`(()=>{const e=document.querySelector(${jsStr(sel)});if(e)e.focus();})()`);
      const code = key === 'Enter' ? 13 : key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0;
      for (const type of ['keyDown', 'char', 'keyUp']) {
        await cdp.send('Input.dispatchKeyEvent', {
          type,
          key,
          code: key === 'Enter' ? 'Enter' : `Key${key.toUpperCase()}`,
          windowsVirtualKeyCode: code,
          nativeVirtualKeyCode: code,
          text: key === 'Enter' ? '\r' : key.length === 1 ? key : undefined,
        });
      }
      await sleep(200);
      console.log(`press ${key} on ${sel}`);
      break;
    }
    case 'text': {
      const t = await cdp.evaluate(
        `(()=>{const e=document.querySelector(${jsStr(rest)});return e?e.innerText:null;})()`,
      );
      console.log(t);
      break;
    }
    case 'attr': {
      const s2 = rest.indexOf(' ');
      const sel = rest.slice(0, s2);
      const name = rest.slice(s2 + 1);
      const v = await cdp.evaluate(
        `(()=>{const e=document.querySelector(${jsStr(sel)});return e?e.getAttribute(${jsStr(name)}):null;})()`,
      );
      console.log(v);
      break;
    }
    case 'count': {
      const n = await cdp.evaluate(`document.querySelectorAll(${jsStr(rest)}).length`);
      console.log(n);
      break;
    }
    case 'eval': {
      const v = await cdp.evaluate(rest);
      console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 2));
      break;
    }
    case 'url': {
      console.log(await cdp.evaluate('location.href'));
      break;
    }
    case 'screenshot': {
      if (!existsSync(SHOTS_DIR)) mkdirSync(SHOTS_DIR, { recursive: true });
      const name = rest || `shot-${++shotN}.png`;
      const file = isAbsolute(name) ? name : join(SHOTS_DIR, name.endsWith('.png') ? name : name + '.png');
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      writeFileSync(file, Buffer.from(data, 'base64'));
      console.log(`screenshot -> ${file}`);
      break;
    }
    case 'sleep':
      await sleep(Number(rest) || 0);
      break;
    case 'console':
      console.log(cdp.console.length ? cdp.console.join('\n') : '(no console output)');
      break;
    case 'assert-no-errors':
      if (cdp.errors.length) {
        console.error(`FAIL: ${cdp.errors.length} console error(s):\n` + cdp.errors.join('\n'));
        process.exitCode = 1;
      } else {
        console.log('OK: no console errors');
      }
      break;
    default:
      throw new Error(`unknown command: ${cmd}`);
  }
}

// ---- main --------------------------------------------------------------
const commands = await loadCommands();
const { cdp, chromeProc, reused } = await connect();
console.error(reused ? `(reusing Chrome on :${PORT})` : `(launched Chrome on :${PORT})`);

let failed = false;
try {
  for (const line of commands) {
    await runCommand(cdp, line);
  }
} catch (err) {
  failed = true;
  console.error(`ERROR: ${err.message}`);
} finally {
  try { cdp.ws.close(); } catch {}
  if (chromeProc && !KEEP && !reused) {
    // Chrome spawns child processes; a plain .kill() on the parent leaves them
    // (and the DevTools port) alive. taskkill /T reaps the whole tree, and it
    // must be SYNC here because process.exit() below would race an async spawn.
    if (process.platform === 'win32') {
      try {
        execFileSync('taskkill', ['/pid', String(chromeProc.pid), '/T', '/F'], { stdio: 'ignore' });
      } catch {}
    } else {
      try { chromeProc.kill(); } catch {}
    }
  }
}
process.exit(failed ? 1 : process.exitCode || 0);
