// Shared rendering helpers: links, flags, team badges, track maps, sortable tables and small charts.
import { t, fmt } from './i18n.js';
import { teamInfo, logoFor, colorFor, RESERVE } from './teams.js';
import { TRACK_COUNTRY } from './countries.js';
import { TRACK_GEO } from './track-geo.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Case- and accent-insensitive form of a string for searching ("zelazny" matches "Żelazny"). */
export const fold = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');

export const href = {
  home: () => './',
  driver: (n) => `#/driver/${encodeURIComponent(n)}`,
  team: (k) => `#/team/${encodeURIComponent(k)}`,
  track: (c) => `#/track/${encodeURIComponent(c)}`,
  race: (id) => `#/race/${id}`,
  season: (n) => `#/season/${n}`,
};

/* ---------- Atoms ---------- */
export function flag(iso, label) {
  if (!iso) return '<span class="flag flag-empty" aria-hidden="true"></span>';
  const name = label || fmt.country(iso);
  return `<span class="fi fi-${esc(iso)} flag" role="img" aria-label="${esc(name)}" title="${esc(name)}"></span>`;
}

// Long nicknames may break after "_" or ")" (e.g. JML_Pawlo_Kubica) when a narrow table needs it.
export function driverLink(model, name, { flagOn = true, cls = '' } = {}) {
  const d = model.driverMap.get(name);
  return `<span class="who ${cls}">${flagOn ? flag(d?.flag, d ? fmt.country(d.flag) || d.country : '') : ''}<a href="${href.driver(name)}">${esc(name).replace(/([_)])/g, '$1<wbr>')}</a></span>`;
}

/** Team logo; pass the era name (e.g. "Alfa Romeo") to get that era's logo instead of the current one. */
export function teamLogo(key, cls = '', name = '') {
  const logo = logoFor(key, name);
  if (!logo) return `<span class="tlogo tlogo-empty ${cls}" aria-hidden="true"></span>`;
  const extra = `${logo.src.startsWith('hist/') ? ' tlogo-hist' : ''}${logo.invert ? ' tlogo-invert' : ''}${logo.round ? ' tlogo-round' : ''}`;
  return `<img class="tlogo${extra} ${cls}" src="assets/teams/${logo.src}" alt="" width="28" height="28" loading="lazy" decoding="async">`;
}

/** Team label: current logo for the lineage + the name used at the time. */
export function teamBadge(key, name, { link = true } = {}) {
  if (key === RESERVE) return `<span class="team team-reserve">${esc(t('common.reserve'))}</span>`;
  const info = teamInfo(key, name);
  const label = esc(name || info.name);
  const inner = `${teamLogo(key, '', name)}<span>${label}</span>`;
  const style = `style="--team:${colorFor(key, name)}"`;
  return link && key
    ? `<a class="team" ${style} href="${href.team(key)}">${inner}</a>`
    : `<span class="team" ${style}>${inner}</span>`;
}

// Short, well-known track names: used in narrow phone tables (the full circuit name stays on wider screens)
// and as extra search words, so "Spa" or "COTA" finds the track.
export const PHONE_TRACK_NAME = {
  ABU: 'Yas Marina', AUS: 'Albert Park', AUT: 'Red Bull Ring', AZE: 'Baku', BAH: 'Bahrain', BEL: 'Spa', BRA: 'Interlagos',
  CAN: 'Montreal', CHI: 'Shanghai', FRA: 'Paul Ricard', GBR: 'Silverstone', HUN: 'Hungaroring', ITA: 'Monza', IMO: 'Imola',
  JAP: 'Suzuka', MEX: 'Mexico City', MON: 'Monaco', NET: 'Zandvoort', POR: 'Portimão', RUS: 'Sochi', SAU: 'Jeddah',
  SIN: 'Marina Bay', SPA: 'Barcelona', USA: 'COTA', MIA: 'Miami', LAS: 'Las Vegas', QAT: 'Lusail', MAD: 'Madring',
};

export function trackFlag(code) {
  return flag(TRACK_COUNTRY[code] || '');
}

export function trackLink(model, code, { short = false } = {}) {
  const name = short ? code : model.trackName[code] || code;
  return `<span class="who">${trackFlag(code)}<a href="${href.track(code)}">${esc(name)}</a></span>`;
}

