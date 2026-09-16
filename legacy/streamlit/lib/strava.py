"""Strava: OAuth (én bruker) og synk av aktiviteter til logg."""
from __future__ import annotations

import datetime as dt
import time

import requests
import streamlit as st

from lib import db

AUTH_URL = "https://www.strava.com/oauth/authorize"
TOKEN_URL = "https://www.strava.com/oauth/token"
API = "https://www.strava.com/api/v3"

TYPEMAP = {
    "Run": "Løp", "TrailRun": "Løp", "VirtualRun": "Løp",
    "Ride": "Sykkel", "VirtualRide": "Sykkel", "GravelRide": "Sykkel", "MountainBikeRide": "Sykkel", "EBikeRide": "Sykkel",
    "Swim": "Svøm",
    "WeightTraining": "Styrke", "Workout": "Styrke", "Crossfit": "Styrke",
}


def _cfg():
    try:
        s = st.secrets["strava"]
        return s["client_id"], s["client_secret"], s.get("redirect_uri", "http://localhost:8501")
    except Exception:
        return None, None, None


def konfigurert() -> bool:
    return _cfg()[0] is not None


def autoriser_url() -> str:
    cid, _, redirect = _cfg()
    return (f"{AUTH_URL}?client_id={cid}&response_type=code&redirect_uri={redirect}"
            f"&approval_prompt=auto&scope=activity:read_all")


def bytt_kode(code: str) -> None:
    cid, sec, _ = _cfg()
    r = requests.post(TOKEN_URL, data=dict(client_id=cid, client_secret=sec, code=code, grant_type="authorization_code"), timeout=20)
    r.raise_for_status()
    j = r.json()
    db.lagre_tokens(j["access_token"], j["refresh_token"], j["expires_at"])


def _access_token() -> str | None:
    tok = db.hent_tokens()
    if not tok:
        return None
    if tok["expires"] - 60 < time.time():
        cid, sec, _ = _cfg()
        r = requests.post(TOKEN_URL, data=dict(client_id=cid, client_secret=sec, refresh_token=tok["refresh"], grant_type="refresh_token"), timeout=20)
        r.raise_for_status()
        j = r.json()
        db.lagre_tokens(j["access_token"], j["refresh_token"], j["expires_at"])
        return j["access_token"]
    return tok["access"]


def tilkoblet() -> bool:
    return db.hent_tokens() is not None


def synk(dager: int = 30) -> tuple[int, int]:
    """Hent aktiviteter fra Strava for de siste `dager` og legg nye i logg. Returnerer (nye, hoppet over)."""
    tok = _access_token()
    if not tok:
        raise RuntimeError("Strava er ikke koblet til.")
    after = int((dt.datetime.now() - dt.timedelta(days=dager)).timestamp())
    kjente = db.kjente_strava_ider()
    nye, hopp = 0, 0
    page = 1
    while True:
        r = requests.get(f"{API}/athlete/activities", headers={"Authorization": f"Bearer {tok}"},
                         params=dict(after=after, per_page=100, page=page), timeout=30)
        r.raise_for_status()
        acts = r.json()
        if not acts:
            break
        for a in acts:
            sid = str(a["id"])
            typ = TYPEMAP.get(a.get("sport_type") or a.get("type"), "Annet")
            if sid in kjente:
                hopp += 1
                continue
            start = dt.datetime.fromisoformat(a["start_date_local"].replace("Z", ""))
            db.legg_til_logg(start.date(), typ, round(a.get("distance", 0) / 1000, 1),
                             round(a.get("moving_time", 0) / 60), a.get("name", ""), kilde="Strava", strava_id=sid)
            nye += 1
        page += 1
    return nye, hopp
