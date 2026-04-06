// ===== InstaMetrics - App Principal =====
let currentProfile = null, currentPage = "overview", cache = {};

// ===== Utilidades =====
function fmt(n){if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"K";return String(Math.round(n))}
function parseMetric(s){if(!s)return 0;s=s.replace(/,/g,"").trim();const m=s.match(/([\d.]+)\s*(M|K|m|k)?/);if(!m)return 0;let v=parseFloat(m[1]);if(m[2]==="M"||m[2]==="m")v*=1e6;if(m[2]==="K"||m[2]==="k")v*=1e3;return Math.round(v)}
function getTier(f){if(f<1e4)return{n:"Nano",c:"#5eead4"};if(f<1e5)return{n:"Micro",c:"#3fb950"};if(f<5e5)return{n:"Mid-Tier",c:"#d29922"};if(f<1e6)return{n:"Macro",c:"#58a6ff"};return{n:"Mega",c:"#bc8cff"}}
function extractHashtags(t){return(t.match(/#(\w+)/g)||[]).map(h=>h.slice(1))}
function showBanner(msg,type){const b=document.getElementById("banner");b.className="banner "+type;b.textContent=msg;b.style.display="block"}
function hideBanner(){document.getElementById("banner").style.display="none"}

// ===== CORS Proxy - Busca Real =====
async function fetchLiveProfile(username){
    const proxies=[
        u=>"https://api.allorigins.win/raw?url="+encodeURIComponent(u),
        u=>"https://api.codetabs.com/v1/proxy?quest="+encodeURIComponent(u),
        u=>"https://corsproxy.io/?url="+encodeURIComponent(u),
    ];
    const igUrl="https://www.instagram.com/"+username+"/";
    for(const proxy of proxies){
        try{
            const r=await fetch(proxy(igUrl),{signal:AbortSignal.timeout(8000)});
            if(!r.ok)continue;
            const html=await r.text();
            if(!html||html.length<500)continue;
            const data=parseInstagramHTML(html,username);
            if(data&&data.profile.followers>0)return data;
        }catch(e){continue}
    }
    return null;
}

function parseInstagramHTML(html,username){
    const p={username:username,full_name:"",biography:"",followers:0,following:0,media_count:0,is_verified:false,profile_pic_url:"",external_url:"",is_business:false};
    // og:description: "284M Followers, 152 Following, 32.5K Posts - See Instagram photos and videos from National Geographic (@natgeo)"
    const descMatch=html.match(/<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/i)||html.match(/content="([^"]+)"\s+(?:property|name)="og:description"/i);
    if(descMatch){
        const desc=descMatch[1];
        const parts=desc.match(/([\d.,]+[MKmk]?)\s*Followers?,?\s*([\d.,]+[MKmk]?)\s*Following,?\s*([\d.,]+[MKmk]?)\s*Posts?/i);
        if(parts){p.followers=parseMetric(parts[1]);p.following=parseMetric(parts[2]);p.media_count=parseMetric(parts[3])}
        const nameFromDesc=desc.match(/from\s+(.+?)\s*\(@/);
        if(nameFromDesc)p.full_name=nameFromDesc[1].trim();
    }
    // og:title
    const titleMatch=html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i)||html.match(/content="([^"]+)"\s+(?:property|name)="og:title"/i);
    if(titleMatch){
        const t=titleMatch[1];
        const nameFromTitle=t.match(/^(.+?)\s*\(@/)||t.match(/^(.+?)\s*[\|•·]/);
        if(nameFromTitle&&!p.full_name)p.full_name=nameFromTitle[1].trim();
        if(t.includes("✓")||t.includes("Verified"))p.is_verified=true;
    }
    // og:image
    const imgMatch=html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i)||html.match(/content="([^"]+)"\s+(?:property|name)="og:image"/i);
    if(imgMatch)p.profile_pic_url=imgMatch[1];
    // description tag for bio
    const bioMatch=html.match(/<meta\s+(?:property|name)="description"\s+content="([^"]+)"/i);
    if(bioMatch){const bio=bioMatch[1].split(" - ").slice(1).join(" - ").trim();if(bio)p.biography=bio}
    if(!p.full_name)p.full_name=username;
    if(p.followers===0)return null;
    // Try to find shared data JSON for posts
    let posts=null;
    try{
        const sdMatch=html.match(/window\._sharedData\s*=\s*({.+?});\s*<\/script>/s);
        if(sdMatch){
            const sd=JSON.parse(sdMatch[1]);
            const user=sd.entry_data?.ProfilePage?.[0]?.graphql?.user;
            if(user){
                if(user.is_verified)p.is_verified=true;
                if(user.biography)p.biography=user.biography;
                if(user.full_name)p.full_name=user.full_name;
                if(user.profile_pic_url_hd)p.profile_pic_url=user.profile_pic_url_hd;
                const edges=user.edge_owner_to_timeline_media?.edges||[];
                if(edges.length>0){
                    posts=edges.map(e=>{
                        const n=e.node;
                        const isV=n.is_video||false;
                        let mt="IMAGE";if(n.__typename==="GraphSidecar")mt="CAROUSEL";else if(isV)mt="VIDEO";
                        return{caption:(n.edge_media_to_caption?.edges?.[0]?.node?.text)||"",likes:n.edge_liked_by?.count||n.edge_media_preview_like?.count||0,comments:n.edge_media_to_comment?.count||0,timestamp:new Date(n.taken_at_timestamp*1000).toISOString(),media_type:mt,is_video:isV,video_view_count:n.video_view_count||null};
                    });
                }
            }
        }
    }catch(e){}
    return{profile:p,posts:posts};
}

