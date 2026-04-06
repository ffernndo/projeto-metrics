// ═══════════════════════════════════════
// Plotly Charts — Portfolio Theme
// ═══════════════════════════════════════

const C = {
    teal: "#5eead4", tealDk: "#2dd4bf", tealLt: "#99f6e4",
    green: "#3fb950", blue: "#58a6ff", purple: "#bc8cff",
    red: "#f85149", yellow: "#d29922"
};

const BASE_LAYOUT = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "Inter, -apple-system, sans-serif", color: "#8b949e", size: 12 },
    margin: { l: 60, r: 24, t: 48, b: 56 },
    xaxis: { gridcolor: "#21262d", linecolor: "#30363d", zerolinecolor: "#30363d", tickfont: { size: 11 } },
    yaxis: { gridcolor: "#21262d", linecolor: "#30363d", zerolinecolor: "#30363d", tickfont: { size: 11 } },
    hoverlabel: { bgcolor: "#161b22", font: { size: 12, color: "#e6edf3", family: "Inter" }, bordercolor: "#5eead4" },
    legend: { orientation: "h", y: -0.22, font: { size: 11, color: "#8b949e" } },
    colorway: [C.teal, C.blue, C.green, C.purple, C.red, C.yellow, C.tealLt, C.tealDk]
};

const PLOT_CFG = { displayModeBar: false, responsive: true };

function layout(overrides) {
    return {
        ...BASE_LAYOUT, ...overrides,
        xaxis: { ...BASE_LAYOUT.xaxis, ...(overrides.xaxis || {}) },
        yaxis: { ...BASE_LAYOUT.yaxis, ...(overrides.yaxis || {}) },
        font: { ...BASE_LAYOUT.font, ...(overrides.font || {}) }
    };
}

// ═══════════════════════════════════════
// OVERVIEW CHARTS
// ═══════════════════════════════════════

function chartEngagementLine(el, df) {
    const s = [...df].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const x = s.map(d => d.timestamp), y = s.map(d => d.engagement_rate);
    const traces = [{
        x, y, mode: "lines+markers", name: "Engagement Rate",
        line: { color: C.teal, width: 2.5 }, marker: { size: 5, color: C.teal },
        hovertemplate: "<b>%{x|%d/%m/%Y}</b><br>Engagement: %{y:.3f}%<extra></extra>"
    }];
    if (s.length >= 7) {
        const ma = y.map((_, i) => i < 6 ? null : y.slice(i - 6, i + 1).reduce((a, b) => a + b, 0) / 7);
        traces.push({
            x, y: ma, mode: "lines", name: "Media Movel (7 posts)",
            line: { color: C.blue, width: 2, dash: "dash" },
            hovertemplate: "<b>%{x|%d/%m/%Y}</b><br>Media: %{y:.3f}%<extra></extra>"
        });
    }
    Plotly.newPlot(el, traces, layout({
        yaxis: { ...BASE_LAYOUT.yaxis, title: { text: "Engagement Rate (%)", font: { size: 12 } } },
        xaxis: { ...BASE_LAYOUT.xaxis, title: { text: "Data", font: { size: 12 } } },
        height: 380
    }), PLOT_CFG);
}

function chartTopPostsBar(el, df) {
    const top = [...df].sort((a, b) => b.engagement_rate - a.engagement_rate).slice(0, 10).reverse();
    const lb = top.map((_, i) => "Post " + (10 - i));
    Plotly.newPlot(el, [
        { y: lb, x: top.map(d => d.likes), name: "Likes", orientation: "h", type: "bar", marker: { color: C.teal }, hovertemplate: "Likes: %{x:,.0f}<extra></extra>" },
        { y: lb, x: top.map(d => d.comments), name: "Comments", orientation: "h", type: "bar", marker: { color: C.blue }, hovertemplate: "Comments: %{x:,.0f}<extra></extra>" }
    ], layout({
        barmode: "stack", height: 380,
        xaxis: { ...BASE_LAYOUT.xaxis, title: { text: "Total de Interacoes", font: { size: 12 } } },
        margin: { l: 70, r: 24, t: 48, b: 56 }
    }), PLOT_CFG);
}

// ═══════════════════════════════════════
// POSTS CHARTS
// ═══════════════════════════════════════

