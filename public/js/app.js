/**
 * Home Page Logic
 */

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadStatus();
  await loadCounters();
  await loadNews();
  await loadTopStudents();
  await loadTopGovernorates();
  createParticles();
  setupSearch();
});

// Load status
async function loadStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    
    if (data.announcement) {
      document.getElementById('announcementBanner').style.display = 'block';
      document.getElementById('announcementText').textContent = data.announcement;
    }
    
    if (data.stats) {
      animateCounter('totalStudents', data.stats.totalStudents);
      animateCounter('totalGovernorates', data.stats.governorates);
      animateCounter('totalSchools', data.stats.schools);
    }
  } catch (e) {
    console.error('Failed to load status:', e);
  }
}

// Load counters
async function loadCounters() {
  try {
    const res = await fetch('/api/counters');
    const data = await res.json();
    animateCounter('visitorCount', data.visitors);
    animateCounter('searchCount', data.searches);
  } catch (e) {
    console.error('Failed to load counters:', e);
  }
}

// Load news
async function loadNews() {
  try {
    const res = await fetch('/api/news');
    const news = await res.json();
    const grid = document.getElementById('newsGrid');
    
    if (news.length === 0) {
      grid.innerHTML = '<p style="text-align: center; color: var(--secondary);">لا توجد أخبار حالياً</p>';
      return;
    }
    
    grid.innerHTML = news.map(item => `
      <div class="news-card">
        <h4>${item.title}</h4>
        <p>${item.content}</p>
      </div>
    `).join('');
  } catch (e) {
    console.error('Failed to load news:', e);
  }
}

// Load top students
async function loadTopStudents() {
  try {
    const res = await fetch('/api/top-students');
    const students = await res.json();
    const list = document.getElementById('topStudentsList');
    
    if (students.length === 0) {
      list.innerHTML = '<p style="text-align: center; color: var(--secondary);">لا توجد بيانات</p>';
      return;
    }
    
    list.innerHTML = students.slice(0, 10).map(s => `
      <div class="top-item">
        <div class="top-rank">${s.rank}</div>
        <div class="top-info">
          <strong>${s.name}</strong>
          <small>${s.governorate} - ${s.school}</small>
        </div>
        <div class="top-value">${s.percentage.toFixed(2)}%</div>
      </div>
    `).join('');
  } catch (e) {
    console.error('Failed to load top students:', e);
  }
}

// Load top governorates
async function loadTopGovernorates() {
  try {
    const res = await fetch('/api/top-governorates');
    const gov = await res.json();
    const list = document.getElementById('topGovernoratesList');
    
    if (gov.length === 0) {
      list.innerHTML = '<p style="text-align: center; color: var(--secondary);">لا توجد بيانات</p>';
      return;
    }
    
    list.innerHTML = gov.map((g, i) => `
      <div class="top-item">
        <div class="top-rank">${i + 1}</div>
        <div class="top-info">
          <strong>${g.name}</strong>
          <small>${g.count} طالب</small>
        </div>
        <div class="top-value">${g.avgPercentage}%</div>
      </div>
    `).join('');
  } catch (e) {
    console.error('Failed to load top governorates:', e);
  }
}

// Create particles
function createParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 15 + 's';
    particle.style.animationDuration = (10 + Math.random() * 10) + 's';
    container.appendChild(particle);
  }
}

// Setup search
function setupSearch() {
  const input = document.getElementById('searchInput');
  const btn = document.getElementById('searchBtn');
  const suggestions = document.getElementById('suggestions');
  let searchTimeout;
  
  input.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = input.value.trim();
    
    if (q.length < 2) {
      suggestions.style.display = 'none';
      return;
    }
    
    searchTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        
        if (data.results.length === 0) {
          suggestions.style.display = 'none';
          return;
        }
        
        suggestions.innerHTML = data.results.map(s => `
          <div class="suggestion-item" data-seat="${s.seatNumber}">
            <strong>${s.name}</strong>
            <small style="display: block; color: var(--secondary);">رقم الجلوس: ${s.seatNumber}</small>
          </div>
        `).join('');
        suggestions.style.display = 'block';
        
        suggestions.querySelectorAll('.suggestion-item').forEach(item => {
          item.addEventListener('click', () => {
            window.location.href = `/result.html?seat=${item.dataset.seat}`;
          });
        });
      } catch (e) {
        console.error('Search failed:', e);
      }
    }, 300);
  });
  
  btn.addEventListener('click', () => {
    const q = input.value.trim();
    if (q) {
      window.location.href = `/result.html?seat=${encodeURIComponent(q)}`;
    }
  });
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      btn.click();
    }
  });
  
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-card')) {
      suggestions.style.display = 'none';
    }
  });
}

// Animate counter
function animateCounter(elementId, target) {
  const element = document.getElementById(elementId);
  const duration = 1500;
  const start = 0;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const current = Math.floor(start + (target - start)
