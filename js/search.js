// Quick search: a dialog opened from the header button, Ctrl/Cmd+K or "/", jumping to a driver, team, track,
// season ("S12") or race ("Monza S12").
import { t } from './i18n.js';
import { esc, href, flag, teamLogo, fold, PHONE_TRACK_NAME } from './ui.js';
import { TRACK_COUNTRY } from './countries.js';
import { TRACK_GEO } from './track-geo.js';


// A country's name in both site languages ("Polska Poland"), so typing a country finds its drivers and tracks.
const GB_PARTS = { 'gb-eng': 'Anglia England', 'gb-sct': 'Szkocja Scotland', 'gb-wls': 'Walia Wales', 'gb-nir': 'Irlandia Północna Northern Ireland' };
const regionNames = ['pl', 'en'].map((l) => new Intl.DisplayNames([l], { type: 'region' }));
function countryNames(iso) {
  if (!iso) return '';
  if (GB_PARTS[iso]) return `${GB_PARTS[iso]} ${regionNames.map((r) => r.of('GB')).join(' ')}`;
  try { return regionNames.map((r) => r.of(iso.toUpperCase())).join(' '); } catch { return ''; }
}

let dialog, input, list, recentHead, getModel, index = [], active = 0, results = [];

// The last few picked results (their addresses), kept in this browser only and listed while the field is empty.
const RECENT_KEY = 'ppr-recent-search';
const RECENT_MAX = 6;
function recentUrls() {
  try {
    const saved = JSON.parse(localStorage.getItem(RECENT_KEY));
    return Array.isArray(saved) ? saved.filter((u) => typeof u === 'string') : [];
  } catch { return []; }
}
function saveRecent(urls) {
  try { if (urls.length) localStorage.setItem(RECENT_KEY, JSON.stringify(urls)); else localStorage.removeItem(RECENT_KEY); } catch { /* storage unavailable */ }
}
// Looked up in the current index, so names follow the chosen language and entries gone from the data drop out.
const recentItems = () => recentUrls().map((u) => index.find((it) => it.url === u)).filter(Boolean);

function buildIndex(model) {
  const items = [];
  for (const d of model.drivers) items.push({ kind: 'driver', name: d.name, country: countryNames(d.flag), url: href.driver(d.name), icon: flag(d.flag), rank: d.points });
  for (const tm of model.teams) {
    const names = [tm.info.name, tm.info.full, ...(tm.names ? tm.names.keys() : [])].filter(Boolean);
    items.push({ kind: 'team', name: tm.info.name, alt: names.join(' '), url: href.team(tm.key), icon: teamLogo(tm.key), rank: tm.points });
  }
  for (const tr of model.tracks) items.push({ kind: 'track', name: tr.name, alt: `${tr.code} ${TRACK_GEO[tr.code]?.loc || ''} ${tr.fullName} `, country: countryNames(TRACK_COUNTRY[tr.code]), url: href.track(tr.code), icon: flag(TRACK_COUNTRY[tr.code] || ''), rank: tr.races.length, short: PHONE_TRACK_NAME[tr.code] });
  for (const n of model.seasonNums) {
    items.push({ kind: 'season', name: t('search.seasonName', { n }), alt: `S${n} sezon season`, url: href.season(n), icon: `<span class="search-season">S${n}</span>`, rank: n });
  }
  // Races are found by track and season together ("Monza S12", "S12 Monza", "S12 R5"); see find().
  model.raceList.forEach((r, i) => {
    const country = TRACK_COUNTRY[r.track] || '';
    items.push({
      kind: 'race', race: true, name: model.trackName[r.track] || r.track, meta: `S${r.season} · R${r.round}`,
      alt: `${r.track} ${TRACK_GEO[r.track]?.loc || ''} ${model.trackFullName[r.track] || ''} ${countryNames(country)} S${r.season} R${r.round}`,
      url: href.race(r.id), icon: flag(country), rank: i,
    });
  });
  for (const it of items) {
    it.key = fold(`${it.name} ${it.alt || ''}`);
    if (it.country) it.countryKey = fold(it.country);
  }
  return items;
}

function find(q) {
  // "sezon 12" / "season 12" work like "S12", and "runda 5" / "round 5" like "R5" (also for races: "Monza sezon 12").
  const all = fold(q.trim())
    .replace(/\b(?:sezon|season)\s*(\d+)/g, 's$1')
    .replace(/\b(?:runda|round)\s*(\d+)/g, 'r$1')
    .split(/\s+/).filter(Boolean);
  // A country or track followed by the bare word "sezon" / "season" (even half typed: "Włochy sez")
  // asks for its races in every season: "Włochy sezon" lists each round held in Italy, newest first.
  const SEASON_WORD = /^(?:sez(?:o|on)?|sea(?:s|so|son)?)$/;
  const onlyRaces = all.length > 1 && all.slice(1).some((w) => SEASON_WORD.test(w));
  const tokens = onlyRaces ? all.filter((w, i) => !i || !SEASON_WORD.test(w)) : all;
  const f = tokens.join(' ');
  if (!f) return [];
  // Single races only once the query names a season or round ("s12", "r5"), so a plain track name
  // lists the track itself instead of all its races.
  const withRaces = onlyRaces || tokens.some((w) => /^[sr]\d+$/.test(w));
  const score = (it) => {
    if (it.race ? !withRaces : onlyRaces) return 9;
    const words = it.key.split(/\s+/);
    // The short track name ("Spa", "COTA") counts like the full name, so it wins over a match on the track code.
    if (it.short && fold(it.short) === f) return -1; // exactly the short name: that track first
    if (fold(it.name).startsWith(f) || (it.short && fold(it.short).startsWith(f))) return 0;
    if (tokens.every((tk) => words.some((w) => w.startsWith(tk)))) return 1;
    if (it.key.includes(f)) return 2;
    // Only the country matches ("Polska", "Włochy"): its tracks first, then its drivers.
    if (it.countryKey?.includes(f)) return it.kind === 'track' ? 3 : 4;
    return 9;
  };
  // Best match first; at equal match seasons before their races, then bigger names (more points, races) and newer races.
  return index
    .map((it) => ({ it, score: score(it) }))
    .filter((x) => x.score < 9)
    .sort((a, b) => a.score - b.score || (a.it.race ? 1 : 0) - (b.it.race ? 1 : 0) || b.it.rank - a.it.rank)
    .slice(0, 12)
    .map((x) => x.it);
}

