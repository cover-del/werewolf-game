/**
 * 狼人殺遊戲 - 前端 API 封裝（修正版）
 */
class GameAPI {
  /**
   * @param {string} baseUrl GAS Web App URL 或 Proxy URL
   * @param {number} timeout 超時時間 (ms)
   */
  constructor(baseUrl, timeout = 20000) {
    if (!baseUrl) throw new Error('GameAPI 必須傳入 baseUrl');
    this.baseUrl = baseUrl;
    this.timeout = timeout;
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

      // GAS doPost 返回的結構可能是 {success:true,data:...} 或 {success:false,error:...}
      if (json.success === false) throw new Error(json.error || 'Unknown GAS error');

      return json.data || json;

    } catch (err) {
      console.error(`[GameAPI] ${action} 請求失敗:`, err);
      return { error: err.message };
    }
  }

  // ===== 玩家操作 =====
  loginPlayer(name, password) { return this.request('loginPlayer', { name, password }); }
  registerPlayer(name, password) { return this.request('registerPlayer', { name, password }); }

  // ===== 房間操作 =====
  createRoom(playId, avatarUrl, customRoomId) { return this.request('createRoom', { playId, avatarUrl, customRoomId }); }
  joinRoom(roomId, playId, avatarUrl) { return this.request('joinRoom', { roomId, playId, avatarUrl }); }
  leaveRoom(roomId, playerId) { return this.request('leaveRoom', { roomId, playerId }); }
  getRoomState(roomId, requesterId) { return this.request('getRoomState', { roomId, requesterId }); }
  assignRoles(roomId, callerId) { return this.request('assignRoles', { roomId, callerId }); }

  // ===== 夜晚操作 =====
  submitNightAction(roomId, playerId, action) { return this.request('submitNightAction', { roomId, playerId, action }); }
  resolveNight(roomId, callerId) { return this.request('resolveNight', { roomId, callerId }); }

  // ===== 投票 =====
  submitVote(roomId, voterId, targetId) { return this.request('submitVote', { roomId, voterId, targetId }); }
  resolveVotes(roomId, callerId) { return this.request('resolveVotes', { roomId, callerId }); }

  // ===== 聊天 =====
  postChat(roomId, playerId, text) { return this.request('postChat', { roomId, playerId, text }); }

  // ===== 其他 =====
  listRooms() { return this.request('listRooms'); }
  getPlayerStats(playId) { return this.request('getPlayerStats', { playId }); }
  uploadAvatar(dataUrl, filename) { return this.request('uploadAvatar', { dataUrl, filename }); }
}

// ===== 初始化範例 =====
let gameAPI = null;

function initializeAPI() {
  // 確保 CONFIG.GS_WEB_APP_URL 已設定
  if (!CONFIG.GS_WEB_APP_URL) {
    console.error('❌ CONFIG.GS_WEB_APP_URL 未設定');
    return;
  }

  // 使用 Proxy 或直接 GAS Web App URL
  gameAPI = new GameAPI(CONFIG.GS_WEB_APP_URL, 20000);
  console.log('✅ GameAPI 已初始化');
}

// 放在 body 底部或 DOMContentLoaded 時呼叫
document.addEventListener('DOMContentLoaded', initializeAPI);
