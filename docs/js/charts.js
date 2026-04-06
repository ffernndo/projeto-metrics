// ===== Chart Factory (Plotly.js) com tema Obsidian =====

const COLORS = {
    accent1: "#A855F7",
    accent2: "#6C5CE7",
    cyan: "#06B6D4",
    pink: "#EC4899",
    green: "#00D68F",
    yellow: "#FDCB6E",
    red: "#FF6B6B",
    blue: "#38BDF8",
};

const CHART_PALETTE = [COLORS.accent1, COLORS.accent2, COLORS.cyan, COLORS.pink, COLORS.green, COLORS.yellow, COLORS.red, COLORS.blue];

const BASE_LAYOUT = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "Inter, sans-serif", color: "#F0F0F5", size: 12 },
    margin: { l: 50, r: 20, t: 45, b: 45 },
    xaxis: { gridcolor: "#2A2A3E", linecolor: "#2A2A3E", zerolinecolor: "#2A2A3E" },
    yaxis: { gridcolor: "#2A2A3E", linecolor: "#2A2A3E", zerolinecolor: "#2A2A3E" },
    hoverlabel: { bgcolor: "#1A1A2E", font: { size: 12, color: "#F0F0F5" }, bordercolor: "#2A2A3E" },
    legend: { orientation: "h", y: -0.18, font: { size: 11 } },
};

const PLOTLY_CONFIG = { displayModeBar: false, responsive: true };

function mergeLayout(custom) {
    return {
        ...BASE_LAYOUT,
        ...custom,
        xaxis: { ...BASE_LAYOUT.xaxis, ...(custom.xaxis || {}) },
        yaxis: { ...BASE_LAYOUT.yaxis, ...(custom.yaxis || {}) },
    };
}

// ===== Chart Functions =====

function chartEngagementLine(el, df) {
    const sorted = [...df].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const x = sorted.map(d => d.timestamp);
    const y = sorted.map(d => d.engagement_rate);

    const traces = [{
        x, y,
        mode: "lines+markers",
        name: "Engagement Rate",
        line: { color: COLORS.accent1, width: 2 },
        marker: { size: 4 },
        hovertemplate: "<b>%{x|%d/%m/%Y}</b><br>Engagement: %{y:.2f}%<extra></extra>",
    }];

    // Rolling average (7)
    if (sorted.length >= 7) {
        const rolling = y.map((_, i) => {
            if (i < 6) return null;
            const slice = y.slice(i - 6, i + 1);
            return slice.reduce((a, b) => a + b, 0) / 7;
        });
        traces.push({
            x, y: rolling,
            mode: "lines",
            name: "Media Movel (7)",
            line: { color: COLORS.accent2, width: 2, dash: "dash" },
            hovertemplate: "<b>%{x|%d/%m/%Y}</b><br>Media: %{y:.2f}%<extra></extra>",
        });
    }

    Plotly.newPlot(el, traces, mergeLayout({
        title: { text: "Taxa de Engagement ao Longo do Tempo", font: { size: 15 } },
        yaxis: { ...BASE_LAYOUT.yaxis, title: "Engagement Rate (%)" },
        height: 340,
    }), PLOTLY_CONFIG);
}

function chartTopPostsBar(el, df) {
    const top = [...df].sort((a, b) => b.engagement_rate - a.engagement_rate).slice(0, 10).reverse();
    const labels = top.map((_, i) => `Post ${10 - i}`);

    Plotly.newPlot(el, [
        {
            y: labels, x: top.map(d => d.likes), name: "Likes", orientation: "h",
            marker: { color: COLORS.accent1 },
            hovertemplate: "Likes: %{x:,.0f}<extra></extra>",
        },
        {
            y: labels, x: top.map(d => d.comments), name: "Comments", orientation: "h",
            marker: { color: COLORS.accent2 },
            hovertemplate: "Comments: %{x:,.0f}<extra></extra>",
        },
    ], mergeLayout({
        title: { text: "Top 10 Posts por Engagement", font: { size: 15 } },
        barmode: "stack",
        height: 380,
        xaxis: { ...BASE_LAYOUT.xaxis, title: "Interacoes" },
    }), PLOTLY_CONFIG);
}

function chartEngagementDistribution(el, df) {
    const rates = df.map(d => d.engagement_rate);
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;

    Plotly.newPlot(el, [{
        x: rates, type: "histogram", nbinsx: 20,
        marker: { color: COLORS.accent1, line: { color: "#12121A", width: 1 } },
        hovertemplate: "Engagement: %{x:.2f}%<br>Posts: %{y}<extra></extra>",
    }], mergeLayout({
        title: { text: "Distribuicao de Engagement Rate", font: { size: 15 } },
        xaxis: { ...BASE_LAYOUT.xaxis, title: "Engagement Rate (%)" },
        yaxis: { ...BASE_LAYOUT.yaxis, title: "Numero de Posts" },
        shapes: [{
            type: "line", x0: avg, x1: avg, y0: 0, y1: 1, yref: "paper",
            line: { color: COLORS.red, width: 2, dash: "dash" },
        }],
        annotations: [{
            x: avg, y: 1, yref: "paper", text: `Media: ${avg.toFixed(2)}%`,
            showarrow: false, font: { color: COLORS.red, size: 11 }, yanchor: "bottom",
        }],
        height: 340,
    }), PLOTLY_CONFIG);
}

