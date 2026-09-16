"""Planen (CSV i data/) og modellene: fase, prognose, XP/merker, ernæring."""
from __future__ import annotations

import datetime as dt
from pathlib import Path

import pandas as pd
import streamlit as st

DATA = Path(__file__).resolve().parent.parent / "data"
START = dt.date(2026, 9, 14)
LOP = dt.date(2027, 8, 7)
LOPSNAVN = "Efjord Extreme 70.3"
ANDRE_LOP = [("E18-løpet 15 km", dt.date(2026, 11, 1)), ("Dyreparken 10 km", dt.date(2027, 4, 24))]
DELOAD = {4, 8, 12, 16, 20, 24, 28, 32, 36, 40}


@st.cache_data
def les(navn: str) -> pd.DataFrame:
    return pd.read_csv(DATA / f"{navn}.csv")


def uke_for(d: dt.date) -> int:
    return (d - START).days // 7 + 1


def mandag(d: dt.date) -> dt.date:
    return d - dt.timedelta(days=d.weekday())


def ukeplan_rad(uke: int) -> pd.Series | None:
    up = les("ukeplan")
    r = up[up["uke"] == uke]
    return None if r.empty else r.iloc[0]


def fase_for(uke: int) -> str:
    r = ukeplan_rad(uke)
    return "Utenfor planen" if r is None else r["fase"]


def struktur_kolonne(fase: str) -> str:
    if fase in ("Overgang", "Grunnlag"):
        return "base"
    if fase == "Bygg 1":
        return "bygg1"
    return "bygg2"


def dagens_okter(d: dt.date) -> dict:
    """{'morgen': (tid, tekst), 'kveld': (tid, tekst)} for datoen."""
    us = les("ukestruktur")
    kol = struktur_kolonne(fase_for(uke_for(d)))
    ut = {}
    for slot in ("morgen", "kveld"):
        r = us[(us["ukedag"] == d.weekday() + 1) & (us["slot"] == slot)].iloc[0]
        ut[slot] = (str(r["tid"]), str(r[kol]))
    return ut


STYRKE_NOKLER = [("Push", "Push"), ("Pull", "Pull"), ("Upper", "Upper body"), ("Bein A", "Bein A – tung"), ("Bein B", "Bein B – forebygg.")]


def styrkeokt_i(tekst: str) -> pd.DataFrame | None:
    for nokkel, okt in STYRKE_NOKLER:
        if nokkel in tekst:
            s = les("styrke")
            return s[s["okt"] == okt]
    return None


def er_hard(tekst: str) -> bool:
    t = tekst.lower()
    return any(k in t for k in ("langtur", "intervall", "tempo", "terskel", "simulering", "70.3"))


# ---------------------------------------------------------------- prognose
def _siste(tester: pd.DataFrame, kol: str, uke: int, default):
    t = tester[(tester["uke"] <= uke)].dropna(subset=[kol]) if not tester.empty and kol in tester else pd.DataFrame()
    return default if t.empty else float(t.sort_values("uke").iloc[-1][kol])


def prognose(tester: pd.DataFrame, uke: int) -> dict:
    """Sekunder per del. Samme modell som arket."""
    css = _siste(tester, "css_sek", uke, 150.0)       # sek per 100 m
    ftp = _siste(tester, "ftp", uke, 178.0)
    kg = _siste(tester, "kg", uke, 80.0)
    k5 = _siste(tester, "k5_sek", uke, 22 * 60 + 37)
    hm = _siste(tester, "hm_sek", uke, 1 * 3600 + 48 * 60 + 57)
    svom = 19 * css * 1.08
    t1 = 6 * 60
    fart = 24.5 * ((ftp / kg) / 2.225) ** 0.6
    sykkel = 90 / fart * 3600
    t2 = 3 * 60
    riegel = k5 * (21.1 / 5) ** 1.06
    lop = (hm + riegel) / 2 * 1.22
    return dict(svom=svom, t1=t1, sykkel=sykkel, t2=t2, lop=lop, total=svom + t1 + sykkel + t2 + lop,
                css=css, ftp=ftp, kg=kg, k5=k5, hm=hm)


