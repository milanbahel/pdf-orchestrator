import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'cloud.json');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const adapter = new JSONFile(DB_PATH);
const db = new Low(adapter, {
  users: [],
  folders: [],
  files: [],
  _seq: { users: 1, folders: 1, files: 1 },
});

// Load existing data
await db.read();

export function nextId(table) {
  const id = db.data._seq[table]++;
  return id;
}

export default db;
