// App shell: routing, navigation, language switch and silent background refresh of sheet data.
import { t, lang, setLang, fmt } from './i18n.js';
import { readCache, fetchTexts, buildModel } from './data.js';
import { TRACK_COUNTRY } from './countries.js';
import { initTooltip, initTableFilters, initStickyHeads, esc, SOCIAL, socialIcon } from './ui.js';
import * as V from './views.js';
import { TRACK_GEO } from './track-geo.js';
import { initSearch, openSearch } from './search.js';
import { initDriverPreview } from './preview.js';

const DEFAULT_CFG = { sheetId: '1ZKXUxp4XcILifPl248RttwhjkGJ9x0QCeURABEcNGnI', refreshMinutes: 5, links: {} };

const main = document.getElementById('main');
const header = document.querySelector('.site-header');
const inner = header.querySelector('.header-inner');
const menu = document.getElementById('site-menu');
const menuBtn = header.querySelector('.menu-button');

let cfg = DEFAULT_CFG;
let model = null;
let texts = null;
let dataTime = 0;
let lastFetch = 0;
let fetchFailed = false;
let pending = false;

const NAV = [
  ['', 'nav.home'], ['standings', 'nav.standings'], ['goat', 'nav.goat'],
  ['teams', 'nav.teams'], ['tracks', 'nav.tracks'], ['hall-of-fame', 'nav.hof'],
  ['stats', 'nav.stats'],
];
// Detail pages highlight their parent section in the menu.
const SECTION = { seasons: 'hall-of-fame', drivers: 'goat', driver: 'goat', team: 'teams', track: 'tracks', season: 'standings', race: 'standings', calendar: 'standings' };

const ROUTES = [
  [/^$/, () => V.home(model, cfg)],
  [/^standings(?:\/(\w+))?$/, (tab) => V.season(model, model.currentSeason, { standings: true, tab })],
  [/^seasons$/, () => V.hallOfFame(model)], // old link to the removed Champions page
  [/^season\/(\d+)(?:\/(\w+))?$/, (n, tab) => V.season(model, n, { tab })],
  [/^goat$/, () => V.goat(model)],
  [/^drivers$/, () => V.goat(model)], // old link to the removed drivers list
  [/^stats$/, () => V.stats(model)],
  [/^driver\/(.+)$/, (n) => V.driver(model, n)],
  [/^compare(?:\/.*)?$/, () => V.goat(model)], // old links to the removed compare page
  [/^teams$/, () => V.teams(model)],
  [/^team\/(.+)$/, (k) => V.team(model, k)],
  [/^tracks$/, () => V.tracks(model)],
  [/^track\/(.+)$/, (c) => V.track(model, c)],
  [/^calendar(?:\/(\d+))?$/, (n) => V.season(model, model.seasons.has(+n) ? n : model.currentSeason, { tab: 'calendar' })], // old calendar links
  [/^race\/(\d+)$/, (id) => V.race(model, id)],
  [/^hall-of-fame$/, () => V.hallOfFame(model)],
];

