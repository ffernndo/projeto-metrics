// ===== InstaMetrics App =====

let currentProfile = null;
let currentPage = "overview";

// ===== Utilidades =====
function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(Math.round(n));
}

function getInfluencerTier(followers) {
    if (followers < 1000) return { name: "Nano", color: "#06B6D4" };
    if (followers < 10000) return { name: "Nano", color: "#06B6D4" };
    if (followers < 100000) return { name: "Micro", color: "#00D68F" };
    if (followers < 500000) return { name: "Mid-Tier", color: "#FDCB6E" };
    if (followers < 1000000) return { name: "Macro", color: "#EC4899" };
    return { name: "Mega", color: "#A855F7" };
}

function extractHashtags(text) {
    const matches = text.match(/#(\w+)/g);
    return matches ? matches.map(h => h.slice(1)) : [];
}

// ===== Processamento de Dados =====
function processData(raw) {
    const profile = raw.profile;
    const followers = profile.followers;

    const posts = raw.posts.map(p => {
        const dt = new Date(p.timestamp);
        return {
            ...p,
            date: dt,
            hour: dt.getHours(),
            day_of_week: dt.getDay(),
            engagement_rate: followers > 0 ? (p.likes + p.comments) / followers * 100 : 0,
            total_interactions: p.likes + p.comments,
            hashtags: extractHashtags(p.caption),
        };
    });

    // Metricas
    const avgLikes = posts.reduce((s, p) => s + p.likes, 0) / posts.length;
    const avgComments = posts.reduce((s, p) => s + p.comments, 0) / posts.length;
    const avgEngagement = posts.reduce((s, p) => s + p.engagement_rate, 0) / posts.length;
    const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
    const totalComments = posts.reduce((s, p) => s + p.comments, 0);
    const likeCommentRatio = totalComments > 0 ? totalLikes / totalComments : 0;

    // Posts per week
    let postsPerWeek = 0;
    if (posts.length >= 2) {
        const dates = posts.map(p => p.date.getTime());
        const range = (Math.max(...dates) - Math.min(...dates)) / 86400000;
        postsPerWeek = posts.length / Math.max(range / 7, 1);
    }

    const ffRatio = profile.following > 0 ? profile.followers / profile.following : 0;

    // Best day/hour
    const dayEngagement = {};
    const hourEngagement = {};
    posts.forEach(p => {
        const dayKey = p.day_of_week;
        const hourKey = p.hour;
        if (!dayEngagement[dayKey]) dayEngagement[dayKey] = [];
        if (!hourEngagement[hourKey]) hourEngagement[hourKey] = [];
        dayEngagement[dayKey].push(p.engagement_rate);
        hourEngagement[hourKey].push(p.engagement_rate);
    });

    const dayNames = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];
    let bestDay = "N/A", bestDayAvg = 0;
    Object.entries(dayEngagement).forEach(([d, rates]) => {
        const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
        if (avg > bestDayAvg) { bestDayAvg = avg; bestDay = dayNames[parseInt(d)]; }
    });

    let bestHour = 0, bestHourAvg = 0;
    Object.entries(hourEngagement).forEach(([h, rates]) => {
        const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
        if (avg > bestHourAvg) { bestHourAvg = avg; bestHour = parseInt(h); }
    });

    // Top hashtags
    const hashtagCounts = {};
    posts.forEach(p => p.hashtags.forEach(h => { hashtagCounts[h] = (hashtagCounts[h] || 0) + 1; }));

    // Content insights
    const shortCaptions = posts.filter(p => p.caption.length < 100);
    const longCaptions = posts.filter(p => p.caption.length >= 300);
    const shortEng = shortCaptions.length > 0 ? shortCaptions.reduce((s, p) => s + p.engagement_rate, 0) / shortCaptions.length : 0;
    const longEng = longCaptions.length > 0 ? longCaptions.reduce((s, p) => s + p.engagement_rate, 0) / longCaptions.length : 0;

    const fewHashtags = posts.filter(p => p.hashtags.length <= 3);
    const manyHashtags = posts.filter(p => p.hashtags.length > 5);
    const fewEng = fewHashtags.length > 0 ? fewHashtags.reduce((s, p) => s + p.engagement_rate, 0) / fewHashtags.length : 0;
    const manyEng = manyHashtags.length > 0 ? manyHashtags.reduce((s, p) => s + p.engagement_rate, 0) / manyHashtags.length : 0;

    return {
        profile,
        posts,
        metrics: {
            avgLikes: Math.round(avgLikes),
            avgComments: Math.round(avgComments),
            avgEngagement: avgEngagement,
            totalLikes, totalComments,
            likeCommentRatio: Math.round(likeCommentRatio),
            postsPerWeek: Math.round(postsPerWeek * 10) / 10,
            ffRatio: Math.round(ffRatio),
            bestDay, bestHour,
            topHashtags: hashtagCounts,
            totalPostsAnalyzed: posts.length,
            shortEng, longEng, fewEng, manyEng,
        }
    };
}

