/**
 * 狼人殺遊戲 - API 通訊層（透過 Vercel Proxy）
 */
class GameAPI {
  constructor(proxyUrl) {
    this.baseUrl = proxyUrl;  // 指向 /api/proxy
    this.timeout = 10000;
  }

  async request(action, data = {}) {
    try {
      const payload = { action, ...data };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const json = await response.json();
      return json;
    } catch (error) {
      console.error('API 請求失敗:', error);
      return { error: '網路或伺服器錯誤：' + error.message };
    }
  }

  // ===== 玩家操作 =====
  loginPlayer(name, password) {
    return this.request('loginPlayer', { name, password });
  }
  registerPlayer(name, password) {
    return this.request('registerPlayer', { name, password });
  }
  createRoom(playId, avatarUrl = '', customRoomId = '') {
    return this.request('createRoom', { name: playId, avatarData: avatarUrl, customRoomId });
  }
  joinRoom(roomId, playId, avatarUrl = '') {
    return this.request('joinRoom', { roomId, name: playId, avatarData: avatarUrl });
  }
  leaveRoom(roomId, playerId) {
    return this.request('leaveRoom', { roomId, playerId });
  }
  getRoomState(roomId, requesterId) {
    return this.request('getRoomState', { roomId, requesterId });
  }
  listRooms() {
    return this.request('listRooms');
  }

  // ===== 管理員操作 =====
  adminLogin(password) { return this.request('adminLogin', { password }); }
  adminListRooms(password) { return this.request('adminListRooms', { password }); }
  adminDeleteRoom(roomId) { return this.request('adminDeleteRoom', { roomId }); }
  adminDeleteAllRooms() { return this.request('adminDeleteAllRooms'); }

  // ===== 上傳功能 =====
  uploadAvatar(dataUrl, filename) { return this.request('uploadAvatar', { dataUrl, filename }); }
}

// 全域實例
let gameAPI = null;

function initializeAPI() {
  const VERCEL_PROXY_URL = 'https://werewolf-game-ga88.vercel.app/api/proxy';
  gameAPI = new GameAPI(VERCEL_PROXY_URL);
  console.log('✅ GameAPI 已初始化（使用正確 Vercel Proxy）');
  return gameAPI;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAPI);
} else {
  initializeAPI();
}
