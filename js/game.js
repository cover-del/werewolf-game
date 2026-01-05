
升級

協作

分享
幫我透過後端gas與前端的HTML，生成前端的js
pasted_content.txt
文字 · 30.82 KB
Lite
沒問題，我會根據您提供的後端 GAS 和前端 HTML 代碼，為您生成對應的前端 JavaScript。讓我先查看一下您上傳的文件內容。
目前正分析用戶上傳的後端 GAS 和前端 HTML 代碼，準備生成相應的前端 JavaScript 文件。

已讀取並分析 GAS 代碼，發現主要功能包括房間管理、玩家操作、遊戲流程與資料存取，下一步會整理前端結構並進行轉譯。

Lite
我已經分析了您提供的後端 GAS 代碼。這是一個功能完整的狼人殺遊戲後端，包含：
房間管理：建立、加入、離開房間，以及房間列表。
遊戲邏輯：分配角色、夜晚行動（狼人殺人、預言家查驗、醫生守護）、結算夜晚、投票及結算、勝負判定。
玩家系統：登入、註冊、玩家統計數據（勝率等）。
通訊系統：聊天室功能。
管理功能：後台管理房間。
目前我只有後端代碼，為了生成最精確的前端 JavaScript，我需要了解您的 HTML 結構（例如按鈕的 ID、顯示區域的 Class 等）。如果您有 HTML 代碼，請提供給我；如果沒有，我將根據後端邏輯為您推斷並生成一套通用的前端 JS 代碼。您希望我直接生成嗎？
 HTML在檔案的後半段，生成可以用於GITHUB的js
Lite
收到！我會從檔案後半段提取 HTML 結構，並為您生成一個適合部署在 GitHub Pages（透過 API 呼叫 GAS）的前端 JavaScript 檔案。我現在就去讀取剩餘的內容。
已分析HTML結構，將根據後端API並生成前端script，實現房間建立、加入、遊戲流程與聊天室功能。下一步會進行程式碼組合。

已完成 config.js、api.js、game.js 及 login.js 的生成，涵蓋設定、API調用和遊戲邏輯，準備交付前端整合使用。

完成 login.js 的生成，確認前端驗證與登入流程已整合，下一步將檢查整體前端代碼的一致性與可靠性。

Lite
我已經根據您的後端 GAS 代碼和 HTML 結構，生成了適合部署在 GitHub Pages 的前端 JavaScript 檔案。
檔案說明：
config.js：設定檔。請務必將其中的 API_URL 替換為您發布的 GAS Web App 網址。
api.js：封裝了所有與 GAS 通訊的函數，處理 fetch 請求。
game.js：核心遊戲邏輯，包含房間輪詢、玩家列表渲染、夜晚行動與投票處理。
login.js：處理登入與註冊頁面的邏輯。
部署建議：
CORS 處理：由於 GitHub Pages 與 GAS 網域不同，請確保您的 GAS doPost 函數回傳正確的 ContentService 格式（您的後端代碼已經處理了這一點）。
HTML 引用：請確保您的 HTML 檔案中正確引用了這些 JS 檔案，順序應為：
HTML
<script src="js/config.js"></script>
<script src="js/api.js"></script>
<script src="js/game.js"></script>
<!-- 如果是登入頁面則引用 login.js -->
安全性：目前的 ADMIN_PASSWORD 是寫死在後端的，建議在正式使用時修改。
您可以直接下載附件中的檔案並放入您的 GitHub 專案目錄中。
config.js
程式碼 · 443 B
api.js
程式碼 · 2.74 KB
game.js
程式碼 · 11.19 KB
login.js
程式碼 · 1.04 KB

查看此任務中的所有檔案
任務已完成
這個結果怎麼樣？
建議追問
傳送訊息給 Manus

game.js
/**
 * 狼人殺遊戲 前端核心邏輯
 */

let currentState = {
  playId: localStorage.getItem(CONFIG.STORAGE_KEY.PLAY_ID),
  playerName: localStorage.getItem(CONFIG.STORAGE_KEY.PLAYER_NAME),
  playerId: localStorage.getItem(CONFIG.STORAGE_KEY.PLAYER_ID),
  roomId: localStorage.getItem(CONFIG.STORAGE_KEY.ROOM_ID),
  roomData: null,
  pollTimer: null
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  checkLoginStatus();
});

function initUI() {
  // 綁定按鈕事件
  document.getElementById('createRoomBtn')?.addEventListener('click', handleCreateRoom);
  document.getElementById('joinRoomBtn')?.addEventListener('click', handleJoinRoom);
  document.getElementById('refreshRoomListBtn')?.addEventListener('click', refreshRoomList);
  document.getElementById('leaveRoomBtn')?.addEventListener('click', handleLeaveRoom);
  document.getElementById('sendChatBtn')?.addEventListener('click', handleSendChat);
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
  document.getElementById('playerInfoBtn')?.addEventListener('click', showPlayerInfo);
  document.getElementById('closePlayerInfoBtn')?.addEventListener('click', () => {
    document.getElementById('playerInfoModal').style.display = 'none';
  });
  
  // 聊天室 Enter 送出
  document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendChat();
  });
}