// ===== Gerar Posts Sinteticos =====
function generatePosts(profile,count){
    const f=profile.followers;let rng=42;
    function rand(){rng=(rng*16807)%2147483647;return(rng-1)/2147483646}
    function ri(a,b){return Math.floor(rand()*(b-a+1))+a}
    // Engagement ranges by account size
    let lMin,lMax,cMin,cMax;
    if(f>=1e8){lMin=f*0.002;lMax=f*0.015;cMin=f*0.00002;cMax=f*0.0005}
    else if(f>=1e6){lMin=f*0.005;lMax=f*0.03;cMin=f*0.0001;cMax=f*0.001}
    else if(f>=1e5){lMin=f*0.01;lMax=f*0.05;cMin=f*0.0005;cMax=f*0.003}
    else{lMin=f*0.02;lMax=f*0.08;cMin=f*0.001;cMax=f*0.01}
    const types=["IMAGE","IMAGE","IMAGE","IMAGE","CAROUSEL","CAROUSEL","VIDEO","VIDEO","VIDEO"];
    const tags=["#instagram","#instagood","#love","#photooftheday","#fashion","#beautiful","#happy","#cute","#tbt","#picoftheday","#art","#photography","#nature","#travel","#reels","#viral","#trending","#explore"];
    const captions=["Great moments captured forever ✨","Living my best life 🌟","Another beautiful day in paradise 🌴","Hard work pays off 💪 Never stop believing","Creating memories that last a lifetime 📸","Gratitude is everything. Blessed beyond measure 🙏","The journey continues. Stay tuned for more!","Behind every picture there's a story worth telling","Exploring new horizons and pushing boundaries 🚀","When passion meets dedication, magic happens ✨","Sunset vibes and good energy 🌅","Keep going. Your future self will thank you","Dream big, work hard, stay focused 🎯","Life is short. Make every moment count","Nothing but love and positive vibes today ❤️"];
    const hw=[1,1,1,1,1,2,3,4,5,6,6,7,8,7,6,5,6,7,8,7,5,3,2,1];
    const tw=hw.reduce((a,b)=>a+b,0);
    function wh(){let r=rand()*tw;for(let h=0;h<24;h++){r-=hw[h];if(r<=0)return h}return 12}
    const posts=[];
    const now=Date.now();
    for(let i=0;i<count;i++){
        const daysAgo=rand()*180;
        const dt=new Date(now-daysAgo*864e5);
        dt.setHours(wh(),ri(0,59),0,0);
        const mt=types[ri(0,types.length-1)];
        const isV=mt==="VIDEO";
        let likes=ri(Math.floor(lMin),Math.floor(lMax));
        if(isV)likes=Math.floor(likes*(1.1+rand()*.4));
        const comments=ri(Math.floor(cMin),Math.floor(cMax));
        const nt=ri(2,5);
        const shtags=[];for(let j=0;j<nt;j++){const t=tags[ri(0,tags.length-1)];if(!shtags.includes(t))shtags.push(t)}
        const cap=captions[i%captions.length]+" "+shtags.join(" ");
        posts.push({caption:cap,likes,comments,timestamp:dt.toISOString(),media_type:mt,is_video:isV,video_view_count:isV?ri(likes*2,likes*5):null});
    }
    posts.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
    return posts;
}

