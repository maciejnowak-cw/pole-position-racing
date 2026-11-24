// Checks the site before it is published: builds every page, in Polish and English, from the league's current
// sheet and reports anything broken. Needs only Node (no packages, no browser).
//
//   node scripts/check.mjs
//
// It does not click, scroll or look at the layout: those still need a look in the browser.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = (p) => path.join(root, p);
const read = (p) => readFileSync(file(p), 'utf8');
const problems = new Map(); // message -> { n, where }
function problem(msg, where = '') {
  const p = problems.get(msg) || { n: 0, where };
  p.n++;
  problems.set(msg, p);
}
function finish() {
  if (!problems.size) return;
  console.error(`\n✗ Znalezione problemy (${problems.size}):`);
  for (const [msg, { n, where }] of [...problems].slice(0, 40)) console.error(`  • ${msg}${where ? `  [${where}]` : ''}${n > 1 ? `  ×${n}` : ''}`);
  if (problems.size > 40) console.error(`  … i ${problems.size - 40} innych`);
  process.exit(1);
}

/* ---------- Files ---------- */
const jsFiles = readdirSync(file('js')).filter((f) => f.endsWith('.js'));
for (const [name, args] of [...jsFiles.map((f) => [`js/${f}`, ['--input-type=module', '--check']]), ['sw.js', ['--check', '-']]]) {
  const r = spawnSync(process.execPath, args, { input: read(name), encoding: 'utf8' });
  if (r.status) problem(`Błąd składni w ${name}: ${(r.stderr.match(/\w*Error: .*/) || [r.stderr.slice(0, 200)])[0]}`);
}
const css = read('css/style.css').replace(/\/\*[\s\S]*?\*\//g, '').replace(/"[^"\n]*"|'[^'\n]*'/g, '');
const open = css.split('{').length, close = css.split('}').length;
if (open !== close) problem(`css/style.css: liczba nawiasów { (${open - 1}) i } (${close - 1}) się nie zgadza`);

const index = read('index.html'), sw = read('sw.js'), app = read('js/app.js');
const shell = [...sw.match(/const SHELL = \[([\s\S]*?)\];/)[1].replace(/\/\/.*/g, '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
for (const f of shell) if (!existsSync(file(f))) problem(`sw.js wymienia plik, którego nie ma: ${f}`);
for (const f of jsFiles) {
  if (!shell.includes(`js/${f}`)) problem(`sw.js nie zapisuje do trybu offline: js/${f}`);
  if (!index.includes(`"./js/${f}": "./js/${f}?v=`)) problem(`Mapa importów w index.html nie zawiera: js/${f}`);
}
const versions = new Set([...index.matchAll(/\?v=([0-9A-Za-z]+)/g)].map((m) => m[1]));
versions.add(sw.match(/const VERSION = '([^']*)'/)[1]);
if (versions.size !== 1) problem(`Różne numery wersji w index.html i sw.js: ${[...versions].join(', ')}`);
try { JSON.parse(read('config.json')); JSON.parse(read('manifest.webmanifest')); } catch (e) { problem(`config.json lub manifest.webmanifest: ${e.message}`); }
finish(); // no point in building pages from broken files

/* ---------- Modules ---------- */
// The little the page builders expect from a browser.
const store = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k),
} });
globalThis.document = { documentElement: {} };
const load = (f) => import(pathToFileURL(file(`js/${f}`)).href);
const mods = {};
for (const f of jsFiles) {
  if (f === 'app.js') continue; // starts the whole site as soon as it is loaded
  try { mods[f] = await load(f); } catch (e) { problem(`js/${f} się nie wczytuje: ${e.message}`); }
}
for (const m of app.matchAll(/import \{([^}]+)\} from '\.\/([\w-]+\.js)'/g)) {
  for (const name of m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean)) {
    if (mods[m[2]] && !(name in mods[m[2]])) problem(`js/app.js importuje ${name}, którego nie ma w js/${m[2]}`);
  }
}
for (const m of new Set([...app.matchAll(/\bV\.(\w+)/g)].map((x) => x[1]))) if (mods['views.js'] && !(m in mods['views.js'])) problem(`js/app.js używa V.${m}, którego nie ma w js/views.js`);
finish();

const { setLang, t } = mods['i18n.js'];
const V = mods['views.js'], { href } = mods['ui.js'];

