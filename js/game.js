/**
 * 狼人殺遊戲 - 主遊戲邏輯（修正版 ES2018 Safe）
 */

let state = {
  roomId: null,
  playerId: null,
  myVote: null,
  phase: null
};
let myRole = null;
let pollTimer = null;

// ================= 初始化 =================
document.addEventListener('DOMContentLoaded', async function () {
  const playId = localStorage.getItem(CONFIG.STORAGE_KEYS.playId);
  const playerName = localStorage.getItem(CONFIG.STORAGE_KEYS.playerName);
  let roomId = localStorage.getItem(CONFIG.STORAGE_KEYS.roomId);
  let playerId = localStorage.getItem(CONFIG.STORAGE_KEYS.playerId);

  if (!playId) {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('playerName').textContent = playerName || '玩家';

  // 嘗試自動回房
  if (roomId && playerId) {
    try {
      const res = await gameAPI.getRoomState(roomId, playerId);
      if (!res.error) {
        await rejoinRoom(roomId, playerId);
        return; // 成功回房就結束初始化
      } else {
        console.warn('自動回房失敗，清除 localStorage:', res.error);
        localStorage.removeItem('roomId');
        localStorage.removeItem('playerId');
        roomId = null;
        playerId = null;
      }
    } catch (e) {
      console.warn('自動回房失敗，清除 localStorage:', e.message);
      localStorage.removeItem('roomId');
      localStorage.removeItem('playerId');
      roomId = null;
      playerId = null;
    }
  }

  refreshRoomList();
  setInterval(refreshRoomList, 5000);

  // 玩家資訊 Modal
  const playerInfoBtn = document.getElementById('playerInfoBtn');
  if (playerInfoBtn) {
    playerInfoBtn.addEventListener('click', async function () {
      const modal = document.getElementById('playerInfoModal');
      const content = document.getElementById('playerInfoContent');
      content.textContent = '載入中...';

      try {
        const res = await gameAPI.getPlayerStats(playId);
        const data = res?.data || res || {};

        content.innerHTML =
          '<p><strong>Play ID:</strong> ' + (data.playId || '-') + '</p>' +
          '<p><strong>名字:</strong> ' + (data.name || '-') + '</p>' +
          '<p><strong>勝場:</strong> ' + (data.wins || 0) + '</p>' +
          '<p><strong>敗場:</strong> ' + (data.losses || 0) + '</p>' +
          '<p><strong>勝率:</strong> ' + (data.winRate || 0) + '%</p>';
      } catch (e) {
        content.textContent = '載入玩家資訊失敗';
        console.error(e);
      }

      modal.style.display = 'flex';
    });
  }

  // 更換頭像
  const lobbyAvatarBtn = document.getElementById('lobbyChangeAvatarBtn');
  if (lobbyAvatarBtn) {
    lobbyAvatarBtn.addEventListener('click', function () {
      changeMyAvatar();
    });
  }
});

// ================= 共用函式 =================
function closePlayerInfo() {
  document.getElementById('playerInfoModal').style.display = 'none';
}

window.addEventListener('beforeunload', function () {
  const roomId = localStorage.getItem(CONFIG.STORAGE_KEYS.roomId);
  const playerId = localStorage.getItem(CONFIG.STORAGE_KEYS.playerId);
  if (roomId && playerId && gameAPI) {
    navigator.sendBeacon(
      gameAPI.baseUrl,
      JSON.stringify({ action: 'leaveRoom', roomId, playerId })
    );
  }
});

// ================= 房間 =================
async function createRoom() {
  const customRoomId = document.getElementById('customRoomId').value.trim();
  const errorDiv = document.getElementById('createError');
  errorDiv.textContent = '';

  try {
    const res = await gameAPI.createRoom(
      localStorage.getItem(CONFIG.STORAGE_KEYS.playId),
      '',
      customRoomId || undefined
    );
    const result = res?.data || res;
    if (result.error) {
      errorDiv.textContent = result.error;
    } else {
      enterGame(result.roomId, result.playerId);
    }
  } catch (e) {
    errorDiv.textContent = '建立房間失敗';
    console.error(e);
  }
}

async function joinRoom() {
  const roomId = document.getElementById('joinRoomId').value.trim().toUpperCase();
  const errorDiv = document.getElementById('joinError');
  errorDiv.textContent = '';

  if (!roomId) {
    errorDiv.textContent = '請輸入房號';
    return;
  }

  try {
    const res = await gameAPI.joinRoom(
      roomId,
      localStorage.getItem(CONFIG.STORAGE_KEYS.playId),
      ''
    );
    const result = res?.data || res;
    if (result.error) {
      errorDiv.textContent = result.error;
    } else {
      enterGame(roomId, result.playerId);
    }
  } catch (e) {
    errorDiv.textContent = '加入房間失敗';
    console.error(e);
  }
}

// ================= 房間列表刷新 =================
async function refreshRoomList() {
  const roomList = document.getElementById('roomList');
  roomList.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">載入中...</div>';

  try {
    const res = await gameAPI.listRooms();
    const roomsObj = res?.data || {};
    const rooms = Object.values(roomsObj);

    roomList.innerHTML = '';
    if (rooms.length === 0) {
      roomList.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">目前沒有房間</div>';
      return;
    }

    rooms.forEach(room => {
      const div = document.createElement('div');
      div.className = 'room-item';
      div.innerHTML = `
        <div class="room-info">
          <div class="room-id">房號: ${room.id}</div>
          <div class="room-detail">
            房主: ${room.hostName || '-'} | 玩家: ${Object.keys(room.players || {}).length}
          </div>
        </div>
        <button class="room-join-btn"
          onclick="document.getElementById('joinRoomId').value='${room.id}'; joinRoom();">
          加入
        </button>
      `;
      roomList.appendChild(div);
    });
  } catch (err) {
    console.error('刷新房間列表失敗:', err);
    roomList.innerHTML = '<div style="text-align:center;color:red;padding:20px;">刷新房間列表失敗</div>';
  }
}

function enterGame(roomId, playerId) {
  localStorage.setItem(CONFIG.STORAGE_KEYS.roomId, roomId);
  localStorage.setItem(CONFIG.STORAGE_KEYS.playerId, playerId);

  state.roomId = roomId;
  state.playerId = playerId;
  state.myVote = null;

  document.getElementById('lobbyArea')?.classList.add('hidden');
  document.getElementById('gameArea')?.classList.add('active');
  document.getElementById('roomId').textContent = roomId;

  pollRoom();
  clearInterval(pollTimer);
  pollTimer = setInterval(pollRoom, CONFIG.POLL_INTERVAL_MS);
}

// ================= 核心輪詢 =================
async function pollRoom() {
  if (!state.roomId || !state.playerId) return;

  try {
    const res = await gameAPI.getRoomState(state.roomId, state.playerId);
    const result = res?.data || {};

    if (result.error) {
      console.warn('pollRoom 錯誤:', result.error);
      if (result.error.includes('房間不存在')) {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.roomId);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.playerId);
        location.reload();
      }
      return;
    }

    const players = result.players || {};
    const me = players[state.playerId] || null;

    myRole = me?.role || null;
    document.getElementById('myRole').textContent = myRole ? CONFIG.ROLE_NAMES[myRole] || '?' : '?';

    updatePlayerList(players);
    updateChat(result.chat || []);

    const phase = result.phase;
    switch (phase) {
      case 'rolesAssigned':
      case 'night':
        showNightUI();
        break;
      case 'day':
        showDayUI();
        const allVoted = Object.values(players).every(p => !p.alive || p.hasVoted);
        if (allVoted) await resolveVotes();
        break;
      case 'ended':
        showEndUI(result.winner, players);
        clearInterval(pollTimer);
        break;
    }
  } catch (e) {
    console.error('pollRoom 失敗', e);
  }
}