function chartMediaTypePie(el, df) {
    const counts = {};
    df.forEach(d => { counts[d.media_type] = (counts[d.media_type] || 0) + 1; });
    const labels = Object.keys(counts);
    const values = Object.values(counts);
    const colorMap = { IMAGE: COLORS.accent1, VIDEO: COLORS.cyan, CAROUSEL: COLORS.pink };

    Plotly.newPlot(el, [{
        labels, values, type: "pie", hole: 0.45,
        marker: { colors: labels.map(l => colorMap[l] || COLORS.green), line: { color: "#12121A", width: 2 } },
        textinfo: "label+percent",
        textfont: { size: 12, color: "#F0F0F5" },
        hovertemplate: "<b>%{label}</b><br>%{value} posts (%{percent})<extra></extra>",
    }], mergeLayout({
        title: { text: "Distribuicao por Tipo de Conteudo", font: { size: 15 } },
        showlegend: false, height: 340,
    }), PLOTLY_CONFIG);
}

function chartTypeEngagement(el, df) {
    const groups = {};
    df.forEach(d => {
        if (!groups[d.media_type]) groups[d.media_type] = [];
        groups[d.media_type].push(d.engagement_rate);
    });
    const types = Object.keys(groups);
    const avgs = types.map(t => groups[t].reduce((a, b) => a + b, 0) / groups[t].length);
    const colorMap = { IMAGE: COLORS.accent1, VIDEO: COLORS.cyan, CAROUSEL: COLORS.pink };

    Plotly.newPlot(el, [{
        x: types, y: avgs, type: "bar",
        marker: { color: types.map(t => colorMap[t] || COLORS.green) },
        text: avgs.map(v => v.toFixed(2) + "%"), textposition: "outside",
        textfont: { color: "#F0F0F5", size: 12 },
        hovertemplate: "<b>%{x}</b><br>Engagement: %{y:.2f}%<extra></extra>",
    }], mergeLayout({
        title: { text: "Engagement Medio por Tipo de Conteudo", font: { size: 15 } },
        yaxis: { ...BASE_LAYOUT.yaxis, title: "Engagement Rate (%)" },
        height: 340,
    }), PLOTLY_CONFIG);
}

function chartPostingHeatmap(el, df) {
    const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
    const daysPt = ["Segunda","Terca","Quarta","Quinta","Sexta","Sabado","Domingo"];
    const matrix = days.map(() => new Array(24).fill(0));

    df.forEach(d => {
        const dt = new Date(d.timestamp);
        const dayIdx = (dt.getDay() + 6) % 7; // Monday=0
        matrix[dayIdx][dt.getHours()]++;
    });

    Plotly.newPlot(el, [{
        z: matrix,
        x: Array.from({length: 24}, (_, i) => `${String(i).padStart(2, "0")}h`),
        y: daysPt,
        type: "heatmap",
        colorscale: [[0, "#1A1A2E"], [0.5, "#6C5CE7"], [1, "#A855F7"]],
        hovertemplate: "<b>%{y}</b> as <b>%{x}</b><br>%{z} post(s)<extra></extra>",
        showscale: true,
        colorbar: { title: { text: "Posts", font: { color: "#8888A0" } } },
    }], mergeLayout({
        title: { text: "Padrao de Postagem (Dia x Hora)", font: { size: 15 } },
        xaxis: { ...BASE_LAYOUT.xaxis, title: "Hora do Dia" },
        height: 340,
    }), PLOTLY_CONFIG);
}

function chartEngagementByDay(el, df) {
    const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
    const daysPt = ["Seg","Ter","Qua","Qui","Sex","Sab","Dom"];
    const groups = {};
    df.forEach(d => {
        const dt = new Date(d.timestamp);
        const dayIdx = (dt.getDay() + 6) % 7;
        const dayName = days[dayIdx];
        if (!groups[dayName]) groups[dayName] = [];
        groups[dayName].push(d.engagement_rate);
    });

    const avgs = days.map(d => groups[d] ? groups[d].reduce((a, b) => a + b, 0) / groups[d].length : 0);
    const maxIdx = avgs.indexOf(Math.max(...avgs));
    const colors = avgs.map((_, i) => i === maxIdx ? COLORS.accent1 : COLORS.accent2);

    Plotly.newPlot(el, [{
        x: daysPt, y: avgs, type: "bar", marker: { color: colors },
        hovertemplate: "<b>%{x}</b><br>Engagement: %{y:.2f}%<extra></extra>",
    }], mergeLayout({
        title: { text: "Engagement Medio por Dia da Semana", font: { size: 15 } },
        yaxis: { ...BASE_LAYOUT.yaxis, title: "Engagement Rate (%)" },
        height: 340,
    }), PLOTLY_CONFIG);
}

