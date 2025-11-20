const jwt = require('jsonwebtoken');
const dbType = process.env.DB_TYPE || 'mongo';
const User = dbType === 'postgres' ? require('../models_sql').compat.User : require('../models/User');
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

module.exports = async function (req, res, next) {
  try {
    const header = req.headers.authorization || req.headers.Authorization;
    const token = header && header.startsWith('Bearer ') ? header.split(' ')[1] : (req.cookies && req.cookies.token ? req.cookies.token : null);
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.id;
    // populate user (without password)
    const user = await User.findById(req.userId);
    // Ensure `.toJSON()` transformation to remove password (works for both mongoose & sequelize)
    let safeUser = user;
    if (user && user.toJSON) safeUser = user.toJSON();
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = safeUser;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
