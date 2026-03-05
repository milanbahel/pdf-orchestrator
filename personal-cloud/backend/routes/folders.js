import { Router } from 'express';
import fs from 'fs';
import db, { nextId } from '../database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/folders
router.get('/', requireAuth, (req, res) => {
  const sorted = [...db.data.folders].sort((a, b) => a.name.localeCompare(b.name));
  res.json(sorted);
});

// POST /api/folders
router.post('/', requireAuth, async (req, res) => {
  const { name, parentId } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Folder name required' });
  }
  const folder = {
    id: nextId('folders'),
    name: name.trim(),
    parent_id: parentId || null,
    created_at: new Date().toISOString(),
  };
  db.data.folders.push(folder);
  await db.write();
  res.status(201).json(folder);
});

// DELETE /api/folders/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const filesToDelete = collectFiles(id);

  // Remove folders (cascade via our own logic)
  const toRemove = collectFolderIds(id);
  db.data.folders = db.data.folders.filter(f => !toRemove.has(f.id));
  db.data.files = db.data.files.filter(f => !filesToDelete.has(f.id));
  await db.write();

  // Delete from disk
  filesToDelete.forEach(({ storage_path }) => {
    try { fs.unlinkSync(storage_path); } catch {}
  });

  res.json({ ok: true });
});

function collectFolderIds(folderId) {
  const ids = new Set([folderId]);
  const children = db.data.folders.filter(f => f.parent_id === folderId);
  for (const c of children) {
    collectFolderIds(c.id).forEach(id => ids.add(id));
  }
  return ids;
}

function collectFiles(folderId) {
  const files = new Map();
  db.data.files.filter(f => f.folder_id === folderId).forEach(f => files.set(f.id, f));
  const children = db.data.folders.filter(f => f.parent_id === folderId);
  for (const c of children) {
    collectFiles(c.id).forEach((v, k) => files.set(k, v));
  }
  return files;
}

export default router;