// ===== Carregar Perfil =====
function loadProfile(username) {
    username = username.toLowerCase().replace("@", "").trim();
    if (!username) return;

    const raw = DEMO_PROFILES[username];
    if (!raw) {
        alert(`Perfil "${username}" nao encontrado nos dados demo.\nTente: natgeo, instagram, cristiano`);
        return;
    }

    currentProfile = processData(raw);
    document.getElementById("welcome").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    document.getElementById("demo-banner").style.display = "block";

    navigateTo("overview");
}

// ===== Navegacao =====
function navigateTo(page) {
    currentPage = page;

    // Update nav
    document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
    document.querySelector(`[data-page="${page}"]`).classList.add("active");

    // Show/hide pages
    document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
    document.getElementById(`page-${page}`).classList.add("active");

    // Render page
    renderPage(page);
}

function renderPage(page) {
    if (!currentProfile) return;

    switch(page) {
        case "overview": renderOverview(); break;
        case "posts": renderPosts(); break;
        case "temporal": renderTemporal(); break;
        case "content": renderContent(); break;
    }
}

// ===== Page: Overview =====
function renderOverview() {
    const { profile, posts, metrics } = currentProfile;
    const tier = getInfluencerTier(profile.followers);

    // Profile Card
    document.getElementById("ov-profile").innerHTML = `
        <div class="profile-header">
            <div class="profile-avatar" style="background:${tier.color};">${profile.full_name[0]}</div>
            <div class="profile-info">
                <div class="name">${profile.full_name}
                    ${profile.is_verified ? '<span class="verified-badge">✓ Verificado</span>' : ''}
                </div>
                <div class="username">@${profile.username}</div>
                <span class="tier-badge" style="background:${tier.color}22;color:${tier.color};border:1px solid ${tier.color}44;">${tier.name}</span>
            </div>
        </div>
        <p class="profile-bio">${profile.biography}</p>
        <div class="stat-row">
            <div class="stat-item"><div class="stat-value">${formatNumber(profile.followers)}</div><div class="stat-label">Seguidores</div></div>
            <div class="stat-item"><div class="stat-value">${formatNumber(profile.following)}</div><div class="stat-label">Seguindo</div></div>
            <div class="stat-item"><div class="stat-value">${formatNumber(profile.media_count)}</div><div class="stat-label">Posts</div></div>
        </div>
    `;

    // KPIs
    document.getElementById("ov-kpis").innerHTML = `
        <div class="kpi-card"><div class="kpi-icon">👥</div><div class="kpi-label">Seguidores</div><div class="kpi-value">${formatNumber(profile.followers)}</div></div>
        <div class="kpi-card"><div class="kpi-icon">📈</div><div class="kpi-label">Engagement Rate</div><div class="kpi-value">${metrics.avgEngagement.toFixed(2)}%</div></div>
        <div class="kpi-card"><div class="kpi-icon">❤️</div><div class="kpi-label">Media de Likes</div><div class="kpi-value">${formatNumber(metrics.avgLikes)}</div></div>
        <div class="kpi-card"><div class="kpi-icon">📅</div><div class="kpi-label">Posts/Semana</div><div class="kpi-value">${metrics.postsPerWeek}</div></div>
    `;

    // Insights
    document.getElementById("ov-insights").innerHTML = `
        <div class="insight-card"><div class="insight-value">${formatNumber(metrics.avgComments)}</div><div class="insight-label">Media de Comentarios</div></div>
        <div class="insight-card"><div class="insight-value">${metrics.likeCommentRatio}:1</div><div class="insight-label">Ratio Likes/Comments</div></div>
        <div class="insight-card"><div class="insight-value">${metrics.ffRatio}:1</div><div class="insight-label">Seguidores/Seguindo</div></div>
        <div class="insight-card"><div class="insight-value">${metrics.totalPostsAnalyzed}</div><div class="insight-label">Posts Analisados</div></div>
    `;

    // Charts
    chartEngagementLine(document.getElementById("ov-chart-engagement"), posts);
    chartTopPostsBar(document.getElementById("ov-chart-top"), posts);
}

