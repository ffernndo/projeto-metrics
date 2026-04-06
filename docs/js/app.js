// ═══════════════════════════════════════
// InstaMetrics — App Principal
// ═══════════════════════════════════════

let currentProfile = null, currentTab = "overview", cache = {};
let postSortCol = "engagement_rate", postSortAsc = false;
let welcomeHTML = "";

// ═══════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════

function fmt(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return String(Math.round(n));
}

function parseMetric(s) {
    if (!s) return 0;
    s = s.replace(/,/g, "").trim();
    const m = s.match(/([\d.]+)\s*(M|K|m|k)?/);
    if (!m) return 0;
    let v = parseFloat(m[1]);
    if (m[2] === "M" || m[2] === "m") v *= 1e6;
    if (m[2] === "K" || m[2] === "k") v *= 1e3;
    return Math.round(v);
}

function getTier(f) {
    if (f < 1e4) return { n: "Nano", c: "#5eead4" };
    if (f < 1e5) return { n: "Micro", c: "#3fb950" };
    if (f < 5e5) return { n: "Mid-Tier", c: "#d29922" };
    if (f < 1e6) return { n: "Macro", c: "#58a6ff" };
    return { n: "Mega", c: "#bc8cff" };
}

function extractHashtags(t) { return (t.match(/#(\w+)/g) || []).map(h => h.slice(1)); }

function setStatus(msg, type) {
    const el = document.getElementById("status-bar");
    el.className = "status-bar" + (type ? " " + type : "");
    el.textContent = msg;
}

function showError(title, msg) {
    document.getElementById("loading").style.display = "none";
    document.getElementById("welcome").style.display = "none";
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    const sec = document.getElementById("sec-overview");
    sec.classList.add("active");
    sec.innerHTML = '<div class="error-state"><div class="error-state-icon">⚠️</div>'
        + '<div class="error-state-title">' + title + '</div>'
        + '<div class="error-state-msg">' + msg + '</div></div>';
    setStatus(title, "error");
}

// ═══════════════════════════════════════
// FETCH — CLOUDFLARE WORKER + CORS PROXIES
// ═══════════════════════════════════════

const WORKER_URL = "https://atualizador.fernando-cezar-f-s.workers.dev";

function proxyImg(url) {
    if (!url) return "";
    return WORKER_URL + "?img=" + encodeURIComponent(url);
}

async function fetchLiveProfile(username) {
    // Metodo 1: Cloudflare Worker
    try {
        const r = await fetch(WORKER_URL + "?username=" + encodeURIComponent(username), { signal: AbortSignal.timeout(10000) });
        if (r.ok) {
            const data = await r.json();
            if (data && data.profile && data.profile.followers > 0) return data;
            if (data && data.error) {
                if (data.error.includes("nao encontrado") || data.error.includes("privado")) throw new Error("NOT_FOUND");
            }
        }
        if (r.status === 404) throw new Error("NOT_FOUND");
    } catch (e) {
        if (e.message === "NOT_FOUND") throw e;
    }
    // Metodo 2: Fallback CORS proxies
    const proxies = [
        u => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
        u => "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(u),
    ];
    const igUrl = "https://www.instagram.com/" + username + "/";
    for (const proxy of proxies) {
        try {
            const r = await fetch(proxy(igUrl), { signal: AbortSignal.timeout(8000) });
            if (!r.ok) continue;
            const html = await r.text();
            if (!html || html.length < 500) continue;
            const data = parseInstagramHTML(html, username);
            if (data && data.profile.followers > 0) return data;
        } catch (e) { continue; }
    }
    return null;
}

function parseInstagramHTML(html, username) {
    const p = { username, full_name: "", biography: "", followers: 0, following: 0, media_count: 0, is_verified: false, profile_pic_url: "", external_url: "", is_business: false };
    const descMatch = html.match(/<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/i) || html.match(/content="([^"]+)"\s+(?:property|name)="og:description"/i);
    if (descMatch) {
        const desc = descMatch[1];
        const parts = desc.match(/([\d.,]+[MKmk]?)\s*Followers?,?\s*([\d.,]+[MKmk]?)\s*Following,?\s*([\d.,]+[MKmk]?)\s*Posts?/i);
        if (parts) { p.followers = parseMetric(parts[1]); p.following = parseMetric(parts[2]); p.media_count = parseMetric(parts[3]); }
        const nameFromDesc = desc.match(/from\s+(.+?)\s*\(@/);
        if (nameFromDesc) p.full_name = nameFromDesc[1].trim();
    }
    const titleMatch = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i);
    if (titleMatch) {
        const t = titleMatch[1];
        const nameFromTitle = t.match(/^(.+?)\s*\(@/);
        if (nameFromTitle && !p.full_name) p.full_name = nameFromTitle[1].trim();
    }
    const imgMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i);
    if (imgMatch) p.profile_pic_url = imgMatch[1];
    if (!p.full_name) p.full_name = username;
    if (p.followers === 0) return null;
    let posts = null;
    try {
        const sdMatch = html.match(/window\._sharedData\s*=\s*({.+?});\s*<\/script>/s);
        if (sdMatch) {
            const sd = JSON.parse(sdMatch[1]);
            const user = sd.entry_data?.ProfilePage?.[0]?.graphql?.user;
            if (user) {
                if (user.is_verified) p.is_verified = true;
                if (user.biography) p.biography = user.biography;
                if (user.full_name) p.full_name = user.full_name;
                if (user.profile_pic_url_hd) p.profile_pic_url = user.profile_pic_url_hd;
                const edges = user.edge_owner_to_timeline_media?.edges || [];
                if (edges.length > 0) {
                    posts = edges.map(e => {
                        const n = e.node; const isV = n.is_video || false;
                        let mt = "IMAGE"; if (n.__typename === "GraphSidecar") mt = "CAROUSEL"; else if (isV) mt = "VIDEO";
                        return { caption: (n.edge_media_to_caption?.edges?.[0]?.node?.text) || "", likes: n.edge_liked_by?.count || n.edge_media_preview_like?.count || 0, comments: n.edge_media_to_comment?.count || 0, timestamp: new Date(n.taken_at_timestamp * 1000).toISOString(), media_type: mt, is_video: isV, video_view_count: n.video_view_count || null };
                    });
                }
            }
        }
    } catch (e) {}
    return { profile: p, posts };
}

// ═══════════════════════════════════════
// PROCESSAMENTO DE DADOS
// ═══════════════════════════════════════

function processData(raw) {
    const pr = raw.profile, f = pr.followers;
    const posts = (raw.posts && raw.posts.length > 0) ? raw.posts : [];
    if (posts.length === 0) {
        return { profile: pr, posts: [], metrics: { avgLikes: 0, avgComments: 0, avgEngagement: 0, totalLikes: 0, totalComments: 0, lcRatio: 0, ppw: 0, ffRatio: pr.following > 0 ? Math.round(pr.followers / pr.following) : 0, bestDay: "N/A", bestHour: 0, topHashtags: {}, total: 0, shortEng: 0, longEng: 0, fewEng: 0, manyEng: 0 } };
    }
    const df = posts.map(p => {
        const dt = new Date(p.timestamp);
        return { ...p, date: dt, hour: dt.getHours(), dow: (dt.getDay() + 6) % 7, engagement_rate: f > 0 ? (p.likes + p.comments) / f * 100 : 0, total_interactions: p.likes + p.comments, hashtags: extractHashtags(p.caption) };
    });
    const aL = df.reduce((s, p) => s + p.likes, 0) / df.length;
    const aC = df.reduce((s, p) => s + p.comments, 0) / df.length;
    const aE = df.reduce((s, p) => s + p.engagement_rate, 0) / df.length;
    const tL = df.reduce((s, p) => s + p.likes, 0), tC = df.reduce((s, p) => s + p.comments, 0);
    const lcR = tC > 0 ? Math.round(tL / tC) : 0;
    let ppw = 0;
    if (df.length >= 2) { const dates = df.map(p => p.date.getTime()); const range = (Math.max(...dates) - Math.min(...dates)) / 864e5; ppw = df.length / Math.max(range / 7, 1); }
    const ffR = pr.following > 0 ? Math.round(pr.followers / pr.following) : 0;
    const dayE = {}, hourE = {};
    const dayN = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];
    df.forEach(p => { const d = p.date.getDay(); if (!dayE[d]) dayE[d] = []; dayE[d].push(p.engagement_rate); const h = p.hour; if (!hourE[h]) hourE[h] = []; hourE[h].push(p.engagement_rate); });
    let bDay = "N/A", bDayV = 0;
    Object.entries(dayE).forEach(([d, r]) => { const a = r.reduce((x, y) => x + y, 0) / r.length; if (a > bDayV) { bDayV = a; bDay = dayN[parseInt(d)]; } });
    let bHour = 0, bHourV = 0;
    Object.entries(hourE).forEach(([h, r]) => { const a = r.reduce((x, y) => x + y, 0) / r.length; if (a > bHourV) { bHourV = a; bHour = parseInt(h); } });
    const htC = {}; df.forEach(p => p.hashtags.forEach(h => { htC[h] = (htC[h] || 0) + 1; }));
    const shortC = df.filter(p => p.caption.length < 100), longC = df.filter(p => p.caption.length >= 300);
    const sE = shortC.length > 0 ? shortC.reduce((s, p) => s + p.engagement_rate, 0) / shortC.length : 0;
    const lE = longC.length > 0 ? longC.reduce((s, p) => s + p.engagement_rate, 0) / longC.length : 0;
    const fewH = df.filter(p => p.hashtags.length <= 3), manyH = df.filter(p => p.hashtags.length > 5);
    const fE = fewH.length > 0 ? fewH.reduce((s, p) => s + p.engagement_rate, 0) / fewH.length : 0;
    const mE = manyH.length > 0 ? manyH.reduce((s, p) => s + p.engagement_rate, 0) / manyH.length : 0;
    return { profile: pr, posts: df, metrics: { avgLikes: Math.round(aL), avgComments: Math.round(aC), avgEngagement: aE, totalLikes: tL, totalComments: tC, lcRatio: lcR, ppw: Math.round(ppw * 10) / 10, ffRatio: ffR, bestDay: bDay, bestHour: bHour, topHashtags: htC, total: df.length, shortEng: sE, longEng: lE, fewEng: fE, manyEng: mE } };
}

// ═══════════════════════════════════════
// CARREGAR PERFIL
// ═══════════════════════════════════════

async function loadProfile(username) {
    username = username.toLowerCase().replace(/@/g, "").trim();
    if (!username) return;

    // Restaurar welcome se tinha erro
    if (welcomeHTML) document.getElementById("welcome").innerHTML = welcomeHTML;

    if (cache[username]) { currentProfile = cache[username]; showDashboard(username); return; }

    document.getElementById("welcome").style.display = "none";
    document.querySelectorAll(".section").forEach(s => { s.classList.remove("active"); s.innerHTML = ""; });
    const ld = document.getElementById("loading");
    document.getElementById("loading-user").textContent = "@" + username;
    ld.style.display = "flex";
    setStatus("Buscando @" + username + "...");

    let raw = null;
    try {
        raw = await fetchLiveProfile(username);
    } catch (e) {
        ld.style.display = "none";
        if (e.message === "NOT_FOUND") {
            showError("Perfil nao encontrado", "@" + username + " nao existe ou e um perfil privado.");
        } else {
            showError("Erro ao buscar dados", "Nao foi possivel conectar ao servidor. Tente novamente.");
        }
        return;
    }

    ld.style.display = "none";
    if (!raw) { showError("Perfil nao encontrado", "Nao foi possivel carregar dados de @" + username + ". Verifique se o perfil e publico."); return; }

    currentProfile = processData(raw);
    cache[username] = currentProfile;
    showDashboard(username);
}

function showDashboard(username) {
    document.getElementById("welcome").style.display = "none";
    document.getElementById("loading").style.display = "none";
    setStatus("@" + username + " — " + fmt(currentProfile.profile.followers) + " seguidores — " + currentProfile.metrics.total + " posts analisados", "success");
    navigateTo("overview");
}

// ═══════════════════════════════════════
// NAVEGACAO (TABS)
// ═══════════════════════════════════════

function navigateTo(tab) {
    currentTab = tab;
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    const activeBtn = document.querySelector('[data-tab="' + tab + '"]');
    if (activeBtn) activeBtn.classList.add("active");
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.getElementById("sec-" + tab).classList.add("active");
    if (currentProfile) renderSection(tab);
}

function renderSection(tab) {
    switch (tab) {
        case "overview": renderOverview(); break;
        case "posts": renderPosts(); break;
        case "temporal": renderTemporal(); break;
        case "content": renderContent(); break;
    }
}

// ═══════════════════════════════════════
// RENDER: VISAO GERAL
// ═══════════════════════════════════════

function renderOverview() {
    const { profile: pr, posts: df, metrics: m } = currentProfile;
    const tier = getTier(pr.followers);
    const initial = (pr.full_name || pr.username || "?")[0].toUpperCase();
    const avatarInner = pr.profile_pic_url
        ? '<img src="' + proxyImg(pr.profile_pic_url) + '" alt="' + pr.username + '" onerror="this.remove();this.parentElement.textContent=\'' + initial + '\'">'
        : initial;

    let html = '<div class="section-title">Visao Geral</div>';

    // Profile card
    html += '<div class="profile-card"><div class="profile-header">'
        + '<div class="profile-avatar" style="background:' + tier.c + '">' + avatarInner + '</div>'
        + '<div class="profile-info"><div class="name">' + pr.full_name + (pr.is_verified ? ' <span class="verified-badge">Verificado</span>' : '') + '</div>'
        + '<div class="username">@' + pr.username + '</div>'
        + '<span class="tier-badge" style="background:' + tier.c + '22;color:' + tier.c + ';border:1px solid ' + tier.c + '44">' + tier.n + '</span></div></div>'
        + (pr.biography ? '<p class="profile-bio">' + pr.biography + '</p>' : '')
        + '<div class="stat-row"><div class="stat-item"><div class="stat-value">' + fmt(pr.followers) + '</div><div class="stat-label">Seguidores</div></div>'
        + '<div class="stat-item"><div class="stat-value">' + fmt(pr.following) + '</div><div class="stat-label">Seguindo</div></div>'
        + '<div class="stat-item"><div class="stat-value">' + fmt(pr.media_count) + '</div><div class="stat-label">Posts</div></div></div></div>';

    // KPIs
    html += '<div class="kpi-grid">'
        + kpi("Seguidores", fmt(pr.followers)) + kpi("Engagement Rate", m.avgEngagement.toFixed(2) + "%")
        + kpi("Media de Likes", fmt(m.avgLikes)) + kpi("Posts / Semana", m.ppw)
        + '</div>';

    // Insights
    html += '<div class="insight-grid">'
        + insight(fmt(m.avgComments), "Media Comentarios") + insight(m.lcRatio + ":1", "Likes / Comments")
        + insight(m.ffRatio + ":1", "Seguidores / Seguindo") + insight(m.total, "Posts Analisados")
        + '</div>';

    // Charts
    if (df.length > 0) {
        html += '<div class="grid-2"><div class="card"><div class="card-title">Engagement ao Longo do Tempo</div><div class="chart-container" id="ov-c1"></div></div>'
            + '<div class="card"><div class="card-title">Top Posts por Engagement</div><div class="chart-container" id="ov-c2"></div></div></div>';
    }

    document.getElementById("sec-overview").innerHTML = html;

    if (df.length > 0) {
        chartEngagementLine(document.getElementById("ov-c1"), df);
        chartTopPostsBar(document.getElementById("ov-c2"), df);
    }
}

// ═══════════════════════════════════════
// RENDER: ANALISE DE POSTS
// ═══════════════════════════════════════

function renderPosts() {
    const { posts: df } = currentProfile;
    if (df.length === 0) { document.getElementById("sec-posts").innerHTML = '<div class="error-state"><div class="error-state-msg">Nenhum post disponivel para analise</div></div>'; return; }

    let html = '<div class="section-title">Analise de Posts</div>';
    html += '<div class="grid-2"><div class="card"><div class="card-title">Distribuicao de Engagement</div><div class="chart-container" id="ps-c1"></div></div>'
        + '<div class="card"><div class="card-title">Tipo de Conteudo</div><div class="chart-container-sm" id="ps-c2"></div></div></div>';
    html += '<div class="card"><div class="card-title">Engagement por Tipo de Midia</div><div class="chart-container-sm" id="ps-c3"></div></div>';

    // Posts grid
    html += '<div class="section-title">Ultimas Publicacoes</div>';
    html += '<p class="posts-note">Exibindo os ' + df.length + ' posts mais recentes (limitacao da API publica do Instagram)</p>';

    const sorted = [...df].sort((a, b) => b.date - a.date);
    html += '<div class="posts-grid">';
    sorted.forEach(p => {
        const cap = p.caption || "Sem legenda";
        const thumbUrl = p.thumbnail_url ? proxyImg(p.thumbnail_url) : "";
        const postUrl = p.url || "";
        const typeClass = p.media_type.toLowerCase();
        const imgTag = thumbUrl
            ? '<img class="post-card-img" src="' + thumbUrl + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
            : '<div class="post-card-img" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:.82rem">Sem imagem</div>';

        html += '<div class="post-card">'
            + imgTag
            + '<div class="post-card-body">'
            + '<div class="post-card-header">'
            + '<span class="post-card-date">' + p.date.toLocaleDateString("pt-BR") + '</span>'
            + '<span class="post-card-type ' + typeClass + '">' + p.media_type + '</span>'
            + '</div>'
            + '<p class="post-card-caption">' + cap + '</p>'
            + '<div class="post-card-metrics">'
            + '<div class="post-card-metric"><span class="post-card-metric-value">' + fmt(p.likes) + '</span><span class="post-card-metric-label">Likes</span></div>'
            + '<div class="post-card-metric"><span class="post-card-metric-value">' + fmt(p.comments) + '</span><span class="post-card-metric-label">Comments</span></div>'
            + '<div class="post-card-metric"><span class="post-card-metric-value">' + p.engagement_rate.toFixed(3) + '%</span><span class="post-card-metric-label">Engagement</span></div>'
            + '<div class="post-card-metric"><span class="post-card-metric-value">' + p.hashtags.length + '</span><span class="post-card-metric-label">Tags</span></div>'
            + '</div>'
            + (postUrl ? '<div class="post-card-footer"><a href="' + postUrl + '" target="_blank" rel="noopener" class="post-link">Ver no Instagram →</a></div>' : '')
            + '</div></div>';
    });
    html += '</div>';

    document.getElementById("sec-posts").innerHTML = html;

    chartEngagementDist(document.getElementById("ps-c1"), df);
    chartMediaPie(document.getElementById("ps-c2"), df);
    chartTypeEng(document.getElementById("ps-c3"), df);
}

// ═══════════════════════════════════════
// RENDER: ANALISE TEMPORAL
// ═══════════════════════════════════════

function renderTemporal() {
    const { posts: df, metrics: m } = currentProfile;
    if (df.length === 0) { document.getElementById("sec-temporal").innerHTML = '<div class="error-state"><div class="error-state-msg">Nenhum post disponivel para analise temporal</div></div>'; return; }

    // Consistencia
    const weekCounts = {};
    df.forEach(p => { const d = p.date; const ws = new Date(d); ws.setDate(d.getDate() - d.getDay()); const key = ws.toISOString().slice(0, 10); weekCounts[key] = (weekCounts[key] || 0) + 1; });
    const wVals = Object.values(weekCounts);
    let consistency = 100;
    if (wVals.length > 1) { const wMean = wVals.reduce((a, b) => a + b, 0) / wVals.length; const wStd = Math.sqrt(wVals.reduce((s, v) => s + (v - wMean) ** 2, 0) / wVals.length); consistency = wMean > 0 ? Math.max(0, Math.min(100, Math.round(100 - (wStd / wMean) * 100))) : 0; }

    let html = '<div class="section-title">Analise Temporal</div>';

    // Best time card
    html += '<div class="best-time-card">'
        + '<div class="best-time-item"><div class="best-time-label">Melhor Dia</div><div class="best-time-value">' + m.bestDay + '</div><div class="best-time-sub">Maior engagement medio</div></div>'
        + '<div class="best-time-item"><div class="best-time-label">Melhor Horario</div><div class="best-time-value">' + String(m.bestHour).padStart(2, "0") + ':00</div><div class="best-time-sub">Pico de interacoes</div></div>'
        + '<div class="best-time-item"><div class="best-time-label">Recomendacao</div><div class="best-time-value" style="font-size:1rem">' + m.bestDay + ' as ' + String(m.bestHour).padStart(2, "0") + 'h</div><div class="best-time-sub">Horario ideal para publicar</div></div>'
        + '</div>';

    // Insights
    html += '<div class="insight-grid">'
        + insight(m.bestDay, "Melhor Dia") + insight(String(m.bestHour).padStart(2, "0") + ":00", "Melhor Horario")
        + insight(m.ppw, "Posts / Semana") + insight(consistency + "%", "Consistencia")
        + '</div>';

    // Charts
    html += '<div class="card"><div class="card-title">Padrao de Postagem (Dia x Hora)</div><div class="chart-container" id="tp-c1"></div></div>';
    html += '<div class="grid-2"><div class="card"><div class="card-title">Engagement por Dia da Semana</div><div class="chart-container" id="tp-c2"></div></div>'
        + '<div class="card"><div class="card-title">Engagement por Hora do Dia</div><div class="chart-container" id="tp-c3"></div></div></div>';
    html += '<div class="card"><div class="card-title">Frequencia de Postagem por Semana</div><div class="chart-container" id="tp-c4"></div></div>';

    document.getElementById("sec-temporal").innerHTML = html;

    chartHeatmap(document.getElementById("tp-c1"), df);
    chartEngDay(document.getElementById("tp-c2"), df);
    chartEngHour(document.getElementById("tp-c3"), df);
    chartFrequency(document.getElementById("tp-c4"), df);
}

// ═══════════════════════════════════════
// RENDER: INTELIGENCIA DE CONTEUDO
// ═══════════════════════════════════════

function renderContent() {
    const { posts: df, metrics: m } = currentProfile;
    if (df.length === 0) { document.getElementById("sec-content").innerHTML = '<div class="error-state"><div class="error-state-msg">Nenhum post disponivel para analise</div></div>'; return; }

    const cw = m.shortEng > m.longEng ? "Curtas (<100 chars)" : "Longas (300+ chars)";
    const hw = m.fewEng > m.manyEng ? "Poucas (0-3)" : "Muitas (5+)";

    let html = '<div class="section-title">Inteligencia de Conteudo</div>';
    html += '<div class="card"><div class="card-title">Tamanho da Caption vs Engagement</div><div class="chart-container" id="ct-c1"></div></div>';
    html += '<div class="grid-2"><div class="card"><div class="card-title">Hashtags Mais Utilizadas</div><div class="chart-container" id="ct-c2"></div></div>'
        + '<div class="card"><div class="card-title">Engagement por Tipo de Midia</div><div class="chart-container-sm" id="ct-c3"></div></div></div>';

    html += '<div class="section-title">Insights</div>';
    html += '<div class="grid-2">'
        + '<div class="card" style="text-align:center"><div class="insight-label">Captions que Performam Melhor</div><div class="insight-value" style="font-size:1.1rem;margin:8px 0">' + cw + '</div><div class="insight-sub">Curtas: ' + m.shortEng.toFixed(3) + '% — Longas: ' + m.longEng.toFixed(3) + '%</div></div>'
        + '<div class="card" style="text-align:center"><div class="insight-label">Quantidade Ideal de Hashtags</div><div class="insight-value" style="font-size:1.1rem;margin:8px 0">' + hw + '</div><div class="insight-sub">0-3: ' + m.fewEng.toFixed(3) + '% — 5+: ' + m.manyEng.toFixed(3) + '%</div></div>'
        + '</div>';

    document.getElementById("sec-content").innerHTML = html;

    chartCaptionEng(document.getElementById("ct-c1"), df);
    chartHashtags(document.getElementById("ct-c2"), m.topHashtags);
    chartTypeEng(document.getElementById("ct-c3"), df);
}

// ═══════════════════════════════════════
// HELPERS DE HTML
// ═══════════════════════════════════════

function kpi(label, value) {
    return '<div class="kpi-card"><div class="kpi-label">' + label + '</div><div class="kpi-value">' + value + '</div></div>';
}

function insight(value, label) {
    return '<div class="insight-card"><div class="insight-value">' + value + '</div><div class="insight-label">' + label + '</div></div>';
}

// ═══════════════════════════════════════
// EVENTOS
// ═══════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
    welcomeHTML = document.getElementById("welcome").innerHTML;

    // Search
    document.getElementById("btn-search").addEventListener("click", () => loadProfile(document.getElementById("search-input").value));
    document.getElementById("search-input").addEventListener("keypress", e => { if (e.key === "Enter") loadProfile(e.target.value); });

    // Nav tabs
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (!currentProfile) return;
            navigateTo(btn.dataset.tab);
        });
    });
});