def fmt_hms(sek: float) -> str:
    sek = int(round(sek)); h, m = divmod(sek // 60, 60)
    return f"{h}:{m:02d}" if h else f"{m} min"


def fmt_ms(sek: float) -> str:
    m, s = divmod(int(round(sek)), 60)
    return f"{m}:{s:02d}"


TEST_UKER = [(1, "Utgangspunkt"), (4, "5 km + 400 m svøm"), (12, "20-min FTP + 5 km"), (20, "400 m CSS + FTP"),
             (28, "5 km + 1000 m svøm"), (32, "Dyreparken 10 km"), (36, "FTP + 1000 m svøm"),
             (40, "Test-løp olympisk"), (42, "Løpssimulering"), (47, "Løpsdag")]


# ---------------------------------------------------------------- xp og merker
NIVAER = ["Nybegynner", "Svømmefot", "Rullekonge", "Asfaltsliter", "Brick-mester", "Jernhode", "Maskin",
          "Halvveis-helt", "Sub-7-kandidat", "70.3-finisher"]


def xp(logg: pd.DataFrame) -> dict:
    l = logg[logg["dato"] >= START]
    p = (len(l) * 10 + l.loc[l["type"] == "Løp", "km"].sum() + l.loc[l["type"] == "Svøm", "km"].sum() * 4
         + l.loc[l["type"] == "Sykkel", "minutter"].sum() / 30)
    p = int(round(p)); niv = min(10, p // 500 + 1)
    return dict(xp=p, niva=niv, navn=NIVAER[niv - 1], til_neste=500 - p % 500, andel=(p % 500) / 500)


def merker(logg: pd.DataFrame, uke: int) -> list[tuple[str, str, bool]]:
    l = logg[logg["dato"] >= START]
    uker = l.groupby(l["dato"].map(mandag)).size()
    return [
        ("Våt bak ørene", "Første svømmeøkt", (logg["type"] == "Svøm").any()),
        ("Fem på rad", "En uke med 5+ økter", (uker >= 5).any()),
        ("Hundrekilometer", "100 km løp siden start", l.loc[l["type"] == "Løp", "km"].sum() >= 100),
        ("Sadelsår", "Sykkeltur over 2,5 t", ((logg["type"] == "Sykkel") & (logg["minutter"] >= 150)).any()),
        ("Fisk", "1,9 km svøm i ett strekk", ((logg["type"] == "Svøm") & (logg["km"] >= 1.9)).any()),
        ("Tusenkunstner", "1 000 km sykkel siden start", l.loc[l["type"] == "Sykkel", "km"].sum() >= 1000),
        ("Halvveis", "Uke 24 passert", uke >= 24),
        ("Jernvilje", "25 styrkeøkter siden start", (l["type"] == "Styrke").sum() >= 25),
        ("Løpsklar", "Løpsuka er her", uke >= 47),
    ]


# ---------------------------------------------------------------- ernæring
def ernaering(okter: dict, kg: float) -> dict:
    tekst = " ".join(t for _, t in okter.values())
    hard = er_hard(tekst)
    fri = all(t.strip().startswith("Fri") for _, t in okter.values())
    dagstype = "Hard / lang dag" if hard else ("Hviledag" if fri else "Vanlig treningsdag")
    karbo = {"Hard / lang dag": (6, 8), "Vanlig treningsdag": (4, 6), "Hviledag": (3, 4)}[dagstype]
    m_t = okter["morgen"][1]
    if m_t.startswith("Fri"):
        for_ = "–"
    elif er_hard(m_t):
        for_ = "Frokost 2–3 t før: 1–2 g/kg karbo (havregrøt, brød, banan)."
    else:
        for_ = "Lett: banan eller brødskive, eller fastende hvis under 60 min rolig."
    if "Langtur" in tekst:
        under = "60–90 g karbo/t fra første time. Tren magen – dette er løpsdagsrutinen."
    elif hard:
        under = "Vann. Sportsdrikk hvis økten er over 75 min."
    else:
        under = "Vann er nok."
    kveld_t = okter["kveld"][1]
    if "Bein" in kveld_t:
        kveld = "Middag med protein og karbo etter styrken, + 30–40 g protein før du legger deg."
    elif hard:
        kveld = "Fyll opp: stor middag med karbo. Morgendagen starter med det du spiser i kveld."
    else:
        kveld = "Normal middag. Protein i hvert måltid."
    return dict(dagstype=dagstype,
                karbo=f"{round(kg*karbo[0])}–{round(kg*karbo[1])} g",
                protein=f"{round(kg*1.6)}–{round(kg*2.0)} g",
                vaeske=("3–4 l" if hard else "2–2,5 l" if fri else "2,5–3,5 l") + " + 500–800 ml/t under trening",
                for_=for_, under=under,
                etter=f"Innen 60 min: {round(kg)} g karbo + {round(kg*0.4)} g protein. To økter samme dag: ikke valgfritt.",
                kveld=kveld)
