/* ── State ─────────────────────────────────────────────────────────────────── */
const state = {
  audioBlob: null,
  audioUrl: null,
  audioFilename: null,
  transcript: '',
  summary: null,
  email: null,
  currentStep: 1,
};

/* ── DOM helpers ───────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

function toast(msg, duration = 2800) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.add('hidden'), duration);
}

/* ── Step navigation ───────────────────────────────────────────────────────── */
function goToStep(n) {
  state.currentStep = n;
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.step').forEach((s, i) => {
    s.classList.remove('active', 'done');
    const sn = i + 1;
    if (sn < n) s.classList.add('done');
    else if (sn === n) s.classList.add('active');
  });
  const panels = ['panel-record', 'panel-transcribe', 'panel-summary', 'panel-email'];
  $( panels[n - 1] ).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── API key health check ──────────────────────────────────────────────────── */
async function checkApiStatus() {
  const el = $('api-status');
  try {
    // Try a tiny summarize call to confirm the API key works
    const r = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'test' }),
    });
    if (r.status === 500) {
      const d = await r.json();
      if (d.error?.includes('API_KEY') || d.error?.includes('api key') || d.error?.includes('authentication')) {
        el.textContent = 'API key missing';
        el.className = 'api-status err';
        return;
      }
    }
    el.textContent = 'API connected';
    el.className = 'api-status ok';
  } catch {
    el.textContent = 'Server offline';
    el.className = 'api-status err';
  }
}

/* ════════════════════════════════════════════════════════════════════════════
   PANEL 1 — RECORD
════════════════════════════════════════════════════════════════════════════ */
let mediaRecorder = null;
let audioChunks = [];
let timerInterval = null;
let timerSeconds = 0;
let analyser = null;
let animFrame = null;
let recognition = null;
let speechTranscript = '';

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function drawVisualizer() {
  const canvas = $('visualizer');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  function draw() {
    animFrame = requestAnimationFrame(draw);
    if (!analyser) { ctx.clearRect(0, 0, W, H); return; }

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    ctx.fillStyle = '#003087';
    ctx.fillRect(0, 0, W, H);

    const bars = 60;
    const barW = W / bars;
    for (let i = 0; i < bars; i++) {
      const idx = Math.floor(i * data.length / bars);
      const v = data[idx] / 255;
      const h = v * H * 0.9;
      const alpha = 0.5 + v * 0.5;
      // Gradient from blue to gold based on intensity
      const r = Math.round(0 + v * 181);
      const g = Math.round(94 + v * 52);
      const b = Math.round(184 * (1 - v * 0.7));
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.beginPath();
      ctx.roundRect(i * barW + 1, (H - h) / 2, barW - 2, h, 2);
      ctx.fill();
    }
  }
  draw();
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Set up analyser
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);

    drawVisualizer();

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/ogg';

    mediaRecorder = new MediaRecorder(stream, { mimeType });
    audioChunks = [];

    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
      const blob = new Blob(audioChunks, { type: mimeType });
      state.audioBlob = blob;
      state.audioFilename = `recording.${ext}`;
      state.audioUrl = URL.createObjectURL(blob);
      showAudioPreview(state.audioUrl, state.audioFilename, formatTime(timerSeconds));
      $('btn-to-transcribe').disabled = false;
      stream.getTracks().forEach(t => t.stop());
      analyser = null;
    };

    mediaRecorder.start(100);

    // Speech recognition for transcription
    speechTranscript = '';
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      let finalTranscript = '';
      recognition.onresult = e => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript + ' ';
          else interim += e.results[i][0].transcript;
        }
        speechTranscript = (finalTranscript + interim).trim();
      };
      recognition.start();
    }

    // Timer
    timerSeconds = 0;
    $('timer').textContent = '00:00';
    $('timer').classList.add('recording');
    timerInterval = setInterval(() => {
      timerSeconds++;
      $('timer').textContent = formatTime(timerSeconds);
    }, 1000);

    $('btn-record').classList.add('recording');
    $('btn-record').querySelector('.btn-record-icon').textContent = '●';
    $('btn-record').lastChild.textContent = ' Recording…';
    $('btn-record').disabled = true;
    $('btn-stop').disabled = false;

  } catch (err) {
    toast(`Microphone error: ${err.message}`);
  }
}

