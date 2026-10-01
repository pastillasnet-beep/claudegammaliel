// Vercel Serverless Function — proxy para Tradier
// Despliegue: sube esta carpeta a un repo de GitHub, impórtalo en Vercel,
// y en Project Settings > Environment Variables agrega TRADIER_TOKEN con tu clave.
// Endpoint resultante: https://tu-proyecto.vercel.app/api/quote?symbol=SPY&expiration=2026-09-25

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { symbol, expiration } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol requerido' });

  const token = process.env.TRADIER_TOKEN;
  const base = 'https://api.tradier.com/v1';
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

  try {
    const quoteRes = await fetch(`${base}/markets/quotes?symbols=${symbol}`, { headers });
    const quoteJson = await quoteRes.json();

    let chain = null;
    if (expiration) {
      const chainRes = await fetch(`${base}/markets/options/chains?symbol=${symbol}&expiration=${expiration}&greeks=true`, { headers });
      chain = await chainRes.json();
    }

    let expirations = null;
    const expRes = await fetch(`${base}/markets/options/expirations?symbol=${symbol}&includeAllRoots=true`, { headers });
    expirations = await expRes.json();

    res.status(200).json({ quote: quoteJson, chain, expirations });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar Tradier', detail: String(err) });
  }
}
