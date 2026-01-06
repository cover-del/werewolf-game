/**
 * 狼人殺遊戲 - 主遊戲邏輯（整理版 ES2018 Safe）
 */
console.log('game.js start');

let state = {
  roomId: null,
  playerId: null,
  myVote: null,
  phase: null
};
let myRole = null;
let pollTimer = null;
let inRoom = false;
let roomFailCount = 0;

// ================= 初始化 =================
// ================= 初始化 =================
document.addEventListener('DOMContentLoaded', async function () {
  const playId = localStorage.getItem(CONFIG.STORAGE_KEYS.playId);
  const playerName = localStorage.getItem(CONFIG.STORAGE_KEYS.playerName);
  const roomId = localStorage.getItem(CONFIG.STORAGE_KEYS.roomId);
  const playerId = localStorage.getItem(CONFIG.STORAGE_KEYS.playerId);

  if (!playId) return window.location.href = 'login.html';

  document.getElementById('playerName').textContent = playerName || '玩家';

  // ===== 嘗試自動回房 =====
  if (roomId && playerId) {
    try {
      const res = await gameAPI.getRoomState(roomId, playerId);
      const result = res?.data || res;
      if (result && result.id) {
        // 房間存在，自動回房
        await rejoinRoom(roomId, playerId);
      } else {
        // 房間不存在
        localStorage.removeItem(CONFIG.STORAGE_KEYS.roomId);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.playerId);
      }
    } catch {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.roomId);
      localStorage.removeItem(CONFIG.STORAGE_KEYS.playerId);
    }
  }

  // ===== 定時刷新房間列表 =====
  refreshRoomList();
  setInterval(refreshRoomList, 5000);
  // -------------------- 綁定事件 --------------------
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
  document.getElementById('createRoomBtn')?.addEventListener('click', createRoom);
  document.getElementById('joinRoomBtn')?.addEventListener('click', joinRoom);
  document.getElementById('refreshRoomListBtn')?.addEventListener('click', refreshRoomList);
  document.getElementById('leaveRoomBtn')?.addEventListener('click', leaveRoom);
  document.getElementById('sendChatBtn')?.addEventListener('click', sendChat);
  document.getElementById('submitVoteBtn')?.addEventListener('click', submitMyVote);

  document.getElementById('playerInfoBtn')?.addEventListener('click', async function () {
    const modal = document.getElementById('playerInfoModal');
    const content = document.getElementById('playerInfoContent');
    content.textContent = '載入中...';
    try {
      const res = await gameAPI.getPlayerStats(playId);
      const data = res?.data || res || {};
      content.innerHTML = `
        <p><strong>Play ID:</strong> ${data.playId || '-'}</p>
        <p><strong>名字:</strong> ${data.name || '-'}</p>
        <p><strong>勝場:</strong> ${data.wins || 0}</p>
        <p><strong>敗場:</strong> ${data.losses || 0}</p>
        <p><strong>勝率:</strong> ${data.winRate || 0}%</p>
      `;
    } catch {
      content.textContent = '載入玩家資訊失敗';
    }
    modal.style.display = 'flex';
  });

  document.getElementById('closePlayerInfoBtn')?.addEventListener('click', closePlayerInfo);
  document.getElementById('lobbyChangeAvatarBtn')?.addEventListener('click', changeMyAvatar);
});

// ================= 共用函式 =================
function closePlayerInfo() {
  document.getElementById('playerInfoModal').style.display = 'none';
}

window.addEventListener('beforeunload', function () {
  if (state.roomId && state.playerId) {
    leaveRoomSafe(); // ⭐ 統一用 leaveRoomSafe 處理，安全清理
  }
});


// ================= 房間相關 =================
async function createRoom() {
  const customRoomId = document.getElementById('customRoomId').value.trim().toUpperCase();
  const errorDiv = document.getElementById('createError');
  errorDiv.textContent = '';

  try {
    const res = await gameAPI.createRoom(localStorage.getItem(CONFIG.STORAGE_KEYS.playId), '', customRoomId || undefined);
    const result = res?.data || res;
    if (result.error) errorDiv.textContent = result.error;
    else enterGame(result.roomId.toUpperCase(), result.playerId);
  } catch {
    errorDiv.textContent = '建立房間失敗';
  }
}

async function joinRoom() {
  const roomId = document.getElementById('joinRoomId').value.trim().toUpperCase();
  const errorDiv = document.getElementById('joinError');
  errorDiv.textContent = '';
  if (!roomId) return errorDiv.textContent = '請輸入房號';

  try {
    const res = await gameAPI.joinRoom(roomId, localStorage.getItem(CONFIG.STORAGE_KEYS.playId), '');
    const result = res?.data || res;
    if (result.error) errorDiv.textContent = result.error;
    else enterGame(roomId, result.playerId);
  } catch {
    errorDiv.textContent = '加入房間失敗';
  }
}