function stopRecording() {
  if (mediaRecorder?.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (recognition) { recognition.stop(); recognition = null; }
  clearInterval(timerInterval);
  $('timer').classList.remove('recording');
  $('btn-record').classList.remove('recording');
  $('btn-record').disabled = false;
  const icon = $('btn-record').querySelector('.btn-record-icon');
  icon.textContent = '●';
  $('btn-record').childNodes[1].textContent = ' Start Recording';
  $('btn-stop').disabled = true;
  cancelAnimationFrame(animFrame);
}

function showAudioPreview(url, name, duration) {
  const preview = $('audio-preview');
  $('audio-player').src = url;
  $('audio-filename').textContent = name;
  $('audio-duration').textContent = duration;
  show(preview);
}

$('btn-record').addEventListener('click', startRecording);
$('btn-stop').addEventListener('click', stopRecording);

// File upload
$('file-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  state.audioBlob = file;
  state.audioFilename = file.name;
  state.audioUrl = URL.createObjectURL(file);
  $('upload-label').textContent = file.name;
  showAudioPreview(state.audioUrl, file.name, '');
  $('btn-to-transcribe').disabled = false;
});

// Drag-and-drop on upload area
const uploadArea = $('upload-area');
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) $('file-input').dispatchEvent(Object.assign(new Event('change'), { target: { files: [file] } }));
  // Manually handle since we can't set .files
  if (file) {
    state.audioBlob = file;
    state.audioFilename = file.name;
    state.audioUrl = URL.createObjectURL(file);
    $('upload-label').textContent = file.name;
    showAudioPreview(state.audioUrl, file.name, '');
    $('btn-to-transcribe').disabled = false;
  }
});

// Go to transcribe → upload and transcribe
$('btn-to-transcribe').addEventListener('click', async () => {
  goToStep(2);

  hide($('transcribe-empty'));
  hide($('transcribe-content'));
  show($('transcribe-loading'));
  $('btn-to-summarize').disabled = true;

  hide($('transcribe-loading'));

  if (speechTranscript) {
    // Use transcript captured via Web Speech API during recording
    state.transcript = speechTranscript;
    $('transcript-text').value = state.transcript;
    updateWordCount();
    show($('transcribe-content'));
    $('btn-to-summarize').disabled = false;
  } else {
    // Uploaded file or speech API unavailable — prompt manual entry
    state.transcript = '';
    $('transcript-text').value = '';
    updateWordCount();
    show($('transcribe-content'));
    $('btn-to-summarize').disabled = true;
    toast('Speech recognition unavailable for uploaded files. Please type or paste the transcript below.', 6000);
  }
});

/* ════════════════════════════════════════════════════════════════════════════
   PANEL 2 — TRANSCRIBE
════════════════════════════════════════════════════════════════════════════ */
function updateWordCount() {
  const text = $('transcript-text').value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  $('word-count').textContent = `${words} word${words !== 1 ? 's' : ''}`;
}

$('transcript-text').addEventListener('input', () => {
  state.transcript = $('transcript-text').value;
  updateWordCount();
  $('btn-to-summarize').disabled = !state.transcript.trim();
});

$('btn-clear-transcript').addEventListener('click', () => {
  $('transcript-text').value = '';
  state.transcript = '';
  updateWordCount();
  $('btn-to-summarize').disabled = true;
});

$('btn-back-to-record').addEventListener('click', () => goToStep(1));

$('btn-to-summarize').addEventListener('click', async () => {
  state.transcript = $('transcript-text').value;
  if (!state.transcript.trim()) return;

  goToStep(3);
  hide($('summary-content'));
  show($('summary-loading'));
  $('btn-to-email').disabled = true;

  try {
    const res = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: state.transcript,
        meetingName: $('meeting-name').value.trim() || undefined,
        attendees: $('attendees').value.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Summarization failed');

    state.summary = data.summary;
    renderSummary(data.summary, data.jsonPath, data.mdPath);
    hide($('summary-loading'));
    show($('summary-content'));
    $('btn-to-email').disabled = false;

  } catch (err) {
    hide($('summary-loading'));
    toast(`Summarization failed: ${err.message}`, 5000);
    goToStep(2);
  }
});

