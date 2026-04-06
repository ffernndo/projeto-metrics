"""Processador de dados: transforma dados brutos em DataFrames e metricas calculadas."""

from __future__ import annotations

import re
from typing import Any

import pandas as pd


def process_profile_data(raw_data: dict[str, Any]) -> dict[str, Any]:
    """Processa dados brutos do scraper e retorna metricas calculadas.

    Retorna dict com:
        - profile: info do perfil
        - df_posts: DataFrame com posts e metricas
        - metrics: KPIs calculados
    """
    profile = raw_data["profile"]
    posts = raw_data["posts"]
    followers = profile["followers"]

    # Construir DataFrame de posts
    df = pd.DataFrame(posts)

    if df.empty:
        return {
            "profile": profile,
            "df_posts": df,
            "metrics": _empty_metrics(profile),
        }

    # Converter timestamp
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["date"] = df["timestamp"].dt.date
    df["hour"] = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.day_name()
    df["day_of_week_num"] = df["timestamp"].dt.dayofweek

    # Engagement rate por post
    if followers > 0:
        df["engagement_rate"] = (df["likes"] + df["comments"]) / followers * 100
    else:
        df["engagement_rate"] = 0.0

    # Total de interacoes
    df["total_interactions"] = df["likes"] + df["comments"]

    # Tamanho da caption
    df["caption_length"] = df["caption"].str.len()

    # Extrair hashtags
    df["hashtags"] = df["caption"].apply(_extract_hashtags)
    df["hashtag_count"] = df["hashtags"].apply(len)

    # Calcular metricas agregadas
    metrics = _compute_metrics(df, profile)

    return {
        "profile": profile,
        "df_posts": df,
        "metrics": metrics,
    }


def _compute_metrics(df: pd.DataFrame, profile: dict) -> dict[str, Any]:
    """Calcula metricas agregadas a partir do DataFrame de posts."""
    followers = profile["followers"]
    following = profile["following"]

    avg_likes = df["likes"].mean()
    avg_comments = df["comments"].mean()
    avg_engagement = df["engagement_rate"].mean()
    engagement_std = df["engagement_rate"].std()

    total_likes = df["likes"].sum()
    total_comments = df["comments"].sum()

    # Like-to-comment ratio
    like_comment_ratio = total_likes / total_comments if total_comments > 0 else 0

    # Frequencia de postagem (posts por semana)
    if len(df) >= 2:
        date_range = (df["timestamp"].max() - df["timestamp"].min()).days
        posts_per_week = len(df) / max(date_range / 7, 1)
    else:
        posts_per_week = 0

    # Follower/following ratio
    ff_ratio = followers / following if following > 0 else 0

    # Melhor dia e hora
    best_day = df.groupby("day_of_week")["engagement_rate"].mean().idxmax() if len(df) > 0 else "N/A"
    best_hour = df.groupby("hour")["engagement_rate"].mean().idxmax() if len(df) > 0 else 0

    # Top hashtags
    all_hashtags = []
    for tags in df["hashtags"]:
        all_hashtags.extend(tags)

    hashtag_counts = pd.Series(all_hashtags).value_counts().head(20).to_dict() if all_hashtags else {}

    # Breakdown por tipo de midia
    type_breakdown = df["media_type"].value_counts().to_dict()
    type_engagement = df.groupby("media_type")["engagement_rate"].mean().to_dict()

    return {
        "avg_likes": round(avg_likes, 1),
        "avg_comments": round(avg_comments, 1),
        "avg_engagement_rate": round(avg_engagement, 3),
        "engagement_std": round(engagement_std, 3) if pd.notna(engagement_std) else 0,
        "total_likes": int(total_likes),
        "total_comments": int(total_comments),
        "like_comment_ratio": round(like_comment_ratio, 1),
        "posts_per_week": round(posts_per_week, 1),
        "ff_ratio": round(ff_ratio, 1),
        "best_day": best_day,
        "best_hour": int(best_hour),
        "top_hashtags": hashtag_counts,
        "type_breakdown": type_breakdown,
        "type_engagement": type_engagement,
        "total_posts_analyzed": len(df),
    }


def _empty_metrics(profile: dict) -> dict[str, Any]:
    """Retorna metricas zeradas quando nao ha posts."""
    return {
        "avg_likes": 0,
        "avg_comments": 0,
        "avg_engagement_rate": 0,
        "engagement_std": 0,
        "total_likes": 0,
        "total_comments": 0,
        "like_comment_ratio": 0,
        "posts_per_week": 0,
        "ff_ratio": profile["followers"] / max(profile["following"], 1),
        "best_day": "N/A",
        "best_hour": 0,
        "top_hashtags": {},
        "type_breakdown": {},
        "type_engagement": {},
        "total_posts_analyzed": 0,
    }


def _extract_hashtags(text: str) -> list[str]:
    """Extrai hashtags de um texto."""
    if not text:
        return []
    return re.findall(r"#(\w+)", text)
