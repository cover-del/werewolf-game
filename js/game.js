/**
 * 狼人殺遊戲 - 主遊戲邏輯
 */

let state = {
  roomId: null,
  playerId: null,
  myVote: null,
  phase: null
};
let myRole = null;
let pollTimer = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  const playId = localStorage.getItem(CONFIG.STORAGE_KEYS.playId);
  const playerName = localStorage.getItem(CONFIG.STORAGE_KEYS.playerName);
  const roomId = localStorage.getItem(CONFIG.STORAGE_KEYS.roomId);
  const playerId = localStorage.getItem(CONFIG.STORAGE_KEYS.playerId);

  // ❌ 尚未登入
  if (!playId) {
    window.location.href = 'login.html';
    return;
  }

  // ⭐ 已在房間 → 直接回房（不要顯示大廳）
  if (roomId && playerId) {
    console.log('🔁 偵測到玩家已在房間，嘗試自動回房', roomId);

    // 你現有的進房邏輯（名稱可能不同）
    rejoinRoom(roomId, playerId);
    return;
  }

  // ✅ 正常顯示大廳
  document.getElementById('playerName').textContent = playerName || '玩家';
  refreshRoomList();

  // 定時刷新房間列表
  setInterval(refreshRoomList, 5000);
});

window.addEventListener('beforeunload', () => {
  const roomId = localStorage.getItem(CONFIG.STORAGE_KEYS.roomId);
  const playerId = localStorage.getItem(CONFIG.STORAGE_KEYS.playerId);

  if (roomId && playerId && gameAPI) {
    navigator.sendBeacon(
      gameAPI.baseUrl,
      JSON.stringify({
        action: 'leaveRoom',
        roomId,
        playerId
      })
    );
  }
});

document.getElementById('manualLeaveBtn').addEventListener('click', () => {
  if (!confirm('確定要退出房間狀態嗎？')) return;

  // 清除本地房間資訊
  localStorage.removeItem(CONFIG.STORAGE_KEYS.roomId);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.playerId);

  // 重置 state
  state.roomId = null;
  state.playerId = null;
  state.myVote = null;
  state.phase = null;

  // 停止輪詢
  if (pollTimer) clearInterval(pollTimer);

  // 刷新房間列表
  refreshRoomList();

  alert('已退出房間狀態，可以重新加入房間');
});


async function logout() {
  const roomId = localStorage.getItem(CONFIG.STORAGE_KEYS.roomId);
  const playerId = localStorage.getItem(CONFIG.STORAGE_KEYS.playerId);

  // 如果玩家在房間中，先通知後端離開
  if (roomId && playerId && gameAPI) {
    try {
      await gameAPI.leaveRoom(roomId, playerId);
    } catch (e) {
      console.warn('登出時離開房間失敗（可忽略）', e);
    }
  }

  // 清除本地資料
  localStorage.removeItem(CONFIG.STORAGE_KEYS.playId);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.playerName);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.roomId);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.playerId);

  // 回登入頁
  window.location.href = 'login.html';
}


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
    
  const result = res.data || res;
  
    if (result.error) {
      errorDiv.textContent = result.error;
      errorDiv.classList.add('show');
    } else {
      enterGame(result.roomId, result.playerId);
    }
  } catch (error) {
    console.error('建立房間失敗:', error);
    errorDiv.textContent = '建立房間失敗';
    errorDiv.classList.add('show');
  }
}

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
    
    const result = res.data || res;

    if (result.error) {
      errorDiv.textContent = result.error;
      errorDiv.classList.add('show');
    } else {
      enterGame(roomId, result.playerId);
    }
  } catch (error) {
    console.error('加入房間失敗:', error);
    errorDiv.textContent = '加入房間失敗';
    errorDiv.classList.add('show');
  }
}

