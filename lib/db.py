"""Lagring: Supabase (Postgres) når secrets finnes, ellers lokal SQLite.

Tabeller:
  logg      – én rad per økt (dato, type, km, minutter, navn, kilde, strava_id)
  avhuking  – én rad per dato (dato, morgen, kveld)
  tester    – testresultater som driver prognosen (uke, css_sek, ftp, kg, k5_sek, hm_sek)
  tokens    – Strava OAuth-tokens (én rad)
"""
from __future__ import annotations

import datetime as dt
import sqlite3
from pathlib import Path

import pandas as pd
import streamlit as st

TYPER = ["Svøm", "Sykkel", "Løp", "Styrke", "Annet"]
_SQLITE = Path(__file__).resolve().parent.parent / "local.db"


# ---------------------------------------------------------------- backend
def _supabase():
    try:
        url = st.secrets["supabase"]["url"]
        key = st.secrets["supabase"]["key"]
    except Exception:
        return None
    from supabase import create_client

    return create_client(url, key)


@st.cache_resource
def backend():
    sb = _supabase()
    if sb is not None:
        return ("supabase", sb)
    con = sqlite3.connect(_SQLITE, check_same_thread=False)
    con.executescript(
        """
        CREATE TABLE IF NOT EXISTS logg(id INTEGER PRIMARY KEY, dato TEXT, type TEXT, km REAL, minutter REAL,
                                        navn TEXT, kilde TEXT, strava_id TEXT UNIQUE);
        CREATE TABLE IF NOT EXISTS avhuking(dato TEXT PRIMARY KEY, morgen INTEGER DEFAULT 0, kveld INTEGER DEFAULT 0);
        CREATE TABLE IF NOT EXISTS tester(uke INTEGER PRIMARY KEY, dato TEXT, css_sek REAL, ftp REAL, kg REAL,
                                          k5_sek REAL, hm_sek REAL, kommentar TEXT);
        CREATE TABLE IF NOT EXISTS tokens(id INTEGER PRIMARY KEY CHECK (id=1), access TEXT, refresh TEXT, expires INTEGER);
        """
    )
    return ("sqlite", con)


def _kind():
    return backend()[0]


# ---------------------------------------------------------------- logg
def hent_logg() -> pd.DataFrame:
    kind, h = backend()
    if kind == "supabase":
        rows = h.table("logg").select("*").order("dato", desc=True).execute().data
        df = pd.DataFrame(rows)
    else:
        df = pd.read_sql("SELECT * FROM logg ORDER BY dato DESC", h)
    if df.empty:
        df = pd.DataFrame(columns=["id", "dato", "type", "km", "minutter", "navn", "kilde", "strava_id"])
    df["dato"] = pd.to_datetime(df["dato"]).dt.date
    for c in ("km", "minutter"):
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0.0)
    return df


def legg_til_logg(dato: dt.date, type_: str, km: float, minutter: float, navn: str, kilde="Manuelt", strava_id=None):
    kind, h = backend()
    rad = dict(dato=dato.isoformat(), type=type_, km=float(km or 0), minutter=float(minutter or 0),
               navn=navn or "", kilde=kilde, strava_id=strava_id)
    if kind == "supabase":
        if strava_id:
            h.table("logg").upsert(rad, on_conflict="strava_id").execute()
        else:
            h.table("logg").insert(rad).execute()
    else:
        if strava_id:
            h.execute("INSERT OR IGNORE INTO logg(dato,type,km,minutter,navn,kilde,strava_id) VALUES(?,?,?,?,?,?,?)",
                      tuple(rad.values()))
        else:
            h.execute("INSERT INTO logg(dato,type,km,minutter,navn,kilde,strava_id) VALUES(?,?,?,?,?,?,?)",
                      tuple(rad.values()))
        h.commit()


def slett_logg(id_: int):
    kind, h = backend()
    if kind == "supabase":
        h.table("logg").delete().eq("id", id_).execute()
    else:
        h.execute("DELETE FROM logg WHERE id=?", (id_,)); h.commit()


def kjente_strava_ider() -> set[str]:
    df = hent_logg()
    return set(df["strava_id"].dropna().astype(str))


