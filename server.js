/* SENTINEL//OPS — zero-dependency Node backend | run: node server.js */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000;
const SALT = 'sentinel//ops::v1';
const DBF  = path.join(__dirname, 'db.json');
const sha256 = s => crypto.createHash('sha256').update(SALT + s).digest('hex');

let db;
try { db = JSON.parse(fs.readFileSync(DBF, 'utf8')); }
catch (e) { db = { users: [{ email: 'operator@sentinel.ops', hash: sha256('letmein2026'), name: 'Operator' }], messages: [] }; }
const sessions = {}, fails = {};
const save = () => { try { fs.writeFileSync(DBF, JSON.stringify(db, null, 2)); } catch (e) {} };

const HEAD = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' };
const json = (res, code, obj) => { res.writeHead(code, Object.assign({ 'Content-Type': 'application/json' }, HEAD)); res.end(JSON.stringify(obj)); };
function readBody(req, cap) { cap = cap || 10240; return new Promise((res, rej) => { let d = '', n = 0;
  req.on('data', c => { n += c.length; if (n > cap) { rej(new Error('too large')); req.destroy(); } else d += c; });
  req.on('end', () => { try { res(JSON.parse(d || '{}')); } catch (e) { rej(e); } }); }); }

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); const ip = req.socket.remoteAddress || 'local';
  try {
    if (u.pathname === '/api/health')
      return json(res, 200, { status: 'online', mode: 'full-stack', uptime: Math.round(process.uptime()) });

    if (u.pathname === '/api/login' && req.method === 'POST') {
      if (fails[ip] && fails[ip].until > Date.now())
        return json(res, 429, { error: 'rate limit active', locked: true, retry: Math.ceil((fails[ip].until - Date.now()) / 1000) });
      let b; try { b = await readBody(req); } catch (e) { return json(res, 400, { error: 'bad request' }); }
      const user = db.users.find(x => x.email === String(b.email || '').toLowerCase());
      let ok = false;
      if (user) { const a = Buffer.from(sha256(String(b.pass || ''))), c = Buffer.from(user.hash);
        ok = a.length === c.length && crypto.timingSafeEqual(a, c); }
      if (ok) { const token = crypto.randomBytes(24).toString('hex');
        sessions[token] = { email: user.email, exp: Date.now() + 15 * 60 * 1000 };
        return json(res, 200, { token, clearance: 'L3', name: user.name }); }
      const f = fails[ip] || { n: 0 }; f.n++; if (f.n >= 5) { f.until = Date.now() + 10000; f.n = 0; } fails[ip] = f;
      return json(res, 401, { error: 'invalid credentials' });
    }

    if (u.pathname === '/api/contact' && req.method === 'POST') {
      let b; try { b = await readBody(req); } catch (e) { return json(res, 400, { error: 'bad request' }); }
      db.messages.push({ name: String(b.name || 'anon').slice(0, 80), from: String(b.from || '').slice(0, 120),
        message: String(b.message || '').slice(0, 2000), at: new Date().toISOString() });
      if (db.messages.length > 100) db.messages = db.messages.slice(-100);
      save(); return json(res, 200, { ok: true, stored: db.messages.length });
    }

    if (u.pathname === '/api/messages' && req.method === 'GET') {
      const s = sessions[u.searchParams.get('token') || ''];
      if (!s || s.exp < Date.now()) return json(res, 401, { error: 'unauthorized' });
      return json(res, 200, { messages: db.messages });
    }

    if (u.pathname === '/backend.js') { res.writeHead(200, Object.assign({ 'Content-Type': 'text/javascript' }, HEAD));
      return res.end(fs.readFileSync(path.join(__dirname, 'backend.js'))); }

    if (u.pathname === '/' || u.pathname === '/index.html') {
      let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
      html = html.replace('</body>', '<script src="/backend.js"></script>\n</body>');
      res.writeHead(200, Object.assign({ 'Content-Type': 'text/html' }, HEAD)); return res.end(html);
    }
    json(res, 404, { error: 'not found' });
  } catch (e) { json(res, 500, { error: 'server error' }); }
}).listen(PORT, () => console.log('▮ SENTINEL//OPS backend online → http://localhost:' + PORT));