/* ════════════════════════════════════════════════════════════════════════════
   PANEL 3 — SUMMARY
════════════════════════════════════════════════════════════════════════════ */
function renderSummary(s, jsonPath, mdPath) {
  $('sum-title').textContent = s.title || 'Meeting Summary';

  const badge = $('sum-sentiment');
  const sentiment = (s.sentiment || 'neutral').toLowerCase();
  badge.textContent = sentiment;
  badge.className = `badge ${sentiment}`;

  $('sum-overview').textContent = s.overview || '';

  renderList('sum-keypoints', s.keyPoints);
  renderList('sum-decisions', s.decisions);
  renderList('sum-nextsteps', s.nextSteps);

  // Action items table
  const tbody = $('sum-actions');
  tbody.innerHTML = '';
  if (s.actionItems?.length) {
    s.actionItems.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(item.task)}</td><td>${esc(item.owner)}</td><td>${esc(item.deadline)}</td>`;
      tbody.appendChild(tr);
    });
  } else {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="3" style="color:var(--text-muted);font-style:italic">No action items identified</td>`;
    tbody.appendChild(tr);
  }

  // Attendees chips
  const chips = $('sum-attendees');
  chips.innerHTML = '';
  if (s.attendees?.length) {
    s.attendees.forEach(a => {
      const c = document.createElement('span');
      c.className = 'chip';
      c.textContent = a;
      chips.appendChild(c);
    });
  } else {
    chips.innerHTML = '<span style="color:var(--text-muted);font-size:.85rem">Not specified</span>';
  }

  // Download links (paths are server-side; show as labels only)
  $('link-summary-json').textContent = jsonPath?.split('/').pop() || 'summary.json';
  $('link-summary-json').href = '#';
  $('link-summary-md').textContent  = mdPath?.split('/').pop()  || 'summary.md';
  $('link-summary-md').href = '#';
}

function renderList(id, items) {
  const el = $(id);
  el.innerHTML = '';
  if (!items?.length) {
    const li = document.createElement('li');
    li.style.fontStyle = 'italic';
    li.style.color = 'var(--text-muted)';
    li.textContent = 'None noted';
    el.appendChild(li);
    return;
  }
  items.forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    el.appendChild(li);
  });
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

$('btn-back-to-transcribe').addEventListener('click', () => goToStep(2));

$('btn-to-email').addEventListener('click', () => goToStep(4));

/* ════════════════════════════════════════════════════════════════════════════
   PANEL 4 — EMAIL
════════════════════════════════════════════════════════════════════════════ */
// Tone selection
document.querySelectorAll('.tone-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tone-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

$('btn-generate-email').addEventListener('click', async () => {
  if (!state.summary) { toast('No summary available. Complete step 3 first.'); return; }

  const tone = document.querySelector('.tone-btn.active')?.dataset.tone || 'formal';

  hide($('email-content'));
  show($('email-loading'));
  $('btn-generate-email').disabled = true;

  try {
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: state.summary,
        tone,
        senderName: $('sender-name').value.trim() || undefined,
        senderTitle: $('sender-title').value.trim() || undefined,
        recipients: $('email-recipients').value.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Email generation failed');

    state.email = data.email;
    renderEmail(data.email, data.htmlPath, data.txtPath);
    hide($('email-loading'));
    show($('email-content'));

  } catch (err) {
    hide($('email-loading'));
    toast(`Email generation failed: ${err.message}`, 5000);
  } finally {
    $('btn-generate-email').disabled = false;
  }
});

function renderEmail(email, htmlPath, txtPath) {
  $('email-subject').textContent = email.subject;
  $('email-body').innerHTML = email.body;

  $('link-email-html').textContent = htmlPath?.split('/').pop() || 'email.html';
  $('link-email-html').href = '#';
  $('link-email-txt').textContent  = txtPath?.split('/').pop()  || 'email.txt';
  $('link-email-txt').href = '#';
}

$('btn-copy-email').addEventListener('click', () => {
  if (!state.email?.plainText) { toast('No email to copy yet.'); return; }
  navigator.clipboard.writeText(`Subject: ${state.email.subject}\n\n${state.email.plainText}`)
    .then(() => toast('Copied to clipboard!'))
    .catch(() => toast('Copy failed — please select and copy manually.'));
});

$('btn-back-to-summary').addEventListener('click', () => goToStep(3));

$('btn-start-over').addEventListener('click', () => {
  // Reset state
  Object.assign(state, { audioBlob: null, audioUrl: null, audioFilename: null,
    transcript: '', summary: null, email: null });

  if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);

  $('transcript-text').value = '';
  $('meeting-name').value = '';
  $('attendees').value = '';
  $('upload-label').textContent = 'Click to upload audio / video file';
  $('timer').textContent = '00:00';
  hide($('audio-preview'));
  $('btn-to-transcribe').disabled = true;

  hide($('email-content'));
  hide($('email-loading'));

  goToStep(1);
});

