import 'dotenv/config';
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.PIXABAY_API_KEY;
const META_PAGE_ID = process.env.META_PAGE_ID;
const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const META_API_VERSION = process.env.META_API_VERSION || "v27.0";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function send(res, status, data, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "X-Content-Type-Options": "nosniff" });
  res.end(typeof data === "string" ? data : JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/meta/connection-check") {
    const configured = {
      pageId: Boolean(META_PAGE_ID),
      pageAccessToken: Boolean(META_PAGE_ACCESS_TOKEN)
    };

    if (!META_PAGE_ID || !META_PAGE_ACCESS_TOKEN) {
      return send(res, 503, {
        connected: false,
        configured,
        message: "Faltam META_PAGE_ID e/ou META_PAGE_ACCESS_TOKEN nas variáveis privadas do serviço."
      });
    }

    try {
      const endpoint = new URL(`https://graph.facebook.com/${META_API_VERSION}/me`);
      endpoint.searchParams.set("fields", "id,name");
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${META_PAGE_ACCESS_TOKEN}` }
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        return send(res, 502, {
          connected: false,
          configured,
          error: {
            message: data.error?.message || "A Meta recusou o token.",
            code: data.error?.code ?? null,
            subcode: data.error?.error_subcode ?? null
          }
        });
      }

      const tokenPageMatches = String(data.id) === String(META_PAGE_ID);
      return send(res, tokenPageMatches ? 200 : 409, {
        connected: tokenPageMatches,
        configured,
        page: { id: data.id, name: data.name || null },
        pageIdMatchesToken: tokenPageMatches,
        message: tokenPageMatches
          ? "Token válido e associado à Página configurada."
          : "O token é válido, mas pertence a uma Página diferente do META_PAGE_ID configurado."
      });
    } catch {
      return send(res, 502, {
        connected: false,
        configured,
        message: "Não foi possível acessar a Meta API agora."
      });
    }
  }

  if (url.pathname === "/api/meta/instagram-account") {
    if (!META_PAGE_ID || !META_PAGE_ACCESS_TOKEN) {
      return send(res, 503, {
        connected: false,
        message: "Configure META_PAGE_ID e META_PAGE_ACCESS_TOKEN nas variáveis privadas do Render."
      });
    }
    try {
      const endpoint = new URL(`https://graph.facebook.com/${META_API_VERSION}/${encodeURIComponent(META_PAGE_ID)}`);
      endpoint.searchParams.set("fields", "id,name,instagram_business_account{id,username}");
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${META_PAGE_ACCESS_TOKEN}` }
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        return send(res, 502, {
          connected: false,
          error: data.error?.message || "Não foi possível consultar a conta Instagram vinculada.",
          code: data.error?.code ?? null
        });
      }
      const instagram = data.instagram_business_account;
      return send(res, instagram ? 200 : 404, {
        connected: Boolean(instagram),
        page: { id: data.id, name: data.name || null },
        instagram: instagram ? { id: instagram.id, username: instagram.username || null } : null,
        message: instagram
          ? "Conta profissional do Instagram encontrada e vinculada à Página."
          : "Nenhuma conta profissional do Instagram foi encontrada vinculada a esta Página."
      });
    } catch {
      return send(res, 502, { connected: false, message: "Falha ao consultar a Meta API." });
    }
  }

  if (url.pathname === "/api/meta/instagram-insights") {
    if (!META_PAGE_ID || !META_PAGE_ACCESS_TOKEN) {
      return send(res, 503, { error: "Configure META_PAGE_ID e META_PAGE_ACCESS_TOKEN nas variáveis privadas do Render." });
    }
    try {
      const pageEndpoint = new URL(`https://graph.facebook.com/${META_API_VERSION}/${encodeURIComponent(META_PAGE_ID)}`);
      pageEndpoint.searchParams.set("fields", "instagram_business_account{id,username}");
      const pageResponse = await fetch(pageEndpoint, {
        headers: { Authorization: `Bearer ${META_PAGE_ACCESS_TOKEN}` }
      });
      const pageData = await pageResponse.json();
      if (!pageResponse.ok || pageData.error) {
        return send(res, 502, {
          error: pageData.error?.message || "Não foi possível localizar a conta Instagram vinculada.",
          code: pageData.error?.code ?? null
        });
      }
      const instagramId = pageData.instagram_business_account?.id;
      if (!instagramId) {
        return send(res, 404, {
          error: "Nenhuma conta profissional do Instagram está vinculada à Página configurada."
        });
      }

      const allowedMetrics = new Set([
        "reach", "follower_count", "profile_views", "accounts_engaged",
        "total_interactions", "website_clicks", "views"
      ]);
      const requestedMetrics = (url.searchParams.get("metric") || "reach,profile_views,accounts_engaged,total_interactions")
        .split(",").map(value => value.trim()).filter(Boolean);
      const metrics = [...new Set(requestedMetrics)].filter(metric => allowedMetrics.has(metric));
      const period = url.searchParams.get("period") || "day";
      if (!metrics.length || metrics.length !== new Set(requestedMetrics).size) {
        return send(res, 400, {
          error: "Métricas permitidas: reach, follower_count, profile_views, accounts_engaged, total_interactions, website_clicks e views."
        });
      }
      if (!["day", "week", "days_28", "month", "lifetime", "total_over_range"].includes(period)) {
        return send(res, 400, { error: "Período inválido para Instagram Insights." });
      }

      const insightsEndpoint = new URL(`https://graph.facebook.com/${META_API_VERSION}/${encodeURIComponent(instagramId)}/insights`);
      insightsEndpoint.searchParams.set("metric", metrics.join(","));
      insightsEndpoint.searchParams.set("period", period);
      const insightsResponse = await fetch(insightsEndpoint, {
        headers: { Authorization: `Bearer ${META_PAGE_ACCESS_TOKEN}` }
      });
      const insights = await insightsResponse.json();
      if (!insightsResponse.ok || insights.error) {
        return send(res, insightsResponse.status || 502, {
          error: insights.error?.message || "A Meta não retornou os insights do Instagram.",
          code: insights.error?.code ?? null,
          subcode: insights.error?.error_subcode ?? null
        });
      }
      return send(res, 200, {
        instagram: {
          id: instagramId,
          username: pageData.instagram_business_account.username || null
        },
        period,
        data: insights.data || [],
        paging: insights.paging || null
      });
    } catch {
      return send(res, 502, { error: "Não foi possível acessar os insights do Instagram agora." });
    }
  }

  if (url.pathname === "/api/meta/page-insights") {
    if (!META_PAGE_ID || !META_PAGE_ACCESS_TOKEN) {
      return send(res, 503, {
        error: "Configure META_PAGE_ID e META_PAGE_ACCESS_TOKEN nas variáveis de ambiente."
      });
    }

    const allowedMetrics = new Set(["page_impressions_unique", "page_engaged_users"]);
    const requestedMetrics = (url.searchParams.get("metric") || "page_impressions_unique,page_engaged_users")
      .split(",").map(value => value.trim()).filter(Boolean);
    const metrics = [...new Set(requestedMetrics)].filter(metric => allowedMetrics.has(metric));
    const period = url.searchParams.get("period") || "day";

    if (metrics.length === 0 || metrics.length !== new Set(requestedMetrics).size) {
      return send(res, 400, {
        error: "Métricas permitidas: page_impressions_unique e page_engaged_users."
      });
    }
    if (!["day", "week", "days_28"].includes(period)) {
      return send(res, 400, { error: "Período permitido: day, week ou days_28." });
    }

    try {
      const endpoint = new URL(`https://graph.facebook.com/${META_API_VERSION}/${encodeURIComponent(META_PAGE_ID)}/insights`);
      endpoint.searchParams.set("metric", metrics.join(","));
      endpoint.searchParams.set("period", period);
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${META_PAGE_ACCESS_TOKEN}` }
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        console.error("Meta API error:", data.error?.message || response.status);
        return send(res, response.status || 502, {
          error: data.error?.message || "A Meta API não conseguiu retornar os insights. Verifique token, permissões e versão.",
          code: data.error?.code ?? null,
          subcode: data.error?.error_subcode ?? null
        });
      }
      return send(res, 200, data);
    } catch {
      return send(res, 502, { error: "Não foi possível acessar a Meta API agora." });
    }
  }

  if (url.pathname === "/api/search") {
    if (!API_KEY) return send(res, 503, { error: "Configure PIXABAY_API_KEY nas variáveis de ambiente." });

    const q = (url.searchParams.get("q") || "").trim();
    const type = url.searchParams.get("type") === "videos" ? "videos" : "images";
    const page = Math.max(1, Math.min(50, Number(url.searchParams.get("page") || 1)));

    if (q.length < 2) return send(res, 400, { error: "Digite pelo menos 2 caracteres para pesquisar." });
    if (q.length > 100) return send(res, 400, { error: "A pesquisa deve ter no máximo 100 caracteres." });

    const endpoint = type === "videos" ? "https://pixabay.com/api/videos/" : "https://pixabay.com/api/";
    const params = new URLSearchParams({
      key: API_KEY, q, page: String(page), per_page: "24",
      safesearch: "true"
    });
    if (type === "images") {
      params.set("image_type", "photo");
      params.set("orientation", "all");
    }

    try {
      const response = await fetch(`${endpoint}?${params}`);
      if (!response.ok) return send(res, 502, { error: `Pixabay respondeu com status ${response.status}.` });
      const data = await response.json();
      if (data.error) return send(res, 502, { error: data.error });
      return send(res, 200, data);
    } catch {
      return send(res, 502, { error: "Não foi possível acessar o Pixabay agora. Tente novamente." });
    }
  }

  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
  const target = join(ROOT, "public", safePath);
  if (!target.startsWith(join(ROOT, "public"))) return send(res, 403, "Forbidden", "text/plain");

  try {
    const body = await readFile(target);
    return send(res, 200, body.toString("utf8"), mime[extname(target)] || "application/octet-stream");
  } catch {
    return send(res, 404, "Not found", "text/plain; charset=utf-8");
  }
});

server.listen(PORT, () => console.log(`Pixabay Media Finder ativo na porta ${PORT}`));