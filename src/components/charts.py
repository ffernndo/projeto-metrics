"""Factory functions Plotly com tema Obsidian para graficos consistentes."""

from __future__ import annotations

import plotly.express as px
import plotly.graph_objects as go
import pandas as pd

from src.components.theme import (
    PLOTLY_TEMPLATE,
    CHART_COLORS,
    BG_SECONDARY,
    BG_TERTIARY,
    BORDER,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    ACCENT_PRIMARY,
    ACCENT_SECONDARY,
    SUCCESS,
    DANGER,
)


def _apply_template(fig: go.Figure) -> go.Figure:
    """Aplica o template Obsidian a uma figura Plotly."""
    fig.update_layout(**PLOTLY_TEMPLATE["layout"])
    return fig


def engagement_line_chart(df: pd.DataFrame) -> go.Figure:
    """Line chart de engagement rate ao longo do tempo."""
    df_sorted = df.sort_values("timestamp")

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=df_sorted["timestamp"],
        y=df_sorted["engagement_rate"],
        mode="lines+markers",
        name="Engagement Rate",
        line={"color": ACCENT_SECONDARY, "width": 2},
        marker={"size": 5, "color": ACCENT_SECONDARY},
        hovertemplate="<b>%{x|%d/%m/%Y}</b><br>Engagement: %{y:.2f}%<extra></extra>",
    ))

    # Media movel (7 posts)
    if len(df_sorted) >= 7:
        rolling = df_sorted["engagement_rate"].rolling(7).mean()
        fig.add_trace(go.Scatter(
            x=df_sorted["timestamp"],
            y=rolling,
            mode="lines",
            name="Média Móvel (7)",
            line={"color": ACCENT_PRIMARY, "width": 2, "dash": "dash"},
            hovertemplate="<b>%{x|%d/%m/%Y}</b><br>Média: %{y:.2f}%<extra></extra>",
        ))

    fig.update_layout(
        title="Taxa de Engagement ao Longo do Tempo",
        xaxis_title="",
        yaxis_title="Engagement Rate (%)",
        showlegend=True,
        legend={"orientation": "h", "y": -0.15},
        height=350,
    )
    return _apply_template(fig)


def likes_comments_bar(df: pd.DataFrame) -> go.Figure:
    """Bar chart horizontal dos top posts por engagement."""
    top = df.nlargest(10, "engagement_rate").sort_values("engagement_rate")

    fig = go.Figure()
    fig.add_trace(go.Bar(
        y=[f"Post {i+1}" for i in range(len(top))],
        x=top["likes"],
        name="Likes",
        orientation="h",
        marker_color=ACCENT_SECONDARY,
        hovertemplate="Likes: %{x:,.0f}<extra></extra>",
    ))
    fig.add_trace(go.Bar(
        y=[f"Post {i+1}" for i in range(len(top))],
        x=top["comments"],
        name="Comments",
        orientation="h",
        marker_color=ACCENT_PRIMARY,
        hovertemplate="Comments: %{x:,.0f}<extra></extra>",
    ))

    fig.update_layout(
        title="Top 10 Posts por Engagement",
        barmode="stack",
        xaxis_title="Interações",
        yaxis_title="",
        height=400,
        showlegend=True,
        legend={"orientation": "h", "y": -0.15},
    )
    return _apply_template(fig)


def media_type_pie(df: pd.DataFrame) -> go.Figure:
    """Pie chart de distribuicao por tipo de midia."""
    type_counts = df["media_type"].value_counts()

    colors = {
        "IMAGE": CHART_COLORS[0],
        "VIDEO": CHART_COLORS[2],
        "CAROUSEL": CHART_COLORS[3],
    }
    marker_colors = [colors.get(t, CHART_COLORS[4]) for t in type_counts.index]

    fig = go.Figure(go.Pie(
        labels=type_counts.index,
        values=type_counts.values,
        hole=0.45,
        marker={"colors": marker_colors, "line": {"color": BG_SECONDARY, "width": 2}},
        textinfo="label+percent",
        textfont={"size": 13, "color": TEXT_PRIMARY},
        hovertemplate="<b>%{label}</b><br>%{value} posts (%{percent})<extra></extra>",
    ))

    fig.update_layout(
        title="Distribuição por Tipo de Conteúdo",
        showlegend=False,
        height=350,
    )
    return _apply_template(fig)


