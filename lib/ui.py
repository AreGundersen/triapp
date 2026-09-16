import streamlit as st

CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;800&family=Barlow:wght@400;600&display=swap');
html, body, [class*="css"] { font-family: 'Barlow', system-ui, sans-serif; }
.dag  { font-family:'Barlow Condensed'; font-weight:800; font-size:2.6rem; line-height:1; letter-spacing:-.01em; }
.dato { color:#6b7280; margin-top:.2rem; }
.tall { font-family:'Barlow Condensed'; font-weight:800; font-size:2.6rem; line-height:1; color:#B42318; text-align:right; }
.undertekst { color:#6b7280; text-align:right; font-size:.85rem; }
.slot { font-family:'Barlow Condensed'; font-weight:700; font-size:1.05rem; letter-spacing:.02em; }
.okt  { font-family:'Barlow Condensed'; font-weight:600; font-size:1.6rem; line-height:1.15; margin:.15rem 0 .3rem; }
.dim  { color:#6b7280; }
.dagboks { text-align:center; padding:.35rem 0; border-radius:8px; font-size:.85rem; color:#6b7280; }
.dagboks .hak { font-size:1.1rem; letter-spacing:.1em; color:#4E9A3D; }
.dagboks.idag { background:#EEF3FB; color:#111; font-weight:600; }
.dagboks.fortid { opacity:.55; }
.kort { border:1px solid #e5e7eb; border-radius:10px; padding:.7rem .9rem; }
.kort .k-lab { color:#6b7280; font-size:.8rem; }
.kort .k-val { font-family:'Barlow Condensed'; font-weight:800; font-size:1.7rem; line-height:1.1; }
.kort .k-sub { color:#6b7280; font-size:.8rem; margin-top:.15rem; }
div[data-testid="stCheckbox"] label p { font-weight:600; }
</style>
"""


def style():
    st.markdown(CSS, unsafe_allow_html=True)


def kort(lab: str, val: str, sub: str = ""):
    st.markdown(f"<div class='kort'><div class='k-lab'>{lab}</div><div class='k-val'>{val}</div><div class='k-sub'>{sub}</div></div>",
                unsafe_allow_html=True)


def sidebar():
    with st.sidebar:
        st.markdown("### Are 70.3")
        st.page_link("app.py", label="Dagens økt")
        st.page_link("pages/1_Logg.py", label="Logg")
        st.page_link("pages/2_Fremdrift.py", label="Fremdrift")
        st.page_link("pages/3_Prognose.py", label="Prognose")
        st.page_link("pages/4_Plan.py", label="Plan")
