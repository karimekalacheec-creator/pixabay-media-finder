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

  if (url.pathname === "/api/meta/page-insights") {
    if (!META_PAGE_ID || !META_PAGE_ACCESS_TOKEN) {
      return send(res, 503, {
        error: "Configure META_PAGE_ID e META_PAGE_ACCESS_TOKEN nas variáveis de ambiente."
      });
    }

    const allowedMetrics = new Set(["page_impressions", "page_post_engagements"]);
    const requestedMetrics = (url.searchParams.get("metric") || "page_impressions,page_post_engagements")
      .split(",").map(value => value.trim()).filter(Boolean);
    const metrics = [...new Set(requestedMetrics)].filter(metric => allowedMetrics.has(metric));
    const period = url.searchParams.get("period") || "day";

    if (metrics.length === 0 || metrics.length !== new Set(requestedMetrics).size) {
      return send(res, 400, {
        error: "Métricas permitidas: page_impressions e page_post_engagements."
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
          error: data.error?.message || "A Meta API não conseguiu retornar os insights. Verifique token, permissões e versão."
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