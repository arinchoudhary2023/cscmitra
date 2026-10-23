import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const envPath = resolve(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

const apiRoutes = {
  '/api/auth/login': './api/auth/login.js',
  '/api/auth/me': './api/auth/me.js',
  '/api/auth/bootstrap': './api/auth/bootstrap.js',
  '/api/agents': './api/agents/index.js',
  '/api/health': './api/health.js',
  '/api/funds': './api/funds/index.js',
  '/api/funds/decision': './api/funds/decision.js'
};
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8'
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = decodeURIComponent(url.pathname).replace(/\/$/, '') || '/';
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');

  if (pathname.startsWith('/api/')) {
    const relative = apiRoutes[pathname];
    if (!relative) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: `No local API route is registered for ${pathname}.` }));
      return;
    }
    try {
      const module = await import(pathToFileURL(resolve(root, relative)));
      await module.default(req, {
        status(code) { res.statusCode = code; return this; },
        setHeader(name, value) { res.setHeader(name, value); return this; },
        end(body) { res.end(body); return this; }
      });
    } catch (error) {
      console.error(`[local API] ${pathname}:`, error?.stack || error);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      if (!res.writableEnded) res.end(JSON.stringify({ error: 'Local API server error. Check the terminal for details.' }));
    }
    return;
  }

  let requested = pathname === '/' ? '/index.html' : pathname;
  let filePath = resolve(root, `.${requested}`);
  if (filePath !== root && !filePath.startsWith(root + sep)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    // Keep client-side page navigation working, but do not mask missing asset files.
    if (!extname(pathname)) filePath = resolve(root, 'index.html');
    else { res.writeHead(404); res.end('Not found'); return; }
  }
  try {
    res.writeHead(200, { 'Content-Type': mime[extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(readFileSync(filePath));
  } catch {
    res.writeHead(500); res.end('Could not read requested file');
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, '127.0.0.1', () => {
  console.log(`CSCDigitalMitra local server running at http://localhost:${port}`);
  console.log('API routes are enabled. Keep this terminal open while testing.');
  console.log('This server is for local development only; do not expose it publicly.');
});
