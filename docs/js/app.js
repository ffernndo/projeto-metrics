// ===== InstaMetrics - App Principal =====
let currentProfile = null, currentPage = "overview", cache = {};
let postSortCol = "engagement_rate", postSortAsc = false;
let welcomeOriginalHTML = "";

// ===== Utilidades =====
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
function showBanner(msg, type) {
    const b = document.getElementById("banner");
    b.className = "banner " + type;
    b.textContent = msg;
    b.style.display = "block";
}
function hideBanner() { document.getElementById("banner").style.display = "none"; }

function showError(title, message) {
    document.getElementById("loading").style.display = "none";
    document.getElementById("dashboard").style.display = "none";
    const w = document.getElementById("welcome");
    w.style.display = "flex";
    w.innerHTML = '<div class="error-state">'
        + '<div class="error-state-icon">⚠️</div>'
        + '<div class="error-state-title">' + title + '</div>'
        + '<div class="error-state-msg">' + message + '</div></div>';
}

// ===== Busca Real via Cloudflare Worker =====
const WORKER_URL = "https://atualizador.fernando-cezar-f-s.workers.dev";

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
    const titleMatch = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i) || html.match(/content="([^"]+)"\s+(?:property|name)="og:title"/i);
    if (titleMatch) {
        const t = titleMatch[1];
        const nameFromTitle = t.match(/^(.+?)\s*\(@/) || t.match(/^(.+?)\s*[\|•·]/);
        if (nameFromTitle && !p.full_name) p.full_name = nameFromTitle[1].trim();
        if (t.includes("✓") || t.includes("Verified")) p.is_verified = true;
    }
    const imgMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i) || html.match(/content="([^"]+)"\s+(?:property|name)="og:image"/i);
    if (imgMatch) p.profile_pic_url = imgMatch[1];
    const bioMatch = html.match(/<meta\s+(?:property|name)="description"\s+content="([^"]+)"/i);
    if (bioMatch) { const bio = bioMatch[1].split(" - ").slice(1).join(" - ").trim(); if (bio) p.biography = bio; }
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
                        const n = e.node;
                        const isV = n.is_video || false;
                        let mt = "IMAGE"; if (n.__typename === "GraphSidecar") mt = "CAROUSEL"; else if (isV) mt = "VIDEO";
                        return { caption: (n.edge_media_to_caption?.edges?.[0]?.node?.text) || "", likes: n.edge_liked_by?.count || n.edge_media_preview_like?.count || 0, comments: n.edge_media_to_comment?.count || 0, timestamp: new Date(n.taken_at_timestamp * 1000).toISOString(), media_type: mt, is_video: isV, video_view_count: n.video_view_count || null };
                    });
                }
            }
        }
    } catch (e) {}
    return { profile: p, posts };
}

