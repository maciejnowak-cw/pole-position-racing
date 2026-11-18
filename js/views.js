// Page renderers. Each returns { title, html, init? }.
import { t, fmt } from './i18n.js';
import { TEAMS, teamInfo, colorFor, RESERVE } from './teams.js';
import { TRACK_COUNTRY } from './countries.js';
import { TRACK_GEO } from './track-geo.js';
import { teammateBattles } from './data.js';
import {
  esc, href, flag, driverLink, teamBadge, teamLogo, trackLink, trackFlag, trackMap, posBadge, ordinalPos, seasonTag,
  statTile, section, moreLink, pageHead, hiddenHead, backLink, SOCIAL, socialIcon, table, barChart, sprintBadge, fold,
} from './ui.js';

/* ---------- shared bits ---------- */
const pts = (n) => `${fmt.int(n)}`;

function dnfCell(d) {
  return `${fmt.int(d.dnfs)} <span class="sub">(${fmt.pct(d.races ? d.dnfs / d.races : 0)})</span>`;
}

function posCol(get = (r) => r.pos) {
  return { label: t('common.pos'), type: 'num', sticky: 1, cls: 'c-pos', value: get, html: (r) => posBadge(get(r)) };
}
/** Position plus the move since the previous round (▲2 / ▼1); new entrants and unchanged places show nothing. */
function standingsPosCol() {
  return { ...posCol(), html: (r) => {
    const d = r.prevPos ? r.prevPos - r.pos : 0;
    // The slot is always there (empty when unchanged) so position badges line up down the column.
    const move = d ? `<span class="pos-move ${d > 0 ? 'up' : 'down'}" title="${esc(t('common.sinceLastRound'))}">${d > 0 ? '▲' : '▼'}${Math.abs(d)}</span>` : '<span class="pos-move"></span>';
    return `<span class="pos-cell">${posBadge(r.pos)}${move}</span>`;
  } };
}
function driverCol(model, get = (r) => r.name) {
  return { label: t('common.driver'), rowHeader: true, sticky: 2, cls: 'c-driver', value: get, html: (r) => driverLink(model, get(r)) };
}
const numCol = (label, get, opts = {}) => ({ label, type: 'num', desc: true, value: get, html: (r) => (opts.fmt ? opts.fmt(get(r), r) : fmt.int(get(r))), ...opts });

/** Pole position / fastest lap badges for one result, with full names on hover. */
function ppFl(e) {
  return `${e.pp ? ` <span class="badge badge-pp" data-tip="${esc(t('common.pole'))}" aria-label="${esc(t('common.pole'))}" role="img">PP</span>` : ''}${e.fl ? ` <span class="badge badge-fl" data-tip="${esc(t('common.fastestLap'))}" data-tip-tone="fl" aria-label="${esc(t('common.fastestLap'))}" role="img">${t('common.flShort')}</span>` : ''}`;
}

/** Driver with the team they drove for in that race (winner / pole / fastest lap rows). */
function driverTeam(model, e) {
  return e ? `<span class="pair">${driverLink(model, e.driver)}${teamBadge(e.teamKey, e.team)}</span>` : '—';
}

/** Team line-up for a season ("Skład: driver, driver"). */
function lineup(model, c) {
  if (!c?.lineup?.length) return '';
  return `<p class="lineup"><span class="lineup-label">${t('common.lineup')}</span><span class="list">${c.lineup.map((d) => driverLink(model, d.name)).join('')}</span></p>`;
}

function raceSummary(model, race) {
  return `<span class="race-chip">${seasonTag(race.season)}<span class="sub">${t('common.round')} ${race.round}</span></span>`;
}

function podium(model, race) {
  const top = race.entries.filter((e) => e.pos && e.pos <= 3 && !e.dnf).slice(0, 3);
  return `<ol class="podium">${top.map((e) => `<li class="podium-${e.pos}">
      ${posBadge(e.pos)}
      <span class="podium-who">${driverLink(model, e.driver)}${teamBadge(e.teamKey, e.team)}</span>
      <span class="podium-pts">${pts(e.pts)} <span class="sub">${t('common.pts')}</span></span>
    </li>`).join('')}</ol>`;
}

/** `drawMobile`: draw the track line in on phones, where the home hero hides its own animated track. */
function raceCard(model, race, { big = false, drawMobile = false, clickable = false } = {}) {
  const name = model.trackName[race.track] || race.track;
  return `<article class="race-card ${big ? 'race-card-big' : ''} ${clickable ? 'race-card-click' : ''}" ${clickable ? `data-card-href="${href.race(race.id)}"` : ''}>
    <a class="race-card-map" href="${href.race(race.id)}" aria-label="${esc(`${name} — ${t('home.raceDetails')}`)}">${trackMap(race.track, { cls: drawMobile ? 'trackmap-draw-mobile' : '' })}</a>
    <div class="race-card-body">
      <p class="kicker">${t('common.season')} ${race.season} · ${t('common.round')} ${race.round}${sprintBadge(race)}</p>
      <h3><a href="${href.race(race.id)}">${trackFlag(race.track)}<span>${esc(name)}</span></a></h3>
      <dl class="race-facts">
        <div><dt>${t('common.winner')}</dt><dd>${driverTeam(model, race.winner)}</dd></div>
        <div><dt>${t('common.pole')}</dt><dd>${driverTeam(model, race.pole)}</dd></div>
        <div><dt>${t('common.fastestLap')}</dt><dd>${driverTeam(model, race.fastest)}</dd></div>
      </dl>
    </div>
  </article>`;
}

function miniStandings(model, rows, { constructors = false, limit = 10 } = {}) {
  return `<ol class="mini">${rows.slice(0, limit).map((r) => `<li>
    ${posBadge(r.pos)}
    <span class="mini-who">${constructors ? teamBadge(r.key, r.name) : `${driverLink(model, r.name)}<span class="mini-team">${teamLogo(r.lastTeamKey, 'tlogo-sm', r.lastTeam)}</span>`}</span>
    <span class="mini-pts">${pts(r.points)}</span>
  </li>`).join('')}</ol>`;
}

/* ARIA tabs (arrow keys move between tabs, Home/End jump). */
let tabSeq = 0;
/**
 * Tab set; `selected` is the index of the tab open on arrival (defaults to the first).
 * With `base` (a page URL) and a `slug` on every tab, the open tab is kept in the address: base + '/' + slug
 * (the `home` tab needs no suffix), so a refresh or a shared link opens the same tab.
 */
function tabs(list, { selected = 0, base = '', home = list[0].slug } = {}) {
  const id = `tabs-${++tabSeq}`;
  return `<div class="tabs" data-tabs ${base ? `data-base="${base}" data-default="${home}"` : ''}>
    <div class="tablist" role="tablist">${list.map((x, i) => `<button type="button" role="tab" id="${id}-t${i}" aria-controls="${id}-p${i}" aria-selected="${i === selected}" tabindex="${i === selected ? 0 : -1}" ${x.slug ? `data-slug="${x.slug}"` : ''}>${esc(x.label)}</button>`).join('')}</div>
    ${list.map((x, i) => `<div role="tabpanel" id="${id}-p${i}" aria-labelledby="${id}-t${i}" tabindex="0" ${i !== selected ? 'hidden' : ''}>${x.html}</div>`).join('')}
  </div>`;
}
export function initTabs(root) {
  for (const pick of root.querySelectorAll('.season-pick:not([data-ready])')) {
    pick.dataset.ready = '';
    const btn = pick.querySelector('.ss-cur');
    const list = pick.querySelector('.season-nav');
    const set = (open) => {
      pick.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open);
      if (open) {
        const cur = list.querySelector('[aria-current]');
        if (cur) list.scrollTop = cur.offsetTop - list.clientHeight / 2 + cur.offsetHeight / 2;
        addEventListener('pointerdown', outside, true);
        addEventListener('keydown', esc_, true);
      } else {
        removeEventListener('pointerdown', outside, true);
        removeEventListener('keydown', esc_, true);
      }
    };
    // Closes on a tap or click outside the picker, or on Escape.
    const outside = (e) => { if (!pick.isConnected || !pick.contains(e.target)) set(false); };
    const esc_ = (e) => { if (e.key === 'Escape') { set(false); btn.focus(); } };
    btn.addEventListener('click', () => set(!pick.classList.contains('open')));
  }
  for (const box of root.querySelectorAll('[data-tabs]')) {
    const btns = [...box.querySelector('[role=tablist]').children];
    const select = (b, focus) => {
      for (const x of btns) {
        const on = x === b;
        x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
        box.querySelector('#' + x.getAttribute('aria-controls')).hidden = !on;
      }
      if (focus) b.focus();
      if (box.dataset.base) {
        // Same history entry, new address: no re-render, and the back arrow still leaves the page in one step.
        const suffix = b.dataset.slug === box.dataset.default ? '' : `/${b.dataset.slug}`;
        history.replaceState(history.state, '', box.dataset.base + suffix);
        // Season links keep the open tab when switching seasons.
        for (const a of root.querySelectorAll('[data-tab-keep]')) a.href = a.dataset.tabKeep + suffix;
      }
    };
    box.querySelector('[role=tablist]').addEventListener('click', (e) => {
      const b = e.target.closest('[role=tab]');
      if (!b) return;
      select(b);
      // In the sideways-scrolling row on phones, bring a half-hidden tab fully into view.
      const list = b.parentElement, pad = parseFloat(getComputedStyle(list).paddingLeft) || 0;
      const l = b.offsetLeft - pad, r = b.offsetLeft + b.offsetWidth + pad - list.clientWidth;
      if (list.scrollLeft > l) list.scrollTo({ left: l, behavior: 'smooth' });
      else if (list.scrollLeft < r) list.scrollTo({ left: r, behavior: 'smooth' });
    });
    box.querySelector('[role=tablist]').addEventListener('keydown', (e) => {
      const i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      const n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: btns.length - 1 }[e.key];
      if (n == null) return;
      e.preventDefault();
      select(btns[(n + btns.length) % btns.length], true);
    });
  }
}

/* ---------- Home ---------- */
/** CSS-style cubic-bezier timing function, so JS-driven numbers can follow a CSS animation's curve. */
function cubicBezier(x1, y1, x2, y2) {
  const bez = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (bez(t, x1, x2) < x) lo = t; else hi = t; }
    return bez(t, y1, y2);
  };
}

/** Count the home-page numbers up from 0 each time the page is shown (skipped for reduced motion). */
/* ---------- Home: random league fact ---------- */
// One pick per visit to the home page: a language switch or a background data refresh keeps the same fact,
// coming back to the home page from another page draws a new one (never the one just shown).
let factSeed = Math.random();
let lastFact = -1, lastSeed = -1;
export function newFact() { factSeed = Math.random(); }