def posting_heatmap(df: pd.DataFrame) -> go.Figure:
    """Heatmap de dia da semana x hora de postagem."""
    days_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    days_pt = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]

    # Criar matrix dia x hora
    pivot = df.groupby(["day_of_week", "hour"]).size().reset_index(name="count")
    matrix = pd.DataFrame(0, index=days_order, columns=range(24))

    for _, row in pivot.iterrows():
        if row["day_of_week"] in days_order:
            matrix.loc[row["day_of_week"], row["hour"]] = row["count"]

    fig = go.Figure(go.Heatmap(
        z=matrix.values,
        x=[f"{h:02d}h" for h in range(24)],
        y=days_pt,
        colorscale=[
            [0, BG_TERTIARY],
            [0.5, ACCENT_PRIMARY],
            [1, ACCENT_SECONDARY],
        ],
        hovertemplate="<b>%{y}</b> às <b>%{x}</b><br>%{z} post(s)<extra></extra>",
        showscale=True,
        colorbar={"title": "Posts", "titlefont": {"color": TEXT_SECONDARY}},
    ))

    fig.update_layout(
        title="Padrão de Postagem (Dia x Hora)",
        xaxis_title="Hora do Dia",
        yaxis_title="",
        height=350,
    )
    return _apply_template(fig)


def engagement_by_day(df: pd.DataFrame) -> go.Figure:
    """Bar chart de engagement medio por dia da semana."""
    days_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    days_pt = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

    avg_by_day = df.groupby("day_of_week")["engagement_rate"].mean().reindex(days_order).fillna(0)
    max_day = avg_by_day.idxmax()

    colors = [
        ACCENT_SECONDARY if day == max_day else ACCENT_PRIMARY
        for day in days_order
    ]

    fig = go.Figure(go.Bar(
        x=days_pt,
        y=avg_by_day.values,
        marker_color=colors,
        hovertemplate="<b>%{x}</b><br>Engagement: %{y:.2f}%<extra></extra>",
    ))

    fig.update_layout(
        title="Engagement Médio por Dia da Semana",
        xaxis_title="",
        yaxis_title="Engagement Rate (%)",
        height=350,
    )
    return _apply_template(fig)


def engagement_by_hour(df: pd.DataFrame) -> go.Figure:
    """Bar chart de engagement medio por hora do dia."""
    avg_by_hour = df.groupby("hour")["engagement_rate"].mean().reindex(range(24)).fillna(0)
    max_hour = avg_by_hour.idxmax()

    colors = [
        ACCENT_SECONDARY if h == max_hour else ACCENT_PRIMARY
        for h in range(24)
    ]

    fig = go.Figure(go.Bar(
        x=[f"{h:02d}h" for h in range(24)],
        y=avg_by_hour.values,
        marker_color=colors,
        hovertemplate="<b>%{x}</b><br>Engagement: %{y:.2f}%<extra></extra>",
    ))

    fig.update_layout(
        title="Engagement Médio por Hora do Dia",
        xaxis_title="",
        yaxis_title="Engagement Rate (%)",
        height=350,
    )
    return _apply_template(fig)


def caption_vs_engagement(df: pd.DataFrame) -> go.Figure:
    """Scatter plot de tamanho da caption vs engagement rate."""
    fig = go.Figure(go.Scatter(
        x=df["caption_length"],
        y=df["engagement_rate"],
        mode="markers",
        marker={
            "size": 8,
            "color": df["total_interactions"],
            "colorscale": [[0, ACCENT_PRIMARY], [1, ACCENT_SECONDARY]],
            "showscale": True,
            "colorbar": {"title": "Interações"},
            "line": {"width": 1, "color": BORDER},
        },
        hovertemplate=(
            "<b>Caption:</b> %{x} chars<br>"
            "<b>Engagement:</b> %{y:.2f}%<br>"
            "<b>Interações:</b> %{marker.color:,.0f}"
            "<extra></extra>"
        ),
    ))

    fig.update_layout(
        title="Tamanho da Caption vs Engagement",
        xaxis_title="Caracteres na Caption",
        yaxis_title="Engagement Rate (%)",
        height=400,
    )
    return _apply_template(fig)


