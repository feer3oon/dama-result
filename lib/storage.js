/**
 * Vercel Blob Storage - Simple Version
 */

const { put, get, del, list } = require('@vercel/blob');

class Storage {
  // Students data
  static async setStudents(students) {
    await put('students.json', JSON.stringify(students), {
      access: 'public',
      addRandomSuffix: false
    });
    
    // Build search index
    const index = { bySeat: {}, byName: {} };
    students.forEach(s => {
      index.bySeat[s.seatNumber] = s;
      const nameKey = s.name.toLowerCase().trim();
      index.byName[nameKey] = s.seatNumber;
    });
    
    await put('search_index.json', JSON.stringify(index), {
      access: 'public',
      addRandomSuffix: false
    });
  }

  static async getStudentBySeat(seat) {
    try {
      const blob = await get('search_index.json');
      const text = await blob.text();
      const index = JSON.parse(text);
      return index.bySeat[seat] || null;
    } catch {
      return null;
    }
  }

  static async searchStudents(query, limit = 25) {
    try {
      const blob = await get('search_index.json');
      const text = await blob.text();
      const index = JSON.parse(text);
      const q = query.toLowerCase().trim();
      
      // Exact seat match
      if (index.bySeat[q]) return [index.bySeat[q]];
      
      // Name search
      const results = [];
      for (const [name, seat] of Object.entries(index.byName)) {
        if (name.includes(q)) {
          results.push(index.bySeat[seat]);
          if (results.length >= limit) break;
        }
      }
      return results;
    } catch {
      return [];
    }
  }

  // Statistics
  static async setStatistics(stats) {
    await put('statistics.json', JSON.stringify(stats), {
      access: 'public',
      addRandomSuffix: false
    });
  }

  static async getStatistics() {
    try {
      const blob = await get('statistics.json');
      const text = await blob.text();
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  // Top students
  static async setTopStudents(students) {
    await put('top_students.json', JSON.stringify(students), {
      access: 'public',
      addRandomSuffix: false
    });
  }

  static async getTopStudents() {
    try {
      const blob = await get('top_students.json');
      const text = await blob.text();
      return JSON.parse(text);
    } catch {
      return [];
    }
  }

  // Governorates
  static async setGovernorates(data) {
    await put('governorates.json', JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false
    });
  }

  static async getGovernorates() {
    try {
      const blob = await get('governorates.json');
      const text = await blob.text();
      return JSON.parse(text);
    } catch {
      return [];
    }
  }

  // Counters (using Blob)
  static async incrementVisitors() {
    try {
      const blob = await get('counters.json');
      const text = await blob.text();
      const counters = JSON.parse(text);
      counters.visitors++;
      await put('counters.json', JSON.stringify(counters), {
        access: 'public',
        addRandomSuffix: false
      });
      return counters.visitors;
    } catch {
      const counters = { visitors: 1, searches: 0 };
      await put('counters.json', JSON.stringify(counters), {
        access: 'public',
        addRandomSuffix: false
      });
      return 1;
    }
  }

  static async incrementSearches() {
    try {
      const blob = await get('counters.json');
      const text = await blob.text();
      const counters = JSON.parse(text);
      counters.searches++;
      await put('counters.json', JSON.stringify(counters), {
        access: 'public',
        addRandomSuffix: false
      });
      return counters.searches;
    } catch {
      const counters = { visitors: 0, searches: 1 };
      await put('counters.json', JSON.stringify(counters), {
        access: 'public',
        addRandomSuffix: false
      });
      return 1;
    }
  }

  static async getCounters() {
    try {
      const blob = await get('counters.json');
      const text = await blob.text();
      return JSON.parse(text);
    } catch {
      return { visitors: 0, searches: 0 };
    }
  }

  // News
  static async setNews(news) {
    await put('news.json', JSON.stringify(news), {
      access: 'public',
      addRandomSuffix: false
    });
  }

  static async getNews() {
    try {
      const blob = await get('news.json');
      const text = await blob.text();
      return JSON.parse(text);
    } catch {
      return [];
    }
  }

  // Settings
  static async setSettings(settings) {
    await put('settings.json', JSON.stringify(settings), {
      access: 'public',
      addRandomSuffix: false
    });
  }

  static async getSettings() {
    try {
      const blob = await get('settings.json');
      const text = await blob.text();
      return JSON.parse(text);
    } catch {
      return { maintenance: false, announcement: '' };
    }
  }

  // Logs
  static async addLog(entry) {
    try {
      const blob = await get('logs.json');
      const text = await blob.text();
      const logs = JSON.parse(text);
      logs.unshift({ ...entry, timestamp: new Date().toISOString() });
      if (logs.length > 500) logs.pop();
      await put('logs.json', JSON.stringify(logs), {
        access: 'public',
        addRandomSuffix: false
      });
    } catch {
      const logs = [{ ...entry, timestamp: new Date().toISOString() }];
      await put('logs.json', JSON.stringify(logs), {
        access: 'public',
        addRandomSuffix: false
      });
    }
  }

  static async getLogs(limit = 100) {
    try {
      const blob = await get('logs.json');
      const text = await blob.text();
      const logs = JSON.parse(text);
      return logs.slice(0, limit);
    } catch {
      return [];
    }
  }
}

module.exports = Storage;    const data = await kv.get('top_students');
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
