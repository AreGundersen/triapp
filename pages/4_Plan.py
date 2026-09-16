import datetime as dt

import pandas as pd
import streamlit as st

from lib import plan
from lib.ui import sidebar, style

st.set_page_config(page_title="Plan", page_icon="🗓️", layout="centered", initial_sidebar_state="collapsed")
style(); sidebar()
st.markdown("<div class='dag'>Plan</div>", unsafe_allow_html=True)
tab1, tab2, tab3, tab4 = st.tabs(["Ukeplan", "Ukestruktur", "Faser", "Styrke"])
uke_na = plan.uke_for(dt.date.today())
with tab1:
    up = plan.les("ukeplan").copy()
    up["mandag"] = pd.to_datetime(up["mandag"]).dt.strftime("%d.%m.%y")
    vis = up.rename(columns=dict(uke="Uke", mandag="Man", fase="Fase", svom_okter="Svøm økter", svom_km="Svøm km", sykkel_okter="Sykkel økter",
                                 sykkel_t="Sykkel t", lop_okter="Løp økter", lop_km="Løp km", styrke_okter="Styrke", timer="Timer", fokus="Fokus"))
    st.dataframe(vis.style.apply(lambda r: ["background:#EEF3FB" if r["Uke"] == uke_na else "" for _ in r], axis=1),
                 hide_index=True, use_container_width=True, height=600)
with tab2:
    us = plan.les("ukestruktur")
    kol = plan.struktur_kolonne(plan.fase_for(uke_na))
    valg = st.radio("Fase", ["base", "bygg1", "bygg2"], index=["base", "bygg1", "bygg2"].index(kol), horizontal=True,
                    format_func=lambda k: {"base": "Overgang / Grunnlag", "bygg1": "Bygg 1", "bygg2": "Bygg 2 / Topp"}[k])
    for dag in ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"]:
        d = us[us["dag"] == dag]
        m = d[d["slot"] == "morgen"].iloc[0]; k = d[d["slot"] == "kveld"].iloc[0]
        st.markdown(f"**{dag}** &nbsp; <span class='dim'>{m['tid']}</span> {m[valg]} &nbsp;·&nbsp; <span class='dim'>{k['tid']}</span> {k[valg]}", unsafe_allow_html=True)
with tab3:
    for _, r in plan.les("faser").iterrows():
        with st.expander(f"{r['fase']} — {r['uker']}", expanded=(r['fase'] == plan.fase_for(uke_na))):
            st.markdown(f"**Svøm:** {r['svom']}\n\n**Sykkel:** {r['sykkel']}\n\n**Løp:** {r['lop']}\n\n*{r['tester']}*")
with tab4:
    s = plan.les("styrke")
    for okt in s["okt"].unique():
        with st.expander(okt):
            st.dataframe(s[s["okt"] == okt][["ovelse", "sett_rep", "vekt"]].rename(columns=dict(ovelse="Øvelse", sett_rep="Sett x rep", vekt="Vekt")),
                         hide_index=True, use_container_width=True)
