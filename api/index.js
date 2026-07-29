/**
 * Public API Routes
 * Handles all public-facing endpoints
 */

const Storage = require('../lib/storage');
const QRCode = require('qrcode');

module.exports = async (req, res) => {
  const { method, query, url } = req;
  const path = url.replace('/api', '');

  try {
    // Status
    if (path === '/status' && method === 'GET') {
      const stats = await Storage.getStatistics();
      const settings = await Storage.getSettings();
      return res.json({
        ok: true,
        maintenance: settings.maintenance,
        announcement: settings.announcement,
        published: !!stats,
        stats: stats ? {
          totalStudents: stats.totalStudents,
          governorates: stats.governorates,
          schools: stats.schools
        } : null
      });
    }

    // Counters
    if (path === '/counters' && method === 'GET') {
      const counters = await Storage.getCounters();
      return res.json(counters);
    }

    if (path === '/counters/visit' && method === 'POST') {
      await Storage.incrementVisitors();
      return res.json({ ok: true });
    }

    if (path === '/counters/search' && method === 'POST') {
      await Storage.incrementSearches();
      return res.json({ ok: true });
    }

    // News
    if (path === '/news' && method === 'GET') {
      const news = await Storage.getNews();
      return res.json(news);
    }

    // Top students
    if (path === '/top-students' && method === 'GET') {
      const top = await Storage.getTopStudents();
      return res.json(top);
    }

    // Top governorates
    if (path === '/top-governorates' && method === 'GET') {
      const gov = await Storage.getGovernorates();
      const sorted = [...gov].sort((a, b) => b.avgPercentage - a.avgPercentage).slice(0, 10);
      return res.json(sorted);
    }

    // Search
    if (path === '/search' && method === 'GET') {
      const q = String(query.q || '').trim();
      if (!q) return res.json({ results: [] });
      const results = await Storage.searchStudents(q, 25);
      await Storage.incrementSearches();
      return res.json({ results });
    }

    // Student by seat
    if (path.startsWith('/student/') && path.endsWith('/qr.png')) {
      const seat = path.split('/')[2];
      const base = process.env.BASE_URL || 'http://localhost:3000';
      const resultUrl = `${base}/result.html?seat=${encodeURIComponent(seat)}`;
      const png = await QRCode.toBuffer(resultUrl, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 512,
        color: { dark: '#0B3D91', light: '#FFFFFF' }
      });
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(png);
    }

    if (path.startsWith('/student/') && method === 'GET') {
      const seat = path.split('/')[2];
      const student = await Storage.getStudentBySeat(seat);
      if (!student) return res.status(404).json({ error: 'Student not found' });
      return res.json(student);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
