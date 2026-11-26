import 'dotenv/config';
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.PIXABAY_API_KEY;

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