// ================= 顯示 =================
function updatePlayerList(players) {
  const playerList = document.getElementById('playerList');
  playerList.innerHTML = '';

  const roleImages = {
    werewolf: 'img/roles/werewolf.png',
    seer: 'img/roles/seer.png',
    doctor: 'img/roles/doctor.png',
    villager: 'img/roles/villager.png'
  };

  Object.values(players).forEach(p => {
    let roleIconHTML = '';
    if (p.id === state.playerId && p.role && roleImages[p.role]) {
      roleIconHTML = '<img src="' + roleImages[p.role] + '" class="role-icon" style="width:24px;height:24px;">';
    }
    const div = document.createElement('div');
    div.className = 'player-card';
    div.innerHTML =
      '<img src="' + (p.avatar || 'https://via.placeholder.com/50') + '" class="player-avatar">' +
      '<div class="player-info-wrapper" style="display:flex;gap:8px;">' +
      '<div>' + p.name + '</div>' +
      roleIconHTML +
      '</div>' +
      '<div>' + (p.alive ? '🟢 存活' : '⚫ 死亡') + '</div>';
    playerList.appendChild(div);
  });
}

function updateChat(chatArray) {
  const chatBox = document.getElementById('chatBox');
  chatBox.innerHTML = '';
  chatArray.forEach(msg => {
    const div = document.createElement('div');
    div.className = msg.system ? 'chat-system' : 'chat-msg';
    div.textContent = msg.system ? `[系統] ${msg.text}` : `${msg.name}: ${msg.text}`;
    chatBox.appendChild(div);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
}

function showNightUI() {
  document.getElementById('nightActionDiv').style.display = 'block';
  document.getElementById('voteDiv').style.display = 'none';
}

function showDayUI() {
  document.getElementById('nightActionDiv').style.display = 'none';
  document.getElementById('voteDiv').style.display = 'block';
}

function showEndUI(winner, players) {
  alert(`遊戲結束！勝利方: ${winner === 'villagers' ? '村民' : '狼人'}`);
}

// ================= 夜晚 / 投票 / 角色 =================
async function submitNightAction(type, targetId) {
  await gameAPI.submitNightAction(state.roomId, state.playerId, { type, targetId });
}
async function submitMyVote() {
  if (!state.myVote) return alert('請選擇投票對象');
  await gameAPI.submitVote(state.roomId, state.playerId, state.myVote);
}
async function assignRoles() { await gameAPI.assignRoles(state.roomId, state.playerId); }
async function resolveNight() { try { await gameAPI.resolveNight(state.roomId, state.playerId); } catch(e){} }
async function resolveVotes() { try { await gameAPI.resolveVotes(state.roomId, state.playerId); } catch(e){} }
async function sendChat() {
  const input = document.getElementById('chatInput');
  if (!input.value.trim()) return;
  await gameAPI.postChat(state.roomId, state.playerId, input.value.trim());
  input.value = '';
}
async function leaveRoom() {
  await gameAPI.leaveRoom(state.roomId, state.playerId);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.roomId);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.playerId);
  clearInterval(pollTimer);
  location.reload();
}

