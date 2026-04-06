"""Pagina 3: Analise Temporal - Melhores Horarios."""

from __future__ import annotations

import streamlit as st

from src.components.charts import (
    posting_heatmap,
    engagement_by_day,
    engagement_by_hour,
    posting_frequency,
)
from src.components.theme import ACCENT_SECONDARY

_DAYS_PT = {
    "Monday": "Segunda-feira",
    "Tuesday": "Terça-feira",
    "Wednesday": "Quarta-feira",
    "Thursday": "Quinta-feira",
    "Friday": "Sexta-feira",
    "Saturday": "Sábado",
    "Sunday": "Domingo",
}


def render():
    """Renderiza a pagina de analise temporal."""
    data = st.session_state["profile_data"]
    metrics = data["metrics"]
    df = data["df_posts"]

    if df.empty:
        st.info("Nenhum post encontrado para este perfil.")
        return

    st.markdown('<div class="section-header">Análise Temporal</div>', unsafe_allow_html=True)

    # Insight cards no topo
    best_day = metrics["best_day"]
    best_day_pt = _DAYS_PT.get(best_day, best_day)
    best_hour = metrics["best_hour"]

    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown(
            f"""<div class="insight-card">
                <div class="insight-value">{best_day_pt}</div>
                <div class="insight-label">Melhor Dia para Postar</div>
            </div>""",
            unsafe_allow_html=True,
        )

    with col2:
        st.markdown(
            f"""<div class="insight-card">
                <div class="insight-value">{best_hour:02d}:00</div>
                <div class="insight-label">Melhor Horário</div>
            </div>""",
            unsafe_allow_html=True,
        )

    with col3:
        st.markdown(
            f"""<div class="insight-card">
                <div class="insight-value">{metrics['posts_per_week']:.1f}</div>
                <div class="insight-label">Posts por Semana</div>
            </div>""",
            unsafe_allow_html=True,
        )

    st.markdown("<br>", unsafe_allow_html=True)

    # Heatmap
    st.plotly_chart(posting_heatmap(df), use_container_width=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # Engagement por dia e hora
    col_left, col_right = st.columns(2)

    with col_left:
        st.plotly_chart(engagement_by_day(df), use_container_width=True)

    with col_right:
        st.plotly_chart(engagement_by_hour(df), use_container_width=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # Frequencia de postagem
    st.plotly_chart(posting_frequency(df), use_container_width=True)
