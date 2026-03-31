/**
 * Express server — Voice Transcription & Meeting Summary App
 * Serves the UI and exposes API endpoints for:
 *   POST /api/transcribe   — upload audio blob → returns transcript
 *   POST /api/summarize    — transcript text   → returns summary JSON
 *   POST /api/email        — summary JSON       → returns email object
 */

import express from 'express';
import multer from 'multer';
import { mkdirSync, existsSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Transcriber } from './src/transcriber.js';
import { Summarizer } from './src/summarizer.js';
import { EmailSkill } from './src/email-skill.js';
import { AgendaSkill } from './src/agenda-skill.js';
import { InsightsSkill } from './src/insights-skill.js';
import { SentimentSkill } from './src/sentiment-skill.js';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const EXCLUDED_TITLES = new Set([
  'unknown meeting',
  'untitled meeting',
  'unknown / incomplete meeting',
  'unknown/incomplete meeting',
]);

function isValidMeeting(data) {
  const title = (data?.title || '').trim().toLowerCase();
  return title !== '' && !EXCLUDED_TITLES.has(title);
}

function getAllSummaries() {
  if (!existsSync('outputs')) return [];
  return readdirSync('outputs')
    .filter(f => f.startsWith('summary-') && f.endsWith('.json'))
    .sort()
    .map(f => {
      try { return { id: f.replace('.json', ''), data: JSON.parse(readFileSync(join('outputs', f), 'utf-8')) }; }
      catch { return null; }
    })
    .filter(entry => entry && isValidMeeting(entry.data));
}

function getLatestSummary() {
  const all = getAllSummaries();
  return all.length ? all[all.length - 1].data : null;
}

// ─── GET /api/meetings ────────────────────────────────────────────────────────
app.get('/api/meetings', (req, res) => {
  const summaries = getAllSummaries().reverse();
  const meetings = summaries.map(({ id, data }) => ({
    id,
    title: data.title || 'Untitled Meeting',
    date: data.date || '',
    sentiment: data.sentiment || 'neutral',
    attendeeCount: data.attendees?.length || 0,
    actionItemCount: data.actionItems?.length || 0,
    overview: data.overview || '',
    keyPoints: data.keyPoints || [],
    decisions: data.decisions || [],
    actionItems: data.actionItems || [],
    nextSteps: data.nextSteps || [],
    attendees: data.attendees || [],
  }));
  res.json({ meetings });
});

