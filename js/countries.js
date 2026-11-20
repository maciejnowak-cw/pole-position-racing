// Country name (as typed in the sheet, English or Polish) -> flag-icons code.
const NAMES = {
  'poland': 'pl', 'polska': 'pl',
  'belgium': 'be', 'belgia': 'be',
  'united kingdom': 'gb', 'uk': 'gb', 'great britain': 'gb', 'wielka brytania': 'gb',
  'england': 'gb-eng', 'anglia': 'gb-eng',
  'scotland': 'gb-sct', 'szkocja': 'gb-sct',
  'wales': 'gb-wls', 'walia': 'gb-wls',
  'northern ireland': 'gb-nir',
  'germany': 'de', 'niemcy': 'de',
  'spain': 'es', 'hiszpania': 'es',
  'portugal': 'pt', 'portugalia': 'pt',
  'hungary': 'hu', 'węgry': 'hu', 'wegry': 'hu',
  'greece': 'gr', 'grecja': 'gr',
  'denmark': 'dk', 'dania': 'dk',
  'netherlands': 'nl', 'holland': 'nl', 'holandia': 'nl', 'niderlandy': 'nl',
  'finland': 'fi', 'finlandia': 'fi',
  'romania': 'ro', 'rumunia': 'ro',
  'india': 'in', 'indie': 'in',
  'croatia': 'hr', 'chorwacja': 'hr',
  'usa': 'us', 'united states': 'us', 'united states of america': 'us', 'stany zjednoczone': 'us',
  'slovenia': 'si', 'słowenia': 'si',
  'cyprus': 'cy', 'cypr': 'cy',
  'sweden': 'se', 'szwecja': 'se',
  'brazil': 'br', 'brazylia': 'br',
  'lebanon': 'lb', 'liban': 'lb',
  'hong kong': 'hk', 'hongkong': 'hk',
  'lithuania': 'lt', 'litwa': 'lt',
  'ukraine': 'ua', 'ukraina': 'ua',
  'france': 'fr', 'francja': 'fr',
  'italy': 'it', 'włochy': 'it', 'wlochy': 'it',
  'austria': 'at',
  'switzerland': 'ch', 'szwajcaria': 'ch',
  'czech republic': 'cz', 'czechia': 'cz', 'czechy': 'cz',
  'slovakia': 'sk', 'słowacja': 'sk',
  'norway': 'no', 'norwegia': 'no',
  'ireland': 'ie', 'irlandia': 'ie',
  'latvia': 'lv', 'łotwa': 'lv',
  'estonia': 'ee',
  'belarus': 'by', 'białoruś': 'by',
  'russia': 'ru', 'rosja': 'ru',
  'serbia': 'rs',
  'bosnia and herzegovina': 'ba', 'bośnia i hercegowina': 'ba',
  'montenegro': 'me', 'czarnogóra': 'me',
  'bulgaria': 'bg', 'bułgaria': 'bg',
  'albania': 'al', 'andorra': 'ad',
  'turkey': 'tr', 'türkiye': 'tr', 'turcja': 'tr',
  'canada': 'ca', 'kanada': 'ca',
  'mexico': 'mx', 'meksyk': 'mx',
  'argentina': 'ar', 'argentyna': 'ar',
  'australia': 'au', 'new zealand': 'nz', 'nowa zelandia': 'nz',
  'japan': 'jp', 'japonia': 'jp', 'china': 'cn', 'chiny': 'cn',
  'south africa': 'za', 'rpa': 'za',
  'luxembourg': 'lu', 'luksemburg': 'lu', 'monaco': 'mc',
  'iceland': 'is', 'islandia': 'is', 'malta': 'mt',
};

export function countryCode(name) {
  if (!name) return '';
  return NAMES[name.trim().toLowerCase()] || '';
}

// Track code from the sheet -> flag-icons code.
export const TRACK_COUNTRY = {
  ABU: 'ae', AUS: 'au', AUT: 'at', AZE: 'az', BAH: 'bh', BEL: 'be', BRA: 'br', CAN: 'ca',
  CHI: 'cn', FRA: 'fr', GBR: 'gb', HUN: 'hu', ITA: 'it', IMO: 'it', JAP: 'jp', MEX: 'mx',
  MON: 'mc', NET: 'nl', POR: 'pt', RUS: 'ru', SAU: 'sa', SIN: 'sg', SPA: 'es', USA: 'us',
  MIA: 'us', LAS: 'us', QAT: 'qa', MAD: 'es', TUR: 'tr', CHN: 'cn', JPN: 'jp', NED: 'nl',
};

// Fallback full names for track codes (the sheet's TRACK DATA list wins when present).
export const TRACK_NAMES = {
  ABU: 'Yas Marina Circuit', AUS: 'Albert Park Circuit', AUT: 'Red Bull Ring', AZE: 'Baku City Circuit',
  BAH: 'Bahrain International Circuit', BEL: 'Circuit de Spa-Francorchamps', BRA: 'Autódromo José Carlos Pace',
  CAN: 'Circuit Gilles-Villeneuve', CHI: 'Shanghai International Circuit', FRA: 'Circuit Paul Ricard',
  GBR: 'Silverstone Circuit', HUN: 'Hungaroring', ITA: 'Autodromo Nazionale Monza', IMO: 'Autodromo Enzo e Dino Ferrari',
  JAP: 'Suzuka International Racing Course', MEX: 'Autódromo Hermanos Rodríguez', MON: 'Circuit de Monaco',
  NET: 'Circuit Zandvoort', POR: 'Autódromo Internacional do Algarve', RUS: 'Sochi Autodrom',
  SAU: 'Jeddah Corniche Circuit', SIN: 'Marina Bay Street Circuit', SPA: 'Circuit de Barcelona-Catalunya',
  USA: 'Circuit of The Americas', MIA: 'Miami International Autodrome', LAS: 'Las Vegas Strip Circuit',
  QAT: 'Losail International Circuit', MAD: 'Madring',
};

// Short, well-known track names shown everywhere on the site; also search words, so "Spa" or "COTA" finds the track.
export const SHORT_TRACK_NAME = {
  ABU: 'Yas Marina', AUS: 'Albert Park', AUT: 'Red Bull Ring', AZE: 'Baku', BAH: 'Bahrain', BEL: 'Spa', BRA: 'Interlagos',
  CAN: 'Montreal', CHI: 'Shanghai', FRA: 'Paul Ricard', GBR: 'Silverstone', HUN: 'Hungaroring', ITA: 'Monza', IMO: 'Imola',
  JAP: 'Suzuka', MEX: 'Mexico City', MON: 'Monaco', NET: 'Zandvoort', POR: 'Portimão', RUS: 'Sochi', SAU: 'Jeddah',
  SIN: 'Marina Bay', SPA: 'Barcelona', USA: 'COTA', MIA: 'Miami', LAS: 'Las Vegas', QAT: 'Lusail', MAD: 'Madring',
};
