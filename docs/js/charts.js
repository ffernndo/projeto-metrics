// ═══════════════════════════════════════
// Plotly Charts — Portfolio Theme
// ═══════════════════════════════════════

const C = {
    teal: "#5eead4", tealDk: "#2dd4bf", tealLt: "#99f6e4",
    green: "#3fb950", blue: "#58a6ff", purple: "#bc8cff",
    red: "#f85149", yellow: "#d29922"
};

const BL = {
    paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "Inter,-apple-system,sans-serif", color: "#8b949e", size: 11 },
    margin: { l: 55, r: 20, t: 12, b: 50 },
    xaxis: { gridcolor: "#21262d", linecolor: "#30363d", zerolinecolor: "#30363d", tickfont: { size: 10 } },
    yaxis: { gridcolor: "#21262d", linecolor: "#30363d", zerolinecolor: "#30363d", tickfont: { size: 10 } },
    hoverlabel: { bgcolor: "#161b22", font: { size: 11, color: "#e6edf3", family: "Inter" }, bordercolor: "#5eead4" },
    legend: { orientation: "h", y: -0.25, font: { size: 10, color: "#8b949e" } },
    colorway: [C.teal, C.blue, C.green, C.purple, C.red, C.yellow, C.tealLt, C.tealDk]
};

const PC = { displayModeBar: false, responsive: true };

function ml(o) {
    return { ...BL, ...o, xaxis: { ...BL.xaxis, ...(o.xaxis || {}) }, yaxis: { ...BL.yaxis, ...(o.yaxis || {}) }, font: { ...BL.font, ...(o.font || {}) } };
}

// ═══ OVERVIEW ═══

function chartEngagementLine(el, df) {
    const s = [...df].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const x = s.map(d => d.timestamp), y = s.map(d => d.engagement_rate);
    const t = [{ x, y, mode: "lines+markers", name: "Engagement", line: { color: C.teal, width: 2 }, marker: { size: 4 }, hovertemplate: "<b>%{x|%d/%m/%Y}</b><br>Engagement: %{y:.3f}%<br><i>(likes+comments)/followers×100</i><extra></extra>" }];
    if (s.length >= 7) {
        const ma = y.map((_, i) => i < 6 ? null : y.slice(i - 6, i + 1).reduce((a, b) => a + b, 0) / 7);
        t.push({ x, y: ma, mode: "lines", name: "Media Movel (7)", line: { color: C.blue, width: 2, dash: "dash" }, hovertemplate: "<b>%{x|%d/%m/%Y}</b><br>%{y:.3f}%<extra></extra>" });
    }
    Plotly.newPlot(el, t, ml({ yaxis: { ...BL.yaxis, title: { text: "Engagement (%)", font: { size: 11 } } }, height: 340 }), PC);
}

function chartEngDay(el, df) {
    const daysPt = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];
    const g = {}; df.forEach(d => { const di = (new Date(d.timestamp).getDay() + 6) % 7; if (!g[di]) g[di] = []; g[di].push(d.engagement_rate); });
    const av = daysPt.map((_, i) => g[i] ? g[i].reduce((a, b) => a + b, 0) / g[i].length : 0);
    const mi = av.indexOf(Math.max(...av));
    Plotly.newPlot(el, [{
        x: daysPt, y: av, type: "bar",
        marker: { color: av.map((_, i) => i === mi ? C.teal : "#2dd4bf55"), line: { color: "#0d1117", width: 1 } },
        text: av.map(v => v.toFixed(3) + "%"), textposition: "outside", textfont: { color: "#8b949e", size: 9 },
        hovertemplate: "<b>%{x}</b><br>%{y:.3f}%<extra></extra>"
    }], ml({ yaxis: { ...BL.yaxis, title: { text: "Engagement (%)", font: { size: 11 } } }, height: 340 }), PC);
}

function chartEngHour(el, df) {
    const g = {}; df.forEach(d => { const h = new Date(d.timestamp).getHours(); if (!g[h]) g[h] = []; g[h].push(d.engagement_rate); });
    const hrs = Array.from({ length: 24 }, (_, i) => i);
    const av = hrs.map(h => g[h] ? g[h].reduce((a, b) => a + b, 0) / g[h].length : 0);
    const mi = av.indexOf(Math.max(...av));
    Plotly.newPlot(el, [{
        x: hrs.map(h => String(h).padStart(2, "0") + "h"), y: av, type: "bar",
        marker: { color: av.map((_, i) => i === mi ? C.teal : "#2dd4bf55"), line: { color: "#0d1117", width: 1 } },
        hovertemplate: "<b>%{x}</b><br>%{y:.3f}%<extra></extra>"
    }], ml({ yaxis: { ...BL.yaxis, title: { text: "Engagement (%)", font: { size: 11 } } }, xaxis: { ...BL.xaxis, dtick: 2 }, height: 340 }), PC);
}

