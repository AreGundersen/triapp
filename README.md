# Are 70.3 – treningsapp

Streamlit-app for 70.3-programmet mot Efjord Extreme 07.08.2027. Mobilvennlig. Leser planen fra `data/*.csv`,
lagrer logg/avhuking/tester i Supabase, og henter økter rett fra Strava.

## Sider
- **Dagens økt** – morgen/kveld med avhuking, styrkeøvelser og vekter, ukens mål mot utført, nivå/XP, prognose, ernæring, Strava-synk.
- **Logg** – legg til/slett økter, synk fra Strava, importer historikk.
- **Fremdrift** – plan mot utført per uke (løp, sykkel, svøm, timer), nivå og merker.
- **Prognose** – anslått løpstid, registrer testresultater, se hvordan prognosen flytter seg.
- **Plan** – Ukeplan, Ukestruktur per fase, Faser, Styrke.

## Oppsett (ca. 20 min)

### 1. Supabase (lagring)
1. Lag konto på supabase.com → New project (gratis). Velg region Frankfurt.
2. SQL Editor → lim inn innholdet i `schema.sql` → Run.
3. Project Settings → API: kopier **Project URL** og **anon public key**.

### 2. Strava API
1. Gå til strava.com/settings/api → Create an app.
   - Application name: `Are 70.3`
   - Website: `https://localhost` (kan endres senere)
   - Authorization Callback Domain: `localhost` (lokalt) – bytt til `<din-app>.streamlit.app` når appen er publisert.
2. Kopier **Client ID** og **Client Secret**.

### 3. Secrets
Lokalt: kopier `.streamlit/secrets.toml.example` til `.streamlit/secrets.toml` og fyll inn.
På Streamlit Cloud: App settings → Secrets → lim inn samme innhold.

### 4. Kjør lokalt
```bash
pip install -r requirements.txt
streamlit run app.py
```
Uten Supabase-secrets bruker appen en lokal SQLite-fil (`local.db`) – greit for testing.

### 5. Publiser
1. Legg koden i et GitHub-repo (privat er fint).
2. share.streamlit.io → New app → velg repo, `app.py`.
3. Lim inn secrets. Sett `redirect_uri` til app-URL-en og oppdater Callback Domain hos Strava.
4. Åpne appen → **Koble til Strava** → godkjenn. Deretter **Synk fra Strava**.

### 6. Første gang
- Logg → «Importer historikk» legger inn øktene fra juni–sep 2026 (utgangspunktet).
- Så «Synk hele året» fra Strava – dubletter hoppes over på Strava-ID, men historikkimporten har ikke ID, så kjør bare én av dem for perioden før 15.09.2026.

## Endre planen
Alt av plan ligger i `data/`:
- `ukeplan.csv` – tall per uke og fokus
- `ukestruktur.csv` – økter per dag og fase, med klokkeslett
- `faser.csv` – nøkkeløkter per fase
- `styrke.csv` – øvelser og vekter (oppdater vektene her når du går opp)

Rediger, commit, og appen oppdaterer seg.

## Modellen bak prognosen
Se `lib/plan.py` → `prognose()`. Samme som i regnearket: svøm = 19 × CSS × 1,08; sykkel = 90 km / (24,5 × (W/kg ÷ 2,225)^0,6);
løp = snitt(halvmaraton, Riegel fra 5 km) × 1,22; T1 6 min, T2 3 min.
