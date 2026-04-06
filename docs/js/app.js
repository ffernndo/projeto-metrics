// ═══════════════════════════════════════
// InstaMetrics — App Principal
// ═══════════════════════════════════════

let currentProfile = null, currentTab = "overview", cache = {};
const WORKER_URL = "https://atualizador.fernando-cezar-f-s.workers.dev";

function fmt(n) { if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"; if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"; return String(Math.round(n)); }
function parseMetric(s) { if (!s) return 0; s = s.replace(/,/g, "").trim(); const m = s.match(/([\d.]+)\s*(M|K|m|k)?/); if (!m) return 0; let v = parseFloat(m[1]); if (m[2] === "M" || m[2] === "m") v *= 1e6; if (m[2] === "K" || m[2] === "k") v *= 1e3; return Math.round(v); }
function getTier(f) { if (f < 1e4) return { n: "Nano", c: "#5eead4" }; if (f < 1e5) return { n: "Micro", c: "#3fb950" }; if (f < 5e5) return { n: "Mid-Tier", c: "#d29922" }; if (f < 1e6) return { n: "Macro", c: "#58a6ff" }; return { n: "Mega", c: "#bc8cff" }; }
function extractHashtags(t) { return (t.match(/#(\w+)/g) || []).map(h => h.slice(1)); }
function proxyImg(url) { if (!url) return ""; return WORKER_URL + "?img=" + encodeURIComponent(url); }

// ═══ FETCH ═══

async function fetchLiveProfile(username) {
    try {
        const r = await fetch(WORKER_URL + "?username=" + encodeURIComponent(username), { signal: AbortSignal.timeout(15000) });
        if (r.ok) {
            const data = await r.json();
            if (data && data.profile && data.profile.followers > 0) return data;
            if (data && data.error) { if (data.error.includes("nao encontrado") || data.error.includes("privado")) throw new Error("NOT_FOUND"); }
        }
        if (r.status === 404) throw new Error("NOT_FOUND");
    } catch (e) { if (e.message === "NOT_FOUND") throw e; }
    // CORS proxy fallback
    const proxies = [u => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u)];
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
    const descMatch = html.match(/<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/i);
    if (descMatch) {
        const parts = descMatch[1].match(/([\d.,]+[MKmk]?)\s*Followers?,?\s*([\d.,]+[MKmk]?)\s*Following,?\s*([\d.,]+[MKmk]?)\s*Posts?/i);
        if (parts) { p.followers = parseMetric(parts[1]); p.following = parseMetric(parts[2]); p.media_count = parseMetric(parts[3]); }
    }
    const titleMatch = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i);
    if (titleMatch) { const nm = titleMatch[1].match(/^(.+?)\s*\(@/); if (nm) p.full_name = nm[1].trim(); }
    const imgMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i);
    if (imgMatch) p.profile_pic_url = imgMatch[1];
    if (!p.full_name) p.full_name = username;
    if (p.followers === 0) return null;
    return { profile: p, posts: null };
}

// ═══ PROCESSAMENTO ═══

function processData(raw) {
    const pr = raw.profile, f = pr.followers;
    const posts = (raw.posts && raw.posts.length > 0) ? raw.posts : [];
    if (posts.length === 0) return { profile: pr, posts: [], metrics: { avgLikes: 0, avgComments: 0, avgEngagement: 0, totalLikes: 0, totalComments: 0, lcRatio: 0, ppw: 0, ffRatio: pr.following > 0 ? Math.round(pr.followers / pr.following) : 0, bestDay: "N/A", bestHour: 0, topHashtags: {}, total: 0 } };
    const df = posts.map(p => {
        const dt = new Date(p.timestamp);
        return { ...p, date: dt, hour: dt.getHours(), engagement_rate: f > 0 ? (p.likes + p.comments) / f * 100 : 0, total_interactions: p.likes + p.comments, hashtags: extractHashtags(p.caption) };
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
    // Consistencia
    const weekCounts = {}; df.forEach(p => { const d = p.date; const ws = new Date(d); ws.setDate(d.getDate() - d.getDay()); const key = ws.toISOString().slice(0, 10); weekCounts[key] = (weekCounts[key] || 0) + 1; });
    const wVals = Object.values(weekCounts); let consistency = 100;
    if (wVals.length > 1) { const wMean = wVals.reduce((a, b) => a + b, 0) / wVals.length; const wStd = Math.sqrt(wVals.reduce((s, v) => s + (v - wMean) ** 2, 0) / wVals.length); consistency = wMean > 0 ? Math.max(0, Math.min(100, Math.round(100 - (wStd / wMean) * 100))) : 0; }
    return { profile: pr, posts: df, metrics: { avgLikes: Math.round(aL), avgComments: Math.round(aC), avgEngagement: aE, totalLikes: tL, totalComments: tC, lcRatio: lcR, ppw: Math.round(ppw * 10) / 10, ffRatio: ffR, bestDay: bDay, bestHour: bHour, topHashtags: htC, total: df.length, consistency } };
}

// ═══ LOAD PROFILE ═══

async function loadProfile(username) {
    username = username.toLowerCase().replace(/@/g, "").trim();
    if (!username) return;
    if (cache[username]) { currentProfile = cache[username]; showDashboard(username); return; }
    // Show loading
    document.getElementById("hero").style.display = "none";
    document.getElementById("app").classList.remove("calculated");
    const ld = document.getElementById("loading");
    document.getElementById("loading-user").textContent = "@" + username;
    ld.classList.add("active");

    let raw = null;
    try { raw = await fetchLiveProfile(username); } catch (e) {
        ld.classList.remove("active");
        if (e.message === "NOT_FOUND") showError("Perfil nao encontrado", "@" + username + " nao existe ou e privado.");
        else showError("Erro de conexao", "Tente novamente em alguns instantes.");
        return;
    }
    ld.classList.remove("active");
    if (!raw) { showError("Perfil nao encontrado", "Nao foi possivel carregar @" + username + "."); return; }
    currentProfile = processData(raw);
    cache[username] = currentProfile;
    showDashboard(username);
}

function showError(title, msg) {
    document.getElementById("loading").classList.remove("active");
    document.getElementById("hero").style.display = "flex";
    document.getElementById("app").classList.remove("calculated");
    const sec = document.getElementById("sec-overview");
    sec.innerHTML = '<div class="error-state"><div class="error-state-icon">⚠️</div><div class="error-state-title">' + title + '</div><div class="error-state-msg">' + msg + '</div></div>';
    // Show error in hero area
    document.getElementById("hero").insertAdjacentHTML("beforeend", '<div class="error-state" id="hero-error" style="min-height:auto;padding:20px 0"><div class="error-state-title" style="color:var(--accent-red)">' + title + '</div><div class="error-state-msg">' + msg + '</div></div>');
}

function showDashboard(username) {
    document.getElementById("loading").classList.remove("active");
    document.getElementById("hero").style.display = "none";
    document.getElementById("app").classList.add("calculated");
    // Update header search
    document.getElementById("header-search").value = username;
    // Render profile sidebar
    renderProfileSidebar();
    // Status bar
    document.getElementById("status-bar").textContent = "@" + username + " — " + fmt(currentProfile.profile.followers) + " seguidores — " + currentProfile.metrics.total + " posts analisados";
    navigateTo("overview");
}

// ═══ PROFILE SIDEBAR ═══

function renderProfileSidebar() {
    const { profile: pr, metrics: m } = currentProfile;
    const tier = getTier(pr.followers);
    const initial = (pr.full_name || pr.username || "?")[0].toUpperCase();
    const avatar = pr.profile_pic_url
        ? '<img src="' + proxyImg(pr.profile_pic_url) + '" alt="" onerror="this.remove();this.parentElement.textContent=\'' + initial + '\'">'
        : initial;
    document.getElementById("profile-sidebar").innerHTML =
        '<div class="profile-avatar" style="background:' + tier.c + '">' + avatar + '</div>'
        + '<div class="profile-name">' + pr.full_name + (pr.is_verified ? ' <span class="profile-verified">✓</span>' : '') + '</div>'
        + '<div class="profile-username">@' + pr.username + '</div>'
        + '<span class="profile-tier" style="background:' + tier.c + '22;color:' + tier.c + ';border:1px solid ' + tier.c + '44">' + tier.n + '</span>'
        + (pr.biography ? '<p class="profile-bio">' + pr.biography + '</p>' : '')
        + '<div class="profile-stats">'
        + '<div class="profile-stat"><div class="profile-stat-val">' + fmt(pr.followers) + '</div><div class="profile-stat-lbl">Seguidores</div></div>'
        + '<div class="profile-stat"><div class="profile-stat-val">' + fmt(pr.following) + '</div><div class="profile-stat-lbl">Seguindo</div></div>'
        + '<div class="profile-stat"><div class="profile-stat-val">' + fmt(pr.media_count) + '</div><div class="profile-stat-lbl">Posts</div></div>'
        + '</div>';
}

// ═══ NAVIGATION ═══

function navigateTo(tab) {
    currentTab = tab;
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    const btn = document.querySelector('[data-tab="' + tab + '"]');
    if (btn) btn.classList.add("active");
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.getElementById("sec-" + tab).classList.add("active");
    if (currentProfile) renderSection(tab);
}

function renderSection(tab) {
    if (tab === "overview") renderOverview();
    else if (tab === "posts") renderPosts();
}

// ═══ RENDER: VISAO GERAL ═══

function renderOverview() {
    const { posts: df, metrics: m } = currentProfile;
    let h = '<div class="section-title">Visao Geral</div>';
    // KPIs
    h += '<div class="kpi-grid">'
        + kpi("Seguidores", fmt(currentProfile.profile.followers)) + kpi("Engagement Rate", m.avgEngagement.toFixed(3) + "%")
        + kpi("Media de Likes", fmt(m.avgLikes)) + kpi("Posts / Semana", m.ppw)
        + '</div>';
    // Best time
    if (m.bestDay !== "N/A") {
        h += '<div class="best-time-card">'
            + '<div class="best-time-item"><div class="best-time-label">Melhor Dia</div><div class="best-time-value">' + m.bestDay + '</div><div class="best-time-sub">Maior engagement</div></div>'
            + '<div class="best-time-item"><div class="best-time-label">Melhor Horario</div><div class="best-time-value">' + String(m.bestHour).padStart(2, "0") + ':00</div><div class="best-time-sub">Pico de interacoes</div></div>'
            + '<div class="best-time-item"><div class="best-time-label">Recomendacao</div><div class="best-time-value" style="font-size:.95rem">' + m.bestDay + ' as ' + String(m.bestHour).padStart(2, "0") + 'h</div><div class="best-time-sub">Horario ideal</div></div>'
            + '</div>';
    }
    // Insights
    h += '<div class="insight-grid">'
        + insight(fmt(m.avgComments), "Media Comentarios") + insight(m.lcRatio + ":1", "Likes / Comments")
        + insight(m.ffRatio + ":1", "Seg. / Seguindo") + insight(m.consistency + "%", "Consistencia")
        + '</div>';
    // Charts
    if (df.length > 0) {
        h += '<div class="card"><div class="card-title">Engagement ao Longo do Tempo</div><div class="chart-container" id="ov-c1"></div></div>';
        h += '<div class="grid-2">'
            + '<div class="card"><div class="card-title">Engagement por Dia da Semana</div><div class="chart-container" id="ov-c2"></div></div>'
            + '<div class="card"><div class="card-title">Engagement por Hora do Dia</div><div class="chart-container" id="ov-c3"></div></div>'
            + '</div>';
        h += '<div class="grid-2">'
            + '<div class="card"><div class="card-title">Tipo de Conteudo</div><div class="chart-container-sm" id="ov-c4"></div></div>'
            + '<div class="card"><div class="card-title">Top Hashtags</div><div class="chart-container" id="ov-c5"></div></div>'
            + '</div>';
    }
    document.getElementById("sec-overview").innerHTML = h;
    if (df.length > 0) {
        chartEngagementLine(document.getElementById("ov-c1"), df);
        chartEngDay(document.getElementById("ov-c2"), df);
        chartEngHour(document.getElementById("ov-c3"), df);
        chartMediaPie(document.getElementById("ov-c4"), df);
        chartHashtags(document.getElementById("ov-c5"), m.topHashtags);
    }
}

// ═══ RENDER: PUBLICACOES ═══

function renderPosts() {
    const { posts: df } = currentProfile;
    if (df.length === 0) { document.getElementById("sec-posts").innerHTML = '<div class="error-state"><div class="error-state-msg">Nenhum post disponivel</div></div>'; return; }
    let h = '<div class="section-title">Publicacoes</div>';
    h += '<p class="posts-note">Exibindo os ' + df.length + ' posts mais recentes</p>';
    // Charts
    h += '<div class="grid-2">'
        + '<div class="card"><div class="card-title">Distribuicao de Engagement</div><div class="chart-container" id="ps-c1"></div></div>'
        + '<div class="card"><div class="card-title">Engagement por Tipo</div><div class="chart-container-sm" id="ps-c2"></div></div>'
        + '</div>';
    // Post cards grid
    const sorted = [...df].sort((a, b) => b.date - a.date);
    h += '<div class="posts-grid">';
    sorted.forEach(p => {
        const cap = p.caption || "Sem legenda";
        const thumbUrl = p.thumbnail_url ? proxyImg(p.thumbnail_url) : "";
        const postUrl = p.url || "";
        const typeClass = p.media_type.toLowerCase();
        const imgTag = thumbUrl
            ? '<img class="post-card-img" src="' + thumbUrl + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
            : '<div class="post-card-img" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:.75rem">Sem imagem</div>';
        h += '<div class="post-card">' + imgTag
            + '<div class="post-card-body">'
            + '<div class="post-card-header"><span class="post-card-date">' + p.date.toLocaleDateString("pt-BR") + '</span><span class="post-card-type ' + typeClass + '">' + p.media_type + '</span></div>'
            + '<p class="post-card-caption">' + cap + '</p>'
            + '<div class="post-card-metrics">'
            + '<div><span class="post-card-metric-value">' + fmt(p.likes) + '</span><br><span class="post-card-metric-label">Likes</span></div>'
            + '<div><span class="post-card-metric-value">' + fmt(p.comments) + '</span><br><span class="post-card-metric-label">Comments</span></div>'
            + '<div><span class="post-card-metric-value">' + p.engagement_rate.toFixed(3) + '%</span><br><span class="post-card-metric-label">Engagement</span></div>'
            + '</div>'
            + (postUrl ? '<div class="post-card-footer"><a href="' + postUrl + '" target="_blank" rel="noopener" class="post-link">Ver no Instagram →</a></div>' : '')
            + '</div></div>';
    });
    h += '</div>';
    document.getElementById("sec-posts").innerHTML = h;
    chartEngagementDist(document.getElementById("ps-c1"), df);
    chartTypeEng(document.getElementById("ps-c2"), df);
}

// ═══ HELPERS ═══

function kpi(label, value) { return '<div class="kpi-card"><div class="kpi-label">' + label + '</div><div class="kpi-value">' + value + '</div></div>'; }
function insight(value, label) { return '<div class="insight-card"><div class="insight-value">' + value + '</div><div class="insight-label">' + label + '</div></div>'; }

// ═══ EVENTOS ═══

document.addEventListener("DOMContentLoaded", () => {
    // Hero search
    document.getElementById("hero-btn").addEventListener("click", () => loadProfile(document.getElementById("hero-input").value));
    document.getElementById("hero-input").addEventListener("keypress", e => { if (e.key === "Enter") loadProfile(e.target.value); });
    // Header search
    document.getElementById("header-btn").addEventListener("click", () => { cache = {}; loadProfile(document.getElementById("header-search").value); });
    document.getElementById("header-search").addEventListener("keypress", e => { if (e.key === "Enter") { cache = {}; loadProfile(e.target.value); } });
    // Nav tabs
    document.querySelectorAll(".nav-btn").forEach(btn => btn.addEventListener("click", () => { if (currentProfile) navigateTo(btn.dataset.tab); }));
    // Clean error on input focus
    document.getElementById("hero-input").addEventListener("focus", () => { const err = document.getElementById("hero-error"); if (err) err.remove(); });

    // Parallax box on hero
    const hero = document.getElementById("hero");
    const box = document.getElementById("hero-box");
    if (hero && box) {
        hero.addEventListener("mousemove", e => {
            const rect = hero.getBoundingClientRect();
            const cx = (e.clientX - rect.left) / rect.width - 0.5;
            const cy = (e.clientY - rect.top) / rect.height - 0.5;
            box.style.transform = "translateY(-50%) translate(" + (cx * 30) + "px, " + (cy * 20) + "px)";
        });
        hero.addEventListener("mouseleave", () => {
            box.style.transform = "translateY(-50%)";
        });
    }
});
