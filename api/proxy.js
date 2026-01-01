// api/proxy.js
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbw6GXX9DRqfUwdTy5cHph9KOnbDYkSrYXVeYsoqIQgrzx9Jsuw4P3bK4-KQqhwebY-x/exec';

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
      data = { error: 'GAS 回傳非 JSON', raw: text };
    }

    res.status(200).json(data);

  } catch (err) {
    res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
}