function chartEngagementDist(el, df) {
    const r = df.map(d => d.engagement_rate), avg = r.reduce((a, b) => a + b, 0) / r.length;
    Plotly.newPlot(el, [{
        x: r, type: "histogram", nbinsx: 20,
        marker: { color: C.teal, line: { color: "#0d1117", width: 1 } },
        hovertemplate: "Engagement: %{x:.3f}%<br>Posts: %{y}<extra></extra>"
    }], layout({
        xaxis: { ...BASE_LAYOUT.xaxis, title: { text: "Engagement Rate (%)", font: { size: 12 } } },
        yaxis: { ...BASE_LAYOUT.yaxis, title: { text: "Quantidade de Posts", font: { size: 12 } } },
        shapes: [{ type: "line", x0: avg, x1: avg, y0: 0, y1: 1, yref: "paper", line: { color: C.red, width: 2, dash: "dash" } }],
        annotations: [{ x: avg, y: 1, yref: "paper", text: "Media: " + avg.toFixed(3) + "%", showarrow: false, font: { color: C.red, size: 11 }, yanchor: "bottom" }],
        height: 380
    }), PLOT_CFG);
}

function chartMediaPie(el, df) {
    const ct = {}; df.forEach(d => { ct[d.media_type] = (ct[d.media_type] || 0) + 1; });
    const lb = Object.keys(ct), vl = Object.values(ct);
    const cm = { IMAGE: C.teal, VIDEO: C.blue, CAROUSEL: C.purple };
    Plotly.newPlot(el, [{
        labels: lb, values: vl, type: "pie", hole: .45,
        marker: { colors: lb.map(l => cm[l] || C.green), line: { color: "#0d1117", width: 2 } },
        textinfo: "label+percent", textfont: { size: 12, color: "#e6edf3" },
        hovertemplate: "<b>%{label}</b><br>%{value} posts (%{percent})<extra></extra>"
    }], layout({ showlegend: false, height: 280, margin: { l: 20, r: 20, t: 20, b: 20 } }), PLOT_CFG);
}

function chartTypeEng(el, df) {
    const g = {}; df.forEach(d => { if (!g[d.media_type]) g[d.media_type] = []; g[d.media_type].push(d.engagement_rate); });
    const tp = Object.keys(g), av = tp.map(t => g[t].reduce((a, b) => a + b, 0) / g[t].length);
    const cm = { IMAGE: C.teal, VIDEO: C.blue, CAROUSEL: C.purple };
    Plotly.newPlot(el, [{
        x: tp, y: av, type: "bar",
        marker: { color: tp.map(t => cm[t] || C.green), line: { color: "#0d1117", width: 1 } },
        text: av.map(v => v.toFixed(3) + "%"), textposition: "outside",
        textfont: { color: "#e6edf3", size: 11 },
        hovertemplate: "<b>%{x}</b><br>Engagement: %{y:.3f}%<extra></extra>"
    }], layout({
        yaxis: { ...BASE_LAYOUT.yaxis, title: { text: "Engagement Rate (%)", font: { size: 12 } } },
        height: 280
    }), PLOT_CFG);
}

// ═══════════════════════════════════════
// TEMPORAL CHARTS
// ═══════════════════════════════════════

function chartHeatmap(el, df) {
    const daysPt = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];
    const mx = daysPt.map(() => new Array(24).fill(0));
    df.forEach(d => { const dt = new Date(d.timestamp); const di = (dt.getDay() + 6) % 7; mx[di][dt.getHours()]++; });
    Plotly.newPlot(el, [{
        z: mx,
        x: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0") + "h"),
        y: daysPt,
        type: "heatmap",
        colorscale: [[0, "#0d1117"], [0.1, "#161b22"], [0.3, "#1a3a3a"], [0.6, "#2dd4bf"], [1, "#5eead4"]],
        hovertemplate: "<b>%{y}</b> as <b>%{x}</b><br>%{z} post(s)<extra></extra>",
        showscale: true,
        colorbar: { title: { text: "Posts", font: { color: "#8b949e", size: 11 } }, tickfont: { color: "#8b949e", size: 10 }, len: 0.6 }
    }], layout({
        xaxis: { ...BASE_LAYOUT.xaxis, title: { text: "Hora do Dia", font: { size: 12 } }, dtick: 1, tickfont: { size: 10 } },
        yaxis: { ...BASE_LAYOUT.yaxis, autorange: "reversed", tickfont: { size: 11 } },
        height: 380, margin: { l: 80, r: 24, t: 48, b: 56 }
    }), PLOT_CFG);
}

function chartEngDay(el, df) {
    const daysPt = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];
    const g = {}; df.forEach(d => { const di = (new Date(d.timestamp).getDay() + 6) % 7; if (!g[di]) g[di] = []; g[di].push(d.engagement_rate); });
    const av = daysPt.map((_, i) => g[i] ? g[i].reduce((a, b) => a + b, 0) / g[i].length : 0);
    const mi = av.indexOf(Math.max(...av));
    Plotly.newPlot(el, [{
        x: daysPt, y: av, type: "bar",
        marker: { color: av.map((_, i) => i === mi ? C.teal : "#2dd4bf66"), line: { color: "#0d1117", width: 1 } },
        text: av.map(v => v.toFixed(3) + "%"), textposition: "outside",
        textfont: { color: "#8b949e", size: 10 },
        hovertemplate: "<b>%{x}</b><br>Engagement: %{y:.3f}%<extra></extra>"
    }], layout({
        yaxis: { ...BASE_LAYOUT.yaxis, title: { text: "Engagement (%)", font: { size: 12 } } },
        height: 380
    }), PLOT_CFG);
}

