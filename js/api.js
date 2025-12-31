/**
 * 狼人殺遊戲 - API 通訊層
 * 使用 Fetch API 與 Google Apps Script Web App
 * 支援 CORS，能正確解析 JSON 回應
 */
class GameAPI {
  constructor(gsWebAppUrl) {
    this.baseUrl = gsWebAppUrl;
    this.timeout = 10000; // 10 秒超時
  }

  /**
   * 發送請求到 Google Apps Script
   * @param {string} action - 動作名稱
   * @param {object} data - 請求資料
   * @returns {Promise} 回應資料
   */
  async request(action, data = {}) {
    try {
      // 將 action 放入 payload
      const payload = { action, ...data };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // 解析 JSON
      const json = await response.json();
      return json;
    } catch (error) {
      console.error('API 請求失敗:', error);
      return { error: '網路或伺服器錯誤：' + error.message };
    }
  }

  // ===== 玩家認證 =====
  async loginPlayer(name, password) {
    return this.request('loginPlayer', { name, password });
  }

  async registerPlayer(name, password) {
    return this.request('registerPlayer', { name, password });
  }

  // ===== 房間操作 =====
  async createRoom(playId, avatarUrl = '', customRoomId = '') {
    return this.request('createRoom', { name: playId, avatarData: avatarUrl, customRoomId });
  }

  async joinRoom(roomId, playId, avatarUrl = '') {
    return this.request('joinRoom', { roomId, name: playId, avatarData: avatarUrl });
  }

  async leaveRoom(roomId, playerId) {
    return this.request('leaveRoom', { roomId, playerId });
  }

  async getRoomState(roomId, requesterId) {
    return this.request('getRoomState', { roomId, requesterId });
  }

  async listRooms() {
    return this.request('listRooms');
  }

  // ===== 遊戲操作 =====
  async assignRoles(roomId, callerId) {
    return this.request('assignRoles', { roomId, callerId });
  }

  async submitNightAction(roomId, playerId, action) {
    return this.request('submitNightAction', { roomId, playerId, action });
  }

  async resolveNight(roomId, callerId) {
    return this.request('resolveNight', { roomId, callerId });
  }

  async submitVote(roomId, voterId, targetId) {
    return this.request('submitVote', { roomId, voterId, targetId });
  }

  async resolveVotes(roomId, callerId) {
    return this.request('resolveVotes', { roomId, callerId });
  }

  async postChat(roomId, playerId, text) {
    return this.request('postChat', { roomId, playerId, text });
  }

  // ===== 管理員操作 =====
  async adminLogin(password) {
    return this.request('adminLogin', { password });
  }

  async adminListRooms(password) {
    return this.request('adminListRooms', { password });
  }

  async adminDeleteRoom(roomId) {
    return this.request('adminDeleteRoom', { roomId });
  }

  async adminDeleteAllRooms() {
    return this.request('adminDeleteAllRooms');
  }

  // ===== 上傳功能 =====
  async uploadAvatar(dataUrl, filename) {
    return this.request('uploadAvatar', { dataUrl, filename });
  }
}

// 建立全域 API 實例
let gameAPI = null;

function initializeAPI() {
  gameAPI = new GameAPI('/api/proxy');
  console.log('✅ GameAPI 已初始化（使用 Vercel Proxy）');
  return gameAPI;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAPI);
} else {
  initializeAPI();
}