export function trackMap(code, { label = '', cls = '', draw = false } = {}) {
  const g = TRACK_GEO[code];
  if (!g) return `<div class="trackmap trackmap-empty ${cls}" aria-hidden="true"><span>${esc(code)}</span></div>`;
  const [sx, sy, ang] = g.start;
  const aria = label ? `role="img" aria-label="${esc(t('common.mapAlt', { name: label }))}"` : 'aria-hidden="true"';
  return `<svg class="trackmap ${draw ? 'trackmap-draw' : ''} ${cls}" viewBox="${g.vb}" ${aria} focusable="false">
    <path class="trk-glow" d="${g.d}"/>
    <path class="trk-base" d="${g.d}"/>
    <path class="trk-line" d="${g.d}" pathLength="1"/>
    <g transform="translate(${sx} ${sy}) rotate(${ang + 90})"><rect class="trk-start" x="-26" y="-7" width="52" height="14" rx="3"/></g>
  </svg>`;
}

export function posBadge(pos, dnf) {
  if (dnf) return `<span class="pos pos-dnf">${esc(t('common.dnf'))}</span>`;
  if (!pos) return '<span class="pos">—</span>';
  return `<span class="pos ${pos <= 3 ? 'pos-' + pos : ''}">${pos}</span>`;
}

export function sprintBadge(race) {
  if (!race?.sprint) return '';
  return `<span class="badge badge-sprint" title="${esc(t('common.sprintHint'))}">${esc(t('common.sprint'))}</span>`;
}

export const ordinalPos =(p) => (p ? `P${p}` : '—');

/** Slanted season chip linking to the season; `champion` paints it gold (title won that season). */
export function seasonTag(n, { champion = false, label = t('common.champion') } = {}) {
  if (!champion) return `<a class="tag" href="${href.season(n)}"><span>S${n}</span></a>`;
  return `<a class="tag tag-gold" href="${href.season(n)}" title="${esc(label)}"><span>S${n}</span><span class="vh"> — ${esc(label)}</span></a>`;
}

export function statTile(label, value, sub = '', { accent = false } = {}) {
  return `<div class="tile ${accent ? 'tile-accent' : ''}"><dt>${esc(label)}</dt><dd><span class="tile-value">${value}</span>${sub ? `<span class="tile-sub">${sub}</span>` : ''}</dd></div>`;
}

export function section(title, body, { id = '', action = '', cls = '' } = {}) {
  const hid = id ? `id="${id}-h"` : '';
  return `<section class="block ${cls}" ${id ? `aria-labelledby="${id}-h"` : ''}>
    <header class="block-head"><h2 ${hid}>${esc(title)}</h2>${action}</header>
    ${body}
  </section>`;
}

export const moreLink = (url, label) => `<a class="more" href="${url}">${esc(label)}<span aria-hidden="true"> →</span></a>`;

/** Menu pages show no visible title block; the heading stays for screen readers and focus after navigation. */
export const hiddenHead = (title) => `<h1 class="sr-only" tabindex="-1">${esc(title)}</h1>`;

/** Back arrow for detail pages: goes back in the site's history, or to `fallback` when the page was opened directly (see app.js). */
export const backLink = (fallback) => `<a class="back-link" href="${fallback}" data-back aria-label="${esc(t('common.back'))}" title="${esc(t('common.back'))}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></a>`;

/** League social media: [key, name, icon path]; links live in config.json ("social"). */
export const SOCIAL = [
  ['discord', 'Discord', '<path fill-rule="evenodd" d="M19.3 5.3A16.6 16.6 0 0 0 15.2 4l-.5 1a15.4 15.4 0 0 0-5.4 0l-.5-1a16.6 16.6 0 0 0-4.1 1.3C2.1 9.2 1.4 13 1.8 16.7a16.7 16.7 0 0 0 5 2.5l1.1-1.7a10.8 10.8 0 0 1-1.7-.8l.4-.3a11.9 11.9 0 0 0 10.8 0l.4.3c-.5.3-1.1.6-1.7.8l1.1 1.7a16.7 16.7 0 0 0 5-2.5c.5-4.3-.8-8.1-2.9-11.4zM8.7 14.5c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2zm6.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2z"/>'],
  ['youtube', 'YouTube', '<path fill-rule="evenodd" d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8A26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3L10 15z"/>'],
  ['twitch', 'Twitch', '<path fill-rule="evenodd" d="M4.5 2.5 3 6.3V19.5h4.5V22h2.6l2.5-2.5h3.6l4.8-4.8V2.5H4.5zm14.7 11.4-2.8 2.8h-4.5l-2.5 2.5v-2.5H5.6V4.4h13.6v9.5zM11 7.5h1.9v5H11v-5zm4.6 0h1.9v5h-1.9v-5z"/>'],
];
export function socialIcon(key) {
  const icon = SOCIAL.find(([k]) => k === key)?.[2] || '';
  return `<svg class="ico-brand" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icon}</svg>`;
}

