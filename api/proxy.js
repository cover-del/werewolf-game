export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // ⭐ 關鍵，不然 base64 圖會死
    },
  },
};


// api/proxy.js
export default async function handler(req, res) {
  // ===== CORS（一定要最前面）=====
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ===== Preflight =====
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const GAS_URL =
      'https://script.google.com/macros/s/AKfycbx15oqFdocd5EIRgbDt3_HPa9E6ABrkU8ljR68qAT7mje5MhXGSbqDvcbSQ4vhPouub/exec';

    const gasRes = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const text = await gasRes.text();

    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch {
      return res.status(500).json({
        error: 'GAS 回傳非 JSON',
        raw: text
      });
    }

  } catch (err) {
    return res.status(500).json({
      error: 'Proxy error',
      detail: err.message
    });
  }
}
