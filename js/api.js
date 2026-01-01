/**
 * 狼人殺遊戲 - API 通訊層（直連 GAS）
 */
class GameAPI {
  constructor(gasUrl) {
    this.baseUrl = gasUrl;
    this.timeout = 10000;
  }

  async request(action, data = {}) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const text = await response.text();

      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error('GAS 回傳非 JSON：' + text.slice(0, 200));
      }

      return json;

    } catch (err) {
      console.error('API 請求失敗:', err);
      return { error: err.message };
    }
  }

  // ===== 玩家操作 =====
  loginPlayer(name, password) {
    return this.request('loginPlayer', { name, password });
  }

  registerPlayer(name, password) {
    return this.request('registerPlayer', { name, password });
  }
}

// 全域實例
let gameAPI = null;

function initializeAPI() {
  const GAS_URL =
    'https://script.google.com/macros/s/AKfycbw6GXX9DRqfUwdTy5cHph9KOnbDYkSrYXVeYsoqIQgrzx9Jsuw4P3bK4-KQqhwebY-x/exec';

  gameAPI = new GameAPI(GAS_URL);
  console.log('✅ GameAPI 已初始化（直連 GAS）');
}

document.addEventListener('DOMContentLoaded', initializeAPI);