// ================= 頭像 =================
function changeMyAvatar() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async function () {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function () {
      const res = await gameAPI.uploadAvatar(reader.result, file.name);
      if (res.success) alert('頭像已更新');
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// ================= 登出 =================
window.logout = function () {
  localStorage.removeItem(CONFIG.STORAGE_KEYS.playId);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.playerId);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.roomId);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.playerName);

  state.roomId = null;
  state.playerId = null;
  state.phase = null;

  window.location.replace(location.origin + '/werewolf-game/login.html');
};

// ================= 回房 =================
window.rejoinRoom = async function (roomId, playerId) {
  try {
    const res = await gameAPI.getRoomState(roomId, playerId);
    if (res.error) throw new Error(res.error);

    state.roomId = roomId;
    state.playerId = playerId;
    state.myVote = null;

    document.getElementById('lobbyArea')?.classList.add('hidden');
    document.getElementById('gameArea')?.classList.add('active');
    document.getElementById('roomId').textContent = roomId;

    clearInterval(pollTimer);
    pollTimer = setInterval(pollRoom, CONFIG.POLL_INTERVAL_MS);

    await pollRoom();
  } catch (e) {
    console.warn('回房失敗，清除 localStorage:', e.message);
    localStorage.removeItem('roomId');
    localStorage.removeItem('playerId');
    location.reload();
  }
};
