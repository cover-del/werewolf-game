const CONFIG = {
  // 指向 Vercel Proxy
  GS_WEB_APP_URL: '/api/proxy',

  POLL_INTERVAL_MS: 1500,
  DEFAULT_PLAYERS: 6,

  ROLE_DISTRIBUTION: {
    6: ['werewolf','werewolf','seer','doctor','villager','villager'],
    7: ['werewolf','werewolf','werewolf','seer','doctor','villager','villager'],
    8: ['werewolf','werewolf','werewolf','seer','doctor','villager','villager','villager'],
    9: ['werewolf','werewolf','werewolf','seer','doctor','villager','villager','villager','villager'],
    10:['werewolf','werewolf','werewolf','werewolf','seer','doctor','villager','villager','villager','villager']
  },

  ADMIN_PASSWORD: '1234',

  ROLE_NAMES: {
    'werewolf': '🐺 狼人',
    'seer': '🔮 預言家',
    'doctor': '⚕️ 醫生',
    'villager': '👨 村民'
  },

  STORAGE_KEYS: {
    playId: 'werewolf_playId',
    playerName: 'werewolf_playerName',
    roomId: 'werewolf_roomId',
    playerId: 'werewolf_playerId'
  }
};
