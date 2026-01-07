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
let resolvingDay = false;

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
// ================= 夜晚 / 投票 UI =================
// ================= 夜晚操作封裝 =================
async function submitNightKill(targetId) {
  if (!state.roomId || !state.playerId || !targetId) return;
  try {
    await gameAPI.submitNightAction(
      state.roomId,
      state.playerId,
      { type: 'kill', targetId }
    );
  } catch (e) {
    console.error('submitNightKill 失敗', e);
    alert('夜晚行動失敗: ' + e.message);
  }
}

async function submitNightCheck(targetId) {
  if (!state.roomId || !state.playerId || !targetId) return;
  try {
    await gameAPI.submitNightAction(
      state.roomId,
      state.playerId,
      { type: 'check', targetId }
    );
  } catch (e) {
    console.error('submitNightCheck 失敗', e);
    alert('夜晚行動失敗: ' + e.message);
  }
}

async function submitNightSave(targetId) {
  if (!state.roomId || !state.playerId || !targetId) return;
  try {
    await gameAPI.submitNightAction(
      state.roomId,
      state.playerId,
      { type: 'save', targetId }
    );
  } catch (e) {
    console.error('submitNightSave 失敗', e);
    alert('夜晚行動失敗: ' + e.message);
  }
}



// ================= 顯示夜晚 UI =================
function showNightUI() {
  const nightDiv = document.getElementById('nightActionDiv');
  const voteDiv = document.getElementById('voteDiv');
  nightDiv.style.display = 'block';
  voteDiv.style.display = 'none';

  const nightActionArea = document.getElementById('nightActionArea');
  nightActionArea.innerHTML = '';

  const me = state.latestPlayers[state.playerId];
  if (!me || !me.alive || !myRole) {
    nightActionArea.innerHTML = '<p>等待夜晚結束...</p>';
    return;
  }

  const players = Object.values(state.latestPlayers).filter(p => p.alive && p.id !== state.playerId);
  if (players.length === 0) {
    nightActionArea.innerHTML = '<p>沒有其他玩家</p>';
    return;
  }

  // 清除舊按鈕，重新生成
  nightActionArea.innerHTML = '';
  let titleText = '';

  if (myRole === 'werewolf') {
    titleText = '選擇殺人目標:';
  } else if (myRole === 'seer') {
    titleText = '選擇查驗目標:';
  } else if (myRole === 'doctor') {
    titleText = '選擇守護目標:';
  } else {
    nightActionArea.innerHTML = '<p>等待夜晚結束...</p>';
    return;
  }

  nightActionArea.innerHTML = `<p>${titleText}</p>`;

  players.forEach(p => {
    const btn = document.createElement('button');
    btn.textContent = p.name;

    btn.onclick = async () => {
      if (!state.roomId || !state.playerId) return;
      try {
        if (myRole === 'werewolf') await submitNightKill(p.id);
        else if (myRole === 'seer') await submitNightCheck(p.id);
        else if (myRole === 'doctor') await submitNightSave(p.id);
      } catch (e) {
        alert('夜晚行動失敗: ' + e.message);
      }
    };

    nightActionArea.appendChild(btn);
  });
}



function showDayUI() {
  const nightDiv = document.getElementById('nightActionDiv');
  const voteDiv = document.getElementById('voteDiv');
  nightDiv.style.display = 'none';
  voteDiv.style.display = 'block';

  const voteArea = document.getElementById('voteArea');
  voteArea.innerHTML = '';

  const me = state.latestPlayers[state.playerId];
  if (!me || !me.alive) {
    voteArea.innerHTML = '<p>你已死亡，無法投票</p>';
    return;
  }

  if (me.hasVoted) {
    voteArea.innerHTML = '<p>你已投票，請等待其他玩家</p>';
    return;
  }

  const players = Object.values(state.latestPlayers)
    .filter(p => p.alive && p.id !== state.playerId);

  if (players.length === 0) {
    voteArea.innerHTML = '<p>無人可投票</p>';
    return;
  }

  voteArea.innerHTML = '<p>投票選擇要處決的玩家:</p>';

  players.forEach(p => {
    const btn = document.createElement('button');
    btn.textContent = p.name;
    btn.onclick = async () => {
      await submitMyVote(p.id);
    };
    voteArea.appendChild(btn);
  });
}


