/**
 * 狼人殺遊戲 - 主遊戲邏輯（已對齊 GameAPI）
 */

let state = {
  roomId: null,
  playerId: null,
  myVote: null,
  phase: null
};
let myRole = null;
let pollTimer = null;

// -------------------- 初始化 --------------------
document.addEventListener('DOMContentLoaded', () => {
  const playId = localStorage.getItem(CONFIG.STORAGE_KEYS.playId);
  const playerName = localStorage.getItem(CONFIG.STORAGE_KEYS.playerName);
  const roomId = localStorage.getItem(CONFIG.STORAGE_KEYS.roomId);
  const playerId = localStorage.getItem(CONFIG.STORAGE_KEYS.playerId);

  if (!playId) {
    window.location.href = 'login.html';
    return;
  }

  if (!gameAPI) {
    console.error('❌ GameAPI 尚未初始化');
    return;
  }

  // 玩家資訊彈窗
  const playerInfoBtn = document.getElementById('playerInfoBtn');
  if (playerInfoBtn) {
    playerInfoBtn.addEventListener('click', async () => {
      const modal = document.getElementById('playerInfoModal');
      const content = document.getElementById('playerInfoContent');
    
      try {
        const res = await gameAPI.getPlayerStats(playId);
        
        // 嘗試抓不同欄位
        let data = {};
        if (res.success && res.player) {
          data = res.player;
        } else if (res.data) {
          data = res.data;
        } else {
          data = res; // fallback
        }
    
        // 安全抓欄位，如果沒有就顯示 "-"
        const displayId = data.id || data.playId || '-';
        const displayName = data.username || data.name || '-';
        const displayWins = typeof data.wins === 'number' ? data.wins : '-';
        const displayLosses = typeof data.losses === 'number' ? data.losses : '-';
        const displayWinRate = typeof data.winRate === 'number' ? data.winRate : '-';
    
        content.innerHTML = `
          <p><strong>Play ID:</strong> ${displayId}</p>
          <p><strong>名字:</strong> ${displayName}</p>
          <p><strong>勝場:</strong> ${displayWins}</p>
          <p><strong>敗場:</strong> ${displayLosses}</p>
          <p><strong>勝率:</strong> ${displayWinRate}%</p>
        `;
      } catch (e) {
        content.textContent = '載入玩家資訊失敗';
        console.error(e);
      }
    
      modal.style.display = 'flex';
    });

  // 已在房間 → 自動回房
  if (roomId && playerId) {
    console.log('🔁 偵測到玩家已在房間，嘗試自動回房', roomId);
    rejoinRoom(roomId, playerId);
    return;
  }

  // 正常顯示大廳
  document.getElementById('playerName').textContent = playerName || '玩家';
  refreshRoomList();
  setInterval(refreshRoomList, 5000);
});

// -------------------- 全域函式 --------------------

// 關閉玩家資訊
function closePlayerInfo() {
  document.getElementById('playerInfoModal').style.display = 'none';
}

// 離開房間 / 關閉頁面時
window.addEventListener('beforeunload', () => {
  const roomId = localStorage.getItem(CONFIG.STORAGE_KEYS.roomId);
  const playerId = localStorage.getItem(CONFIG.STORAGE_KEYS.playerId);
  if (roomId && playerId && gameAPI) {
    navigator.sendBeacon(
      gameAPI.baseUrl,
      JSON.stringify({ action: 'leaveRoom', roomId, playerId })
    );
  }
});

// 手動清除房間狀態
document.getElementById('manualLeaveBtn')?.addEventListener('click', async () => {
  if (!confirm('確定要退出房間狀態嗎？')) return;
  await leaveRoom(true);
});

// 登出
async function logout() {
  await leaveRoom(true);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.playId);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.playerName);
  window.location.href = 'login.html';
}

// 建立房間
async function createRoom() {
  const customRoomId = document.getElementById('customRoomId').value.trim();
  const errorDiv = document.getElementById('createError');
  errorDiv.classList.remove('show');

  try {
    const res = await gameAPI.createRoom(
      localStorage.getItem(CONFIG.STORAGE_KEYS.playId),
      '',
      customRoomId || undefined
    );

    if (res.error) {
      errorDiv.textContent = res.error;
      errorDiv.classList.add('show');
    } else {
      enterGame(res.roomId, res.playerId);
    }
  } catch (error) {
    console.error('建立房間失敗:', error);
    errorDiv.textContent = '建立房間失敗';
    errorDiv.classList.add('show');
  }
}

// 加入房間
async function joinRoom() {
  const roomId = document.getElementById('joinRoomId').value.trim().toUpperCase();
  const errorDiv = document.getElementById('joinError');
  errorDiv.classList.remove('show');

  if (!roomId) {
    errorDiv.textContent = '請輸入房號';
    errorDiv.classList.add('show');
    return;
  }

  try {
    const res = await gameAPI.joinRoom(
      roomId,
      localStorage.getItem(CONFIG.STORAGE_KEYS.playId),
      ''
    );

    if (res.error) {
      errorDiv.textContent = res.error;
      errorDiv.classList.add('show');
    } else {
      enterGame(roomId, res.playerId);
    }
  } catch (error) {
    console.error('加入房間失敗:', error);
    errorDiv.textContent = '加入房間失敗';
    errorDiv.classList.add('show');
  }
}

