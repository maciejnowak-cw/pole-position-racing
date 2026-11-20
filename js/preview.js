// Preview cards: hovering a driver or team link (mouse only) shows who it is and the key all-time totals.
import { t, fmt } from './i18n.js';
import { esc, flag, teamBadge, teamLogo } from './ui.js';
import { RESERVE } from './teams.js';

const SHOW_DELAY = 280;
const GAP = 10;

let card, getModel, timer = 0, current = null;

const stat = (label, value) => `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`;

function driverContent(d, model) {
  const seasons = `S${d.firstSeason}${d.lastSeason !== d.firstSeason ? `–S${d.lastSeason}` : ''}`;
  return `<div class="pv-head">
      ${flag(d.flag)}
      <div><p class="pv-name">${esc(d.name)}</p><p class="pv-sub">${esc(fmt.country(d.flag) || d.country || '')} · ${seasons}</p></div>
      <span class="pv-goat ${d.goat <= 3 ? 'pv-goat-top' : ''}">#${d.goat} GOAT</span>
    </div>
    <p class="pv-team">${d.lastSeason < Math.max(...model.seasonNums) // not in the current season: a reserve driver now
      ? teamBadge(RESERVE) : teamBadge(d.lastTeamKey, d.lastTeam, { link: false })}</p>
    <dl class="pv-stats">
      ${stat(t('common.points'), fmt.int(d.points))}
      ${stat(t('common.races'), fmt.int(d.races))}
      ${stat(t('common.wins'), fmt.int(d.wins))}
      ${stat(t('common.podiums'), fmt.int(d.podiums))}
      ${stat(t('common.titles'), d.titles.length ? `★ ${d.titles.length}` : '0')}
    </dl>`;
}

function teamContent(tm) {
  return `<div class="pv-head">
      ${teamLogo(tm.key, 'pv-logo')}
      <div><p class="pv-name">${esc(tm.info.name)}</p><p class="pv-sub">${esc(tm.info.full)}</p></div>
      <span class="pv-goat ${tm.pos <= 3 ? 'pv-goat-top' : ''}" title="${esc(t('common.allTime'))}">#${tm.pos}</span>
    </div>
    <dl class="pv-stats">
      ${stat(t('common.points'), fmt.int(tm.points))}
      ${stat(t('common.races'), fmt.int(tm.raceCount))}
      ${stat(t('common.wins'), fmt.int(tm.wins))}
      ${stat(t('common.podiums'), fmt.int(tm.podiums))}
      ${stat(t('common.titles'), tm.titles.length ? `★ ${tm.titles.length}` : '0')}
    </dl>`;
}

// Driver names inside a card that is itself a link carry data-preview-driver instead of their own link.
const LINKS = 'a[href^="#/driver/"], a[href^="#/team/"], [data-preview-driver]';

function place(link) {
  const r = link.getBoundingClientRect();
  const w = card.offsetWidth, h = card.offsetHeight;
  let x = r.left + r.width / 2 - w / 2;
  x = Math.max(GAP, Math.min(x, innerWidth - w - GAP));
  // Below the link when there is room, otherwise above it.
  const y = r.bottom + GAP + h <= innerHeight ? r.bottom + GAP : r.top - GAP - h;
  card.style.translate = `${Math.round(x)}px ${Math.round(Math.max(GAP, y))}px`;
}

function show(link) {
  const model = getModel();
  const named = link.dataset.previewDriver;
  const [, kind, raw] = named ? [, 'driver', encodeURIComponent(named)] : link.getAttribute('href').match(/^#\/(driver|team)\/(.+)$/) || [];
  const key = raw && decodeURIComponent(raw);
  const item = kind === 'driver' ? model?.driverMap.get(key) : model?.teamMap.get(key);
  if (!item) return;
  card.innerHTML = kind === 'driver' ? driverContent(item, model) : teamContent(item);
  // Team cards take the team colour on the top edge; driver cards stay gold.
  card.style.setProperty('--pv-accent', kind === 'team' ? item.info.color : '');
  card.classList.add('on');
  place(link);
  current = link;
}

function hide() {
  clearTimeout(timer);
  card.classList.remove('on');
  current = null;
}

export function initDriverPreview(modelGetter) {
  // Only for a real mouse (checked on every pointer event below, not once at start: a laptop with a touch screen,
  // or a window that started in a phone-sized view, still gets the cards); taps open the profile as before.
  getModel = modelGetter;
  card = document.createElement('div');
  card.className = 'driver-preview';
  card.setAttribute('aria-hidden', 'true'); // the same information is one click away on the profile
  document.body.append(card);

  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const link = e.target.closest?.(LINKS);
    if (!link || link === current) return;
    // No preview for the driver or team whose page is already open.
    if (location.hash === link.getAttribute('href')) return;
    // Team cards on the Teams page already show the same numbers.
    if (link.matches('.team-card')) return;
    clearTimeout(timer);
    timer = setTimeout(() => show(link), current ? 0 : SHOW_DELAY);
  });
  document.addEventListener('pointerout', (e) => {
    const link = e.target.closest?.(LINKS);
    if (link && !link.contains(e.relatedTarget)) hide();
  });
  addEventListener('scroll', hide, { passive: true });
  addEventListener('hashchange', hide);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
}
