/**
 * Admin API Routes - Fixed for Large Files
 */

const { put, get } = require('@vercel/blob');
const Storage = require('../lib/storage');
const Processor = require('../lib/processor');
const Auth = require('../lib/auth');

module.exports = async (req, res) => {
  try {
    const { method, url, body } = req;
    const path = url.replace('/api/admin', '');

    // Login
    if (path === '/login' && method === 'POST') {
      const { username, password } = body || {};
      
      if (username !== process.env.ADMIN_USERNAME) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      if (!Auth.verifyPassword(password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const token = Auth.generateToken(username);
      await Storage.addLog({ action: 'login', username });
      return res.status(200).json({ token, expiresAt: Date.now() + 8 * 3600 * 1000 });
    }

    // All other routes require auth
    return Auth.middleware(async (req, res) => {
      // Dashboard
      if (path === '/dashboard' && method === 'GET') {
        const stats = await Storage.getStatistics();
        const counters = await Storage.getCounters();
        const logs = await Storage.getLogs(50);
        const settings = await Storage.getSettings();
        return res.status(200).json({
          stats: stats || { totalStudents: 0, governorates: 0, schools: 0, published: false },
          counters,
          logs,
          maintenance: settings.maintenance || false,
          announcement: settings.announcement || ''
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
        return res.status(200).json({ ok: true });
      }

      // Get upload token for direct Blob upload
      if (path === '/upload-token' && method === 'GET') {
        // Return a token that allows direct upload to Blob
        // In production, you'd use @vercel/blob/client's createUploadToken
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        if (!token) {
          return res.status(500).json({ error: 'Blob not configured' });
        }
        return res.status(200).json({ token });
      }

      // Direct upload endpoint (for files < 4.5MB)
      if (path === '/upload-direct' && method === 'POST') {
        const contentType = req.headers['content-type'] || '';
        
        if (!contentType.includes('multipart/form-data')) {
          return res.status(400).json({ error: 'Invalid content type' });
        }

        const formData = await req.formData();
        const file = formData.get('file');
        
        if (!file) {
          return res.status(400).json({ error: 'No file provided' });
        }

        // Check size
        if (file.size > 4 * 1024 * 1024) {
          return res.status(413).json({ 
            error: 'File too large. Please use a smaller file or split it.' 
          });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Upload to Blob
        const blob = await put(`uploads/${Date.now()}-${file.name}`, buffer, {
          access: 'public',
          addRandomSuffix: true
        });

        await Storage.addLog({ 
          action: 'upload_direct', 
          admin: req.admin.sub, 
          fileName: file.name,
          size: file.size
        });

        return res.status(200).json({ 
          ok: true, 
          url: blob.url,
          fileName: file.name
        });
      }

      // Process uploaded file from Blob URL
      if (path === '/process' && method === 'POST') {
        const { blobUrl, fileName } = body || {};
        
        if (!blobUrl) {
          return res.status(400).json({ error: 'No blob URL provided' });
        }

        await Storage.addLog({ 
          action: 'process_start', 
          admin: req.admin.sub, 
          fileName 
        });

        // Download file from Blob
        const response = await fetch(blobUrl);
        if (!response.ok) {
          throw new Error('Failed to download file from Blob');
        }
        
        const buffer = Buffer.from(await response.arrayBuffer());

        // Process Excel
        const rows = await Processor.readExcel(buffer);
        const cleaned = Processor.validateAndClean(rows);
        const deduped = Processor.removeDuplicates(cleaned);
        const stats = Processor.computeStatistics(deduped);
        const topStudents = Processor.topStudents(deduped, 50);

        // Save to Blob
        await Storage.setStudents(deduped);
        await Storage.setStatistics(stats);
        await Storage.setTopStudents(topStudents);
        await Storage.setGovernorates(stats.governoratesList);

        await Storage.addLog({ 
          action: 'process_complete', 
          admin: req.admin.sub, 
          students: deduped.length 
        });

        return res.status(200).json({
          ok: true,
          result: {
            total: deduped.length,
            statistics: stats,
            topStudents: topStudents.slice(0, 10)
          }
        });
      }

      // Legacy upload (for backward compatibility)
      if (path === '/upload' && method === 'POST') {
        return res.status(400).json({ 
          error: 'Please use the new upload method. Refresh the page.' 
        });
      }

      // Publish
      if (path === '/publish' && method === 'POST') {
        const stats = await Storage.getStatistics();
        if (!stats) return res.status(400).json({ error: 'No data to publish' });
        stats.publishedAt = new Date().toISOString();
        await Storage.setStatistics(stats);
        await Storage.addLog({ action: 'publish', admin: req.admin.sub });
        return res.status(200).json({ ok: true });
      }

      // Logs
      if (path === '/logs' && method === 'GET') {
        const limit = Math.min(Number(req.query.limit) || 100, 500);
        const logs = await Storage.getLogs(limit);
        return res.status(200).json(logs);
      }

      return res.status(404).json({ error: 'Not found' });
    })(req, res);

  } catch (error) {
    console.error('Admin API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