// ===== Processamento =====
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
    if (df.length >= 2) {
        const dates = df.map(p => p.date.getTime());
        const range = (Math.max(...dates) - Math.min(...dates)) / 864e5;
        ppw = df.length / Math.max(range / 7, 1);
    }
    const ffR = pr.following > 0 ? Math.round(pr.followers / pr.following) : 0;
    const dayE = {}, hourE = {};
    const dayN = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];
    df.forEach(p => {
        const d = p.date.getDay();
        if (!dayE[d]) dayE[d] = [];
        dayE[d].push(p.engagement_rate);
        const h = p.hour;
        if (!hourE[h]) hourE[h] = [];
        hourE[h].push(p.engagement_rate);
    });
    let bDay = "N/A", bDayV = 0;
    Object.entries(dayE).forEach(([d, r]) => { const a = r.reduce((x, y) => x + y, 0) / r.length; if (a > bDayV) { bDayV = a; bDay = dayN[parseInt(d)]; } });
    let bHour = 0, bHourV = 0;
    Object.entries(hourE).forEach(([h, r]) => { const a = r.reduce((x, y) => x + y, 0) / r.length; if (a > bHourV) { bHourV = a; bHour = parseInt(h); } });
    const htC = {};
    df.forEach(p => p.hashtags.forEach(h => { htC[h] = (htC[h] || 0) + 1; }));
    const shortC = df.filter(p => p.caption.length < 100), longC = df.filter(p => p.caption.length >= 300);
    const sE = shortC.length > 0 ? shortC.reduce((s, p) => s + p.engagement_rate, 0) / shortC.length : 0;
    const lE = longC.length > 0 ? longC.reduce((s, p) => s + p.engagement_rate, 0) / longC.length : 0;
    const fewH = df.filter(p => p.hashtags.length <= 3), manyH = df.filter(p => p.hashtags.length > 5);
    const fE = fewH.length > 0 ? fewH.reduce((s, p) => s + p.engagement_rate, 0) / fewH.length : 0;
    const mE = manyH.length > 0 ? manyH.reduce((s, p) => s + p.engagement_rate, 0) / manyH.length : 0;
    return { profile: pr, posts: df, metrics: { avgLikes: Math.round(aL), avgComments: Math.round(aC), avgEngagement: aE, totalLikes: tL, totalComments: tC, lcRatio: lcR, ppw: Math.round(ppw * 10) / 10, ffRatio: ffR, bestDay: bDay, bestHour: bHour, topHashtags: htC, total: df.length, shortEng: sE, longEng: lE, fewEng: fE, manyEng: mE } };
}

// ===== Carregar Perfil =====
async function loadProfile(username) {
    username = username.toLowerCase().replace(/@/g, "").trim();
    if (!username) return;
    // Restaurar welcome original caso tenha sido substituido por erro
    const w = document.getElementById("welcome");
    if (welcomeOriginalHTML) w.innerHTML = welcomeOriginalHTML;

    if (cache[username]) { currentProfile = cache[username]; showDashboard(username); return; }

    w.style.display = "none";
    document.getElementById("dashboard").style.display = "none";
    const ld = document.getElementById("loading");
    document.getElementById("loading-user").textContent = "@" + username;
    ld.style.display = "block";
    hideBanner();

    let raw = null;
    try {
        raw = await fetchLiveProfile(username);
    } catch (e) {
        ld.style.display = "none";
        if (e.message === "NOT_FOUND") {
            showError("Perfil nao encontrado", "@" + username + " nao existe ou e um perfil privado.");
        } else {
            showError("Erro ao buscar dados", "Nao foi possivel conectar ao servidor. Tente novamente em alguns instantes.");
        }
        return;
    }

    ld.style.display = "none";
    if (!raw) {
        showError("Perfil nao encontrado", "Nao foi possivel carregar dados de @" + username + ". Verifique se o perfil e publico.");
        return;
    }

    const processed = processData(raw);
    cache[username] = processed;
    currentProfile = processed;
    showDashboard(username);
}

function showDashboard(username) {
    document.getElementById("welcome").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    showBanner("Dados reais de @" + username + " carregados com sucesso", "success");
    navigateTo("overview");
}

// ===== Navegacao =====
function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
    document.querySelector('[data-page="' + page + '"]').classList.add("active");
    document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
    document.getElementById("page-" + page).classList.add("active");
    if (currentProfile) renderPage(page);
}

function renderPage(page) {
    switch (page) {
        case "overview": renderOverview(); break;
        case "posts": renderPosts(); break;
        case "temporal": renderTemporal(); break;
        case "content": renderContent(); break;
    }
}

