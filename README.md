# Pole Position Racing — strona ligi

Statyczna strona (HTML, CSS i JavaScript, bez serwera i bez budowania), która przy każdym wejściu czyta dane z arkusza Google ligi i sama wylicza wszystkie tabele i statystyki.

## Skąd strona bierze dane

Strona czyta publiczny arkusz (udostępniony jako „Każda osoba mająca link → Przeglądający”):

| Zakładka | Zakres | Do czego służy |
|---|---|---|
| `RAW RACE DATA` | `D:O` | wyniki wszystkich wyścigów (główne źródło) |
| `RAW RACE DATA` | `Q:Z` | narodowości kierowców (kolumna Z) → flagi |
| `RECORDS` | `A:C` | rekord okrążenia i najszybsze kwalifikacje na torach |
| `TRACK DATA` | `AO:AP` | pełne nazwy torów i ich kody |

Wystarczy wpisywać wyniki do arkusza tak jak dotąd. Strona sprawdza arkusz przy każdym wejściu, co 5 minut, gdy jest otwarta, i po powrocie do karty. Zmiany pojawiają się w ciągu kilku minut, bo Google krótko przechowuje kopię danych. Gdy arkusz chwilowo nie odpowiada, strona pokazuje ostatnie zapisane dane.

**Ważne:** nie zmieniaj kolejności kolumn w `RAW RACE DATA` (D–O) ani nazw zakładek, z których korzysta strona. Arkusz musi pozostać udostępniony do odczytu.

### Zasady wyliczeń

- **GOAT Ranking:** suma punktów wszech czasów. Przy remisie decyduje liczba wygranych, potem drugich miejsc itd.
- **Konstruktorzy:** liczone bez zespołu „Reserve”. Historyczne nazwy są połączone z następcami: Renault → Alpine, Racing Point → Aston Martin, AlphaTauri → VCARB, Alfa Romeo i Kick Sauber → Audi.
- **Mistrz sezonu:** ogłaszany dopiero, gdy w arkuszu pojawi się pierwszy wyścig kolejnego sezonu. Do tego czasu strona pokazuje „Lidera”.
- **Kalendarz (zakładka sezonu):** pokazuje tylko rozegrane rundy, wzięte z wyników w arkuszu.
- **Wyszukiwarka:** lupa w nagłówku, Ctrl+K (Cmd+K na Macu) albo „/”. Szuka kierowców, zespołów, torów i sezonów („S12”, „sezon 12”), bez względu na polskie znaki. Pojedynczy wyścig znajduje po torze i sezonie lub rundzie („Monza S14”, „S7 R3”).
- **Nie znaleziono:** gdy adres prowadzi donikąd (np. literówka w nazwisku), strona podpowiada najbardziej podobnych kierowców, zespoły i tory oraz daje przyciski „Start” i „Szukaj”.
- **Aplikacja na telefonie:** stronę można dodać do ekranu głównego (Chrome: „Zainstaluj aplikację”, Safari: Udostępnij → „Do ekranu początkowego”). Otwiera się wtedy na pełnym ekranie, a bez internetu pokazuje ostatnio pobrane dane (`sw.js`, `manifest.webmanifest`).
- **Awanse:** „Kierowca dnia” (największy awans) na stronie wyścigu i tabela „Największe awanse w wyścigu” w statystykach liczą tylko kierowców, którzy ukończyli wyścig i mają wpisane pole startowe.
- **Zmiana pozycji (▲/▼):** w klasyfikacji kierowców i konstruktorów porównanie z tabelą sprzed ostatniej rundy danego sezonu.
- **Kamienie milowe:** w profilu kierowcy debiut, pierwsze punkty, podium, pole position, wygrana i hat-trick oraz 50., 100., 150.… start. Kamienie z tego samego wyścigu są na jednej karcie.
- **Podgląd kierowcy i zespołu:** na komputerze po najechaniu myszką na nazwisko lub nazwę zespołu pojawia się karta z najważniejszymi danymi (miejsce wszech czasów, punkty, starty, wygrane, podia, tytuły; u kierowcy też flaga i zespół). Na ekranach dotykowych jej nie ma.
- **Filtr w tabelach:** pole „Szukaj w tabeli” nad GOAT Rankingiem i historią startów kierowcy, a także nad listami kierowców zespołu i toru, gdy mają więcej niż 12 wierszy. Szuka też po nazwie kraju.
- **Ciekawostka na stronie głównej:** losowana raz przy wejściu spośród faktów liczonych na bieżąco z danych (zwycięstwa z dalekich pól, duże awanse, rekordy torów, wyrównane sezony, serie, najdłuższe czekanie na pierwszą wygraną i przerwa między wygranymi, wygrane w wielu zespołach, weterani, seria pole position, najwięcej DNF w sezonie, najbardziej otwarty sezon, dublety zespołów, tory, na których pole daje wygraną najczęściej i najrzadziej).
- **Brak połączenia:** gdy nie ma żadnych zapisanych danych, strona pokazuje komunikat z przyciskiem „Spróbuj ponownie” i sama ponawia próbę co 30 sekund. Gdy odświeżenie się nie uda, nad treścią pojawia się pasek z godziną zapisanych danych.
- **Zakładka w adresie:** na stronie Klasyfikacji i sezonów otwarta zakładka trafia do adresu (`#/standings/constructors`, `#/season/3/calendar`, a także `drivers` i `results`), więc odświeżenie albo wysłany link otwiera tę samą zakładkę.
- **Długie tabele:** nazwy kolumn zostają pod górnym paskiem przy przewijaniu tabel dłuższych niż 12 wierszy. Na długich stronach w prawym dolnym rogu pojawia się przycisk „Do góry”.
- **Najlepszy i najsłabszy tor kierowcy:** plakietki na profilu z najniższym i najwyższym średnim miejscem na mecie (bez DNF), liczone tylko dla torów z co najmniej dwoma ukończonymi wyścigami, gdy takich torów są co najmniej trzy.

