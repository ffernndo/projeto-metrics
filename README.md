# InstaMetrics

**[Acessar Aplicacao](https://ffernndo.github.io/projeto-metrics/)**

Dashboard de analytics publico para perfis do Instagram. Pesquise qualquer @username e visualize metricas de engajamento, analise de conteudo e padroes temporais de postagem.

## Funcionalidades

- **Pesquisa publica** — analise qualquer perfil publico do Instagram sem necessidade de login
- **Visao Geral** — KPIs de seguidores, engagement rate, media de likes, frequencia de posts
- **Analise de Posts** — ranking por engagement, distribuicao de likes/comments, breakdown por tipo de midia
- **Analise Temporal** — heatmap de horarios, melhor dia/hora para postar, frequencia semanal
- **Inteligencia de Conteudo** — caption vs engagement, analise de hashtags, comparacao por tipo de midia

## Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML/CSS/JavaScript |
| Graficos | Plotly.js |
| Proxy API | Cloudflare Workers |
| Design | Portfolio Design System (dark theme) |
| Deploy | GitHub Pages |

## Arquitetura

```
Browser (GitHub Pages) → Cloudflare Worker → Instagram → JSON → Dashboard
```

O Cloudflare Worker busca a pagina publica do Instagram, extrai dados dos meta tags (seguidores, seguindo, posts, nome, bio) e retorna JSON limpo para o frontend.

## Metricas Calculadas

- **Engagement Rate** = (likes + comments) / followers * 100
- **Like-to-Comment Ratio** = total likes / total comments
- **Frequencia de Postagem** = posts por semana
- **Consistencia** = desvio padrao do engagement rate

## Estrutura do Projeto

```
projeto-metrics/
|-- docs/                     # Frontend (GitHub Pages)
|   |-- index.html            # SPA principal
|   |-- css/style.css         # Design system
|   |-- js/app.js             # Logica da aplicacao
|   |-- js/charts.js          # Graficos Plotly.js
|-- worker/                   # Cloudflare Worker (proxy API)
|   |-- index.js              # Worker que busca dados do Instagram
|   |-- wrangler.toml         # Configuracao de deploy
|-- src/                      # Versao Python/Streamlit (alternativa)
```

## Licenca

MIT
