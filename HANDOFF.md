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

## 2026-09-22 — Auto-synk med avhuking, redigerbare vekter, rediger/slett

**Status:** Alt under er kodet, typesjekket, testet i Chrome mot ekte database og pushet. Én migrasjon gjenstår for Are.

### Nytt
- **Automatisk Strava-synk** når appen åpnes, høyst hver 6. time (`+layout.svelte`, tidsstempel i localStorage). I tillegg daglig kl. 04 via Vercel Cron (`web/vercel.json` → `/api/cron/sync`), som krever `SUPABASE_SERVICE_ROLE_KEY` og `CRON_SECRET` som env på Vercel. Uten disse svarer ruta 401/503 og ingenting skjer; åpne-synken virker uansett.
- **Automatisk avhuking:** nye Strava-økter hukes av mot planen (`slotForOkt` i `model.ts`: type må passe teksten i morgen-/kveldsøkta; passer begge, avgjør klokkeslettet, før 13 = morgen). Kun for økter som kommer inn via synk, ikke for manuelle rader.
- **Vekter i appen:** trykk på vekten i øvelseslista (forsiden og Plan → Styrke) → lagres i `styrke_vekt` og overstyrer `styrke.csv`. Hver lagring logges i `styrke_historikk` (ny tabell, migrasjon 0002) og vises under «Siste endringer» på Plan → Styrke.
- **Rediger og slett:** ✎ på loggrader (inline-skjema), ✎ og ✕ på testrader i Prognose-tabellen (✎ fyller skjemaet, Lagre overskriver).
- **Nedtelling til delmål** under fremdriftslinja på forsiden (E18-løpet, Dyreparken).

### Verifisert i Chrome (innlogget som Are)
- Vekt «Pec Dec» lagret fra Plan → Styrke uten feil (satt til samme verdi, 40).
- Loggrad lagt til → redigert (km og notat) → slettet. 69 rader før og etter.
- Prognose: ✎ på uke 1 fylte skjemaet med 178 W / 80 kg / 22:37 / 1:48:57. Ikke lagret på nytt.
- Auto-synk kjørte ved sideåpning (`sisteSynk` satt).
- 15 vitest grønne, svelte-check 0 feil.

### Ikke verifisert
- Automatisk avhuking mot en *ny* Strava-økt (ingen nye aktiviteter fantes). Logikken er enhetstestet.
- Cron-ruta (kan bare kjøres på Vercel).

### Are må gjøre
1. Supabase → SQL Editor → kjør `supabase/migrations/0002_styrke_historikk.sql`. Inntil da lagres vekter, men uten historikk (koden svelger feilen med en console.warn).
2. På Vercel, hvis daglig cron ønskes: legg til `SUPABASE_SERVICE_ROLE_KEY` (Supabase → API Keys → Secret key) og `CRON_SECRET` (vilkårlig lang streng).

## 2026-09-21 (sent) — Strava koblet til og synk verifisert lokalt

**Status:** Strava OAuth og synk virker på `http://localhost:5173`. 69 økter i `logg`, ingen dubletter.

### Verifisert
- «Koble til Strava» → godkjenning → tilbake på `/logg?strava=ok` (Are gjorde dette selv).
- Synk 30 dager hentet 19 aktiviteter med riktig typemapping (Løp, Sykkel, Styrke, Annet for gåturer).
- Ny `flettDubletter()` i `web/src/lib/server/strava.ts` kjøres etter hver synk. Den fant og flettet 14 dubletter mellom Strava-rader og historikkimporten (lik dato, type, hele minutter, km ±0,2). Strava-raden beholdes og arver navnet fra historikkraden. Med dette er også «Synk hele året» trygg.

### Gotchas
- **Strava krever `localhost`, ikke `127.0.0.1`.** Callback-domenet i Strava-appen er `localhost`, og `redirect_uri` bygges fra adressen i nettleseren. Innloggings-cookies er per vertsnavn, så Are måtte logge inn på nytt på `localhost`.
- Rådet «bruk 30 dager, ikke hele året, for å unngå dubletter» i README var feil: 30 dager overlappet også med historikken. Flettingen løser det uansett vindu.

### Neste steg
1. Vercel: nytt prosjekt fra GitHub-repoet, Root Directory `web`, fire env-variabler (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`).
2. Etter første deploy: Strava → Authorization Callback Domain endres til `<prosjekt>.vercel.app` (da slutter lokal Strava-tilkobling å virke, men tokens i databasen gjelder fortsatt). Supabase → Authentication → URL Configuration → Site URL settes til Vercel-adressen.
3. Installer på iPhone og PC, test flymodus.

## 2026-09-21 (kveld) — Innlogging virker, alle fem sider verifisert i nettleser

**Status:** Are er logget inn lokalt. `/`, `/logg`, `/fremdrift`, `/prognose`, `/plan` rendrer mot ekte Supabase-data uten konsollfeil. Avhuking lagres og leses tilbake (morgenøkt 21.09 står avhuket etter reload).

### Rettet i dag
- `layout.css`: egne klasser (`.knapp`, `.felt`, `.kort`, `.tittel`) lå utenfor CSS-lag og overstyrte Tailwind-utilities, så `w-auto` på dato-knappene virket ikke. Flyttet inn i `@layer components`.
- `+page.svelte`: avhuking startet tom og ble fylt av en `$effect`, som ga et blink med tomme avkrysninger. Nå `$derived` av databasedata pluss optimistiske overstyringer.

### Skriving verifisert (samme kveld, på Ares oppdrag)
- «Importer historikk»: 64 av 64 økter ligger i `logg` (Are kjørte den selv).
- Legg til økt: testrad dukket opp øverst, skjema tømt, melding «Økt lagt til.».
- Slett økt: 65 → 64 rader, melding «Økt slettet.». Testraden er fjernet.
- Registrer test: uke 1 «Utgangspunkt» lagret med FTP 178, 80 kg, 5 km 22:37, HM 1:48:57 (samme som modellens standardverdier, så prognosen står på 6:50). Dette er ekte data og skal bli liggende.
- Byttet `confirm()` mot to-trinns bekreftelse i siden (Logg-sletting og «Koble fra Strava»). `confirm()` fryser siden for nettleserautomatisering og er dårlig i installert PWA.

### Ikke verifisert ennå
- Strava, service worker/offline, installasjon på iPhone, Vercel.
- Tester har ingen slett-funksjon i appen (kun overskriving per uke). Feilregistreringer må rettes i Supabase Table Editor.

### Gotcha
- Claudes innebygde nettleserpanel deler ikke innlogging med Ares Chrome. For å se sider bak innlogging må Claude in Chrome-utvidelsen brukes, eller Are må logge inn i panelet.
- Advarselen «Using the user object as returned from supabase.auth.getSession() … could be insecure» i serverloggen er støy: `hooks.server.ts` validerer med `getUser()`.

### Neste steg
1. Strava-app → `web/.env` → test tilkobling og synk lokalt.
2. Vercel-deploy, så iPhone-installasjon.

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