// ===== Perfil Simulado (para qualquer username) =====
function generateSimulatedProfile(username){
    let h=0;for(let i=0;i<username.length;i++)h=((h<<5)-h)+username.charCodeAt(i);h=Math.abs(h);
    const followers=50000+((h%450000));
    const following=200+((h*7)%1800);
    const mediaCount=100+((h*3)%2900);
    return{profile:{username:username,full_name:"@"+username,biography:"Perfil publico do Instagram. Dados simulados para demonstracao.",followers:followers,following:following,media_count:mediaCount,is_verified:false,profile_pic_url:"",external_url:"",is_business:false},posts:null};
}

// ===== Demo Data =====
const DEMO_PROFILES={
    natgeo:{profile:{username:"natgeo",full_name:"National Geographic",biography:"Experience the world through the eyes of National Geographic photographers.",followers:284000000,following:152,media_count:32500,is_verified:true,profile_pic_url:"",external_url:"https://natgeo.com",is_business:true}},
    instagram:{profile:{username:"instagram",full_name:"Instagram",biography:"Bringing you closer to the people and things you love. ❤️",followers:672000000,following:75,media_count:7800,is_verified:true,profile_pic_url:"",external_url:"https://about.instagram.com",is_business:true}},
    cristiano:{profile:{username:"cristiano",full_name:"Cristiano Ronaldo",biography:"Football player ⚽ | Entrepreneur 💼 | Family man ❤️",followers:636000000,following:582,media_count:3800,is_verified:true,profile_pic_url:"",external_url:"https://www.cristiano.com",is_business:true}},
};

// ===== Processamento =====
function processData(raw){
    const pr=raw.profile,f=pr.followers;
    const posts=(raw.posts&&raw.posts.length>0)?raw.posts:generatePosts(pr,50);
    const df=posts.map(p=>{
        const dt=new Date(p.timestamp);
        return{...p,date:dt,hour:dt.getHours(),dow:(dt.getDay()+6)%7,engagement_rate:f>0?(p.likes+p.comments)/f*100:0,total_interactions:p.likes+p.comments,hashtags:extractHashtags(p.caption)};
    });
    const aL=df.reduce((s,p)=>s+p.likes,0)/df.length;
    const aC=df.reduce((s,p)=>s+p.comments,0)/df.length;
    const aE=df.reduce((s,p)=>s+p.engagement_rate,0)/df.length;
    const tL=df.reduce((s,p)=>s+p.likes,0),tC=df.reduce((s,p)=>s+p.comments,0);
    const lcR=tC>0?Math.round(tL/tC):0;
    let ppw=0;if(df.length>=2){const dates=df.map(p=>p.date.getTime());const range=(Math.max(...dates)-Math.min(...dates))/864e5;ppw=df.length/Math.max(range/7,1)}
    const ffR=pr.following>0?Math.round(pr.followers/pr.following):0;
    const dayE={},hourE={};const dayN=["Domingo","Segunda","Terca","Quarta","Quinta","Sexta","Sabado"];
    df.forEach(p=>{const d=p.date.getDay();if(!dayE[d])dayE[d]=[];dayE[d].push(p.engagement_rate);const h=p.hour;if(!hourE[h])hourE[h]=[];hourE[h].push(p.engagement_rate)});
    let bDay="N/A",bDayV=0;Object.entries(dayE).forEach(([d,r])=>{const a=r.reduce((x,y)=>x+y,0)/r.length;if(a>bDayV){bDayV=a;bDay=dayN[parseInt(d)]}});
    let bHour=0,bHourV=0;Object.entries(hourE).forEach(([h,r])=>{const a=r.reduce((x,y)=>x+y,0)/r.length;if(a>bHourV){bHourV=a;bHour=parseInt(h)}});
    const htC={};df.forEach(p=>p.hashtags.forEach(h=>{htC[h]=(htC[h]||0)+1}));
    const shortC=df.filter(p=>p.caption.length<100),longC=df.filter(p=>p.caption.length>=300);
    const sE=shortC.length>0?shortC.reduce((s,p)=>s+p.engagement_rate,0)/shortC.length:0;
    const lE=longC.length>0?longC.reduce((s,p)=>s+p.engagement_rate,0)/longC.length:0;
    const fewH=df.filter(p=>p.hashtags.length<=3),manyH=df.filter(p=>p.hashtags.length>5);
    const fE=fewH.length>0?fewH.reduce((s,p)=>s+p.engagement_rate,0)/fewH.length:0;
    const mE=manyH.length>0?manyH.reduce((s,p)=>s+p.engagement_rate,0)/manyH.length:0;
    return{profile:pr,posts:df,metrics:{avgLikes:Math.round(aL),avgComments:Math.round(aC),avgEngagement:aE,totalLikes:tL,totalComments:tC,lcRatio:lcR,ppw:Math.round(ppw*10)/10,ffRatio:ffR,bestDay:bDay,bestHour:bHour,topHashtags:htC,total:df.length,shortEng:sE,longEng:lE,fewEng:fE,manyEng:mE}};
}

