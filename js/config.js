/**
 * 狼人殺遊戲 - 配置檔案
 * 指向 Vercel Proxy
 */
const CONFIG = {
  // ===== Vercel Proxy URL =====
  // 改成你的正確 Vercel 專案
  GS_WEB_APP_URL: 'https://werewolf-game-ga81.vercel.app/api/proxy',

  // ===== 遊戲設定 =====
  POLL_INTERVAL_MS: 1500,        // 輪詢間隔（毫秒）
  DEFAULT_PLAYERS: 6,             // 預設玩家人數

  // ===== 角色分配 =====
  ROLE_DISTRIBUTION: {
    6: ['werewolf', 'werewolf', 'seer', 'doctor', 'villager', 'villager'],
    7: ['werewolf', 'werewolf', 'werewolf', 'seer', 'doctor', 'villager', 'villager'],
    8: ['werewolf', 'werewolf', 'werewolf', 'seer', 'doctor', 'villager', 'villager', 'villager'],
    9: ['werewolf', 'werewolf', 'werewolf', 'seer', 'doctor', 'villager', 'villager', 'villager', 'villager'],
    10: ['werewolf', 'werewolf', 'werewolf', 'werewolf', 'seer', 'doctor', 'villager', 'villager', 'villager', 'villager']
  },

  // ===== 管理員設定 =====
  ADMIN_PASSWORD: '1234',

  // ===== 角色名稱對應 =====
  ROLE_NAMES: {
    'werewolf': '🐺 狼人',
    'seer': '🔮 預言家',
    'doctor': '⚕️ 醫生',
    'villager': '👨 村民'
  },

  // ===== 儲存鍵名 =====
  STORAGE_KEYS: {
    playId: 'werewolf_playId',
    playerName: 'werewolf_playerName',
    roomId: 'werewolf_roomId',
    playerId: 'werewolf_playerId'
  }
};

/**
 * 驗證配置
 */
function validateConfig() {
  if (!CONFIG.GS_WEB_APP_URL) {
    console.error('❌ GS_WEB_APP_URL 未設定！');
    return false;
  }
  console.log('✅ 配置驗證通過');
  return true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', validateConfig);
} else {
  validateConfig();
}
