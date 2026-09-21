# Arbeidsnotat (nyeste øverst)

## Les dette først (for en ny utvikler eller modell)

- **Hva:** Personlig treningsapp for Are mot Efjord Extreme 70.3 (07.08.2027). SvelteKit-PWA i `web/`, Supabase som database/innlogging, Strava-synk, hosting på Vercel. README forklarer struktur og oppsett.
- **Brukeren:** Are skriver norsk og vil ha svar på norsk. Bakgrunn fra Python/Streamlit, ikke JavaScript, så tekniske valg må begrunnes i klartekst. Bruker iPhone og Windows-PC.
- **Arbeidsform:** Are gjør alt som krever innlogging i dashbord (Supabase, Strava, Vercel). Assistenten skal aldri be om eller skrive inn passord eller hemmelige nøkler. Innlogging i appen gjør Are selv i nettleseren.
- **Repo:** `C:\dev\triapp`, remote `https://github.com/AreGundersen/triapp` (privat), branch `main`. Den gamle mappen i OneDrive er en urørt kopi av Streamlit-prototypen og brukes bare for Python-miljøet (se gotchas).
- **Godkjent plan:** PWA, forberedt for flere brukere (user_id + RLS på alle tabeller), iPhone. Fasene er: grunnmur → modeller → innlogging/forside → øvrige sider → Strava → PWA → opprydding. Kode for alle faser er skrevet; det som gjenstår er test mot ekte data, Strava-app, Vercel-deploy og installasjon.

## Fortsette på en annen maskin (f.eks. skole-PC)

Krever Node 20+ og git. Python trengs ikke for å kjøre appen.

```bash
git clone https://github.com/AreGundersen/triapp.git
cd triapp/web
npm install
cp .env.example .env
```

Fyll så inn `web/.env` for hånd. Den ligger **ikke** på GitHub:
- `PUBLIC_SUPABASE_URL`: Supabase → Data API → Project URL (bare `https://<ref>.supabase.co`, uten `/rest/v1/`).
- `PUBLIC_SUPABASE_ANON_KEY`: Supabase → Project Settings → API Keys → Publishable key.
- Strava-linjene kan stå som plassholdere; appen viser da «Strava er ikke konfigurert».

```bash
npm test          # skal gi 11 grønne
npm run dev       # åpne http://localhost:5173 og logg inn
```

Husk `git pull` før du starter og `git push` når du er ferdig, så hjemme-PC og skole-PC ikke spriker. Data (logg, avhuking, tester) ligger i Supabase og er like uansett maskin.

## 2026-09-21 — Pushet til GitHub, Supabase satt opp, venter på første innlogging

**Status:** Kode på GitHub (lokalt = origin/main, rent arbeidstre). Supabase-prosjekt finnes med skjema og bruker. Appen starter lokalt mot Supabase. Ingen har logget inn ennå, så sidene bak innlogging er fortsatt ukjørt.

### Aktiv blokkering
Are må logge inn selv på `http://127.0.0.1:5173/login` (assistenten kan ikke skrive passord). Først etter det kan sidene `/`, `/logg`, `/fremdrift`, `/prognose`, `/plan` testes mot databasen. Forvent småfeil der: de er typesjekket, men aldri kjørt med data.

### Verifisert siden forrige notat
- `git push -u origin main` gikk gjennom; `git log origin/main..HEAD` er tom.
- Alle fem tabeller (`logg`, `avhuking`, `tester`, `strava_tokens`, `styrke_vekt`) svarer 200 på Supabase REST med publishable-nøkkelen. Auth-endepunktet svarer 200.
- `web/.env` har ekte `PUBLIC_SUPABASE_URL` og `PUBLIC_SUPABASE_ANON_KEY`. Strava-linjene er fortsatt plassholdere.
- `npm run dev` starter rent og `/login` gir 200.

### Ikke verifisert (antatt)
- At brukeren i Supabase er bekreftet og at innlogging faktisk virker (Are sa migrasjon og bruker «er gjort»; ikke sjekket).
- Alt under «Ikke verifisert» i notatet fra 16.09 gjelder fortsatt.

### Nye gotchas
- **Supabase-URL skal være bare roten**, `https://<ref>.supabase.co`. Are limte først inn varianten med `/rest/v1/` på slutten, som gir `PGRST125 Invalid path`. Rettet i `.env`.
- **Nye Supabase-nøkler:** dashbordet viser «Publishable key» (`sb_publishable_…`) i stedet for «anon». Den brukes som `PUBLIC_SUPABASE_ANON_KEY` og fungerer likt. «Secret key» / `service_role` skal aldri inn i `web/.env` eller Vercel; den trengs bare av `scripts/migrate_localdb.py`, som uansett er overflødig (tom `local.db`).
- **Dev-server på Windows:** å stoppe bakgrunnsoppgaven dreper ikke node-prosessen, så port 5173 blir stående opptatt. Finn PID med `netstat -ano | grep :5173` og kjør `taskkill //F //PID <pid>` før ny start.
- `.env`-endringer krever omstart av dev-serveren (`$env/static/public` leses ved oppstart).

### Neste steg
1. Start dev-server, la Are logge inn, gå gjennom alle fem sider. Test: huk av økt, legg til og slett loggrad, «Importer historikk», registrer test på Prognose. Sjekk at radene havner i Supabase med riktig `user_id`.
2. Rett feil som dukker opp, commit og push.
3. Are lager Strava-app (callback domain `localhost`), fyller `STRAVA_CLIENT_ID`/`STRAVA_CLIENT_SECRET` i `web/.env`. Test «Koble til Strava» og synk lokalt.
4. Are lager Vercel-prosjekt: Root Directory `web`, fire env-variabler. Etter deploy: Strava callback domain og Supabase Site URL settes til Vercel-adressen.
5. Installer på iPhone (Safari → Legg til på Hjem-skjerm) og PC. Test flymodus (lesing skal virke, skriving ikke).
6. Når PWA-en er i daglig bruk: slett `legacy/streamlit/`.

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
