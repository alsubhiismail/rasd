// @ts-nocheck
// رصد · Rasd — يرسل إشعارات الجوال للفنيين ومسؤول الصيانة.
// Sends Rasd phone notifications (Web Push). No secrets to set: the database sends the keys with each call.
//
// Supabase → Edge Functions → Deploy a new function → Via Editor
//   name: rasd-notify  → paste this whole file → Deploy
// Then in the function's settings turn OFF "Enforce JWT verification" (Verify JWT), and save.

const enc = new TextEncoder();

const b64u = {
  enc(buf) {
    const b = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  dec(str) {
    const t = String(str).replace(/-/g, '+').replace(/_/g, '/');
    const s = atob(t + '==='.slice((t.length + 3) % 4));
    const b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }
};

function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

async function hkdf(salt, ikm, info, len) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8));
}

// VAPID (RFC 8292): a short-lived ES256 token signed with the server key.
async function vapidHeader(endpoint, vapid) {
  const pub = b64u.dec(vapid.publicKey);
  const jwk = { kty: 'EC', crv: 'P-256', d: vapid.privateKey, x: b64u.enc(pub.slice(1, 33)), y: b64u.enc(pub.slice(33, 65)), ext: true };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u.enc(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u.enc(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: vapid.subject })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + claims));
  return `vapid t=${head}.${claims}.${b64u.enc(sig)}, k=${vapid.publicKey}`;
}

// Message encryption (RFC 8291, aes128gcm content coding from RFC 8188).
async function encrypt(sub, text) {
  const uaPub = b64u.dec(sub.keys.p256dh);
  const auth = b64u.dec(sub.keys.auth);
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(auth, shared, concat(enc.encode('WebPush: info'), new Uint8Array([0]), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, concat(enc.encode('Content-Encoding: aes128gcm'), new Uint8Array([0])), 16);
  const nonce = await hkdf(salt, ikm, concat(enc.encode('Content-Encoding: nonce'), new Uint8Array([0])), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, concat(enc.encode(text), new Uint8Array([2]))));
  const head = new Uint8Array(21);
  head.set(salt, 0);
  new DataView(head.buffer).setUint32(16, 4096);
  head[20] = asPub.length;
  return concat(head, asPub, sealed);
}

async function send(sub, payload, vapid) {
  const body = await encrypt(sub, JSON.stringify(payload));
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidHeader(sub.endpoint, vapid),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '21600',
      Urgency: 'high'
    },
    body
  });
  return res.status;
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info' };
const reply = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function handle(req) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply({ ok: true, service: 'rasd-notify' });
  let input;
  try { input = await req.json(); } catch (e) { return reply({ error: 'bad_json' }, 400); }
  const vapid = input && input.vapid, messages = input && input.messages;
  if (!vapid || !vapid.publicKey || !vapid.privateKey || !vapid.subject || !Array.isArray(messages)) return reply({ error: 'bad_input' }, 400);
  const results = await Promise.all(messages.slice(0, 300).map(async m => {
    const endpoint = m && m.subscription && m.subscription.endpoint;
    try { return { endpoint, status: await send(m.subscription, m.payload || {}, vapid) }; }
    catch (e) { return { endpoint, status: 0, error: String((e && e.message) || e) }; }
  }));
  const gone = results.filter(r => r.status === 404 || r.status === 410).map(r => r.endpoint);
  const env = typeof Deno !== 'undefined' ? Deno.env : null;
  const url = env && env.get('SUPABASE_URL'), key = env && (env.get('SUPABASE_ANON_KEY') || env.get('SUPABASE_PUBLISHABLE_KEY'));
  if (gone.length && url && key) {
    const headers = { apikey: key, 'Content-Type': 'application/json' };
    if (/^eyJ/.test(key)) headers.Authorization = 'Bearer ' + key;
    await fetch(url + '/rest/v1/rpc/push_gone', { method: 'POST', headers, body: JSON.stringify({ p_endpoints: gone }) }).catch(() => {});
  }
  return reply({ sent: results.filter(r => r.status >= 200 && r.status < 300).length, failed: results.filter(r => !(r.status >= 200 && r.status < 300)).map(r => ({ status: r.status, error: r.error })) });
}

if (typeof Deno !== 'undefined') Deno.serve(handle);

export { b64u, encrypt, vapidHeader, send, handle };
