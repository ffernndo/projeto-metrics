"""Wrapper do Instaloader para buscar dados publicos de perfis Instagram."""

from __future__ import annotations

import time
from datetime import datetime
from typing import Any

import streamlit as st


@st.cache_data(ttl=3600, show_spinner=False)
def scrape_profile(username: str, max_posts: int = 50) -> dict[str, Any] | None:
    """Busca dados publicos de um perfil Instagram via Instaloader.

    Retorna dict com profile_info e posts, ou None em caso de erro.
    """
    try:
        import instaloader

        loader = instaloader.Instaloader(
            download_pictures=False,
            download_videos=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False,
            quiet=True,
        )

        profile = instaloader.Profile.from_username(loader.context, username)

        if profile.is_private:
            return None

        # Dados do perfil
        profile_info = {
            "username": profile.username,
            "full_name": profile.full_name or profile.username,
            "biography": profile.biography or "",
            "followers": profile.followers,
            "following": profile.followees,
            "media_count": profile.mediacount,
            "is_verified": profile.is_verified,
            "profile_pic_url": str(profile.profile_pic_url),
            "external_url": profile.external_url or "",
            "is_business": profile.is_business_account,
            "business_category": profile.business_category_name or "",
        }

        # Buscar posts
        posts = []
        progress_bar = st.progress(0, text="Buscando posts...")

        for i, post in enumerate(profile.get_posts()):
            if i >= max_posts:
                break

            posts.append({
                "shortcode": post.shortcode,
                "caption": post.caption or "",
                "likes": post.likes,
                "comments": post.comments,
                "timestamp": post.date_utc.isoformat(),
                "media_type": _get_media_type(post),
                "url": f"https://www.instagram.com/p/{post.shortcode}/",
                "thumbnail_url": str(post.url),
                "is_video": post.is_video,
                "video_view_count": post.video_view_count if post.is_video else None,
            })

            progress_bar.progress(
                (i + 1) / max_posts,
                text=f"Buscando posts... {i + 1}/{max_posts}",
            )

            # Delay para evitar rate limiting
            if (i + 1) % 10 == 0:
                time.sleep(1)

        progress_bar.empty()

        return {
            "profile": profile_info,
            "posts": posts,
            "scraped_at": datetime.utcnow().isoformat(),
        }

    except Exception:
        return None


def _get_media_type(post) -> str:
    """Determina o tipo de midia do post."""
    if post.typename == "GraphSidecar":
        return "CAROUSEL"
    if post.is_video:
        return "VIDEO"
    return "IMAGE"
