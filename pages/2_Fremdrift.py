import datetime as dt

import pandas as pd
import plotly.express as px
import streamlit as st

from lib import db, plan
from lib.ui import sidebar, style

st.set_page_config(page_title="Fremdrift", page_icon="📈", layout="centered", initial_sidebar_state="collapsed")
style(); sidebar()
st.markdown("<div class='dag'>Fremdrift</div>", unsafe_allow_html=True)

logg = db.hent_logg()
up = plan.les("ukeplan").copy()
up["mandag"] = pd.to_datetime(up["mandag"]).dt.date
idag = dt.date.today()

def ukesum(typ, kol, div=1.0):
    l = logg[logg["type"] == typ].copy()
    if l.empty:
        return pd.Series(dtype=float)
    l["mandag"] = l["dato"].map(plan.mandag)
    return l.groupby("mandag")[kol].sum() / div

serier = [("Løp", "km", "lop_km", "km", 1.0, "#4E9A3D"), ("Sykkel", "minutter", "sykkel_t", "timer", 60.0, "#D97A2B"),
          ("Svøm", "km", "svom_km", "km", 1.0, "#2E75B6")]
for typ, kol, plankol, enh, div, farge in serier:
    s = ukesum(typ, kol, div)
    df = up[["uke", "mandag", plankol]].rename(columns={plankol: "Plan"})
    df["Utført"] = df["mandag"].map(s).fillna(0.0)
    df.loc[df["mandag"] > idag, "Utført"] = None
    m = df.melt(id_vars=["uke"], value_vars=["Plan", "Utført"], var_name="serie", value_name=enh)
    fig = px.bar(m, x="uke", y=enh, color="serie", barmode="group", title=f"{typ} – {enh} per uke",
                 color_discrete_map={"Plan": "#d9d9d9", "Utført": farge})
    fig.update_layout(height=280, margin=dict(l=10, r=10, t=40, b=10), legend_title_text="", font_family="Barlow")
    st.plotly_chart(fig, use_container_width=True)

# totalt
l = logg.copy(); l["mandag"] = l["dato"].map(plan.mandag)
tot = l.groupby("mandag")["minutter"].sum() / 60
df = up[["uke", "mandag", "timer"]].rename(columns={"timer": "Plan"}); df["Utført"] = df["mandag"].map(tot)
fig = px.line(df, x="uke", y=["Plan", "Utført"], title="Timer per uke", color_discrete_map={"Plan": "#9ca3af", "Utført": "#1F3864"})
fig.update_layout(height=280, margin=dict(l=10, r=10, t=40, b=10), legend_title_text="", font_family="Barlow")
st.plotly_chart(fig, use_container_width=True)

x = plan.xp(logg); uke = plan.uke_for(idag)
st.markdown(f"#### Nivå {x['niva']} – {x['navn']}")
st.progress(x["andel"], text=f"{x['xp']} XP · {x['til_neste']} til neste nivå")
for navn, krav, ok in plan.merker(logg, uke):
    st.markdown(f"{'🟢' if ok else '⚪'} **{navn}** <span class='dim'>— {krav}</span>", unsafe_allow_html=True)
