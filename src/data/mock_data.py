"""Dados mock pre-carregados para modo demo do InstaMetrics."""

from __future__ import annotations

import random
from datetime import datetime, timedelta
from typing import Any

# Seed para reproducibilidade
random.seed(42)

_DEMO_PROFILES: dict[str, dict[str, Any]] = {}


def get_demo_profile(username: str) -> dict[str, Any] | None:
    """Retorna dados demo para o username, ou None se nao existir."""
    username = username.lower().strip()
    if not _DEMO_PROFILES:
        _generate_all_demos()
    return _DEMO_PROFILES.get(username)


def get_available_demos() -> list[str]:
    """Retorna lista de usernames demo disponiveis."""
    if not _DEMO_PROFILES:
        _generate_all_demos()
    return list(_DEMO_PROFILES.keys())


def _generate_all_demos():
    """Gera todos os perfis demo."""
    _DEMO_PROFILES["natgeo"] = _make_profile(
        username="natgeo",
        full_name="National Geographic",
        biography="Experience the world through the eyes of National Geographic photographers.",
        followers=284_000_000,
        following=152,
        media_count=32_500,
        is_verified=True,
        post_config={
            "count": 50,
            "likes_range": (200_000, 2_500_000),
            "comments_range": (500, 15_000),
            "types": ["IMAGE"] * 5 + ["CAROUSEL"] * 3 + ["VIDEO"] * 2,
            "hashtags": ["#natgeo", "#nature", "#wildlife", "#photography", "#earth",
                         "#animals", "#ocean", "#adventure", "#conservation", "#planet"],
            "caption_style": "nature",
        },
    )

    _DEMO_PROFILES["instagram"] = _make_profile(
        username="instagram",
        full_name="Instagram",
        biography="Bringing you closer to the people and things you love. ❤️",
        followers=672_000_000,
        following=75,
        media_count=7_800,
        is_verified=True,
        post_config={
            "count": 50,
            "likes_range": (500_000, 8_000_000),
            "comments_range": (2_000, 50_000),
            "types": ["IMAGE"] * 3 + ["CAROUSEL"] * 3 + ["VIDEO"] * 4,
            "hashtags": ["#instagram", "#instagood", "#reels", "#creators", "#community",
                         "#creativity", "#inspire", "#share", "#connect", "#stories"],
            "caption_style": "social",
        },
    )

    _DEMO_PROFILES["cristiano"] = _make_profile(
        username="cristiano",
        full_name="Cristiano Ronaldo",
        biography="Football player. Entrepreneur. Family man.",
        followers=636_000_000,
        following=582,
        media_count=3_800,
        is_verified=True,
        post_config={
            "count": 50,
            "likes_range": (3_000_000, 25_000_000),
            "comments_range": (15_000, 200_000),
            "types": ["IMAGE"] * 5 + ["CAROUSEL"] * 2 + ["VIDEO"] * 3,
            "hashtags": ["#cr7", "#cristiano", "#football", "#soccer", "#champion",
                         "#training", "#family", "#nike", "#alnassr", "#goat"],
            "caption_style": "sports",
        },
    )


def _make_profile(
    username: str,
    full_name: str,
    biography: str,
    followers: int,
    following: int,
    media_count: int,
    is_verified: bool,
    post_config: dict,
) -> dict[str, Any]:
    """Gera um perfil demo completo com posts simulados."""
    profile_info = {
        "username": username,
        "full_name": full_name,
        "biography": biography,
        "followers": followers,
        "following": following,
        "media_count": media_count,
        "is_verified": is_verified,
        "profile_pic_url": "",
        "external_url": f"https://www.{username}.com",
        "is_business": True,
        "business_category": "Creator",
    }

    posts = _generate_posts(post_config)

    return {
        "profile": profile_info,
        "posts": posts,
        "scraped_at": datetime.utcnow().isoformat(),
    }


