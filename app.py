"""InstaMetrics - Instagram Public Analytics Dashboard."""

import streamlit as st

from src.components.theme import inject_css, ACCENT_SECONDARY, TEXT_SECONDARY


def main():
    st.set_page_config(
        page_title="InstaMetrics",
        page_icon="📊",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    inject_css()

    # --- Sidebar ---
    with st.sidebar:
        st.markdown(
            f"""
            <div style="text-align:center; padding: 16px 0;">
                <h1 style="font-size:28px; font-weight:700; margin:0;">
                    <span style="color:{ACCENT_SECONDARY};">Insta</span>Metrics
                </h1>
                <p style="color:{TEXT_SECONDARY}; font-size:13px; margin:4px 0 0;">
                    Public Instagram Analytics
                </p>
            </div>
            """,
            unsafe_allow_html=True,
        )

        st.divider()

        # Modo demo toggle
        demo_mode = st.toggle("Modo Demo", value=True, help="Usar dados de exemplo pré-carregados")
        st.session_state["demo_mode"] = demo_mode

        # Search input
        st.markdown("#### Pesquisar Perfil")
        username_input = st.text_input(
            "Digite o @username",
            placeholder="ex: natgeo",
            label_visibility="collapsed",
        )

        if username_input:
            # Limpar @ se o usuario incluiu
            clean_username = username_input.strip().lstrip("@").lower()
            if clean_username:
                st.session_state["search_username"] = clean_username

        search_clicked = st.button(
            "🔍 Analisar Perfil",
            use_container_width=True,
            type="primary",
        )

        if search_clicked and st.session_state.get("search_username"):
            st.session_state["trigger_search"] = True

        st.divider()

        # Navegacao
        page = st.radio(
            "Navegação",
            ["Visão Geral", "Análise de Posts", "Análise Temporal", "Inteligência de Conteúdo"],
            label_visibility="collapsed",
        )

        st.divider()

        # Footer
        st.markdown(
            f"""
            <div style="text-align:center; padding:8px 0;">
                <p style="color:{TEXT_SECONDARY}; font-size:11px;">
                    InstaMetrics v1.0<br>
                    Dados públicos via Instaloader
                </p>
            </div>
            """,
            unsafe_allow_html=True,
        )

    # --- Conteudo Principal ---

    # Verificar se ha dados carregados
    has_data = "profile_data" in st.session_state and st.session_state["profile_data"] is not None

    # Trigger de busca
    if st.session_state.get("trigger_search"):
        st.session_state["trigger_search"] = False
        username = st.session_state.get("search_username", "")

        if username:
            if st.session_state.get("demo_mode"):
                _load_demo_data(username)
            else:
                _load_live_data(username)

    # Demo banner
    if st.session_state.get("demo_mode") and has_data:
        st.markdown(
            '<div class="demo-banner">📋 Modo Demo — Exibindo dados de exemplo pré-carregados</div>',
            unsafe_allow_html=True,
        )

    # Renderizar pagina
    if not has_data:
        _show_welcome()
    elif page == "Visão Geral":
        from src.pages.pg_overview import render
        render()
    elif page == "Análise de Posts":
        from src.pages.pg_posts import render
        render()
    elif page == "Análise Temporal":
        from src.pages.pg_temporal import render
        render()
    elif page == "Inteligência de Conteúdo":
        from src.pages.pg_content import render
        render()


def _show_welcome():
    """Tela de boas-vindas quando nenhum perfil foi carregado."""
    st.markdown("<br>" * 2, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown(
            f"""
            <div style="text-align:center; padding:48px 0;">
                <h1 style="font-size:42px; font-weight:700; margin-bottom:8px;">
                    <span style="color:{ACCENT_SECONDARY};">Insta</span>Metrics
                </h1>
                <p style="color:{TEXT_SECONDARY}; font-size:18px; margin-bottom:32px;">
                    Analise métricas públicas de qualquer perfil do Instagram
                </p>
                <div style="background:#12121A; border:1px solid #2A2A3E; border-radius:12px; padding:32px; text-align:left;">
                    <h3 style="color:#F0F0F5; font-size:16px; margin-bottom:16px;">Como usar:</h3>
                    <ol style="color:#8888A0; font-size:14px; line-height:2;">
                        <li>Ative o <strong style="color:#A855F7;">Modo Demo</strong> na sidebar para dados de exemplo</li>
                        <li>Digite um <strong style="color:#A855F7;">@username</strong> na barra de pesquisa</li>
                        <li>Clique em <strong style="color:#A855F7;">Analisar Perfil</strong></li>
                        <li>Navegue pelas páginas de análise</li>
                    </ol>
                    <p style="color:#8888A0; font-size:13px; margin-top:16px;">
                        <strong>Perfis demo disponíveis:</strong> natgeo, instagram, cristiano
                    </p>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def _load_demo_data(username: str):
    """Carrega dados demo para o username."""
    from src.data.mock_data import get_demo_profile
    from src.data.processor import process_profile_data

    data = get_demo_profile(username)
    if data is None:
        st.sidebar.error(f"Perfil demo '{username}' não encontrado. Tente: natgeo, instagram, cristiano")
        return

    processed = process_profile_data(data)
    st.session_state["profile_data"] = processed
    st.session_state["raw_data"] = data


def _load_live_data(username: str):
    """Carrega dados reais via Instaloader."""
    from src.data.scraper import scrape_profile

    with st.spinner(f"Buscando dados de @{username}..."):
        data = scrape_profile(username)

    if data is None:
        st.sidebar.error(
            f"Não foi possível carregar @{username}. "
            "O perfil pode ser privado ou o Instagram bloqueou a requisição. "
            "Tente ativar o Modo Demo."
        )
        return

    from src.data.processor import process_profile_data
    processed = process_profile_data(data)
    st.session_state["profile_data"] = processed
    st.session_state["raw_data"] = data


if __name__ == "__main__":
    main()
