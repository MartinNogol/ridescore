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
- scoring podle tabulky: Difficulty, Diversity, Style a Consistency, každé max. 25 bodů
- 2 runy; u každého porotce se započítá lepší jízda
- volba 3 nebo 5 porotců v nastavení závodu
- 3 porotci: výsledek je průměr tří známek
- 5 porotců: nejnižší a nejvyšší známka se škrtne a výsledek je průměr zbývajících tří
- výsledek se zobrazí až po hodnocení od všech porotců
- nastavitelné maximum a váha kritérií
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

## Pravidla převzatá z Excelu

V souborech `+14 Hodnoceni zavodu.xlsx`, `-14 let Hodnoceni zavodu.xlsx` a `-10 Hodnoceni zavodu.xlsx` je stejná logika:

1. Každá jízda se skládá z Difficulty, Diversity, Style a Consistency (0–25 bodů).
2. Každý porotce ohodnotí dvě jízdy a pro jezdce se použije jeho lepší jízda.
3. Při pěti porotcích se z pěti výsledků odstraní jedno minimum a jedno maximum a zprůměrují se tři zbývající.
4. Při třech porotcích se zprůměrují všechny tři výsledky.

V administraci se počet porotců a konkrétní obsazení panelu mění v části **Scoring**. Stejné pravidlo používá leaderboard i export CSV.

## Doporučený produkční tok

Přihláška -> databáze -> prezence -> kategorie/startovka -> rozhodčí -> realtime score -> live výsledky -> CSV/PDF export.

## Stav vývoje

Toto je původní DEMO prototyp. Samotné doplnění Supabase klíčů nestačí k ostrému provozu: načítání a ukládání skóre, synchronizace mezi zařízeními a oprávnění se musí dokončit a otestovat. Scoringová pravidla čekají na původní Excel.

## Propojení GitHub → Netlify

Repozitář: https://github.com/MartinNogol/ridescore

V existujícím Netlify projektu propojte tento repozitář, větev `main`. Build command ponechte prázdný, Publish directory nastavte na `.`. Po propojení se změny v `main` automaticky nasadí.
