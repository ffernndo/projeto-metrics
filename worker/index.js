/**
 * InstaMetrics Proxy Worker
 * Cloudflare Worker que busca dados publicos de perfis do Instagram
 * e retorna JSON estruturado para o frontend.
 *
 * Deploy: npx wrangler deploy
 * Ou cole este codigo em https://workers.cloudflare.com/ (dashboard)
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
  // Buscar pagina publica do Instagram
  const response = await fetch(`https://www.instagram.com/${username}/`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Cache-Control": "no-cache",
    },
    redirect: "follow",
  });

  if (!response.ok) return null;

  const html = await response.text();

  // Extrair dados dos meta tags
  const profile = parseMetaTags(html, username);
  if (!profile) return null;

  // Tentar extrair posts do HTML embutido
  const posts = parseEmbeddedPosts(html);

  return { profile, posts };
}

function parseMetaTags(html, username) {
  // og:description: "284M Followers, 152 Following, 32.5K Posts - See Instagram photos..."
  const descMatch = html.match(
    /<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/i
  );
  if (!descMatch && !html.includes(username)) return null;

  let followers = 0,
    following = 0,
    mediaCount = 0;

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

  // og:title: "National Geographic (@natgeo)"
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

  // og:image: profile picture
  const imgMatch = html.match(
    /<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i
  );
  const profilePicUrl = imgMatch ? imgMatch[1] : "";

  // Bio from description (after the stats part)
  let biography = "";
  if (descMatch) {
    const bioMatch = descMatch[1].match(
      /Posts?\s*[-–—]\s*(?:See Instagram photos and videos from .+|(.+))/i
    );
    if (bioMatch && bioMatch[1]) biography = bioMatch[1].trim();
  }

  // Verificado
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
  // Tentar extrair _sharedData ou dados JSON embutidos
  const posts = [];

  // Metodo 1: window._sharedData
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
            caption:
              node.edge_media_to_caption?.edges?.[0]?.node?.text || "",
            likes: node.edge_liked_by?.count || node.edge_media_preview_like?.count || 0,
            comments: node.edge_media_to_comment?.count || 0,
            timestamp: new Date(node.taken_at_timestamp * 1000).toISOString(),
            media_type: node.is_video
              ? "VIDEO"
              : node.__typename === "GraphSidecar"
              ? "CAROUSEL"
              : "IMAGE",
            is_video: node.is_video || false,
            video_view_count: node.video_view_count || null,
            url: `https://www.instagram.com/p/${node.shortcode}/`,
            thumbnail_url: node.thumbnail_src || node.display_url || "",
          });
        }
      }
    } catch (e) {
      // JSON parse failed, continue
    }
  }

  // Metodo 2: require("PolarisProfilePostsTabContent") ou similar
  const additionalMatch = html.match(
    /\"edge_owner_to_timeline_media\":\{(.+?)\},"edge_saved_media"/s
  );
  if (!posts.length && additionalMatch) {
    try {
      const mediaData = JSON.parse(
        '{"edge_owner_to_timeline_media":{' +
          additionalMatch[1] +
          '}}'
      );
      const edges =
        mediaData.edge_owner_to_timeline_media?.edges;
      if (edges) {
        for (const edge of edges) {
          const node = edge.node;
          posts.push({
            shortcode: node.shortcode || "",
            caption:
              node.edge_media_to_caption?.edges?.[0]?.node?.text || "",
            likes: node.edge_liked_by?.count || node.edge_media_preview_like?.count || 0,
            comments: node.edge_media_to_comment?.count || 0,
            timestamp: new Date(
              node.taken_at_timestamp * 1000
            ).toISOString(),
            media_type: node.is_video
              ? "VIDEO"
              : node.__typename === "GraphSidecar"
              ? "CAROUSEL"
              : "IMAGE",
            is_video: node.is_video || false,
            video_view_count: node.video_view_count || null,
            url: `https://www.instagram.com/p/${node.shortcode}/`,
            thumbnail_url: node.thumbnail_src || node.display_url || "",
          });
        }
      }
    } catch (e) {
      // Continue without posts
    }
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
