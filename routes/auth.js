// const express = require('express');
// const router = express.Router();
// const jwt = require('jsonwebtoken');
// const dbType = process.env.DB_TYPE || 'mongo';
// const User = dbType === 'postgres' ? require('../models_sql').User : require('../models/User');

// const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
// const JWT_EXPIRES_IN = '7d';

// router.post('/register', async (req, res) => {
//   try {
//     const { name, email, password } = req.body;
//     if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
//     const exists = await (dbType === 'postgres' ? User.findOne({ where: { email } }) : User.findOne({ email }));
//     if (exists) return res.status(409).json({ error: 'Email already registered' });
//     const user = await User.create({ name, email, password });
//     const userId = user.id || user._id;
//     const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
//     res.status(201).json({ token, user: user.toJSON() });
//   } catch (err) {
//     console.error('Auth register error:', err);
//     res.status(500).json({ error: 'Registration failed' });
//   }
// });

// router.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     if (!email || !password) return res.status(400).json({ error: 'email & password required' });
//     const user = await (dbType === 'postgres' ? User.findOne({ where: { email } }) : User.findOne({ email }).select('+password'));
//     if (!user) return res.status(401).json({ error: 'Invalid credentials' });
//     const match = await user.comparePassword(password);
//     if (!match) return res.status(401).json({ error: 'Invalid credentials' });
//     const userId = user.id || user._id;
//     const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
//     res.json({ token, user: user.toJSON() });
//   } catch (err) {
//     console.error('Auth login error:', err);
//     res.status(500).json({ error: 'Login failed' });
//   }
// });

// module.exports = router;


const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Detect DB type
const dbType = process.env.DB_TYPE || 'mongo';

// Load correct User model
const models = dbType === 'postgres'
  ? require('../models_sql')
  : null;

const User = dbType === 'postgres'
  ? models.User
  : require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_EXPIRES_IN = '7d';


// ================= REGISTER =================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, password required' });
    }

    // Check if user exists
    const exists = await (
      dbType === 'postgres'
        ? User.findOne({ where: { email } })
        : User.findOne({ email })
    );

    if (exists) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password manually for Postgres
    let hashedPassword = password;
    if (dbType === 'postgres') {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    const userId = user.id || user._id;

    const token = jwt.sign(
      { id: userId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      token,
      user: user.toJSON()
    });

  } catch (err) {
    console.error('Auth register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});


// ================= LOGIN =================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email & password required' });
    }

    // Fetch user
    const user = await (
      dbType === 'postgres'
        ? User.findOne({ where: { email } })
        : User.findOne({ email }).select('+password')
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    let match;

    if (dbType === 'postgres') {
      match = await bcrypt.compare(password, user.password);
    } else {
      match = await user.comparePassword(password);
    }

    if (!match) {
      return res.status(401).json({ error: 'Password incorrect' });
    }

    const userId = user.id || user._id;

    const token = jwt.sign(
      { id: userId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: user.toJSON()
    });

  } catch (err) {
    console.error('Auth login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;