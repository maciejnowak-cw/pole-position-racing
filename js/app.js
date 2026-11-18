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
  buildDock();
  header.querySelector('nav').setAttribute('aria-label', t('nav.primary'));
  menuBtn.querySelector('span').textContent = t('nav.menu');
  const sb = header.querySelector('.search-button');
  sb.setAttribute('aria-label', t('search.open'));
  sb.title = `${t('search.open')} (Ctrl+K)`;
  document.querySelector('.skip').textContent = t('nav.skip');
  const lg = header.querySelector('.lang');
  lg.setAttribute('aria-label', t('nav.lang'));
  for (const b of lg.querySelectorAll('button')) b.setAttribute('aria-pressed', b.dataset.lang === lang);
  buildFooter();
  markCurrent();
  layoutNav(true);
}

/* Phones: the sections live in a dock of icons at the bottom instead of the top menu. */
const DOCK_ICONS = {
  '': '<path d="M4 11.5 12 5l8 6.5"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>',
  standings: '<rect x="5" y="6" width="14" height="13.5" rx="2"/><path d="M15 4v3.5M9 4v3.5M5 10.5h14M9 15h1.5M13.5 15h1.5"/>',
  goat: '<path d="M14 19a6 6 0 0 0-12 0"/><circle cx="8" cy="9" r="4"/><path d="M22 19a6 6 0 0 0-6-6 4 4 0 1 0 0-8"/>',
  teams: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/>',
  tracks: '<path d="M6.5 21V4M6.5 4h11l-2 4 2 4h-11"/>', // shifted right so the flag sits centred
  'hall-of-fame': '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 4M17 6h2.5a2.5 2.5 0 0 1-2.6 4"/>',
  stats: '<path d="M4 20h16M7 16v-5M12 16V6M17 16v-8"/>',
};
function buildDock() {
  const dock = document.querySelector('.dock');
  dock.setAttribute('aria-label', t('nav.primary'));
  // Icons only; the full section name is the link's accessible name and its tooltip.
  dock.innerHTML = NAV.map(([p, key]) => `<a href="#/${p}" data-nav="${p}" aria-label="${esc(t(key))}" title="${esc(t(key))}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${DOCK_ICONS[p] || ''}</svg></a>`).join('');
}

function markCurrent() {
  const first = path().split('/')[0];
  const sec = SECTION[first] || first;
  for (const a of document.querySelectorAll('.site-menu [data-nav], .dock [data-nav]')) {
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

// Reloading the page keeps the reader where they were: the position is saved when the page is left
// and put back by the first render after a reload of the same address.
const SCROLL_KEY = 'ppr-scroll';
let restoreY = null;
try {
  history.scrollRestoration = 'manual';
  const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || 'null');
  const reload = performance.getEntriesByType('navigation')[0]?.type === 'reload';
  if (reload && saved?.hash === location.hash && saved.y > 0) restoreY = saved.y;
} catch { /* no storage: start at the top */ }
const saveScroll = () => { try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ hash: location.hash, y: Math.round(scrollY) })); } catch { /* ignore */ } };
addEventListener('pagehide', saveScroll);
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveScroll(); });

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
    document.title = view.title ? `${view.title} · Pole Position Racing` : 'Pole Position Racing';
    markCurrent();
    if (soft) scrollTo(0, y);
    else if (restoreY != null) { const to = restoreY; restoreY = null; scrollTo(0, to); requestAnimationFrame(() => scrollTo(0, to)); }
    else scrollTo(0, 0);
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

/* Touch screens: pulling the page down while it is at the very top reloads the league data
   (the browser's own pull-to-refresh is switched off in style.css so the two never fire together). */
// Scrolls to the top on a soft ease-in-out curve; longer pages take a little longer, but never more than 0.7 s.
let glide = 0;
function glideToTop() {
  cancelAnimationFrame(glide);
  const from = scrollY;
  if (!from) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { scrollTo(0, 0); return; }
  const dur = Math.min(700, 300 + from / 8);
  const t0 = performance.now();
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    scrollTo({ top: from * (1 - ease(k)), behavior: 'instant' });
    if (k < 1) glide = requestAnimationFrame(step);
  };
  glide = requestAnimationFrame(step);
  // A finger on the screen takes over.
  addEventListener('touchstart', () => cancelAnimationFrame(glide), { once: true, passive: true });
}

