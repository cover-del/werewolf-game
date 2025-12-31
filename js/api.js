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
  adminLogin(password) {
    return this.request('adminLogin', { password });
  }

  adminListRooms(password) {
    return this.request('adminListRooms', { password });
  }

  adminDeleteRoom(roomId) {
    return this.request('adminDeleteRoom', { roomId });
  }

  adminDeleteAllRooms() {
    return this.request('adminDeleteAllRooms');
  }

  // ===== 上傳功能 =====
  uploadAvatar(dataUrl, filename) {
    return this.request('uploadAvatar', { dataUrl, filename });
  }
}

// 全域實例
// 建立全域 API 實例
let gameAPI = null;

function initializeAPI() {
  // 這裡填入你 Vercel 部署的 proxy URL
  // 範例: https://werewolf-game-uvln.vercel.app/api/proxy
  const VERCEL_PROXY_URL = 'https://werewolf-game-uvln.vercel.app/api/proxy';

  if (!VERCEL_PROXY_URL) {
    console.error('❌ Vercel Proxy URL 尚未設定，無法初始化 API');
    return null;
  }

  gameAPI = new GameAPI(VERCEL_PROXY_URL);
  console.log('✅ GameAPI 已初始化（使用 Vercel Proxy）');
  return gameAPI;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAPI);
} else {
  initializeAPI();
}
