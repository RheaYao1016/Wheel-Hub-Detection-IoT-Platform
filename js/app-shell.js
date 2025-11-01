// Common navigation and account handling for the static HTML prototype
(function () {
  const NAV_BASE = [
    { href: 'Home_Page.html', text: '主页' },
    { href: 'Visualize.html', text: '可视化平台' },
    { href: 'Monitor.html', text: '实时监控' },
    { href: 'Digital_Twin.html', text: '数字孪生' }
  ];
  const NAV_ADMIN = [
    { href: 'Data_Import.html', text: '数据导入' },
    { href: 'Admin_Index.html', text: '管理员后台' }
  ];
  const ACTIVE_MAP = {
    'Home_Page.html': '主页',
    'Visualize.html': '可视化平台',
    'Monitor.html': '实时监控',
    'Digital_Twin.html': '数字孪生',
    'Data_Import.html': '数据导入',
    'Admin_Index.html': '管理员后台'
  };

  const getRole = () => (typeof window !== 'undefined' ? localStorage.getItem('role') : null);
  const isAdmin = () => getRole() === 'admin';

  function renderNav() {
    const nav = document.getElementById('topNav');
    if (!nav) return;
    const pages = isAdmin() ? NAV_BASE.concat(NAV_ADMIN) : NAV_BASE;
    nav.innerHTML = pages
      .map((item) => <a class="nav-btn" href=""></a>)
      .join('');
  }

  function mountAccountMenu() {
    const container = document.getElementById('accountMenu');
    if (!container) return;
    container.classList.add('account');
    const role = getRole();
    const avatar = role ? role.charAt(0).toUpperCase() : '访';
    const label = role ? role : '访客';
    const dropdown = role
      ? '<a href="#" onclick="logout();return false;">退出登录</a><a href="#" onclick="switchUser();return false;">切换账号</a>'
      : '<a href="login.html">登录</a><a href="register.html">注册</a>';
    container.innerHTML = 
      <button class="account-toggle" type="button">
        <span class="avatar"></span>
        <span></span>
      </button>
      <div class="dropdown"></div>
    ;
  }

  function highlightActive() {
    const nav = document.getElementById('topNav');
    if (!nav) return;
    const links = nav.querySelectorAll('.nav-btn');
    const current = Object.keys(ACTIVE_MAP).find((key) => location.pathname.endsWith(key));
    links.forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (current && href.endsWith(current)) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  function ensureDefaultEntry() {
    const file = location.pathname.split('/').pop();
    if (file === '' || file === 'index.html') {
      location.replace('Visualize.html');
    }
  }

  function logout() {
    localStorage.removeItem('role');
    renderNav();
    mountAccountMenu();
    highlightActive();
    location.href = 'Visualize.html';
  }

  function switchUser() {
    localStorage.removeItem('role');
    renderNav();
    mountAccountMenu();
    highlightActive();
    location.href = 'login.html';
  }

  function init() {
    ensureDefaultEntry();
    renderNav();
    mountAccountMenu();
    highlightActive();
    window.addEventListener('storage', () => {
      renderNav();
      mountAccountMenu();
      highlightActive();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.logout = logout;
  window.switchUser = switchUser;
})();