function inScrollBox(el) {
  for (let n = el instanceof Element ? el : null; n && n !== document.body; n = n.parentElement) {
    if (n.scrollHeight > n.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(n).overflowY)) return true;
  }
  return false;
}

function initPullToRefresh() {
  if (!matchMedia('(pointer: coarse)').matches) return;
  const ptr = document.createElement('div');
  ptr.className = 'ptr';
  ptr.setAttribute('aria-hidden', 'true');
  ptr.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4"/></svg>';
  document.body.append(ptr);
  const LIMIT = 110, READY = 70;
  let startY = null, startX = 0, pull = 0, busy = false;
  const show = (px) => {
    ptr.style.setProperty('--pull', `${px}px`);
    ptr.style.setProperty('--turn', `${px * 3}deg`);
    ptr.style.setProperty('--p', Math.min(1, px / READY).toFixed(3)); // fades and grows in with the pull
    ptr.classList.toggle('ready', px >= READY);
  };
  addEventListener('touchstart', (e) => {
    // Not while a pop-up is open, nor when the finger starts in a box that scrolls on its own (e.g. the season list).
    const blocked = busy || e.touches.length > 1 || document.querySelector(':popover-open, dialog[open], .season-pick.open')
      || inScrollBox(e.target);
    startY = !blocked && scrollY <= 0 ? e.touches[0].clientY : null;
    startX = e.touches[0].clientX;
  }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (startY === null) return;
    const dy = e.touches[0].clientY - startY;
    if (dy <= 0 || scrollY > 0) { pull = 0; show(0); ptr.classList.remove('on'); return; }
    // A sideways swipe (e.g. scrolling a wide table) is not a pull: let it go.
    if (!pull && Math.abs(e.touches[0].clientX - startX) > dy) { startY = null; return; }
    // Older iOS ignores overscroll-behavior: keep the page itself still while the indicator is pulled.
    if (e.cancelable) e.preventDefault();
    pull = LIMIT * (1 - Math.exp(-dy / 160)); // eases out towards LIMIT, like the system gesture
    ptr.classList.add('on');
    show(pull);
  }, { passive: false });
  addEventListener('touchend', async () => {
    if (startY === null) return;
    startY = null;
    if (pull < READY) { pull = 0; ptr.classList.remove('on'); show(0); return; }
    busy = true;
    ptr.classList.add('spin');
    show(READY);
    // Spin at least briefly, so a fast refresh still reads as "done".
    await Promise.all([refresh(), new Promise((r) => setTimeout(r, 600))]);
    // Like a fresh visit: the home page draws a new fact even when the data has not changed.
    if (model && !path().split('/')[0]) { V.newFact(); render({ soft: true }); }
    ptr.classList.remove('spin', 'on');
    show(0);
    pull = 0;
    busy = false;
  });
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
  // Phones: the dock slides away while scrolling down and comes back on any scroll up (or near the top).
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY, dy = y - lastY;
    if (Math.abs(dy) < 6) return;
    // At the very bottom the dock comes back, filling the room the page leaves for it.
    const atEnd = y + innerHeight >= document.documentElement.scrollHeight - 4;
    document.body.classList.toggle('dock-off', dy > 0 && y > 80 && !atEnd);
    lastY = y;
  }, { passive: true });
  // Phones: the logo in the middle of the top bar takes you to the top of the current page (home is in the dock).
  const logo = document.querySelector('.site-logo');
  logo.addEventListener('click', (e) => {
    if (!matchMedia('(width < 760px)').matches) return;
    e.preventDefault();
    logo.classList.remove('hop');
    void logo.offsetWidth; // restart the little bounce on repeated taps
    logo.classList.add('hop');
    glideToTop();
    main.querySelector('h1')?.focus({ preventScroll: true });
  });
  logo.addEventListener('animationend', () => logo.classList.remove('hop'));
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
    const before = depth;
    if (typeof history.state?.depth === 'number') depth = history.state.depth; // back/forward
    else history.replaceState({ depth: ++depth }, '');
    // Which way the page slides in (see "View transitions" in style.css).
    document.documentElement.dataset.nav = depth < before ? 'back' : 'forward';
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
  initPullToRefresh();
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