/* ── Init ───────────────────────────────────────────────────────────────────── */
checkApiStatus();

/* ════════════════════════════════════════════════════════════════════════════
   MEETINGS DASHBOARD
════════════════════════════════════════════════════════════════════════════ */
let meetingsData = [];
let selectedMeetingIndex = null;

// ── Open / close overlay ─────────────────────────────────────────────────────
$('btn-meetings').addEventListener('click', () => {
  show($('meetings-overlay'));
  loadMeetings();
});

$('btn-close-meetings').addEventListener('click', () => {
  hide($('meetings-overlay'));
  clearMeetingSelection();
});

$('meetings-overlay').addEventListener('click', e => {
  if (e.target === $('meetings-overlay')) {
    hide($('meetings-overlay'));
    clearMeetingSelection();
  }
});

$('btn-clear-selection').addEventListener('click', clearMeetingSelection);

function clearMeetingSelection() {
  selectedMeetingIndex = null;
  document.querySelectorAll('.meeting-card').forEach(c => c.classList.remove('selected'));
  hide($('skill-meeting-indicator'));
  show($('skill-no-selection'));
}

function selectMeeting(index) {
  selectedMeetingIndex = index;
  document.querySelectorAll('.meeting-card').forEach((c, i) => {
    c.classList.toggle('selected', i === index);
  });
  $('skill-meeting-name').textContent = meetingsData[index].title;
  show($('skill-meeting-indicator'));
  hide($('skill-no-selection'));
}

// ── Load meetings list ────────────────────────────────────────────────────────
async function loadMeetings() {
  const list = $('meetings-list');
  // Clear previous cards (keep the empty message element)
  Array.from(list.children).forEach(c => { if (c.id !== 'meetings-empty') c.remove(); });
  selectedMeetingIndex = null;
  hide($('skill-meeting-indicator'));
  show($('skill-no-selection'));

  try {
    const res = await fetch('/api/meetings');
    const data = await res.json();
    meetingsData = data.meetings || [];

    if (!meetingsData.length) {
      show($('meetings-empty'));
      return;
    }
    hide($('meetings-empty'));
    meetingsData.forEach((meeting, i) => list.appendChild(renderMeetingCard(meeting, i)));
  } catch {
    show($('meetings-empty'));
    $('meetings-empty').textContent = 'Failed to load meetings. Is the server running?';
  }
}

