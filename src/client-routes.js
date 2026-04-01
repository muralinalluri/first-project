/**
 * Client CRM Routes
 * Registers all /api/clients/* routes on the Express app.
 */

import { ClientStore } from './client-store.js';
import { BriefSkill } from './brief-skill.js';

const store = new ClientStore();

/**
 * @param {import('express').Application} app
 * @param {() => {id: string, data: object}[]} getAllSummaries  — shared helper from server.js
 */
export function registerClientRoutes(app, getAllSummaries) {

  // ── GET /api/clients ───────────────────────────────────────────────────────
  app.get('/api/clients', (req, res) => {
    try {
      res.json({ clients: store.getAll() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/clients ──────────────────────────────────────────────────────
  app.post('/api/clients', (req, res) => {
    if (!req.body?.name?.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    try {
      const client = store.create(req.body);
      res.status(201).json({ client });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/clients/:id ───────────────────────────────────────────────────
  app.get('/api/clients/:id', (req, res) => {
    const client = store.getById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json({ client });
  });

  // ── PUT /api/clients/:id ───────────────────────────────────────────────────
  app.put('/api/clients/:id', (req, res) => {
    const updated = store.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Client not found' });
    res.json({ client: updated });
  });

  // ── DELETE /api/clients/:id ────────────────────────────────────────────────
  app.delete('/api/clients/:id', (req, res) => {
    const deleted = store.delete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Client not found' });
    res.json({ ok: true });
  });

  // ── POST /api/clients/:id/brief ────────────────────────────────────────────
  app.post('/api/clients/:id/brief', async (req, res) => {
    const client = store.getById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    // Pull recent meeting summaries to give the AI context
    const pastMeetings = getAllSummaries().map(s => s.data);

    try {
      const skill = new BriefSkill();
      const brief = await skill.generateBrief(client, pastMeetings);
      res.json({ brief, client });
    } catch (err) {
      console.error('[brief]', err.message);
      res.status(500).json({ error: err.message });
    }
  });
}
