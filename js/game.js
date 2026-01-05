/**
 * Werewolf Game - ES2018 SAFE VERSION
 */

var state = {
  roomId: null,
  playerId: null,
  myVote: null,
  phase: null
};
var myRole = null;
var pollTimer = null;
var lobbyTimer = null;
var inGame = false;

/* ================= 初始化 ================= */
document.addEventListener('DOMContentLoaded', function () {
  var playId = localStorage.getItem(CONFIG.STORAGE_KEYS.playId);
  var playerName = localStorage.getItem(CONFIG.STORAGE_KEYS.playerName);
  var roomId = localStorage.getItem(CONFIG.STORAGE_KEYS.roomId);
  var playerId = localStorage.getItem(CONFIG.STORAGE_KEYS.playerId);

  if (!playId) {
    window.location.href = 'login.html';
    return;
  }

  var nameEl = document.getElementById('playerName');
  if (nameEl) nameEl.textContent = playerName || '玩家';

  /* ===== 自動回房（只讀狀態，不 join） ===== */
  if (roomId && playerId) {
    gameAPI.getRoomState(roomId, playerId)
      .then(function (res) {
        var result = res && res.data ? res.data : res;
        if (result && result.id) {
          rejoinRoom(roomId, playerId);
        } else {
          clearLocalRoom();
          startLobby();
        }
      })
      .catch(function () {
        clearLocalRoom();
        startLobby();
      });
  } else {
    startLobby();
  }

  bindEvents();
});

/* ================= Lobby ================= */
function startLobby() {
  inGame = false;
  refreshRoomList();
  lobbyTimer = setInterval(refreshRoomList, 5000);
}

function stopLobby() {
  if (lobbyTimer) {
    clearInterval(lobbyTimer);
    lobbyTimer = null;
  }
}

/* ================= 綁定 ================= */
function bindEvents() {
  bind('logoutBtn', logout);
  bind('createRoomBtn', createRoom);
  bind('joinRoomBtn', joinRoom);
  bind('refreshRoomListBtn', refreshRoomList);
  bind('leaveRoomBtn', leaveRoom);
  bind('sendChatBtn', sendChat);
  bind('submitVoteBtn', submitMyVote);
}

function bind(id, fn) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('click', fn);
}

/* ================= 房間列表 ================= */
var lastRoomIds = [];

function refreshRoomList() {
  if (inGame) return;

  var roomList = document.getElementById('roomList');
  if (!roomList) return;

  if (lastRoomIds.length === 0) {
    roomList.innerHTML = '<div style="text-align:center;color:#999;">載入中...</div>';
  }

  gameAPI.listRooms().then(function (res) {
    var data = res && res.data ? res.data : {};
    var rooms = [];
    var ids = [];

    for (var k in data) {
      rooms.push(data[k]);
      ids.push(data[k].id);
    }

    if (JSON.stringify(ids) === JSON.stringify(lastRoomIds)) return;
    lastRoomIds = ids;

    roomList.innerHTML = '';
    if (rooms.length === 0) {
      roomList.innerHTML = '<div style="text-align:center;color:#999;">目前沒有房間</div>';
      return;
    }

    rooms.forEach(function (room) {
      var div = document.createElement('div');
      div.className = 'room-item';
      div.innerHTML =
        '<div class="room-info">' +
        '<div class="room-id">房號: ' + room.id + '</div>' +
        '<div class="room-detail">玩家: ' + count(room.players) + '</div>' +
        '</div>' +
        '<button class="room-join-btn">加入</button>';

      div.querySelector('button').onclick = function () {
        document.getElementById('joinRoomId').value = room.id;
        joinRoom();
      };
      roomList.appendChild(div);
    });
  });
}

function count(obj) {
  if (!obj) return 0;
  var c = 0;
  for (var k in obj) c++;
  return c;
}

/* ================= 建立 / 加入 ================= */
function createRoom() {
  var playId = localStorage.getItem(CONFIG.STORAGE_KEYS.playId);
  gameAPI.createRoom(playId).then(function (res) {
    var r = res && res.data ? res.data : res;
    enterGame(r.roomId, r.playerId);
  });
}

function joinRoom() {
  var roomId = document.getElementById('joinRoomId').value.trim().toUpperCase();
  if (!roomId) return;
  var playId = localStorage.getItem(CONFIG.STORAGE_KEYS.playId);

  gameAPI.joinRoom(roomId, playId).then(function (res) {
    var r = res && res.data ? res.data : res;
    enterGame(roomId, r.playerId);
  });
}

/* ================= 進入遊戲 ================= */
function enterGame(roomId, playerId) {
  stopLobby();
  inGame = true;

  state.roomId = roomId;
  state.playerId = playerId;
  localStorage.setItem(CONFIG.STORAGE_KEYS.roomId, roomId);
  localStorage.setItem(CONFIG.STORAGE_KEYS.playerId, playerId);

  document.getElementById('lobbyArea').classList.add('hidden');
  document.getElementById('gameArea').classList.add('active');
  document.getElementById('roomId').textContent = roomId;

  pollRoom();
  pollTimer = setInterval(pollRoom, CONFIG.POLL_INTERVAL_MS);
}

/* ================= 回房 ================= */
function rejoinRoom(roomId, playerId) {
  stopLobby();
  inGame = true;

  state.roomId = roomId;
  state.playerId = playerId;

  document.getElementById('lobbyArea').classList.add('hidden');
  document.getElementById('gameArea').classList.add('active');
  document.getElementById('roomId').textContent = roomId;

  pollRoom();
  pollTimer = setInterval(pollRoom, CONFIG.POLL_INTERVAL_MS);
}

/* ================= 核心輪詢 ================= */
function pollRoom() {
  if (!state.roomId || !state.playerId) return;

  gameAPI.getRoomState(state.roomId, state.playerId).then(function (res) {
    var result = res && res.data ? res.data : res;
    if (!result || !result.id) return;

    updatePlayerList(result.players || {});
  });
}

/* ================= 顯示 ================= */
function updatePlayerList(players) {
  var list = document.getElementById('playerList');
  if (!list) return;
  list.innerHTML = '';

  for (var id in players) {
    var p = players[id];
    var div = document.createElement('div');
    div.className = 'player-card';
    div.textContent = p.name + (p.alive ? ' 🟢' : ' ⚫');
    list.appendChild(div);
  }
}

/* ================= 其他 ================= */
function clearLocalRoom() {
  localStorage.removeItem(CONFIG.STORAGE_KEYS.roomId);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.playerId);
}

function leaveRoom() {
  gameAPI.leaveRoom(state.roomId, state.playerId);
  clearLocalRoom();
  location.reload();
}

function sendChat() {}
function submitMyVote() {}

function logout() {
  localStorage.clear();
  location.href = 'login.html';
}