export function pageHead(title, lead = '', { kicker = '', aside = '' } = {}) {
  return `<header class="page-head">
    <div>${kicker ? `<p class="kicker">${kicker}</p>` : ''}<h1 tabindex="-1">${esc(title)}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}</div>
    ${aside}
  </header>`;
}

/* ---------- Sortable, responsive tables ---------- */
let tableSeq = 0;

/**
 * columns: { label, type: 'num'|'text', html(row,i), value(row,i), sort (default true), cls, rowHeader, sticky, desc (default dir) }
 */
export function table({ caption, columns, rows, hideCaption = true, cls = '', empty = '', filter = false, compact = true, colsToggle = true }) {
  const id = `tbl-${++tableSeq}`;
  if (!rows.length) return `<p class="empty">${esc(empty || t('common.noResults'))}</p>`;
  // Phones show only the key columns (position, name, points and those marked `keep`); the rest ("c-opt")
  // come back with the "All columns" button, so tables fit the screen instead of scrolling sideways.
  const optional = (c) => compact && !(c.sticky || c.rowHeader || c.keep || /\bc-pts\b/.test(c.cls || ''));
  const hidden = columns.filter(optional).length;
  const cellCls = (c) => [c.cls, c.type === 'num' ? 'num' : '', c.sticky ? 'stick stick-' + c.sticky : '', optional(c) ? 'c-opt' : ''].filter(Boolean).join(' ');
  const head = columns.map((c) => {
    // `headHtml` replaces the plain label in the column head (e.g. flag + track code).
    const inner = c.headHtml || esc(c.label);
    const label = c.abbr ? `<abbr title="${esc(c.abbr)}">${inner}</abbr>` : inner;
    return `<th scope="col" class="${cellCls(c)}">${label}</th>`;
  }).join('');
  const body = rows.map((r, ri) => `<tr>${columns.map((c) => {
    const tag = c.rowHeader ? 'th scope="row"' : 'td';
    return `<${tag} class="${cellCls(c)}">${c.html(r, ri)}</${tag.split(' ')[0]}>`;
  }).join('')}</tr>`).join('');
  // Optional search box above long tables; rows are filtered in place by initTableFilters().
  const box = filter ? `<div class="table-filter">
      <button type="button" class="table-filter-toggle" aria-expanded="false" aria-label="${esc(t('filter.label'))}" title="${esc(t('filter.label'))}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg></button>
      <span class="table-filter-field">
        <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
        <input type="search" data-filter="${id}" placeholder="${esc(t('filter.placeholder'))}" aria-label="${esc(t('filter.label'))}" aria-controls="${id}" autocomplete="off" spellcheck="false">
      </span>
      <span class="table-filter-count sub" aria-live="polite"></span>
    </div>` : '';
  // colsToggle:false keeps the phone view to the key columns with no way to show the rest.
  const more = hidden && colsToggle ? `<button type="button" class="table-cols" data-table-cols="${id}" aria-pressed="false">
      <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16M4 12h16M4 18h16M9 4v16M15 4v16"/></svg>
      <span data-more>${esc(t('table.allCols', { n: hidden }))}</span><span data-less hidden>${esc(t('table.fewerCols'))}</span>
    </button>` : '';
  // Search box and "All columns" share one row above the table (on wider screens the search box moves to the title row).
  const tools = box || more ? `<div class="table-tools">${box}${more}</div>` : '';
  return `${tools}<div class="table-wrap ${cls}" role="region" aria-labelledby="${id}-cap" tabindex="0">
    <table id="${id}">
      <caption id="${id}-cap" class="${hideCaption ? 'vh' : ''}">${esc(caption)}</caption>
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </div>`;
}