// ─── POST /api/skills/create-agenda ──────────────────────────────────────────
app.post('/api/skills/create-agenda', async (req, res) => {
  const { summaryId } = req.body;
  let summary;
  if (summaryId) {
    const found = getAllSummaries().find(s => s.id === summaryId);
    summary = found?.data || null;
  } else {
    summary = getLatestSummary();
  }
  if (!summary) {
    return res.status(404).json({ error: 'No summaries found. Record and summarize a meeting first.' });
  }
  try {
    const skill = new AgendaSkill();
    const agenda = await skill.generateAgenda(summary);
    res.json({ agenda, title: summary.title });
  } catch (err) {
    console.error('[create-agenda]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/skills/export-action-items ────────────────────────────────────
app.post('/api/skills/export-action-items', (req, res) => {
  const { summaryId } = req.body;
  let summaries = getAllSummaries();
  if (!summaries.length) {
    return res.status(404).json({ error: 'No summaries found. Record and summarize a meeting first.' });
  }
  if (summaryId) {
    summaries = summaries.filter(s => s.id === summaryId);
  }

  let markdownLines = [];
  let slackLines = [];
  let totalCount = 0;

  summaries.reverse().forEach(({ data }) => {
    if (!data.actionItems?.length) return;
    markdownLines.push(`## ${data.title || 'Meeting'} (${data.date || ''})`);
    markdownLines.push('| Task | Owner | Deadline |');
    markdownLines.push('|------|-------|----------|');
    slackLines.push(`*${data.title || 'Meeting'}*`);
    data.actionItems.forEach(item => {
      markdownLines.push(`| ${item.task} | ${item.owner} | ${item.deadline} |`);
      slackLines.push(`□ ${item.task} (${item.owner}) — Due: ${item.deadline}`);
      totalCount++;
    });
    markdownLines.push('');
    slackLines.push('');
  });

  const markdown = `# Action Items — All Meetings\n\n${markdownLines.join('\n')}`;
  const slack = slackLines.join('\n');

  res.json({ markdown, slack, count: totalCount });
});

// ─── POST /api/skills/generate-email ─────────────────────────────────────────
app.post('/api/skills/generate-email', async (req, res) => {
  const { summaryId, tone = 'formal' } = req.body;
  let summary;
  if (summaryId) {
    const found = getAllSummaries().find(s => s.id === summaryId);
    summary = found?.data || null;
  } else {
    summary = getLatestSummary();
  }
  if (!summary) {
    return res.status(404).json({ error: 'No summaries found. Record and summarize a meeting first.' });
  }
  try {
    const skill = new EmailSkill();
    const email = await skill.generateEmail(summary, { tone });
    const { htmlPath, txtPath } = skill.saveEmail(email);
    res.json({ email, htmlPath, txtPath, title: summary.title });
  } catch (err) {
    console.error('[generate-email]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/skills/thank-you-email ────────────────────────────────────────
app.post('/api/skills/thank-you-email', async (req, res) => {
  const { summaryId, tone = 'formal' } = req.body;
  let summary;
  if (summaryId) {
    const found = getAllSummaries().find(s => s.id === summaryId);
    summary = found?.data || null;
  } else {
    summary = getLatestSummary();
  }
  if (!summary) {
    return res.status(404).json({ error: 'No summaries found. Record and summarize a meeting first.' });
  }
  try {
    const skill = new EmailSkill();
    const email = await skill.generateEmail(summary, { tone, emailType: 'thank-you' });
    const { htmlPath, txtPath } = skill.saveEmail(email, 'thankyou-email');
    res.json({ email, htmlPath, txtPath, title: summary.title });
  } catch (err) {
    console.error('[thank-you-email]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/skills/meeting-stats ──────────────────────────────────────────
app.post('/api/skills/meeting-stats', (req, res) => {
  const summaries = getAllSummaries();
  if (!summaries.length) {
    return res.status(404).json({ error: 'No summaries found. Record and summarize a meeting first.' });
  }

  const sentiment = { positive: 0, neutral: 0, negative: 0 };
  const attendeeCount = {};
  const ownerCount = {};
  let totalActionItems = 0;
  let actionItemsWithDeadline = 0;
  let followUpCount = 0;

  summaries.forEach(({ data }) => {
    const s = (data.sentiment || 'neutral').toLowerCase();
    if (s in sentiment) sentiment[s]++;
    data.attendees?.forEach(a => { attendeeCount[a] = (attendeeCount[a] || 0) + 1; });
    data.actionItems?.forEach(item => {
      totalActionItems++;
      if (item.deadline && item.deadline !== 'Not specified') actionItemsWithDeadline++;
      if (item.owner && item.owner !== 'TBD') ownerCount[item.owner] = (ownerCount[item.owner] || 0) + 1;
    });
    if (data.followUpRequired) followUpCount++;
  });

  const topAttendees = Object.entries(attendeeCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topOwners = Object.entries(ownerCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const total = summaries.length;
  const avgActions = total ? (totalActionItems / total).toFixed(1) : 0;

  const report = [
    `## 📊 Meeting Stats Report`,
    ``,
    `### 📅 Overview`,
    `- **Total meetings:** ${total}`,
    `- **Date range:** ${summaries[0].data.date || 'N/A'} → ${summaries[total - 1].data.date || 'N/A'}`,
    `- **Total action items:** ${totalActionItems}`,
    `- **Avg action items per meeting:** ${avgActions}`,
    `- **Meetings requiring follow-up:** ${followUpCount}`,
    ``,
    `### 😊 Sentiment Breakdown`,
    `- ✅ Positive: ${sentiment.positive}`,
    `- 😐 Neutral: ${sentiment.neutral}`,
    `- ⚠️ Negative: ${sentiment.negative}`,
    ``,
    `### ✅ Action Item Insights`,
    `- Total: ${totalActionItems}`,
    `- With specific deadlines: ${actionItemsWithDeadline}`,
    `- Without deadlines: ${totalActionItems - actionItemsWithDeadline}`,
    topOwners.length ? `- Top assignees: ${topOwners.map(([n, c]) => `${n} (${c})`).join(', ')}` : '',
    ``,
    `### 👥 Top Attendees`,
    topAttendees.length
      ? topAttendees.map(([name, count]) => `- ${name}: ${count} meeting${count > 1 ? 's' : ''}`).join('\n')
      : '- No attendee data recorded',
  ].filter(l => l !== undefined).join('\n');

  res.json({ report, totalMeetings: total, sentiment, totalActionItems });
});

// ─── POST /api/skills/sentiment-analysis ─────────────────────────────────────
app.post('/api/skills/sentiment-analysis', async (req, res) => {
  const { summaryId } = req.body;
  let summary;
  if (summaryId) {
    const found = getAllSummaries().find(s => s.id === summaryId);
    summary = found?.data || null;
  } else {
    summary = getLatestSummary();
  }
  if (!summary) {
    return res.status(404).json({ error: 'No summaries found. Record and summarize a meeting first.' });
  }
  try {
    const skill = new SentimentSkill();
    const analysis = await skill.analyze(summary);
    res.json({ analysis, title: summary.title });
  } catch (err) {
    console.error('[sentiment-analysis]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/insights ───────────────────────────────────────────────────────
app.post('/api/insights', async (req, res) => {
  const { range = 'all' } = req.body;
  let summaries = getAllSummaries();

  if (range !== 'all') {
    const days = { '7d': 7, '30d': 30, '90d': 90 }[range] || 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    summaries = summaries.filter(({ id }) => {
      const raw = id.replace('summary-', '');
      const normalized = raw.replace(/T(\d{2})-(\d{2})-(\d{2})$/, 'T$1:$2:$3');
      return new Date(normalized) >= cutoff;
    });
  }

  if (!summaries.length) {
    return res.status(404).json({ error: 'No meetings found for this time range.' });
  }

  try {
    const skill = new InsightsSkill();
    const insights = await skill.extractKeywords(summaries);
    res.json({ ...insights, meetingCount: summaries.length, range,
      meetingTitles: summaries.map(s => s.data.title || 'Untitled') });
  } catch (err) {
    console.error('[insights]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  Voice Transcription App running at http://localhost:${PORT}\n`);
});
