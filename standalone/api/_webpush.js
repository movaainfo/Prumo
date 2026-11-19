// PRUMO · Web Push sem bibliotecas (não é uma rota: o "_" diz ao Vercel para não a publicar).
// RFC 8291 (mensagem cifrada "aes128gcm" para o aparelho) + RFC 8292 (VAPID: o servidor assina-se com uma chave P-256).
// As chaves VAPID saem de um segredo do servidor (a chave mestra das contas): são sempre as mesmas e a privada nunca sai daqui.
'use strict';
const crypto = require('crypto');
const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Buffer.from(String(s || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const ORDER = BigInt('0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551');

// par de chaves VAPID a partir do segredo: a privada (32 bytes, 0 < d < ordem da curva) e a pública (65 bytes, sem compressão)
const vapidFrom = secret => {
  for (let i = 0; i < 16; i++) {
    const d = Buffer.from(crypto.hkdfSync('sha256', secret, Buffer.from('prumo-push'), Buffer.from('vapid-p256:' + i), 32)), n = BigInt('0x' + d.toString('hex'));
    if (n === 0n || n >= ORDER) continue;
    const ec = crypto.createECDH('prime256v1'); ec.setPrivateKey(d); const pub = ec.getPublicKey();
    const key = crypto.createPrivateKey({ key: { kty: 'EC', crv: 'P-256', d: b64u(d), x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) }, format: 'jwk' });
    return { pub: b64u(pub), key };
  }
  throw new Error('vapid');
};

// a assinatura do servidor para um serviço de entrega (aud = origem do endereço do aparelho), válida 12 h
const jwt = (V, aud, sub) => {
  const data = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' })) + '.' + b64u(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub }));
  return data + '.' + b64u(crypto.sign('sha256', Buffer.from(data), { key: V.key, dsaEncoding: 'ieee-p1363' }));
};

// cifra a mensagem para um aparelho (p256dh = a chave pública dele, auth = o segredo de 16 bytes que ele deu)
const encrypt = (payload, p256dh, auth) => {
  const ua = unb64u(p256dh), sec = unb64u(auth);
  if (ua.length !== 65 || ua[0] !== 4 || sec.length < 16) throw new Error('chaves do aparelho inválidas');
  const ec = crypto.createECDH('prime256v1'); ec.generateKeys();
  const asPub = ec.getPublicKey(), shared = ec.computeSecret(ua), salt = crypto.randomBytes(16);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', shared, sec, Buffer.concat([Buffer.from('WebPush: info\0'), ua, asPub]), 32));
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([c.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const head = Buffer.alloc(21); salt.copy(head, 0); head.writeUInt32BE(4096, 16); head[20] = 65;
  return Buffer.concat([head, asPub, body]);
};

// só os serviços de entrega dos navegadores (Chrome/Android, Firefox, Safari/iPhone, Edge): nada de endereços quaisquer
const HOSTS = /^https:\/\/([a-z0-9-]+\.)*(fcm\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)(:443)?\//;
const okSub = s => !!s && typeof s.e === 'string' && s.e.length < 1200 && HOSTS.test(s.e) && unb64u(s.k).length === 65 && unb64u(s.a).length >= 16;

// envia; devolve { ok, gone } (gone = o aparelho já não aceita: tirar a subscrição)
const send = async (V, sub, payload, o = {}) => {
  if (!okSub(sub)) return { ok: false, gone: true, status: 0 };
  const u = new URL(sub.e), H = { 'content-type': 'application/octet-stream', 'content-encoding': 'aes128gcm', ttl: String(o.ttl || 3600), urgency: o.urgency || 'high',
    authorization: `vapid t=${jwt(V, u.origin, o.sub || 'https://prumo-vida.vercel.app')}, k=${V.pub}` };
  if (o.topic) H.topic = String(o.topic).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
  let r; try { r = await (o.fetch || fetch)(sub.e, { method: 'POST', headers: H, body: encrypt(JSON.stringify(payload), sub.k, sub.a), signal: AbortSignal.timeout(o.timeout || 8000) }); }
  catch (e) { return { ok: false, gone: false, status: 0 }; }
  return { ok: r.status >= 200 && r.status < 300, gone: r.status === 404 || r.status === 410, status: r.status };
};

module.exports = { vapidFrom, jwt, encrypt, send, okSub, HOSTS, b64u, unb64u };
