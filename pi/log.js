// Persistencia de Edge Gate (registro de señales + histórico de IV) en Vercel KV / Upstash Redis.
// Variables de entorno: KV_REST_API_URL y KV_REST_API_TOKEN (se crean al conectar Storage > KV en Vercel).
// GET  /api/log  -> { log: [...], ivh: {...} }
// POST /api/log  -> body JSON { log, ivh }
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const e = process.env, pick = suf => e['KV_' + suf] || e['STORAGE_KV_' + suf] || e['UPSTASH_REDIS_' + suf] || e['STORAGE_UPSTASH_REDIS_' + suf] || e['STORAGE_' + suf];
  const url = pick('REST_API_URL') || pick('REST_URL'), token = pick('REST_API_TOKEN') || pick('REST_TOKEN');
  if (!url || !token) return res.status(500).json({ error: 'KV no configurado' });
  const H = { Authorization: `Bearer ${token}` };
  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
      await fetch(`${url}/set/gml:edge`, { method: 'POST', headers: H, body });
      return res.status(200).json({ ok: true });
    }
    const j = await (await fetch(`${url}/get/gml:edge`, { headers: H })).json();
    let v = {}; try { v = j.result ? JSON.parse(j.result) : {}; } catch (e) {}
    res.status(200).json({ log: v.log || [], ivh: v.ivh || {} });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
