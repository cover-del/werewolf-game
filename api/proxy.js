// api/proxy.js
export default async function handler(req, res) {
  // ===== CORS 預檢 =====
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end(); // OPTIONS 不需要 body
  }

  // ===== 其他請求也必須加 CORS =====
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 僅允許 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const GAS_URL = 'https://script.google.com/macros/s/1RAmHB34wjl9QpmiC5CPsjybiuG-cujkcGYF5kfORtUW7Ic4dTi9n7_dd/exec';

    // 將前端的 JSON body 轉發到 GAS
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const text = await response.text();

    // 嘗試解析成 JSON
    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch {
      // 如果不是 JSON，直接回傳原始字串
      return res.status(200).json({ raw: text });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
}

