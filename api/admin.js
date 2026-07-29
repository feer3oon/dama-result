/**
 * Admin API Routes
 * Handles admin panel operations
 */

const { put } = require('@vercel/blob');
const Storage = require('../lib/storage');
const Processor = require('../lib/processor');
const Auth = require('../lib/auth');

module.exports = async (req, res) => {
  const { method, url, body } = req;
  const path = url.replace('/api/admin', '');

  try {
    // Login
    if (path === '/login' && method === 'POST') {
      const { username, password } = body || {};
      if (username !== process.env.ADMIN_USERNAME || !Auth.verifyPassword(password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = Auth.generateToken(username);
      await Storage.addLog({ action: 'login', username });
      return res.json({ token, expiresAt: Date.now() + 8 * 3600 * 1000 });
    }

    // All other routes require auth
    return Auth.middleware(async (req, res) => {
      // Dashboard
      if (path === '/dashboard' && method === 'GET') {
        const stats = await Storage.getStatistics();
        const counters = await Storage.getCounters();
        const logs = await Storage.getLogs(50);
        const settings = await Storage.getSettings();
        return res.json({
          stats: stats || { totalStudents: 0, governorates: 0, schools: 0, published: false },
          counters,
          logs,
          maintenance: settings.maintenance,
          announcement: settings.announcement
        });
      }

      // Settings
      if (path === '/settings' && method === 'POST') {
        const { maintenance, announcement } = body || {};
        const settings = await Storage.getSettings();
        if (typeof maintenance === 'boolean') settings.maintenance = maintenance;
        if (typeof announcement === 'string') settings.announcement = announcement;
        await Storage.setSettings(settings);
        await Storage.addLog({ action: 'settings_update', admin: req.admin.sub });
        return res.json({ ok: true });
      }

      // Upload file
      if (path === '/upload' && method === 'POST') {
        const contentType = req.headers['content-type'] || '';
        
        if (contentType.includes('multipart/form-data')) {
          // File upload via Vercel Blob
          const formData = await req.formData();
          const file = formData.get('file');
          
          if (!file) {
            return res.status(400).json({ error: 'No file provided' });
          }

          const buffer = Buffer.from(await file.arrayBuffer());
          await Storage.addLog({ action: 'upload_start', admin: req.admin.sub, fileName: file.name });

          // Process Excel
          const rows = await Processor.readExcel(buffer);
          const cleaned = Processor.validateAndClean(rows);
          const deduped = Processor.removeDuplicates(cleaned);
          const stats = Processor.computeStatistics(deduped);
          const topStudents = Processor.topStudents(deduped, 50);

          // Save to KV
          await Storage.setStudents(deduped);
          await Storage.setStatistics(stats);
          await Storage.setTopStudents(topStudents);
          await Storage.setGovernorates(stats.governoratesList);

          await Storage.addLog({ 
            action: 'upload_complete', 
            admin: req.admin.sub, 
            students: deduped.length 
          });

          return res.json({
            ok: true,
            result: {
              total: deduped.length,
              statistics: stats,
              topStudents: topStudents.slice(0, 10)
            }
          });
        }

        return res.status(400).json({ error: 'Invalid content type' });
      }

      // Publish
      if (path === '/publish' && method === 'POST') {
        const stats = await Storage.getStatistics();
        if (!stats) return res.status(400).json({ error: 'No data to publish' });
        stats.publishedAt = new Date().toISOString();
        await Storage.setStatistics(stats);
        await Storage.addLog({ action: 'publish', admin: req.admin.sub });
        return res.json({ ok: true });
      }

      // Logs
      if (path === '/logs' && method === 'GET') {
        const limit = Math.min(Number(req.query.limit) || 100, 500);
        const logs = await Storage.getLogs(limit);
        return res.json(logs);
      }

      return res.status(404).json({ error: 'Not found' });
    })(req, res);

  } catch (error) {
    console.error('Admin API Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
