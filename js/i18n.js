const LANG_KEY = 'ppr-lang';

const DICT = {
  pl: {
    'nav.home': 'Start', 'nav.standings': 'Klasyfikacja', 'nav.goat': 'Kierowcy',
    'nav.stats': 'Statystyki', 'nav.teams': 'Zespoły',
    'nav.tracks': 'Tory', 'nav.hof': 'Hall of Fame', 'nav.rules': 'Regulamin',
    'nav.discord': 'Discord', 'nav.menu': 'Menu', 'search.open': 'Szukaj', 'search.label': 'Szukaj kierowcy, zespołu, toru, sezonu lub wyścigu', 'search.placeholder': 'Kierowca, zespół, tor lub sezon…', 'search.empty': 'Nic nie znaleziono. Sprawdź pisownię albo wpisz krótszy fragment nazwy.', 'search.driver': 'Kierowca', 'search.team': 'Zespół', 'search.track': 'Tor', 'search.season': 'Sezon', 'search.race': 'Wyścig', 'search.seasonName': 'Sezon {n}', 'search.hint': 'Wyścig znajdziesz po torze i sezonie, np. „Monza S14”. Strzałki wybierają, Enter otwiera, Esc zamyka', 'nav.primary': 'Główna nawigacja', 'nav.lang': 'Język',
    'nav.skip': 'Przejdź do treści',
    'common.season': 'Sezon', 'common.seasons': 'Sezony', 'common.round': 'Runda', 'common.race': 'Wyścig', 'common.races': 'Wyścigi',
    'common.pos': 'Poz.', 'common.driver': 'Kierowca', 'common.drivers': 'Kierowcy', 'common.team': 'Zespół', 'common.teams': 'Zespoły',
    'common.points': 'Punkty', 'common.pts': 'pkt', 'common.wins': 'Wygrane', 'common.podiums': 'Podia', 'common.poles': 'Pole position',
    'common.polesShort': 'PP', 'common.fl': 'Najszybsze okr.', 'common.flShort': 'FL', 'common.dnfs': 'DNF', 'common.avgQuali': 'Śr. kwal.',
    'common.track': 'Tor', 'common.tracks': 'Tory', 'common.grid': 'Start', 'common.result': 'Wynik', 'common.winner': 'Zwycięzca',
    'common.pole': 'Pole position', 'common.fastestLap': 'Najszybsze okrążenie', 'common.titles': 'Tytuły', 'common.nat': 'Kraj',
    'common.all': 'Wszystkie', 'common.seeAll': 'Zobacz wszystko', 'common.total': 'Razem', 'common.ppr': 'Pkt / wyścig',
    'common.winPct': '% wygranych', 'common.podiumPct': '% podiów', 'common.leader': 'Lider', 'common.constructorLeader': 'Lider konstruktorów', 'common.champion': 'Mistrz',
    'common.constructors': 'Konstruktorzy', 'common.constructorChampion': 'Mistrz konstruktorów', 'common.inProgress': 'W trakcie',
    'common.finished': 'Zakończony', 'common.ongoing': 'Trwający', 'common.none': '—', 'common.noResults': 'Brak wyników', 'common.starts': 'Starty', 'common.gained': '+/−', 'common.sinceLastRound': 'Zmiana od poprzedniej rundy',
    'common.lapRecord': 'Rekord okrążenia', 'common.qualiRecord': 'Najszybsze pole position', 'common.lastWinner': 'Ostatni zwycięzca',
    'common.mostWins': 'Najwięcej wygranych', 'common.mostPoints': 'Najwięcej punktów', 'common.mostPoles': 'Najwięcej pole position',
    'common.mostRaces': 'Najwięcej startów', 'common.reserve': 'Rezerwa', 'common.seasonsShort': 'Sez.',
    'common.bestResult': 'Najlepszy wynik', 'common.back': 'Wróć', 'common.toTop': 'Do góry', 'common.bestTrack': 'Najlepszy tor', 'common.worstTrack': 'Najsłabszy tor', 'common.trackFormHint': 'Średnie miejsce na mecie, ukończone wyścigi: {n}', 'common.allTime': 'Pozycja wszech czasów',
    'common.racesCount': '{n} wyścigów', 'common.length': 'Długość',
    'common.firstRace': 'Pierwszy wyścig', 'common.hatTricks': 'Hat-tricki', 'common.hatTrickHint': 'pole + wygrana + najszybsze okrążenie',
    'common.dnf': 'DNF', 'common.dns': 'DNS', 'common.seasonPoints': 'Punkty w sezonach', 'common.finishes': 'Rozkład wyników',
    'common.streakPoints': 'Seria z punktami', 'common.streakPodiums': 'Seria podiów', 'common.streakWins': 'Seria wygranych',
    'common.mapAlt': 'Nitka toru {name}', 'common.history': 'Historia startów', 'common.byTeam': 'Starty w zespołach',
    'common.byTrack': 'Wyniki na torach', 'common.teammates': 'Pojedynki z partnerami z zespołu', 'common.quali': 'Kwalifikacje',
    'common.racesTogether': 'Wspólne wyścigi', 'common.backToTop': 'Na górę', 'common.raceNo': 'Wyścig nr {n}',
    'common.timeline': 'Wyniki wyścig po wyścigu', 'common.view': 'Widok', 'common.results': 'Wyniki', 'common.records': 'Rekordy toru',
    'common.recordBy': '{driver}, sezon {season}', 'common.hostedIn': 'Sezony',
    'common.driversCount': 'Kierowców', 'common.winnersCount': 'Różnych zwycięzców',
    'common.driverTitles': 'Tytuły kierowców', 'common.winsList': 'Zwycięstwa', 'common.legend': 'Legenda',
    'common.sprint': 'Sprint', 'common.sprintHint': 'Runda z wyścigiem sprinterskim', 'common.lineup': 'Skład', 'common.qualiRecordShort': 'Najszybsze pole',
    'race.sprintNote': 'W tej rundzie odbył się również wyścig sprinterski. Punkty w klasyfikacji zawierają punkty zdobyte w sprincie.',

    'home.season': 'Sezon {n}', 'home.lastRace': 'Ostatni wyścig', 'ms.title': 'Kamienie milowe', 'ms.debut': 'Debiut', 'ms.firstPoints': 'Pierwsze punkty', 'ms.firstPodium': 'Pierwsze podium', 'ms.firstPole': 'Pierwsze pole position', 'ms.firstWin': 'Pierwsza wygrana', 'ms.firstHatTrick': 'Pierwszy hat-trick', 'ms.firstTitle': 'Pierwsze mistrzostwo', 'ms.firstTeamTitle': 'Pierwsze mistrzostwo konstruktorów', 'ms.firstDriverTitle': 'Pierwsze mistrzostwo kierowców', 'ms.firstOneTwo': 'Pierwszy dublet', 'ms.teamStarts': '{n}. wyścig', 'ms.starts': '{n}. start', 'table.allCols': 'Wszystkie kolumny (+{n})', 'table.fewerCols': 'Mniej kolumn', 'filter.label': 'Szukaj w tabeli', 'filter.placeholder': 'Szukaj w tabeli…', 'filter.count': 'Pokazano {n} z {total}', 'filter.none': 'Brak wierszy pasujących do „{q}”.', 'fact.label': 'Ciekawostka', 'fact.gridWin': 'Zwycięstwo z P{grid}', 'fact.climb': 'Awans z P{grid} na P{pos} w jednym wyścigu', 'fact.trackKing': 'Najwięcej zwycięstw na torze {track}: {n}', 'fact.closest': 'Tytuł w sezonie {season} rozstrzygnięty różnicą {gap} pkt', 'fact.winStreak': 'Najdłuższa seria zwycięstw z rzędu: {n}', 'fact.hatTricks': 'Hat-tricki (pole, zwycięstwo i najszybsze okrążenie): {n}', 'fact.teamTitles': 'Tytuły konstruktorów: {n}', 'fact.trackWinners': 'Różnych zwycięzców na torze {track}: {n}', 'fact.pointsStreak': 'Wyścigi z punktami z rzędu: {n}', 'fact.mostRaces': 'Najwięcej startów w historii ligi: {n}', 'fact.firstWinWait': 'Najdłuższe czekanie na pierwszą wygraną (starty): {n}', 'fact.winGap': 'Najdłuższa przerwa między zwycięstwami (wyścigi ligi): {n}', 'fact.manyTeams': 'Wygrane w barwach różnych zespołów: {n}', 'fact.mostSeasons': 'Najwięcej sezonów w lidze: {n}', 'fact.poleStreak': 'Pole position z rzędu: {n}', 'fact.dnfSeason': 'Najwięcej DNF w jednym sezonie: {n}', 'fact.openSeason': 'Różnych zwycięzców w sezonie {season}: {n}', 'fact.oneTwos': 'Dublety zespołu (1. i 2. miejsce): {n}', 'fact.poleWins': 'Na torze {track} pole position daje wygraną w {pct} wyścigów', 'fact.poleLoses': 'Na torze {track} pole position daje wygraną tylko w {pct} wyścigów', 'fact.poleNever': 'Na torze {track} zdobywca pole position jeszcze nigdy nie wygrał', 'fact.ahead': 'przed',
    'home.driverStandings': 'Klasyfikacja kierowców', 'home.constructorStandings': 'Klasyfikacja konstruktorów',
    'home.goatTop': 'Najlepsi wszech czasów', 'home.lastChampions': 'Ostatni mistrzowie', 'home.statSeasons': 'Sezonów',
    'home.statRaces': 'Wyścigów', 'home.statDrivers': 'Kierowców', 'home.statWinners': 'Zwycięzców', 'home.fullStandings': 'Pełna tabela',
    'home.fullRanking': 'Pełny ranking', 'home.raceDetails': 'Szczegóły wyścigu',

    'standings.title': 'Klasyfikacja',
    'season.title': 'Sezon {n}', 'season.drivers': 'Kierowcy', 'season.constructors': 'Konstruktorzy', 'season.matrix': 'Wyniki',
    'season.races': 'Kalendarz',
   
    'goat.title': 'GOAT Ranking', 'goat.lead': 'Ranking wszech czasów według sumy zdobytych punktów.',
    'stats.title': 'Statystyki', 'stats.lead': 'Rekordy i rankingi z całej historii ligi.', 'stats.minRaces': 'min. {n} wyścigów',
    'stats.winsFromGrid': 'Wygrane według pola startowego', 'stats.bestSeasons': 'Najlepsze sezony (pkt / wyścig)',
    'stats.lowestGridWins': 'Wygrane z najdalszych pól', 'stats.biggestGains': 'Największe awanse w wyścigu', 'stats.seasonRecords': 'Rekordy sezonów', 'stats.recWins': 'Najwięcej wygranych w sezonie', 'stats.recPodiums': 'Najwięcej podiów w sezonie', 'stats.recPoles': 'Najwięcej pole position w sezonie', 'stats.recPoints': 'Najwięcej punktów w sezonie', 'stats.recMargin': 'Największa przewaga mistrza', 'stats.recClosest': 'Najbardziej wyrównany sezon', 'stats.over': 'nad', 'common.from': 'Start', 'common.to': 'Meta', 'stats.gridN': 'Pole {n}', 'stats.winsFromGridAria': 'Wykres liczby wygranych z każdego pola startowego',
    'driver.notFound': 'Nie znaleziono kierowcy.', 'driver.seasonsActive': 'Sezony',
    'driver.seasonTable': 'Sezony', 'driver.posInSeason': 'Miejsce',
   
   
   
   
   
    'teams.title': 'Zespoły', 'teams.lead': 'Historyczne nazwy zespołów są połączone z ich następcami.',
    'team.notFound': 'Nie znaleziono zespołu.', 'team.drivers': 'Kierowcy zespołu', 'team.tracks': 'Punkty na torach',
    'tracks.title': 'Tory', 'tracks.lead': '{n} torów w historii ligi.',
    'track.notFound': 'Nie znaleziono toru.', 'track.firstRace': 'Debiut', 'track.winners': 'Różnych zwycięzców', 'track.bySeason': 'Wyniki w sezonach', 'track.driverTable': 'Kierowcy na tym torze',
    'track.teamTable': 'Zespoły na tym torze', 'track.noRecord': 'Brak danych',
    'race.title': '{track}', 'race.notFound': 'Nie znaleziono wyścigu.', 'race.classification': 'Klasyfikacja', 'race.biggestGain': 'Kierowca dnia',
    'hof.title': 'Hall of Fame',
    'hof.seasons': 'Mistrzowie sezonów', 'hof.mostDriverTitles': 'Najwięcej tytułów kierowców', 'hof.mostTeamTitles': 'Najwięcej tytułów konstruktorów',
    'state.loading': 'Wczytywanie danych ligi…', 'state.error': 'Nie udało się pobrać danych z arkusza. Sprawdź połączenie z internetem. Strona sama spróbuje ponownie za 30 sekund.', 'state.retry': 'Spróbuj ponownie', 'state.retrying': 'Łączenie…', 'state.staleBanner': 'Nie udało się odświeżyć danych. Pokazujemy dane zapisane {time}.',
    'state.notFound': 'Nie znaleziono strony.', 'state.didYouMean': 'Może chodziło o:', 'nf.kicker': 'Błąd 404', 'nf.title': 'Poza torem',
   
    'footer.quick': 'Na skróty', 'footer.follow': 'Obserwuj ligę',
  },
  en: {
    'nav.home': 'Home', 'nav.standings': 'Standings', 'nav.goat': 'Drivers',
    'nav.stats': 'Stats', 'nav.teams': 'Teams',
    'nav.tracks': 'Tracks', 'nav.hof': 'Hall of Fame', 'nav.rules': 'Rules',
    'nav.discord': 'Discord', 'nav.menu': 'Menu', 'search.open': 'Search', 'search.label': 'Search for a driver, team, track, season or race', 'search.placeholder': 'Driver, team, track or season…', 'search.empty': 'No matches. Check the spelling or type a shorter part of the name.', 'search.driver': 'Driver', 'search.team': 'Team', 'search.track': 'Track', 'search.season': 'Season', 'search.race': 'Race', 'search.seasonName': 'Season {n}', 'search.hint': 'Find a race by track and season, e.g. “Monza S14”. Arrows to pick, Enter to open, Esc to close', 'nav.primary': 'Main navigation', 'nav.lang': 'Language',
    'nav.skip': 'Skip to content',
    'common.season': 'Season', 'common.seasons': 'Seasons', 'common.round': 'Round', 'common.race': 'Race', 'common.races': 'Races',
    'common.pos': 'Pos.', 'common.driver': 'Driver', 'common.drivers': 'Drivers', 'common.team': 'Team', 'common.teams': 'Teams',
    'common.points': 'Points', 'common.pts': 'pts', 'common.wins': 'Wins', 'common.podiums': 'Podiums', 'common.poles': 'Pole positions',
    'common.polesShort': 'PP', 'common.fl': 'Fastest laps', 'common.flShort': 'FL', 'common.dnfs': 'DNF', 'common.avgQuali': 'Avg. quali',
    'common.track': 'Track', 'common.tracks': 'Tracks', 'common.grid': 'Grid', 'common.result': 'Result', 'common.winner': 'Winner',
    'common.pole': 'Pole position', 'common.fastestLap': 'Fastest lap', 'common.titles': 'Titles', 'common.nat': 'Country',
    'common.all': 'All', 'common.seeAll': 'See all', 'common.total': 'Total', 'common.ppr': 'Pts / race',
    'common.winPct': 'Win %', 'common.podiumPct': 'Podium %', 'common.leader': 'Leader', 'common.constructorLeader': 'Constructors’ leader', 'common.champion': 'Champion',
    'common.constructors': 'Constructors', 'common.constructorChampion': 'Constructors’ champion', 'common.inProgress': 'In progress',
    'common.finished': 'Finished', 'common.ongoing': 'Ongoing', 'common.none': '—', 'common.noResults': 'No results', 'common.starts': 'Starts', 'common.gained': '+/−', 'common.sinceLastRound': 'Change since the previous round',
    'common.lapRecord': 'Lap record', 'common.qualiRecord': 'Fastest pole position', 'common.lastWinner': 'Last winner',
    'common.mostWins': 'Most wins', 'common.mostPoints': 'Most points', 'common.mostPoles': 'Most pole positions',
    'common.mostRaces': 'Most starts', 'common.reserve': 'Reserve', 'common.seasonsShort': 'Seas.',
    'common.bestResult': 'Best result', 'common.back': 'Back', 'common.toTop': 'Back to top', 'common.bestTrack': 'Best track', 'common.worstTrack': 'Weakest track', 'common.trackFormHint': 'Average finishing position, finished races: {n}', 'common.allTime': 'All-time position',
    'common.racesCount': '{n} races', 'common.length': 'Length',
    'common.firstRace': 'First race', 'common.hatTricks': 'Hat-tricks', 'common.hatTrickHint': 'pole + win + fastest lap',
    'common.dnf': 'DNF', 'common.dns': 'DNS', 'common.seasonPoints': 'Points by season', 'common.finishes': 'Finishing positions',
    'common.streakPoints': 'Points streak', 'common.streakPodiums': 'Podium streak', 'common.streakWins': 'Win streak',
    'common.mapAlt': '{name} track layout', 'common.history': 'Race history', 'common.byTeam': 'Starts by team',
    'common.byTrack': 'Results by track', 'common.teammates': 'Team-mate battles', 'common.quali': 'Qualifying',
    'common.racesTogether': 'Races together', 'common.backToTop': 'Back to top', 'common.raceNo': 'Race #{n}',
    'common.timeline': 'Race-by-race results', 'common.view': 'View', 'common.results': 'Results', 'common.records': 'Track records',
    'common.recordBy': '{driver}, season {season}', 'common.hostedIn': 'Seasons',
    'common.driversCount': 'Drivers', 'common.winnersCount': 'Different winners',
    'common.driverTitles': 'Drivers’ titles', 'common.winsList': 'Victories', 'common.legend': 'Legend',
    'common.sprint': 'Sprint', 'common.sprintHint': 'Round with a sprint race', 'common.lineup': 'Line-up', 'common.qualiRecordShort': 'Fastest pole',
    'race.sprintNote': 'This round also included a sprint race. Points in the classification include points scored in the sprint.',

    'home.season': 'Season {n}', 'home.lastRace': 'Latest race', 'ms.title': 'Milestones', 'ms.debut': 'Debut', 'ms.firstPoints': 'First points', 'ms.firstPodium': 'First podium', 'ms.firstPole': 'First pole position', 'ms.firstWin': 'First win', 'ms.firstHatTrick': 'First hat-trick', 'ms.firstTitle': 'First championship', 'ms.firstTeamTitle': 'First constructors’ championship', 'ms.firstDriverTitle': 'First drivers’ championship', 'ms.firstOneTwo': 'First one-two', 'ms.teamStarts': 'Race no. {n}', 'ms.starts': 'Start no. {n}', 'table.allCols': 'All columns (+{n})', 'table.fewerCols': 'Fewer columns', 'filter.label': 'Search this table', 'filter.placeholder': 'Search this table…', 'filter.count': 'Showing {n} of {total}', 'filter.none': 'No rows match “{q}”.', 'fact.label': 'Did you know', 'fact.gridWin': 'Win from P{grid}', 'fact.climb': 'From P{grid} to P{pos} in a single race', 'fact.trackKing': 'Most wins at {track}: {n}', 'fact.closest': 'Season {season} title decided by {gap} pts', 'fact.winStreak': 'Longest winning streak: {n}', 'fact.hatTricks': 'Hat-tricks (pole, win and fastest lap): {n}', 'fact.teamTitles': 'Constructors’ titles: {n}', 'fact.trackWinners': 'Different winners at {track}: {n}', 'fact.pointsStreak': 'Points finishes in a row: {n}', 'fact.mostRaces': 'Most starts in league history: {n}', 'fact.firstWinWait': 'Longest wait for a first win (starts): {n}', 'fact.winGap': 'Longest gap between wins (league races): {n}', 'fact.manyTeams': 'Wins with different teams: {n}', 'fact.mostSeasons': 'Most seasons in the league: {n}', 'fact.poleStreak': 'Pole positions in a row: {n}', 'fact.dnfSeason': 'Most DNFs in one season: {n}', 'fact.openSeason': 'Different winners in season {season}: {n}', 'fact.oneTwos': 'Team one-two finishes: {n}', 'fact.poleWins': 'At {track} the pole sitter wins {pct} of races', 'fact.poleLoses': 'At {track} the pole sitter wins only {pct} of races', 'fact.poleNever': 'At {track} the pole sitter has never won', 'fact.ahead': 'ahead of',
    'home.driverStandings': 'Drivers’ standings', 'home.constructorStandings': 'Constructors’ standings',
    'home.goatTop': 'All-time greats', 'home.lastChampions': 'Latest champions', 'home.statSeasons': 'Seasons',
    'home.statRaces': 'Races', 'home.statDrivers': 'Drivers', 'home.statWinners': 'Winners', 'home.fullStandings': 'Full standings',
    'home.fullRanking': 'Full ranking', 'home.raceDetails': 'Race details',

    'standings.title': 'Championship standings',
    'season.title': 'Season {n}', 'season.drivers': 'Drivers', 'season.constructors': 'Constructors', 'season.matrix': 'Results',
    'season.races': 'Calendar',
   
    'goat.title': 'GOAT Ranking', 'goat.lead': 'All-time ranking by total points scored.',
    'stats.title': 'Stats', 'stats.lead': 'Records and leaderboards from the whole league history.', 'stats.minRaces': 'min. {n} races',
    'stats.winsFromGrid': 'Wins by starting position', 'stats.bestSeasons': 'Best seasons (pts / race)',
    'stats.lowestGridWins': 'Wins from furthest back', 'stats.biggestGains': 'Biggest climbs in a race', 'stats.seasonRecords': 'Season records', 'stats.recWins': 'Most wins in a season', 'stats.recPodiums': 'Most podiums in a season', 'stats.recPoles': 'Most poles in a season', 'stats.recPoints': 'Most points in a season', 'stats.recMargin': 'Biggest title margin', 'stats.recClosest': 'Closest title fight', 'stats.over': 'over', 'common.from': 'Start', 'common.to': 'Finish', 'stats.gridN': 'Grid {n}', 'stats.winsFromGridAria': 'Chart of wins from each starting position',
    'driver.notFound': 'Driver not found.', 'driver.seasonsActive': 'Seasons',
    'driver.seasonTable': 'Seasons', 'driver.posInSeason': 'Position',
   
   
   
   
   
    'teams.title': 'Teams', 'teams.lead': 'Historical team names are merged with their successors.',
    'team.notFound': 'Team not found.', 'team.drivers': 'Team drivers', 'team.tracks': 'Points by track',
    'tracks.title': 'Tracks', 'tracks.lead': '{n} tracks in league history.',
    'track.notFound': 'Track not found.', 'track.firstRace': 'Debut', 'track.winners': 'Different winners', 'track.bySeason': 'Results by season', 'track.driverTable': 'Drivers at this track',
    'track.teamTable': 'Teams at this track', 'track.noRecord': 'No data',
    'race.title': '{track}', 'race.notFound': 'Race not found.', 'race.classification': 'Classification', 'race.biggestGain': 'Driver of the day',
    'hof.title': 'Hall of Fame',
    'hof.seasons': 'Season champions', 'hof.mostDriverTitles': 'Most drivers’ titles', 'hof.mostTeamTitles': 'Most constructors’ titles',
    'state.loading': 'Loading league data…', 'state.error': 'Could not load data from the sheet. Check your internet connection. The page will retry on its own in 30 seconds.', 'state.retry': 'Try again', 'state.retrying': 'Connecting…', 'state.staleBanner': 'Could not refresh the data. Showing data saved {time}.',
    'state.notFound': 'Page not found.', 'state.didYouMean': 'Did you mean:', 'nf.kicker': 'Error 404', 'nf.title': 'Off track',
   
    'footer.quick': 'Quick links', 'footer.follow': 'Follow the league',
  },
};