function chartMediaPie(el, df) {
    const ct = {}; df.forEach(d => { ct[d.media_type] = (ct[d.media_type] || 0) + 1; });
    const total = df.length;
    const lb = Object.keys(ct), vl = Object.values(ct), cm = { IMAGE: C.teal, VIDEO: C.blue, CAROUSEL: C.purple };
    Plotly.newPlot(el, [{
        labels: lb, values: vl, type: "pie", hole: .45,
        marker: { colors: lb.map(l => cm[l] || C.green), line: { color: "#0d1117", width: 2 } },
        textinfo: "percent", textfont: { size: 12, color: "#e6edf3" },
        hovertemplate: "<b>%{label}</b><br>%{value} de " + total + " posts<br>%{percent}<extra></extra>",
        domain: { x: [0.05, 0.95], y: [0.02, 0.98] }
    }], ml({ showlegend: false, height: 260, margin: { l: 10, r: 10, t: 10, b: 10 } }), PC);
}

function chartHashtags(el, ht) {
    const e = Object.entries(ht).sort((a, b) => b[1] - a[1]).slice(0, 12).reverse();
    if (!e.length) { el.innerHTML = '<p style="text-align:center;color:#6e7681;padding:30px;font-size:.78rem">Nenhuma hashtag</p>'; return; }
    Plotly.newPlot(el, [{
        y: e.map(x => "#" + x[0]), x: e.map(x => x[1]), type: "bar", orientation: "h",
        marker: { color: C.teal, line: { color: "#0d1117", width: 1 } },
        hovertemplate: "<b>%{y}</b><br>%{x} uso(s)<extra></extra>"
    }], ml({ xaxis: { ...BL.xaxis, title: { text: "Frequencia", font: { size: 11 } } }, height: 340, margin: { l: 100, r: 20, t: 12, b: 50 } }), PC);
}

// ═══ POSTS ═══

function chartEngagementDist(el, df) {
    const r = df.map(d => d.engagement_rate), avg = r.reduce((a, b) => a + b, 0) / r.length;
    Plotly.newPlot(el, [{
        x: r, type: "histogram", nbinsx: 20,
        marker: { color: C.teal, line: { color: "#0d1117", width: 1 } },
        hovertemplate: "%{x:.3f}%<br>%{y} posts<extra></extra>"
    }], ml({
        xaxis: { ...BL.xaxis, title: { text: "Engagement Rate (%)", font: { size: 11 } } },
        yaxis: { ...BL.yaxis, title: { text: "Posts", font: { size: 11 } } },
        shapes: [{ type: "line", x0: avg, x1: avg, y0: 0, y1: 1, yref: "paper", line: { color: C.red, width: 2, dash: "dash" } }],
        annotations: [{ x: avg, y: 1, yref: "paper", text: "Media: " + avg.toFixed(3) + "%", showarrow: false, font: { color: C.red, size: 10 }, yanchor: "bottom" }],
        height: 340
    }), PC);
}

function chartTypeEng(el, df) {
    const g = {}; df.forEach(d => { if (!g[d.media_type]) g[d.media_type] = []; g[d.media_type].push(d.engagement_rate); });
    const tp = Object.keys(g), av = tp.map(t => g[t].reduce((a, b) => a + b, 0) / g[t].length);
    const cm = { IMAGE: C.teal, VIDEO: C.blue, CAROUSEL: C.purple };
    Plotly.newPlot(el, [{
        x: tp, y: av, type: "bar",
        marker: { color: tp.map(t => cm[t] || C.green), line: { color: "#0d1117", width: 1 } },
        text: av.map(v => v.toFixed(3) + "%"), textposition: "outside", textfont: { color: "#8b949e", size: 10 },
        hovertemplate: "<b>%{x}</b><br>%{y:.3f}%<extra></extra>"
    }], ml({ yaxis: { ...BL.yaxis, title: { text: "Engagement (%)", font: { size: 11 } } }, height: 240 }), PC);
}
