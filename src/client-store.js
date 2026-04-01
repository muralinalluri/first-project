/**
 * Client Store
 * CRUD operations for client profiles stored as JSON files in clients/
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { config } from './config.js';

const DIR = config.output.clientsDir;

function ensureDir() {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
}

function slugify(name, company) {
  const base = `${name}-${company}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return base;
}

export class ClientStore {
  getAll() {
    ensureDir();
    return readdirSync(DIR)
      .filter(f => f.endsWith('.json') && f !== '.gitkeep')
      .map(f => {
        try { return JSON.parse(readFileSync(join(DIR, f), 'utf-8')); }
        catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getById(id) {
    ensureDir();
    const path = join(DIR, `${id}.json`);
    if (!existsSync(path)) return null;
    try { return JSON.parse(readFileSync(path, 'utf-8')); }
    catch { return null; }
  }

  create(data) {
    ensureDir();
    let id = slugify(data.name, data.company);
    // Handle slug collisions
    if (existsSync(join(DIR, `${id}.json`))) {
      id = `${id}-${Date.now()}`;
    }
    const client = {
      id,
      name: data.name,
      company: data.company || '',
      email: data.email || '',
      phone: data.phone || '',
      aumTier: data.aumTier || 'high-net-worth',
      riskProfile: data.riskProfile || 'moderate',
      relationshipStage: data.relationshipStage || 'prospect',
      productInterests: data.productInterests || [],
      advisorNotes: data.advisorNotes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeFileSync(join(DIR, `${id}.json`), JSON.stringify(client, null, 2));
    return client;
  }

  update(id, data) {
    const existing = this.getById(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...data,
      id,                               // id is immutable
      createdAt: existing.createdAt,    // createdAt is immutable
      updatedAt: new Date().toISOString(),
    };
    writeFileSync(join(DIR, `${id}.json`), JSON.stringify(updated, null, 2));
    return updated;
  }

  delete(id) {
    const path = join(DIR, `${id}.json`);
    if (!existsSync(path)) return false;
    unlinkSync(path);
    return true;
  }
}
