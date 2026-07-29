/**
 * DAMA Admin Panel - Fixed Upload
 */

const API_BASE = '/api/admin';
let token = localStorage.getItem('dama_admin_token');

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    showDashboard();
  } else {
    showLogin();
  }
  setupLoginForm();
  setupNavigation();
  setupUpload();
  setupSettings();
  setupLogout();
});

// ===== AUTH =====
function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminDashboard').style.display = 'none';
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'flex';
  loadDashboard();
}

function setupLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const btn = form.querySelector('button');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الدخول...';

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        alert('❌ ' + (data.error || 'بيانات الدخول غلط'));
        return;
      }

      token = data.token;
      localStorage.setItem('dama_admin_token', token);
      showDashboard();
    } catch (err) {
      alert('❌ خطأ في الاتصال: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
    }
  });
}

function setupLogout() {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    token = null;
    localStorage.removeItem('dama_admin_token');
    showLogin();
  });
}

// ===== NAVIGATION =====
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = {
    dashboard: 'dashboardSection',
    upload: 'uploadSection',
    settings: 'settingsSection',
    logs: 'logsSection'
  };

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;

      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      Object.values(sections).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });

      const target = document.getElementById(sections[section]);
      if (target) target.style.display = 'block';

      if (section === 'dashboard') loadDashboard();
      if (section === 'logs') loadLogs();
      if (section === 'settings') loadSettings();
    });
  });
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const res = await fetch(`${API_BASE}/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      token = null;
      localStorage.removeItem('dama_admin_token');
      showLogin();
      return;
    }

    const data = await res.json();

    document.getElementById('dashTotalStudents').textContent =
      (data.stats.totalStudents || 0).toLocaleString('ar-EG');
    document.getElementById('dashVisitors').textContent =
      (data.counters.visitors || 0).toLocaleString('ar-EG');
    document.getElementById('dashSearches').textContent =
      (data.counters.searches || 0).toLocaleString('ar-EG');

    const logsContainer = document.getElementById('recentLogs');
    if (data.logs && data.logs.length > 0) {
      logsContainer.innerHTML = data.logs.slice(0, 10).map(log => `
        <div class="log-item">
          <span class="log-action">${log.action}</span>
          <span class="log-time">${new Date(log.timestamp).toLocaleString('ar-EG')}</span>
        </div>
      `).join('');
    } else {
      logsContainer.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">لا توجد عمليات</p>';
    }
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

// ===== UPLOAD (FIXED - Direct to Blob) =====
function setupUpload() {
  const area = document.getElementById('uploadArea');
  const input = document.getElementById('fileInput');
  if (!area || !input) return;

  area.addEventListener('click', () => input.click());

  area.addEventListener('dragover', (e) => {
    e.preventDefault();
    area.style.borderColor = '#D4AF37';
    area.style.background = '#F7F5F2';
  });

  area.addEventListener('dragleave', () => {
    area.style.borderColor = '#0B3D91';
    area.style.background = 'transparent';
  });

  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.style.borderColor = '#0B3D91';
    area.style.background = 'transparent';
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (file) handleFile(file);
  });
}

async function handleFile(file) {
  if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    alert('❌ الملف لازم يكون Excel (.xlsx أو .xls)');
    return;
  }

  const progress = document.getElementById('uploadProgress');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const result = document.getElementById('uploadResult');
  const publishBtn = document.getElementById('publishBtn');

  progress.style.display = 'block';
  result.style.display = 'none';
  publishBtn.style.display = 'none';
  progressFill.style.width = '0%';
  progressFill.style.background = 'linear-gradient(90deg, #0B3D91, #D4AF37)';
  progressText.textContent = 'جاري الرفع... 0%';

  try {
    // Step 1: Get upload URL from backend
    progressText.textContent = 'جاري تحضير الرفع...';
    
    const tokenRes = await fetch(`${API_BASE}/upload-token`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!tokenRes.ok) {
      throw new Error('فشل الحصول على token الرفع');
    }
    
    const { token: uploadToken } = await tokenRes.json();

    // Step 2: Upload directly to Vercel Blob from browser
    progressText.textContent = 'جاري الرفع... 10%';
    progressFill.style.width = '10%';

    const response = await fetch(`https://blob.dama.upload/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${uploadToken}`,
        'x-version': '1',
      },
      body: file,
    });

    // Fallback: Use our own endpoint if blob.dama.upload doesn't work
    if (!response.ok) {
      // Upload to our backend endpoint that proxies to Blob
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await fetch(`${API_BASE}/upload-direct`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errData.error || 'فشل الرفع');
      }
      
      const uploadData = await uploadRes.json();
      progressFill.style.width = '100%';
      progressText.textContent = '✅ تم الرفع! جاري المعالجة...';
      
      // Step 3: Process the uploaded file
      const processRes = await fetch(`${API_BASE}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ blobUrl: uploadData.url, fileName: file.name })
      });
      
      if (!processRes.ok) {
        const errData = await processRes.json().catch(() => ({ error: 'Processing failed' }));
        throw new Error(errData.error || 'فشلت المعالجة');
      }
      
      const data = await processRes.json();
      showUploadResult(data, progressFill, progressText, result, publishBtn);
      return;
    }

    const blob = await response.json();
    progressFill.style.width = '60%';
    progressText.textContent = '✅ تم الرفع! جاري المعالجة...';

    // Step 3: Process the uploaded file
    const processRes = await fetch(`${API_BASE}/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ blobUrl: blob.url, fileName: file.name })
    });

    if (!processRes.ok) {
      const errData = await processRes.json().catch(() => ({ error: 'Processing failed' }));
      throw new Error(errData.error || 'فشلت المعالجة');
    }

    const data = await processRes.json();
    showUploadResult(data, progressFill, progressText, result, publishBtn);

  } catch (err) {
    progressFill.style.width = '100%';
    progressFill.style.background = '#e74c3c';
    progressText.textContent = '❌ فشل: ' + err.message;
    console.error('Upload error:', err);
  }
}

