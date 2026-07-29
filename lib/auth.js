/**
 * Admin Authentication
 * JWT-based authentication for admin panel
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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
    if (!stored) return false;
    // Simple comparison (use bcrypt in production)
    return password === stored;
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
