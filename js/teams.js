// Team lineages: historical names are merged with their successors, as in the sheet's TEAMS DATA.
export const TEAMS = {
  redbull:     { name: 'Red Bull',     full: 'Oracle Red Bull Racing',            logo: 'redbullracing', color: '#3671C6' },
  ferrari:     { name: 'Ferrari',      full: 'Scuderia Ferrari HP',               logo: 'ferrari',       color: '#E8002D' },
  mercedes:    { name: 'Mercedes',     full: 'Mercedes-AMG PETRONAS F1 Team',     logo: 'mercedes',      color: '#27F4D2' },
  mclaren:     { name: 'McLaren',      full: 'McLaren Mastercard F1 Team',        logo: 'mclaren',       color: '#FF8000' },
  astonmartin: { name: 'Aston Martin', full: 'Aston Martin Aramco F1 Team',       logo: 'astonmartin',   color: '#229971' },
  alpine:      { name: 'Alpine',       full: 'BWT Alpine F1 Team',                logo: 'alpine',        color: '#FF87BC' },
  williams:    { name: 'Williams',     full: 'Atlassian Williams F1 Team',        logo: 'williams',      color: '#64C4FF' },
  haas:        { name: 'Haas',         full: 'TGR Haas F1 Team',                  logo: 'haasf1team',    color: '#B6BABD' },
  vcarb:       { name: 'VCARB',        full: 'Visa Cash App Racing Bulls F1 Team', logo: 'racingbulls',  color: '#6692FF' },
  audi:        { name: 'Audi',         full: 'Audi Revolut F1 Team',              logo: 'audi',          color: '#F50537' },
  cadillac:    { name: 'Cadillac',     full: 'Cadillac Formula 1 Team',           logo: 'cadillac',      color: '#C9A227' },
};

const ALIASES = {
  'red bull': 'redbull', 'red bull racing': 'redbull',
  'ferrari': 'ferrari',
  'mercedes': 'mercedes',
  'mclaren': 'mclaren',
  'aston martin': 'astonmartin', 'racing point': 'astonmartin', 'force india': 'astonmartin',
  'alpine': 'alpine', 'renault': 'alpine',
  'williams': 'williams',
  'haas': 'haas',
  'vcarb': 'vcarb', 'alphatauri': 'vcarb', 'alpha tauri': 'vcarb', 'racing bulls': 'vcarb', 'rb': 'vcarb', 'toro rosso': 'vcarb',
  'audi': 'audi', 'alfa romeo': 'audi', 'kick sauber': 'audi', 'sauber': 'audi',
  'cadillac': 'cadillac',
};

export const RESERVE = 'reserve';

/** Lineage key for a team name from the sheet; unknown teams get their own key. */
export function teamKey(name) {
  const n = (name || '').trim().toLowerCase();
  if (!n) return '';
  if (n === 'reserve' || n === 'rezerwa') return RESERVE;
  return ALIASES[n] || 'x-' + n.replace(/[^a-z0-9]+/g, '-');
}

export function teamInfo(key, fallbackName) {
  return TEAMS[key] || { name: fallbackName || key, full: fallbackName || key, logo: '', color: '#8a867d' };
}

// Logos and colours of earlier team names, shown wherever the sheet uses that historical name (e.g. "Alfa Romeo"
// in season 2 instead of today's Audi). `invert` turns a dark logo white for the dark theme; `round` clips a
// photographed badge to a circle. Colours are each team's livery colour from that era.
const HISTORIC = {
  'alfa romeo':   { src: 'hist/alfaromeo.jpg',  round: true,  color: '#C92D4B' },
  'alphatauri':   { src: 'hist/alphatauri.svg', invert: true, color: '#5E8FAA' },
  'alpha tauri':  { src: 'hist/alphatauri.svg', invert: true, color: '#5E8FAA' },
  'racing point': { src: 'hist/racingpoint.svg',              color: '#F596C8' },
  'renault':      { src: 'hist/renault.png',    invert: true, color: '#FFF500' },
  'kick sauber':  { src: 'hist/kicksauber.png',               color: '#52E252' },
};
const historic = (name) => HISTORIC[(name || '').trim().toLowerCase()];

/** Logo to show for a team: the historical one if the given (era) name has one, else the lineage's current logo. */
export function logoFor(key, name) {
  const hist = historic(name);
  if (hist) return hist;
  const info = teamInfo(key);
  return info.logo ? { src: `${info.logo}.png` } : null;
}

/** Stripe colour for a team: the era's livery colour for a historical name, else the lineage colour. */
export function colorFor(key, name) {
  return historic(name)?.color || teamInfo(key, name).color;
}
