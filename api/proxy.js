// api/proxy.js
export default async function handler(req, res) {
  // ===== 全域 CORS =====
  res.setHeader('Access-Control-Allow-Origin', '*'); // 或限定來源: 'https://cover-del.github.io'
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ===== 預檢請求 =====
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // 僅允許 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const GAS_URL = 'https://script.google.com/macros/s/1RAmHB34wjl9QpmiC5CPsjybiuG-cujkcGYF5kfORtUW7Ic4dTi9n7_dd/exec';

    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const text = await response.text();

    // 嘗試解析 JSON
    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch {
      return res.status(200).json({ raw: text });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
}
