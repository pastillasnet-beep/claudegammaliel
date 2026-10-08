// Vercel Serverless Function — datos para Edge Gate (histórico diario, timesales 5m, cadenas con griegas)
// Endpoint: /api/edge?symbol=SPY&dteMin=0&dteMax=10[&chains=0]
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { symbol, dteMin = '0', dteMax = '10', chains = '1' } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol requerido' });
  const base = 'https://api.tradier.com/v1';
  const headers = { Authorization: `Bearer ${process.env.TRADIER_TOKEN}`, Accept: 'application/json' };
  const get = async p => { const r = await fetch(base + p, { headers }); return r.json(); };
  const day = d => d.toISOString().slice(0, 10);
  const now = new Date();
  try {
    if (req.query.lite === '1') {
      const history = await get(`/markets/history?symbol=${symbol}&interval=daily&start=${day(new Date(now - 140 * 864e5))}&end=${day(now)}`);
      return res.status(200).json({ history });
    }
    const [quote, history, timesales] = await Promise.all([
      get(`/markets/quotes?symbols=${symbol}`),
      get(`/markets/history?symbol=${symbol}&interval=daily&start=${day(new Date(now - 140 * 864e5))}&end=${day(now)}`),
      get(`/markets/timesales?symbol=${symbol}&interval=5min&start=${day(new Date(now - 5 * 864e5))}&session_filter=open`),
    ]);
    let expirations = [], chainMap = {};
    if (chains !== '0') {
      const ex = await get(`/markets/options/expirations?symbol=${symbol}&includeAllRoots=true`);
      expirations = [].concat(ex?.expirations?.date || []);
      const t0 = new Date(day(now) + 'T00:00:00Z');
      const sel = expirations.filter(iso => { const d = Math.round((new Date(iso + 'T00:00:00Z') - t0) / 864e5); return d >= +dteMin && d <= +dteMax; }).slice(0, 4);
      const cs = await Promise.all(sel.map(iso => get(`/markets/options/chains?symbol=${symbol}&expiration=${iso}&greeks=true`)));
      sel.forEach((iso, i) => { chainMap[iso] = cs[i]; });
    }
    res.status(200).json({ quote, history, timesales, expirations, chains: chainMap });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar Tradier', detail: String(err) });
  }
}
