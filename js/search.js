// Quick search: a dialog opened from the header button, Ctrl/Cmd+K or "/", jumping to a driver, team or track.
import { t } from './i18n.js';
import { esc, href, flag, teamLogo, fold } from './ui.js';
import { TRACK_COUNTRY } from './countries.js';


let dialog, input, list, getModel, index = [], active = 0, results = [];

function buildIndex(model) {
  const items = [];
  for (const d of model.drivers) items.push({ kind: 'driver', name: d.name, url: href.driver(d.name), icon: flag(d.flag), rank: d.points });
  for (const tm of model.teams) {
    const names = [tm.info.name, tm.info.full, ...(tm.names ? tm.names.keys() : [])].filter(Boolean);
    items.push({ kind: 'team', name: tm.info.name, alt: names.join(' '), url: href.team(tm.key), icon: teamLogo(tm.key), rank: tm.points });
  }
  for (const tr of model.tracks) items.push({ kind: 'track', name: tr.name, alt: tr.code, url: href.track(tr.code), icon: flag(TRACK_COUNTRY[tr.code] || ''), rank: tr.races.length });
  for (const it of items) it.key = fold(`${it.name} ${it.alt || ''}`);
  return items;
}

function find(q) {
  const f = fold(q.trim());
  if (!f) return [];
  // Names starting with the query first, then matches inside the name; bigger names (more points/races) first.
  return index
    .map((it) => ({ it, score: fold(it.name).startsWith(f) ? 0 : it.key.split(/\s+/).some((w) => w.startsWith(f)) ? 1 : it.key.includes(f) ? 2 : 9 }))
    .filter((x) => x.score < 9)
    .sort((a, b) => a.score - b.score || b.it.rank - a.it.rank)
    .slice(0, 12)
    .map((x) => x.it);
}

function draw() {
  const q = input.value;
  results = find(q);
  active = Math.min(active, Math.max(results.length - 1, 0));
  if (!q.trim()) { list.innerHTML = ''; input.removeAttribute('aria-activedescendant'); return; }
  if (!results.length) { list.innerHTML = `<li class="search-empty" role="presentation">${esc(t('search.empty'))}</li>`; input.removeAttribute('aria-activedescendant'); return; }
  list.innerHTML = results.map((r, i) => `<li id="sr-${i}" role="option" aria-selected="${i === active}">
      <a href="${r.url}" tabindex="-1"><span class="search-ico">${r.icon}</span><span class="search-name">${esc(r.name)}</span><span class="search-kind">${esc(t('search.' + r.kind))}</span></a>
    </li>`).join('');
  input.setAttribute('aria-activedescendant', `sr-${active}`);
  list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}

function go(r) {
  if (!r) return;
  dialog.close();
  location.hash = r.url;
}

export function openSearch() {
  const model = getModel();
  if (!model) return;
  index = buildIndex(model);
  dialog.querySelector('.search-hint').textContent = t('search.hint');
  input.placeholder = t('search.placeholder');
  input.setAttribute('aria-label', t('search.label'));
  input.value = '';
  active = 0;
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
    <ul id="search-list" class="search-list" role="listbox"></ul>
    <p class="search-hint sub"></p>`;
  document.body.append(dialog);
  input = dialog.querySelector('input');
  list = dialog.querySelector('ul');

  input.addEventListener('input', () => { active = 0; draw(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!results.length) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
      draw();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[active]);
    }
  });
  list.addEventListener('click', (e) => {
    const li = e.target.closest('[role="option"]');
    if (!li) return;
    e.preventDefault();
    go(results[+li.id.slice(3)]);
  });
  // Click on the backdrop closes the dialog.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  button.addEventListener('click', openSearch);
  addEventListener('keydown', (e) => {
    const typing = e.target.closest?.('input, textarea, select, [contenteditable]');
    if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); dialog.open ? dialog.close() : openSearch(); }
    else if (e.key === '/' && !typing && !dialog.open) { e.preventDefault(); openSearch(); }
  });
}
