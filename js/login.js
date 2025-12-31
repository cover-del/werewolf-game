/**
 * 狼人殺遊戲 - 登入頁面邏輯
 */

let isLogin = true;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('toggleBtn').addEventListener('click', toggleForm);
  document.getElementById('toggleLink').addEventListener('click', toggleForm);
  document.getElementById('submitBtn').addEventListener('click', handleSubmit);
  document.getElementById('password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSubmit();
  });
  
  // 檢查是否已登入
  const playId = localStorage.getItem(CONFIG.STORAGE_KEYS.playId);
  if (playId) {
    window.location.href = 'index.html';
  }
});

function toggleForm() {
  isLogin = !isLogin;
  const title = document.getElementById('formTitle');
  const submitBtn = document.getElementById('submitBtn');
  const toggleText = document.getElementById('toggleText');
  const toggleBtn = document.getElementById('toggleBtn');
  
  if (isLogin) {
    title.textContent = '登入帳號';
    submitBtn.textContent = '登入';
    toggleBtn.textContent = '註冊';
    toggleText.innerHTML = '沒有帳號？<a id="toggleLink">點我註冊</a>';
    document.getElementById('toggleLink').addEventListener('click', toggleForm);
  } else {
    title.textContent = '註冊帳號';
    submitBtn.textContent = '註冊';
    toggleBtn.textContent = '登入';
    toggleText.innerHTML = '已有帳號？<a id="toggleLink">點我登入</a>';
    document.getElementById('toggleLink').addEventListener('click', toggleForm);
  }
  
  clearMessages();
}

async function handleSubmit() {
  const name = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const errorDiv = document.getElementById('errorMsg');
  const successDiv = document.getElementById('successMsg');
  const submitBtn = document.getElementById('submitBtn');

  clearMessages();

  if (!name || !password) {
    errorDiv.textContent = '請填寫暱稱與密碼';
    errorDiv.classList.add('show');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  errorDiv.textContent = '處理中...';
  errorDiv.classList.add('show');

  try {
    const res = isLogin
      ? await gameAPI.loginPlayer(name, password)
      : await gameAPI.registerPlayer(name, password);

    // ❌ 核心判斷
    if (!res.success) {
      errorDiv.textContent = res.error || '登入失敗';
      errorDiv.classList.add('show');
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      return;
    }
    
    const player = res.data;
    
    // 一定存在
    localStorage.setItem(CONFIG.STORAGE_KEYS.playId, player.playId);
    localStorage.setItem(CONFIG.STORAGE_KEYS.playerName, player.name || '');

    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);

  } catch (error) {
    console.error('錯誤:', error);
    errorDiv.textContent = '發生錯誤：' + error.message;
    errorDiv.classList.add('show');
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
  }
}

function clearMessages() {
  document.getElementById('errorMsg').textContent = '';
  document.getElementById('errorMsg').classList.remove('show');
  document.getElementById('successMsg').textContent = '';
  document.getElementById('successMsg').classList.remove('show');
}