async function refreshRoomList() {
  try {
    const res = await gameAPI.listRooms();

    if (!res.success) {
      throw new Error(res.error || '未知錯誤');
    }

    const rooms = res.data;
    if (!Array.isArray(rooms)) throw new Error('回傳不是陣列');

    const roomList = document.getElementById('roomList');
    roomList.innerHTML = '';

    if (rooms.length === 0) {
      roomList.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">目前沒有房間</div>';
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
      `<div style="text-align:center; color:#f00; padding:20px;">刷新房間列表失敗</div>`;
  }
}


function enterGame(roomId, playerId) {
  // ⭐ 關鍵：存起來給重整 / 回房用
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


async function pollRoom() {
  if (!state.roomId || !state.playerId) return;
  
  try {
    const res = await gameAPI.getRoomState(state.roomId, state.playerId);
    const result = res.data || res;
    
    if (result.error) return;
    
    state.phase = result.phase;
    myRole = result.players[state.playerId]?.role || null;
    document.getElementById('myRole').textContent = myRole ? CONFIG.ROLE_NAMES[myRole] || myRole : '?';
    
    // 更新玩家列表
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';
    Object.values(result.players || {}).forEach(p => {
      const div = document.createElement('div');
      div.className = 'player-card';
      div.innerHTML = `
        <img src="${p.avatar || 'https://via.placeholder.com/50'}" class="player-avatar" onerror="this.src='https://via.placeholder.com/50'">
        <div class="player-name">${p.name}</div>
        <div class="player-status ${p.alive ? 'alive' : 'dead'}">
          ${p.alive ? '🟢 存活' : '⚫ 死亡'} ${p.role ? `(${CONFIG.ROLE_NAMES[p.role] || p.role})` : ''}
        </div>
      `;
      playerList.appendChild(div);
    });
    
    // 更新聊天室
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = '';
    (result.chat || []).forEach(msg => {
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
    
    // 檢查是否是房主
    const isHost = result.hostId === state.playerId;
    document.getElementById('hostControlDiv').style.display = isHost ? 'block' : 'none';
    
    // 夜晚行動
    if ((result.phase === 'rolesAssigned' || result.phase === 'night') && result.players[state.playerId]?.alive) {
      document.getElementById('nightActionDiv').style.display = 'block';
      const nightInfo = document.getElementById('nightActionInfo');
      const nightTargets = document.getElementById('nightTargets');
      nightTargets.innerHTML = '';
      
      if (myRole === 'werewolf') {
        nightInfo.textContent = '🐺 狼人：選擇攻擊目標';
        Object.values(result.players).filter(p => p.alive && p.id !== state.playerId).forEach(p => {
          const btn = document.createElement('button');
          btn.className = 'action-btn';
          btn.textContent = `攻擊 ${p.name}`;
          btn.onclick = () => submitNightAction('kill', p.id);
          nightTargets.appendChild(btn);
        });
      } else if (myRole === 'seer') {
        nightInfo.textContent = '🔮 預言家：選擇查驗目標';
        Object.values(result.players).filter(p => p.alive && p.id !== state.playerId).forEach(p => {
          const btn = document.createElement('button');
          btn.className = 'action-btn';
          btn.textContent = `查驗 ${p.name}`;
          btn.onclick = () => submitNightAction('check', p.id);
          nightTargets.appendChild(btn);
        });
      } else if (myRole === 'doctor') {
        nightInfo.textContent = '⚕️ 醫生：選擇守護目標';
        Object.values(result.players).filter(p => p.alive).forEach(p => {
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
      document.getElementById('nightActionDiv').style.display = 'none';
    }
    
    // 投票
    if (result.phase === 'day' && result.players[state.playerId]?.alive) {
      document.getElementById('voteDiv').style.display = 'block';
      const voteTargets = document.getElementById('voteTargets');
      voteTargets.innerHTML = '';
      Object.values(result.players).filter(p => p.alive && p.id !== state.playerId).forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'action-btn';
        btn.textContent = `投票 ${p.name}`;
        btn.style.background = state.myVote === p.id ? '#e74c3c' : '#667eea';
        btn.onclick = () => {
          state.myVote = p.id;
          pollRoom();
        };
        voteTargets.appendChild(btn);
      });
    } else {
      document.getElementById('voteDiv').style.display = 'none';
    }
  } catch (error) {
    console.error('輪詢房間失敗:', error);
  }
}

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

async function leaveRoom() {
  if (!confirm('確定要離開房間嗎？')) return;

  try {
    await gameAPI.leaveRoom(state.roomId, state.playerId);

    // ⭐ 清本地房間狀態
    localStorage.removeItem(CONFIG.STORAGE_KEYS.roomId);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.playerId);

    state = { roomId: null, playerId: null, myVote: null, phase: null };
    clearInterval(pollTimer);

    document.getElementById('gameArea').classList.remove('active');
    document.getElementById('lobbyArea').classList.remove('hidden');

    await refreshRoomList();
  } catch (error) {
    console.error('離開房間失敗:', error);
  }
}

async function rejoinRoom(roomId, playerId) {
  try {
    const res = await gameAPI.getRoomState(roomId, playerId);
    const result = res.data || res;

    // ❌ 房間不存在 / 被踢 / 已結束
    if (result.error) {
      console.warn('回房失敗，自動回大廳:', result.error);
      localStorage.removeItem(CONFIG.STORAGE_KEYS.roomId);
      localStorage.removeItem(CONFIG.STORAGE_KEYS.playerId);
      refreshRoomList();
      return;
    }

    // ✅ 成功回房
    enterGame(roomId, playerId);

  } catch (e) {
    console.error('回房錯誤', e);
  }
}
