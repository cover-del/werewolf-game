// api/proxy.js
export default async function handler(req, res) {
  // ===== CORS Header (全域) =====
  const setCors = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  };

  setCors();

  // 預檢請求立即回應
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // 只允許 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbw6GXX9DRqfUwdTy5cHph9KOnbDYkSrYXVeYsoqIQgrzx9Jsuw4P3bK4-KQqhwebY-x/exec';

    // 轉發到 GAS
    const gasRes = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const text = await gasRes.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: 'GAS 回傳非 JSON',
        raw: text
      });
    }

    // 再次保證 CORS
    setCors();
    return res.status(200).json(data);

  } catch (err) {
    setCors();
    return res.status(500).json({
      error: 'Proxy error',
      detail: err.message
    });
  }
}
