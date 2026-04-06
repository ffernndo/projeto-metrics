"""Pagina 4: Inteligencia de Conteudo."""

from __future__ import annotations

import streamlit as st

from src.components.charts import (
    caption_vs_engagement,
    hashtag_bar,
    type_engagement_comparison,
)
from src.components.theme import TEXT_SECONDARY, ACCENT_SECONDARY


def render():
    """Renderiza a pagina de inteligencia de conteudo."""
    data = st.session_state["profile_data"]
    metrics = data["metrics"]
    df = data["df_posts"]

    if df.empty:
        st.info("Nenhum post encontrado para este perfil.")
        return

    st.markdown('<div class="section-header">Inteligência de Conteúdo</div>', unsafe_allow_html=True)

    # Caption vs Engagement
    st.plotly_chart(caption_vs_engagement(df), use_container_width=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # Hashtags e tipo
    col1, col2 = st.columns(2)

    with col1:
        st.plotly_chart(
            hashtag_bar(metrics["top_hashtags"]),
            use_container_width=True,
        )

    with col2:
        st.plotly_chart(
            type_engagement_comparison(df),
            use_container_width=True,
        )

    st.markdown("<br>", unsafe_allow_html=True)

    # Word Cloud
    st.markdown('<div class="section-header">Palavras Mais Frequentes nas Captions</div>', unsafe_allow_html=True)

    _render_wordcloud(df)

    st.markdown("<br>", unsafe_allow_html=True)

    # Insights de conteudo
    st.markdown('<div class="section-header">Insights de Conteúdo</div>', unsafe_allow_html=True)

    _render_content_insights(df, metrics)


def _render_wordcloud(df):
    """Gera e renderiza word cloud das captions."""
    try:
        from wordcloud import WordCloud
        import io

        all_text = " ".join(df["caption"].dropna().tolist())

        # Remover hashtags e mencoes para o word cloud
        import re
        clean_text = re.sub(r"[#@]\w+", "", all_text)
        clean_text = re.sub(r"https?://\S+", "", clean_text)
        clean_text = re.sub(r"[^\w\s]", "", clean_text)

        if not clean_text.strip():
            st.info("Sem texto suficiente nas captions para gerar word cloud.")
            return

        wc = WordCloud(
            width=800,
            height=400,
            background_color="#0A0A0F",
            colormap="Purples",
            max_words=100,
            min_font_size=10,
            max_font_size=80,
            prefer_horizontal=0.7,
        ).generate(clean_text)

        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        fig, ax = plt.subplots(figsize=(10, 5))
        ax.imshow(wc, interpolation="bilinear")
        ax.axis("off")
        fig.patch.set_facecolor("#0A0A0F")
        st.pyplot(fig, use_container_width=True)
        plt.close(fig)

    except ImportError:
        st.info(
            "📦 Biblioteca `wordcloud` não disponível. "
            "Instale com: `pip install wordcloud`"
        )


def _render_content_insights(df, metrics):
    """Renderiza cards com insights derivados do conteudo."""
    # Caption length analysis
    short_captions = df[df["caption_length"] < 100]
    long_captions = df[df["caption_length"] >= 300]

    short_eng = short_captions["engagement_rate"].mean() if len(short_captions) > 0 else 0
    long_eng = long_captions["engagement_rate"].mean() if len(long_captions) > 0 else 0

    # Hashtag count analysis
    few_hashtags = df[df["hashtag_count"] <= 3]
    many_hashtags = df[df["hashtag_count"] > 5]

    few_eng = few_hashtags["engagement_rate"].mean() if len(few_hashtags) > 0 else 0
    many_eng = many_hashtags["engagement_rate"].mean() if len(many_hashtags) > 0 else 0

    col1, col2 = st.columns(2)

    with col1:
        caption_winner = "curtas (<100 chars)" if short_eng > long_eng else "longas (300+ chars)"
        st.markdown(
            f"""<div class="insight-card">
                <div class="insight-label">Captions que Performam Melhor</div>
                <div class="insight-value" style="font-size:18px;">{caption_winner}</div>
                <div style="margin-top:8px; font-size:12px; color:{TEXT_SECONDARY};">
                    Curtas: {short_eng:.2f}% · Longas: {long_eng:.2f}%
                </div>
            </div>""",
            unsafe_allow_html=True,
        )

    with col2:
        hashtag_winner = "poucas (0-3)" if few_eng > many_eng else "muitas (5+)"
        st.markdown(
            f"""<div class="insight-card">
                <div class="insight-label">Quantidade Ideal de Hashtags</div>
                <div class="insight-value" style="font-size:18px;">{hashtag_winner}</div>
                <div style="margin-top:8px; font-size:12px; color:{TEXT_SECONDARY};">
                    0-3 tags: {few_eng:.2f}% · 5+ tags: {many_eng:.2f}%
                </div>
            </div>""",
            unsafe_allow_html=True,
        )
