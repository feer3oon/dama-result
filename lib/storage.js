/**
 * Vercel Blob Storage - Fixed Version
 */

const { put, get } = require('@vercel/blob');

class Storage {
  static async safeGet(key) {
    try {
      const blob = await get(key);
      if (!blob) return null;
      const text = await blob.text();
      return JSON.parse(text);
    } catch (err) {
      console.error(`Storage get error [${key}]:`, err.message);
      return null;
    }
  }

  static async safePut(key, data) {
    try {
      await put(key, JSON.stringify(data), {
        access: 'public',
        addRandomSuffix: false
      });
      return true;
    } catch (err) {
      console.error(`Storage put error [${key}]:`, err.message);
      return false;
    }
  }

  // Students data
  static async setStudents(students) {
    await this.safePut('students.json', students);
    
    // Build search index
    const index = { bySeat: {}, byName: {} };
    students.forEach(s => {
      index.bySeat[s.seatNumber] = s;
      const nameKey = s.name.toLowerCase().trim();
      index.byName[nameKey] = s.seatNumber;
    });
    
    await this.safePut('search_index.json', index);
  }

  static async getStudentBySeat(seat) {
    const index = await this.safeGet('search_index.json');
    if (!index || !index.bySeat) return null;
    return index.bySeat[seat] || null;
  }

  static async searchStudents(query, limit = 25) {
    const index = await this.safeGet('search_index.json');
    if (!index) return [];
    
    const q = query.toLowerCase().trim();
    
    // Exact seat match
    if (index.bySeat && index.bySeat[q]) return [index.bySeat[q]];
    
    // Name search
    const results = [];
    if (index.byName) {
      for (const [name, seat] of Object.entries(index.byName)) {
        if (name.includes(q) && index.bySeat[seat]) {
          results.push(index.bySeat[seat]);
          if (results.length >= limit) break;
        }
      }
    }
    return results;
  }

  // Statistics
  static async setStatistics(stats) {
    await this.safePut('statistics.json', stats);
  }

  static async getStatistics() {
    return await this.safeGet('statistics.json');
  }

  // Top students
  static async setTopStudents(students) {
    await this.safePut('top_students.json', students);
  }

  static async getTopStudents() {
    return (await this.safeGet('top_students.json')) || [];
  }

  // Governorates
  static async setGovernorates(data) {
    await this.safePut('governorates.json', data);
  }

  static async getGovernorates() {
    return (await this.safeGet('governorates.json')) || [];
  }

  // Counters
  static async incrementVisitors() {
    const counters = (await this.safeGet('counters.json')) || { visitors: 0, searches: 0 };
    counters.visitors++;
    await this.safePut('counters.json', counters);
    return counters.visitors;
  }

  static async incrementSearches() {
    const counters = (await this.safeGet('counters.json')) || { visitors: 0, searches: 0 };
    counters.searches++;
    await this.safePut('counters.json', counters);
    return counters.searches;
  }

  static async getCounters() {
    return (await this.safeGet('counters.json')) || { visitors: 0, searches: 0 };
  }

  // News
  static async setNews(news) {
    await this.safePut('news.json', news);
  }

  static async getNews() {
    return (await this.safeGet('news.json')) || [];
  }

  // Settings
  static async setSettings(settings) {
    await this.safePut('settings.json', settings);
  }

  static async getSettings() {
    return (await this.safeGet('settings.json')) || { maintenance: false, announcement: '' };
  }

  // Logs
  static async addLog(entry) {
    const logs = (await this.safeGet('logs.json')) || [];
    logs.unshift({ ...entry, timestamp: new Date().toISOString() });
    if (logs.length > 500) logs.pop();
    await this.safePut('logs.json', logs);
  }

  static async getLogs(limit = 100) {
    const logs = (await this.safeGet('logs.json')) || [];
    return logs.slice(0, limit);
  }
}

module.exports = Storage;
