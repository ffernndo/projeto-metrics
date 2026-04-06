"""Design System Obsidian - cores, CSS e template Plotly para o InstaMetrics."""

# === Paleta de Cores ===
BG_PRIMARY = "#0A0A0F"
BG_SECONDARY = "#12121A"
BG_TERTIARY = "#1A1A2E"
TEXT_PRIMARY = "#F0F0F5"
TEXT_SECONDARY = "#8888A0"
ACCENT_PRIMARY = "#6C5CE7"
ACCENT_SECONDARY = "#A855F7"
ACCENT_GRADIENT = "linear-gradient(135deg, #6C5CE7, #A855F7)"
SUCCESS = "#00D68F"
DANGER = "#FF6B6B"
WARNING = "#FDCB6E"
BORDER = "#2A2A3E"

# Cores para graficos Plotly (sequencia)
CHART_COLORS = [
    "#A855F7", "#6C5CE7", "#06B6D4", "#EC4899",
    "#00D68F", "#FDCB6E", "#FF6B6B", "#38BDF8",
    "#818CF8", "#F472B6",
]

# === Tiers de Influenciador ===
INFLUENCER_TIERS = [
    (1_000, "Nano", "#06B6D4"),
    (10_000, "Micro", "#00D68F"),
    (100_000, "Mid-Tier", "#FDCB6E"),
    (500_000, "Macro", "#EC4899"),
    (1_000_000, "Mega", "#A855F7"),
    (float("inf"), "Celebrity", "#FF6B6B"),
]


def get_influencer_tier(followers: int) -> tuple[str, str]:
    """Retorna (nome_do_tier, cor) baseado na contagem de seguidores."""
    for threshold, name, color in INFLUENCER_TIERS:
        if followers < threshold:
            return name, color
    return "Celebrity", "#FF6B6B"


# === Template Plotly ===
PLOTLY_TEMPLATE = {
    "layout": {
        "paper_bgcolor": "rgba(0,0,0,0)",
        "plot_bgcolor": "rgba(0,0,0,0)",
        "font": {"family": "Inter, sans-serif", "color": TEXT_PRIMARY, "size": 13},
        "title": {"font": {"size": 18, "color": TEXT_PRIMARY}},
        "xaxis": {
            "gridcolor": BORDER,
            "linecolor": BORDER,
            "zerolinecolor": BORDER,
        },
        "yaxis": {
            "gridcolor": BORDER,
            "linecolor": BORDER,
            "zerolinecolor": BORDER,
        },
        "colorway": CHART_COLORS,
        "hoverlabel": {
            "bgcolor": BG_TERTIARY,
            "font_size": 13,
            "font_color": TEXT_PRIMARY,
            "bordercolor": BORDER,
        },
        "margin": {"l": 40, "r": 20, "t": 50, "b": 40},
    }
}

# === CSS Custom ===
CUSTOM_CSS = """
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    /* Global */
    .stApp {
        font-family: 'Inter', sans-serif;
    }

    /* Esconder menu e footer do Streamlit */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}

    /* KPI Cards */
    .kpi-card {
        background: linear-gradient(145deg, #12121A, #1A1A2E);
        border: 1px solid #2A2A3E;
        border-radius: 12px;
        padding: 20px 24px;
        text-align: center;
        transition: all 0.2s ease;
        box-shadow: 0 4px 24px rgba(0,0,0,0.3);
    }
    .kpi-card:hover {
        border-color: #A855F7;
        box-shadow: 0 4px 32px rgba(168,85,247,0.15);
    }
    .kpi-label {
        font-size: 12px;
        font-weight: 500;
        color: #8888A0;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 8px;
    }
    .kpi-value {
        font-family: 'JetBrains Mono', monospace;
        font-size: 32px;
        font-weight: 600;
        color: #F0F0F5;
        line-height: 1.2;
    }
    .kpi-delta {
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
        margin-top: 6px;
    }
    .kpi-delta.positive { color: #00D68F; }
    .kpi-delta.negative { color: #FF6B6B; }

    /* Profile Card */
    .profile-card {
        background: linear-gradient(145deg, #12121A, #1A1A2E);
        border: 1px solid #2A2A3E;
        border-radius: 16px;
        padding: 32px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.3);
    }
    .profile-avatar {
        width: 96px;
        height: 96px;
        border-radius: 50%;
        border: 3px solid #A855F7;
        object-fit: cover;
    }
    .profile-name {
        font-size: 24px;
        font-weight: 700;
        color: #F0F0F5;
        margin: 0;
    }
    .profile-username {
        font-size: 15px;
        color: #A855F7;
        margin: 0;
    }
    .profile-bio {
        font-size: 14px;
        color: #8888A0;
        line-height: 1.5;
        margin-top: 12px;
    }
    .verified-badge {
        display: inline-block;
        background: #A855F7;
        color: white;
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 12px;
        margin-left: 8px;
        vertical-align: middle;
    }

    /* Tier Badge */
    .tier-badge {
        display: inline-block;
        font-size: 12px;
        font-weight: 600;
        padding: 4px 12px;
        border-radius: 20px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    /* Stat Row */
    .stat-row {
        display: flex;
        gap: 32px;
        margin-top: 16px;
    }
    .stat-item {
        text-align: center;
    }
    .stat-value {
        font-family: 'JetBrains Mono', monospace;
        font-size: 20px;
        font-weight: 600;
        color: #F0F0F5;
    }
    .stat-label {
        font-size: 12px;
        color: #8888A0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    /* Section Headers */
    .section-header {
        font-size: 18px;
        font-weight: 600;
        color: #F0F0F5;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid #2A2A3E;
    }

    /* Insight Card */
    .insight-card {
        background: #12121A;
        border: 1px solid #2A2A3E;
        border-radius: 10px;
        padding: 16px 20px;
        text-align: center;
    }
    .insight-value {
        font-family: 'JetBrains Mono', monospace;
        font-size: 22px;
        font-weight: 600;
        color: #A855F7;
    }
    .insight-label {
        font-size: 12px;
        color: #8888A0;
        margin-top: 4px;
    }

    /* Search */
    .search-container {
        margin-bottom: 24px;
    }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #0A0A0F; }
    ::-webkit-scrollbar-thumb { background: #2A2A3E; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #A855F7; }

    /* Demo mode banner */
    .demo-banner {
        background: linear-gradient(135deg, rgba(108,92,231,0.15), rgba(168,85,247,0.15));
        border: 1px solid rgba(168,85,247,0.3);
        border-radius: 8px;
        padding: 10px 16px;
        font-size: 13px;
        color: #A855F7;
        text-align: center;
        margin-bottom: 16px;
    }
</style>
"""


def inject_css():
    """Injeta o CSS customizado do design system Obsidian."""
    import streamlit as st
    st.markdown(CUSTOM_CSS, unsafe_allow_html=True)


def format_number(n: int | float) -> str:
    """Formata numeros grandes: 1500 -> 1.5K, 1500000 -> 1.5M."""
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.1f}K"
    return str(int(n))
