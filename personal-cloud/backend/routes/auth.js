import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db, { nextId } from '../database.js';
import { JWT_SECRET } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/setup — first-run account creation (locks after first user)
router.post('/setup', async (req, res) => {
  if (db.data.users.length > 0) {
    return res.status(403).json({ error: 'Setup already completed' });
  }
  const { username, password } = req.body;
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: 'Username and password (min 6 chars) required' });
  }
  const hash = bcrypt.hashSync(password, 12);
  const user = { id: nextId('users'), username, password_hash: hash, created_at: new Date().toISOString() };
  db.data.users.push(user);
  await db.write();
  const token = jwt.sign({ id: user.id, username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, username });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.data.users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, username: user.username });
});

// GET /api/auth/me — check setup status
router.get('/me', (req, res) => {
  res.json({ setupRequired: db.data.users.length === 0 });
});

export default router;