// ===== Render: Overview =====
function renderOverview() {
    const { profile: pr, posts: df, metrics: m } = currentProfile;
    const tier = getTier(pr.followers);
    const initial = (pr.full_name || pr.username || "?")[0].toUpperCase();
    const avatarInner = pr.profile_pic_url
        ? '<img src="' + pr.profile_pic_url + '" alt="' + pr.username + '" crossorigin="anonymous" onerror="this.remove();this.parentElement.textContent=\'' + initial + '\'">'
        : initial;
    document.getElementById("ov-profile").innerHTML =
        '<div class="profile-header"><div class="profile-avatar" style="background:' + tier.c + '">' + avatarInner + '</div>'
        + '<div class="profile-info"><div class="name">' + pr.full_name + (pr.is_verified ? ' <span class="verified-badge">✓ Verificado</span>' : '') + '</div>'
        + '<div class="username">@' + pr.username + '</div>'
        + '<span class="tier-badge" style="background:' + tier.c + '22;color:' + tier.c + ';border:1px solid ' + tier.c + '44">' + tier.n + '</span></div></div>'
        + '<p class="profile-bio">' + pr.biography + '</p>'
        + '<div class="stat-row"><div class="stat-item"><div class="stat-value">' + fmt(pr.followers) + '</div><div class="stat-label">Seguidores</div></div>'
        + '<div class="stat-item"><div class="stat-value">' + fmt(pr.following) + '</div><div class="stat-label">Seguindo</div></div>'
        + '<div class="stat-item"><div class="stat-value">' + fmt(pr.media_count) + '</div><div class="stat-label">Posts</div></div></div>';
    document.getElementById("ov-kpis").innerHTML =
        '<div class="kpi-card"><div class="kpi-icon">👥</div><div class="kpi-label">Seguidores</div><div class="kpi-value">' + fmt(pr.followers) + '</div></div>'
        + '<div class="kpi-card"><div class="kpi-icon">📈</div><div class="kpi-label">Engagement Rate</div><div class="kpi-value">' + m.avgEngagement.toFixed(2) + '%</div></div>'
        + '<div class="kpi-card"><div class="kpi-icon">❤️</div><div class="kpi-label">Media de Likes</div><div class="kpi-value">' + fmt(m.avgLikes) + '</div></div>'
        + '<div class="kpi-card"><div class="kpi-icon">📅</div><div class="kpi-label">Posts/Semana</div><div class="kpi-value">' + m.ppw + '</div></div>';
    document.getElementById("ov-insights").innerHTML =
        '<div class="insight-card"><div class="insight-value">' + fmt(m.avgComments) + '</div><div class="insight-label">Media Comentarios</div></div>'
        + '<div class="insight-card"><div class="insight-value">' + m.lcRatio + ':1</div><div class="insight-label">Likes / Comments</div></div>'
        + '<div class="insight-card"><div class="insight-value">' + m.ffRatio + ':1</div><div class="insight-label">Seguidores / Seguindo</div></div>'
        + '<div class="insight-card"><div class="insight-value">' + m.total + '</div><div class="insight-label">Posts Analisados</div></div>';
    if (df.length > 0) {
        chartEngagementLine(document.getElementById("ov-c1"), df);
        chartTopPostsBar(document.getElementById("ov-c2"), df);
    }
}