function showEndUI(winner, players) {
  clearInterval(pollTimer);
  pollTimer = null;

  const endDiv = document.getElementById('endGameDiv');
  if (endDiv) {
    endDiv.style.display = 'block';
    let html = `<p>遊戲結束！勝利方: ${winner === 'villagers' ? '村民' : '狼人'}</p>`;
    html += '<ul>';
    Object.values(players).forEach(p => {
      html += `<li>${p.name} (${CONFIG.ROLE_NAMES[p.role] || p.role}) - ${p.alive ? '存活' : '死亡'}</li>`;
    });
    html += '</ul>';
    endDiv.innerHTML = html;
  } else {
    alert(`遊戲結束！勝利方: ${winner === 'villagers' ? '村民' : '狼人'}`);
  }
}

function ensureStartButton() {
  let startBtn = document.getElementById('startGameBtn');
  const container = document.querySelector('.game-area .card');
  if (!container) return console.warn('.game-area .card 不存在');

  if (!startBtn) {
    startBtn = document.createElement('button');
    startBtn.id = 'startGameBtn';
    startBtn.textContent = '開始遊戲';
    startBtn.className = 'btn-primary';
    container.prepend(startBtn);
  }

  const me = state.latestPlayers[state.playerId];
  if (me?.isHost) {
    startBtn.style.display = 'inline-block';
    startBtn.style.opacity = 1;
    startBtn.style.pointerEvents = 'auto';
    startBtn.title = '點擊開始遊戲（後端會檢查玩家數）';
  } else {
    startBtn.style.display = 'none';
    return;
  }

  startBtn.onclick = async () => {
    try {
      const result = await gameAPI.assignRoles(state.roomId, state.playerId);
      if (result?.error) {
        alert('無法開始遊戲: ' + result.error);
        console.warn('assignRoles error:', result.error);
      }
    } catch (e) {
      console.error('開始遊戲失敗', e);
    }
  };
}

function ensureResolveNightButton() {
  let nightBtn = document.getElementById('resolveNightBtn');
  if (!nightBtn) return console.warn('#resolveNightBtn 不存在');

  const me = state.latestPlayers[state.playerId];

  // 永遠顯示
  nightBtn.style.display = 'inline-block';
  nightBtn.disabled = false;
  nightBtn.textContent = '結束夜晚';
  nightBtn.title = '點擊結束夜晚（只有房主有效）';

  nightBtn.onclick = async () => {
    if (!me?.isHost) {
      alert('只有房主可以結束夜晚');
      return;
    }

    nightBtn.disabled = true;
    nightBtn.textContent = '結算中...';
    try {
      await resolveNight();
    } catch (e) {
      console.error('resolveNight 失敗', e);
      alert('夜晚結算失敗：' + e.message);
    } finally {
      nightBtn.disabled = false;
      nightBtn.textContent = '結束夜晚';
    }
  };
}