let lastRoomIds = []; // 記錄上一次房間 ID

async function refreshRoomList() {
  const roomList = document.getElementById('roomList');

  // 如果第一次載入，顯示載入中
  if (lastRoomIds.length === 0) {
    roomList.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">載入中...</div>';
  }

  try {
    const res = await gameAPI.listRooms();
    const rooms = Object.values(res?.data || {});
    const newRoomIds = rooms.map(r => r.id);

    // 房間列表沒變就不用更新
    if (JSON.stringify(lastRoomIds) === JSON.stringify(newRoomIds)) return;
    lastRoomIds = newRoomIds;

    roomList.innerHTML = '';
    if (rooms.length === 0) {
      roomList.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">目前沒有房間</div>';
      return;
    }

    // 建立房間 DOM
    rooms.forEach(room => {
      const div = document.createElement('div');
      div.className = 'room-item';
      div.innerHTML = `
        <div class="room-info">
          <div class="room-id">房號: ${room.id}</div>
          <div class="room-detail">房主: ${room.hostName || '-'} | 玩家: ${Object.keys(room.players || {}).length}</div>
        </div>
        <button class="room-join-btn" onclick="document.getElementById('joinRoomId').value='${room.id}'; joinRoom();">加入</button>
      `;
      roomList.appendChild(div);
    });
  } catch {
    roomList.innerHTML = '<div style="text-align:center;color:red;padding:20px;">刷新房間列表失敗</div>';
  }
}

async function waitRoomExist(roomId, playerId) {
  try {
    const res = await gameAPI.getRoomState(roomId, playerId);
    const result = res?.data || res; // ✅ 同一件事

    if (result?.id) return true;
  } catch {}
  return false;
}


async function enterGame(roomId, playerId) {
    roomId = roomId.toUpperCase(); // ⭐ 唯一一次統一大寫
    localStorage.setItem(CONFIG.STORAGE_KEYS.roomId, roomId);
    state.roomId = roomId;
    localStorage.setItem(CONFIG.STORAGE_KEYS.playerId, playerId);
    state.roomId = roomId;
    state.playerId = playerId;
    state.myVote = null;
    inRoom = true;

    document.getElementById('lobbyArea')?.classList.add('hidden');
    document.getElementById('gameArea')?.classList.add('active');
    document.getElementById('roomId').textContent = roomId;

    clearInterval(pollTimer);

    // ⭐ 等房間生成完成
    const roomExists = await waitRoomExist(roomId, playerId);
    if (!roomExists) {
        console.warn('房間尚未生成 → 回大廳');
        leaveRoomSafe();
        return;
    }

    pollTimer = setInterval(pollRoom, CONFIG.POLL_INTERVAL_MS);
    pollRoom();
}
// ================= 核心輪詢 =================
async function pollRoom() {
  if (!state.roomId || !state.playerId) return;

  try {
    const res = await gameAPI.getRoomState(state.roomId, state.playerId);
    const result = res?.data || res; // ✅ 就是你問的這行

    if (!result || !result.id) {
      console.warn('房間暫時不存在，稍後重試', state.roomId);
      return;
    }

    const players = result.players || {};
    const me = players[state.playerId] || null;
    myRole = me?.role || null;
    document.getElementById('myRole').textContent = myRole ? CONFIG.ROLE_NAMES[myRole] || '?' : '?';

    updatePlayerList(players);
    updateChat(result.chat || []);

    // 更新遊戲階段 UI
    const phase = result.phase;
    if (phase === 'rolesAssigned' || phase === 'night') showNightUI();
    if (phase === 'day') {
      showDayUI();
      if (Object.values(players).every(p => !p.alive || p.hasVoted)) await resolveVotes();
    }
    if (phase === 'ended') {
      showEndUI(result.winner, players);
      clearInterval(pollTimer);
    }

  } catch (e) {
    console.error('pollRoom 失敗', e);
    // 不要直接踢回大廳
  }
}


// 安全離開房間（不會因為輪詢錯誤被回大廳）
async function leaveRoomSafe() {
  // 只有房間存在才呼叫 API
  if (state.roomId && state.playerId) {
    try {
      await gameAPI.leaveRoom(state.roomId, state.playerId);
    } catch (e) {
      // 房間已不存在時忽略錯誤
      console.warn('leaveRoomSafe 忽略錯誤:', e.message);
    }
  }

  pollTimer && clearInterval(pollTimer);
  pollTimer = null;
  inRoom = false;
  state.roomId = null;
  state.playerId = null;
  state.myVote = null;
  
  localStorage.removeItem(CONFIG.STORAGE_KEYS.roomId);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.playerId);
  
  document.getElementById('lobbyArea')?.classList.remove('hidden');
  document.getElementById('gameArea')?.classList.remove('active');
}  // ✅ 這個大括號是你缺少的