# ---------------------------------------------------------------- avhuking
def hent_avhuking() -> pd.DataFrame:
    kind, h = backend()
    if kind == "supabase":
        df = pd.DataFrame(h.table("avhuking").select("*").execute().data)
    else:
        df = pd.read_sql("SELECT * FROM avhuking", h)
    if df.empty:
        return pd.DataFrame(columns=["dato", "morgen", "kveld"])
    df["dato"] = pd.to_datetime(df["dato"]).dt.date
    df["morgen"] = df["morgen"].astype(bool); df["kveld"] = df["kveld"].astype(bool)
    return df


def sett_avhuking(dato: dt.date, morgen: bool | None = None, kveld: bool | None = None):
    kind, h = backend()
    df = hent_avhuking()
    row = df[df["dato"] == dato]
    m = bool(row["morgen"].iloc[0]) if not row.empty else False
    k = bool(row["kveld"].iloc[0]) if not row.empty else False
    if morgen is not None: m = morgen
    if kveld is not None: k = kveld
    if kind == "supabase":
        h.table("avhuking").upsert(dict(dato=dato.isoformat(), morgen=m, kveld=k)).execute()
    else:
        h.execute("INSERT INTO avhuking(dato,morgen,kveld) VALUES(?,?,?) ON CONFLICT(dato) DO UPDATE SET morgen=excluded.morgen, kveld=excluded.kveld",
                  (dato.isoformat(), int(m), int(k)))
        h.commit()


# ---------------------------------------------------------------- tester
def hent_tester() -> pd.DataFrame:
    kind, h = backend()
    if kind == "supabase":
        df = pd.DataFrame(h.table("tester").select("*").order("uke").execute().data)
    else:
        df = pd.read_sql("SELECT * FROM tester ORDER BY uke", h)
    if df.empty:
        return pd.DataFrame(columns=["uke", "dato", "css_sek", "ftp", "kg", "k5_sek", "hm_sek", "kommentar"])
    return df


def lagre_test(uke: int, **felt):
    kind, h = backend()
    rad = {"uke": int(uke), **{k: v for k, v in felt.items()}}
    if kind == "supabase":
        h.table("tester").upsert(rad, on_conflict="uke").execute()
    else:
        cols = ",".join(rad.keys()); q = ",".join("?" * len(rad))
        upd = ",".join(f"{c}=excluded.{c}" for c in rad if c != "uke")
        h.execute(f"INSERT INTO tester({cols}) VALUES({q}) ON CONFLICT(uke) DO UPDATE SET {upd}", tuple(rad.values()))
        h.commit()


# ---------------------------------------------------------------- tokens
def hent_tokens() -> dict | None:
    kind, h = backend()
    if kind == "supabase":
        rows = h.table("tokens").select("*").eq("id", 1).execute().data
        return rows[0] if rows else None
    r = h.execute("SELECT access, refresh, expires FROM tokens WHERE id=1").fetchone()
    return dict(access=r[0], refresh=r[1], expires=r[2]) if r else None


def lagre_tokens(access: str, refresh: str, expires: int):
    kind, h = backend()
    if kind == "supabase":
        h.table("tokens").upsert(dict(id=1, access=access, refresh=refresh, expires=int(expires))).execute()
    else:
        h.execute("INSERT INTO tokens(id,access,refresh,expires) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET access=excluded.access, refresh=excluded.refresh, expires=excluded.expires",
                  (access, refresh, int(expires)))
        h.commit()


# ---------------------------------------------------------------- seed
def seed_fra_csv(path: Path) -> int:
    """Importer logg_seed.csv én gang (hopper over rader som allerede finnes på dato+type+minutter)."""
    df = pd.read_csv(path)
    eksisterende = hent_logg()
    n = 0
    for _, r in df.iterrows():
        d = dt.date.fromisoformat(str(r["dato"]))
        dup = eksisterende[(eksisterende["dato"] == d) & (eksisterende["type"] == r["type"]) &
                           (eksisterende["minutter"].round() == round(float(r["minutter"] or 0)))]
        if dup.empty:
            legg_til_logg(d, r["type"], r["km"], r["minutter"], r["navn"], kilde=str(r.get("kilde", "Strava")))
            n += 1
    return n
