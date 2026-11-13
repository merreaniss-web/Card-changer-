'use strict';
const assert = require('node:assert/strict');
(async () => {
  const base = `http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || 4173}`;
  const home = await fetch(base + '/');
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Wallet Atelier/);
  const status = await fetch(base + '/api/status').then(r => r.json());
  assert.equal(typeof status.configured, 'boolean');
  const sw = await fetch(base + '/sw.js');
  assert.equal(sw.status, 200);
  const create = await fetch(base + '/api/create-pass', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: {}, artwork: '' }) });
  assert.equal(create.status, 400, 'Signing must be blocked when Apple certificates are not configured');
  console.log('Smoke tests passed: static app, PWA worker, API status, signing gate.');
})().catch(err => { console.error(err); process.exit(1); });
