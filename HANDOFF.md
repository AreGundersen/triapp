# Arbeidsnotat (nyeste øverst)

## 2026-09-16 — All kode skrevet, venter på kontoer (GitHub, Supabase, Strava, Vercel)

**Status:** Kode ferdig og committet lokalt (4 commits på `main`). Ikke pushet, ikke deployet, ikke testet mot ekte database.

### Aktiv blokkering
Appen kan ikke kjøres bak innlogging før Supabase-prosjektet finnes. `web/.env` inneholder bare plassholdere fra `.env.example`.
Fire ting bare Are kan gjøre (krever innlogging): privat GitHub-repo, Supabase-prosjekt, Strava-app, Vercel-prosjekt. Se README «Oppsett første gang».

### Verifisert fungerer
- `cd web && npm test` → 11 tester grønne. TypeScript-porten i `web/src/lib/plan/model.ts` gir samme tall som `legacy/streamlit/lib/plan.py` (fasit i `web/src/lib/plan/fasit.json`).
- `npx svelte-check` → 0 feil, 0 advarsler.
- `npm run build` → app og service worker bygger (PWA precacher 32 filer). Selve Vercel-adapteren feiler lokalt på Windows med `EPERM symlink` – forventet, se gotchas.
- `npm run dev` → `/login` rendrer riktig med Barlow-fonter og tema, ingen konsollfeil (sett i nettleser).

### Ikke verifisert (antatt)
- Alle sider bak innlogging (`/`, `/logg`, `/fremdrift`, `/prognose`, `/plan`) er kun typesjekket, aldri kjørt mot data.
- Strava OAuth-flyt og synk (`web/src/lib/server/strava.ts`, `web/src/routes/api/strava/*`).
- Service worker offline-oppførsel og installasjon på iPhone.
- `scripts/migrate_localdb.py` er aldri kjørt. `legacy/streamlit/local.db` var uansett tom (0 rader i alle tabeller), så det er ingenting å migrere.

### Valg tatt, med begrunnelse
- **E-post + passord, ikke magic link.** Magic link-lenker åpnes i Safari og ikke i den installerte PWA-en på iPhone, så sesjonen havner feil sted. Brukere opprettes i Supabase → Authentication → Users.
- **`$env/static/public` for Supabase, `$env/dynamic/private` for Strava.** Supabase er obligatorisk (bygget skal feile uten), Strava er valgfritt (appen viser «ikke konfigurert»).
- **Planen (CSV → JSON) ligger i repoet, ikke i databasen.** Enklere for én bruker; `src/lib/plan` er laget så datakilden kan byttes senere.
- **Repoet flyttet ut av OneDrive** til `C:\dev\triapp`. `node_modules` i OneDrive gir synk-trøbbel. OneDrive-mappen er urørt og har `.venv` med pandas/streamlit.
- ECC-skillpakken vurdert og droppet: for generell, legger på hooks.

### Miljø-gotchas
- Python med pandas/streamlit finnes bare i `C:\Users\Are-PC\OneDrive\Documents\1 - Privat\triapp\.venv\Scripts\python.exe`. Brukes av `scripts/lag_fasit.py`. `scripts/csv_to_json.py` og `scripts/migrate_localdb.py` trenger bare standardbiblioteket.
- Vercel-adapteren krever symlink-rettigheter på Windows (Utviklermodus i Windows-innstillinger). Uten det stopper `npm run build` etter at bygget egentlig er ferdig. På Vercel (Linux) er dette ikke et problem.
- Forhåndsvisning i Claude-appen: `preview_start` fant ikke `.claude/launch.json` (leter i gammel mappe). Start dev-server manuelt: `cd web && npm run dev -- --port 5173`.
- `svelte-check` må kjøres etter `npx svelte-kit sync` når nye ruter er lagt til, ellers mangler `./$types`.
- Git: `core.autocrlf=false` og `.gitattributes` med `eol=lf` er satt for å slippe CRLF-støy.

### Gjenskap nåværende tilstand
```bash
cd C:\dev\triapp\web
npm install
npm test
npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json
npm run dev -- --port 5173
```

### Neste steg
1. Are: opprett privat GitHub-repo → Claude legger til remote og pusher (`git remote add origin ... && git push -u origin main`).
2. Are: Supabase-prosjekt (Frankfurt), kjør `supabase/migrations/0001_init.sql`, legg til bruker, fyll `web/.env`. Deretter: kjør appen lokalt og test alle sider med ekte data. Forvent småfeil i sidene som aldri har kjørt.
3. Are: Strava-app → `web/.env`. Test «Koble til Strava» lokalt (callback domain `localhost`).
4. Are: Vercel-prosjekt med Root Directory `web` og de fire env-variablene. Oppdater Strava callback domain og Supabase Site URL til Vercel-adressen.
5. Installer på iPhone (Safari → Legg til på Hjem-skjerm) og PC. Test flymodus.
6. Senere: redigere styrkevekter i appen (tabellen `styrke_vekt` finnes allerede), push-varsler, daglig auto-synk fra Strava (Vercel Cron).