function detect() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'pl' || saved === 'en') return saved;
  } catch { /* storage unavailable */ }
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language || 'en'];
  return String(langs[0]).toLowerCase().startsWith('pl') ? 'pl' : 'en';
}

export let lang = detect();

export function setLang(l) {
  lang = l;
  try { localStorage.setItem(LANG_KEY, l); } catch { /* storage unavailable */ }
  document.documentElement.lang = l;
}

export function t(key, vars) {
  let s = DICT[lang][key] ?? DICT.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

export const fmt = {
  int: (n) => (n == null ? '—' : new Intl.NumberFormat(lang).format(n)),
  dec: (n, d = 2) => (n == null || !Number.isFinite(n) ? '—' : new Intl.NumberFormat(lang, { minimumFractionDigits: d, maximumFractionDigits: d }).format(n)),
  pct: (n) => (n == null || !Number.isFinite(n) ? '—' : new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 1 }).format(n)),
  time: (ts) => new Intl.DateTimeFormat(lang, { dateStyle: 'short', timeStyle: 'short' }).format(ts),
  country(iso) {
    if (!iso) return '';
    if (iso === 'gb-eng') return lang === 'pl' ? 'Anglia' : 'England';
    if (iso === 'gb-sct') return lang === 'pl' ? 'Szkocja' : 'Scotland';
    if (iso === 'gb-wls') return lang === 'pl' ? 'Walia' : 'Wales';
    if (iso === 'gb-nir') return lang === 'pl' ? 'Irlandia Północna' : 'Northern Ireland';
    try { return new Intl.DisplayNames([lang], { type: 'region' }).of(iso.toUpperCase()); } catch { return iso.toUpperCase(); }
  },
};
