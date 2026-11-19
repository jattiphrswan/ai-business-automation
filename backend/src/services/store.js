import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
const file = path.resolve(process.env.DATA_FILE || './src/data/store.json');
export function readStore() {
  if (!fs.existsSync(file)) return { inquiries: [], contacts: [], audit: [] };
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
export function writeStore(store) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(store, null, 2));
  fs.renameSync(temp, file);
}
export function logAudit(store, type, entityId, detail) {
  store.audit.unshift({ id: crypto.randomUUID(), type, entityId, detail, at: new Date().toISOString() });
}