function draw() {
  const q = input.value;
  const blank = !q.trim();
  results = blank ? recentItems() : find(q);
  recentHead.hidden = !blank || !results.length;
  active = Math.min(active, Math.max(results.length - 1, 0));
  if (blank && !results.length) { list.innerHTML = ''; input.removeAttribute('aria-activedescendant'); return; }
  if (!results.length) { list.innerHTML = `<li class="search-empty" role="presentation">${esc(t('search.empty'))}</li>`; input.removeAttribute('aria-activedescendant'); return; }
  list.innerHTML = results.map((r, i) => `<li id="sr-${i}" role="option" aria-selected="${i === active}">
      <a href="${r.url}" tabindex="-1"><span class="search-ico">${r.icon}</span><span class="search-name">${esc(r.name)}</span><span class="search-kind">${esc(t('search.' + r.kind))}${r.meta ? ` · ${esc(r.meta)}` : ''}</span></a>
    </li>`).join('');
  if (active < 0) input.removeAttribute('aria-activedescendant'); else input.setAttribute('aria-activedescendant', `sr-${active}`);
  list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}

// Moves the highlight without redrawing the list (-1: nothing highlighted).
function highlight(i) {
  if (i === active) return;
  active = i;
  list.querySelectorAll('[role="option"]').forEach((li, n) => li.setAttribute('aria-selected', String(n === i)));
  if (i < 0) input.removeAttribute('aria-activedescendant'); else input.setAttribute('aria-activedescendant', `sr-${i}`);
}

function go(r) {
  if (!r) return;
  saveRecent([r.url, ...recentUrls().filter((u) => u !== r.url)].slice(0, RECENT_MAX));
  dialog.close();
  location.hash = r.url;
}

export function openSearch() {
  const model = getModel();
  if (!model) return;
  index = buildIndex(model);
  input.placeholder = t('search.placeholder');
  input.setAttribute('aria-label', t('search.label'));
  recentHead.querySelector('span').textContent = t('search.recent');
  recentHead.querySelector('button').textContent = t('search.clear');
  input.value = '';
  active = -1; // recent picks: highlighted only under the mouse or by the arrow keys
  draw();
  dialog.showModal();
  input.focus();
}

export function initSearch(button, modelGetter) {
  getModel = modelGetter;
  dialog = document.createElement('dialog');
  dialog.className = 'search-dialog';
  dialog.innerHTML = `<div class="search-box">
      <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
      <input type="search" role="combobox" aria-expanded="true" aria-controls="search-list" aria-autocomplete="list" autocomplete="off" spellcheck="false">
    </div>
    <div class="search-recent" hidden><span></span><button type="button"></button></div>
    <ul id="search-list" class="search-list" role="listbox"></ul>`;
  document.body.append(dialog);
  input = dialog.querySelector('input');
  list = dialog.querySelector('ul');
  recentHead = dialog.querySelector('.search-recent');
  recentHead.querySelector('button').addEventListener('click', () => { saveRecent([]); active = -1; draw(); input.focus(); });

  input.addEventListener('input', () => { active = input.value.trim() ? 0 : -1; draw(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!results.length) return;
      const last = results.length - 1;
      active = e.key === 'ArrowDown' ? (active >= last ? 0 : active + 1) : (active <= 0 ? last : active - 1);
      draw();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[active]);
    }
  });
  // The highlight follows the mouse; among recent picks it goes out when the mouse leaves the list.
  list.addEventListener('pointermove', (e) => {
    const li = e.pointerType === 'mouse' && e.target.closest('[role="option"]');
    if (li) highlight(+li.id.slice(3));
  });
  list.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !input.value.trim()) highlight(-1); });
  list.addEventListener('click', (e) => {
    const li = e.target.closest('[role="option"]');
    if (!li) return;
    e.preventDefault();
    go(results[+li.id.slice(3)]);
  });
  // Click on the backdrop closes the dialog.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  // Moving to another page (e.g. the back swipe) closes it.
  for (const ev of ['hashchange', 'popstate']) addEventListener(ev, () => { if (dialog.open) dialog.close(); });

  button.addEventListener('click', openSearch);
  addEventListener('keydown', (e) => {
    const typing = e.target.closest?.('input, textarea, select, [contenteditable]');
    if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); dialog.open ? dialog.close() : openSearch(); }
    else if (e.key === '/' && !typing && !dialog.open) { e.preventDefault(); openSearch(); }
  });
}