// ── Render a meeting card ─────────────────────────────────────────────────────
function renderMeetingCard(meeting, index) {
  const card = document.createElement('div');
  card.className = 'meeting-card';
  const sentiment = (meeting.sentiment || 'neutral').toLowerCase();
  card.innerHTML = `
    <div class="meeting-card-top">
      <div class="meeting-card-title">${esc(meeting.title)}</div>
      <button class="btn-view-detail" title="View full summary">View →</button>
    </div>
    <div class="meeting-card-meta">
      <span class="meeting-card-date">${esc(meeting.date)}</span>
      <span class="badge ${sentiment}">${esc(sentiment)}</span>
      <span class="meeting-card-stat">${meeting.attendeeCount} attendee${meeting.attendeeCount !== 1 ? 's' : ''}</span>
      <span class="meeting-card-stat">${meeting.actionItemCount} action${meeting.actionItemCount !== 1 ? 's' : ''}</span>
    </div>
  `;
  // Click card = select for skills
  card.addEventListener('click', e => {
    if (e.target.closest('.btn-view-detail')) return;
    selectMeeting(index);
  });
  // Click "View →" = open detail modal
  card.querySelector('.btn-view-detail').addEventListener('click', e => {
    e.stopPropagation();
    openMeetingDetail(index);
  });
  return card;
}

// ── Meeting detail modal ──────────────────────────────────────────────────────
function openMeetingDetail(index) {
  const m = meetingsData[index];
  $('modal-title').textContent = m.title;

  const body = $('modal-body');
  const list = items => items?.length
    ? `<ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`
    : '<p style="color:var(--text-muted);font-style:italic">None noted</p>';

  const actionTable = m.actionItems?.length
    ? `<table class="action-table"><thead><tr><th>Task</th><th>Owner</th><th>Deadline</th></tr></thead><tbody>
        ${m.actionItems.map(i => `<tr><td>${esc(i.task)}</td><td>${esc(i.owner)}</td><td>${esc(i.deadline)}</td></tr>`).join('')}
      </tbody></table>`
    : '<p style="color:var(--text-muted);font-style:italic">No action items</p>';

  body.innerHTML = `
    <h3>Overview</h3><p>${esc(m.overview)}</p>
    <h3>Key Points</h3>${list(m.keyPoints)}
    <h3>Decisions Made</h3>${list(m.decisions)}
    <h3>Action Items</h3>${actionTable}
    <h3>Next Steps</h3>${list(m.nextSteps)}
    ${m.attendees?.length ? `<h3>Attendees</h3><div class="attendee-chips">${m.attendees.map(a => `<span class="chip">${esc(a)}</span>`).join('')}</div>` : ''}
  `;

  show($('meeting-detail-modal'));
}

$('btn-close-modal').addEventListener('click', () => hide($('meeting-detail-modal')));
$('meeting-detail-modal').addEventListener('click', e => {
  if (e.target === $('meeting-detail-modal')) hide($('meeting-detail-modal'));
});

// ── Skill result helpers ──────────────────────────────────────────────────────
function showSkillResult(title, loading, content = '') {
  const area = $('skill-result-area');
  show(area);
  $('skill-result-title').textContent = title;
  if (loading) {
    show($('skill-loading'));
    $('skill-loading-text').textContent = content || 'Running…';
    hide($('skill-result-content'));
  } else {
    hide($('skill-loading'));
    $('skill-result-content').textContent = content;
    show($('skill-result-content'));
  }
}

$('btn-close-skill-result').addEventListener('click', () => hide($('skill-result-area')));

$('btn-copy-skill-result').addEventListener('click', () => {
  const text = $('skill-result-content').textContent;
  navigator.clipboard.writeText(text)
    .then(() => toast('Copied!'))
    .catch(() => toast('Copy failed'));
});

// ── Skill helpers ─────────────────────────────────────────────────────────────
function selectedSummaryId() {
  return selectedMeetingIndex !== null ? meetingsData[selectedMeetingIndex]?.id : null;
}

function skillLabel(base) {
  if (selectedMeetingIndex !== null) return `${base} — ${meetingsData[selectedMeetingIndex].title}`;
  return `${base} — Latest Meeting`;
}