## Ustawienia — `config.json`

```json
{
  "sheetId": "1ZKXUxp4XcILifPl248RttwhjkGJ9x0QCeURABEcNGnI",
  "refreshMinutes": 5,
  "links": { "rules": "", "discord": "" },
  "social": {
    "discord": "https://discord.gg/pTKpp63z5C",
    "youtube": "https://www.youtube.com/@PPR_League",
    "twitch": "https://www.twitch.tv/polepositionracing"
  }
}
```

W polach `links.rules` (link do regulaminu) i `links.discord` wpisz adresy, które mają się pojawić w menu i stopce. Puste pola są tam ukryte.

`social` to przyciski Discord, YouTube i Twitch na stronie głównej. Pusty adres ukrywa dany przycisk.

## Nowy tor, zespół lub kraj

- **Nowy tor:** dodaj go w `TRACK DATA` (nazwa i kod). Flagę kraju dla nowego kodu dopisz w `js/countries.js` (`TRACK_COUNTRY`), a nitkę toru w `js/track-geo.js`, generowanym z otwartego repozytorium [f1-circuits](https://github.com/bacinger/f1-circuits). Bez nitki strona pokazuje zastępczy kafelek.
- **Nowy kraj kierowcy:** jeśli flaga się nie pojawia, dopisz nazwę kraju w `js/countries.js` (`NAMES`).
- **Nowa nazwa zespołu:** dopisz ją w `js/teams.js` (`ALIASES`), żeby połączyć ją z właściwym zespołem.

## Podgląd lokalny

```bash
python3 -m http.server 8417
```

Następnie otwórz http://localhost:8417.

## Publikacja (GitHub Pages, za darmo)

1. Załóż darmowe konto na github.com.
2. Utwórz publiczne repozytorium (np. `pole-position-racing`) i wgraj do niego zawartość tego folderu.
3. W repozytorium wybierz Settings → Pages → Source: „Deploy from a branch” → gałąź `main`, folder `/ (root)`.
4. Po minucie strona będzie dostępna pod adresem `https://<nazwa-konta>.github.io/pole-position-racing/`.

Plik `config.json` można potem edytować bezpośrednio w przeglądarce na GitHubie (ikona ołówka).

### Każda kolejna publikacja

Przed wysłaniem zmian uruchom:

```bash
python3 scripts/release.py
```

Skrypt nadaje plikom CSS i JS nowy numer wersji (`?v=…` w `index.html`, także w mapie importów modułów) i ten sam numer w `sw.js`. Dzięki temu przeglądarki odwiedzających pobierają nowe pliki od razu, bez ręcznego odświeżania z Shiftem.

## Licencje i źródła

- Nitki torów: [f1-circuits](https://github.com/bacinger/f1-circuits) © Tomislav Bacinger, licencja MIT.
- Flagi: [flag-icons](https://github.com/lipis/flag-icons), licencja MIT.
- Logotypy zespołów F1 są znakami towarowymi ich właścicieli.
