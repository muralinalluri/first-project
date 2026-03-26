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

    ctx.fillStyle = '#1e2535';
    ctx.fillRect(0, 0, W, H);

    const bars = 60;
    const barW = W / bars;
    for (let i = 0; i < bars; i++) {
      const idx = Math.floor(i * data.length / bars);
      const v = data[idx] / 255;
      const h = v * H * 0.9;
      const alpha = 0.5 + v * 0.5;
      ctx.fillStyle = `rgba(99,102,241,${alpha})`;
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

  try {
    const formData = new FormData();
    formData.append('audio', state.audioBlob, state.audioFilename);

    const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Transcription failed');

    state.transcript = data.transcript;
    $('transcript-text').value = state.transcript;
    updateWordCount();
    hide($('transcribe-loading'));
    show($('transcribe-content'));
    $('btn-to-summarize').disabled = false;

  } catch (err) {
    hide($('transcribe-loading'));
    show($('transcribe-empty'));
    $('transcribe-empty').querySelector('p').textContent = `Error: ${err.message}`;
    toast(`Transcription failed: ${err.message}`, 5000);
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