/** Wires the search boxes created by table({ filter: true }) inside `root`. */
/**
 * Long tables keep their column names under the site header while the page scrolls past them.
 * The table box scrolls sideways on narrow screens, which stops CSS sticky inside it from following the page,
 * so a copy of the head sits in a zero-height sticky strip right above the box. CSS moves it (smooth scrolling);
 * JS only copies column widths and the sideways scroll, and shows the copy while the real head is out of sight.
 * Tables in a .tall box scroll on their own and already pin their head with CSS.
 */
export function initStickyHeads() {
  const header = document.querySelector('.site-header');
  const main = document.querySelector('main');
  const pins = new Set();
  const headerH = () => header.offsetHeight;
  const setH = () => document.documentElement.style.setProperty('--site-header-h', `${headerH()}px`);
  const toggle = () => {
    const top = Math.max(0, header.getBoundingClientRect().bottom); // 0 while the phone header is slid away
    for (const p of pins) {
      if (!p.wrap.isConnected) { pins.delete(p); continue; }
      const head = p.table.tHead.getBoundingClientRect(), box = p.wrap.getBoundingClientRect();
      p.el.classList.toggle('on', head.top < top && box.bottom > top + head.height * 2);
    }
  };
  const attach = (wrap, table) => {
    const el = document.createElement('div');
    el.className = 'head-pin';
    el.setAttribute('aria-hidden', 'true');
    const box = document.createElement('div');
    // The copy wears the table's own extra classes (e.g. st-table), so class-scoped header styles match it too.
    box.className = ['head-pin-box', ...[...wrap.classList].filter((c) => c !== 'table-wrap' && c !== 'cols-all')].join(' ');
    const copy = document.createElement('table');
    box.append(copy); el.append(box); wrap.before(el);
    const fill = () => {
      const head = table.tHead.cloneNode(true);
      for (const x of head.querySelectorAll('[id]')) x.removeAttribute('id');
      copy.replaceChildren(head);
    };
    const sync = () => {
      const src = [...table.tHead.rows[0].cells], dst = [...copy.tHead.rows[0].cells];
      copy.style.width = `${table.offsetWidth}px`;
      src.forEach((th, i) => { if (dst[i]) dst[i].style.width = `${th.getBoundingClientRect().width}px`; });
      box.scrollLeft = wrap.scrollLeft;
    };
    fill();
    new ResizeObserver(sync).observe(table);
    wrap.addEventListener('scroll', () => { box.scrollLeft = wrap.scrollLeft; }, { passive: true });
    new MutationObserver(() => { fill(); sync(); }).observe(table.tHead, { subtree: true, childList: true, characterData: true });
    pins.add({ el, wrap, table });
  };
  const scan = () => {
    for (const wrap of main.querySelectorAll('.table-wrap:not([data-pinned])')) {
      const table = wrap.querySelector(':scope > table');
      if (!table?.tHead || wrap.closest('.tall') || table.tBodies[0].rows.length <= 12) continue;
      wrap.dataset.pinned = '';
      attach(wrap, table);
    }
    toggle();
  };
  setH();
  addEventListener('resize', () => { setH(); toggle(); });
  addEventListener('scroll', toggle, { passive: true });
  header.addEventListener('transitionend', toggle); // the phone header slid in or out
  new MutationObserver(scan).observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
}

