/**
 * 狼人殺遊戲 - 管理員頁面邏輯
 */

let isLoggedIn = false;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('adminPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginAdmin();
  });
});

async function loginAdmin() {
  const password = document.getElementById('adminPassword').value.trim();
  const errorDiv = document.getElementById('loginError');
  errorDiv.textContent = '';
  errorDiv.classList.remove('show');
  
  if (!password) {
    errorDiv.textContent = '請輸入密碼';
    errorDiv.classList.add('show');
    return;
  }
  
  try {
    const res = await gameAPI.adminLogin(password);
    
    if (res.error) {
      errorDiv.textContent = res.error;
      errorDiv.classList.add('show');
    } else {
      isLoggedIn = true;
      document.getElementById('loginArea').style.display = 'none';
      document.getElementById('adminPanel').classList.add('active');
      document.getElementById('adminPassword').value = '';
      await refreshRooms();
      // 定時刷新
      setInterval(refreshRooms, 5000);
    }
  } catch (error) {
    console.error('登入失敗:', error);
    errorDiv.textContent = '登入失敗';
    errorDiv.classList.add('show');
  }
}

function logoutAdmin() {
  isLoggedIn = false;
  document.getElementById('adminPanel').classList.remove('active');
  document.getElementById('loginArea').style.display = 'block';
  document.getElementById('adminPassword').value = '';
}

async function refreshRooms() {
  if (!isLoggedIn) return;
  
  try {
    const res = await gameAPI.adminListRooms(CONFIG.ADMIN_PASSWORD);
    const roomList = document.getElementById('roomList');
    roomList.innerHTML = '';
    
    let totalPlayers = 0;
    let inactiveCount = 0;
    
    if (!res || res.length === 0) {
      roomList.innerHTML = '<div class="empty-message">目前沒有房間</div>';
      document.getElementById('totalRooms').textContent = '0';
      document.getElementById('totalPlayers').textContent = '0';
      document.getElementById('inactiveRooms').textContent = '0';
      return;
    }
    
    res.forEach(room => {
      totalPlayers += room.playerCount;
      if (room.inactive) inactiveCount++;
      
      const div = document.createElement('div');
      div.className = 'room-item';
      
      const lastActiveDate = new Date(room.lastActive);
      const lastActiveStr = lastActiveDate.toLocaleString('zh-TW');
      
      let warningHtml = '';
      if (room.inactive) {
        warningHtml = '<div class="room-warning">⚠️ 超過 60 分鐘無活動</div>';
      }
      
      div.innerHTML = `
        <div class="room-info">
          <div class="room-id">房號: ${room.id}</div>
          <div class="room-detail">房主: ${room.hostName} | 玩家: ${room.playerCount}</div>
          <div class="room-detail">最後活動: ${lastActiveStr}</div>
          ${warningHtml}
        </div>
        <button class="room-delete-btn" onclick="deleteRoom('${room.id}')">刪除</button>
      `;
      roomList.appendChild(div);
    });
    
    document.getElementById('totalRooms').textContent = res.length;
    document.getElementById('totalPlayers').textContent = totalPlayers;
    document.getElementById('inactiveRooms').textContent = inactiveCount;
  } catch (error) {
    console.error('刷新房間列表失敗:', error);
  }
}

async function deleteRoom(roomId) {
  if (!confirm(`確定要刪除房間 ${roomId} 嗎？`)) return;
  
  try {
    const res = await gameAPI.adminDeleteRoom(roomId);
    
    if (res.error) {
      alert('刪除失敗: ' + res.error);
    } else {
      alert(res.message || '房間已刪除');
      await refreshRooms();
    }
  } catch (error) {
    console.error('刪除房間失敗:', error);
    alert('刪除失敗');
  }
}

async function deleteAllRooms() {
  if (!confirm('確定要刪除所有房間嗎？此操作無法復原！')) return;
  if (!confirm('再次確認：刪除所有房間？')) return;
  
  try {
    const res = await gameAPI.adminDeleteAllRooms();
    
    if (res.error) {
      alert('刪除失敗: ' + res.error);
    } else {
      alert(res.message || '所有房間已刪除');
      await refreshRooms();
    }
  } catch (error) {
    console.error('刪除所有房間失敗:', error);
    alert('刪除失敗');
  }
}