const path = () => location.hash.replace(/^#\/?/, '').replace(/\/$/, '');

/* ---------- Navigation ---------- */
function buildNav() {
  const links = NAV.map(([p, key]) => `<li><a href="#/${p}" data-nav="${p}">${esc(t(key))}</a></li>`);
  if (cfg.links?.rules) links.push(`<li><a href="${esc(cfg.links.rules)}" target="_blank" rel="noopener" class="ext">${esc(t('nav.rules'))}</a></li>`);
  if (cfg.links?.discord) links.push(`<li><a href="${esc(cfg.links.discord)}" target="_blank" rel="noopener" class="ext">${esc(t('nav.discord'))}</a></li>`);
  menu.innerHTML = links.join('');
  header.querySelector('nav').setAttribute('aria-label', t('nav.primary'));
  menuBtn.querySelector('span').textContent = t('nav.menu');
  const sb = header.querySelector('.search-button');
  sb.setAttribute('aria-label', t('search.open'));
  sb.title = `${t('search.open')} (Ctrl+K)`;
  document.querySelector('.skip').textContent = t('nav.skip');
  const top = document.querySelector('.to-top');
  top.setAttribute('aria-label', t('common.toTop'));
  top.title = t('common.toTop');
  const lg = header.querySelector('.lang');
  lg.setAttribute('aria-label', t('nav.lang'));
  for (const b of lg.querySelectorAll('button')) b.setAttribute('aria-pressed', b.dataset.lang === lang);
  buildFooter();
  markCurrent();
  layoutNav(true);
}

function markCurrent() {
  const first = path().split('/')[0];
  const sec = SECTION[first] || first;
  for (const a of menu.querySelectorAll('[data-nav]')) {
    if (a.dataset.nav === sec) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
}

// Inline navigation when every link fits on one row, popover menu otherwise (no hard-coded breakpoint).
let lastWidth = 0;
function layoutNav(force = false) {
  const width = header.clientWidth;
  const wide = header.classList.contains('is-wide');
  if (!force && !wide && width <= lastWidth) { lastWidth = width; return; }
  lastWidth = width;
  const wasOpen = menu.matches(':popover-open');
  header.classList.add('is-wide', 'is-measuring', 'nav-ready');
  menu.removeAttribute('popover');
  const fits = inner.scrollWidth <= inner.clientWidth + 1;
  if (!fits) {
    header.classList.remove('is-wide');
    menu.setAttribute('popover', 'auto');
    if (wasOpen) menu.showPopover?.();
  }
  requestAnimationFrame(() => header.classList.remove('is-measuring'));
}

/* Footer: logo, quick links, social links. */
function buildFooter() {
  const box = document.getElementById('footer');
  const social = SOCIAL.filter(([key]) => cfg.social?.[key])
    .map(([key, name]) => `<li><a class="footer-${key}" href="${esc(cfg.social[key])}" target="_blank" rel="noopener" title="${name}">${socialIcon(key)}<span>${name}</span></a></li>`);
  if (cfg.links?.rules) social.push(`<li><a href="${esc(cfg.links.rules)}" target="_blank" rel="noopener">${esc(t('nav.rules'))}</a></li>`);
  const quick = NAV.filter(([p]) => p).map(([p, key]) => `<li><a href="#/${p}">${esc(t(key))}</a></li>`).join('');
  // One centred column on phones, one row on desktop: logo, page links, social links.
  box.innerHTML = `<a class="footer-logo-link" href="#/" aria-label="Pole Position Racing"><img src="assets/logo-transparent.png" alt="" width="900" height="450" class="footer-logo"></a>
    <nav aria-label="${esc(t('footer.quick'))}"><ul class="footer-list">${quick}</ul></nav>
    ${social.length ? `<ul class="footer-list footer-social" aria-label="${esc(t('footer.follow'))}">${social.join('')}</ul>` : ''}`;
}


/* ---------- Rendering ---------- */
function resolve() {
  const p = path();
  for (const [re, fn] of ROUTES) {
    const m = re.exec(p);
    if (m) return fn(...m.slice(1).map((x) => (x == null ? x : decodeURIComponent(x))));
  }
  // Unknown address: suggest names close to its last part (e.g. #/kierowca/tazo → Tazo).
  return V.notFound(t('state.notFound'), model, p.split('/').filter(Boolean).at(-1) || '');
}

function render({ animate = false, soft = false } = {}) {
  if (!model) return;
  rememberLastTrack();
  buildFooter();
  pending = false;
  const view = resolve();
  const y = scrollY;
  const update = () => {
    main.innerHTML = view.html;
    view.init?.(main);
    V.initTabs(main);
    initTableFilters(main);
    // Keep the selected season visible in the horizontally scrolling season strip.
    const sn = main.querySelector('.season-nav');
    const cur = sn?.querySelector('[aria-current]');
    if (cur) sn.scrollLeft = cur.offsetLeft - sn.clientWidth / 2 + cur.offsetWidth / 2;
    document.title = view.title ? `${view.title} · Pole Position Racing` : 'Pole Position Racing';
    markCurrent();
    if (soft) scrollTo(0, y); else scrollTo(0, 0);
  };
  const focus = () => { if (!soft) main.querySelector('h1')?.focus({ preventScroll: true }); };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (animate && !reduce && document.startViewTransition) {
    const vt = document.startViewTransition(update);
    // A newer navigation skips the running transition; that is expected, not an error.
    vt.ready.catch(() => {});
    vt.finished.finally(focus);
  } else {
    update();
    if (animate) focus();
  }
}

// The latest race's track, remembered from the previous visit so the loading screen can outline the same circuit.
const LAST_TRACK_KEY = 'ppr-last-track';
function rememberLastTrack() {
  const code = model?.raceList.at(-1)?.track;
  try { if (code && localStorage.getItem(LAST_TRACK_KEY) !== code) localStorage.setItem(LAST_TRACK_KEY, code); } catch { /* storage unavailable */ }
}
function skelTrack() {
  let code = null;
  try { code = localStorage.getItem(LAST_TRACK_KEY); } catch { /* storage unavailable */ }
  const g = TRACK_GEO[code];
  // First visit ever: a generic circuit outline instead.
  const [vb, d, w] = g ? [g.vb, g.d, 24] : ['0 0 500 300', 'M70 220 L120 90 Q130 62 160 70 L250 96 Q275 103 290 84 L330 40 Q350 20 375 34 L440 80 Q462 96 448 120 L400 190 Q388 208 400 224 L418 246 Q428 262 410 266 L110 266 Q62 266 70 220 Z', 14];
  return `<svg class="skel-track" viewBox="${vb}" aria-hidden="true" focusable="false"><path d="${d}" stroke-width="${w}"/></svg>`;
}

// First load with nothing cached: grey placeholder shapes in the layout of the page being opened
// (the home page or a page with tabs and a table), so the content drops into place without jumps.
function showSkeleton() {
  const bar = (cls) => `<span class="skel ${cls}"></span>`;
  const table = (n) => `<div class="skel-card skel-table">${'<div class="skel-row"><span class="skel skel-pos"></span><span class="skel skel-name"></span><span class="skel skel-num"></span></div>'.repeat(n)}</div>`;
  const block = (body) => `<div class="skel-block">${bar('skel-head')}${body}</div>`;
  const home = !path().split('/')[0];
  const body = home
    ? `<div class="skel-card skel-hero"><div class="skel-hero-copy">${bar('skel-logo')}${bar('skel-title')}<div class="skel-btns">${bar('skel-btn').repeat(3)}</div></div>${skelTrack()}</div>
      <div class="skel-counters">${bar('skel-tile').repeat(4)}</div>
      <div class="skel-card skel-fact">${bar('skel-kicker')}${bar('skel-line')}${bar('skel-who')}</div>
      <div class="skel-home">
        <div class="skel-main">${block('<div class="skel-card skel-race"></div>')}<div class="skel-pair">${block(table(10))}${block(table(10))}</div></div>
        <div class="skel-side">${block(table(10))}</div>
      </div>`
    : `${bar('skel-tabs')}${block(table(12))}`;
  main.innerHTML = `<div class="skeleton" aria-busy="true"><p class="sr-only" role="status">${esc(t('state.loading'))}</p>${body}</div>`;
}

// Nothing to show at all: explain what happened and offer a manual retry next to the automatic one.
function showError() {
  main.innerHTML = `<div class="state state-error" role="alert">
    <div class="loader loader-still" aria-hidden="true"></div>
    <p>${esc(t('state.error'))}</p>
    <button type="button" class="btn btn-gold" data-retry>${esc(t('state.retry'))}</button>
  </div>`;
}

// Data is on screen but the latest refresh failed: a thin banner with the saved time and a retry button.
function updateBanner() {
  let bar = document.getElementById('stale-banner');
  // Offline the saved data is shown without any notice; the page refreshes on its own once the connection is back.
  if (!(model && fetchFailed) || !navigator.onLine) { bar?.remove(); return; }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'stale-banner';
    bar.className = 'stale-banner';
    bar.setAttribute('role', 'status');
    main.before(bar);
  }
  bar.innerHTML = `<span>${esc(t('state.staleBanner', { time: fmt.time(dataTime) }))}</span><button type="button" class="btn" data-retry>${esc(t('state.retry'))}</button>`;
}

let retryTimer = 0;
async function retryNow(btn) {
  if (btn) { btn.disabled = true; btn.textContent = t('state.retrying'); }
  clearTimeout(retryTimer);
  await refresh();
  if (btn?.isConnected) { btn.disabled = false; btn.textContent = t('state.retry'); }
}

/* ---------- Data ---------- */
async function refresh() {
  lastFetch = Date.now();
  try {
    const { entry, model: fresh } = await fetchTexts(cfg.sheetId);
    fetchFailed = false;
    dataTime = entry.t;
    const changed = !texts || JSON.stringify(entry.texts) !== JSON.stringify(texts);
    texts = entry.texts;
    if (changed) {
      const first = !model;
      model = fresh;
      // Never yank the page from under someone who is typing or choosing in a form control.
      const busy = main.contains(document.activeElement) && document.activeElement.matches('input, select, textarea');
      if (busy) pending = true; else render({ soft: !first });
    }
  } catch (err) {
    console.warn('Sheet refresh failed:', err);
    fetchFailed = true;
    if (!model) { showError(); clearTimeout(retryTimer); retryTimer = setTimeout(refresh, 30_000); }
  }
  updateBanner();
}

/* Offline: the service worker keeps every file the page fetches. Flags come from a CDN one country at a time,
   so fetch the ones the league uses once (in idle time) — then every page shows its flags without internet. */
const FLAG_URL = 'https://cdn.jsdelivr.net/npm/flag-icons@7.5.0/flags/4x3/';
function warmOffline() {
  if (!model || !('caches' in window) || !navigator.onLine) return;
  const key = 'ppr-flags-warm';
  const codes = new Set([...model.drivers.map((d) => d.flag), ...model.tracks.map((tr) => TRACK_COUNTRY[tr.code])].filter(Boolean));
  const sig = [...codes].sort().join(',');
  try { if (localStorage.getItem(key) === sig) return; } catch { /* storage unavailable */ }
  // Straight into the service worker's CDN cache (works on the first visit, before the worker controls the page).
  const run = () => caches.open('ppr-cdn')
    // no-cors, the same way the flag stylesheet loads them, so the saved copy matches what pages ask for.
    .then((c) => Promise.allSettled([...codes].map((code) => {
      const url = `${FLAG_URL}${code}.svg`;
      return fetch(url, { mode: 'no-cors' }).then((res) => c.put(url, res));
    })))
    .then(() => { try { localStorage.setItem(key, sig); } catch { /* storage unavailable */ } });
  ('requestIdleCallback' in window ? requestIdleCallback : setTimeout)(run);
}

async function loadConfig() {
  try {
    const res = await fetch('config.json', { cache: 'no-store' });
    if (res.ok) cfg = { ...DEFAULT_CFG, ...(await res.json()) };
  } catch { /* use defaults */ }
}

/* ---------- Boot ---------- */
async function boot() {
  document.documentElement.lang = lang;
  initTooltip();
  initStickyHeads();
  // "Back to top" button: shows after scrolling about two screens down a long page.
  const toTop = document.querySelector('.to-top');
  const syncTop = () => {
    const on = scrollY > innerHeight * 1.5;
    toTop.classList.toggle('on', on);
    toTop.toggleAttribute('aria-hidden', !on);
    toTop.tabIndex = on ? 0 : -1;
  };
  addEventListener('scroll', syncTop, { passive: true });
  toTop.addEventListener('click', () => {
    scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    main.querySelector('h1')?.focus({ preventScroll: true });
  });
  showSkeleton();
  // Offline copy and "add to home screen" (see sw.js); a failure here only means no offline mode.
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  await loadConfig();
  buildNav();
  initSearch(header.querySelector('.search-button'), () => model);
  initDriverPreview(() => model);

  new ResizeObserver(() => layoutNav()).observe(header);
  new ResizeObserver(() => layoutNav(true)).observe(menu);

  menu.addEventListener('click', (e) => {
    if (e.target.closest('a') && menu.matches('[popover]:popover-open')) menu.hidePopover();
  });
  header.querySelector('.lang').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-lang]');
    if (!b || b.dataset.lang === lang) return;
    setLang(b.dataset.lang);
    buildNav();
    render({ soft: true });
    updateBanner();
    if (!model && fetchFailed) showError();
  });
  // Count in-site steps in history.state so the back arrow on detail pages never leaves the site.
  if (typeof history.state?.depth !== 'number') history.replaceState({ depth: 0 }, '');
  let depth = history.state.depth;
  addEventListener('hashchange', () => {
    if (typeof history.state?.depth === 'number') depth = history.state.depth; // back/forward
    else history.replaceState({ depth: ++depth }, '');
    if (!path().split('/')[0]) V.newFact(); // back on the home page: draw a new fact
    render({ animate: true });
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-retry]');
    if (b) retryNow(b);
    if (e.target.closest('[data-open-search]')) openSearch();
    // Phones: show or hide the extra columns of one table.
    const cols = e.target.closest('[data-table-cols]');
    if (cols) {
      const on = cols.getAttribute('aria-pressed') !== 'true';
      cols.setAttribute('aria-pressed', on);
      cols.querySelector('[data-more]').hidden = on;
      cols.querySelector('[data-less]').hidden = !on;
      document.getElementById(cols.dataset.tableCols)?.closest('.table-wrap').classList.toggle('cols-all', on);
    }
    if (e.target.closest('[data-back]') && depth > 0) { e.preventDefault(); history.back(); }
    // Calendar race cards: a click anywhere outside a link opens the race (driver/team links keep their own target).
    const card = e.target.closest('[data-card-href]');
    if (card && !e.target.closest('a, button') && !getSelection().toString()) location.hash = card.dataset.cardHref;
  });

  const cached = readCache();
  if (cached) {
    try {
      texts = cached.texts;
      dataTime = cached.t;
      model = buildModel(texts);
      render();
    } catch (err) { console.warn('Cached data unusable:', err); model = null; texts = null; }
  }
  await refresh();
  warmOffline();
  addEventListener('online', () => refresh());
  addEventListener('offline', updateBanner);

  const every = Math.max(1, cfg.refreshMinutes || 5) * 60_000;
  setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, every);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastFetch > 60_000) refresh();
  });
  // Apply data that arrived while a form control had focus once the user moves on.
  main.addEventListener('focusout', () => { if (pending) setTimeout(() => { if (pending && !main.contains(document.activeElement)) render({ soft: true }); }, 0); });
}

boot();