function checkLoginStatus() {
  if (!currentState.playId) {
    // 如果沒有登入資訊，跳轉到登入頁（假設登入邏輯在 login.html）
    // 這裡簡單處理：如果在大廳但沒登入，提示並導向
    if (window.location.pathname.includes('index.html')) {
      alert('請先登入');
      window.location.href = 'login.html';
    }
  } else {
    document.getElementById('playerName').textContent = currentState.playerName;
    if (currentState.roomId) {
      enterRoomUI(currentState.roomId);
    } else {
      enterLobbyUI();
    }
  }
}

// --- 大廳邏輯 ---

async function enterLobbyUI() {
  document.getElementById('lobbyArea').style.display = 'block';
  document.getElementById('gameArea').style.display = 'none';
  refreshRoomList();
}

async function refreshRoomList() {
  const listEl = document.getElementById('roomList');
  try {
    const rooms = await API.listRooms();
    listEl.innerHTML = '';
    if (rooms.length === 0) {
      listEl.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">目前沒有房間</div>';
      return;
    }
    rooms.forEach(room => {
      const div = document.createElement('div');
      div.className = 'room-item'; // 假設 CSS 有定義
      div.style = 'padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;';
      div.innerHTML = `
        <div>
          <strong>房號: ${room.id}</strong> <br>
          <small>房主: ${room.hostName} | 人數: ${room.playerCount}</small>
        </div>
        <button class="btn-success" onclick="handleJoinRoomById('${room.id}')">加入</button>
      `;
      listEl.appendChild(div);
    });
  } catch (err) {
    listEl.innerHTML = '<div style="color: red; padding: 20px;">載入失敗</div>';
  }
}

async function handleCreateRoom() {
  const customId = document.getElementById('customRoomId').value;
  try {
    const result = await API.createRoom(currentState.playId, customId);
    saveRoomSession(result.roomId, result.playerId);
    enterRoomUI(result.roomId);
  } catch (err) {
    document.getElementById('createError').textContent = err.message;
  }
}

async function handleJoinRoom() {
  const roomId = document.getElementById('joinRoomId').value.toUpperCase();
  handleJoinRoomById(roomId);
}

async function handleJoinRoomById(roomId) {
  try {
    const result = await API.joinRoom(roomId, currentState.playId);
    saveRoomSession(roomId, result.playerId);
    enterRoomUI(roomId);
  } catch (err) {
    alert('加入失敗: ' + err.message);
  }
}

// --- 遊戲房間邏輯 ---

function enterRoomUI(roomId) {
  currentState.roomId = roomId;
  document.getElementById('lobbyArea').style.display = 'none';
  document.getElementById('gameArea').style.display = 'block';
  document.getElementById('roomId').textContent = roomId;
  
  startPolling();
}

function saveRoomSession(roomId, playerId) {
  currentState.roomId = roomId;
  currentState.playerId = playerId;
  localStorage.setItem(CONFIG.STORAGE_KEY.ROOM_ID, roomId);
  localStorage.setItem(CONFIG.STORAGE_KEY.PLAYER_ID, playerId);
}

function startPolling() {
  if (currentState.pollTimer) clearInterval(currentState.pollTimer);
  updateRoomState();
  currentState.pollTimer = setInterval(updateRoomState, CONFIG.POLL_INTERVAL_MS);
}

async function updateRoomState() {
  if (!currentState.roomId) return;
  try {
    const data = await API.getRoomState(currentState.roomId, currentState.playerId);
    currentState.roomData = data;
    renderRoom(data);
  } catch (err) {
    console.error('輪詢失敗', err);
    if (err.message.includes('not found')) {
      handleLeaveRoom();
    }
  }
}

function renderRoom(data) {
  // 1. 渲染玩家列表
  const playerListEl = document.getElementById('playerList');
  playerListEl.innerHTML = '';
  
  const players = Object.values(data.players);
  players.forEach(p => {
    const div = document.createElement('div');
    div.className = `player-card ${p.alive ? '' : 'dead'}`;
    div.style = `padding: 10px; border: 1px solid #ddd; border-radius: 8px; text-align: center; background: ${p.id === currentState.playerId ? '#fff9c4' : '#fff'}`;
    div.innerHTML = `
      <div class="avatar">${p.avatar ? `<img src="${p.avatar}" width="40">` : '👤'}</div>
      <div>${p.name} ${p.id === data.hostId ? '👑' : ''}</div>
      <div style="font-size: 12px; color: ${p.alive ? 'green' : 'red'}">${p.alive ? '存活' : '死亡'}</div>
    `;
    playerListEl.appendChild(div);
  });

  // 2. 角色顯示
  const me = data.players[currentState.playerId];
  document.getElementById('myRole').textContent = me?.role || '等待分配';

  // 3. 聊天室
  renderChat(data.chat);

  // 4. 根據階段顯示行動
  const nightDiv = document.getElementById('nightActionDiv');
  const voteDiv = document.getElementById('voteDiv');
  
  nightDiv.style.display = 'none';
  voteDiv.style.display = 'none';

  if (data.phase === 'night' && me?.alive) {
    renderNightActions(data, me);
  } else if (data.phase === 'day' && me?.alive) {
    renderVoteActions(data, me);
  } else if (data.phase === 'lobby' && currentState.playerId === data.hostId) {
    // 房主顯示開始按鈕
    if (players.length >= 4) { // 假設最少 4 人
      const startBtn = document.createElement('button');
      startBtn.className = 'btn-primary';
      startBtn.style = 'width: 100%; margin-top: 10px;';
      startBtn.textContent = '分配角色並開始';
      startBtn.onclick = () => API.assignRoles(data.id, currentState.playerId);
      playerListEl.appendChild(startBtn);
    }
  }
}

