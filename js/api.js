/**
 * 狼人殺遊戲 - API 通訊層
 * 
 * 此檔案提供所有與 Google Apps Script 後端通訊的函數
 * 使用 Fetch API 進行 CORS 相容的跨域請求
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
      const url = `${this.baseUrl}?action=${action}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      // 注意：使用 no-cors 模式時，response.json() 可能不可用
      // 因此我們使用 text() 並手動解析
      const text = await response.text();
      
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error('無法解析回應:', text);
        return { error: '伺服器回應格式錯誤' };
      }
    } catch (error) {
      console.error('API 請求失敗:', error);
      return { error: '網路連線失敗：' + error.message };
    }
  }

  // ===== 玩家認證 =====

  /**
   * 玩家登入
   */
  async loginPlayer(name, password) {
    return this.request('loginPlayer', { name, password });
  }

  /**
   * 玩家註冊
   */
  async registerPlayer(name, password) {
    return this.request('registerPlayer', { name, password });
  }

  // ===== 房間操作 =====

  /**
   * 建立房間
   */
  async createRoom(playId, avatarUrl = '', customRoomId = '') {
    return this.request('createRoom', { 
      name: playId,
      avatarData: avatarUrl,
      customRoomId 
    });
  }

  /**
   * 加入房間
   */
  async joinRoom(roomId, playId, avatarUrl = '') {
    return this.request('joinRoom', {
      roomId,
      name: playId,
      avatarData: avatarUrl
    });
  }

  /**
   * 離開房間
   */
  async leaveRoom(roomId, playerId) {
    return this.request('leaveRoom', {
      roomId,
      playerId
    });
  }

  /**
   * 取得房間狀態
   */
  async getRoomState(roomId, requesterId) {
    return this.request('getRoomState', {
      roomId,
      requesterId
    });
  }

  /**
   * 取得所有房間列表
   */
  async listRooms() {
    return this.request('listRooms', {});
  }

  // ===== 遊戲操作 =====

  /**
   * 分配身分
   */
  async assignRoles(roomId, callerId) {
    return this.request('assignRoles', {
      roomId,
      callerId
    });
  }

  /**
   * 提交夜晚行動
   */
  async submitNightAction(roomId, playerId, action) {
    return this.request('submitNightAction', {
      roomId,
      playerId,
      action
    });
  }

  /**
   * 結束夜晚
   */
  async resolveNight(roomId, callerId) {
    return this.request('resolveNight', {
      roomId,
      callerId
    });
  }

  /**
   * 提交投票
   */
  async submitVote(roomId, voterId, targetId) {
    return this.request('submitVote', {
      roomId,
      voterId,
      targetId
    });
  }

  /**
   * 結束投票
   */
  async resolveVotes(roomId, callerId) {
    return this.request('resolveVotes', {
      roomId,
      callerId
    });
  }

  /**
   * 發送聊天訊息
   */
  async postChat(roomId, playerId, text) {
    return this.request('postChat', {
      roomId,
      playerId,
      text
    });
  }

  // ===== 管理員操作 =====

  /**
   * 管理員登入
   */
  async adminLogin(password) {
    return this.request('adminLogin', { password });
  }

  /**
   * 取得所有房間列表（管理員版本）
   */
  async adminListRooms(password) {
    return this.request('adminListRooms', { password });
  }

  /**
   * 刪除特定房間
   */
  async adminDeleteRoom(roomId) {
    return this.request('adminDeleteRoom', { roomId });
  }

  /**
   * 刪除所有房間
   */
  async adminDeleteAllRooms() {
    return this.request('adminDeleteAllRooms', {});
  }

  // ===== 上傳功能 =====

  /**
   * 上傳頭像
   */
  async uploadAvatar(dataUrl, filename) {
    return this.request('uploadAvatar', {
      dataUrl,
      filename
    });
  }
}

// 建立全域 API 實例
let gameAPI = null;

function initializeAPI() {
  if (!validateConfig()) {
    console.error('配置驗證失敗，無法初始化 API');
    return null;
  }
  
  gameAPI = new GameAPI(CONFIG.GS_WEB_APP_URL);
  console.log('✅ API 已初始化');
  return gameAPI;
}

// 在頁面載入時初始化 API
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAPI);
} else {
  initializeAPI();
}