async function pollRoom() {
  if (!state.roomId || !state.playerId) return;

  try {
    const res = await gameAPI.getRoomState(state.roomId, state.playerId);
    const result = res?.data || res;

    if (!result || !result.id) {
      console.warn('房間暫時不存在，稍後重試', state.roomId);
      return;
    }

    state.latestPlayers = result.players || {};
    const me = state.latestPlayers[state.playerId] || null;
    myRole = me?.role || null;
    document.getElementById('myRole').textContent = myRole ? CONFIG.ROLE_NAMES[myRole] || '?' : '?';

    // ✅ 只在第一次打印玩家列表
    if (!state._playersLogged) {
      console.log('房間玩家列表:', state.latestPlayers);
      state._playersLogged = true;
    }

    updatePlayerList(state.latestPlayers);
    updateChat(result.chat || []);

    // 房主開始遊戲按鈕
    ensureStartButton();

    // 更新遊戲階段 UI
    const phase = result.phase;
    state.phase = phase; // 更新全域階段
    if (phase === 'rolesAssigned' || phase === 'night') {
      resolvingDay = false; // ⭐ 重置白天結算旗標
      showNightUI();
      ensureResolveNightButton(); // ⭐ 新增：房主夜晚按鈕
    } 

    else if (phase === 'day') {
     showDayUI();
   
     const me = state.latestPlayers[state.playerId];
     const alivePlayers = Object.values(state.latestPlayers).filter(p => p.alive);
     const allVoted = alivePlayers.every(p => p.hasVoted);
   
     if (allVoted && me?.isHost && !resolvingDay) {
       resolvingDay = true;
       await resolveVotes();
     }
   } 

    else if (phase === 'ended') {
      showEndUI(result.winner, state.latestPlayers);
      clearInterval(pollTimer);
    }

  } catch (e) {
    console.error('pollRoom 失敗', e);
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
// 預設頭像陣列（可以放多個，沒上傳頭像時隨機選）
const DEFAULT_AVATARS = ['img/roles/像素1.png'];

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
    // 房主標記
    const hostMark = p.isHost ? ' 🏠' : '';
    
    // 投票標記
    const votedMark = p.hasVoted ? ' 🗳️' : '';

    // 玩家自己角色圖示，只顯示自己知道的
    const roleIcon = (p.id === state.playerId && p.role && roleImages[p.role])
      ? `<img src="${roleImages[p.role]}" class="role-icon" style="width:24px;height:24px;">`
      : '';

    // 預設頭像
    const avatar = p.avatar || DEFAULT_AVATARS[p.id.charCodeAt(0) % DEFAULT_AVATARS.length];

    const div = document.createElement('div');
    div.className = 'player-card';
    div.innerHTML = `
      <img src="${avatar}" class="player-avatar">
      <div class="player-info-wrapper" style="display:flex;gap:8px;align-items:center;">
        <div>${p.name}${hostMark}${votedMark}</div>${roleIcon}
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

// ================= 夜晚 / 投票 / 角色 =================
async function submitNightAction(type, targetId) { await gameAPI.submitNightAction(state.roomId, state.playerId, { type, targetId }); }
async function submitMyVote(targetId) {
  try {
    await gameAPI.submitVote(state.roomId, state.playerId, targetId);
  } catch (e) {
    alert('投票失敗');
    console.error(e);
  }
}

async function assignRoles() { await gameAPI.assignRoles(state.roomId, state.playerId); }
async function resolveNight() { try { await gameAPI.resolveNight(state.roomId, state.playerId); } catch(e){} }
async function resolveVotes() { try { await gameAPI.resolveVotes(state.roomId, state.playerId); } catch(e){} }
async function sendChat() { const input=document.getElementById('chatInput'); if (!input.value.trim()) return; await gameAPI.postChat(state.roomId, state.playerId, input.value.trim()); input.value=''; }
async function leaveRoom() { await gameAPI.leaveRoom(state.roomId, state.playerId); localStorage.removeItem(CONFIG.STORAGE_KEYS.roomId); localStorage.removeItem(CONFIG.STORAGE_KEYS.playerId); clearInterval(pollTimer); location.reload(); }

// ================= 頭像 =================



// ================= 頭像上傳 =================

// ===== 上傳頭像 =====
// ===== 上傳頭像 (帶提示版) =====
async function uploadAvatarFile(file) {
  const reader = new FileReader();

  reader.onload = async function(e) {
    const dataUrl = e.target.result;
    // 顯示讀取完成提示
    document.getElementById('uploadStatus').textContent = '📤 上傳中...';

    try {
      // 發送 POST 到 GAS Web App
      const res = await fetch(GS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'uploadAvatar',
          dataUrl: dataUrl,
          filename: file.name
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await res.json();

      if (result.success && result.data.url) {
        // 成功顯示新頭像
        document.getElementById('myAvatarImg').src = result.data.url;
        document.getElementById('uploadStatus').textContent = '✅ 上傳完成';
        alert('頭像已更新！');
      } else {
        console.error('頭像上傳失敗', result);
        document.getElementById('uploadStatus').textContent = '❌ 上傳失敗';
        alert('上傳失敗：' + (result.error || '未知錯誤'));
      }

    } catch(err) {
      console.error('uploadAvatar 錯誤', err);
      document.getElementById('uploadStatus').textContent = '❌ 上傳錯誤';
      alert('上傳出現錯誤：' + err.message);
    }
  };

  reader.onerror = () => {
    document.getElementById('uploadStatus').textContent = '❌ 讀取失敗';
    alert('讀取檔案失敗');
  };

  reader.readAsDataURL(file);
}

/**
 * 選擇檔案並觸發上傳
 */
function changeMyAvatar() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.onchange = function () {
    const file = input.files[0];
    if (!file) return;

    // 顯示讀取提示
    document.getElementById('uploadStatus').textContent = '📖 讀取檔案中...';

    // 呼叫 uploadAvatarFile 處理
    uploadAvatarFile(file);
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