// 刷新房間列表
async function refreshRoomList() {
  try {
    const res = await gameAPI.listRooms();
    if (res.error) throw new Error(res.error || '未知錯誤');

    const rooms = Array.isArray(res) ? res : res.data;
    const roomList = document.getElementById('roomList');
    roomList.innerHTML = '';

    if (!rooms.length) {
      roomList.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">目前沒有房間</div>';
      return;
    }

    rooms.forEach(room => {
      const div = document.createElement('div');
      div.className = 'room-item';
      div.innerHTML = `
        <div class="room-info">
          <div class="room-id">房號: ${room.id}</div>
          <div class="room-detail">房主: ${room.hostName} | 玩家: ${room.playerCount}</div>
        </div>
        <button class="room-join-btn" onclick="document.getElementById('joinRoomId').value='${room.id}'; joinRoom();">加入</button>
      `;
      roomList.appendChild(div);
    });
  } catch (error) {
    console.error('刷新房間列表失敗:', error);
    document.getElementById('roomList').innerHTML =
      `<div style="text-align:center;color:#f00;padding:20px;">刷新房間列表失敗</div>`;
  }
}

// 進入遊戲畫面
function enterGame(roomId, playerId) {
  localStorage.setItem(CONFIG.STORAGE_KEYS.roomId, roomId);
  localStorage.setItem(CONFIG.STORAGE_KEYS.playerId, playerId);

  state.roomId = roomId;
  state.playerId = playerId;
  state.myVote = null;

  document.getElementById('lobbyArea').classList.add('hidden');
  document.getElementById('gameArea').classList.add('active');
  document.getElementById('roomId').textContent = roomId;

  pollRoom();
  clearInterval(pollTimer);
  pollTimer = setInterval(pollRoom, CONFIG.POLL_INTERVAL_MS);
}

// 輪詢房間狀態
async function pollRoom() {
  if (!state.roomId || !state.playerId) return;

  try {
    const res = await gameAPI.getRoomState(state.roomId, state.playerId);
    if (res.error) return;

    state.phase = res.phase;
    myRole = res.players[state.playerId]?.role || '?';

    document.getElementById('myRole').textContent = CONFIG.ROLE_NAMES[myRole] || myRole;

    // 更新玩家列表、聊天室、夜晚行動、投票等
    updatePlayerList(res.players);
    updateChat(res.chat);
    updateNightActions(res);
    updateVoting(res);
    
    // 房主控制
    document.getElementById('hostControlDiv').style.display =
      res.hostId === state.playerId ? 'block' : 'none';

  } catch (error) {
    console.error('輪詢房間失敗:', error);
  }
}

// -------------------- 玩家相關更新函式 --------------------
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
    const div = document.createElement('div');
    div.className = 'player-card';
    div.innerHTML = `
      <img src="${p.avatar || 'https://via.placeholder.com/50'}" class="player-avatar" onerror="this.src='https://via.placeholder.com/50'">
      <div class="player-info-wrapper" style="display:flex;align-items:center;gap:8px;">
        <div class="player-name">${p.name}</div>
        ${p.id === state.playerId && p.role ? `<img src="${roleImages[p.role]}" class="role-icon" style="width:24px;height:24px;">` : ''}
      </div>
      <div class="player-status ${p.alive ? 'alive' : 'dead'}">
        ${p.alive ? '🟢 存活' : '⚫ 死亡'}
      </div>
    `;
    playerList.appendChild(div);
  });
}

function updateChat(chat) {
  const chatBox = document.getElementById('chatBox');
  chatBox.innerHTML = '';
  (chat || []).forEach(msg => {
    const div = document.createElement('div');
    div.className = 'chat-message';
    if (msg.system) {
      div.classList.add('chat-system');
      div.textContent = `[系統] ${msg.text}`;
    } else {
      div.innerHTML = `<span class="chat-player">${msg.name}:</span> ${msg.text}`;
    }
    chatBox.appendChild(div);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
}

function updateNightActions(roomState) {
  const nightDiv = document.getElementById('nightActionDiv');
  if ((roomState.phase === 'rolesAssigned' || roomState.phase === 'night') && roomState.players[state.playerId]?.alive) {
    nightDiv.style.display = 'block';
    const nightInfo = document.getElementById('nightActionInfo');
    const nightTargets = document.getElementById('nightTargets');
    nightTargets.innerHTML = '';

    const alivePlayers = Object.values(roomState.players).filter(p => p.alive && p.id !== state.playerId);
    if (myRole === 'werewolf') {
      nightInfo.textContent = '🐺 狼人：選擇攻擊目標';
      alivePlayers.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'action-btn';
        btn.textContent = `攻擊 ${p.name}`;
        btn.onclick = () => submitNightAction('kill', p.id);
        nightTargets.appendChild(btn);
      });
    } else if (myRole === 'seer') {
      nightInfo.textContent = '🔮 預言家：選擇查驗目標';
      alivePlayers.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'action-btn';
        btn.textContent = `查驗 ${p.name}`;
        btn.onclick = () => submitNightAction('check', p.id);
        nightTargets.appendChild(btn);
      });
    } else if (myRole === 'doctor') {
      nightInfo.textContent = '⚕️ 醫生：選擇守護目標';
      Object.values(roomState.players).filter(p => p.alive).forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'action-btn';
        btn.textContent = `守護 ${p.name}`;
        btn.onclick = () => submitNightAction('save', p.id);
        nightTargets.appendChild(btn);
      });
    } else {
      nightInfo.textContent = '😴 平民：無夜晚行動';
    }
  } else {
    nightDiv.style.display = 'none';
  }
}

