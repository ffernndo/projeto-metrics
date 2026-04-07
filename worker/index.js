/**
 * InstaMetrics Proxy Worker
 * Cloudflare Worker que busca dados publicos de perfis do Instagram
 * e retorna JSON estruturado para o frontend.
 *
 * Tenta multiplos metodos de busca com fallback automatico.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // Proxy de imagens: /img?url=https://...
    const imgUrl = url.searchParams.get("img");
    if (imgUrl) {
      return proxyImage(imgUrl);
    }

    const username = url.searchParams.get("username");

    if (!username || !/^[a-zA-Z0-9._]{1,30}$/.test(username)) {
      return json({ error: "Username invalido" }, 400);
    }

    try {
      const data = await fetchInstagramProfile(username);
      if (!data) {
        return json({ error: "Perfil nao encontrado ou privado" }, 404);
      }
      return json(data);
    } catch (e) {
      return json({ error: "Falha ao buscar perfil: " + e.message }, 500);
    }
  },
};

async function fetchInstagramProfile(username) {
  // Metodo 1: Web Profile API (mais confiavel)
  const apiData = await tryWebProfileAPI(username);
  if (apiData) return apiData;

  // Metodo 2: Pagina publica com headers realistas
  const htmlData = await tryPublicPage(username);
  if (htmlData) return htmlData;

  // Metodo 3: Pagina mobile
  const mobileData = await tryMobilePage(username);
  if (mobileData) return mobileData;

  return null;
}

// --- Metodo 1: Instagram Web Profile API ---
async function tryWebProfileAPI(username) {
  try {
    const r = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      {
        headers: {
          "User-Agent": "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229258)",
          "X-IG-App-ID": "936619743392459",
          "X-IG-WWW-Claim": "0",
          "X-Requested-With": "XMLHttpRequest",
          "Accept": "application/json",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    );
    if (!r.ok) return null;

    const data = await r.json();
    const user = data?.data?.user;
    if (!user) return null;

    const profile = {
      username: user.username,
      full_name: user.full_name || username,
      biography: user.biography || "",
      followers: user.edge_followed_by?.count || 0,
      following: user.edge_follow?.count || 0,
      media_count: user.edge_owner_to_timeline_media?.count || 0,
      is_verified: user.is_verified || false,
      profile_pic_url: user.profile_pic_url_hd || user.profile_pic_url || "",
      external_url: user.external_url || "",
      is_business: user.is_business_account || false,
    };

    if (profile.followers === 0 && !user.edge_followed_by) return null;

    // 1) Extrair posts iniciais do GraphQL response (12 posts)
    const posts = [];
    const timeline = user.edge_owner_to_timeline_media;
    const edges = timeline?.edges || [];
    for (const edge of edges) {
      posts.push(parseEdgeNode(edge.node));
    }

    // 2) Tentar paginar via Feed API para mais posts (bonus, pode falhar sem auth)
    const userId = user.id;
    const TARGET_POSTS = 100;
    const FEED_HEADERS = {
      "User-Agent": "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229258)",
      "X-IG-App-ID": "936619743392459",
      "X-IG-WWW-Claim": "0",
      "Accept": "application/json",
    };

    let nextMaxId = "";
    if (edges.length > 0) {
      const lastId = edges[edges.length - 1]?.node?.id;
      if (lastId) nextMaxId = lastId;
    }

    let attempts = 0;
    while (nextMaxId && posts.length < TARGET_POSTS && attempts < 4) {
      attempts++;
      try {
        const feedUrl = `https://i.instagram.com/api/v1/feed/user/${userId}/?count=12&max_id=${nextMaxId}`;
        const ctrl = new AbortController();
        const timeoutId = setTimeout(() => ctrl.abort(), 5000);
        const feedR = await fetch(feedUrl, { headers: FEED_HEADERS, signal: ctrl.signal });
        clearTimeout(timeoutId);
        if (!feedR.ok) break;
        const feedData = await feedR.json();
        const items = feedData?.items;
        if (!items || items.length === 0) break;
        for (const item of items) {
          if (posts.length >= TARGET_POSTS) break;
          posts.push(parseFeedItem(item));
        }
        nextMaxId = feedData.next_max_id || "";
        if (!feedData.more_available || !nextMaxId) break;
      } catch (e) {
        break;
      }
    }

    return { profile, posts: posts.length > 0 ? posts : null };
  } catch (e) {
    return null;
  }
}

// --- Metodo 2: Pagina publica HTML com headers de browser real ---
async function tryPublicPage(username) {
  try {
    const r = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
      redirect: "follow",
    });

    if (!r.ok) return null;

    const html = await r.text();

    // Verificar se Instagram retornou pagina de login em vez do perfil
    if (html.includes('"loginPage"') || html.includes("/accounts/login/")) {
      // Tentar extrair meta tags mesmo da pagina de login (Instagram serve OG tags mesmo assim)
      if (!html.includes('og:description')) return null;
    }

    const profile = parseMetaTags(html, username);
    if (!profile) return null;

    const posts = parseEmbeddedPosts(html);
    return { profile, posts };
  } catch (e) {
    return null;
  }
}

// --- Metodo 3: Pagina mobile ---
async function tryMobilePage(username) {
  try {
    const r = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });

    if (!r.ok) return null;
    const html = await r.text();

    const profile = parseMetaTags(html, username);
    if (!profile) return null;

    const posts = parseEmbeddedPosts(html);
    return { profile, posts };
  } catch (e) {
    return null;
  }
}

// --- Helpers ---
function parseFeedItem(item) {
  const isVideo = item.media_type === 2;
  const isCarousel = item.media_type === 8;
  let thumbUrl = "";
  if (item.image_versions2?.candidates?.length > 0) {
    thumbUrl = item.image_versions2.candidates[0].url;
  } else if (isCarousel && item.carousel_media?.length > 0) {
    const first = item.carousel_media[0];
    if (first.image_versions2?.candidates?.length > 0) {
      thumbUrl = first.image_versions2.candidates[0].url;
    }
  }
  return {
    shortcode: item.code || "",
    caption: item.caption?.text || "",
    likes: item.like_count || 0,
    comments: item.comment_count || 0,
    timestamp: new Date((item.taken_at || 0) * 1000).toISOString(),
    media_type: isCarousel ? "CAROUSEL" : isVideo ? "VIDEO" : "IMAGE",
    is_video: isVideo,
    video_view_count: item.view_count || item.play_count || null,
    url: item.code ? `https://www.instagram.com/p/${item.code}/` : "",
    thumbnail_url: thumbUrl,
  };
}

function parseEdgeNode(node) {
  return {
    shortcode: node.shortcode,
    caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || "",
    likes: node.edge_liked_by?.count || node.edge_media_preview_like?.count || 0,
    comments: node.edge_media_to_comment?.count || 0,
    timestamp: new Date(node.taken_at_timestamp * 1000).toISOString(),
    media_type: node.is_video ? "VIDEO" : node.__typename === "GraphSidecar" ? "CAROUSEL" : "IMAGE",
    is_video: node.is_video || false,
    video_view_count: node.video_view_count || null,
    url: `https://www.instagram.com/p/${node.shortcode}/`,
    thumbnail_url: node.thumbnail_src || node.display_url || "",
  };
}

// --- Parsers ---
function parseMetaTags(html, username) {
  const descMatch = html.match(
    /<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/i
  );
  if (!descMatch && !html.includes(username)) return null;

  let followers = 0, following = 0, mediaCount = 0;

  if (descMatch) {
    const desc = descMatch[1];
    const nums = desc.match(
      /([\d,.]+[KkMm]?)\s+Followers?,\s*([\d,.]+[KkMm]?)\s+Following,\s*([\d,.]+[KkMm]?)\s+Posts?/i
    );
    if (nums) {
      followers = parseMetricString(nums[1]);
      following = parseMetricString(nums[2]);
      mediaCount = parseMetricString(nums[3]);
    }
  }

  // Se nao achou followers nos meta tags, o perfil nao foi retornado
  if (followers === 0) return null;

  const titleMatch = html.match(
    /<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i
  );
  let fullName = username;
  if (titleMatch) {
    const title = titleMatch[1];
    const nameMatch = title.match(/^(.+?)\s*\(@/);
    if (nameMatch) fullName = nameMatch[1].trim();
    else fullName = title.replace(/\s*\(.*\)/, "").trim();
  }

  const imgMatch = html.match(
    /<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i
  );
  const profilePicUrl = imgMatch ? imgMatch[1] : "";

  let biography = "";
  if (descMatch) {
    const bioMatch = descMatch[1].match(
      /Posts?\s*[-–—]\s*(?:See Instagram photos and videos from .+|(.+))/i
    );
    if (bioMatch && bioMatch[1]) biography = bioMatch[1].trim();
  }

  const isVerified =
    html.includes("is_verified") &&
    (html.includes('"is_verified":true') ||
      html.includes("is_verified\u0022:true"));

  return {
    username,
    full_name: fullName,
    biography,
    followers,
    following,
    media_count: mediaCount,
    is_verified: isVerified,
    profile_pic_url: profilePicUrl,
    external_url: "",
    is_business: false,
  };
}

function parseEmbeddedPosts(html) {
  const posts = [];

  const sharedMatch = html.match(
    /window\._sharedData\s*=\s*(\{.+?\});\s*<\/script>/s
  );
  if (sharedMatch) {
    try {
      const data = JSON.parse(sharedMatch[1]);
      const edges =
        data?.entry_data?.ProfilePage?.[0]?.graphql?.user
          ?.edge_owner_to_timeline_media?.edges;
      if (edges) {
        for (const edge of edges) {
          const node = edge.node;
          posts.push({
            shortcode: node.shortcode,
            caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || "",
            likes: node.edge_liked_by?.count || node.edge_media_preview_like?.count || 0,
            comments: node.edge_media_to_comment?.count || 0,
            timestamp: new Date(node.taken_at_timestamp * 1000).toISOString(),
            media_type: node.is_video ? "VIDEO" : node.__typename === "GraphSidecar" ? "CAROUSEL" : "IMAGE",
            is_video: node.is_video || false,
            video_view_count: node.video_view_count || null,
            url: `https://www.instagram.com/p/${node.shortcode}/`,
            thumbnail_url: node.thumbnail_src || node.display_url || "",
          });
        }
      }
    } catch (e) {}
  }

  const additionalMatch = html.match(
    /"edge_owner_to_timeline_media":\{(.+?)\},"edge_saved_media"/s
  );
  if (!posts.length && additionalMatch) {
    try {
      const mediaData = JSON.parse(
        '{"edge_owner_to_timeline_media":{' + additionalMatch[1] + "}}"
      );
      const edges = mediaData.edge_owner_to_timeline_media?.edges;
      if (edges) {
        for (const edge of edges) {
          const node = edge.node;
          posts.push({
            shortcode: node.shortcode || "",
            caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || "",
            likes: node.edge_liked_by?.count || node.edge_media_preview_like?.count || 0,
            comments: node.edge_media_to_comment?.count || 0,
            timestamp: new Date(node.taken_at_timestamp * 1000).toISOString(),
            media_type: node.is_video ? "VIDEO" : node.__typename === "GraphSidecar" ? "CAROUSEL" : "IMAGE",
            is_video: node.is_video || false,
            video_view_count: node.video_view_count || null,
            url: `https://www.instagram.com/p/${node.shortcode}/`,
            thumbnail_url: node.thumbnail_src || node.display_url || "",
          });
        }
      }
    } catch (e) {}
  }

  return posts.length > 0 ? posts : null;
}

function parseMetricString(str) {
  if (!str) return 0;
  str = str.replace(/,/g, "").trim();
  const num = parseFloat(str);
  if (str.toLowerCase().endsWith("m")) return Math.round(num * 1000000);
  if (str.toLowerCase().endsWith("k")) return Math.round(num * 1000);
  return Math.round(num);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS,
  });
}

async function proxyImage(imageUrl) {
  try {
    if (!imageUrl.startsWith("https://")) {
      return new Response("URL invalida", { status: 400 });
    }
    const r = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
        "Referer": "https://www.instagram.com/",
      },
    });
    if (!r.ok) return new Response("Imagem nao encontrada", { status: 404 });
    const contentType = r.headers.get("content-type") || "image/jpeg";
    return new Response(r.body, {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return new Response("Erro ao buscar imagem", { status: 500 });
  }
}