export function initTableFilters(root) {
  // A section whose table has no search: the "All columns" switch joins the title row (it only shows on phones),
  // so no empty gap is left beside it.
  for (const tools of root.querySelectorAll('.table-tools')) {
    const head = tools.previousElementSibling;
    if (tools.querySelector('.table-filter') || !head?.matches('.block-head')) continue;
    head.append(...tools.children);
    tools.remove();
  }
  for (const input of root.querySelectorAll('input[data-filter]')) {
    const tbl = root.querySelector(`#${input.dataset.filter}`);
    if (!tbl) continue;
    const rows = [...tbl.tBodies[0].rows];
    // Row text plus flag country names, so "polska" finds Polish drivers.
    const keys = rows.map((r) => fold(`${r.textContent} ${[...r.querySelectorAll('[aria-label]')].map((x) => x.getAttribute('aria-label')).join(' ')}`.replace(/\s+/g, ' ')));
    const box = input.closest('.table-filter');
    const count = box.querySelector('.table-filter-count');
    // The search box is a magnifier at the table's right edge that opens the field on click.
    // In a titled section it sits on the title row on every screen, and the phone-only "All columns"
    // switch is dropped there (that table keeps its key columns on phones).
    const head = box.closest('.block')?.querySelector(':scope > .block-head');
    if (head) { const tools = box.parentElement; head.append(box); tools.remove(); }
    {
      box.classList.add('is-compact');
      const toggle = box.querySelector('.table-filter-toggle');
      const open = (on) => { box.classList.toggle('open', on); toggle.setAttribute('aria-expanded', on); };
      toggle.addEventListener('click', () => { open(true); input.focus(); });
      input.addEventListener('blur', () => { if (!input.value.trim()) open(false); });
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        input.value = ''; input.dispatchEvent(new Event('input'));
        open(false); toggle.focus();
      });
    }
    const none = document.createElement('p');
    none.className = 'empty table-filter-none';
    none.hidden = true;
    tbl.closest('.table-wrap').after(none);
    input.addEventListener('input', () => {
      const q = fold(input.value.trim());
      let shown = 0;
      rows.forEach((r, i) => { const hit = !q || keys[i].includes(q); r.hidden = !hit; if (hit) shown++; });
      count.textContent = q ? t('filter.count', { n: shown, total: rows.length }) : '';
      none.hidden = !(q && !shown);
      if (!none.hidden) none.textContent = t('filter.none', { q: input.value.trim() });
    });
  }
}

/* ---------- Charts (HTML/CSS bars with hover + focus tooltips) ---------- */
/** Rounded axis maximum and ~4 evenly spaced ticks (0, 50, 100…) so bar heights can be read off the axis. */
function niceScale(max) {
  if (max <= 4) return { top: Math.max(max, 1), ticks: Array.from({ length: Math.max(max, 1) + 1 }, (_, i) => i) };
  const raw = max / 5;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= raw);
  const top = Math.ceil(max / step) * step;
  return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
}

export function barChart({ items, label, color = 'var(--series-a)', unit = '' }) {
  if (!items.length) return '';
  const { top, ticks } = niceScale(Math.max(...items.map((i) => i.value), 1));
  // Every bar shows its value on top (readable on phones, where there is no hover); the highest stands out in gold.
  const peak = Math.max(...items.map((i) => i.value)); // every bar at the top value is gold (a tie shows both)
  const grid = ticks.map((v) => `<span class="tick" style="--y:${(v / top) * 100}%"><span>${esc(fmt.int(v))}</span></span>`).join('');
  return `<figure class="chart" role="group" aria-label="${esc(label)}">
    <div class="plot">
      <div class="bars" style="--n:${items.length}">
        <div class="ticks" aria-hidden="true">${grid}</div>
        ${items.map((it) => `<div class="bar-slot">
          <div class="bar${it.value ? '' : ' bar-zero'}${it.value && it.value === peak ? ' bar-peak' : ''}" tabindex="0" style="--h:${(it.value / top) * 100}%;--c:${color}" data-tip="${esc(it.tip || `${it.label}: ${it.value}${unit}`)}" aria-label="${esc(it.tip || `${it.label}: ${it.value}${unit}`)}">
            ${it.value ? `<span class="bar-val" aria-hidden="true">${esc(fmt.int(it.value))}</span>` : ''}
          </div>
          <span class="bar-x">${esc(it.label)}</span>
        </div>`).join('')}
      </div>
    </div>
  </figure>`;
}

export function initTooltip() {
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.setAttribute('aria-hidden', 'true');
  document.body.append(tip);
  const show = (el, x, y) => {
    tip.textContent = el.dataset.tip;
    tip.dataset.tone = el.dataset.tipTone || ''; // e.g. purple edge for fastest lap
    tip.classList.add('on');
    const r = tip.getBoundingClientRect();
    const left = Math.min(Math.max(8, x - r.width / 2), innerWidth - r.width - 8);
    const top = y - r.height - 12 < 8 ? y + 16 : y - r.height - 12;
    tip.style.translate = `${left}px ${top}px`;
  };
  const hide = () => tip.classList.remove('on');
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest?.('[data-tip]');
    if (el) show(el, e.clientX, e.clientY); else hide();
  });
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest?.('[data-tip]');
    if (!el) return hide();
    const r = el.getBoundingClientRect();
    show(el, r.left + r.width / 2, r.top);
  });
  document.addEventListener('scroll', hide, { passive: true });
}
