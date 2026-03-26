/**
 * Express server — Voice Transcription & Meeting Summary App
 * Serves the UI and exposes API endpoints for:
 *   POST /api/transcribe   — upload audio blob → returns transcript
 *   POST /api/summarize    — transcript text   → returns summary JSON
 *   POST /api/email        — summary JSON       → returns email object
 */

import express from 'express';
import multer from 'multer';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Transcriber } from './src/transcriber.js';
import { Summarizer } from './src/summarizer.js';
import { EmailSkill } from './src/email-skill.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// ─── Directories ──────────────────────────────────────────────────────────────
['recordings', 'outputs'].forEach(dir => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

const upload = multer({
  dest: 'recordings/',
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

// ─── POST /api/transcribe ─────────────────────────────────────────────────────
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded.' });
  }

  // Rename to give it the correct extension (browser sends webm/ogg/wav)
  const originalName = req.file.originalname || 'recording.webm';
  const ext = originalName.split('.').pop() || 'webm';
  const destPath = `${req.file.path}.${ext}`;

  try {
    const { renameSync } = await import('fs');
    renameSync(req.file.path, destPath);

    const transcriber = new Transcriber();
    const transcript = await transcriber.transcribe(destPath);

    // Save transcript
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const txPath = join('outputs', `transcript-${timestamp}.txt`);
    writeFileSync(txPath, transcript);

    res.json({ transcript, savedAt: txPath });
  } catch (err) {
    console.error('[transcribe]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/summarize ──────────────────────────────────────────────────────
app.post('/api/summarize', async (req, res) => {
  const { transcript, meetingName, attendees } = req.body;
  if (!transcript?.trim()) {
    return res.status(400).json({ error: 'transcript is required.' });
  }

  try {
    const summarizer = new Summarizer();
    const summary = await summarizer.summarize(transcript, {
      meetingName,
      attendees: attendees ? attendees.split(',').map(a => a.trim()) : [],
    });

    const { jsonPath, mdPath } = summarizer.saveSummary(summary);
    res.json({ summary, jsonPath, mdPath });
  } catch (err) {
    console.error('[summarize]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/email ──────────────────────────────────────────────────────────
app.post('/api/email', async (req, res) => {
  const { summary, tone, senderName, senderTitle, recipients } = req.body;
  if (!summary) {
    return res.status(400).json({ error: 'summary is required.' });
  }

  try {
    const skill = new EmailSkill();
    const email = await skill.generateEmail(summary, {
      tone: tone || 'formal',
      senderName: senderName || 'Meeting Organizer',
      senderTitle: senderTitle || '',
      recipients: recipients ? recipients.split(',').map(r => r.trim()) : [],
    });

    const { htmlPath, txtPath } = skill.saveEmail(email);
    res.json({ email, htmlPath, txtPath });
  } catch (err) {
    console.error('[email]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  Voice Transcription App running at http://localhost:${PORT}\n`);
});