// ── Skill: Create Agenda ──────────────────────────────────────────────────────
$('skill-agenda').addEventListener('click', async () => {
  const label = skillLabel('Create Agenda');
  showSkillResult(label, true, 'Generating agenda with Claude AI…');
  try {
    const body = JSON.stringify({ summaryId: selectedSummaryId() });
    const res = await fetch('/api/skills/create-agenda', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showSkillResult(label, false, data.agenda);
  } catch (err) {
    showSkillResult(label, false, `Error: ${err.message}`);
  }
});

// ── Skill: Export Action Items ────────────────────────────────────────────────
$('skill-export').addEventListener('click', async () => {
  const label = skillLabel('Export Action Items');
  showSkillResult(label, true, 'Collecting action items…');
  try {
    const body = JSON.stringify({ summaryId: selectedSummaryId() });
    const res = await fetch('/api/skills/export-action-items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showSkillResult(label, false, `${data.count} action item${data.count !== 1 ? 's' : ''} found\n\n--- MARKDOWN ---\n${data.markdown}\n\n--- SLACK ---\n${data.slack}`);
  } catch (err) {
    showSkillResult(label, false, `Error: ${err.message}`);
  }
});

// ── Skill: Follow-up Email ────────────────────────────────────────────────────
document.querySelectorAll('.btn-tone-mini').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-tone-mini').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

$('skill-email').addEventListener('click', async () => {
  const tone = document.querySelector('.btn-tone-mini.active')?.dataset.tone || 'formal';
  const label = skillLabel(`Follow-up Email (${tone})`);
  showSkillResult(label, true, 'Drafting email with Claude AI…');
  try {
    const body = JSON.stringify({ summaryId: selectedSummaryId(), tone });
    const res = await fetch('/api/skills/generate-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showSkillResult(label, false, `Subject: ${data.email.subject}\n\n${data.email.plainText}\n\n---\nSaved: ${data.txtPath}`);
  } catch (err) {
    showSkillResult(label, false, `Error: ${err.message}`);
  }
});

/* ════════════════════════════════════════════════════════════════════════════
   INSIGHTS TAB
════════════════════════════════════════════════════════════════════════════ */
const CATEGORY_COLORS = {
  economics:  '#B5923A',
  finance:    '#003087',
  hr:         '#005EB8',
  technology: '#0891B2',
  strategy:   '#7C3AED',
  market:     '#0D7A4E',
  operations: '#C2410C',
  other:      '#5A7399',
};

let insightsCache = {};  // keyed by range

$('btn-insights').addEventListener('click', () => {
  show($('insights-overlay'));
  loadInsights(document.querySelector('.range-tab.active')?.dataset.range || 'all');
});

$('btn-close-insights').addEventListener('click', () => { hide($('insights-overlay')); insightsCache = {}; });
$('insights-overlay').addEventListener('click', e => {
  if (e.target === $('insights-overlay')) hide($('insights-overlay'));
});

document.querySelectorAll('.range-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.range-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadInsights(btn.dataset.range);
  });
});

async function loadInsights(range) {
  if (insightsCache[range]) {
    renderInsights(insightsCache[range]);
    return;
  }

  hide($('insights-content'));
  hide($('insights-empty'));
  show($('insights-loading'));

  try {
    const res = await fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ range }),
    });
    const data = await res.json();
    hide($('insights-loading'));

    if (!res.ok) {
      $('insights-empty-msg').textContent = data.error || 'No data available.';
      show($('insights-empty'));
      return;
    }

    insightsCache[range] = data;
    renderInsights(data);
  } catch (err) {
    hide($('insights-loading'));
    $('insights-empty-msg').textContent = 'Failed to load insights. Is the server running?';
    show($('insights-empty'));
  }
}

function renderInsights(data) {
  hide($('insights-loading'));
  hide($('insights-empty'));

  $('insights-meta').textContent =
    `${data.meetingCount} meeting${data.meetingCount !== 1 ? 's' : ''} analysed · ${data.keywords.length} keywords extracted`;

  renderWordCloud(data.keywords);
  renderBarChart(data.keywords);
  renderHeatmap(data.heatmapData, data.meetingTitles);
  show($('insights-content'));
}

