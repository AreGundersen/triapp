"""Engangsflytting av data fra legacy local.db (SQLite) til Supabase.

Krever service role key (omgår RLS) og bruker-ID-en dataene skal eies av:

    set SUPABASE_URL=https://xxxx.supabase.co
    set SUPABASE_SERVICE_ROLE_KEY=eyJ...
    set BRUKER_ID=<uuid fra Supabase → Authentication → Users>
    python scripts/migrate_localdb.py [sti/til/local.db]

Bruker kun standardbiblioteket (urllib), så det trengs ingen pip install.
Hopper over logg-rader som allerede finnes på dato+type+minutter, og upserter avhuking/tester.
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROT = Path(__file__).resolve().parent.parent


def kall(url: str, key: str, sti: str, metode: str = "GET", data=None, prefer: str | None = None):
    req = urllib.request.Request(
        f"{url}/rest/v1/{sti}",
        method=metode,
        data=None if data is None else json.dumps(data).encode(),
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            **({"Prefer": prefer} if prefer else {}),
        },
    )
    try:
        with urllib.request.urlopen(req) as r:
            tekst = r.read().decode()
            return json.loads(tekst) if tekst else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{metode} {sti} feilet ({e.code}): {e.read().decode()}") from e


def main() -> None:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    bruker = os.environ.get("BRUKER_ID", "")
    if not (url and key and bruker):
        raise SystemExit("Sett SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY og BRUKER_ID (se docstring).")
    db = Path(sys.argv[1]) if len(sys.argv) > 1 else ROT / "local.db"
    if not db.exists():
        raise SystemExit(f"Fant ikke {db}")
    con = sqlite3.connect(db)
    con.row_factory = sqlite3.Row

    # logg
    eksisterende = kall(url, key, f"logg?select=dato,type,minutter&user_id=eq.{bruker}", "GET")
    finnes = {(r["dato"], r["type"], round(float(r["minutter"] or 0))) for r in eksisterende}
    nye = []
    for r in con.execute("SELECT * FROM logg"):
        n = (r["dato"], r["type"], round(float(r["minutter"] or 0)))
        if n in finnes:
            continue
        finnes.add(n)
        nye.append(dict(user_id=bruker, dato=r["dato"], type=r["type"], km=float(r["km"] or 0),
                        minutter=float(r["minutter"] or 0), navn=r["navn"] or "", kilde=r["kilde"] or "Manuelt",
                        strava_id=r["strava_id"]))
    if nye:
        kall(url, key, "logg", "POST", nye, prefer="return=minimal")
    print(f"logg: {len(nye)} nye rader lagt inn")

    # avhuking
    avh = [dict(user_id=bruker, dato=r["dato"], morgen=bool(r["morgen"]), kveld=bool(r["kveld"]))
           for r in con.execute("SELECT * FROM avhuking")]
    if avh:
        kall(url, key, "avhuking?on_conflict=user_id,dato", "POST", avh, prefer="resolution=merge-duplicates,return=minimal")
    print(f"avhuking: {len(avh)} rader upsertet")

    # tester
    tester = [dict(user_id=bruker, uke=r["uke"], dato=r["dato"], css_sek=r["css_sek"], ftp=r["ftp"], kg=r["kg"],
                   k5_sek=r["k5_sek"], hm_sek=r["hm_sek"], kommentar=r["kommentar"])
              for r in con.execute("SELECT * FROM tester")]
    if tester:
        kall(url, key, "tester?on_conflict=user_id,uke", "POST", tester, prefer="resolution=merge-duplicates,return=minimal")
    print(f"tester: {len(tester)} rader upsertet")
    print("Ferdig. Strava-tokens flyttes ikke – koble til Strava på nytt i appen.")


if __name__ == "__main__":
    main()
