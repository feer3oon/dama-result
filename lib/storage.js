/**
 * Vercel KV Storage Wrapper
 * Handles all data persistence using Vercel KV (Redis)
 */

const { kv } = require('@vercel/kv');

class Storage {
  // Students data
  static async setStudents(students) {
    await kv.set('students', JSON.stringify(students));
    // Build search index
    const index = {};
    students.forEach(s => {
      index[s.seatNumber] = s;
      const nameKey = s.name.toLowerCase().trim();
      if (!index._names) index._names = {};
      index._names[nameKey] = s.seatNumber;
    });
    await kv.set('search_index', JSON.stringify(index));
  }

  static async getStudents() {
    const data = await kv.get('students');
    return data ? JSON.parse(data) : [];
  }

  static async getStudentBySeat(seat) {
    const index = await kv.get('search_index');
    if (!index) return null;
    const parsed = JSON.parse(index);
    return parsed[seat] || null;
  }

  static async searchStudents(query, limit = 25) {
    const index = await kv.get('search_index');
    if (!index) return [];
    const parsed = JSON.parse(index);
    const q = query.toLowerCase().trim();
    
    // Exact seat match
    if (parsed[q]) return [parsed[q]];
    
    // Name search
    const results = [];
    const names = parsed._names || {};
    for (const [name, seat] of Object.entries(names)) {
      if (name.includes(q)) {
        results.push(parsed[seat]);
        if (results.length >= limit) break;
      }
    }
    return results;
  }

  // Statistics
  static async setStatistics(stats) {
    await kv.set('statistics', JSON.stringify(stats));
  }

  static async getStatistics() {
    const data = await kv.get('statistics');
    return data ? JSON.parse(data) : null;
  }

  // Top students
  static async setTopStudents(students) {
    await kv.set('top_students', JSON.stringify(students));
  }

  static async getTopStudents() {
    const data = await kv.get('top_students');
    return data ? JSON.parse(data) : [];
  }

  // Governorates
  static async setGovernorates(data) {
    await kv.set('governorates', JSON.stringify(data));
  }

  static async getGovernorates() {
    const data = await kv.get('governorates');
    return data ? JSON.parse(data) : [];
  }

  // Counters
  static async incrementVisitors() {
    return await kv.incr('counter:visitors');
  }

  static async incrementSearches() {
    return await kv.incr('counter:searches');
  }

  static async getCounters() {
    const visitors = (await kv.get('counter:visitors')) || 0;
    const searches = (await kv.get('counter:searches')) || 0;
    return { visitors, searches };
  }

  // News
  static async setNews(news) {
    await kv.set('news', JSON.stringify(news));
  }

  static async getNews() {
    const data = await kv.get('news');
    return data ? JSON.parse(data) : [];
  }

  // Settings
  static async setSettings(settings) {
    await kv.set('settings', JSON.stringify(settings));
  }

  static async getSettings() {
    const data = await kv.get('settings');
    return data ? JSON.parse(data) : { maintenance: false, announcement: '' };
  }

  // Logs
  static async addLog(entry) {
    const logs = (await kv.lrange('logs', 0, -1)) || [];
    logs.unshift({ ...entry, timestamp: new Date().toISOString() });
    if (logs.length > 500) logs.pop();
    await kv.del('logs');
    if (logs.length > 0) {
      await kv.rpush('logs', ...logs.map(l => JSON.stringify(l)));
    }
  }

  static async getLogs(limit = 100) {
    const logs = (await kv.lrange('logs', 0, limit - 1)) || [];
    return logs.map(l => JSON.parse(l));
  }
}

module.exports = Storage;
