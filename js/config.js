/**
 * 狼人殺遊戲 - 配置檔案
 */

const CONFIG = {
  // ===== API（使用 Vercel Proxy）=====
  GS_WEB_APP_URL: '/api/proxy',

  // ===== 遊戲設定 =====
  POLL_INTERVAL_MS: 1500,
  DEFAULT_PLAYERS: 6,

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
    werewolf: '🐺 狼人',
    seer: '🔮 預言家',
    doctor: '⚕️ 醫生',
    villager: '👨 村民'
  },

  // ===== 儲存鍵名 =====
  STORAGE_KEYS: {
    playId: 'werewolf_playId',
    playerName: 'werewolf_playerName',
    roomId: 'werewolf_roomId',
    playerId: 'werewolf_playerId'
  }
};

// 可選：檢查
console.log('CONFIG loaded', CONFIG);
