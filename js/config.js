/**
 * 狼人殺遊戲 - 配置檔案
 * 
 * 此檔案包含所有全域配置，包括 Google Apps Script Web App URL
 * 在部署前，請修改 GS_WEB_APP_URL 為您的實際 Web App URL
 */

const CONFIG = {
  // ===== Google Apps Script Web App 設定 =====
  // 請將此 URL 替換為您的 Google Apps Script Web App URL
  // 格式: https://script.google.com/macros/d/{SCRIPT_ID}/usercopy/v{VERSION}/exec
  GS_WEB_APP_URL: 'https://script.google.com/macros/s/1RAmHB34wjl9QpmiC5CPsjybiuG-cujkcGYF5kfORtUW7Ic4dTi9n7_dd/exec',
  
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
  ADMIN_PASSWORD: '1234',         // 預設管理員密碼
  
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
 * 確保 GS_WEB_APP_URL 已正確設定
 */
function validateConfig() {
  if (!CONFIG.GS_WEB_APP_URL || CONFIG.GS_WEB_APP_URL.includes('YOUR_SCRIPT_ID')) {
    console.error('❌ 錯誤：GS_WEB_APP_URL 未設定！請修改 js/config.js 中的 GS_WEB_APP_URL');
    return false;
  }
  console.log('✅ 配置驗證通過');
  return true;
}

// 在頁面載入時驗證配置
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', validateConfig);
} else {
  validateConfig();
}