// ===== Page: Posts =====
function renderPosts() {
    const { posts, metrics } = currentProfile;

    chartEngagementDistribution(document.getElementById("ps-chart-dist"), posts);
    chartMediaTypePie(document.getElementById("ps-chart-pie"), posts);
    chartTypeEngagement(document.getElementById("ps-chart-type"), posts);

    // Top 10 table
    const top = [...posts].sort((a, b) => b.engagement_rate - a.engagement_rate).slice(0, 10);
    let html = `<div class="post-row post-row-header">
        <div>Post</div><div style="text-align:right">Likes</div><div style="text-align:right">Comments</div>
        <div style="text-align:right">Engagement</div><div style="text-align:right">Hashtags</div>
    </div>`;

    top.forEach(p => {
        const caption = p.caption.length > 70 ? p.caption.slice(0, 70) + "..." : p.caption;
        const dateStr = p.date.toLocaleDateString("pt-BR");
        html += `<div class="post-row">
            <div class="post-caption"><span class="post-type">${p.media_type}</span> · ${dateStr}<br>${caption}</div>
            <div class="post-metric">${formatNumber(p.likes)}</div>
            <div class="post-metric">${formatNumber(p.comments)}</div>
            <div class="post-metric">${p.engagement_rate.toFixed(2)}%</div>
            <div class="post-metric">${p.hashtags.length}</div>
        </div>`;
    });

    document.getElementById("ps-table").innerHTML = html;
}

// ===== Page: Temporal =====
function renderTemporal() {
    const { posts, metrics } = currentProfile;

    document.getElementById("tp-insights").innerHTML = `
        <div class="insight-card"><div class="insight-value">${metrics.bestDay}</div><div class="insight-label">Melhor Dia para Postar</div></div>
        <div class="insight-card"><div class="insight-value">${String(metrics.bestHour).padStart(2, "0")}:00</div><div class="insight-label">Melhor Horario</div></div>
        <div class="insight-card"><div class="insight-value">${metrics.postsPerWeek}</div><div class="insight-label">Posts por Semana</div></div>
    `;

    chartPostingHeatmap(document.getElementById("tp-chart-heatmap"), posts);
    chartEngagementByDay(document.getElementById("tp-chart-day"), posts);
    chartEngagementByHour(document.getElementById("tp-chart-hour"), posts);
    chartPostingFrequency(document.getElementById("tp-chart-freq"), posts);
}

// ===== Page: Content =====
function renderContent() {
    const { posts, metrics } = currentProfile;

    chartCaptionVsEngagement(document.getElementById("ct-chart-caption"), posts);
    chartHashtagBar(document.getElementById("ct-chart-hashtag"), metrics.topHashtags);
    chartTypeEngagement(document.getElementById("ct-chart-type"), posts);

    // Content insights
    const captionWinner = metrics.shortEng > metrics.longEng ? "Curtas (<100 chars)" : "Longas (300+ chars)";
    const hashtagWinner = metrics.fewEng > metrics.manyEng ? "Poucas (0-3)" : "Muitas (5+)";

    document.getElementById("ct-insights").innerHTML = `
        <div class="insight-card">
            <div class="insight-label">Captions que Performam Melhor</div>
            <div class="insight-value" style="font-size:17px;">${captionWinner}</div>
            <div class="insight-sub">Curtas: ${metrics.shortEng.toFixed(2)}% · Longas: ${metrics.longEng.toFixed(2)}%</div>
        </div>
        <div class="insight-card">
            <div class="insight-label">Quantidade Ideal de Hashtags</div>
            <div class="insight-value" style="font-size:17px;">${hashtagWinner}</div>
            <div class="insight-sub">0-3 tags: ${metrics.fewEng.toFixed(2)}% · 5+ tags: ${metrics.manyEng.toFixed(2)}%</div>
        </div>
    `;
}

// ===== Event Listeners =====
document.addEventListener("DOMContentLoaded", () => {
    // Search
    document.getElementById("btn-search").addEventListener("click", () => {
        loadProfile(document.getElementById("search-input").value);
    });

    document.getElementById("search-input").addEventListener("keypress", (e) => {
        if (e.key === "Enter") loadProfile(e.target.value);
    });

    // Demo chips
    document.querySelectorAll(".demo-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            const username = chip.dataset.username;
            document.getElementById("search-input").value = username;
            loadProfile(username);
        });
    });

    // Navigation
    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", () => navigateTo(item.dataset.page));
    });

    // Mobile toggle
    document.getElementById("mobile-toggle").addEventListener("click", () => {
        document.querySelector(".sidebar").classList.toggle("open");
    });

    // Close sidebar on nav click (mobile)
    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", () => {
            if (window.innerWidth <= 768) {
                document.querySelector(".sidebar").classList.remove("open");
            }
        });
    });
});
