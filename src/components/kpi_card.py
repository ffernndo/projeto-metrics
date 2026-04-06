"""Componente de KPI Card reutilizavel."""

from __future__ import annotations

import streamlit as st


def render_kpi_card(label: str, value: str, icon: str = "", delta: str = "", delta_positive: bool = True):
    """Renderiza um card de KPI com label, valor, icone e delta opcional."""
    delta_html = ""
    if delta:
        delta_class = "positive" if delta_positive else "negative"
        arrow = "↑" if delta_positive else "↓"
        delta_html = f'<div class="kpi-delta {delta_class}">{arrow} {delta}</div>'

    icon_html = f'<div style="font-size:24px; margin-bottom:8px;">{icon}</div>' if icon else ""

    st.markdown(
        f"""
        <div class="kpi-card">
            {icon_html}
            <div class="kpi-label">{label}</div>
            <div class="kpi-value">{value}</div>
            {delta_html}
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_kpi_row(kpis: list[dict]):
    """Renderiza uma row de KPI cards.

    kpis: lista de dicts com keys: label, value, icon, delta, delta_positive
    """
    cols = st.columns(len(kpis))
    for col, kpi in zip(cols, kpis):
        with col:
            render_kpi_card(
                label=kpi["label"],
                value=kpi["value"],
                icon=kpi.get("icon", ""),
                delta=kpi.get("delta", ""),
                delta_positive=kpi.get("delta_positive", True),
            )
