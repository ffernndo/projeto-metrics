"""Pagina 1: Visao Geral do Perfil."""

from __future__ import annotations

import streamlit as st

from src.components.profile_card import render_profile_card
from src.components.kpi_card import render_kpi_row
from src.components.charts import engagement_line_chart, likes_comments_bar
from src.components.theme import format_number, get_influencer_tier, SUCCESS, DANGER, TEXT_SECONDARY


def render():
    """Renderiza a pagina de visao geral."""
    data = st.session_state["profile_data"]
    profile = data["profile"]
    metrics = data["metrics"]
    df = data["df_posts"]

    # Profile Card
    render_profile_card(profile)

    st.markdown("<br>", unsafe_allow_html=True)

    # KPI Row
    eng_rate = metrics["avg_engagement_rate"]
    eng_color = SUCCESS if eng_rate > 1.0 else DANGER

    render_kpi_row([
        {
            "label": "Seguidores",
            "value": format_number(profile["followers"]),
            "icon": "👥",
        },
        {
            "label": "Engagement Rate",
            "value": f"{eng_rate:.2f}%",
            "icon": "📈",
        },
        {
            "label": "Média de Likes",
            "value": format_number(metrics["avg_likes"]),
            "icon": "❤️",
        },
        {
            "label": "Posts/Semana",
            "value": f"{metrics['posts_per_week']:.1f}",
            "icon": "📅",
        },
    ])

    st.markdown("<br>", unsafe_allow_html=True)

    # Metricas secundarias
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown(
            f"""<div class="insight-card">
                <div class="insight-value">{format_number(metrics['avg_comments'])}</div>
                <div class="insight-label">Média de Comentários</div>
            </div>""",
            unsafe_allow_html=True,
        )
    with col2:
        st.markdown(
            f"""<div class="insight-card">
                <div class="insight-value">{metrics['like_comment_ratio']:.0f}:1</div>
                <div class="insight-label">Ratio Likes/Comments</div>
            </div>""",
            unsafe_allow_html=True,
        )
    with col3:
        st.markdown(
            f"""<div class="insight-card">
                <div class="insight-value">{metrics['ff_ratio']:.0f}:1</div>
                <div class="insight-label">Ratio Seguidores/Seguindo</div>
            </div>""",
            unsafe_allow_html=True,
        )
    with col4:
        st.markdown(
            f"""<div class="insight-card">
                <div class="insight-value">{metrics['total_posts_analyzed']}</div>
                <div class="insight-label">Posts Analisados</div>
            </div>""",
            unsafe_allow_html=True,
        )

    st.markdown("<br>", unsafe_allow_html=True)

    if df.empty:
        st.info("Nenhum post encontrado para este perfil.")
        return

    # Graficos
    col_left, col_right = st.columns(2)

    with col_left:
        st.plotly_chart(engagement_line_chart(df), use_container_width=True)

    with col_right:
        st.plotly_chart(likes_comments_bar(df), use_container_width=True)
