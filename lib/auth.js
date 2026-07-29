/**
 * Admin Authentication - Fixed Version
 */

const jwt = require('jsonwebtoken');

class Auth {
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return null;
    }
  }

  static generateToken(username) {
    return jwt.sign(
      { sub: username, role: 'admin', iat: Date.now() },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
  }

  static verifyPassword(password) {
    const stored = process.env.ADMIN_PASSWORD;
    
    // Debug log (هتشوفه في Vercel Logs)
    console.log('=== PASSWORD DEBUG ===');
    console.log('Stored password exists:', !!stored);
    console.log('Stored password length:', stored ? stored.length : 0);
    console.log('Input password length:', password ? password.length : 0);
    console.log('Match:', password === stored);
    console.log('=====================');
    
    if (!stored) {
      console.error('❌ ADMIN_PASSWORD environment variable is missing!');
      return false;
    }
    
    if (!password) {
      return false;
    }
    
    // Trim spaces
    const cleanPassword = String(password).trim();
    const cleanStored = String(stored).trim();
    
    return cleanPassword === cleanStored;
  }

  static middleware(handler) {
    return async (req, res) => {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const payload = this.verifyToken(token);
      if (!payload || payload.role !== 'admin') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      req.admin = payload;
      return handler(req, res);
    };
  }
}

module.exports = Auth;