def hashtag_bar(top_hashtags: dict[str, int], n: int = 15) -> go.Figure:
    """Bar chart horizontal dos top hashtags."""
    items = sorted(top_hashtags.items(), key=lambda x: x[1], reverse=True)[:n]
    if not items:
        fig = go.Figure()
        fig.update_layout(title="Top Hashtags", annotations=[{
            "text": "Nenhuma hashtag encontrada",
            "xref": "paper", "yref": "paper",
            "x": 0.5, "y": 0.5, "showarrow": False,
            "font": {"size": 16, "color": TEXT_SECONDARY},
        }])
        return _apply_template(fig)

    tags, counts = zip(*reversed(items))

    fig = go.Figure(go.Bar(
        y=[f"#{t}" for t in tags],
        x=counts,
        orientation="h",
        marker_color=ACCENT_SECONDARY,
        hovertemplate="<b>#%{y}</b><br>%{x} uso(s)<extra></extra>",
    ))

    fig.update_layout(
        title="Hashtags Mais Utilizadas",
        xaxis_title="Frequência",
        yaxis_title="",
        height=max(300, len(items) * 28),
    )
    return _apply_template(fig)


def engagement_distribution(df: pd.DataFrame) -> go.Figure:
    """Histograma de distribuicao de engagement rate."""
    fig = go.Figure(go.Histogram(
        x=df["engagement_rate"],
        nbinsx=20,
        marker_color=ACCENT_SECONDARY,
        marker_line={"color": BG_SECONDARY, "width": 1},
        hovertemplate="Engagement: %{x:.2f}%<br>Posts: %{y}<extra></extra>",
    ))

    # Linha de media
    avg = df["engagement_rate"].mean()
    fig.add_vline(
        x=avg,
        line_dash="dash",
        line_color=DANGER,
        annotation_text=f"Média: {avg:.2f}%",
        annotation_font_color=DANGER,
    )

    fig.update_layout(
        title="Distribuição de Engagement Rate",
        xaxis_title="Engagement Rate (%)",
        yaxis_title="Número de Posts",
        height=350,
    )
    return _apply_template(fig)


def posting_frequency(df: pd.DataFrame) -> go.Figure:
    """Line chart de frequencia de postagem ao longo do tempo (por semana)."""
    df_sorted = df.sort_values("timestamp").copy()
    df_sorted["week"] = df_sorted["timestamp"].dt.to_period("W").dt.start_time

    weekly = df_sorted.groupby("week").size().reset_index(name="posts")

    fig = go.Figure(go.Scatter(
        x=weekly["week"],
        y=weekly["posts"],
        mode="lines+markers",
        line={"color": ACCENT_SECONDARY, "width": 2},
        marker={"size": 6, "color": ACCENT_SECONDARY},
        fill="tozeroy",
        fillcolor=f"rgba(168,85,247,0.1)",
        hovertemplate="<b>%{x|%d/%m/%Y}</b><br>%{y} post(s)<extra></extra>",
    ))

    fig.update_layout(
        title="Frequência de Postagem por Semana",
        xaxis_title="",
        yaxis_title="Posts por Semana",
        height=350,
    )
    return _apply_template(fig)


def type_engagement_comparison(df: pd.DataFrame) -> go.Figure:
    """Bar chart comparando engagement por tipo de midia."""
    type_eng = df.groupby("media_type").agg(
        avg_engagement=("engagement_rate", "mean"),
        count=("engagement_rate", "size"),
    ).reset_index()

    colors = {
        "IMAGE": CHART_COLORS[0],
        "VIDEO": CHART_COLORS[2],
        "CAROUSEL": CHART_COLORS[3],
    }

    fig = go.Figure(go.Bar(
        x=type_eng["media_type"],
        y=type_eng["avg_engagement"],
        marker_color=[colors.get(t, CHART_COLORS[4]) for t in type_eng["media_type"]],
        text=[f"{v:.2f}%" for v in type_eng["avg_engagement"]],
        textposition="outside",
        textfont={"color": TEXT_PRIMARY},
        hovertemplate="<b>%{x}</b><br>Engagement: %{y:.2f}%<br>Posts: %{customdata}<extra></extra>",
        customdata=type_eng["count"],
    ))

    fig.update_layout(
        title="Engagement Médio por Tipo de Conteúdo",
        xaxis_title="",
        yaxis_title="Engagement Rate (%)",
        height=350,
    )
    return _apply_template(fig)