// Every text used in the code exists in both languages.
const dict = read('js/i18n.js');
const enAt = dict.search(/^  en: \{/m);
const keysIn = (s) => new Set([...s.matchAll(/'([a-z]+\.\w+)':/gi)].map((m) => m[1]));
const pl = keysIn(dict.slice(0, enAt)), en = keysIn(dict.slice(enAt));
for (const k of pl) if (!en.has(k)) problem(`Brak angielskiego tekstu: ${k}`);
for (const k of en) if (!pl.has(k)) problem(`Brak polskiego tekstu: ${k}`);
for (const f of jsFiles) for (const m of read(`js/${f}`).matchAll(/\bt\('([a-z]+\.\w+)'/gi)) if (!pl.has(m[1])) problem(`Nieznany tekst ${m[1]}`, `js/${f}`);

/* ---------- Data ---------- */
const cfg = JSON.parse(read('config.json'));
let model;
for (let attempt = 1; !model; attempt++) {
  try { ({ model } = await mods['data.js'].fetchTexts(cfg.sheetId)); } catch (e) {
    if (attempt < 3) { await new Promise((r) => setTimeout(r, 2000)); continue; }
    problem(`Nie udało się pobrać arkusza ligi albo wyliczyć danych: ${e.stack?.split('\n').slice(0, 2).join(' ')}`);
    finish();
  }
}

/* ---------- Pages ---------- */
// The site's own routing table, so a new kind of page is never forgotten here.
const ROUTES = new Function('V', 'model', 'cfg', `return ${app.match(/const ROUTES = (\[[\s\S]*?\n\]);/)[1]}`)(V, model, cfg);
const resolve = (p) => {
  for (const [re, view] of ROUTES) { const m = re.exec(p); if (m) return view(...m.slice(1).map((x) => (x == null ? x : decodeURIComponent(x)))); }
  return null;
};
const pages = new Set(['', 'standings', 'seasons', 'goat', 'drivers', 'stats', 'compare', 'teams', 'tracks', 'calendar', 'hall-of-fame']);
for (const tab of ['drivers', 'constructors', 'results', 'calendar']) pages.add(`standings/${tab}`);
for (const n of model.seasonNums) { pages.add(`season/${n}`); for (const tab of ['drivers', 'constructors', 'results', 'calendar']) pages.add(`season/${n}/${tab}`); }
const strip = (h) => h.replace(/^#\//, '');
for (const d of model.drivers) pages.add(strip(href.driver(d.name)));
for (const tm of model.teams) pages.add(strip(href.team(tm.key)));
for (const tr of model.tracks) pages.add(strip(href.track(tr.code)));
for (const r of model.raceList) pages.add(strip(href.race(r.id)));
for (const [re] of ROUTES) if (![...pages].some((p) => re.test(p))) problem(`Żadna sprawdzana strona nie pasuje do adresu ${re}`);

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const links = new Map(), assets = new Map();
function checkHtml(html, where) {
  const ids = new Set(), stack = [];
  const bare = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const m of bare.matchAll(/<(\/?)([a-z][\w-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)) {
    const [, end, rawTag, attrs] = m, tag = rawTag.toLowerCase();
    if (end) {
      if (stack.at(-1) !== tag) { problem(`Źle zamknięty znacznik </${tag}> (otwarty: <${stack.at(-1) || 'żaden'}>)`, where); return; }
      stack.pop();
      continue;
    }
    if (tag === 'a' && stack.includes('a')) problem('Link wewnątrz innego linku', where);
    const id = /\sid="([^"]*)"/.exec(attrs)?.[1];
    if (id) { if (ids.has(id)) problem(`Powtórzony identyfikator id="${id}"`, where); ids.add(id); }
    const to = /\shref="(#[^"]*)"/.exec(attrs)?.[1];
    if (to?.startsWith('#/') && !links.has(to)) links.set(decode(to), where);
    const src = /\ssrc="([^"]*)"/.exec(attrs)?.[1];
    if (src && !/^(https?:|data:)/.test(src) && !assets.has(src)) assets.set(src, where);
    if (!VOID.has(tag) && !attrs.trim().endsWith('/')) stack.push(tag);
  }
  if (stack.length) problem(`Niezamknięty znacznik <${stack.at(-1)}>`, where);
  const bad = /\b(undefined|NaN)\b|\[object \w+\]|\bInfinity\b/.exec(bare);
  if (bad) problem(`Na stronie widać „${bad[0]}”: …${bare.slice(Math.max(0, bad.index - 40), bad.index + 30).replace(/\s+/g, ' ')}…`, where);
  const key = />\s*((?:common|stats|nav|home|fact|state|race|driver|team|teams|track|ms|search)\.[a-zA-Z]+)\s*</.exec(bare);
  if (key) problem(`Zamiast tekstu widać jego nazwę: ${key[1]}`, where);
}
let built = 0;
for (const lang of ['pl', 'en']) {
  setLang(lang);
  const missing = new Set(['state', 'driver', 'team', 'track', 'race'].map((k) => t(`${k}.notFound`)));
  const isMissing = (html) => [...missing].some((x) => html.includes(x));
  const build = (p) => {
    const where = `${lang} #/${p}`;
    try {
      const view = resolve(p);
      if (!view?.html) { problem('Pusta strona', where); return; }
      if (isMissing(view.html)) problem('Strona pokazuje „nie znaleziono”', where);
      checkHtml(view.html, where);
      built++;
    } catch (e) {
      const at = /js\/[\w-]+\.js:\d+/.exec(e.stack || '')?.[0] || '';
      problem(`Strona się nie otwiera: ${e.message}${at ? ` (${at})` : ''}`, where);
    }
  };
  for (const p of pages) build(p);
  for (let i = 0; i < 80; i++) { V.newFact(); build(''); } // the home page's fact is drawn at random
  // Every link on the site leads to a page that exists.
  for (const [to, where] of links) {
    const p = strip(to).replace(/\/$/, '');
    if (pages.has(p)) continue;
    let view = null;
    try { view = resolve(p); } catch { /* reported below */ }
    if (!view?.html || isMissing(view.html)) problem(`Link prowadzi donikąd: ${to}`, where);
  }
}
for (const [src, where] of assets) if (!existsSync(file(src.split('?')[0]))) problem(`Brak pliku: ${src}`, where);
for (const [, f] of app.matchAll(/'((?:hist\/)?\w+\.(?:png|jpg|svg))'/g)) if (!existsSync(file(`assets/teams/${f}`))) problem(`Brak logo: assets/teams/${f}`, 'js/app.js');

finish();
console.log(`✓ Wszystko w porządku: ${built} stron (PL i EN), ${links.size} linków, ${assets.size} obrazków.`);
