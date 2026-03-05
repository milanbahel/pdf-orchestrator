import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import db, { nextId } from '../database.js';
import { requireAuth } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, '..', 'storage');
fs.mkdirSync(STORAGE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, STORAGE_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 }, // 10 GB
});

const router = Router();

// GET /api/files?folderId=x
router.get('/', requireAuth, (req, res) => {
  const folderId = req.query.folderId ? parseInt(req.query.folderId) : null;
  const files = db.data.files
    .filter(f => f.folder_id === folderId)
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json(files);
});

// POST /api/files/upload
router.post('/upload', requireAuth, upload.array('files'), async (req, res) => {
  const folderId = req.body.folderId ? parseInt(req.body.folderId) : null;
  const inserted = [];

  for (const file of req.files) {
    const record = {
      id: nextId('files'),
      name: file.originalname,
      mime_type: file.mimetype,
      size: file.size,
      folder_id: folderId,
      storage_path: file.path,
      created_at: new Date().toISOString(),
    };
    db.data.files.push(record);
    inserted.push(record);
  }

  await db.write();
  res.status(201).json(inserted);
});

// GET /api/files/:id/download
router.get('/:id/download', requireAuth, (req, res) => {
  const file = db.data.files.find(f => f.id === parseInt(req.params.id));
  if (!file) return res.status(404).json({ error: 'File not found' });
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
  res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
  res.sendFile(file.storage_path);
});

// GET /api/files/:id/preview
router.get('/:id/preview', requireAuth, (req, res) => {
  const file = db.data.files.find(f => f.id === parseInt(req.params.id));
  if (!file) return res.status(404).json({ error: 'File not found' });
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
  res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
  res.sendFile(file.storage_path);
});

// DELETE /api/files/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const file = db.data.files.find(f => f.id === id);
  if (!file) return res.status(404).json({ error: 'File not found' });
  db.data.files = db.data.files.filter(f => f.id !== id);
  await db.write();
  try { fs.unlinkSync(file.storage_path); } catch {}
  res.json({ ok: true });
});

export default router;