// ================= 顯示 =================
function updatePlayerList(players) {
  const playerList = document.getElementById('playerList');
  playerList.innerHTML = '';
  const roleImages = { werewolf:'img/roles/werewolf.png', seer:'img/roles/seer.png', doctor:'img/roles/doctor.png', villager:'img/roles/villager.png' };
  Object.values(players).forEach(p => {
    const roleIcon = (p.id === state.playerId && p.role && roleImages[p.role]) ? `<img src="${roleImages[p.role]}" class="role-icon" style="width:24px;height:24px;">` : '';
    const div = document.createElement('div');
    div.className = 'player-card';
    div.innerHTML = `
      <img src="${p.avatar || 'https://via.placeholder.com/50'}" class="player-avatar">
      <div class="player-info-wrapper" style="display:flex;gap:8px;">
        <div>${p.name}</div>${roleIcon}
      </div>
      <div>${p.alive ? '🟢 存活' : '⚫ 死亡'}</div>
    `;
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
async function submitNightAction(type, targetId) { await gameAPI.submitNightAction(state.roomId, state.playerId, { type, targetId }); }
async function submitMyVote() { if (!state.myVote) return alert('請選擇投票對象'); await gameAPI.submitVote(state.roomId, state.playerId, state.myVote); }
async function assignRoles() { await gameAPI.assignRoles(state.roomId, state.playerId); }
async function resolveNight() { try { await gameAPI.resolveNight(state.roomId, state.playerId); } catch(e){} }
async function resolveVotes() { try { await gameAPI.resolveVotes(state.roomId, state.playerId); } catch(e){} }
async function sendChat() { const input=document.getElementById('chatInput'); if (!input.value.trim()) return; await gameAPI.postChat(state.roomId, state.playerId, input.value.trim()); input.value=''; }
async function leaveRoom() { await gameAPI.leaveRoom(state.roomId, state.playerId); localStorage.removeItem(CONFIG.STORAGE_KEYS.roomId); localStorage.removeItem(CONFIG.STORAGE_KEYS.playerId); clearInterval(pollTimer); location.reload(); }

// ================= 頭像 =================



// ================= 頭像上傳 =================

// ===== 上傳頭像 =====
async function uploadAvatar(dataUrl, filename) {
  try {
    const res = await fetch(CONFIG.GS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'uploadAvatar', dataUrl, filename })
    });

    const json = await res.json();

    if (!json.success || !json.data?.url) {
      throw new Error(json.error || '上傳失敗');
    }

    return { success: true, url: json.data.url };

  } catch (e) {
    console.error('uploadAvatar 錯誤', e);
    return { success: false, error: e.message };
  }
}

/**
 * 選擇檔案並上傳
 */
function changeMyAvatar() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.onchange = async function () {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadstart = () => document.getElementById('uploadStatus').textContent = '讀取檔案中...';

    reader.onload = async function () {
      document.getElementById('uploadStatus').textContent = '上傳中...';

      const res = await uploadAvatar(reader.result, file.name);
      if (res.success && res.url) {
        document.getElementById('myAvatarImg').src = res.url;
        document.getElementById('uploadStatus').textContent = '上傳完成';
        alert('✅ 頭像已更新');
      } else {
        console.warn('頭像上傳失敗', res);
        document.getElementById('uploadStatus').textContent = '上傳失敗';
        alert('❌ 上傳失敗：' + res.error);
      }
    };

    reader.onerror = () => {
      document.getElementById('uploadStatus').textContent = '讀取失敗';
      alert('❌ 讀取檔案失敗');
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
        const roomExists = await waitRoomExist(roomId, playerId);
        if (!roomExists) {
            console.warn('房間已關閉或不存在，回大廳');
            leaveRoomSafe();
            return;
        }

        state.roomId = roomId;
        state.playerId = playerId;
        state.myVote = null;

        document.getElementById('lobbyArea')?.classList.add('hidden');
        document.getElementById('gameArea')?.classList.add('active');
        document.getElementById('roomId').textContent = roomId;

        clearInterval(pollTimer);
        pollTimer = setInterval(pollRoom, CONFIG.POLL_INTERVAL_MS);
        await pollRoom();
    } catch {
        console.warn('無法回房 → 回大廳');
        leaveRoomSafe();
    }
};

console.log('game.js end');