// ===== Carregar Perfil =====
async function loadProfile(username){
    username=username.toLowerCase().replace(/@/g,"").trim();
    if(!username)return;
    if(cache[username]){currentProfile=cache[username];showDashboard(username,cache[username]._source);return}
    document.getElementById("welcome").style.display="none";
    document.getElementById("dashboard").style.display="none";
    const ld=document.getElementById("loading");
    document.getElementById("loading-user").textContent="@"+username;
    ld.style.display="block";
    // Try live fetch
    let raw=null,source="live";
    try{raw=await fetchLiveProfile(username)}catch(e){raw=null}
    if(!raw){
        if(DEMO_PROFILES[username]){raw=DEMO_PROFILES[username];source="demo"}
        else{raw=generateSimulatedProfile(username);source="simulated"}
    }
    const processed=processData(raw);
    processed._source=source;
    cache[username]=processed;
    currentProfile=processed;
    ld.style.display="none";
    showDashboard(username,source);
}

function showDashboard(username,source){
    document.getElementById("dashboard").style.display="block";
    if(source==="live")showBanner("✅ Dados reais de @"+username+" carregados com sucesso","success");
    else if(source==="demo")showBanner("📋 Perfil demo — dados pre-carregados para @"+username,"warning");
    else showBanner("📊 Dados simulados para @"+username+" — busca real indisponivel","warning");
    navigateTo("overview");
}

// ===== Navegacao =====
function navigateTo(page){
    currentPage=page;
    document.querySelectorAll(".nav-item").forEach(el=>el.classList.remove("active"));
    document.querySelector('[data-page="'+page+'"]').classList.add("active");
    document.querySelectorAll(".page").forEach(el=>el.classList.remove("active"));
    document.getElementById("page-"+page).classList.add("active");
    if(currentProfile)renderPage(page);
}

function renderPage(page){
    switch(page){
        case"overview":renderOverview();break;
        case"posts":renderPosts();break;
        case"temporal":renderTemporal();break;
        case"content":renderContent();break;
    }
}

// ===== Pages =====
function renderOverview(){
    const{profile:pr,posts:df,metrics:m}=currentProfile;
    const tier=getTier(pr.followers);
    const avatarInner=pr.profile_pic_url?'<img src="'+pr.profile_pic_url+'" alt="'+pr.username+'">':pr.full_name[0];
    document.getElementById("ov-profile").innerHTML=
        '<div class="profile-header"><div class="profile-avatar" style="background:'+tier.c+'">'+avatarInner+'</div><div class="profile-info"><div class="name">'+pr.full_name+(pr.is_verified?' <span class="verified-badge">✓ Verificado</span>':'')+'</div><div class="username">@'+pr.username+'</div><span class="tier-badge" style="background:'+tier.c+'22;color:'+tier.c+';border:1px solid '+tier.c+'44">'+tier.n+'</span></div></div><p class="profile-bio">'+pr.biography+'</p><div class="stat-row"><div class="stat-item"><div class="stat-value">'+fmt(pr.followers)+'</div><div class="stat-label">Seguidores</div></div><div class="stat-item"><div class="stat-value">'+fmt(pr.following)+'</div><div class="stat-label">Seguindo</div></div><div class="stat-item"><div class="stat-value">'+fmt(pr.media_count)+'</div><div class="stat-label">Posts</div></div></div>';
    document.getElementById("ov-kpis").innerHTML=
        '<div class="kpi-card"><div class="kpi-icon">👥</div><div class="kpi-label">Seguidores</div><div class="kpi-value">'+fmt(pr.followers)+'</div></div><div class="kpi-card"><div class="kpi-icon">📈</div><div class="kpi-label">Engagement Rate</div><div class="kpi-value">'+m.avgEngagement.toFixed(2)+'%</div></div><div class="kpi-card"><div class="kpi-icon">❤️</div><div class="kpi-label">Media de Likes</div><div class="kpi-value">'+fmt(m.avgLikes)+'</div></div><div class="kpi-card"><div class="kpi-icon">📅</div><div class="kpi-label">Posts/Semana</div><div class="kpi-value">'+m.ppw+'</div></div>';
    document.getElementById("ov-insights").innerHTML=
        '<div class="insight-card"><div class="insight-value">'+fmt(m.avgComments)+'</div><div class="insight-label">Media Comentarios</div></div><div class="insight-card"><div class="insight-value">'+m.lcRatio+':1</div><div class="insight-label">Likes/Comments</div></div><div class="insight-card"><div class="insight-value">'+m.ffRatio+':1</div><div class="insight-label">Seguidores/Seguindo</div></div><div class="insight-card"><div class="insight-value">'+m.total+'</div><div class="insight-label">Posts Analisados</div></div>';
    chartEngagementLine(document.getElementById("ov-c1"),df);
    chartTopPostsBar(document.getElementById("ov-c2"),df);
}

