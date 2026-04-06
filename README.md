# InstaMetrics

Dashboard de analytics publico para perfis do Instagram. Pesquise qualquer @username e visualize metricas de engajamento, analise de conteudo e padroes temporais de postagem.

## Funcionalidades

- **Pesquisa publica** — analise qualquer perfil publico do Instagram sem necessidade de login
- **Visao Geral** — KPIs de seguidores, engagement rate, media de likes, frequencia de posts
- **Analise de Posts** — ranking por engagement, distribuicao de likes/comments, breakdown por tipo de midia
- **Analise Temporal** — heatmap de horarios, melhor dia/hora para postar, frequencia semanal
- **Inteligencia de Conteudo** — caption vs engagement, analise de hashtags, word cloud
- **Modo Demo** — dados pre-carregados de perfis famosos para demonstracao instantanea

## Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Streamlit |
| Graficos | Plotly |
| Dados | Pandas |
| Scraping | Instaloader |
| Design | Obsidian (dark theme customizado) |

## Como Rodar

```bash
# Clonar repositorio
git clone https://github.com/ffernndo/projeto-metrics.git
cd projeto-metrics

# Instalar dependencias
pip install -r requirements.txt

# Rodar o dashboard
streamlit run app.py
```

## Modo Demo vs Modo Live

- **Modo Demo (padrao):** Dados simulados de @natgeo, @instagram e @cristiano. Funciona sem internet.
- **Modo Live:** Busca dados reais via Instaloader. Pode ser limitado por rate limiting do Instagram.

## Estrutura do Projeto

```
projeto-metrics/
|-- app.py                    # Entry point
|-- requirements.txt
|-- .streamlit/config.toml    # Tema Obsidian
|-- src/
|   |-- data/
|   |   |-- scraper.py        # Wrapper Instaloader
|   |   |-- processor.py      # Transformacoes Pandas
|   |   |-- mock_data.py      # Dados demo
|   |-- components/
|   |   |-- theme.py          # Design system
|   |   |-- kpi_card.py       # Card de metrica
|   |   |-- profile_card.py   # Card de perfil
|   |   |-- charts.py         # Factory Plotly
|   |-- pages/
|       |-- pg_overview.py    # Visao Geral
|       |-- pg_posts.py       # Analise de Posts
|       |-- pg_temporal.py    # Analise Temporal
|       |-- pg_content.py     # Inteligencia de Conteudo
```

## Design System Obsidian

Tema dark-first com paleta roxa/violeta, tipografia Inter + JetBrains Mono, e sistema de espacamento 8pt grid.

## Metricas Calculadas

- **Engagement Rate** = (likes + comments) / followers * 100
- **Like-to-Comment Ratio** = total likes / total comments
- **Frequencia de Postagem** = posts por semana
- **Consistencia** = desvio padrao do engagement rate

## Licenca

MIT
