// Minimal static server for QA: serves a directory, optional headers JSON
// ({ headers: [{ headers: [{key, value}] }] }), 404.html fallback.
// Usage: node scripts/qa/static-server.mjs <dir> <port> [headers.json]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

const [dir, port, cfg] = process.argv.slice(2);
const extra = cfg ? JSON.parse(readFileSync(cfg, 'utf8')).headers.flatMap((h) => h.headers) : [];
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = normalize(join(dir, decodeURIComponent(url.pathname)));
  if (!p.startsWith(normalize(dir))) return res.writeHead(403).end();
  let code = 200;
  try {
    if ((await stat(p)).isDirectory()) p = join(p, 'index.html');
    await stat(p);
  } catch {
    try { await stat(p + '.html'); p += '.html'; } catch { p = join(dir, '404.html'); code = 404; }
  }
  const body = await readFile(p);
  res.writeHead(code, { 'Content-Type': types[extname(p)] || 'application/octet-stream', ...Object.fromEntries(extra.map((h) => [h.key, h.value])) });
  res.end(req.method === 'HEAD' ? undefined : body);
}).listen(+port, '127.0.0.1', () => console.log(`serving ${dir} on ${port}`));
