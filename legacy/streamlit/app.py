import datetime as dt

import streamlit as st

from lib import db, plan, strava
from lib.ui import sidebar, style, kort

st.set_page_config(page_title="Are 70.3", page_icon="🏁", layout="centered", initial_sidebar_state="collapsed")
style()
sidebar()

# ---------------------------------------------------------------- Strava-callback (OAuth redirect lander her)
if "code" in st.query_params and strava.konfigurert() and not strava.tilkoblet():
    try:
        strava.bytt_kode(st.query_params["code"])
        st.query_params.clear()
        st.toast("Strava koblet til")
    except Exception as e:
        st.error(f"Kunne ikke koble til Strava: {e}")

# ---------------------------------------------------------------- dato
if "dato" not in st.session_state:
    st.session_state.dato = dt.date.today()
dato: dt.date = st.session_state.dato
uke = plan.uke_for(dato)
fase = plan.fase_for(uke)
okter = plan.dagens_okter(dato)
avh = db.hent_avhuking()
rad = avh[avh["dato"] == dato]
m_done = bool(rad["morgen"].iloc[0]) if not rad.empty else False
k_done = bool(rad["kveld"].iloc[0]) if not rad.empty else False

# ---------------------------------------------------------------- topp
c1, c2, c3 = st.columns([2, 1, 1])
with c1:
    st.markdown(f"<div class='dag'>{['Mandag','Tirsdag','Onsdag','Torsdag','Fredag','Lørdag','Søndag'][dato.weekday()]}</div>"
                f"<div class='dato'>{dato:%d.%m.%Y} · uke {uke} · {fase}</div>", unsafe_allow_html=True)
with c2:
    st.markdown(f"<div class='tall'>{(plan.LOP-dato).days}</div><div class='undertekst'>dager til Efjord</div>", unsafe_allow_html=True)
with c3:
    nd = st.date_input("Dato", dato, label_visibility="collapsed", key="datovelger")
    if nd != dato:
        st.session_state.dato = nd
        st.rerun()

st.progress(min(1.0, max(0.0, (uke - 1) / 47)), text=f"{int(min(1.0, max(0.0, (uke-1)/47))*100)} % av planen")

# ---------------------------------------------------------------- øktkort
def oktkort(slot: str, farge: str, done: bool):
    tid, tekst = okter[slot]
    with st.container(border=True):
        a, b = st.columns([4, 1])
        with a:
            st.markdown(f"<span class='slot' style='color:{farge}'>{slot.capitalize()} · kl. {tid}</span>", unsafe_allow_html=True)
            st.markdown(f"<div class='okt'>{tekst}</div>", unsafe_allow_html=True)
        with b:
            ny = st.checkbox("Utført", value=done, key=f"chk_{slot}_{dato}")
            if ny != done:
                db.sett_avhuking(dato, **{slot: ny})
                st.rerun()
        styrke = plan.styrkeokt_i(tekst)
        if styrke is not None and not styrke.empty:
            with st.expander("Øvelser", expanded=not done):
                for _, r in styrke.iterrows():
                    v = "" if str(r["vekt"]) in ("nan", "None") else f" · {r['vekt']}"
                    st.markdown(f"**{r['ovelse']}** &nbsp; <span class='dim'>{r['sett_rep']}{v}</span>", unsafe_allow_html=True)


oktkort("morgen", "#4E9A3D", m_done)
oktkort("kveld", "#D97A2B", k_done)

# ---------------------------------------------------------------- ukens mål + volum
logg = db.hent_logg()
man = plan.mandag(dato)
uke_logg = logg[(logg["dato"] >= man) & (logg["dato"] < man + dt.timedelta(days=7))]
up = plan.ukeplan_rad(uke)

st.markdown("#### Denne uka")
if up is not None:
    def rad_(navn, utf, mal, enh):
        andel = 0 if not mal else min(1.0, utf / mal)
        st.markdown(f"**{navn}** &nbsp; <span class='dim'>{utf:g} / {mal:g} {enh}</span>", unsafe_allow_html=True)
        st.progress(andel)
    rad_("Svøm", round(uke_logg.loc[uke_logg["type"] == "Svøm", "km"].sum(), 1), float(up["svom_km"]), "km")
    rad_("Sykkel", round(uke_logg.loc[uke_logg["type"] == "Sykkel", "minutter"].sum() / 60, 1), float(up["sykkel_t"]), "t")
    rad_("Løp", round(uke_logg.loc[uke_logg["type"] == "Løp", "km"].sum()), float(up["lop_km"]), "km")
    rad_("Styrke", int((uke_logg["type"] == "Styrke").sum()), float(up["styrke_okter"]), "økter")
    if isinstance(up["fokus"], str) and up["fokus"] != "–":
        st.info(up["fokus"])

# ukeoversikt m/ avhuking
dager = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"]
kol = st.columns(7)
for i in range(7):
    d = man + dt.timedelta(days=i)
    r = avh[avh["dato"] == d]
    m = bool(r["morgen"].iloc[0]) if not r.empty else False
    k = bool(r["kveld"].iloc[0]) if not r.empty else False
    kl = "idag" if d == dato else ("fortid" if d < dt.date.today() else "")
    kol[i].markdown(f"<div class='dagboks {kl}'><div>{dager[i]}</div><div class='hak'>{'●' if m else '○'}{'●' if k else '○'}</div></div>", unsafe_allow_html=True)

# ---------------------------------------------------------------- nivå + prognose
x = plan.xp(logg)
pr = plan.prognose(db.hent_tester(), uke)
a, b = st.columns(2)
with a:
    kort("Nivå", f"{x['niva']} · {x['navn']}", f"{x['xp']} XP · {x['til_neste']} til neste")
with b:
    kort("Prognose", plan.fmt_hms(pr["total"]), f"svøm {plan.fmt_hms(pr['svom'])} · sykkel {plan.fmt_hms(pr['sykkel'])} · løp {plan.fmt_hms(pr['lop'])}")

# ---------------------------------------------------------------- ernæring
with st.expander("Ernæring i dag"):
    e = plan.ernaering(okter, pr["kg"])
    st.markdown(f"**{e['dagstype']}** · karbo {e['karbo']} · protein {e['protein']} · væske {e['vaeske']}")
    st.markdown(f"- **Før morgenøkt:** {e['for_']}\n- **Under økt:** {e['under']}\n- **Etter økt:** {e['etter']}\n- **Kveld:** {e['kveld']}")
    st.caption("Generelle retningslinjer for utholdenhetsidrett, ikke individuell kostholdsveiledning.")

# ---------------------------------------------------------------- strava-synk
st.divider()
if strava.konfigurert():
    if strava.tilkoblet():
        if st.button("Synk fra Strava", use_container_width=True):
            try:
                nye, hopp = strava.synk(30)
                st.success(f"{nye} nye økter lagt inn ({hopp} fantes allerede).")
                st.rerun()
            except Exception as e:
                st.error(f"Synk feilet: {e}")
    else:
        st.link_button("Koble til Strava", strava.autoriser_url(), use_container_width=True)
else:
    st.caption("Strava er ikke konfigurert – legg inn client_id og client_secret i secrets (se README).")
