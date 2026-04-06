"""Pagina 2: Analise de Posts."""

from __future__ import annotations

import streamlit as st
import pandas as pd

from src.components.charts import (
    engagement_distribution,
    media_type_pie,
    type_engagement_comparison,
)
from src.components.theme import format_number, ACCENT_SECONDARY, TEXT_SECONDARY


def render():
    """Renderiza a pagina de analise de posts."""
    data = st.session_state["profile_data"]
    metrics = data["metrics"]
    df = data["df_posts"]

    if df.empty:
        st.info("Nenhum post encontrado para este perfil.")
        return

    st.markdown('<div class="section-header">Análise de Posts</div>', unsafe_allow_html=True)

    # Graficos superiores
    col1, col2 = st.columns(2)

    with col1:
        st.plotly_chart(engagement_distribution(df), use_container_width=True)

    with col2:
        st.plotly_chart(media_type_pie(df), use_container_width=True)

    # Comparacao por tipo
    st.plotly_chart(type_engagement_comparison(df), use_container_width=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # Top Posts
    st.markdown('<div class="section-header">Top 10 Posts por Engagement</div>', unsafe_allow_html=True)

    top_posts = df.nlargest(10, "engagement_rate")

    for _, post in top_posts.iterrows():
        _render_post_row(post)

    st.markdown("<br>", unsafe_allow_html=True)

    # Tabela completa
    with st.expander("Ver todos os posts analisados"):
        display_df = df[["timestamp", "media_type", "likes", "comments", "engagement_rate", "caption_length", "hashtag_count"]].copy()
        display_df.columns = ["Data", "Tipo", "Likes", "Comments", "Engagement %", "Chars Caption", "Hashtags"]
        display_df["Data"] = display_df["Data"].dt.strftime("%d/%m/%Y %H:%M")
        display_df["Engagement %"] = display_df["Engagement %"].round(3)
        display_df = display_df.sort_values("Data", ascending=False)

        st.dataframe(
            display_df,
            use_container_width=True,
            hide_index=True,
        )


def _render_post_row(post: pd.Series):
    """Renderiza uma row de post no ranking."""
    col1, col2, col3, col4, col5 = st.columns([3, 1, 1, 1, 1])

    caption_preview = post["caption"][:80] + "..." if len(post["caption"]) > 80 else post["caption"]

    with col1:
        st.markdown(
            f"""<div style="font-size:13px; color:{TEXT_SECONDARY}; line-height:1.4;">
                <span style="color:{ACCENT_SECONDARY}; font-weight:600;">{post['media_type']}</span>
                &nbsp;·&nbsp;{post['timestamp'].strftime('%d/%m/%Y')}
                <br>{caption_preview}
            </div>""",
            unsafe_allow_html=True,
        )

    with col2:
        st.metric("Likes", format_number(post["likes"]))

    with col3:
        st.metric("Comments", format_number(post["comments"]))

    with col4:
        st.metric("Engagement", f"{post['engagement_rate']:.2f}%")

    with col5:
        st.metric("Hashtags", post["hashtag_count"])

    st.divider()
