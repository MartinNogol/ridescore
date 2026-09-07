# Scoot Scoring - Netlify-ready MVP

Hotový statický prototyp online scoringu pro freestyle koloběžkové závody.

## Nejrychlejší spuštění na Netlify

1. Rozbal složku `scoot-scoring`.
2. V Netlify na obrazovce "Deploy your first project" použij sekci **Upload your project files**.
3. Přetáhni celou složku nebo ZIP.
4. Web okamžitě běží v **DEMO režimu** bez databáze.

DEMO režim ukládá data do localStorage daného prohlížeče. Hodí se na vzhled, workflow a testování, ne na ostrý závod na více zařízeních.

## Co už prototyp umí

- veřejný LIVE leaderboard
- startovní listinu
- online přihlášku závodníka
- Admin dashboard
- prezenci jezdců
- kategorie a počet runů
- role uživatelů
- Judge mode pro telefon/tablet
- nastavitelné scoring kritérium / maximum / váhu
- 2 runy + nejlepší run do leaderboardu
- export výsledků do CSV
- import přihlášek z CSV exportu Google Forms / Google Sheets
- responzivní mobilní design

## Google Forms workflow

Pokud chceš přihlášky sbírat přes Google Form:

Google Form -> Google Sheets -> Soubor > Stáhnout > CSV -> Admin > Jezdci > Import Google Sheets CSV

Rozpoznávané sloupce:
- Jméno závodníka
- Kategorie
- Město
- Datum narození
- Sponzoři
- Instagram
- Informace o jezdci

Později lze doplnit automatickou synchronizaci přes Google Apps Script / Supabase Edge Function.

## Ostrá online verze: Supabase

Pro více rozhodčích a LIVE synchronizaci doporučuji Supabase.

1. Založ projekt na Supabase.
2. V SQL Editoru spusť `supabase-schema.sql`.
3. V Authentication > Providers zapni Google.
4. V Supabase URL Configuration přidej Netlify URL mezi Redirect URLs.
5. Do `config.js` vlož Project URL a anon public key.
6. Nastav `DEMO_MODE: false`.

Poznámka: schema je bezpečný starter. Veřejnou registraci je vhodné dokončit atomickým RPC/Edge Function endpointem, protože datum narození a případný kontakt rodiče nesmí být veřejně čitelný.

## Co doladit podle Martinova Excelu

Scoring v demo verzi je úmyslně konfigurovatelný. Výchozí kritéria jsou pouze ukázka:
- Difficulty
- Execution
- Style
- Variety
- Use of park

Po dodání scoringového Excelu upravit 1:1:
- přesná kritéria a maxima
- počet rozhodčích
- váhy
- zahazování nejvyšší / nejnižší známky
- kvalifikace vs finále
- počet runů
- best run / average / combined score
- tie-break pravidla
- penalizace

## Doporučený produkční tok

Přihláška -> databáze -> prezence -> kategorie/startovka -> rozhodčí -> realtime score -> live výsledky -> CSV/PDF export.
