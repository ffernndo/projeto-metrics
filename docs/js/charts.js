// ===== Plotly Chart Factory - Obsidian Theme =====
const C={a1:"#A855F7",a2:"#6C5CE7",cyan:"#06B6D4",pink:"#EC4899",green:"#00D68F",yellow:"#FDCB6E",red:"#FF6B6B",blue:"#38BDF8"};
const BL={paper_bgcolor:"rgba(0,0,0,0)",plot_bgcolor:"rgba(0,0,0,0)",font:{family:"Inter,sans-serif",color:"#F0F0F5",size:12},margin:{l:50,r:20,t:45,b:45},xaxis:{gridcolor:"#2A2A3E",linecolor:"#2A2A3E",zerolinecolor:"#2A2A3E"},yaxis:{gridcolor:"#2A2A3E",linecolor:"#2A2A3E",zerolinecolor:"#2A2A3E"},hoverlabel:{bgcolor:"#1A1A2E",font:{size:12,color:"#F0F0F5"},bordercolor:"#2A2A3E"},legend:{orientation:"h",y:-0.18,font:{size:11}}};
const PC={displayModeBar:false,responsive:true};
function ml(c){return{...BL,...c,xaxis:{...BL.xaxis,...(c.xaxis||{})},yaxis:{...BL.yaxis,...(c.yaxis||{})}}}

function chartEngagementLine(el,df){
    const s=[...df].sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
    const x=s.map(d=>d.timestamp),y=s.map(d=>d.engagement_rate);
    const t=[{x,y,mode:"lines+markers",name:"Engagement Rate",line:{color:C.a1,width:2},marker:{size:4},hovertemplate:"<b>%{x|%d/%m/%Y}</b><br>Engagement: %{y:.2f}%<extra></extra>"}];
    if(s.length>=7){const r=y.map((_,i)=>{if(i<6)return null;const sl=y.slice(i-6,i+1);return sl.reduce((a,b)=>a+b,0)/7});t.push({x,y:r,mode:"lines",name:"Media Movel (7)",line:{color:C.a2,width:2,dash:"dash"},hovertemplate:"<b>%{x|%d/%m/%Y}</b><br>Media: %{y:.2f}%<extra></extra>"})}
    Plotly.newPlot(el,t,ml({title:{text:"Taxa de Engagement ao Longo do Tempo",font:{size:15}},yaxis:{...BL.yaxis,title:"Engagement Rate (%)"},height:340}),PC);
}

function chartTopPostsBar(el,df){
    const top=[...df].sort((a,b)=>b.engagement_rate-a.engagement_rate).slice(0,10).reverse();
    const lb=top.map((_,i)=>"Post "+(10-i));
    Plotly.newPlot(el,[{y:lb,x:top.map(d=>d.likes),name:"Likes",orientation:"h",marker:{color:C.a1},hovertemplate:"Likes: %{x:,.0f}<extra></extra>"},{y:lb,x:top.map(d=>d.comments),name:"Comments",orientation:"h",marker:{color:C.a2},hovertemplate:"Comments: %{x:,.0f}<extra></extra>"}],ml({title:{text:"Top 10 Posts por Engagement",font:{size:15}},barmode:"stack",height:380,xaxis:{...BL.xaxis,title:"Interacoes"}}),PC);
}

function chartEngagementDist(el,df){
    const r=df.map(d=>d.engagement_rate),avg=r.reduce((a,b)=>a+b,0)/r.length;
    Plotly.newPlot(el,[{x:r,type:"histogram",nbinsx:20,marker:{color:C.a1,line:{color:"#12121A",width:1}},hovertemplate:"Engagement: %{x:.2f}%<br>Posts: %{y}<extra></extra>"}],ml({title:{text:"Distribuicao de Engagement Rate",font:{size:15}},xaxis:{...BL.xaxis,title:"Engagement Rate (%)"},yaxis:{...BL.yaxis,title:"Posts"},shapes:[{type:"line",x0:avg,x1:avg,y0:0,y1:1,yref:"paper",line:{color:C.red,width:2,dash:"dash"}}],annotations:[{x:avg,y:1,yref:"paper",text:"Media: "+avg.toFixed(2)+"%",showarrow:false,font:{color:C.red,size:11},yanchor:"bottom"}],height:340}),PC);
}

function chartMediaPie(el,df){
    const ct={};df.forEach(d=>{ct[d.media_type]=(ct[d.media_type]||0)+1});
    const lb=Object.keys(ct),vl=Object.values(ct),cm={IMAGE:C.a1,VIDEO:C.cyan,CAROUSEL:C.pink};
    Plotly.newPlot(el,[{labels:lb,values:vl,type:"pie",hole:.45,marker:{colors:lb.map(l=>cm[l]||C.green),line:{color:"#12121A",width:2}},textinfo:"label+percent",textfont:{size:12,color:"#F0F0F5"},hovertemplate:"<b>%{label}</b><br>%{value} posts (%{percent})<extra></extra>"}],ml({title:{text:"Distribuicao por Tipo de Conteudo",font:{size:15}},showlegend:false,height:340}),PC);
}

function chartTypeEng(el,df){
    const g={};df.forEach(d=>{if(!g[d.media_type])g[d.media_type]=[];g[d.media_type].push(d.engagement_rate)});
    const tp=Object.keys(g),av=tp.map(t=>g[t].reduce((a,b)=>a+b,0)/g[t].length),cm={IMAGE:C.a1,VIDEO:C.cyan,CAROUSEL:C.pink};
    Plotly.newPlot(el,[{x:tp,y:av,type:"bar",marker:{color:tp.map(t=>cm[t]||C.green)},text:av.map(v=>v.toFixed(2)+"%"),textposition:"outside",textfont:{color:"#F0F0F5",size:12},hovertemplate:"<b>%{x}</b><br>Engagement: %{y:.2f}%<extra></extra>"}],ml({title:{text:"Engagement Medio por Tipo",font:{size:15}},yaxis:{...BL.yaxis,title:"Engagement Rate (%)"},height:340}),PC);
}