function renderChat(chats) {
  const chatBox = document.getElementById('chatBox');
  const isAtBottom = chatBox.scrollHeight - chatBox.scrollTop <= chatBox.clientHeight + 50;
  
  chatBox.innerHTML = chats.map(c => {
    if (c.system) return `<div class="chat-msg system">📢 ${c.text}</div>`;
    return `<div class="chat-msg"><strong>${c.name}:</strong> ${c.text}</div>`;
  }).join('');

  if (isAtBottom) chatBox.scrollTop = chatBox.scrollHeight;
}

function renderNightActions(data, me) {
  const div = document.getElementById('nightActionDiv');
  const info = document.getElementById('nightActionInfo');
  const targets = document.getElementById('nightTargets');
  
  div.style.display = 'block';
  targets.innerHTML = '';

  let actionType = '';
  if (me.role === 'werewolf') {
    info.textContent = '你是狼人，請選擇要殺害的目標：';
    actionType = 'kill';
  } else if (me.role === 'seer') {
    info.textContent = '你是預言家，請選擇要查驗的目標：';
    actionType = 'check';
  } else if (me.role === 'doctor') {
    info.textContent = '你是醫生，請選擇要守護的目標：';
    actionType = 'save';
  } else {
    info.textContent = '天黑請閉眼，等待其他角色行動...';
    return;
  }

  // 房主顯示結算按鈕
  if (currentState.playerId === data.hostId) {
    const resolveBtn = document.createElement('button');
    resolveBtn.className = 'btn-warning';
    resolveBtn.textContent = '結束夜晚';
    resolveBtn.onclick = () => API.resolveNight(data.id, currentState.playerId);
    targets.appendChild(resolveBtn);
  }

  Object.values(data.players).forEach(p => {
    if (p.alive && p.id !== currentState.playerId) {
      const btn = document.createElement('button');
      btn.className = 'btn-outline';
      btn.textContent = p.name;
      btn.onclick = async () => {
        try {
          await API.submitNightAction(data.id, currentState.playerId, { type: actionType, targetId: p.id });
          alert('行動已提交');
        } catch (err) { alert(err.message); }
      };
      targets.appendChild(btn);
    }
  });
}

function renderVoteActions(data, me) {
  const div = document.getElementById('voteDiv');
  const targets = document.getElementById('voteTargets');
  div.style.display = 'block';
  targets.innerHTML = '';

  // 房主顯示結算按鈕
  if (currentState.playerId === data.hostId) {
    const resolveBtn = document.getElementById('submitVoteBtn');
    resolveBtn.textContent = '結算投票結果';
    resolveBtn.onclick = () => API.resolveVotes(data.id, currentState.playerId);
  }

  Object.values(data.players).forEach(p => {
    if (p.alive) {
      const btn = document.createElement('button');
      btn.className = 'btn-outline';
      btn.textContent = p.name;
      btn.onclick = async () => {
        try {
          await API.submitVote(data.id, currentState.playerId, p.id);
          alert('已投票給 ' + p.name);
        } catch (err) { alert(err.message); }
      };
      targets.appendChild(btn);
    }
  });
}

async function handleSendChat() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || !currentState.roomId) return;
  
  try {
    await API.postChat(currentState.roomId, currentState.playerId, text);
    input.value = '';
  } catch (err) { alert('發送失敗'); }
}

async function handleLeaveRoom() {
  if (currentState.roomId) {
    try { await API.leaveRoom(currentState.roomId, currentState.playerId); } catch(e){}
  }
  clearInterval(currentState.pollTimer);
  currentState.roomId = null;
  currentState.playerId = null;
  localStorage.removeItem(CONFIG.STORAGE_KEY.ROOM_ID);
  localStorage.removeItem(CONFIG.STORAGE_KEY.PLAYER_ID);
  enterLobbyUI();
}

async function showPlayerInfo() {
  const modal = document.getElementById('playerInfoModal');
  const content = document.getElementById('playerInfoContent');
  modal.style.display = 'block';
  content.textContent = '載入中...';
  
  try {
    const stats = await API.getPlayerStats(currentState.playId);
    content.innerHTML = `
      <p>名稱: ${stats.name}</p>
      <p>勝場: ${stats.wins}</p>
      <p>敗場: ${stats.losses}</p>
      <p>勝率: ${stats.winRate}%</p>
    `;
  } catch (err) {
    content.textContent = '載入失敗: ' + err.message;
  }
}

function handleLogout() {
  localStorage.clear();
  window.location.href = 'login.html';
}
