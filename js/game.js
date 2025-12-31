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
  
  if (!playId) {
    window.location.href = 'login.html';
    return;
  }
  
  document.getElementById('playerName').textContent = playerName || '玩家';
  refreshRoomList();
  
  // 定時刷新房間列表
  setInterval(refreshRoomList, 5000);
});

function logout() {
  localStorage.removeItem(CONFIG.STORAGE_KEYS.playId);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.playerName);
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

async function refreshRoomList() {
  try {
    const res = await gameAPI.listRooms();
    const roomList = document.getElementById('roomList');
    roomList.innerHTML = '';
    
    if (!res || res.length === 0) {
      roomList.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">目前沒有房間</div>';
      return;
    }
    
    res.forEach(room => {
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
  }
}

function enterGame(roomId, playerId) {
  state.roomId = roomId;
  state.playerId = playerId;
  
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
    
    if (res.error) return;
    
    state.phase = res.phase;
    myRole = res.players[state.playerId]?.role || null;
    document.getElementById('myRole').textContent = myRole ? CONFIG.ROLE_NAMES[myRole] || myRole : '?';
    
    // 更新玩家列表
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';
    Object.values(res.players || {}).forEach(p => {
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
    (res.chat || []).forEach(msg => {
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
    const isHost = res.hostId === state.playerId;
    document.getElementById('hostControlDiv').style.display = isHost ? 'block' : 'none';
    
    // 夜晚行動
    if ((res.phase === 'rolesAssigned' || res.phase === 'night') && res.players[state.playerId]?.alive) {
      document.getElementById('nightActionDiv').style.display = 'block';
      const nightInfo = document.getElementById('nightActionInfo');
      const nightTargets = document.getElementById('nightTargets');
      nightTargets.innerHTML = '';
      
      if (myRole === 'werewolf') {
        nightInfo.textContent = '🐺 狼人：選擇攻擊目標';
        Object.values(res.players).filter(p => p.alive && p.id !== state.playerId).forEach(p => {
          const btn = document.createElement('button');
          btn.className = 'action-btn';
          btn.textContent = `攻擊 ${p.name}`;
          btn.onclick = () => submitNightAction('kill', p.id);
          nightTargets.appendChild(btn);
        });
      } else if (myRole === 'seer') {
        nightInfo.textContent = '🔮 預言家：選擇查驗目標';
        Object.values(res.players).filter(p => p.alive && p.id !== state.playerId).forEach(p => {
          const btn = document.createElement('button');
          btn.className = 'action-btn';
          btn.textContent = `查驗 ${p.name}`;
          btn.onclick = () => submitNightAction('check', p.id);
          nightTargets.appendChild(btn);
        });
      } else if (myRole === 'doctor') {
        nightInfo.textContent = '⚕️ 醫生：選擇守護目標';
        Object.values(res.players).filter(p => p.alive).forEach(p => {
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
    if (res.phase === 'day' && res.players[state.playerId]?.alive) {
      document.getElementById('voteDiv').style.display = 'block';
      const voteTargets = document.getElementById('voteTargets');
      voteTargets.innerHTML = '';
      Object.values(res.players).filter(p => p.alive && p.id !== state.playerId).forEach(p => {
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
    state = { roomId: null, playerId: null, myVote: null, phase: null };
    clearInterval(pollTimer);
    document.getElementById('gameArea').classList.remove('active');
    document.getElementById('lobbyArea').classList.remove('hidden');
    await refreshRoomList();
  } catch (error) {
    console.error('離開房間失敗:', error);
  }
}
