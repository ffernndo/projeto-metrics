"""Componente de card de perfil do Instagram."""

from __future__ import annotations

from typing import Any

import streamlit as st

from src.components.theme import format_number, get_influencer_tier


def render_profile_card(profile: dict[str, Any]):
    """Renderiza o card de perfil com avatar, nome, bio e stats."""
    username = profile["username"]
    full_name = profile["full_name"]
    bio = profile["biography"]
    followers = profile["followers"]
    following = profile["following"]
    media_count = profile["media_count"]
    is_verified = profile["is_verified"]
    pic_url = profile.get("profile_pic_url", "")

    tier_name, tier_color = get_influencer_tier(followers)
    verified_html = '<span class="verified-badge">✓ Verificado</span>' if is_verified else ""

    # Avatar ou placeholder
    avatar_html = (
        f'<img src="{pic_url}" class="profile-avatar" alt="{username}">'
        if pic_url
        else f'<div class="profile-avatar" style="background:{tier_color}; display:flex; align-items:center; justify-content:center; font-size:36px; color:white;">{full_name[0].upper()}</div>'
    )

    st.markdown(
        f"""
        <div class="profile-card">
            <div style="display:flex; align-items:center; gap:24px;">
                {avatar_html}
                <div>
                    <p class="profile-name">{full_name} {verified_html}</p>
                    <p class="profile-username">@{username}</p>
                    <span class="tier-badge" style="background:{tier_color}22; color:{tier_color}; border:1px solid {tier_color}44; margin-top:8px;">
                        {tier_name}
                    </span>
                </div>
            </div>
            <p class="profile-bio">{bio}</p>
            <div class="stat-row">
                <div class="stat-item">
                    <div class="stat-value">{format_number(followers)}</div>
                    <div class="stat-label">Seguidores</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{format_number(following)}</div>
                    <div class="stat-label">Seguindo</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{format_number(media_count)}</div>
                    <div class="stat-label">Posts</div>
                </div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