function chartEngHour(el, df) {
    const g = {}; df.forEach(d => { const h = new Date(d.timestamp).getHours(); if (!g[h]) g[h] = []; g[h].push(d.engagement_rate); });
    const hrs = Array.from({ length: 24 }, (_, i) => i);
    const av = hrs.map(h => g[h] ? g[h].reduce((a, b) => a + b, 0) / g[h].length : 0);
    const mi = av.indexOf(Math.max(...av));
    Plotly.newPlot(el, [{
        x: hrs.map(h => String(h).padStart(2, "0") + "h"), y: av, type: "bar",
        marker: { color: av.map((_, i) => i === mi ? C.teal : "#2dd4bf66"), line: { color: "#0d1117", width: 1 } },
        hovertemplate: "<b>%{x}</b><br>Engagement: %{y:.3f}%<extra></extra>"
    }], layout({
        yaxis: { ...BASE_LAYOUT.yaxis, title: { text: "Engagement (%)", font: { size: 12 } } },
        xaxis: { ...BASE_LAYOUT.xaxis, title: { text: "Hora", font: { size: 12 } }, dtick: 2, tickfont: { size: 10 } },
        height: 380
    }), PLOT_CFG);
}

function chartFrequency(el, df) {
    const s = [...df].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const w = {}; s.forEach(d => { const dt = new Date(d.timestamp); const ws = new Date(dt); ws.setDate(dt.getDate() - dt.getDay()); const k = ws.toISOString().slice(0, 10); w[k] = (w[k] || 0) + 1; });
    const wk = Object.keys(w).sort(), ct = wk.map(k => w[k]);
    Plotly.newPlot(el, [{
        x: wk, y: ct, mode: "lines+markers",
        line: { color: C.teal, width: 2.5, shape: "spline" },
        marker: { size: 6, color: C.teal, line: { color: "#0d1117", width: 1 } },
        fill: "tozeroy", fillcolor: "rgba(94,234,212,.06)",
        hovertemplate: "<b>Semana de %{x}</b><br>%{y} post(s)<extra></extra>"
    }], layout({
        yaxis: { ...BASE_LAYOUT.yaxis, title: { text: "Posts / Semana", font: { size: 12 } } },
        xaxis: { ...BASE_LAYOUT.xaxis, title: { text: "Semana", font: { size: 12 } } },
        height: 380
    }), PLOT_CFG);
}

// ═══════════════════════════════════════
// CONTENT CHARTS
// ═══════════════════════════════════════

function chartCaptionEng(el, df) {
    Plotly.newPlot(el, [{
        x: df.map(d => d.caption.length), y: df.map(d => d.engagement_rate), mode: "markers",
        marker: {
            size: 9, color: df.map(d => d.likes + d.comments), opacity: 0.8,
            colorscale: [[0, C.tealDk], [1, C.teal]], showscale: true,
            colorbar: { title: { text: "Interacoes", font: { size: 11, color: "#8b949e" } }, tickfont: { color: "#8b949e" } },
            line: { width: 1, color: "#30363d" }
        },
        hovertemplate: "<b>Caption:</b> %{x} chars<br><b>Engagement:</b> %{y:.3f}%<extra></extra>"
    }], layout({
        xaxis: { ...BASE_LAYOUT.xaxis, title: { text: "Caracteres na Caption", font: { size: 12 } } },
        yaxis: { ...BASE_LAYOUT.yaxis, title: { text: "Engagement (%)", font: { size: 12 } } },
        height: 380
    }), PLOT_CFG);
}

function chartHashtags(el, ht) {
    const e = Object.entries(ht).sort((a, b) => b[1] - a[1]).slice(0, 15).reverse();
    if (!e.length) { el.innerHTML = '<p style="text-align:center;color:#8b949e;padding:40px">Nenhuma hashtag encontrada</p>'; return; }
    Plotly.newPlot(el, [{
        y: e.map(x => "#" + x[0]), x: e.map(x => x[1]), type: "bar", orientation: "h",
        marker: { color: C.teal, line: { color: "#0d1117", width: 1 } },
        hovertemplate: "<b>%{y}</b><br>%{x} uso(s)<extra></extra>"
    }], layout({
        xaxis: { ...BASE_LAYOUT.xaxis, title: { text: "Frequencia de Uso", font: { size: 12 } } },
        height: 380, margin: { l: 120, r: 24, t: 48, b: 56 }
    }), PLOT_CFG);
}
