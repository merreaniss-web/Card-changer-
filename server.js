'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { URL } = require('node:url');
const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_BODY = 4 * 1024 * 1024;
function config() {
  const required = ['PASS_TYPE_ID','TEAM_ID','CERT_P12_PATH','CERT_P12_PASSWORD','WWDR_CERT_PATH'];
  const missing = required.filter(k => !process.env[k]);
  const filesExist = !missing.length && fs.existsSync(process.env.CERT_P12_PATH) && fs.existsSync(process.env.WWDR_CERT_PATH);
  return { configured: missing.length === 0 && filesExist, missing, filesExist };
}
function send(res, code, type, body) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0, chunks = [];
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(new Error('Requête trop volumineuse (4 Mo maximum).')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('JSON invalide.')); } });
    req.on('error', reject);
  });
}
function safeText(v, max, fallback='') { return String(v ?? fallback).replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, max); }
function decodePng(dataUrl) {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) throw new Error('Artwork PNG invalide.');
  const b = Buffer.from(m[1], 'base64');
  if (b.length > 2 * 1024 * 1024) throw new Error('Artwork trop volumineux.');
  return b;
}
function run(cmd, args, opts={}) { return execFileSync(cmd, args, { stdio: 'pipe', ...opts }); }
function createPass(payload) {
  const cfg = config();
  if (!cfg.configured) throw new Error('Serveur de signature non configuré. Ajoutez les paramètres Apple Wallet dans .env.');
  const d = payload.data || {};
  const org = safeText(d.org, 30, 'Carte de membre');
  const holder = safeText(d.holder, 30, 'Membre');
  const serial = 'WA-' + crypto.randomUUID();
  const artwork = decodePng(payload.artwork);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wallet-atelier-'));
  const passDir = path.join(tmp, 'pass'); fs.mkdirSync(passDir);
  try {
    // Generic membership/loyalty pass only. Never a payment credential.
    const pass = {
      formatVersion: 1,
      passTypeIdentifier: process.env.PASS_TYPE_ID,
      serialNumber: serial,
      teamIdentifier: process.env.TEAM_ID,
      organizationName: org,
      description: safeText(d.description, 60, 'Carte de membre'),
      logoText: org,
      foregroundColor: rgb(d.foreground, 'rgb(255, 255, 255)'),
      backgroundColor: rgb(d.background, 'rgb(23, 27, 43)'),
      labelColor: rgb(d.accent, 'rgb(182, 161, 255)'),
      generic: {
        primaryFields: [{ key: 'member', label: 'MEMBRE', value: holder }],
        secondaryFields: [{ key: 'level', label: 'NIVEAU', value: safeText(d.tier, 20, 'MEMBRE') }],
        auxiliaryFields: [{ key: 'memberId', label: 'IDENTIFIANT', value: safeText(d.number, 24, serial) }],
        backFields: [{ key: 'conditions', label: 'INFORMATIONS', value: safeText(d.notes, 240, 'Carte de membre personnelle.') }]
      }
    };
    fs.writeFileSync(path.join(passDir, 'pass.json'), JSON.stringify(pass, null, 2));
    // Apple Wallet image assets. Same artwork is used for the generic strip image.
    fs.writeFileSync(path.join(passDir, 'strip.png'), artwork);
    fs.writeFileSync(path.join(passDir, 'icon.png'), artwork);
    fs.writeFileSync(path.join(passDir, 'icon@2x.png'), artwork);
    fs.writeFileSync(path.join(passDir, 'logo.png'), artwork);
    fs.writeFileSync(path.join(passDir, 'logo@2x.png'), artwork);
    const manifest = {};
    for (const file of fs.readdirSync(passDir)) manifest[file] = crypto.createHash('sha1').update(fs.readFileSync(path.join(passDir, file))).digest('hex');
    const manifestPath = path.join(passDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    const cert = path.join(tmp, 'signer.pem'), key = path.join(tmp, 'key.pem');
    run('openssl', ['pkcs12', '-in', process.env.CERT_P12_PATH, '-clcerts', '-nokeys', '-out', cert, '-passin', `env:WA_P12_PASSWORD`], { env: { ...process.env, WA_P12_PASSWORD: process.env.CERT_P12_PASSWORD } });
    run('openssl', ['pkcs12', '-in', process.env.CERT_P12_PATH, '-nocerts', '-nodes', '-out', key, '-passin', `env:WA_P12_PASSWORD`], { env: { ...process.env, WA_P12_PASSWORD: process.env.CERT_P12_PASSWORD } });
    run('openssl', ['smime', '-binary', '-sign', '-certfile', process.env.WWDR_CERT_PATH, '-signer', cert, '-inkey', key, '-in', manifestPath, '-out', path.join(passDir, 'signature'), '-outform', 'DER', '-nodetach']);
    const out = path.join(tmp, 'wallet-pass.pkpass');
    run('zip', ['-q', '-r', out, 'pass.json', 'manifest.json', 'signature', 'icon.png', 'icon@2x.png', 'logo.png', 'logo@2x.png', 'strip.png'], { cwd: passDir });
    const result = fs.readFileSync(out);
    return result;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
function rgb(hex, fallback) {
  if (!/^#[0-9a-fA-F]{6}$/.test(String(hex || ''))) return fallback;
  const h = hex.slice(1); return `rgb(${parseInt(h.slice(0,2),16)}, ${parseInt(h.slice(2,4),16)}, ${parseInt(h.slice(4,6),16)})`;
}
const mime = { '.html':'text/html; charset=utf-8', '.webmanifest':'application/manifest+json', '.js':'text/javascript; charset=utf-8', '.png':'image/png', '.svg':'image/svg+xml', '.css':'text/css; charset=utf-8', '.ico':'image/x-icon' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/status') return send(res, 200, 'application/json', JSON.stringify(config()));
  if (req.method === 'POST' && url.pathname === '/api/create-pass') {
    try { const body = await readBody(req); const file = createPass(body); res.writeHead(200, { 'Content-Type':'application/vnd.apple.pkpass', 'Content-Disposition':'attachment; filename="wallet-pass.pkpass"', 'Content-Length':file.length, 'Cache-Control':'no-store' }); return res.end(file); }
    catch (e) { return send(res, 400, 'application/json', JSON.stringify({ error: e.message || 'Erreur de génération.' })); }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'text/plain', 'Method Not Allowed');
  let pathname = decodeURIComponent(url.pathname); if (pathname === '/') pathname = '/index.html';
  const file = path.resolve(ROOT, '.' + pathname);
  if (!file.startsWith(ROOT + path.sep) && file !== path.join(ROOT, 'index.html')) return send(res, 403, 'text/plain', 'Forbidden');
  fs.readFile(file, (err, data) => { if (err) return send(res, 404, 'text/plain', 'Not Found'); res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff' }); if (req.method === 'HEAD') return res.end(); res.end(data); });
});
server.listen(PORT, HOST, () => console.log(`Wallet Atelier disponible sur http://${HOST}:${PORT}`));