// ── Word Cloud ────────────────────────────────────────────────────────────────
function renderWordCloud(keywords) {
  const container = $('word-cloud');
  container.innerHTML = '';

  if (!keywords.length) { container.textContent = 'No keywords found.'; return; }

  const maxCount = Math.max(...keywords.map(k => k.count), 1);
  const usedCategories = new Set();

  // Sort largest first so big words anchor the center of the cloud
  const sorted = [...keywords].sort((a, b) => b.count - a.count);

  sorted.forEach(kw => {
    const ratio = kw.count / maxCount;
    const fontSize = (0.82 + ratio * 1.9).toFixed(2);
    const color = CATEGORY_COLORS[kw.category] || CATEGORY_COLORS.other;

    const span = document.createElement('span');
    span.className = 'word-cloud-item';
    span.textContent = kw.word;
    span.style.cssText = `font-size:${fontSize}rem;color:${color};opacity:${(0.6 + ratio * 0.4).toFixed(2)}`;
    span.title = `${kw.word} · ${kw.count} meeting${kw.count !== 1 ? 's' : ''} · ${kw.category}`;
    container.appendChild(span);
    usedCategories.add(kw.category);
  });

  // Legend
  const legend = $('word-cloud-legend');
  legend.innerHTML = '';
  [...usedCategories].forEach(cat => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<span class="legend-dot" style="background:${CATEGORY_COLORS[cat] || CATEGORY_COLORS.other}"></span>${cat}`;
    legend.appendChild(item);
  });
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────
function renderBarChart(keywords) {
  const container = $('bar-chart');
  container.innerHTML = '';

  const top12 = keywords.slice(0, 12);
  const maxCount = Math.max(...top12.map(k => k.count), 1);

  top12.forEach(kw => {
    const pct = ((kw.count / maxCount) * 100).toFixed(1);
    const color = CATEGORY_COLORS[kw.category] || CATEGORY_COLORS.other;
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <div class="bar-label" title="${esc(kw.word)}">${esc(kw.word)}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${pct}%;background:${color}">
          <span class="bar-count">${kw.count}</span>
        </div>
      </div>
      <div class="bar-category">${esc(kw.category)}</div>
    `;
    container.appendChild(row);
  });
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
function renderHeatmap(heatmapData, meetingTitles) {
  const container = $('heatmap');
  if (!heatmapData.length) { container.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem">Not enough data to render heatmap.</p>'; return; }

  // Cap at 10 most recent meetings
  const maxMeetings = 10;
  const sliceStart = Math.max(0, meetingTitles.length - maxMeetings);
  const titles = meetingTitles.slice(sliceStart);

  let html = `<table class="heatmap-table"><thead><tr class="heatmap-header-row">
    <th class="heatmap-corner"></th>
    ${titles.map(t => `<th class="heatmap-meeting-th"><span class="heatmap-meeting-label">${esc(t.substring(0, 14))}${t.length > 14 ? '…' : ''}</span></th>`).join('')}
  </tr></thead><tbody>`;

  heatmapData.forEach(kw => {
    const color = CATEGORY_COLORS[kw.category] || CATEGORY_COLORS.other;
    const meetingSlice = kw.meetings.slice(sliceStart);
    const maxVal = Math.max(...meetingSlice.map(m => m.count), 1);

    html += `<tr class="heatmap-keyword-row">
      <td class="heatmap-keyword-cell">${esc(kw.word)}</td>
      ${meetingSlice.map(m => {
        if (!m.count) return `<td class="heatmap-data-cell" style="background:var(--bg3)" title="${esc(kw.word)} — ${esc(m.title)}: 0"></td>`;
        const opacity = (0.2 + (m.count / maxVal) * 0.8).toFixed(2);
        const bg = hexToRgba(color, opacity);
        return `<td class="heatmap-data-cell" style="background:${bg}" title="${esc(kw.word)} — ${esc(m.title)}: ${m.count} mention${m.count !== 1 ? 's' : ''}">${m.count}</td>`;
      }).join('')}
    </tr>`;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function hexToRgba(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

// ── Skill: Meeting Stats ──────────────────────────────────────────────────────
$('skill-stats').addEventListener('click', async () => {
  showSkillResult('Meeting Stats — All Meetings', true, 'Analyzing meetings…');
  try {
    const res = await fetch('/api/skills/meeting-stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showSkillResult('Meeting Stats — All Meetings', false, data.report);
  } catch (err) {
    showSkillResult('Meeting Stats — All Meetings', false, `Error: ${err.message}`);
  }
});
