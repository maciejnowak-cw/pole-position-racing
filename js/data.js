// Loads league data from the public Google Sheet and derives every statistic from the raw results.
import { teamKey, teamInfo, RESERVE } from './teams.js';
import { countryCode, TRACK_NAMES } from './countries.js';

const CACHE_KEY = 'ppr-data-v1';

const SOURCES = {
  raw:     ['RAW RACE DATA', 'D1:O'],   // RACE, DRIVER, SEASON, TRACK, TEAM, CAR, POSITION, POINTS, DNF, FL, PP, GRID
  nat:     ['RAW RACE DATA', 'Q2:Z'],   // DRIVER ... Nationality (column Z)
  records: ['RECORDS', 'A1:C'],         // TRACK, FASTEST LAP, FASTEST QUALI
  tracks:  ['TRACK DATA', 'AO2:AP'],    // NAME, COUNTRY (track code)
};

function sheetUrl(id, [sheet, range]) {
  const p = new URLSearchParams({ tqx: 'out:csv', headers: '1', sheet, range });
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?${p}`;
}

/* ---------- CSV ---------- */
export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', i = 0, q = false;
  while (i < text.length) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
    i++;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/* ---------- Fetch + cache ---------- */
export function readCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (c && c.texts && c.texts.raw) return c;
  } catch { /* storage unavailable */ }
  return null;
}

function writeCache(entry) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(entry)); } catch { /* quota or private mode */ }
}

export async function fetchTexts(sheetId) {
  const entries = await Promise.all(Object.entries(SOURCES).map(async ([key, src]) => {
    const res = await fetch(sheetUrl(sheetId, src), { cache: 'no-store' });
    if (!res.ok) throw new Error(`${key}: HTTP ${res.status}`);
    const text = await res.text();
    if (/^\s*</.test(text)) throw new Error(`${key}: sheet not public`);
    return [key, text];
  }));
  const texts = Object.fromEntries(entries);
  // Sanity check before replacing good cached data with a broken sheet.
  const model = buildModel(texts);
  if (!model.raceList.length) throw new Error('no race data');
  const entry = { t: Date.now(), texts };
  writeCache(entry);
  return { entry, model };
}

/* ---------- Model ---------- */
const GP_POINTS = [0, 25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
const isX = (v) => String(v).trim().toUpperCase() === 'X';

function parseRecord(cell) {
  const m = /^(.*?)\s*-\s*\[\s*([\d:.,]+)\s*-\s*S(\d+)\s*\]/.exec(cell || '');
  return m ? { driver: m[1].trim(), time: m[2], season: +m[3] } : null;
}

function longestStreak(list, pred) {
  let best = 0, cur = 0;
  for (const x of list) { cur = pred(x) ? cur + 1 : 0; if (cur > best) best = cur; }
  return best;
}

/** Sort standings by points, then countback (most wins, then most 2nds, ...). */
function byPointsCountback(a, b) {
  if (b.points !== a.points) return b.points - a.points;
  for (let p = 1; p <= 30; p++) {
    const d = (b.finishes[p] || 0) - (a.finishes[p] || 0);
    if (d) return d;
  }
  return String(a.name ?? a.key ?? a.code).localeCompare(String(b.name ?? b.key ?? b.code));
}

function blankStats(extra) {
  return { races: 0, wins: 0, podiums: 0, poles: 0, fl: 0, dnfs: 0, points: 0, gridSum: 0, gridN: 0, finishes: {}, ...extra };
}

function addResult(s, r) {
  s.races++;
  s.points += r.pts;
  if (r.win) s.wins++;
  if (r.podium) s.podiums++;
  if (r.pp) s.poles++;
  if (r.fl) s.fl++;
  if (r.dnf) s.dnfs++;
  if (r.grid) { s.gridSum += r.grid; s.gridN++; }
  if (!r.dnf && r.pos) s.finishes[r.pos] = (s.finishes[r.pos] || 0) + 1;
}

const avgGrid = (s) => (s.gridN ? s.gridSum / s.gridN : null);

export function buildModel(texts) {
  // Nationalities
  const nat = new Map();
  for (const r of parseCSV(texts.nat || '')) {
    const d = (r[0] || '').trim();
    const n = (r[9] || '').trim();
    if (d && n && d !== 'DRIVER' && n !== 'Nationality') nat.set(d, n);
  }

  // Track names <-> codes
  const trackName = { ...TRACK_NAMES };
  const codeByName = new Map();
  for (const r of parseCSV(texts.tracks || '')) {
    const name = (r[0] || '').trim(), code = (r[1] || '').trim().toUpperCase();
    if (name && code && code !== 'COUNTRY') trackName[code] = name;
  }
  for (const [code, name] of Object.entries(trackName)) codeByName.set(name.toLowerCase(), code);

  // Records
  const records = new Map();
  for (const r of parseCSV(texts.records || '').slice(1)) {
    const code = codeByName.get((r[0] || '').trim().toLowerCase());
    if (!code) continue;
    records.set(code, { lap: parseRecord(r[1]), quali: parseRecord(r[2]) });
  }

  // Results
  const results = [];
  for (const r of parseCSV(texts.raw || '').slice(1)) {
    const race = num(r[0]), season = num(r[2]);
    const driver = (r[1] || '').trim();
    if (!race || !season || !driver) continue;
    const pos = num(r[6]);
    const dnf = isX(r[8]);
    const team = (r[4] || '').trim();
    results.push({
      race, driver, season, track: (r[3] || '').trim().toUpperCase(), team, teamKey: teamKey(team),
      car: (r[5] || '').trim(), pos, pts: num(r[7]) || 0, dnf, fl: isX(r[9]), pp: isX(r[10]), grid: num(r[11]),
      win: pos === 1 && !dnf, podium: !!pos && pos <= 3 && !dnf,
    });
  }
  results.sort((a, b) => a.race - b.race || (a.pos || 99) - (b.pos || 99));

  // Races
  const raceMap = new Map();
  for (const r of results) {
    let race = raceMap.get(r.race);
    if (!race) {
      race = { id: r.race, season: r.season, track: r.track, entries: [] };
      raceMap.set(r.race, race);
    }
    race.entries.push(r);
  }
  const raceList = [...raceMap.values()].sort((a, b) => a.id - b.id);
  for (const race of raceList) {
    // Sprint points (8-7-…-1) are added to the Grand Prix row in the sheet, so a sprint weekend shows up as
    // several drivers scoring more than the standard GP points for their position (+1 for the fastest lap).
    const extra = race.entries.filter((e) => e.pts - (e.dnf ? 0 : GP_POINTS[e.pos] || 0) - (e.fl ? 1 : 0) > 0);
    race.sprint = extra.length >= 3;
    race.winner = race.entries.find((e) => e.win) || race.entries[0];
    race.pole = race.entries.find((e) => e.pp) || race.entries.find((e) => e.grid === 1);
    race.fastest = race.entries.find((e) => e.fl);
  }

  // Seasons
  const seasonNums = [...new Set(raceList.map((r) => r.season))].sort((a, b) => a - b);
  const currentSeason = seasonNums.at(-1);
  const seasons = new Map();
  for (const n of seasonNums) {
    const races = raceList.filter((r) => r.season === n);
    races.forEach((r, i) => { r.round = i + 1; });
    const dMap = new Map(), cMap = new Map();
    for (const race of races) {
      for (const e of race.entries) {
        let d = dMap.get(e.driver);
        if (!d) { d = blankStats({ name: e.driver, results: new Map(), teams: new Map() }); dMap.set(e.driver, d); }
        addResult(d, e);
        d.results.set(race.id, e);
        d.teams.set(e.teamKey, (d.teams.get(e.teamKey) || 0) + 1);
        d.lastTeam = e.team; d.lastTeamKey = e.teamKey;
        if (e.teamKey === RESERVE) continue;
        let c = cMap.get(e.teamKey);
        if (!c) { c = blankStats({ key: e.teamKey, name: e.team, drivers: new Set(), driverStats: new Map(), results: new Map() }); cMap.set(e.teamKey, c); }
        addResult(c, e);
        c.name = e.team;
        c.drivers.add(e.driver);
        const ds = c.driverStats.get(e.driver) || { name: e.driver, races: 0, points: 0 };
        ds.races++; ds.points += e.pts;
        c.driverStats.set(e.driver, ds);
        const rr = c.results.get(race.id) || 0;
        c.results.set(race.id, rr + e.pts);
      }
    }
    const drivers = [...dMap.values()].sort(byPointsCountback);
    drivers.forEach((d, i) => { d.pos = i + 1; d.avgGrid = avgGrid(d); });
    const constructors = [...cMap.values()].sort(byPointsCountback);
    constructors.forEach((c, i) => {
      c.pos = i + 1;
      // Line-up: everyone who raced for the team that season, most races first, then most points.
      c.lineup = [...c.driverStats.values()].sort((a, b) => b.races - a.races || b.points - a.points);
    });
    // Standings before the season's last round, so tables can show who moved up or down in that round.
    // Only for the season still in progress; finished seasons show their final order without arrows.
    if (races.length > 1 && n === currentSeason) {
      const pd = new Map(), pc = new Map();
      for (const race of races.slice(0, -1)) {
        for (const e of race.entries) {
          const d = pd.get(e.driver) || blankStats({ name: e.driver });
          addResult(d, e); pd.set(e.driver, d);
          if (e.teamKey === RESERVE) continue;
          const c = pc.get(e.teamKey) || blankStats({ key: e.teamKey });
          addResult(c, e); pc.set(e.teamKey, c);
        }
      }
      const dPos = new Map([...pd.values()].sort(byPointsCountback).map((d, i) => [d.name, i + 1]));
      const cPos = new Map([...pc.values()].sort(byPointsCountback).map((c, i) => [c.key, i + 1]));
      for (const d of drivers) d.prevPos = dPos.get(d.name) ?? null;
      for (const c of constructors) c.prevPos = cPos.get(c.key) ?? null;
    }
    // A season counts as finished only once a newer season has started.
    const finished = n !== currentSeason;
    seasons.set(n, {
      n, races, drivers, constructors, finished,
      champion: finished ? drivers[0] : null,
      constructorChampion: finished ? constructors[0] : null,
    });
  }

  // Drivers (all time)
  const driverMap = new Map();
  for (const r of results) {
    let d = driverMap.get(r.driver);
    if (!d) {
      const country = nat.get(r.driver) || '';
      d = blankStats({
        name: r.driver, country, flag: countryCode(country), entries: [], seasons: new Map(), teams: new Map(),
        tracks: new Map(), titles: [], hatTricks: 0, positions: {},
      });
      driverMap.set(r.driver, d);
    }
    addResult(d, r);
    d.entries.push(r);
    if (r.pp && r.win && r.fl) d.hatTricks++;
    if (r.pos) d.positions[r.dnf ? 'DNF' : r.pos] = (d.positions[r.dnf ? 'DNF' : r.pos] || 0) + 1;
    const tk = d.teams.get(r.teamKey) || blankStats({ key: r.teamKey, name: r.team });
    addResult(tk, r); tk.name = r.team; d.teams.set(r.teamKey, tk);
    const tr = d.tracks.get(r.track) || blankStats({ code: r.track });
    addResult(tr, r); d.tracks.set(r.track, tr);
  }
  for (const s of seasons.values()) {
    for (const sd of s.drivers) {
      const d = driverMap.get(sd.name);
      d.seasons.set(s.n, { points: sd.points, pos: sd.pos, races: sd.races, wins: sd.wins, podiums: sd.podiums, finished: s.finished, team: sd.lastTeam, teamKey: sd.lastTeamKey });
    }
    if (s.champion) driverMap.get(s.champion.name).titles.push(s.n);
  }
  const drivers = [...driverMap.values()];
  for (const d of drivers) {
    d.avgGrid = avgGrid(d);
    d.pointsStreak = longestStreak(d.entries, (e) => e.pts > 0);
    d.podiumStreak = longestStreak(d.entries, (e) => e.podium);
    d.winStreak = longestStreak(d.entries, (e) => e.win);
    const finishedPos = d.entries.filter((e) => !e.dnf && e.pos).map((e) => e.pos);
    d.best = finishedPos.length ? Math.min(...finishedPos) : null;
    d.bestCount = finishedPos.filter((p) => p === d.best).length;
    d.ppr = d.races ? d.points / d.races : 0;
    d.firstSeason = d.entries[0].season;
    d.lastSeason = d.entries.at(-1).season;
    d.lastTeam = d.entries.at(-1).team;
    d.lastTeamKey = d.entries.at(-1).teamKey;
  }
  // G.O.A.T. ranking: all-time points, as in the sheet.
  drivers.sort(byPointsCountback);
  drivers.forEach((d, i) => { d.goat = i + 1; });

  // Teams (lineages, all time)
  const teamMap = new Map();
  for (const r of results) {
    if (r.teamKey === RESERVE) continue;
    let t = teamMap.get(r.teamKey);
    if (!t) {
      t = blankStats({ key: r.teamKey, info: teamInfo(r.teamKey, r.team), names: new Map(), drivers: new Map(), tracks: new Map(), winsList: [], titles: [], driverTitles: [] });
      teamMap.set(r.teamKey, t);
    }
    addResult(t, r);
    t.names.set(r.team, Math.max(t.names.get(r.team) || 0, r.season));
    const dd = t.drivers.get(r.driver) || blankStats({ name: r.driver });
    addResult(dd, r); t.drivers.set(r.driver, dd);
    const tr = t.tracks.get(r.track) || blankStats({ code: r.track });
    addResult(tr, r); t.tracks.set(r.track, tr);
    if (r.win) t.winsList.push(r);
  }
  for (const s of seasons.values()) {
    if (s.constructorChampion) teamMap.get(s.constructorChampion.key)?.titles.push(s.n);
    if (s.champion) {
      const k = s.champion.lastTeamKey;
      teamMap.get(k)?.driverTitles.push({ season: s.n, driver: s.champion.name });
    }
  }
  const teams = [...teamMap.values()].sort(byPointsCountback);
  teams.forEach((t, i) => { t.pos = i + 1; t.name = t.info.name; t.raceCount = new Set(); });
  for (const r of results) teamMap.get(r.teamKey)?.raceCount.add(r.race);
  for (const t of teams) t.raceCount = t.raceCount.size;

  // Tracks
  const trackMap = new Map();
  for (const race of raceList) {
    let t = trackMap.get(race.track);
    if (!t) {
      t = { code: race.track, name: trackName[race.track] || race.track, races: [], drivers: new Map(), teams: new Map(), record: records.get(race.track) || null };
      trackMap.set(race.track, t);
    }
    t.races.push(race);
    for (const e of race.entries) {
      const d = t.drivers.get(e.driver) || blankStats({ name: e.driver });
      addResult(d, e); t.drivers.set(e.driver, d);
      if (e.teamKey !== RESERVE) {
        const tm = t.teams.get(e.teamKey) || blankStats({ key: e.teamKey });
        addResult(tm, e); t.teams.set(e.teamKey, tm);
      }
    }
  }
  const tracks = [...trackMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  for (const t of tracks) {
    t.lastRace = t.races.at(-1);
    t.driverList = [...t.drivers.values()].sort(byPointsCountback);
    t.teamList = [...t.teams.values()].sort(byPointsCountback);
  }

  // Wins by starting position
  const winsFromGrid = {};
  for (const race of raceList) {
    const g = race.winner?.grid;
    if (race.winner?.win && g) winsFromGrid[g] = (winsFromGrid[g] || 0) + 1;
  }

  return {
    results, raceList, races: raceMap, seasons, seasonNums, currentSeason,
    drivers, driverMap, teams, teamMap, tracks, trackMap, trackName, records, winsFromGrid,
    winnersCount: new Set(raceList.filter((r) => r.winner?.win).map((r) => r.winner.driver)).size,
  };
}

/** Results against every team-mate (same team in the same race, reserves excluded). */
export function teammateBattles(model, name) {
  const map = new Map();
  for (const e of model.driverMap.get(name).entries) {
    if (e.teamKey === RESERVE) continue;
    const race = model.races.get(e.race);
    for (const o of race.entries) {
      if (o.driver === name || o.team !== e.team) continue;
      const m = map.get(o.driver) || { name: o.driver, races: 0, qualiW: 0, qualiL: 0, raceW: 0, raceL: 0 };
      m.races++;
      if (e.grid && o.grid) { if (e.grid < o.grid) m.qualiW++; else if (o.grid < e.grid) m.qualiL++; }
      if (e.pos && o.pos) { if (e.pos < o.pos) m.raceW++; else if (o.pos < e.pos) m.raceL++; }
      map.set(o.driver, m);
    }
  }
  return [...map.values()].sort((x, y) => y.races - x.races);
}
