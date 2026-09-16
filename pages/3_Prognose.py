import datetime as dt

import pandas as pd
import plotly.express as px
import streamlit as st

from lib import db, plan
from lib.ui import sidebar, style, kort

st.set_page_config(page_title="Prognose", page_icon="🎯", layout="centered", initial_sidebar_state="collapsed")
style(); sidebar()
st.markdown("<div class='dag'>Prognose</div><div class='dato'>Efjord Extreme 70.3 · oppdateres etter hver test</div>", unsafe_allow_html=True)

tester = db.hent_tester()
uke_na = plan.uke_for(dt.date.today())
pr = plan.prognose(tester, uke_na)
c = st.columns(5)
for col, (lab, sek) in zip(c, [("Svøm", pr["svom"]), ("T1+T2", pr["t1"] + pr["t2"]), ("Sykkel", pr["sykkel"]), ("Løp", pr["lop"]), ("Totalt", pr["total"])]):
    with col:
        kort(lab, plan.fmt_hms(sek))
st.caption("Mål: under 7:00 · godt løp 6:30 · drømmedag 6:15. Spenn rundt tallet: ±20 min.")

st.markdown("#### Registrer test")
with st.form("test", border=True):
    uke = st.selectbox("Uke / test", [u for u, _ in plan.TEST_UKER], format_func=lambda u: f"Uke {u} – {dict(plan.TEST_UKER)[u]}",
                       index=min(range(len(plan.TEST_UKER)), key=lambda i: abs(plan.TEST_UKER[i][0] - uke_na)))
    c1, c2, c3 = st.columns(3)
    css = c1.text_input("CSS per 100 m (m:ss)", placeholder="2:15")
    ftp = c2.number_input("FTP (W)", 0, 500, 0)
    kg = c3.number_input("Vekt (kg)", 0.0, 150.0, 0.0, 0.5)
    c4, c5 = st.columns(2)
    k5 = c4.text_input("5 km (mm:ss)", placeholder="21:30")
    hm = c5.text_input("Halvmaraton (h:mm:ss)", placeholder="1:45:00")
    kom = st.text_input("Kommentar")

    def sek(s):
        if not s.strip():
            return None
        p = [int(x) for x in s.strip().split(":")]
        return sum(v * 60 ** i for i, v in enumerate(reversed(p)))

    if st.form_submit_button("Lagre", use_container_width=True):
        db.lagre_test(int(uke), dato=dt.date.today().isoformat(), css_sek=sek(css), ftp=ftp or None, kg=kg or None,
                      k5_sek=sek(k5), hm_sek=sek(hm), kommentar=kom or None)
        st.toast("Test lagret"); st.rerun()

rows = []
for u, navn in plan.TEST_UKER:
    p = plan.prognose(tester, u)
    rows.append(dict(Uke=u, Test=navn, CSS=plan.fmt_ms(p["css"]), FTP=int(p["ftp"]), Svøm=plan.fmt_hms(p["svom"]),
                     Sykkel=plan.fmt_hms(p["sykkel"]), Løp=plan.fmt_hms(p["lop"]), Totalt=plan.fmt_hms(p["total"]), _tot=p["total"] / 3600))
df = pd.DataFrame(rows)
st.dataframe(df.drop(columns="_tot"), hide_index=True, use_container_width=True)
fig = px.line(df, x="Uke", y="_tot", markers=True, title="Prognose totaltid", labels={"_tot": "timer"})
fig.update_traces(line_color="#B42318"); fig.update_layout(height=280, margin=dict(l=10, r=10, t=40, b=10), font_family="Barlow")
st.plotly_chart(fig, use_container_width=True)
with st.expander("Modellen"):
    st.markdown("""- Svøm = 19 × CSS × 1,08 (åpent, kaldt vann). Uten test: 2:30/100 m.
- Sykkel = 90 km / fart, fart = 24,5 km/t × (W/kg ÷ 2,225)^0,6 — kalibrert mot 25 km/t på kupert Agder med 178 W / 80 kg.
- Løp = snitt av fersk halvmaraton og 5 km (Riegel) × 1,22 for bakker og fire timer i beina.
- T1 6 min, T2 3 min.""")
