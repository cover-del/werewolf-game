/**
 * 狼人殺遊戲 - API 通訊層（透過 Proxy）
 */
class GameAPI {
  constructor(proxyPath = '/api/proxy') {
    this.baseUrl = proxyPath;
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

      const json = await response.json();
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

  createRoom(playId, avatarUrl, customRoomId) {
    return this.request('createRoom', { playId, avatarUrl, customRoomId });
  }

  joinRoom(roomId, playId, avatarUrl) {
    return this.request('joinRoom', { roomId, playId, avatarUrl });
  }

  leaveRoom(roomId, playerId) {
    return this.request('leaveRoom', { roomId, playerId });
  }

  getRoomState(roomId, requesterId) {
    return this.request('getRoomState', { roomId, requesterId });
  }

  assignRoles(roomId, callerId) {
    return this.request('assignRoles', { roomId, callerId });
  }

  submitNightAction(roomId, playerId, action) {
    return this.request('submitNightAction', { roomId, playerId, action });
  }

  resolveNight(roomId, callerId) {
    return this.request('resolveNight', { roomId, callerId });
  }

  submitVote(roomId, voterId, targetId) {
    return this.request('submitVote', { roomId, voterId, targetId });
  }

  resolveVotes(roomId, callerId) {
    return this.request('resolveVotes', { roomId, callerId });
  }

  postChat(roomId, playerId, text) {
    return this.request('postChat', { roomId, playerId, text });
  }
  
  listRooms() {
    return this.request('listRooms');
  }

  getPlayerStats(playId) {
    return this.request('getPlayerStats', { playId });
  }
  
  uploadAvatar(dataUrl, filename) {
    return this.request('uploadAvatar', { dataUrl, filename });
  }
}

// 全域實例
// 初始化 API
let gameAPI = null;

function initializeAPI() {
  if (!CONFIG.GS_WEB_APP_URL) {
    console.error('❌ GS_WEB_APP_URL 未設定');
    return;
  }

  gameAPI = new GameAPI(CONFIG.GS_WEB_APP_URL);
  console.log('✅ GameAPI 已初始化（透過 Vercel Proxy）');
}

document.addEventListener('DOMContentLoaded', initializeAPI);