function leagueFacts(model) {
  const facts = [];
  const track = (code) => model.trackName[code] || code;
  // Track in a fact's detail line: country flag + track name.
  const place = (code) => `<span class="fact-place">${trackFlag(code)}${esc(track(code))}</span>`;
  const add = (title, who, detail, link) => facts.push({ title, who, detail, link });

  // Wins from far down the grid and big climbs (top 8 of each).
  model.raceList.filter((r) => r.winner?.win && r.winner.grid >= 6).sort((a, b) => b.winner.grid - a.winner.grid).slice(0, 8)
    .forEach((r) => add(t('fact.gridWin', { grid: r.winner.grid }), driverLink(model, r.winner.driver), `${place(r.track)} · S${r.season}`, href.race(r.id)));
  const climbs = [];
  for (const r of model.raceList) for (const e of r.entries) if (e.grid && e.pos && !e.dnf && e.grid - e.pos >= 10) climbs.push({ r, e });
  climbs.sort((a, b) => (b.e.grid - b.e.pos) - (a.e.grid - a.e.pos)).slice(0, 8)
    .forEach(({ r, e }) => add(t('fact.climb', { grid: e.grid, pos: e.pos }), driverLink(model, e.driver), `${place(r.track)} · S${r.season}`, href.race(r.id)));

  // Tracks: dominant winner and variety of winners.
  for (const tr of model.tracks) {
    const king = [...tr.drivers.values()].sort((a, b) => b.wins - a.wins || b.points - a.points)[0];
    if (king?.wins >= 3) add(t('fact.trackKing', { track: tr.name, n: king.wins }), driverLink(model, king.name), '', href.track(tr.code));
    const winners = new Set(tr.races.map((r) => r.winner?.driver).filter(Boolean)).size;
    if (winners >= 6) add(t('fact.trackWinners', { track: tr.name, n: winners }), `<span class="who">${trackFlag(tr.code)}<span>${esc(fmt.country(TRACK_COUNTRY[tr.code]))}</span></span>`, '', href.track(tr.code));
  }

  // Title fights decided by a small margin.
  for (const s of model.seasons.values()) {
    if (!s.finished || s.drivers.length < 2) continue;
    const gap = s.drivers[0].points - s.drivers[1].points;
    if (gap <= 15) add(t('fact.closest', { season: s.n, gap }), driverLink(model, s.drivers[0].name), `${esc(t('fact.ahead'))} ${driverLink(model, s.drivers[1].name)}`, href.season(s.n));
  }

  // Driver records (leader of each).
  const top = (f) => [...model.drivers].sort((a, b) => f(b) - f(a) || b.points - a.points)[0];
  const rec = (key, f) => { const d = top(f); if (d && f(d) > 1) add(t(key, { n: f(d) }), driverLink(model, d.name), '', href.driver(d.name)); };
  rec('fact.winStreak', (d) => d.winStreak);
  rec('fact.pointsStreak', (d) => d.pointsStreak);
  rec('fact.hatTricks', (d) => d.hatTricks);
  rec('fact.mostRaces', (d) => d.races);

  // Career stories: each fact goes to the record holder; ties go to the driver with more points.
  const raceIdx = new Map(model.raceList.map((r, i) => [r.id, i]));
  const best = (score) => {
    let top = null;
    for (const d of model.drivers) {
      const v = score(d);
      if (v && (!top || v.n > top.n || (v.n === top.n && d.points > top.d.points))) top = { d, ...v };
    }
    return top;
  };
  const at = (e) => { const r = model.races.get(e.race); return `${place(r.track)} · S${r.season}`; };
  // Longest wait for a first win (counted in the driver's own starts).
  const wait = best((d) => { const i = d.entries.findIndex((e) => e.win); return i >= 0 ? { n: i + 1, e: d.entries[i] } : null; });
  if (wait?.n >= 10) add(t('fact.firstWinWait', { n: wait.n }), driverLink(model, wait.d.name), at(wait.e), href.race(wait.e.race));
  // Longest gap between two wins, in league races.
  const gap = best((d) => {
    const wins = d.entries.filter((e) => e.win);
    let top = null;
    for (let i = 1; i < wins.length; i++) {
      const n = raceIdx.get(wins[i].race) - raceIdx.get(wins[i - 1].race);
      if (!top || n > top.n) top = { n, from: wins[i - 1], e: wins[i] };
    }
    return top;
  });
  if (gap?.n >= 20) add(t('fact.winGap', { n: gap.n }), driverLink(model, gap.d.name), `S${gap.from.season} → ${at(gap.e)}`, href.race(gap.e.race));
  // Wins with the most different teams (reserve seats left out).
  const teamsWon = best((d) => { const ks = [...new Set(d.entries.filter((e) => e.win && e.teamKey !== RESERVE).map((e) => e.teamKey))]; return { n: ks.length, ks }; });
  if (teamsWon?.n >= 3) add(t('fact.manyTeams', { n: teamsWon.n }), driverLink(model, teamsWon.d.name), teamsWon.ks.map((k) => esc(teamInfo(k).name)).join(', '), href.driver(teamsWon.d.name));
  // League veteran: most seasons with at least one start.
  const vet = best((d) => { const ss = [...new Set(d.entries.map((e) => e.season))].sort((a, b) => a - b); return { n: ss.length, ss }; });
  if (vet?.n >= 3) add(t('fact.mostSeasons', { n: vet.n }), driverLink(model, vet.d.name), `S${vet.ss[0]}–S${vet.ss[vet.ss.length - 1]}`, href.driver(vet.d.name));
  // Pole positions in a row.
  const poles = best((d) => {
    let top = null, run = 0, start = null;
    for (const e of d.entries) {
      if (e.pp) { if (!run) start = e; run++; if (!top || run > top.n) top = { n: run, from: start, to: e }; } else run = 0;
    }
    return top;
  });
  if (poles?.n >= 3) add(t('fact.poleStreak', { n: poles.n }), driverLink(model, poles.d.name), `S${poles.from.season}${poles.to.season !== poles.from.season ? `–S${poles.to.season}` : ''}`, href.driver(poles.d.name));
  // Most DNFs by one driver in one season.
  const dnf = best((d) => {
    const per = new Map();
    for (const e of d.entries) if (e.dnf) per.set(e.season, (per.get(e.season) || 0) + 1);
    const [season, n] = [...per.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0] || [];
    return n ? { n, season } : null;
  });
  if (dnf?.n >= 3) add(t('fact.dnfSeason', { n: dnf.n }), driverLink(model, dnf.d.name), `S${dnf.season}`, href.season(dnf.season));

  // Most open season: most different race winners.
  const open = [...model.seasons.values()].map((s) => ({ s, n: new Set(s.races.map((r) => r.winner?.win && r.winner.driver).filter(Boolean)).size }))
    .sort((a, b) => b.n - a.n || b.s.n - a.s.n)[0];
  if (open?.n >= 5) add(t('fact.openSeason', { season: open.s.n, n: open.n }), seasonTag(open.s.n), '', href.season(open.s.n));

  // Team one-two finishes.
  const oneTwo = new Map();
  for (const r of model.raceList) {
    const p1 = r.entries.find((e) => e.pos === 1 && !e.dnf), p2 = r.entries.find((e) => e.pos === 2 && !e.dnf);
    if (p1 && p2 && p1.teamKey === p2.teamKey && p1.teamKey !== RESERVE) oneTwo.set(p1.teamKey, (oneTwo.get(p1.teamKey) || 0) + 1);
  }
  const [dKey, dN] = [...oneTwo.entries()].sort((a, b) => b[1] - a[1] || (model.teamMap.get(b[0])?.points || 0) - (model.teamMap.get(a[0])?.points || 0))[0] || [];
  if (dN >= 2) add(t('fact.oneTwos', { n: dN }), teamBadge(dKey, teamInfo(dKey).name), '', href.team(dKey));

  // Pole to win: the track where the pole sitter wins most often, and where least often (tracks with 4+ races).
  const conv = model.tracks.filter((tr) => tr.races.length >= 4).map((tr) => {
    const wins = tr.races.filter((r) => r.winner?.win && r.pole && r.pole.driver === r.winner.driver).length;
    return { tr, wins, n: tr.races.length, pct: wins / tr.races.length };
  });
  const trackWho = (tr) => `<span class="who">${trackFlag(tr.code)}<span>${esc(fmt.country(TRACK_COUNTRY[tr.code]))}</span></span>`;
  const hi = [...conv].sort((a, b) => b.pct - a.pct || b.n - a.n)[0], lo = [...conv].sort((a, b) => a.pct - b.pct || b.n - a.n)[0];
  if (hi && hi.pct >= 0.6) add(t('fact.poleWins', { track: hi.tr.name, pct: `${Math.round(hi.pct * 100)}%` }), trackWho(hi.tr), `${hi.wins} / ${hi.n}`, href.track(hi.tr.code));
  if (lo && lo !== hi && lo.pct <= 0.25) add(t(lo.wins ? 'fact.poleLoses' : 'fact.poleNever', { track: lo.tr.name, pct: `${Math.round(lo.pct * 100)}%` }), trackWho(lo.tr), `${lo.wins} / ${lo.n}`, href.track(lo.tr.code));

  // Constructors with titles.
  for (const tm of model.teams) if (tm.titles.length >= 2) add(t('fact.teamTitles', { n: tm.titles.length }), teamBadge(tm.key, tm.info.name), tm.titles.map((x) => `S${x}`).join(', '), href.team(tm.key));
  return facts;
}

function factCard(f) {
  return `<p class="kicker">${esc(t('fact.label'))}</p>
    <p class="fact-title">${esc(f.title)}</p>
    <p class="fact-who">${f.who}${f.detail ? `<span class="sub">${f.detail}</span>` : ''}</p>`;
}