function chartEngagementByHour(el, df) {
    const groups = {};
    df.forEach(d => {
        const h = new Date(d.timestamp).getHours();
        if (!groups[h]) groups[h] = [];
        groups[h].push(d.engagement_rate);
    });

    const hours = Array.from({length: 24}, (_, i) => i);
    const avgs = hours.map(h => groups[h] ? groups[h].reduce((a, b) => a + b, 0) / groups[h].length : 0);
    const maxIdx = avgs.indexOf(Math.max(...avgs));
    const colors = avgs.map((_, i) => i === maxIdx ? COLORS.accent1 : COLORS.accent2);

    Plotly.newPlot(el, [{
        x: hours.map(h => `${String(h).padStart(2, "0")}h`),
        y: avgs, type: "bar", marker: { color: colors },
        hovertemplate: "<b>%{x}</b><br>Engagement: %{y:.2f}%<extra></extra>",
    }], mergeLayout({
        title: { text: "Engagement Medio por Hora do Dia", font: { size: 15 } },
        yaxis: { ...BASE_LAYOUT.yaxis, title: "Engagement Rate (%)" },
        height: 340,
    }), PLOTLY_CONFIG);
}

function chartPostingFrequency(el, df) {
    const sorted = [...df].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const weekly = {};
    sorted.forEach(d => {
        const dt = new Date(d.timestamp);
        const weekStart = new Date(dt);
        weekStart.setDate(dt.getDate() - dt.getDay());
        const key = weekStart.toISOString().slice(0, 10);
        weekly[key] = (weekly[key] || 0) + 1;
    });

    const weeks = Object.keys(weekly).sort();
    const counts = weeks.map(w => weekly[w]);

    Plotly.newPlot(el, [{
        x: weeks, y: counts,
        mode: "lines+markers",
        line: { color: COLORS.accent1, width: 2 },
        marker: { size: 5, color: COLORS.accent1 },
        fill: "tozeroy",
        fillcolor: "rgba(168,85,247,0.08)",
        hovertemplate: "<b>%{x}</b><br>%{y} post(s)<extra></extra>",
    }], mergeLayout({
        title: { text: "Frequencia de Postagem por Semana", font: { size: 15 } },
        yaxis: { ...BASE_LAYOUT.yaxis, title: "Posts por Semana" },
        height: 340,
    }), PLOTLY_CONFIG);
}

function chartCaptionVsEngagement(el, df) {
    Plotly.newPlot(el, [{
        x: df.map(d => d.caption.length),
        y: df.map(d => d.engagement_rate),
        mode: "markers",
        marker: {
            size: 7,
            color: df.map(d => d.likes + d.comments),
            colorscale: [[0, COLORS.accent2], [1, COLORS.accent1]],
            showscale: true,
            colorbar: { title: { text: "Interacoes" } },
            line: { width: 1, color: "#2A2A3E" },
        },
        hovertemplate: "<b>Caption:</b> %{x} chars<br><b>Engagement:</b> %{y:.2f}%<extra></extra>",
    }], mergeLayout({
        title: { text: "Tamanho da Caption vs Engagement", font: { size: 15 } },
        xaxis: { ...BASE_LAYOUT.xaxis, title: "Caracteres na Caption" },
        yaxis: { ...BASE_LAYOUT.yaxis, title: "Engagement Rate (%)" },
        height: 380,
    }), PLOTLY_CONFIG);
}

function chartHashtagBar(el, hashtags) {
    const entries = Object.entries(hashtags).sort((a, b) => b[1] - a[1]).slice(0, 15).reverse();
    if (entries.length === 0) {
        el.innerHTML = '<p style="text-align:center;color:#8888A0;padding:40px;">Nenhuma hashtag encontrada</p>';
        return;
    }

    Plotly.newPlot(el, [{
        y: entries.map(e => "#" + e[0]),
        x: entries.map(e => e[1]),
        type: "bar", orientation: "h",
        marker: { color: COLORS.accent1 },
        hovertemplate: "<b>%{y}</b><br>%{x} uso(s)<extra></extra>",
    }], mergeLayout({
        title: { text: "Hashtags Mais Utilizadas", font: { size: 15 } },
        xaxis: { ...BASE_LAYOUT.xaxis, title: "Frequencia" },
        height: Math.max(300, entries.length * 26),
    }), PLOTLY_CONFIG);
}
