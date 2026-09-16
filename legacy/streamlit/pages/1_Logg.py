import datetime as dt

import streamlit as st

from lib import db, plan, strava
from lib.ui import sidebar, style

st.set_page_config(page_title="Logg", page_icon="📓", layout="centered", initial_sidebar_state="collapsed")
style(); sidebar()
st.markdown("<div class='dag'>Logg</div>", unsafe_allow_html=True)

with st.form("ny", clear_on_submit=True, border=True):
    c1, c2 = st.columns(2)
    dato = c1.date_input("Dato", dt.date.today())
    typ = c2.selectbox("Type", db.TYPER)
    c3, c4 = st.columns(2)
    km = c3.number_input("Km", 0.0, 300.0, 0.0, 0.1)
    minutter = c4.number_input("Minutter", 0, 600, 0, 5)
    navn = st.text_input("Notat", placeholder="f.eks. 6x3 min Z4, følte meg sterk")
    if st.form_submit_button("Legg til økt", use_container_width=True):
        db.legg_til_logg(dato, typ, km, minutter, navn)
        st.toast("Økt lagt til")
        st.rerun()

if strava.konfigurert() and strava.tilkoblet():
    c1, c2 = st.columns(2)
    if c1.button("Synk siste 30 dager", use_container_width=True):
        nye, hopp = strava.synk(30); st.success(f"{nye} nye, {hopp} fantes."); st.rerun()
    if c2.button("Synk hele året", use_container_width=True):
        nye, hopp = strava.synk(365); st.success(f"{nye} nye, {hopp} fantes."); st.rerun()

logg = db.hent_logg()
if logg.empty:
    st.info("Ingen økter ennå. Legg til over, eller importer utgangspunktet fra Strava-eksporten.")
    if st.button("Importer historikk (juni–sep 2026)"):
        n = db.seed_fra_csv(plan.DATA / "logg_seed.csv"); st.success(f"{n} økter importert"); st.rerun()
else:
    filt = st.multiselect("Vis", db.TYPER, default=[t for t in db.TYPER if t != "Annet"])
    vis = logg[logg["type"].isin(filt)].copy()
    vis["dato"] = vis["dato"].map(lambda d: d.strftime("%d.%m.%y"))
    st.dataframe(vis[["dato", "type", "km", "minutter", "navn", "kilde"]].rename(columns=str.capitalize),
                 use_container_width=True, hide_index=True, height=520)
    with st.expander("Slett en økt"):
        valg = st.selectbox("Velg", logg["id"].astype(int),
                            format_func=lambda i: f"{logg.set_index('id').loc[i,'dato']} · {logg.set_index('id').loc[i,'type']} · {logg.set_index('id').loc[i,'navn']}")
        if st.button("Slett", type="primary"):
            db.slett_logg(int(valg)); st.rerun()