function showUploadResult(data, progressFill, progressText, result, publishBtn) {
  progressFill.style.width = '100%';
  progressText.textContent = '✅ تم الرفع والمعالجة بنجاح!';

  if (data.result) {
    result.style.display = 'block';
    const passRate = data.result.statistics.passed / data.result.total * 100;
    result.innerHTML = `
      <h4 style="color:#0B3D91;margin-bottom:15px;">📊 ملخص النتائج</h4>
      <p><strong>إجمالي الطلاب:</strong> ${data.result.total.toLocaleString('ar-EG')}</p>
      <p><strong>عدد المحافظات:</strong> ${data.result.statistics.governorates}</p>
      <p><strong>عدد المدارس:</strong> ${data.result.statistics.schools}</p>
      <p><strong>نسبة النجاح:</strong> ${passRate.toFixed(1)}%</p>
    `;
    publishBtn.style.display = 'block';

    publishBtn.onclick = async () => {
      publishBtn.disabled = true;
      publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري النشر...';
      try {
        await fetch(`${API_BASE}/publish`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        publishBtn.innerHTML = '<i class="fas fa-check"></i> تم النشر بنجاح!';
        publishBtn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
      } catch (err) {
        alert('❌ فشل النشر: ' + err.message);
        publishBtn.disabled = false;
        publishBtn.innerHTML = '<i class="fas fa-check"></i> نشر النتائج';
      }
    };
  }
}

// ===== SETTINGS =====
function setupSettings() {
  const btn = document.getElementById('saveSettingsBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const maintenance = document.getElementById('maintenanceMode').checked;
    const announcement = document.getElementById('announcementText').value;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ maintenance, announcement })
      });

      if (res.ok) {
        btn.innerHTML = '<i class="fas fa-check"></i> تم الحفظ!';
        setTimeout(() => {
          btn.innerHTML = '<i class="fas fa-save"></i> حفظ الإعدادات';
          btn.disabled = false;
        }, 2000);
      } else {
        throw new Error('فشل الحفظ');
      }
    } catch (err) {
      alert('❌ ' + err.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> حفظ الإعدادات';
    }
  });
}

async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    document.getElementById('maintenanceMode').checked = data.maintenance || false;
    document.getElementById('announcementText').value = data.announcement || '';
  } catch (err) {
    console.error('Settings load error:', err);
  }
}

// ===== LOGS =====
async function loadLogs() {
  try {
    const res = await fetch(`${API_BASE}/logs?limit=100`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const logs = await res.json();
    const container = document.getElementById('fullLogs');

    if (logs.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">لا توجد عمليات</p>';
      return;
    }

    container.innerHTML = logs.map(log => `
      <div class="log-item">
        <span class="log-action">${log.action}${log.admin ? ' - ' + log.admin : ''}</span>
        <span class="log-time">${new Date(log.timestamp).toLocaleString('ar-EG')}</span>
      </div>
    `).join('');
  } catch (err) {
    console.error('Logs error:', err);
  }
}