_CAPTION_TEMPLATES = {
    "nature": [
        "A breathtaking view of {place}. {hashtags}",
        "Nature never ceases to amaze. 🌿 {hashtags}",
        "Captured at the perfect moment in {place}. {hashtags}",
        "The beauty of our planet is beyond words. {hashtags}",
        "Wildlife at its finest — a rare encounter in {place}. {hashtags}",
        "Sunrise over the {place} — magic in every ray. {hashtags}",
        "Deep in the heart of {place}, life thrives. {hashtags}",
        "The ocean speaks volumes. 🌊 {hashtags}",
    ],
    "social": [
        "Creativity takes many forms. What inspires you? {hashtags}",
        "Your story matters. Share it with the world. {hashtags}",
        "Made with love by our community. 💜 {hashtags}",
        "Bringing people together, one post at a time. {hashtags}",
        "New features dropping soon! Stay tuned. {hashtags}",
        "Celebrating creators who push boundaries. {hashtags}",
        "This week's spotlight: incredible work from around the globe. {hashtags}",
        "Express yourself. Create. Inspire. {hashtags}",
    ],
    "sports": [
        "Hard work always pays off. 💪 {hashtags}",
        "Another day, another victory. {hashtags}",
        "Training never stops. Focus and dedication. {hashtags}",
        "Grateful for every moment on the pitch. ⚽ {hashtags}",
        "Family first, always. ❤️ {hashtags}",
        "Champions mentality. Never give up. {hashtags}",
        "New season, same hunger. Let's go! {hashtags}",
        "Teamwork makes the dream work. {hashtags}",
    ],
}

_PLACES = [
    "the Amazon", "Patagonia", "the Serengeti", "Iceland", "the Himalayas",
    "the Great Barrier Reef", "Madagascar", "the Arctic", "Yellowstone",
    "the Galápagos Islands", "Norwegian Fjords", "Mount Fuji",
]


def _generate_posts(config: dict) -> list[dict[str, Any]]:
    """Gera lista de posts simulados."""
    count = config["count"]
    likes_min, likes_max = config["likes_range"]
    comments_min, comments_max = config["comments_range"]
    types = config["types"]
    hashtags = config["hashtags"]
    style = config["caption_style"]

    posts = []
    base_date = datetime.utcnow()

    for i in range(count):
        # Posts distribuidos ao longo dos ultimos ~180 dias
        days_ago = random.uniform(0, 180)
        post_date = base_date - timedelta(days=days_ago)
        # Horarios variados com tendencia para horarios comerciais
        hour = random.choices(
            range(24),
            weights=[1, 1, 1, 1, 1, 2, 3, 4, 5, 6, 6, 7, 8, 7, 6, 5, 6, 7, 8, 7, 5, 3, 2, 1],
        )[0]
        post_date = post_date.replace(hour=hour, minute=random.randint(0, 59))

        # Tipo de midia
        media_type = random.choice(types)
        is_video = media_type == "VIDEO"

        # Engagement com variacao realista
        base_likes = random.randint(likes_min, likes_max)
        # Posts de video tendem a ter mais interacao
        if is_video:
            base_likes = int(base_likes * random.uniform(1.1, 1.5))
        likes = base_likes
        comments = random.randint(comments_min, comments_max)

        # Caption
        num_tags = random.randint(3, 7)
        selected_tags = " ".join(random.sample(hashtags, min(num_tags, len(hashtags))))
        templates = _CAPTION_TEMPLATES[style]
        caption = random.choice(templates).format(
            place=random.choice(_PLACES),
            hashtags=selected_tags,
        )

        shortcode = f"demo_{username_hash(i)}"

        posts.append({
            "shortcode": shortcode,
            "caption": caption,
            "likes": likes,
            "comments": comments,
            "timestamp": post_date.isoformat(),
            "media_type": media_type,
            "url": f"https://www.instagram.com/p/{shortcode}/",
            "thumbnail_url": "",
            "is_video": is_video,
            "video_view_count": random.randint(likes * 2, likes * 5) if is_video else None,
        })

    # Ordenar por data (mais recente primeiro)
    posts.sort(key=lambda p: p["timestamp"], reverse=True)
    return posts


def username_hash(index: int) -> str:
    """Gera um shortcode fake baseado no index."""
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    result = []
    n = index + 1000
    while n > 0:
        result.append(chars[n % len(chars)])
        n //= len(chars)
    return "".join(result).ljust(6, "A")
