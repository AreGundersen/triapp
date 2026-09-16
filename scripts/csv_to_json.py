"""Konverterer planen i data/*.csv til JSON som SvelteKit-appen importerer.

Kjør fra repo-roten:  python scripts/csv_to_json.py
Skriver til web/src/lib/plan/data/*.json. Tall-kolonner blir tall, tomme celler blir null.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

ROT = Path(__file__).resolve().parent.parent
DATA = ROT / "data"
UT = ROT / "web" / "src" / "lib" / "plan" / "data"

TALLKOLONNER = {
    "ukeplan": {"uke", "svom_okter", "svom_km", "sykkel_okter", "sykkel_t", "lop_okter", "lop_km", "styrke_okter", "timer"},
    "ukestruktur": {"ukedag"},
    "faser": set(),
    "styrke": set(),
    "logg_seed": {"km", "minutter"},
}


def konverter(verdi: str, tall: bool):
    v = verdi.strip()
    if v == "":
        return None
    if tall:
        try:
            f = float(v)
            return int(f) if f.is_integer() else f
        except ValueError:
            return v
    return v


def main() -> None:
    UT.mkdir(parents=True, exist_ok=True)
    for navn, tall in TALLKOLONNER.items():
        kilde = DATA / f"{navn}.csv"
        with kilde.open(encoding="utf-8", newline="") as f:
            rader = [{k: konverter(v, k in tall) for k, v in rad.items()} for rad in csv.DictReader(f)]
        mal = UT / f"{navn}.json"
        mal.write_text(json.dumps(rader, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"{kilde.name} -> {mal.relative_to(ROT)} ({len(rader)} rader)")


if __name__ == "__main__":
    main()
