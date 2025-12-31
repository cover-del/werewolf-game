export default async function handler(req, res) {
  try {
    // ---- CORS ----
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // ---- Preflight ----
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    // ---- Only POST allowed ----
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ---- Safe body handling ----
    let body = req.body;

    // 有些情況 body 會是 string
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    // body 仍不存在
    if (!body) {
      return res.status(400).json({ error: 'Empty body' });
    }

    // ---- 測試回傳 ----
    return res.status(200).json({
      ok: true,
      received: body
    });

  } catch (err) {
    console.error('API crash:', err);
    return res.status(500).json({
      error: 'Server error',
      message: err.message
    });
  }
}