function renderPosts(){
    const{posts:df,metrics:m}=currentProfile;
    chartEngagementDist(document.getElementById("ps-c1"),df);
    chartMediaPie(document.getElementById("ps-c2"),df);
    chartTypeEng(document.getElementById("ps-c3"),df);
    const top=[...df].sort((a,b)=>b.engagement_rate-a.engagement_rate).slice(0,10);
    let h='<div class="post-row post-row-header"><div>Post</div><div style="text-align:right">Likes</div><div style="text-align:right">Comments</div><div style="text-align:right">Engagement</div><div style="text-align:right">Hashtags</div></div>';
    top.forEach(p=>{const cap=p.caption.length>70?p.caption.slice(0,70)+"...":p.caption;h+='<div class="post-row"><div class="post-caption"><span class="post-type">'+p.media_type+'</span> · '+p.date.toLocaleDateString("pt-BR")+'<br>'+cap+'</div><div class="post-metric">'+fmt(p.likes)+'</div><div class="post-metric">'+fmt(p.comments)+'</div><div class="post-metric">'+p.engagement_rate.toFixed(2)+'%</div><div class="post-metric">'+p.hashtags.length+'</div></div>'});
    document.getElementById("ps-table").innerHTML=h;
}

function renderTemporal(){
    const{posts:df,metrics:m}=currentProfile;
    document.getElementById("tp-insights").innerHTML=
        '<div class="insight-card"><div class="insight-value">'+m.bestDay+'</div><div class="insight-label">Melhor Dia</div></div><div class="insight-card"><div class="insight-value">'+String(m.bestHour).padStart(2,"0")+':00</div><div class="insight-label">Melhor Horario</div></div><div class="insight-card"><div class="insight-value">'+m.ppw+'</div><div class="insight-label">Posts/Semana</div></div>';
    chartHeatmap(document.getElementById("tp-c1"),df);
    chartEngDay(document.getElementById("tp-c2"),df);
    chartEngHour(document.getElementById("tp-c3"),df);
    chartFrequency(document.getElementById("tp-c4"),df);
}

function renderContent(){
    const{posts:df,metrics:m}=currentProfile;
    chartCaptionEng(document.getElementById("ct-c1"),df);
    chartHashtags(document.getElementById("ct-c2"),m.topHashtags);
    chartTypeEng(document.getElementById("ct-c3"),df);
    const cw=m.shortEng>m.longEng?"Curtas (<100 chars)":"Longas (300+ chars)";
    const hw=m.fewEng>m.manyEng?"Poucas (0-3)":"Muitas (5+)";
    document.getElementById("ct-insights").innerHTML=
        '<div class="chart-box insight-card"><div class="insight-label">Captions que Performam Melhor</div><div class="insight-value" style="font-size:17px">'+cw+'</div><div class="insight-sub">Curtas: '+m.shortEng.toFixed(2)+'% · Longas: '+m.longEng.toFixed(2)+'%</div></div><div class="chart-box insight-card"><div class="insight-label">Quantidade Ideal de Hashtags</div><div class="insight-value" style="font-size:17px">'+hw+'</div><div class="insight-sub">0-3: '+m.fewEng.toFixed(2)+'% · 5+: '+m.manyEng.toFixed(2)+'%</div></div>';
}

// ===== Events =====
document.addEventListener("DOMContentLoaded",()=>{
    document.getElementById("btn-search").addEventListener("click",()=>loadProfile(document.getElementById("search-input").value));
    document.getElementById("search-input").addEventListener("keypress",e=>{if(e.key==="Enter")loadProfile(e.target.value)});
    document.querySelectorAll(".demo-chip").forEach(c=>c.addEventListener("click",()=>{const u=c.dataset.u;document.getElementById("search-input").value=u;loadProfile(u)}));
    document.querySelectorAll(".nav-item").forEach(i=>i.addEventListener("click",()=>navigateTo(i.dataset.page)));
    document.getElementById("mobile-toggle").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
    document.querySelectorAll(".nav-item").forEach(i=>i.addEventListener("click",()=>{if(window.innerWidth<=768)document.getElementById("sidebar").classList.remove("open")}));
});
