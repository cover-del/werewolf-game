// api/proxy.js
export default async function handler(req, res) {
  // ===== CORS =====
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed'
    });
  }

  try {
    const GAS_URL =
      'https://script.google.com/macros/s/AKfycbw6GXX9DRqfUwdTy5cHph9KOnbDYkSrYXVeYsoqIQgrzx9Jsuw4P3bK4-KQqhwebY-x/exec';

    const gasRes = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const text = await gasRes.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // ⚠️ GAS 回傳非 JSON（通常是 HTML 錯誤頁）
      return res.status(200).json({
        success: false,
        error: 'GAS 回傳非 JSON',
        raw: text
      });
    }

    // GAS 明確錯誤
    if (data.error) {
      return res.status(200).json({
        success: false,
        error: data.error
      });
    }

    // ✅ 成功
    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Proxy error',
      detail: err.message
    });
  }
}
