# Are 70.3 – treningsapp

Installerbar webapp (PWA) for 70.3-programmet mot **Efjord Extreme, Narvik, 7. august 2027**.
Samme data på PC og iPhone via Supabase, økter hentes fra Strava.

```
web/                      SvelteKit + TypeScript + Tailwind (appen). Vercel bygger fra denne mappen.
  src/lib/plan/model.ts   Modellene: uke/fase, dagens økt, prognose, XP/merker, ernæring (port av plan.py)
  src/lib/plan/data/      Planen som JSON – generert fra data/*.csv, ikke rediger direkte
  src/lib/supabase/       Klient, typer og spørringer
  src/lib/server/strava.ts  Strava OAuth + synk (server-side)
  src/routes/             / (i dag), /logg, /fremdrift, /prognose, /plan, /login, /api/strava/*
supabase/migrations/      Databaseskjema med Row Level Security
data/                     Planen som CSV (rediger her, kjør scripts/csv_to_json.py)
scripts/                  csv_to_json.py, lag_fasit.py (testfasit fra Python), migrate_localdb.py
legacy/streamlit/         Den gamle Streamlit-prototypen. Slettes når PWA-en er i daglig bruk.
```

## Oppsett første gang

### 1. Supabase (database og innlogging)
1. supabase.com → New project (gratis), region Frankfurt.
2. SQL Editor → lim inn `supabase/migrations/0001_init.sql` → Run.
3. Authentication → Users → **Add user** (e-post + passord). Dette er innloggingen din.
4. Project Settings → API: kopier **Project URL** og **anon public key**.

### 2. Strava
1. strava.com/settings/api → Create an app. Callback Domain: `localhost` lokalt, bytt til Vercel-domenet etter deploy.
2. Kopier **Client ID** og **Client Secret**.

### 3. Lokalt
```bash
cd web
cp .env.example .env      # fyll inn verdiene fra 1 og 2
npm install
npm run dev
```
Åpne http://localhost:5173 og logg inn.

### 4. Publiser
1. Push repoet til et privat GitHub-repo.
2. vercel.com → New project → velg repoet, **Root Directory: `web`**.
3. Environment Variables: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`.
4. Deploy. Sett Strava Callback Domain til `<prosjekt>.vercel.app`.
5. Supabase → Authentication → URL Configuration: Site URL = Vercel-adressen.

### 5. Installer appen
- **iPhone:** åpne adressen i Safari → Del → **Legg til på Hjem-skjerm**.
- **PC:** Chrome/Edge → adresselinjen → **Installer app**.

### 6. Første gang i appen
- Logg → «Importer historikk» legger inn øktene fra juni–sep 2026.
- Logg → «Koble til Strava» → «Synk siste 30 dager». Dubletter hoppes over på Strava-ID, men historikkimporten har ikke ID, så kjør bare én av dem for perioden før 15.09.2026.

## Endre planen
Rediger CSV-ene i `data/`, kjør `python scripts/csv_to_json.py`, commit og push. Vercel bygger på nytt.

- `ukeplan.csv` – tall per uke og fokus
- `ukestruktur.csv` – økter per dag og fase, med klokkeslett
- `faser.csv` – nøkkeløkter per fase
- `styrke.csv` – øvelser og vekter

## Utvikling
```bash
cd web
npm test            # vitest: modellene sjekkes mot fasit fra Python (web/src/lib/plan/fasit.json)
npm run check       # svelte-check / TypeScript
npm run build       # produksjonsbygg (Vercel-adapteren krever symlink-rettigheter på Windows; på Vercel går det fint)
```
Endres `legacy/streamlit/lib/plan.py`, regenerer fasit med `python scripts/lag_fasit.py` (trenger pandas + streamlit).

## Modellen bak prognosen
Se `web/src/lib/plan/model.ts` → `prognose()`. Svøm = 19 × CSS × 1,08; sykkel = 90 km / (24,5 × (W/kg ÷ 2,225)^0,6);
løp = snitt(halvmaraton, Riegel fra 5 km) × 1,22; T1 6 min, T2 3 min.

## Ikke laget ennå
Push-varsler, offline-skriving (lesing uten nett fungerer), redigering av vekter i appen, per-bruker plan i databasen.