// ===== Render: Posts =====
function renderPosts() {
    const { posts: df, metrics: m } = currentProfile;
    if (df.length === 0) { document.getElementById("ps-table").innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px">Nenhum post disponivel para analise</p>'; return; }
    chartEngagementDist(document.getElementById("ps-c1"), df);
    chartMediaPie(document.getElementById("ps-c2"), df);
    chartTypeEng(document.getElementById("ps-c3"), df);
    renderPostsTable(df);
}

function renderPostsTable(df) {
    const sorted = [...df].sort((a, b) => {
        let va, vb;
        switch (postSortCol) {
            case "likes": va = a.likes; vb = b.likes; break;
            case "comments": va = a.comments; vb = b.comments; break;
            case "engagement_rate": va = a.engagement_rate; vb = b.engagement_rate; break;
            case "hashtags": va = a.hashtags.length; vb = b.hashtags.length; break;
            case "date": va = a.date.getTime(); vb = b.date.getTime(); break;
            default: va = a.engagement_rate; vb = b.engagement_rate;
        }
        return postSortAsc ? va - vb : vb - va;
    });

    function arrow(col) {
        if (postSortCol !== col) return '<span class="sort-arrow">⇅</span>';
        return '<span class="sort-arrow active">' + (postSortAsc ? '▲' : '▼') + '</span>';
    }

    let h = '<div class="post-row post-row-header">'
        + '<div></div>'
        + '<div data-sort="date">Post ' + arrow("date") + '</div>'
        + '<div data-sort="likes" style="text-align:right">Likes ' + arrow("likes") + '</div>'
        + '<div data-sort="comments" style="text-align:right">Comments ' + arrow("comments") + '</div>'
        + '<div data-sort="engagement_rate" style="text-align:right">Engagement ' + arrow("engagement_rate") + '</div>'
        + '<div data-sort="hashtags" style="text-align:right">Hashtags ' + arrow("hashtags") + '</div>'
        + '</div>';

    sorted.forEach(p => {
        const cap = p.caption.length > 60 ? p.caption.slice(0, 60) + "..." : (p.caption || "Sem legenda");
        const thumbUrl = p.thumbnail_url || "";
        const postUrl = p.url || "";
        const thumbHtml = thumbUrl
            ? '<div class="post-thumb"><img src="' + thumbUrl + '" alt="" crossorigin="anonymous" onerror="this.style.display=\'none\'"><div class="post-thumb-badge">' + p.media_type + '</div></div>'
            : '<div class="post-thumb"><div class="post-thumb-badge">' + p.media_type + '</div></div>';
        const linkHtml = postUrl ? '<a href="' + postUrl + '" target="_blank" rel="noopener" class="post-link">Ver no Instagram →</a>' : '';

        h += '<div class="post-row">'
            + thumbHtml
            + '<div class="post-caption"><span class="post-type">' + p.media_type + '</span> · ' + p.date.toLocaleDateString("pt-BR") + '<br>' + cap + '<br>' + linkHtml + '</div>'
            + '<div class="post-metric">' + fmt(p.likes) + '</div>'
            + '<div class="post-metric">' + fmt(p.comments) + '</div>'
            + '<div class="post-metric">' + p.engagement_rate.toFixed(2) + '%</div>'
            + '<div class="post-metric">' + p.hashtags.length + '</div>'
            + '</div>';
    });

    document.getElementById("ps-table").innerHTML = h;

    // Bind sort events
    document.querySelectorAll(".post-row-header div[data-sort]").forEach(el => {
        el.addEventListener("click", () => {
            const col = el.dataset.sort;
            if (postSortCol === col) { postSortAsc = !postSortAsc; }
            else { postSortCol = col; postSortAsc = false; }
            renderPostsTable(df);
        });
    });
}

// ===== Render: Temporal =====
function renderTemporal() {
    const { posts: df, metrics: m } = currentProfile;

    if (df.length === 0) {
        document.getElementById("tp-best-time").innerHTML = '';
        document.getElementById("tp-insights").innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;grid-column:1/-1">Nenhum post disponivel para analise temporal</p>';
        return;
    }

    // Calcular consistencia (100% - coeficiente de variacao dos posts semanais)
    const weekCounts = {};
    df.forEach(p => {
        const d = p.date;
        const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay());
        const key = weekStart.toISOString().slice(0, 10);
        weekCounts[key] = (weekCounts[key] || 0) + 1;
    });
    const wVals = Object.values(weekCounts);
    let consistency = 100;
    if (wVals.length > 1) {
        const wMean = wVals.reduce((a, b) => a + b, 0) / wVals.length;
        const wStd = Math.sqrt(wVals.reduce((s, v) => s + (v - wMean) ** 2, 0) / wVals.length);
        consistency = wMean > 0 ? Math.max(0, Math.min(100, Math.round(100 - (wStd / wMean) * 100))) : 0;
    }

    // Best time card
    document.getElementById("tp-best-time").innerHTML =
        '<div class="best-time-card">'
        + '<div class="best-time-item"><div class="best-time-label">Melhor Dia para Postar</div><div class="best-time-value">' + m.bestDay + '</div><div class="best-time-sub">Maior engagement medio</div></div>'
        + '<div class="best-time-item"><div class="best-time-label">Melhor Horario</div><div class="best-time-value">' + String(m.bestHour).padStart(2, "0") + ':00</div><div class="best-time-sub">Pico de interacoes</div></div>'
        + '<div class="best-time-item"><div class="best-time-label">Recomendacao</div><div class="best-time-value" style="font-size:1rem">' + m.bestDay + ' as ' + String(m.bestHour).padStart(2, "0") + 'h</div><div class="best-time-sub">Horario ideal para publicar</div></div>'
        + '</div>';

    // 4 insight cards
    document.getElementById("tp-insights").innerHTML =
        '<div class="insight-card"><div class="insight-value">' + m.bestDay + '</div><div class="insight-label">Melhor Dia</div></div>'
        + '<div class="insight-card"><div class="insight-value">' + String(m.bestHour).padStart(2, "0") + ':00</div><div class="insight-label">Melhor Horario</div></div>'
        + '<div class="insight-card"><div class="insight-value">' + m.ppw + '</div><div class="insight-label">Posts / Semana</div></div>'
        + '<div class="insight-card"><div class="insight-value">' + consistency + '%</div><div class="insight-label">Consistencia</div></div>';

    chartHeatmap(document.getElementById("tp-c1"), df);
    chartEngDay(document.getElementById("tp-c2"), df);
    chartEngHour(document.getElementById("tp-c3"), df);
    chartFrequency(document.getElementById("tp-c4"), df);
}

