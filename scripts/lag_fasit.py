"""Genererer fasitverdier fra legacy Python-modellen (lib/plan.py) til web/src/lib/plan/fasit.json.

Kjøres fra repo-roten med et miljø som har pandas og streamlit:
    python scripts/lag_fasit.py
Brukes av web/src/lib/plan/model.test.ts for å verifisere TypeScript-porten.
"""
from __future__ import annotations

import datetime as dt
import json
import sys
from pathlib import Path

ROT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROT / "legacy" / "streamlit" if (ROT / "legacy" / "streamlit").exists() else ROT))

import pandas as pd  # noqa: E402

from lib import plan  # noqa: E402

plan.DATA = ROT / "data"  # CSV-ene ligger i repo-roten, ikke under legacy/

D = dt.date.fromisoformat


def conv(o):
    if isinstance(o, dict):
        return {str(k): conv(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [conv(v) for v in o]
    if hasattr(o, "item"):
        return o.item()
    return o


def main() -> None:
    tom = pd.DataFrame(columns=["uke", "dato", "css_sek", "ftp", "kg", "k5_sek", "hm_sek", "kommentar"])
    t = pd.DataFrame([
        dict(uke=4, css_sek=140, ftp=None, kg=79, k5_sek=21 * 60 + 30, hm_sek=None),
        dict(uke=12, css_sek=None, ftp=190, kg=None, k5_sek=None, hm_sek=None),
    ])
    logg = pd.DataFrame([
        dict(dato=D("2026-09-14"), type="Løp", km=10, minutter=55),
        dict(dato=D("2026-09-15"), type="Svøm", km=1.5, minutter=40),
        dict(dato=D("2026-09-16"), type="Sykkel", km=45, minutter=160),
        dict(dato=D("2026-09-17"), type="Styrke", km=0, minutter=50),
        dict(dato=D("2026-09-18"), type="Løp", km=8, minutter=45),
        dict(dato=D("2026-09-01"), type="Løp", km=21.1, minutter=109),
    ])
    ut = {
        "prognose_default": plan.prognose(tom, 1),
        "prognose_uke12": plan.prognose(t, 12),
        "prognose_uke5": plan.prognose(t, 5),
        "uke_for": {d: plan.uke_for(D(d)) for d in
                    ["2026-09-14", "2026-09-16", "2026-09-20", "2026-09-21", "2027-08-07", "2026-09-13"]},
        "fase_for": {u: plan.fase_for(u) for u in [1, 4, 5, 16, 17, 28, 29, 40, 41, 44, 45, 46, 47, 48, 0]},
        "dagens_okter": {d: plan.dagens_okter(D(d)) for d in
                         ["2026-09-16", "2026-11-05", "2027-02-06", "2027-05-09", "2027-06-27"]},
        "styrkeokt_i": {
            s: (None if (r := plan.styrkeokt_i(s)) is None else r["ovelse"].tolist())
            for s in ["Push", "Bein A – tung (redusert)", "Sykkel terskel 2x20 min + Upper body",
                      "Pull / Upper", "Bein B – forebyggende", "Svøm CSS"]
        },
        "xp": plan.xp(logg),
        "merker_uke3": plan.merker(logg, 3),
        "merker_uke24": plan.merker(logg, 24),
        "ernaering": {d: plan.ernaering(plan.dagens_okter(D(d)), 80.0) for d in
                      ["2026-09-16", "2026-09-19", "2027-05-08", "2027-05-09"]},
        "fmt": {
            "fmt_hms_6h29": plan.fmt_hms(6 * 3600 + 29 * 60 + 40),
            "fmt_hms_45min": plan.fmt_hms(45 * 60 + 10),
            "fmt_ms_150": plan.fmt_ms(150),
            "fmt_ms_129_6": plan.fmt_ms(129.6),
        },
    }
    mal = ROT / "web" / "src" / "lib" / "plan" / "fasit.json"
    mal.write_text(json.dumps(conv(ut), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"skrev {mal}")


if __name__ == "__main__":
    main()