function chartHeatmap(el,df){
    const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
    const daysPt=["Segunda","Terca","Quarta","Quinta","Sexta","Sabado","Domingo"];
    const mx=days.map(()=>new Array(24).fill(0));
    df.forEach(d=>{const dt=new Date(d.timestamp);const di=(dt.getDay()+6)%7;mx[di][dt.getHours()]++});
    Plotly.newPlot(el,[{z:mx,x:Array.from({length:24},(_,i)=>String(i).padStart(2,"0")+"h"),y:daysPt,type:"heatmap",colorscale:[[0,"#1A1A2E"],[.5,"#6C5CE7"],[1,"#A855F7"]],hovertemplate:"<b>%{y}</b> as <b>%{x}</b><br>%{z} post(s)<extra></extra>",showscale:true,colorbar:{title:{text:"Posts",font:{color:"#8888A0"}}}}],ml({title:{text:"Padrao de Postagem (Dia x Hora)",font:{size:15}},xaxis:{...BL.xaxis,title:"Hora do Dia"},height:340}),PC);
}

function chartEngDay(el,df){
    const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
    const daysPt=["Seg","Ter","Qua","Qui","Sex","Sab","Dom"];
    const g={};df.forEach(d=>{const di=(new Date(d.timestamp).getDay()+6)%7;const dn=days[di];if(!g[dn])g[dn]=[];g[dn].push(d.engagement_rate)});
    const av=days.map(d=>g[d]?g[d].reduce((a,b)=>a+b,0)/g[d].length:0);
    const mi=av.indexOf(Math.max(...av));
    Plotly.newPlot(el,[{x:daysPt,y:av,type:"bar",marker:{color:av.map((_,i)=>i===mi?C.a1:C.a2)},hovertemplate:"<b>%{x}</b><br>Engagement: %{y:.2f}%<extra></extra>"}],ml({title:{text:"Engagement Medio por Dia",font:{size:15}},yaxis:{...BL.yaxis,title:"Engagement (%)"},height:340}),PC);
}

function chartEngHour(el,df){
    const g={};df.forEach(d=>{const h=new Date(d.timestamp).getHours();if(!g[h])g[h]=[];g[h].push(d.engagement_rate)});
    const hrs=Array.from({length:24},(_,i)=>i);
    const av=hrs.map(h=>g[h]?g[h].reduce((a,b)=>a+b,0)/g[h].length:0);
    const mi=av.indexOf(Math.max(...av));
    Plotly.newPlot(el,[{x:hrs.map(h=>String(h).padStart(2,"0")+"h"),y:av,type:"bar",marker:{color:av.map((_,i)=>i===mi?C.a1:C.a2)},hovertemplate:"<b>%{x}</b><br>Engagement: %{y:.2f}%<extra></extra>"}],ml({title:{text:"Engagement Medio por Hora",font:{size:15}},yaxis:{...BL.yaxis,title:"Engagement (%)"},height:340}),PC);
}

function chartFrequency(el,df){
    const s=[...df].sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
    const w={};s.forEach(d=>{const dt=new Date(d.timestamp);const ws=new Date(dt);ws.setDate(dt.getDate()-dt.getDay());const k=ws.toISOString().slice(0,10);w[k]=(w[k]||0)+1});
    const wk=Object.keys(w).sort(),ct=wk.map(k=>w[k]);
    Plotly.newPlot(el,[{x:wk,y:ct,mode:"lines+markers",line:{color:C.a1,width:2},marker:{size:5,color:C.a1},fill:"tozeroy",fillcolor:"rgba(168,85,247,.08)",hovertemplate:"<b>%{x}</b><br>%{y} post(s)<extra></extra>"}],ml({title:{text:"Frequencia de Postagem por Semana",font:{size:15}},yaxis:{...BL.yaxis,title:"Posts/Semana"},height:340}),PC);
}

function chartCaptionEng(el,df){
    Plotly.newPlot(el,[{x:df.map(d=>d.caption.length),y:df.map(d=>d.engagement_rate),mode:"markers",marker:{size:7,color:df.map(d=>d.likes+d.comments),colorscale:[[0,C.a2],[1,C.a1]],showscale:true,colorbar:{title:{text:"Interacoes"}},line:{width:1,color:"#2A2A3E"}},hovertemplate:"<b>Caption:</b> %{x} chars<br><b>Engagement:</b> %{y:.2f}%<extra></extra>"}],ml({title:{text:"Tamanho da Caption vs Engagement",font:{size:15}},xaxis:{...BL.xaxis,title:"Caracteres"},yaxis:{...BL.yaxis,title:"Engagement (%)"},height:380}),PC);
}

function chartHashtags(el,ht){
    const e=Object.entries(ht).sort((a,b)=>b[1]-a[1]).slice(0,15).reverse();
    if(!e.length){el.innerHTML='<p style="text-align:center;color:#8888A0;padding:40px">Nenhuma hashtag encontrada</p>';return}
    Plotly.newPlot(el,[{y:e.map(x=>"#"+x[0]),x:e.map(x=>x[1]),type:"bar",orientation:"h",marker:{color:C.a1},hovertemplate:"<b>%{y}</b><br>%{x} uso(s)<extra></extra>"}],ml({title:{text:"Hashtags Mais Utilizadas",font:{size:15}},xaxis:{...BL.xaxis,title:"Frequencia"},height:Math.max(300,e.length*26)}),PC);
}