function animateCounters(root) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = [...root.querySelectorAll('.count[data-count]')];
  if (!els.length) return;
  // Run in lockstep with the hero track drawing: same delay, duration and easing curve as its CSS animation.
  const line = root.querySelector('.hero .trk-line');
  const cs = line ? getComputedStyle(line) : null;
  const ms = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n * (String(v).trim().endsWith('ms') ? 1 : 1000) : d; };
  const duration = ms(cs?.animationDuration, 2400) || 2400;
  const delay = ms(cs?.animationDelay, 200);
  const ease = cubicBezier(0.6, 0.1, 0.2, 1); // matches .trackmap-draw .trk-line in style.css
  const start = performance.now() + delay;
  for (const el of els) el.textContent = fmt.int(0);
  const tick = (now) => {
    if (!els[0].isConnected) return; // page changed mid-animation
    const p = Math.min(1, Math.max(0, (now - start) / duration));
    for (const el of els) el.textContent = fmt.int(Math.round(+el.dataset.count * ease(p)));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* Once the opening draw of the hero track has finished, hovering the track re-draws it like the race cards do. */
function heroTrackHover(root) {
  const svg = root.querySelector('.hero-track .trackmap');
  if (!svg) return;
  const ready = () => svg.classList.replace('trackmap-draw', 'trackmap-hover');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return ready();
  svg.querySelector('.trk-line')?.addEventListener('animationend', ready, { once: true });
}

/* League social media buttons in the home hero; links come from config.json ("social"), empty ones are hidden. */
function socialLinks(cfg) {
  const links = SOCIAL.filter(([key]) => cfg?.social?.[key]).map(([key, name]) => `<a class="btn btn-social btn-${key}" href="${esc(cfg.social[key])}" target="_blank" rel="noopener">${socialIcon(key)}<span>${name}</span></a>`);
  return links.length ? `<p class="hero-cta">${links.join('')}</p>` : '';
}

export function home(model, cfg) {
  const s = model.seasons.get(model.currentSeason);
  const last = model.raceList.at(-1);
  const lastFinished = [...model.seasons.values()].filter((x) => x.finished).at(-1);
  // Screen readers get the final number; the visible digits count up from 0 (see init below).
  const count = (n) => `<span class="vh">${fmt.int(n)}</span><span class="count" data-count="${n}" aria-hidden="true">${fmt.int(n)}</span>`;
  const counters = `<dl class="counters">
    ${statTile(t('home.statSeasons'), count(model.seasonNums.length))}
    ${statTile(t('home.statRaces'), count(model.raceList.length))}
    ${statTile(t('home.statDrivers'), count(model.drivers.length))}
    ${statTile(t('home.statWinners'), count(model.winnersCount))}
  </dl>`;
  const facts = leagueFacts(model);
  let pick = Math.floor(factSeed * facts.length);
  if (pick === lastFact && facts.length > 1 && factSeed !== lastSeed) pick = (pick + 1 + Math.floor(factSeed * 997) % (facts.length - 1)) % facts.length;
  lastFact = pick; lastSeed = factSeed;
  const fact = facts[pick];
  const html = `
  <section class="hero" aria-labelledby="hero-h">
    <div class="hero-copy">
      <h1 id="hero-h" tabindex="-1"><img src="assets/logo-transparent.png" alt="" class="hero-logo" width="900" height="450"><span>Pole Position Racing</span></h1>
      ${socialLinks(cfg)}
    </div>
    <div class="hero-track">${trackMap(last.track, { draw: true, label: model.trackName[last.track] })}</div>
  </section>
  ${counters}
  ${fact ? `<aside class="fact" aria-live="polite">${factCard(fact)}</aside>` : ''}
  <div class="grid-home">
    <div class="home-main">
      ${section(t('home.lastRace'), `${raceCard(model, last, { big: true, drawMobile: true })}${podium(model, last)}`, { id: 'h-last', action: moreLink(href.race(last.id), t('home.raceDetails')), cls: 'o-1' })}
      <div class="home-pair">
        ${section(t('home.driverStandings'), miniStandings(model, s.drivers), { id: 'h-drv', action: moreLink('#/standings', t('home.fullStandings')), cls: 'o-2' })}
        ${section(t('home.constructorStandings'), miniStandings(model, s.constructors, { constructors: true }), { id: 'h-con', action: moreLink('#/standings', t('home.fullStandings')), cls: 'o-3' })}
      </div>
    </div>
    <div class="home-side">
      ${section(t('home.goatTop'), `<ol class="mini">${model.drivers.slice(0, 10).map((d) => `<li>${posBadge(d.goat)}<span class="mini-who">${driverLink(model, d.name)}</span><span class="mini-pts">${pts(d.points)}</span></li>`).join('')}</ol>`, { id: 'h-goat', action: moreLink('#/goat', t('home.fullRanking')), cls: 'o-4' })}
      ${lastFinished ? section(t('home.lastChampions'), `<div class="champs">
          <div class="champ"><p class="kicker">${t('common.champion')} · ${t('common.season')} ${lastFinished.n}</p><p class="champ-name">${driverLink(model, lastFinished.champion.name)}</p><p class="sub champ-meta">${teamBadge(lastFinished.champion.lastTeamKey, lastFinished.champion.lastTeam)}</p></div>
          <div class="champ"><p class="kicker">${t('common.constructorChampion')}</p><p class="champ-name">${teamBadge(lastFinished.constructorChampion.key, lastFinished.constructorChampion.name)}</p>${lineup(model, lastFinished.constructorChampion)}</div>
        </div>`, { id: 'h-champ', action: moreLink('#/hall-of-fame', t('nav.hof')), cls: 'o-5' }) : ''}
    </div>
  </div>`;
  return { title: '', html, init: (root) => { animateCounters(root); heroTrackHover(root); } };
}

/* ---------- Season / standings ---------- */
function driverStandingsTable(model, s) {
  return table({
    caption: `${t('season.drivers')} — ${t('common.season')} ${s.n}`,
    rows: s.drivers, colsToggle: false, cls: 'st-table st-drivers',
    columns: [
      standingsPosCol(), driverCol(model),
      { label: t('common.team'), keep: true, value: (r) => r.lastTeam, html: (r) => teamBadge(r.lastTeamKey, r.lastTeam) },
      numCol(t('common.races'), (r) => r.races),
      numCol(t('common.wins'), (r) => r.wins),
      numCol(t('common.podiums'), (r) => r.podiums),
      numCol(t('common.polesShort'), (r) => r.poles, { abbr: t('common.poles') }),
      numCol(t('common.flShort'), (r) => r.fl, { abbr: t('common.fl') }),
      numCol(t('common.dnfs'), (r) => r.dnfs, { cls: 'c-short' }),
      numCol(t('common.points'), (r) => r.points, { cls: 'c-pts' }),
    ],
  });
}

function constructorTable(model, s) {
  return table({
    caption: `${t('season.constructors')} — ${t('common.season')} ${s.n}`,
    rows: s.constructors, colsToggle: false, cls: 'st-table',
    columns: [
      standingsPosCol(),
      { label: t('common.team'), rowHeader: true, sticky: 2, cls: 'c-driver', value: (r) => r.name, html: (r) => teamBadge(r.key, r.name) },
      { label: t('common.lineup'), sort: false, html: (r) => `<span class="list">${r.lineup.map((d) => driverLink(model, d.name)).join('')}</span>` },
      numCol(t('common.wins'), (r) => r.wins, { keep: true }),
      numCol(t('common.podiums'), (r) => r.podiums, { keep: true }),
      numCol(t('common.polesShort'), (r) => r.poles, { abbr: t('common.poles') }),
      numCol(t('common.points'), (r) => r.points, { cls: 'c-pts' }),
    ],
  });
}

function resultsMatrix(model, s) {
  const cols = s.races.map((race) => ({
    label: race.track, sort: false, cls: `c-round${race.sprint ? ' c-sprint' : ''}`,
    headHtml: `<span class="round-head"><span aria-hidden="true">${trackFlag(race.track)}</span><span>${esc(race.track)}</span></span>`,
    abbr: `${t('common.round')} ${race.round}: ${model.trackName[race.track] || race.track}${race.sprint ? ` (${t('common.sprintHint')})` : ''}`,
    html: (r) => {
      const e = r.results.get(race.id);
      if (!e) return '<span class="cell-none">·</span>';
      const c = e.dnf ? 'm-dnf' : e.pos <= 3 ? `m-${e.pos}` : e.pts > 0 ? 'm-pts' : 'm-out';
      const marks = `${e.pp ? `<sup class="m-pp" data-tip="${esc(t('common.pole'))}">P</sup>` : ''}${e.fl ? `<sup class="m-fl" data-tip="${esc(t('common.fastestLap'))}" data-tip-tone="fl">F</sup>` : ''}`;
      return `<a class="m ${c}" href="${href.race(race.id)}">${e.dnf ? 'DNF' : e.pos}${marks}</a>`;
    },
  }));
  return `<div class="matrix">${table({
    caption: `${t('common.timeline')} — ${t('common.season')} ${s.n}`, compact: false,
    rows: s.drivers,
    columns: [posCol(), driverCol(model), ...cols, numCol(t('common.points'), (r) => r.points, { cls: 'c-pts' })],
  })}</div>
  <p class="legend-note"><span class="m m-1">1</span><span class="m m-2">2</span><span class="m m-3">3</span><span class="m m-pts">4–10</span><span class="m m-out">11+</span><span class="m m-dnf">DNF</span><span><sup class="m-pp">P</sup> ${t('common.pole')}</span><span><sup class="m-fl">F</sup> ${t('common.fastestLap')}</span>${s.races.some((r) => r.sprint) ? `<span><span class="sprint-dot" aria-hidden="true"></span> ${t('common.sprintHint')}</span>` : ''}</p>`;
}

function raceGrid(model, races) {
  return `<div class="race-grid">${races.map((r) => raceCard(model, r, { clickable: true })).join('')}</div>`;
}

export function season(model, n, { standings = false, tab = '' } = {}) {
  const s = model.seasons.get(+n);
  if (!s) return notFound(t('state.notFound'), model, `S${n}`);
  const leader = s.drivers[0];
  // Tabs; the open one comes from the address (#/standings/constructors), drivers by default.
  const tabList = [
    { slug: 'calendar', label: t('season.races'), html: raceGrid(model, s.races) },
    { slug: 'drivers', label: t('season.drivers'), html: driverStandingsTable(model, s) },
    { slug: 'constructors', label: t('season.constructors'), html: constructorTable(model, s) },
    { slug: 'results', label: t('season.matrix'), html: resultsMatrix(model, s) },
  ];
  const sel = Math.max(0, tabList.findIndex((x) => x.slug === (tab || 'drivers')));
  const suffix = sel === 1 ? '' : `/${tabList[sel].slug}`;
  const top = s.finished
    ? `<div class="champ-banner"><div><p class="kicker">${t('common.champion')}</p><p class="champ-name">${driverLink(model, s.champion.name)}</p><p class="sub champ-meta">${teamBadge(s.champion.lastTeamKey, s.champion.lastTeam)}</p></div><div><p class="kicker">${t('common.constructorChampion')}</p><p class="champ-name">${teamBadge(s.constructorChampion.key, s.constructorChampion.name)}</p>${lineup(model, s.constructorChampion)}</div></div>`
    : `<div class="champ-banner champ-banner-live"><div><p class="kicker">${t('common.leader')}</p><p class="champ-name">${driverLink(model, leader.name)}</p><p class="sub champ-meta">${teamBadge(leader.lastTeamKey, leader.lastTeam)}</p></div><div><p class="kicker">${t('common.constructorLeader')}</p><p class="champ-name">${s.constructors[0] ? teamBadge(s.constructors[0].key, s.constructors[0].name) : '—'}</p>${lineup(model, s.constructors[0])}</div></div>`;
  const seasonBase = (x) => (x === model.currentSeason ? '#/standings' : href.season(x));
  // Drop-down list of all seasons, newest first: drivers' champion (or leader) | slanted season badge | constructors' champion (or leader).
  const nav = `<nav class="season-nav" id="season-nav" aria-label="${esc(t('common.seasons'))}">${[...model.seasonNums].reverse().map((x) => {
    const base = seasonBase(x), sx = model.seasons.get(x);
    const done = sx.finished && sx.champion;
    const who = done ? sx.champion : sx.drivers[0];
    const team = done ? sx.constructorChampion : sx.constructors[0];
    const d = who && model.driverMap.get(who.name);
    return `<a href="${base}${suffix}" data-tab-keep="${base}" ${x === s.n ? 'aria-current="page"' : ''}>
      <span class="sn-side"><span class="sn-kicker">${esc(done ? t('common.champion') : t('common.leader'))}</span>${who ? `<span class="sn-who">${flag(d?.flag, d ? fmt.country(d.flag) || d.country : '')}<span>${esc(who.name)}</span></span>` : ''}</span>
      <span class="sn-badge"><span class="sr-only">${esc(t('common.season'))} </span>S${x}</span>
      <span class="sn-side sn-team"><span class="sn-kicker">${esc(done ? t('common.constructors') : t('common.leader'))}</span>${team ? `<span class="sn-who">${teamLogo(team.key, 'sn-logo', team.name)}<span>${esc(team.name)}</span></span>` : ''}</span>
    </a>`;
  }).join('')}</nav>`;
  // Phones: one row with the previous / next season and the current one in the middle, which opens the full list.
  const si = model.seasonNums.indexOf(s.n);
  const stepLink = (x, cls, label, d) => (x == null
    ? `<span class="ss-arrow ${cls}" aria-hidden="true"><svg class="ico" viewBox="0 0 24 24"><path d="${d}"/></svg></span>`
    : `<a class="ss-arrow ${cls}" href="${seasonBase(x)}${suffix}" data-tab-keep="${seasonBase(x)}" aria-label="${esc(`${label}: ${t('common.season')} ${x}`)}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg></a>`);
  const step = `<div class="season-step">
      ${stepLink(model.seasonNums[si - 1], 'ss-prev', t('common.prev'), 'M15 5l-7 7 7 7')}
      <button type="button" class="ss-cur" aria-expanded="false" aria-controls="season-nav"><span class="ss-label">${esc(t('common.season'))}</span><span class="ss-num">${s.n}</span><svg class="ico ss-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
      ${stepLink(model.seasonNums[si + 1], 'ss-next', t('common.next'), 'M9 5l7 7-7 7')}
    </div>`;
  const html = `${hiddenHead(standings ? t('standings.title') : t('season.title', { n: s.n }))}
    <div class="season-pick">${step}${nav}</div>
    ${top}
    ${tabs(tabList, { selected: sel, home: 'drivers', base: s.n === model.currentSeason && standings ? '#/standings' : href.season(s.n) })}`;
  return { title: standings ? t('standings.title') : t('season.title', { n: s.n }), html };
}

/* ---------- GOAT ---------- */
export function goat(model) {
  const medal = (d) => (d.goat === 1 ? '<span class="goat" title="G.O.A.T." aria-label="G.O.A.T.">🐐</span>' : posBadge(d.goat));
  const html = `${hiddenHead(t('goat.title'))}
  <ol class="goat-podium">${model.drivers.slice(0, 3).map((d) => `<li class="gp-${d.goat}">
    <span class="gp-rank">${d.goat === 1 ? '🐐' : d.goat}</span>
    <span class="gp-name">${driverLink(model, d.name)}</span>
    <span class="gp-pts">${pts(d.points)} <span class="sub">${t('common.pts')}</span></span>
    <span class="sub">${fmt.count(d.wins, 'win')} · ${fmt.count(d.titles.length, 'title')}</span>
  </li>`).join('')}</ol>
  ${table({
    caption: t('goat.title'), filter: true, colsToggle: false,
    rows: model.drivers,
    columns: [
      { ...posCol((r) => r.goat), html: medal },
      driverCol(model),
      numCol(t('common.races'), (r) => r.races, { keep: true }),
      numCol(t('common.wins'), (r) => r.wins),
      numCol(t('common.podiums'), (r) => r.podiums),
      numCol(t('common.polesShort'), (r) => r.poles, { abbr: t('common.poles') }),
      numCol(t('common.flShort'), (r) => r.fl, { abbr: t('common.fl') }),
      { label: t('common.avgQuali'), type: 'num', value: (r) => r.avgGrid?.toFixed(3), html: (r) => fmt.dec(r.avgGrid) },
      numCol(t('common.dnfs'), (r) => r.dnfs, { html: dnfCell }),
      numCol(t('common.points'), (r) => r.points, { cls: 'c-pts' }),
    ],
  })}`;
  return { title: t('goat.title'), html };
}

/* ---------- Stats ---------- */
function leaderboard(model, title, rows, value, { fmtv = fmt.int, note = '', limit = 10, low = false } = {}) {
  // Each row carries a bar scaled to the leader (for "lower is better" boards, the best value gets the full bar).
  const list = rows.slice(0, limit), vals = list.map(value);
  const best = low ? Math.min(...vals) : Math.max(...vals);
  const share = (v) => (low ? best / v : v / best) || 0;
  return `<section class="board" aria-label="${esc(title)}">
    <h3>${esc(title)}${note ? ` <span class="sub">${esc(note)}</span>` : ''}</h3>
    <ol class="bar-board">${list.map((d, i) => `<li class="${i === 0 ? 'is-top' : ''}" style="--w:${Math.max(4, Math.round(share(vals[i]) * 100))}%">
      <span class="bb-rank">${i + 1}</span><span class="bb-who">${driverLink(model, d.name)}</span><span class="bb-val">${fmtv(vals[i])}</span>
    </li>`).join('')}</ol>
  </section>`;
}

// Headline card: the all-time leader in one category, with the next two below.
function spotlight(model, label, rows, value) {
  const [a, b, c] = rows;
  if (!a) return '';
  return `<article class="spot">
    <p class="spot-label">${esc(label)}</p>
    <p class="spot-value">${fmt.int(value(a))}</p>
    <p class="spot-who">${driverLink(model, a.name)}</p>
    <p class="spot-next">${[b, c].filter(Boolean).map((x, i) => {
      const dx = model.driverMap.get(x.name);
      return `<span><b>${i + 2}.</b> ${flag(dx?.flag, dx ? fmt.country(dx.flag) || dx.country : '')} ${esc(x.name)} <span class="sub">${fmt.int(value(x))}</span></span>`;
    }).join('')}</p>
  </article>`;
}

export function stats(model) {
  const min = 10;
  const qualified = model.drivers.filter((d) => d.races >= min);
  const by = (list, f, asc = false) => [...list].sort((a, b) => (asc ? f(a) - f(b) : f(b) - f(a)) || b.points - a.points).filter((d) => f(d) != null);
  const wins = by(model.drivers, (d) => d.wins), pods = by(model.drivers, (d) => d.podiums), poles = by(model.drivers, (d) => d.poles);
  const titles = by(model.drivers.filter((d) => d.titles.length), (d) => d.titles.length);
  const minNote = t('stats.minRaces', { n: min });
  // Full rows only: 6 boards as 2 × 3, 4 as one row of 4, 3 and 2 in a single row.
  const group = (...b) => `<div class="boards" style="--cols:${b.length % 3 === 0 ? 3 : Math.min(b.length, 4)}">${b.join('')}</div>`;
  const rankings = tabs([
    { label: t('stats.tabResults'), html: group(
      leaderboard(model, t('common.wins'), wins, (d) => d.wins),
      leaderboard(model, t('common.podiums'), pods, (d) => d.podiums),
      leaderboard(model, t('common.poles'), poles, (d) => d.poles),
      leaderboard(model, t('common.fl'), by(model.drivers, (d) => d.fl), (d) => d.fl),
      leaderboard(model, t('common.titles'), titles, (d) => d.titles.length),
      leaderboard(model, t('common.hatTricks'), by(model.drivers.filter((d) => d.hatTricks), (d) => d.hatTricks), (d) => d.hatTricks, { note: t('common.hatTrickHint') }),
    ) },
    { label: t('stats.tabRates'), html: group(
      leaderboard(model, t('common.ppr'), by(qualified, (d) => d.ppr), (d) => d.ppr, { fmtv: (v) => fmt.dec(v), note: minNote }),
      leaderboard(model, t('common.winPct'), by(qualified, (d) => d.wins / d.races), (d) => d.wins / d.races, { fmtv: fmt.pct, note: minNote }),
      leaderboard(model, t('common.podiumPct'), by(qualified, (d) => d.podiums / d.races), (d) => d.podiums / d.races, { fmtv: fmt.pct, note: minNote }),
      leaderboard(model, t('common.avgQuali'), by(qualified, (d) => d.avgGrid, true), (d) => d.avgGrid, { fmtv: (v) => fmt.dec(v), note: minNote, low: true }),
    ) },
    { label: t('stats.tabStreaks'), html: group(
      leaderboard(model, t('common.streakWins'), by(model.drivers, (d) => d.winStreak), (d) => d.winStreak),
      leaderboard(model, t('common.streakPodiums'), by(model.drivers, (d) => d.podiumStreak), (d) => d.podiumStreak),
      leaderboard(model, t('common.streakPoints'), by(model.drivers, (d) => d.pointsStreak), (d) => d.pointsStreak),
    ) },
    { label: t('stats.tabOther'), html: group(
      leaderboard(model, t('common.mostRaces'), by(model.drivers, (d) => d.races), (d) => d.races),
      leaderboard(model, t('common.dnfs'), by(model.drivers, (d) => d.dnfs), (d) => d.dnfs),
    ) },
  ]);
  const spots = `<div class="spots">
    ${spotlight(model, t('common.titles'), titles, (d) => d.titles.length)}
    ${spotlight(model, t('common.wins'), wins, (d) => d.wins)}
    ${spotlight(model, t('common.podiums'), pods, (d) => d.podiums)}
    ${spotlight(model, t('common.poles'), poles, (d) => d.poles)}
  </div>`;

  // Best seasons: points per race, driver must have done at least half the season.
  const bestSeasons = [];
  for (const s of model.seasons.values()) {
    for (const d of s.drivers) if (d.races >= Math.ceil(s.races.length / 2)) bestSeasons.push({ name: d.name, season: s.n, ppr: d.points / d.races, points: d.points, races: d.races });
  }
  bestSeasons.sort((a, b) => b.ppr - a.ppr);
  const furthest = model.raceList.filter((r) => r.winner?.win && r.winner.grid).sort((a, b) => b.winner.grid - a.winner.grid || b.id - a.id).slice(0, 10);
  // Biggest climbs from grid to finish in a single race (finishers only).
  const gains = [];
  for (const race of model.raceList) {
    for (const e of race.entries) if (e.grid && e.pos && !e.dnf && e.grid > e.pos) gains.push({ ...e, gain: e.grid - e.pos, raceObj: race });
  }
  gains.sort((a, b) => b.gain - a.gain || a.pos - b.pos || b.raceObj.id - a.raceObj.id);

  // Season records: best single-season tallies, and title margins of finished seasons.
  const seasonRows = [];
  for (const s of model.seasons.values()) for (const d of s.drivers) seasonRows.push({ ...d, season: s.n });
  const bestOf = (f) => [...seasonRows].sort((a, b) => f(b) - f(a) || b.points - a.points || a.season - b.season)[0];
  const margins = [...model.seasons.values()].filter((s) => s.finished && s.drivers.length > 1)
    .map((s) => ({ season: s.n, a: s.drivers[0], b: s.drivers[1], gap: s.drivers[0].points - s.drivers[1].points }));
  const widest = [...margins].sort((x, y) => y.gap - x.gap || x.season - y.season)[0];
  const closest = [...margins].sort((x, y) => x.gap - y.gap || x.season - y.season)[0];
  const recTile = (label, f, unit = '') => {
    const r = bestOf(f);
    return r && f(r) ? statTile(label, driverLink(model, r.name), `${fmt.int(f(r))}${unit} ${seasonTag(r.season)}`) : '';
  };
  const records = `<dl class="tiles tiles-compact tiles-stack">
    ${recTile(t('stats.recWins'), (d) => d.wins)}
    ${recTile(t('stats.recPodiums'), (d) => d.podiums)}
    ${recTile(t('stats.recPoles'), (d) => d.poles)}
    ${recTile(t('stats.recPoints'), (d) => d.points, ` ${t('common.pts')}`)}
    ${widest ? statTile(t('stats.recMargin'), driverLink(model, widest.a.name), `+${fmt.int(widest.gap)} ${t('common.pts')} ${seasonTag(widest.season, { champion: true, label: t('common.champion') })}`) : ''}
    ${closest ? statTile(t('stats.recClosest'), driverLink(model, closest.a.name), `+${fmt.int(closest.gap)} ${t('common.pts')} ${esc(t('stats.over'))} ${driverLink(model, closest.b.name)} ${seasonTag(closest.season, { champion: true, label: t('common.champion') })}`) : ''}
  </dl>`;
  // All-time records that the leaderboards above do not already show.
  const wonRaces = model.raceList.filter((r) => r.winner?.win && r.winner.driver);
  const top = (map) => [...map.entries()].sort((a, b) => b[1] - a[1])[0];
  const trackWins = new Map(), winTracks = new Map(), oneTwos = new Map();
  for (const r of wonRaces) {
    const k = `${r.winner.driver}|${r.track}`;
    trackWins.set(k, (trackWins.get(k) || 0) + 1);
    if (!winTracks.has(r.winner.driver)) winTracks.set(r.winner.driver, new Set());
    winTracks.get(r.winner.driver).add(r.track);
    const p2 = r.entries.find((e) => e.pos === 2 && !e.dnf);
    if (p2 && p2.teamKey === r.winner.teamKey && p2.teamKey !== RESERVE) oneTwos.set(p2.teamKey, (oneTwos.get(p2.teamKey) || 0) + 1);
  }
  const tw = top(trackWins);
  const wt = top(new Map([...winTracks].map(([n, set]) => [n, set.size])));
  const ot = top(oneTwos);
  const openSeason = [...model.seasons.values()].map((x) => ({ n: x.n, k: new Set(x.races.filter((r) => r.winner?.win).map((r) => r.winner.driver)).size }))
    .sort((a, b) => b.k - a.k || b.n - a.n)[0];
  // Longest run of consecutive race wins by one team (reserve entries break the run).
  let run = { key: null, n: 0 }, best = { key: null, n: 0 };
  for (const r of wonRaces) {
    const key = r.winner.teamKey !== RESERVE ? r.winner.teamKey : null;
    run = key && key === run.key ? { key, n: run.n + 1, from: run.from, to: r.season } : { key, n: key ? 1 : 0, from: r.season, to: r.season };
    if (run.n > best.n) best = run;
  }
  const noWin = [...model.drivers].filter((d) => !d.wins).sort((a, b) => b.races - a.races)[0];
  const span = (a, b) => (a === b ? seasonTag(a) : `${seasonTag(a)} – ${seasonTag(b)}`);
  const allTime = `<dl class="tiles tiles-compact tiles-stack">
    ${tw ? statTile(t('stats.recTrackWins'), driverLink(model, tw[0].split('|')[0]), `${fmt.int(tw[1])}× ${trackFlag(tw[0].split('|')[1])} ${esc(PHONE_TRACK_NAME[tw[0].split('|')[1]] || model.trackName[tw[0].split('|')[1]] || '')}`) : ''}
    ${wt ? statTile(t('stats.recWinTracks'), driverLink(model, wt[0]), esc(t('stats.nTracks', { n: wt[1] }))) : ''}
    ${best.n > 1 ? statTile(t('stats.recTeamStreak'), teamBadge(best.key, teamInfo(best.key).name), `${esc(t('stats.nInRow', { n: best.n }))} ${span(best.from, best.to)}`) : ''}
    ${ot ? statTile(t('stats.recOneTwos'), teamBadge(ot[0], teamInfo(ot[0]).name), esc(t('stats.nOneTwos', { n: ot[1] }))) : ''}
    ${openSeason ? statTile(t('stats.recOpenSeason'), fmt.int(openSeason.k), seasonTag(openSeason.n)) : ''}
    ${noWin ? statTile(t('stats.recNoWin'), driverLink(model, noWin.name), esc(t('stats.nStarts', { n: noWin.races }))) : ''}
  </dl>`;
  const maxGrid = Math.max(...Object.keys(model.winsFromGrid).map(Number));
  const gridItems = Array.from({ length: maxGrid }, (_, i) => ({ label: String(i + 1), value: model.winsFromGrid[i + 1] || 0, tip: `${t('stats.gridN', { n: i + 1 })}: ${fmt.count(model.winsFromGrid[i + 1] || 0, 'win')}` }));

  const html = `${hiddenHead(t('stats.title'))}
  ${section(t('stats.leaders'), spots, { id: 'st-leaders' })}
  ${section(t('stats.rankings'), rankings, { id: 'st-rank' })}
  <div class="grid-2 st-records">
    ${section(t('stats.seasonRecords'), records, { id: 'st-records' })}
    ${section(t('stats.allTimeRecords'), allTime, { id: 'st-alltime' })}
  </div>
  ${section(t('stats.winsFromGrid'), barChart({ items: gridItems, label: t('stats.winsFromGridAria') }), { id: 'st-grid' })}
  ${section(t('stats.highlights'), tabs([
    { label: t('stats.bestSeasonsShort'), html: table({
      caption: t('stats.bestSeasons'), rows: bestSeasons.slice(0, 10), colsToggle: false,
      columns: [posCol((r) => bestSeasons.indexOf(r) + 1), driverCol(model), { label: t('common.season'), type: 'num', keep: true, value: (r) => r.season, html: (r) => seasonTag(r.season) }, numCol(t('common.races'), (r) => r.races), numCol(t('common.points'), (r) => r.points), numCol(t('common.ppr'), (r) => r.ppr.toFixed(3), { html: (r) => fmt.dec(r.ppr), cls: 'c-pts' })],
    }) },
    { label: t('stats.lowestGridWinsShort'), html: table({
      caption: t('stats.lowestGridWins'), rows: furthest, colsToggle: false,
      columns: [{ label: t('common.grid'), type: 'num', cls: 'c-pos', sticky: 1, value: (r) => r.winner.grid, html: (r) => `<span class="pos">${r.winner.grid}</span>` }, driverCol(model, (r) => r.winner.driver), { label: t('common.track'), keep: true, value: (r) => r.track, html: (r) => `<a href="${href.race(r.id)}">${trackFlag(r.track)} ${esc(model.trackName[r.track] || r.track)}</a>` }, { label: t('common.season'), type: 'num', value: (r) => r.season, html: (r) => seasonTag(r.season) }],
    }) },
    { label: t('stats.biggestGainsShort'), html: table({
    caption: t('stats.biggestGains'), rows: gains.slice(0, 10), colsToggle: false,
    columns: [
      { label: t('common.gained'), type: 'num', cls: 'c-pos', sticky: 1, value: (r) => r.gain, html: (r) => `<span class="delta up">▲${r.gain}</span>` },
      driverCol(model, (r) => r.driver),
      numCol(t('common.from'), (r) => r.grid, { desc: false, keep: true, html: (r) => `P${r.grid}` }),
      numCol(t('common.to'), (r) => r.pos, { desc: false, keep: true, html: (r) => `P${r.pos}` }),
      { label: t('common.track'), value: (r) => r.raceObj.track, html: (r) => `<a href="${href.race(r.raceObj.id)}">${trackFlag(r.raceObj.track)} ${esc(model.trackName[r.raceObj.track] || r.raceObj.track)}</a>${sprintBadge(r.raceObj)}` },
      { label: t('common.season'), type: 'num', value: (r) => r.raceObj.id, html: (r) => seasonTag(r.raceObj.season) },
    ],
  }) },
  ]), { id: 'st-hl' })}`;
  return { title: t('stats.title'), html };
}

/**
 * Best and worst track by average finishing position (DNFs left out), among tracks with at least
 * two classified finishes. Needs three such tracks, otherwise "best" and "worst" say little.
 */
// Short names for tracks better known by another name than their town.
const CHIP_TRACK_NAME = { FRA: 'Paul Ricard' };
// Short, well-known track names for narrow phone tables (the full circuit name stays on wider screens).
const PHONE_TRACK_NAME = {
  ABU: 'Yas Marina', AUS: 'Albert Park', AUT: 'Red Bull Ring', AZE: 'Baku', BAH: 'Bahrain', BEL: 'Spa', BRA: 'Interlagos',
  CAN: 'Montreal', CHI: 'Shanghai', FRA: 'Paul Ricard', GBR: 'Silverstone', HUN: 'Hungaroring', ITA: 'Monza', IMO: 'Imola',
  JAP: 'Suzuka', MEX: 'Mexico City', MON: 'Monaco', NET: 'Zandvoort', POR: 'Portimão', RUS: 'Sochi', SAU: 'Jeddah',
  SIN: 'Marina Bay', SPA: 'Barcelona', USA: 'COTA', MIA: 'Miami', LAS: 'Las Vegas', QAT: 'Lusail', MAD: 'Madring',
};

function trackForm(model, d) {
  const byTrack = new Map();
  for (const e of d.entries) {
    if (!e.pos || e.dnf) continue;
    const x = byTrack.get(e.track) || { code: e.track, sum: 0, n: 0 };
    x.sum += e.pos; x.n++; byTrack.set(e.track, x);
  }
  const list = [...byTrack.values()].filter((x) => x.n >= 2).map((x) => ({ ...x, avg: x.sum / x.n }));
  if (list.length < 3) return [];
  list.sort((a, b) => a.avg - b.avg || b.n - a.n);
  const best = list[0], worst = list[list.length - 1];
  // Short track name; the average finish is in the hover hint only.
  const short = (code) => CHIP_TRACK_NAME[code] || TRACK_GEO[code]?.loc || model.trackName[code] || code;
  const one = (key, x) => chip(`${esc(t(key))}: ${esc(short(x.code))}`,
    { link: href.track(x.code), title: `${model.trackName[x.code] || x.code} · P${fmt.dec(x.avg, 1)} · ${t('common.trackFormHint', { n: x.n })}` });
  return [one('common.bestTrack', best), one('common.worstTrack', worst)];
}

export function driver(model, name) {
  const d = model.driverMap.get(name);
  if (!d) return notFound(t('driver.notFound'), model, name);
  const seasonsList = [...d.seasons.entries()];
  const bestLabel = d.best ? `${ordinalPos(d.best)} <span class="sub">×${d.bestCount}</span>` : '—';
  // Achievements as chips in the header; only the core counting stats stay as tiles.
  const badges = [
    chip(`#${d.goat} GOAT`, { gold: d.goat <= 3, title: t('common.allTime'), link: '#/goat' }),
    d.titles.length ? chip(`★ ${esc(t('common.champion'))} ×${d.titles.length}`, { gold: true, title: d.titles.map((x) => `S${x}`).join(', ') }) : '',
    !d.wins && d.best ? chip(`${esc(t('common.bestResult'))}: ${ordinalPos(d.best)} ×${d.bestCount}`) : '',
    d.hatTricks ? chip(`${esc(t('common.hatTricks'))} ×${d.hatTricks}`, { title: t('common.hatTrickHint') }) : '',
    d.winStreak > 1 ? chip(`${esc(t('common.streakWins'))}: ${d.winStreak}`) : '',
    d.podiumStreak > 1 ? chip(`${esc(t('common.streakPodiums'))}: ${d.podiumStreak}`) : '',
    d.pointsStreak > 1 ? chip(`${esc(t('common.streakPoints'))}: ${d.pointsStreak}`) : '',
    ...trackForm(model, d),
  ].filter(Boolean).join('');
  const tiles = `<dl class="tiles tiles-compact">
    ${statTile(t('common.points'), fmt.int(d.points))}
    ${statTile(t('common.races'), fmt.int(d.races))}
    ${statTile(t('common.wins'), fmt.int(d.wins), fmt.pct(d.wins / d.races))}
    ${statTile(t('common.podiums'), fmt.int(d.podiums), fmt.pct(d.podiums / d.races))}
    ${statTile(t('common.poles'), fmt.int(d.poles))}
    ${statTile(t('common.fl'), fmt.int(d.fl))}
    ${statTile(t('common.avgQuali'), fmt.dec(d.avgGrid))}
    ${statTile(t('common.dnfs'), fmt.int(d.dnfs), fmt.pct(d.dnfs / d.races))}
  </dl>`;
  const chart = barChart({
    label: `${t('common.seasonPoints')} — ${d.name}`,
    items: seasonsList.map(([n, s]) => ({ label: `S${n}`, value: s.points, tip: `${t('common.season')} ${n}: ${fmt.int(s.points)} ${t('common.pts')} · P${s.pos}` })),
  });
  const maxPos = Math.max(...Object.keys(d.positions).filter((k) => k !== 'DNF').map(Number), 1);
  const dist = barChart({
    label: `${t('common.finishes')} — ${d.name}`,
    items: [...Array.from({ length: maxPos }, (_, i) => ({ label: `${i + 1}`, value: d.positions[i + 1] || 0, tip: `P${i + 1}: ${d.positions[i + 1] || 0}×` })), { label: 'DNF', value: d.positions.DNF || 0, tip: `DNF: ${d.positions.DNF || 0}×` }],
  });
  const seasonTable = table({
    caption: `${t('driver.seasonTable')} — ${d.name}`, rows: seasonsList, colsToggle: false,
    columns: [
      { label: t('common.season'), type: 'num', rowHeader: true, sticky: 1, cls: 'c-pos', value: ([n]) => n, html: ([n, s]) => seasonTag(n, { champion: s.finished && s.pos === 1 }) },
      { label: t('common.team'), keep: true, value: ([, s]) => s.team, html: ([, s]) => teamBadge(s.teamKey, s.team) },
      { label: t('driver.posInSeason'), type: 'num', keep: true, value: ([, s]) => s.pos, html: ([, s]) => posBadge(s.pos) },
      numCol(t('common.races'), ([, s]) => s.races),
      numCol(t('common.wins'), ([, s]) => s.wins),
      numCol(t('common.podiums'), ([, s]) => s.podiums),
      numCol(t('common.points'), ([, s]) => s.points, { cls: 'c-pts' }),
    ],
  });
  const teamRows = [...d.teams.values()].sort((a, b) => b.races - a.races);
  const teamTable = table({
    caption: `${t('common.byTeam')} — ${d.name}`, rows: teamRows, colsToggle: false,
    columns: [
      { label: t('common.team'), rowHeader: true, value: (r) => r.name, html: (r) => teamBadge(r.key, r.name) },
      numCol(t('common.races'), (r) => r.races, { keep: true }), numCol(t('common.wins'), (r) => r.wins),
      numCol(t('common.podiums'), (r) => r.podiums), numCol(t('common.points'), (r) => r.points, { cls: 'c-pts' }),
    ],
  });
  const trackRows = [...d.tracks.values()].sort((a, b) => b.points - a.points);
  const trackTable = table({
    caption: `${t('common.byTrack')} — ${d.name}`, rows: trackRows, colsToggle: false,
    columns: [
      { label: t('common.track'), rowHeader: true, sticky: 2, cls: 'c-driver', value: (r) => model.trackName[r.code] || r.code, html: (r) => trackLink(model, r.code) },
      numCol(t('common.races'), (r) => r.races, { keep: true }), numCol(t('common.wins'), (r) => r.wins),
      numCol(t('common.podiums'), (r) => r.podiums), numCol(t('common.polesShort'), (r) => r.poles, { abbr: t('common.poles') }),
      numCol(t('common.ppr'), (r) => (r.points / r.races).toFixed(3), { html: (r) => fmt.dec(r.points / r.races) }),
      numCol(t('common.points'), (r) => r.points, { cls: 'c-pts' }),
    ],
  });
  const mates = teammateBattles(model, d.name);
  const wl = (w, l) => `<span class="wl"><span class="${w > l ? 'win' : ''}">${w}</span>–<span class="${l > w ? 'loss' : ''}">${l}</span></span>`;
  const mateTable = table({
    caption: `${t('common.teammates')} — ${d.name}`, rows: mates,
    columns: [
      driverCol(model),
      numCol(t('common.racesTogether'), (r) => r.races, { keep: true }),
      { label: t('common.quali'), type: 'num', desc: true, keep: true, value: (r) => r.qualiW - r.qualiL, html: (r) => wl(r.qualiW, r.qualiL) },
      { label: t('common.race'), type: 'num', desc: true, keep: true, value: (r) => r.raceW - r.raceL, html: (r) => wl(r.raceW, r.raceL) },
    ],
  });
  // Career milestones in race order; each links to the race where it happened.
  const firstOf = (f) => d.entries.find(f);
  const msList = [
    ['ms.debut', d.entries[0]],
    ['ms.firstPoints', firstOf((e) => e.pts > 0)],
    ['ms.firstPodium', firstOf((e) => e.podium)],
    ['ms.firstPole', firstOf((e) => e.pp)],
    ['ms.firstWin', firstOf((e) => e.win)],
    ['ms.firstHatTrick', firstOf((e) => e.win && e.pp && e.fl)],
    // Titles are placed at the driver's last race of that season (for the constructors' title: last race for the winning team).
    ['ms.firstTitle', (() => {
      const s = [...model.seasons.values()].find((x) => x.champion?.name === d.name);
      return s && d.entries.findLast((e) => e.season === s.n);
    })()],
    ['ms.firstTeamTitle', (() => {
      for (const s of model.seasons.values()) {
        const key = s.constructorChampion?.key;
        const e = key && d.entries.findLast((x) => x.season === s.n && x.teamKey === key);
        if (e) return e;
      }
    })()],
    ...[50, 100, 150, 200, 250, 300].filter((n) => d.entries.length >= n).map((n) => [['ms.starts', { n }], d.entries[n - 1]]),
  ];
  const milestones = milestonesHtml(model, msList);
  const historyRows = [...d.entries].reverse();
  const historyTable = table({
    caption: `${t('common.history')} — ${d.name}`, rows: historyRows, filter: true,
    columns: [
      { label: t('common.season'), type: 'num', sticky: 1, cls: 'c-pos', value: (r) => r.race, html: (r) => seasonTag(r.season) },
      { label: t('common.track'), rowHeader: true, value: (r) => model.trackName[r.track] || r.track, html: (r) => {
        const full = model.trackName[r.track] || r.track, short = PHONE_TRACK_NAME[r.track];
        const name = short && short !== full ? `<span class="tn-full">${esc(full)}</span><span class="tn-short">${esc(short)}</span>` : `<span>${esc(full)}</span>`;
        return `<a href="${href.race(r.race)}" class="who">${trackFlag(r.track)}${name}</a> <span class="hist-meta"><span class="sub">R${model.races.get(r.race).round}</span>${sprintBadge(model.races.get(r.race))}${ppFl(r)}</span>`;
      } },
      { label: t('common.team'), value: (r) => r.team, html: (r) => teamBadge(r.teamKey, r.team) },
      numCol(t('common.grid'), (r) => r.grid ?? '', { desc: false, html: (r) => (r.grid ? `${r.grid}` : '—') }),
      { label: t('common.result'), type: 'num', keep: true, value: (r) => (r.dnf ? 99 : r.pos), html: (r) => posBadge(r.pos, r.dnf) },
      numCol(t('common.points'), (r) => r.pts, { cls: 'c-pts' }),
    ],
  });
  const html = `${backLink('#/goat')}<header class="page-head driver-head">
    <div class="driver-id">
      <span class="flag-xl">${flag(d.flag, fmt.country(d.flag) || d.country)}</span>
      <div>
        <p class="kicker">${esc(fmt.country(d.flag) || d.country)} · S${d.firstSeason}${d.lastSeason !== d.firstSeason ? `–S${d.lastSeason}` : ''}</p>
        <h1 tabindex="-1">${esc(d.name)}</h1>
        <p class="lead">${teamBadge(d.lastTeamKey, d.lastTeam)}</p>
        <p class="badges">${badges}</p>
      </div>
    </div>
  </header>
  ${tiles}
  ${section(t('ms.title'), milestones, { id: 'd-ms' })}
  <div class="grid-2">
    ${section(t('common.seasonPoints'), chart, { id: 'd-sp' })}
    ${section(t('common.finishes'), dist, { id: 'd-fin' })}
  </div>
  ${section(t('driver.seasonTable'), seasonTable, { id: 'd-seasons' })}
  <div class="grid-2">
    ${section(t('common.byTeam'), teamTable, { id: 'd-teams' })}
    ${section(t('common.teammates'), mateTable, { id: 'd-mates' })}
  </div>
  ${section(t('common.byTrack'), trackTable, { id: 'd-tracks' })}
  ${section(t('common.history'), historyTable, { id: 'd-hist', cls: 'tall' })}`;
  return { title: d.name, html };
}

/* ---------- Teams ---------- */
export function teams(model) {
  const cards = model.teams.map((tm) => `<a class="team-card" href="${href.team(tm.key)}" style="--team:${tm.info.color}">
      <span class="team-card-logo">${teamLogo(tm.key, 'tlogo-lg')}</span>
      <span class="team-card-pos">#${tm.pos}</span>
      <span class="team-card-name">${esc(tm.info.name)}</span>
      <span class="sub">${esc(tm.info.full)}</span>
      <dl class="team-card-stats">
        <div><dt>${t('common.points')}</dt><dd>${fmt.int(tm.points)}</dd></div>
        <div><dt>${t('common.wins')}</dt><dd>${fmt.int(tm.wins)}</dd></div>
        <div><dt>${t('common.titles')}</dt><dd>${fmt.int(tm.titles.length)}</dd></div>
      </dl>
    </a>`).join('');
  return { title: t('teams.title'), html: `${hiddenHead(t('teams.title'))}<div class="team-grid">${cards}</div>` };
}

/** Achievement chip for driver/team page headers; `link` makes it clickable, `title` adds a hover hint. */
function chip(text, { gold = false, title = '', link = '' } = {}) {
  const attrs = `class="chip ${gold ? 'chip-gold' : ''}" ${title ? `title="${esc(title)}"` : ''}`;
  return link ? `<a ${attrs} href="${link}">${text}</a>` : `<span ${attrs}>${text}</span>`;
}

/**
 * Milestone cards in race order; each links to the race where it happened.
 * items: [key, entry, who?] — key is an i18n key or [key, params]; who (team pages) names the driver under the track.
 * Milestones reached in the same race share one card (e.g. a debut win: debut, first points, podium, win).
 */
const MS_GOLD = ['ms.firstWin', 'ms.firstTitle', 'ms.firstTeamTitle', 'ms.firstDriverTitle', 'ms.firstOneTwo'];
function milestonesHtml(model, items) {
  const list = items.filter(([, e]) => e).map(([key, e, who], i) => ({ key, e, who, i })).sort((a, b) => a.e.race - b.e.race || a.i - b.i);
  const groups = [];
  for (const m of list) {
    const last = groups.at(-1);
    if (last && last.e.race === m.e.race) { last.keys.push(m.key); if (!last.who) last.who = m.who; } else groups.push({ e: m.e, keys: [m.key], who: m.who });
  }
  return `<ol class="milestones">${groups.map(({ keys, e, who }) => {
    const label = keys.map((key) => (Array.isArray(key) ? t(key[0], key[1]) : t(key))).join(' · ');
    const race = model.races.get(e.race);
    const tail = who === undefined ? (e.dnf ? 'DNF' : e.pos ? 'P' + e.pos : '—') : who;
    return `<li class="${keys.some((k) => MS_GOLD.includes(k)) ? 'ms-gold' : ''}">
      <p class="kicker">${esc(label)}</p>
      <a class="who" href="${href.race(e.race)}">${trackFlag(e.track)}<span>${esc(model.trackName[e.track] || e.track)}</span></a>
      <p class="sub">S${e.season} · R${race.round}${tail ? ` · ${esc(tail)}` : ''}</p>
    </li>`;
  }).join('')}</ol>`;
}

export function team(model, key) {
  const tm = model.teamMap.get(key);
  if (!tm) return notFound(t('team.notFound'), model, key);
  const driverRows = [...tm.drivers.values()].sort((a, b) => b.points - a.points);
  const top = (f) => [...tm.drivers.values()].sort((a, b) => f(b) - f(a))[0];
  const mostRaces = top((x) => x.races), mostPts = top((x) => x.points), mostWins = top((x) => x.wins);
  const seasonRows = [];
  for (const s of model.seasons.values()) {
    const c = s.constructors.find((x) => x.key === key);
    if (c) seasonRows.push({ season: s.n, ...c, finished: s.finished });
  }
  // Names the team raced under, oldest first (the last is today's name); the header lists them all with each era's logo.
  const names = [...tm.names.entries()].sort((a, b) => a[1] - b[1]).map(([n]) => n);
  const finishedPos = seasonRows.filter((r) => r.finished).map((r) => r.pos);
  const best = finishedPos.length ? Math.min(...finishedPos) : null;
  const badges = [
    chip(`#${tm.pos} ${esc(t('common.allTime'))}`, { gold: tm.pos <= 3, link: '#/teams' }),
    tm.titles.length ? chip(`★ ${esc(t('common.constructorChampion'))} ×${tm.titles.length}`, { gold: true, title: tm.titles.map((x) => `S${x}`).join(', ') }) : '',
    tm.driverTitles.length ? chip(`★ ${esc(t('common.driverTitles'))} ×${tm.driverTitles.length}`, { gold: true, title: tm.driverTitles.map((x) => `S${x.season}`).join(', ') }) : '',
    !tm.titles.length && best ? chip(`${esc(t('common.bestResult'))}: ${ordinalPos(best)} ×${finishedPos.filter((p) => p === best).length}`) : '',
  ].filter(Boolean).join('');
  // Team milestones (no debut): each card names the driver who got it; titles sit at the season's last race for the team.
  const tEntries = model.results.filter((r) => r.teamKey === key).sort((a, b) => a.race - b.race);
  const tFirst = (f) => tEntries.find(f);
  const raceIds = [...new Set(tEntries.map((r) => r.race))];
  const oneTwo = raceIds.map((id) => tEntries.filter((r) => r.race === id && !r.dnf)).find((rs) => rs.some((r) => r.pos === 1) && rs.some((r) => r.pos === 2))?.find((r) => r.pos === 1);
  const pts = tFirst((r) => r.pts > 0), pod = tFirst((r) => r.podium), pole = tFirst((r) => r.pp), win = tFirst((r) => r.win);
  const teamTitle = tm.titles.length ? tEntries.findLast((r) => r.season === tm.titles[0]) : null;
  const dt = tm.driverTitles[0];
  const driverTitle = dt ? tEntries.findLast((r) => r.season === dt.season && r.driver === dt.driver) : null;
  const teamMs = milestonesHtml(model, [
    ['ms.firstPoints', pts, pts?.driver],
    ['ms.firstPodium', pod, pod?.driver],
    ['ms.firstPole', pole, pole?.driver],
    ['ms.firstWin', win, win?.driver],
    ['ms.firstOneTwo', oneTwo, ''],
    ['ms.firstTeamTitle', teamTitle, ''],
    ['ms.firstDriverTitle', driverTitle, dt?.driver],
    ...[50, 100, 150, 200, 250].filter((n) => raceIds.length >= n).map((n) => [['ms.teamStarts', { n }], tEntries.find((r) => r.race === raceIds[n - 1]), '']),
  ]);
  const tiles = `<dl class="tiles tiles-compact tiles-5">
    ${statTile(t('common.points'), fmt.int(tm.points))}
    ${statTile(t('common.races'), fmt.int(tm.raceCount))}
    ${statTile(t('common.wins'), fmt.int(tm.wins))}
    ${statTile(t('common.podiums'), fmt.int(tm.podiums))}
    ${statTile(t('common.poles'), fmt.int(tm.poles))}
    ${statTile(t('common.fl'), fmt.int(tm.fl))}
    ${statTile(t('common.driversCount'), fmt.int(tm.drivers.size))}
    ${statTile(t('common.mostRaces'), driverLink(model, mostRaces.name), fmt.int(mostRaces.races))}
    ${statTile(t('common.mostPoints'), driverLink(model, mostPts.name), fmt.int(mostPts.points))}
    ${mostWins.wins ? statTile(t('common.mostWins'), driverLink(model, mostWins.name), fmt.int(mostWins.wins)) : ''}
  </dl>`;
  const html = `${backLink('#/teams')}<header class="page-head team-head" style="--team:${tm.info.color}">
    <div class="team-id">${teamLogo(key, 'tlogo-xl')}<div><p class="kicker">${esc(tm.info.full)}</p><h1 tabindex="-1">${esc(tm.info.name)}</h1>
    ${names.length > 1 ? `<p class="lead old-names">${names.map((n) => `<span class="old-name">${teamLogo(key, '', n)}${esc(n)}</span>`).join('<span aria-hidden="true">→</span>')}</p>` : ''}
    <p class="badges">${badges}</p></div></div>
  </header>
  ${tiles}
  ${teamMs.includes('<li') ? section(t('ms.title'), teamMs, { id: 't-ms' }) : ''}
  ${section(t('common.seasonPoints'), barChart({
    label: `${t('common.seasonPoints')} — ${tm.info.name}`,
    items: seasonRows.map((r) => ({ label: `S${r.season}`, value: r.points, tip: `${t('common.season')} ${r.season}: ${fmt.int(r.points)} ${t('common.pts')} · P${r.pos}` })),
  }), { id: 't-points' })}
  ${section(t('common.seasons'), table({
    caption: `${t('common.seasons')} — ${tm.info.name}`, rows: seasonRows, colsToggle: false,
    columns: [
      { label: t('common.season'), type: 'num', rowHeader: true, sticky: 1, cls: 'c-pos', value: (r) => r.season, html: (r) => seasonTag(r.season, { champion: r.finished && r.pos === 1, label: t('common.constructorChampion') }) },
      { label: t('common.pos'), type: 'num', keep: true, value: (r) => r.pos, html: (r) => posBadge(r.pos) },
      { label: t('common.drivers'), sort: false, html: (r) => `<span class="list">${[...r.drivers].map((x) => driverLink(model, x)).join('')}</span>` },
      numCol(t('common.wins'), (r) => r.wins), numCol(t('common.podiums'), (r) => r.podiums),
      numCol(t('common.points'), (r) => r.points, { cls: 'c-pts' }),
    ],
  }), { id: 't-seasons' })}
  ${section(t('team.drivers'), table({
    caption: `${t('team.drivers')} — ${tm.info.name}`, rows: driverRows, filter: driverRows.length > 12,
    columns: [driverCol(model), numCol(t('common.races'), (r) => r.races), numCol(t('common.wins'), (r) => r.wins, { keep: true }), numCol(t('common.podiums'), (r) => r.podiums), numCol(t('common.polesShort'), (r) => r.poles, { abbr: t('common.poles') }), numCol(t('common.points'), (r) => r.points, { cls: 'c-pts' })],
  }), { id: 't-drivers' })}
  <div class="grid-2">
    ${section(t('common.winsList'), table({
      caption: `${t('common.winsList')} — ${tm.info.name}`, rows: [...tm.winsList].reverse(),
      columns: [
        { label: t('common.season'), type: 'num', sticky: 1, cls: 'c-pos', value: (r) => r.race, html: (r) => seasonTag(r.season) },
        { label: t('common.track'), rowHeader: true, value: (r) => model.trackName[r.track] || r.track, html: (r) => `<a class="who" href="${href.race(r.race)}">${trackFlag(r.track)}<span>${esc(model.trackName[r.track] || r.track)}</span></a>` },
        { label: t('common.driver'), keep: true, value: (r) => r.driver, html: (r) => driverLink(model, r.driver) },
      ],
    }), { id: 't-wins', cls: 'tall' })}
    ${section(t('team.tracks'), table({
      caption: `${t('team.tracks')} — ${tm.info.name}`, rows: [...tm.tracks.values()].sort((a, b) => b.points - a.points),
      columns: [
        { label: t('common.track'), rowHeader: true, value: (r) => model.trackName[r.code] || r.code, html: (r) => trackLink(model, r.code) },
        numCol(t('common.wins'), (r) => r.wins, { keep: true }), numCol(t('common.points'), (r) => r.points, { cls: 'c-pts' }),
      ],
    }), { id: 't-tracks', cls: 'tall' })}
  </div>`;
  return { title: tm.info.name, html };
}

/* ---------- Tracks ---------- */
export function tracks(model) {
  // The whole card is one link, so drivers are shown as flag + name text (no nested links);
  // data-preview-driver still gives them the hover card.
  const who = (name) => {
    if (!name) return '—';
    const d = model.driverMap.get(name);
    return `<span class="who" data-preview-driver="${esc(name)}">${flag(d?.flag, d ? fmt.country(d.flag) || d.country : '')}<span class="ellipsis">${esc(name)}</span></span>`;
  };
  const seasonChip = (n) => `<span class="tag"><span>S${n}</span></span>`;
  const record = (label, rec) => `<div class="tc-fact">
      <dt>${esc(label)}</dt>
      ${rec
        ? `<dd class="tc-time"><span>${esc(rec.time)}</span>${seasonChip(rec.season)}</dd><dd class="tc-who">${who(rec.driver)}</dd>`
        : `<dd class="tc-time tc-none">—</dd><dd class="tc-who sub">${t('track.noRecord')}</dd>`}
    </div>`;
  const cards = model.tracks.map((tr) => `<a class="track-card" href="${href.track(tr.code)}">
      ${trackMap(tr.code)}
      <span class="track-card-name">${trackFlag(tr.code)}<span>${esc(tr.name)}</span></span>
      <span class="sub">${fmt.country(TRACK_COUNTRY[tr.code])} · ${t('common.racesCount', { n: tr.races.length })}</span>
      <dl class="track-card-facts">
        <div class="tc-fact tc-winner">
          <dt>${t('common.lastWinner')}</dt>
          <dd class="tc-who">${who(tr.lastRace.winner?.driver)}${seasonChip(tr.lastRace.season)}</dd>
        </div>
        ${record(t('common.lapRecord'), tr.record?.lap)}
        ${record(t('common.qualiRecordShort'), tr.record?.quali)}
      </dl>
    </a>`).join('');
  return { title: t('tracks.title'), html: `${hiddenHead(t('tracks.title'))}<div class="track-grid">${cards}</div>` };
}

function recordTile(model, label, rec) {
  if (!rec) return statTile(label, '—', t('track.noRecord'));
  const who = model.driverMap.has(rec.driver) ? driverLink(model, rec.driver) : esc(rec.driver);
  return statTile(label, `<span class="time">${esc(rec.time)}</span>`, `${who}<span class="tag"><span>S${rec.season}</span></span>`, { accent: true });
}

export function track(model, code) {
  const tr = model.trackMap.get(code);
  if (!tr) return notFound(t('track.notFound'), model, code);
  const geo = TRACK_GEO[code];
  const top = (f) => [...tr.drivers.values()].sort((a, b) => f(b) - f(a) || b.points - a.points)[0];
  const mostWins = top((x) => x.wins), mostPoles = top((x) => x.poles), mostPts = top((x) => x.points);
  const last = tr.lastRace;
  // One chip per season, linking to that season's race here (the main race if a sprint was also held).
  const bySeason = new Map();
  for (const r of [...tr.races].sort((a, b) => a.id - b.id)) {
    const cur = bySeason.get(r.season);
    if (!cur || (cur.sprint && !r.sprint)) bySeason.set(r.season, r);
  }
  const seasonRaces = [...bySeason.values()].sort((a, b) => a.season - b.season);
  const winners = new Set(tr.races.map((r) => r.winner?.driver).filter(Boolean)).size;
  const firstSeason = Math.min(...tr.races.map((r) => r.season));
  const badges = [
    geo?.len ? chip(`${esc(t('common.length'))}: ${fmt.dec(geo.len / 1000, 3)} km`) : '',
    chip(`${esc(t('track.firstRace'))}: S${firstSeason}`),
    winners ? chip(`${esc(t('track.winners'))}: ${winners}`) : '',
  ].filter(Boolean).join('');
  const tiles = `<dl class="tiles tiles-compact tiles-stack">
    ${recordTile(model, t('common.lapRecord'), tr.record?.lap)}
    ${recordTile(model, t('common.qualiRecord'), tr.record?.quali)}
    ${statTile(t('common.lastWinner'), last.winner ? driverLink(model, last.winner.driver) : '—', `${last.winner ? teamBadge(last.winner.teamKey, last.winner.team) : ''}<span class="tag"><span>S${last.season}</span></span>`)}
    ${mostWins?.wins ? statTile(t('common.mostWins'), driverLink(model, mostWins.name), fmt.int(mostWins.wins)) : ''}
    ${mostPoles?.poles ? statTile(t('common.mostPoles'), driverLink(model, mostPoles.name), fmt.int(mostPoles.poles)) : ''}
    ${statTile(t('common.mostPoints'), driverLink(model, mostPts.name), fmt.int(mostPts.points))}
  </dl>`;
  const html = `${backLink('#/tracks')}<header class="page-head track-head">
    <div>
      <p class="kicker">${trackFlag(code)} ${esc(fmt.country(TRACK_COUNTRY[code]))}${geo?.loc ? ` · ${esc(geo.loc)}` : ''}</p>
      <h1 tabindex="-1">${esc(tr.name)}</h1>
      <p class="lead track-seasons">${t('common.racesCount', { n: tr.races.length })}${seasonRaces.map((r) => chip(`S${r.season}`, { link: href.race(r.id), title: `${t('common.season')} ${r.season} · R${r.round}` })).join('')}</p>
      <p class="badges">${badges}</p>
    </div>
    <div class="track-hero">${trackMap(code, { draw: true, label: tr.name })}</div>
  </header>
  ${tiles}
  ${section(t('track.bySeason'), table({
    caption: `${t('track.bySeason')} — ${tr.name}`, rows: [...tr.races].reverse(), colsToggle: false,
    columns: [
      { label: t('common.season'), type: 'num', sticky: 1, cls: 'c-pos', value: (r) => r.id, html: (r) => seasonTag(r.season) },
      { label: t('common.round'), type: 'num', value: (r) => r.round, html: (r) => `<a href="${href.race(r.id)}">R${r.round}</a>${sprintBadge(r)}` },
      { label: t('common.winner'), rowHeader: true, value: (r) => r.winner?.driver, html: (r) => driverTeam(model, r.winner) },
      { label: t('common.pole'), value: (r) => r.pole?.driver || '', html: (r) => driverTeam(model, r.pole) },
      { label: t('common.fastestLap'), value: (r) => r.fastest?.driver || '', html: (r) => driverTeam(model, r.fastest) },
    ],
  }), { id: 'tr-seasons' })}
  <div class="grid-2">
    ${section(t('track.driverTable'), table({
      caption: `${t('track.driverTable')} — ${tr.name}`, rows: tr.driverList, filter: tr.driverList.length > 12,
      columns: [posCol((r) => tr.driverList.indexOf(r) + 1), driverCol(model), numCol(t('common.races'), (r) => r.races), numCol(t('common.wins'), (r) => r.wins), numCol(t('common.podiums'), (r) => r.podiums), numCol(t('common.polesShort'), (r) => r.poles, { abbr: t('common.poles') }), numCol(t('common.points'), (r) => r.points, { cls: 'c-pts' })],
    }), { id: 'tr-drivers', cls: 'tall' })}
    ${section(t('track.teamTable'), table({
      caption: `${t('track.teamTable')} — ${tr.name}`, rows: tr.teamList, colsToggle: false,
      columns: [posCol((r) => tr.teamList.indexOf(r) + 1), { label: t('common.team'), rowHeader: true, value: (r) => teamInfo(r.key).name, html: (r) => teamBadge(r.key, teamInfo(r.key).name) }, numCol(t('common.wins'), (r) => r.wins, { keep: true }), numCol(t('common.podiums'), (r) => r.podiums), numCol(t('common.points'), (r) => r.points, { cls: 'c-pts' })],
    }), { id: 'tr-teams', cls: 'tall' })}
  </div>`;
  return { title: tr.name, html };
}

/* ---------- Race ---------- */
export function race(model, id) {
  const r = model.races.get(+id);
  if (!r) return notFound(t('race.notFound'), model, '');
  const i = model.raceList.indexOf(r);
  const prev = model.raceList[i - 1], next = model.raceList[i + 1];
  const name = model.trackName[r.track] || r.track;
  // Biggest climb from grid to finish (finishers only); ties go to the better finishing position.
  const climb = r.entries.filter((e) => e.grid && e.pos && !e.dnf && e.grid > e.pos).sort((a, b) => (b.grid - b.pos) - (a.grid - a.pos) || a.pos - b.pos)[0];
  const rnav = `<nav class="race-nav" aria-label="${esc(t('common.races'))}">
    ${prev ? `<a href="${href.race(prev.id)}" rel="prev">← ${esc(model.trackName[prev.track] || prev.track)} <span class="sub">S${prev.season} R${prev.round}</span></a>` : '<span></span>'}
    ${next ? `<a href="${href.race(next.id)}" rel="next">${esc(model.trackName[next.track] || next.track)} <span class="sub">S${next.season} R${next.round}</span> →</a>` : '<span></span>'}
  </nav>`;
  const html = `${backLink(r.season === model.currentSeason ? '#/standings' : href.season(r.season))}<header class="page-head track-head">
    <div>
      <p class="kicker">${raceSummary(model, r)} <span class="sub">${t('common.raceNo', { n: r.id })}</span>${sprintBadge(r)}</p>
      <h1 tabindex="-1">${esc(name)}</h1>
      <p class="lead"><a class="who" href="${href.track(r.track)}">${trackFlag(r.track)}<span>${esc(fmt.country(TRACK_COUNTRY[r.track]))}</span></a></p>
    </div>
    <div class="track-hero">${trackMap(r.track, { draw: true, label: name })}</div>
  </header>
  ${r.sprint ? `<p class="note note-sprint">${t('race.sprintNote')}</p>` : ''}
  ${podium(model, r)}
  <dl class="tiles tiles-compact tiles-stack ${climb ? 'tiles-4' : ''}">
    ${statTile(t('common.winner'), r.winner ? driverLink(model, r.winner.driver) : '—', r.winner ? teamBadge(r.winner.teamKey, r.winner.team) : '', { accent: true })}
    ${statTile(t('common.pole'), r.pole ? driverLink(model, r.pole.driver) : '—', r.pole ? teamBadge(r.pole.teamKey, r.pole.team) : '')}
    ${statTile(t('common.fastestLap'), r.fastest ? driverLink(model, r.fastest.driver) : '—', r.fastest ? teamBadge(r.fastest.teamKey, r.fastest.team) : '')}
    ${climb ? statTile(t('race.biggestGain'), driverLink(model, climb.driver), `<span class="delta up">▲${climb.grid - climb.pos}</span> P${climb.grid} → P${climb.pos}`) : ''}
  </dl>
  ${section(t('race.classification'), table({
    caption: `${t('race.classification')} — ${name}`, rows: r.entries, colsToggle: false,
    columns: [
      // Places gained/lost since the start sit next to the position, as in the standings.
      { label: t('common.pos'), type: 'num', sticky: 1, cls: 'c-pos', value: (e) => (e.dnf ? 99 + (e.pos || 0) : e.pos), html: (e) => {
        const g = e.grid && e.pos && !e.dnf ? e.grid - e.pos : 0;
        const move = g ? `<span class="pos-move ${g > 0 ? 'up' : 'down'}" title="${esc(t('common.gained'))}">${g > 0 ? '▲' : '▼'}${Math.abs(g)}</span>` : '<span class="pos-move"></span>';
        return `<span class="pos-cell">${posBadge(e.pos, e.dnf)}${move}</span>`;
      } },
      { ...driverCol(model, (e) => e.driver), html: (e) => `<span class="who-badges">${driverLink(model, e.driver)}${ppFl(e)}</span>` },
      { label: t('common.team'), value: (e) => e.team, html: (e) => teamBadge(e.teamKey, e.team) },
      numCol(t('common.grid'), (e) => e.grid ?? '', { desc: false, html: (e) => (e.grid ? `${e.grid}` : '—') }),
      numCol(t('common.points'), (e) => e.pts, { cls: 'c-pts' }),
    ],
  }), { id: 'r-class' })}
  ${rnav}`;
  return { title: `${name} — S${r.season} R${r.round}`, html };
}

/* ---------- Hall of Fame ---------- */
export function hallOfFame(model) {
  const done = [...model.seasons.values()].filter((s) => s.finished).reverse();
  const stars = (n) => `<span class="hof-stars" aria-label="${esc(`${t('common.titles')}: ${n}`)}">${n <= 5 ? '★'.repeat(n) : `★ ×${n}`}</span>`;

  // Title counts; ties go to the driver/team with more all-time points.
  const dTitles = new Map(), cTitles = new Map();
  for (const s of done) {
    dTitles.set(s.champion.name, [...(dTitles.get(s.champion.name) || []), s.n]);
    cTitles.set(s.constructorChampion.key, [...(cTitles.get(s.constructorChampion.key) || []), s.n]);
  }
  const pointsOf = (name) => model.driverMap.get(name)?.points || 0;
  const drivers = [...dTitles.entries()].map(([name, list]) => ({ name, list }))
    .sort((a, b) => b.list.length - a.list.length || pointsOf(b.name) - pointsOf(a.name));
  const teams = [...cTitles.entries()].map(([key, list]) => ({ key, list }))
    .sort((a, b) => b.list.length - a.list.length || (model.teamMap.get(b.key)?.points || 0) - (model.teamMap.get(a.key)?.points || 0));

  // Legends: the three most decorated drivers, the most decorated in the middle.
  const legends = drivers.slice(0, 3).map((r, i) => {
    const d = model.driverMap.get(r.name);
    return `<li class="legend legend-${i + 1}">
      <span class="legend-flag">${flag(d?.flag, d ? fmt.country(d.flag) || d.country : '')}</span>
      <span class="legend-name">${driverLink(model, r.name, { flagOn: false })}</span>
      ${stars(r.list.length)}
      <span class="legend-seasons">${[...r.list].sort((x, y) => x - y).map((n) => seasonTag(n)).join('')}</span>
    </li>`;
  }).join('');
  const others = drivers.slice(3).map((r) => `<li>${driverLink(model, r.name)}${stars(r.list.length)}</li>`).join('');
  // Constructor podium: same layout, with the team logo in place of the flag.
  const teamLegends = teams.slice(0, 3).map((r, i) => `<li class="legend legend-${i + 1}">
      <span class="legend-logo">${teamLogo(r.key, 'tlogo-xl', teamInfo(r.key).name)}</span>
      <span class="legend-name"><a href="${href.team(r.key)}">${esc(teamInfo(r.key).name)}</a></span>
      ${stars(r.list.length)}
      <span class="legend-seasons">${[...r.list].sort((x, y) => x - y).map((n) => seasonTag(n)).join('')}</span>
    </li>`).join('');
  const teamRow = teams.slice(3).map((r) => `<li style="--team:${colorFor(r.key, teamInfo(r.key).name)}" title="${esc(r.list.map((n) => `S${n}`).join(', '))}">
      <a href="${href.team(r.key)}">${teamLogo(r.key, 'tlogo-sm', teamInfo(r.key).name)}<span>${esc(teamInfo(r.key).name)}</span></a>${stars(r.list.length)}
    </li>`).join('');

  // One card per finished season, edged in the champion's team colour.
  const cards = done.map((s) => {
    const c = s.champion, k = s.constructorChampion;
    const d = model.driverMap.get(c.name);
    return `<li class="hof-season" style="--team:${colorFor(c.lastTeamKey, c.lastTeam)}">
      <a class="hof-season-n" href="${href.season(s.n)}">S${s.n}</a>
      <p class="hof-champ">${flag(d?.flag, d ? fmt.country(d.flag) || d.country : '')}${driverLink(model, c.name, { flagOn: false })}</p>
      <p class="sub hof-meta">${teamBadge(c.lastTeamKey, c.lastTeam)}</p>
      <div class="hof-cons"><span class="kicker">${t('common.constructorChampion')}</span>${teamBadge(k.key, k.name)}${lineup(model, k)}</div>
    </li>`;
  }).join('');

  const html = `${hiddenHead(t('hof.title'))}
  ${section(t('hof.mostDriverTitles'), `<ol class="hof-legends">${legends}</ol>${others ? `<ul class="hof-chips">${others}</ul>` : ''}`, { id: 'hof-d' })}
  ${section(t('hof.mostTeamTitles'), `<ol class="hof-legends">${teamLegends}</ol>${teamRow ? `<ul class="hof-chips hof-teams">${teamRow}</ul>` : ''}`, { id: 'hof-c' })}
  ${section(t('hof.seasons'), `<ol class="hof-wall">${cards}</ol>`, { id: 'hof-s' })}`;
  return { title: t('hof.title'), html };
}

/* Edit distance between two strings (letters added, removed or changed). */
function distance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/* Drivers, teams and tracks whose name is closest to what was typed in the address (e.g. a misspelt surname). */
function closestNames(model, query, limit = 6) {
  const q = fold(String(query || '').trim());
  if (q.length < 2) return [];
  const items = [
    ...model.drivers.map((d) => ({ name: d.name, link: driverLink(model, d.name) })),
    ...model.teams.map((tm) => ({ name: tm.info.name, alt: tm.key, link: teamBadge(tm.key, tm.info.name) })),
    ...model.tracks.map((tr) => ({ name: tr.name, alt: `${tr.code} ${TRACK_GEO[tr.code]?.loc || ''}`, link: `<span class="who">${trackFlag(tr.code)}<a href="${href.track(tr.code)}">${esc(tr.name)}</a></span>` })),
  ];
  const scored = items
    .map((it) => {
      const words = fold(`${it.name} ${it.alt || ''}`).split(/\s+/).filter(Boolean);
      const whole = fold(it.name);
      // Closest of: the whole name, any single word of it; a name containing the query counts as very close.
      const d = whole.includes(q) || words.some((w) => w.startsWith(q)) ? 0 : Math.min(distance(q, whole), ...words.map((w) => distance(q, w)));
      return { it, d: d / Math.max(q.length, 1) };
    })
    .sort((a, b) => a.d - b.d);
  // Only names about as close as the best one, and never ones that share less than ~two thirds of the letters.
  const cut = Math.min(0.34, (scored[0]?.d ?? 1) + 0.2);
  return scored.filter((x) => x.d <= cut).slice(0, limit).map((x) => x.it);
}

export function notFound(msg, model = null, query = '') {
  const close = model ? closestNames(model, query) : [];
  // A random circuit from the league's history (a wide one, so it frames the number), drawn as a dashed line behind the big 404.
  const wide = Object.keys(TRACK_GEO).filter((c) => { const [, , w, h] = TRACK_GEO[c].vb.split(' ').map(Number); return w / h >= 1.4; });
  const codes = wide.length ? wide : Object.keys(TRACK_GEO);
  const code = codes[Math.floor(Math.random() * codes.length)];
  const what = query ? `${msg.replace(/\.$/, '')} „${query}”.` : msg;
  const hints = close.length
    ? `<p class="nf-hint">${esc(t('state.didYouMean'))}</p><ul class="nf-list">${close.map((x) => `<li>${x.link}</li>`).join('')}</ul>`
    : '';
  return {
    title: msg,
    html: `<section class="nf">
      <div class="nf-visual" aria-hidden="true">${trackMap(code, { cls: 'nf-track' })}<span class="nf-code">404</span></div>
      <p class="kicker">${esc(t('nf.kicker'))}</p>
      <h1 tabindex="-1">${esc(t('nf.title'))}</h1>
      <p class="nf-msg">${esc(what)}</p>
      ${hints}
      <p class="nf-actions"><a class="btn btn-gold" href="#/">${esc(t('nav.home'))}</a><button type="button" class="btn" data-open-search>${esc(t('search.open'))}</button></p>
    </section>`,
  };
}