// ===== Render: Content =====
function renderContent() {
    const { posts: df, metrics: m } = currentProfile;
    if (df.length === 0) return;
    chartCaptionEng(document.getElementById("ct-c1"), df);
    chartHashtags(document.getElementById("ct-c2"), m.topHashtags);
    chartTypeEng(document.getElementById("ct-c3"), df);
    const cw = m.shortEng > m.longEng ? "Curtas (<100 chars)" : "Longas (300+ chars)";
    const hw = m.fewEng > m.manyEng ? "Poucas (0-3)" : "Muitas (5+)";
    document.getElementById("ct-insights").innerHTML =
        '<div class="chart-box insight-card"><div class="insight-label">Captions que Performam Melhor</div><div class="insight-value" style="font-size:17px">' + cw + '</div><div class="insight-sub">Curtas: ' + m.shortEng.toFixed(2) + '% · Longas: ' + m.longEng.toFixed(2) + '%</div></div>'
        + '<div class="chart-box insight-card"><div class="insight-label">Quantidade Ideal de Hashtags</div><div class="insight-value" style="font-size:17px">' + hw + '</div><div class="insight-sub">0-3: ' + m.fewEng.toFixed(2) + '% · 5+: ' + m.manyEng.toFixed(2) + '%</div></div>';
}

// ===== Events =====
document.addEventListener("DOMContentLoaded", () => {
    welcomeOriginalHTML = document.getElementById("welcome").innerHTML;
    document.getElementById("btn-search").addEventListener("click", () => loadProfile(document.getElementById("search-input").value));
    document.getElementById("search-input").addEventListener("keypress", e => { if (e.key === "Enter") loadProfile(e.target.value); });
    document.querySelectorAll(".nav-item").forEach(i => i.addEventListener("click", () => navigateTo(i.dataset.page)));
    document.getElementById("mobile-toggle").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
    document.querySelectorAll(".nav-item").forEach(i => i.addEventListener("click", () => { if (window.innerWidth <= 768) document.getElementById("sidebar").classList.remove("open"); }));
});