function updateVoting(roomState) {
  const voteDiv = document.getElementById('voteDiv');
  if (roomState.phase === 'day' && roomState.players[state.playerId]?.alive) {
    voteDiv.style.display = 'block';
    const voteTargets = document.getElementById('voteTargets');
    voteTargets.innerHTML = '';
    Object.values(roomState.players).filter(p => p.alive && p.id !== state.playerId).forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'action-btn';
      btn.textContent = `投票 ${p.name}`;
      btn.style.background = state.myVote === p.id ? '#e74c3c' : '#667eea';
      btn.onclick = async () => {
        state.myVote = p.id;
        await submitMyVote();
      };
      voteTargets.appendChild(btn);
    });
  } else {
    voteDiv.style.display = 'none';
  }
}

// -------------------- 玩家操作 --------------------
async function submitNightAction(type, targetId) {
  try {
    await gameAPI.submitNightAction(state.roomId, state.playerId, { type, targetId });
    await pollRoom();
  } catch (error) {
    console.error('提交夜晚行動失敗:', error);
  }
}

async function submitMyVote() {
  if (!state.myVote) {
    alert('請選擇投票對象');
    return;
  }
  try {
    await gameAPI.submitVote(state.roomId, state.playerId, state.myVote);
    await pollRoom();
  } catch (error) {
    console.error('提交投票失敗:', error);
  }
}

async function assignRoles() {
  try {
    await gameAPI.assignRoles(state.roomId, state.playerId);
    await pollRoom();
  } catch (error) {
    console.error('分配身分失敗:', error);
  }
}

async function resolveNight() {
  try {
    await gameAPI.resolveNight(state.roomId, state.playerId);
    await pollRoom();
  } catch (error) {
    console.error('結束夜晚失敗:', error);
  }
}

async function resolveVotes() {
  try {
    await gameAPI.resolveVotes(state.roomId, state.playerId);
    await pollRoom();
  } catch (error) {
    console.error('結束投票失敗:', error);
  }
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  try {
    await gameAPI.postChat(state.roomId, state.playerId, text);
    input.value = '';
    await pollRoom();
  } catch (error) {
    console.error('發送聊天失敗:', error);
  }
}

// 離開房間
async function leaveRoom(skipConfirm = false) {
  if (!skipConfirm && !confirm('確定要離開房間嗎？')) return;
  try {
    await gameAPI.leaveRoom(state.roomId, state.playerId);
  } catch (error) {
    console.warn('離開房間通知後端失敗（可忽略）');
  }
  localStorage.removeItem(CONFIG.STORAGE_KEYS.roomId);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.playerId);
  state = { roomId: null, playerId: null, myVote: null, phase: null };
  clearInterval(pollTimer);

  document.getElementById('gameArea').classList.remove('active');
  document.getElementById('lobbyArea').classList.remove('hidden');
  await refreshRoomList();
}

// 回房
async function rejoinRoom(roomId, playerId) {
  try {
    const res = await gameAPI.getRoomState(roomId, playerId);
    if (res.error) {
      console.warn('回房失敗，自動回大廳:', res.error);
      localStorage.removeItem(CONFIG.STORAGE_KEYS.roomId);
      localStorage.removeItem(CONFIG.STORAGE_KEYS.playerId);
      refreshRoomList();
      return;
    }
    enterGame(roomId, playerId);
  } catch (e) {
    console.error('回房錯誤', e);
  }
}

// 更換頭像
function changeMyAvatar() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await gameAPI.uploadAvatar(reader.result, file.name);
        if (res.error) {
          alert('上傳失敗');
          return;
        }
        localStorage.setItem(CONFIG.STORAGE_KEYS.avatarUrl, res.data);
        alert('頭像已更新');
      } catch (e) {
        console.error('上傳頭像失敗', e);
        alert('上傳失敗');
      }
    };
    reader.readAsDataURL(file);
  };

  input.click();
}
