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

    // Deep navy background matching app palette
    ctx.fillStyle = '#001C55';
    ctx.fillRect(0, 0, W, H);

    const bars = 60;
    const barW = W / bars;
    for (let i = 0; i < bars; i++) {
      const idx = Math.floor(i * data.length / bars);
      const v = data[idx] / 255;
      // Minimum bar height so the visualizer is always visible
      const h = Math.max(4, v * H * 0.88);
      // Low intensity → bright blue; high intensity → gold
      const r = Math.round(30  + v * 225);
      const g = Math.round(130 + v * 16);
      const b = Math.round(220 * (1 - v * 0.85));
      ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
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

    startLiveAdvisor();

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
  stopLiveAdvisor();
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

/* ════════════════════════════════════════════════════════════════════════════
   LIVE ADVISOR
════════════════════════════════════════════════════════════════════════════ */
const LIVE_INTERVAL_MS = 45000;  // 45 seconds
const MIN_WORDS_FOR_ANALYSIS = 20;

let liveAdvisorInterval = null;
let liveAnalysisPending = false;
let liveLastUpdated = null;

function startLiveAdvisor() {
  $('live-advisor').classList.add('open');
  document.body.classList.add('advisor-open');
  resetLiveAdvisorUI();
  show($('live-advisor-waiting'));

  // First analysis after 20s, then every 45s
  liveAdvisorInterval = setInterval(runLiveAnalysis, LIVE_INTERVAL_MS);
  setTimeout(runLiveAnalysis, 20000);
}

function stopLiveAdvisor() {
  clearInterval(liveAdvisorInterval);
  liveAdvisorInterval = null;
  liveAnalysisPending = false;
  // Grey out pulse dot, keep panel open with last results
  const pulse = document.querySelector('.live-pulse');
  if (pulse) pulse.style.background = '#94a3b8';
  if ($('btn-live-refresh')) $('btn-live-refresh').disabled = true;
}

function resetLiveAdvisorUI() {
  hide($('live-advisor-waiting'));
  hide($('live-advisor-loading'));
  hide($('live-advisor-content'));
  hide($('live-alert-wrap'));
  $('live-advisor-updated').textContent = '';
}

async function runLiveAnalysis() {
  if (liveAnalysisPending) return;
  const wordCount = speechTranscript.trim().split(/\s+/).filter(Boolean).length;

  if (wordCount < MIN_WORDS_FOR_ANALYSIS) {
    show($('live-advisor-waiting'));
    hide($('live-advisor-loading'));
    hide($('live-advisor-content'));
    return;
  }

  liveAnalysisPending = true;
  hide($('live-advisor-waiting'));
  hide($('live-advisor-content'));
  show($('live-advisor-loading'));
  $('btn-live-refresh').disabled = true;

  try {
    const res = await fetch('/api/live-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: speechTranscript }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    renderLiveAnalysis(data);
    liveLastUpdated = new Date();
    $('live-advisor-updated').textContent = `Updated ${liveLastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  } catch (err) {
    $('live-advisor-updated').textContent = `Error: ${err.message}`;
  } finally {
    hide($('live-advisor-loading'));
    show($('live-advisor-content'));
    liveAnalysisPending = false;
    if ($('btn-live-refresh')) $('btn-live-refresh').disabled = false;
  }
}

function renderLiveAnalysis(data) {
  // Sentiment badge
  const sentiment = (data.sentiment || 'neutral').toLowerCase();
  const sentimentLabels = { positive: '↑ Positive', negative: '↓ Negative', cautious: '~ Cautious', neutral: '→ Neutral' };
  const badge = $('live-sentiment-badge');
  badge.className = `live-sentiment-badge sentiment-${sentiment}`;
  badge.textContent = `${sentimentLabels[sentiment] || sentiment} · Engagement: ${data.engagementLevel || 'medium'}`;
  $('live-sentiment-signal').textContent = data.sentimentSignal || '';

  // Advisor alert
  if (data.advisorAlert) {
    $('live-alert-text').textContent = data.advisorAlert;
    show($('live-alert-wrap'));
  } else {
    hide($('live-alert-wrap'));
  }

  // Topics/signals chips
  const topicsEl = $('live-topics');
  topicsEl.innerHTML = '';
  const signals = [...(data.clientSignals || []), ...(data.detectedTopics || [])];
  const uniqueSignals = [...new Set(signals)].slice(0, 8);
  uniqueSignals.forEach(t => {
    const chip = document.createElement('span');
    chip.className = 'live-topic-chip';
    chip.textContent = t;
    topicsEl.appendChild(chip);
  });

  // Product recommendations
  const productsEl = $('live-products');
  productsEl.innerHTML = '';
  (data.recommendations || []).forEach(rec => {
    const card = document.createElement('div');
    card.className = 'live-product-card';
    card.innerHTML = `
      <div class="live-product-top">
        <span class="live-product-name">${esc(rec.productName)}</span>
        ${rec.ticker ? `<span class="live-product-ticker">${esc(rec.ticker)}</span>` : ''}
        <span class="live-product-category">${esc(rec.category || '')}</span>
      </div>
      <div class="live-product-why">${esc(rec.whyNow || '')}</div>
      ${rec.talkingPoint ? `<div class="live-product-talking">${esc(rec.talkingPoint)}</div>` : ''}
    `;
    productsEl.appendChild(card);
  });

  show($('live-advisor-content'));
}

$('btn-live-refresh').addEventListener('click', runLiveAnalysis);

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
    renderEmail(data.email, data.htmlPath, data.txtPath, data.attachments);
    hide($('email-loading'));
    show($('email-content'));

  } catch (err) {
    hide($('email-loading'));
    toast(`Email generation failed: ${err.message}`, 5000);
  } finally {
    $('btn-generate-email').disabled = false;
  }
});

function renderEmail(email, htmlPath, txtPath, attachments) {
  $('email-subject').textContent = email.subject;
  $('email-body').innerHTML = email.body;

  $('link-email-html').textContent = htmlPath?.split('/').pop() || 'email.html';
  $('link-email-html').href = '#';
  $('link-email-txt').textContent  = txtPath?.split('/').pop()  || 'email.txt';
  $('link-email-txt').href = '#';

  renderAttachments($('email-attachments'), attachments);
}

// Client-side URL map — ensures links go to am.jpmorgan.com even if server
// doesn't return factSheetUrl (e.g. server not yet restarted).
const PRODUCT_URLS = {
  JEPI:          'https://am.jpmorgan.com/us/en/asset-management/adv/products/jpmorgan-equity-premium-income-etf-etf-shares-46641q332',
  JEPQ:          'https://am.jpmorgan.com/us/en/asset-management/adv/products/jpmorgan-nasdaq-equity-premium-income-etf-etf-shares-46654q203',
  JPST:          'https://am.jpmorgan.com/us/en/asset-management/adv/products/jpmorgan-ultra-short-income-etf-etf-shares-46641q837',
  JGRO:          'https://am.jpmorgan.com/us/en/asset-management/adv/products/jpmorgan-active-growth-etf-etf-shares-46654q609',
  JPRE:          'https://am.jpmorgan.com/us/en/asset-management/adv/products/jpmorgan-realty-income-etf-etf-shares-46641q126',
  JIRE:          'https://am.jpmorgan.com/us/en/asset-management/adv/products/jpmorgan-international-research-enhanced-equity-etf-etf-shares-46641q134',
  INCOME_FUND:   'https://am.jpmorgan.com/us/en/asset-management/adv/products/jpmorgan-income-fund-a-46637k240',
  SMARTRETIREMENT:'https://am.jpmorgan.com/us/en/asset-management/adv/investment-strategies/multi-asset/smartretirement/',
};

function renderAttachments(container, attachments) {
  if (!container) return;
  if (!attachments?.length) { hide(container); return; }
  container.innerHTML = `
    <div class="email-attachments-label">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
      Enclosed Materials
    </div>
    <div class="email-attachments-chips">
      ${attachments.map(a => {
        const url = a.factSheetUrl || PRODUCT_URLS[a.key] || `/api/factsheet/${a.key}`;
        return `<a class="attachment-chip" href="${url}" target="_blank" rel="noopener">
          ${a.ticker ? `<span class="attachment-chip-ticker">${esc(a.ticker)}</span>` : ''}
          <span class="attachment-chip-name">${esc(a.name)}</span>
          <span class="attachment-chip-arrow">↗</span>
        </a>`;
      }).join('')}
    </div>`;
  show(container);
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
   SPA PAGE ROUTING
════════════════════════════════════════════════════════════════════════════ */
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  const page = document.getElementById(`page-${name}`);
  if (page) { page.classList.add('active'); window.scrollTo({ top: 0 }); }

  if (name !== 'workflow') {
    $('live-advisor').classList.remove('open');
    document.body.classList.remove('advisor-open');
  }
  if (name === 'meetings') loadMeetings();
  if (name === 'insights') {
    const range = document.querySelector('.range-tab.active')?.dataset.range || 'all';
    if (activeInsightsSubtab === 'keywords') loadInsights(range);
    else loadCompetitors(range);
  }
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => showPage(btn.dataset.page));
});

/* ════════════════════════════════════════════════════════════════════════════
   MEETINGS PAGE
════════════════════════════════════════════════════════════════════════════ */
let meetingsData = [];
let selectedMeetingIndex = null;

$('btn-clear-selection').addEventListener('click', clearMeetingSelection);

function clearMeetingSelection() {
  selectedMeetingIndex = null;
  document.querySelectorAll('.meeting-card').forEach(c => c.classList.remove('selected'));
  $('skills-panel').classList.remove('open');
  document.querySelector('.activities-layout')?.classList.remove('has-selection');
}

function selectMeeting(index) {
  if (selectedMeetingIndex === index) {
    clearMeetingSelection();
    return;
  }
  selectedMeetingIndex = index;
  document.querySelectorAll('.meeting-card').forEach((c, i) => c.classList.toggle('selected', i === index));
  $('skill-meeting-name').textContent = meetingsData[index].title;
  $('skills-panel').classList.add('open');
  document.querySelector('.activities-layout')?.classList.add('has-selection');
}

// ── Load meetings list ────────────────────────────────────────────────────────
async function loadMeetings() {
  const list = $('meetings-list');
  // Clear previous cards (keep the empty message element)
  Array.from(list.children).forEach(c => { if (c.id !== 'meetings-empty') c.remove(); });
  selectedMeetingIndex = null;
  $('skills-panel').classList.remove('open');
  document.querySelector('.activities-layout')?.classList.remove('has-selection');

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
    ${m.attendees?.length ? `<h3>Attendees</h3><div class="attendee-chips">${m.attendees.map(a => `<span class="chip">${esc(a)}</span>`).join('')}</div>` : ''}
  `;

  show($('meeting-detail-modal'));
}

$('btn-close-modal').addEventListener('click', () => hide($('meeting-detail-modal')));
$('meeting-detail-modal').addEventListener('click', e => {
  if (e.target === $('meeting-detail-modal')) hide($('meeting-detail-modal'));
});

// ── Skill result modal ────────────────────────────────────────────────────────
function showSkillResult(title, loading, content = '') {
  $('skill-modal-title').textContent = title;
  show($('skill-modal'));
  hide($('skill-modal-email'));
  if (loading) {
    show($('skill-modal-loading'));
    $('skill-modal-loading-text').textContent = content || 'Running…';
    hide($('skill-modal-content'));
    hide($('btn-copy-skill-modal'));
  } else {
    hide($('skill-modal-loading'));
    $('skill-modal-content').textContent = content;
    show($('skill-modal-content'));
    show($('btn-copy-skill-modal'));
  }
}

$('btn-close-skill-modal').addEventListener('click', () => hide($('skill-modal')));
$('skill-modal').addEventListener('click', e => { if (e.target === $('skill-modal')) hide($('skill-modal')); });

$('btn-copy-skill-modal').addEventListener('click', () => {
  const text = $('skill-modal-content').textContent || $('btn-copy-skill-modal').dataset.copyText || '';
  navigator.clipboard.writeText(text)
    .then(() => toast('Copied!'))
    .catch(() => toast('Copy failed'));
});

// ── Email-specific modal renderer ─────────────────────────────────────────────
function showEmailResult(title, email, savedPath, attachments) {
  $('skill-modal-title').textContent = title;
  show($('skill-modal'));
  hide($('skill-modal-loading'));
  hide($('skill-modal-content'));

  $('skill-email-subject').textContent = email.subject || '';
  $('skill-email-body').innerHTML = email.body || `<p>${esc(email.plainText || '')}</p>`;
  renderAttachments($('skill-modal-attachments'), attachments);
  show($('skill-modal-email'));

  // Store plain text for copy button
  $('btn-copy-skill-modal').dataset.copyText = `Subject: ${email.subject}\n\n${email.plainText}${savedPath ? `\n\n---\nSaved: ${savedPath}` : ''}`;
  show($('btn-copy-skill-modal'));
}

// ── Skill helpers ─────────────────────────────────────────────────────────────
function selectedSummaryId() {
  return selectedMeetingIndex !== null ? meetingsData[selectedMeetingIndex]?.id : null;
}

function skillLabel(base) {
  if (selectedMeetingIndex !== null) return `${base} — ${meetingsData[selectedMeetingIndex].title}`;
  return `${base} — Latest Meeting`;
}

// ── Skill: Tone chip selectors (scoped by data-group) ────────────────────────
document.addEventListener('click', e => {
  const btn = e.target.closest('.tone-chip[data-group]');
  if (!btn) return;
  const group = btn.dataset.group;
  document.querySelectorAll(`.tone-chip[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
});

function getGroupTone(group) {
  return document.querySelector(`.tone-chip.active[data-group="${group}"]`)?.dataset.tone || 'formal';
}

$('skill-email').addEventListener('click', async () => {
  const tone = getGroupTone('followup');
  const label = skillLabel(`Follow-up Email (${tone})`);
  showSkillResult(label, true, 'Drafting email with Claude AI…');
  try {
    const body = JSON.stringify({ summaryId: selectedSummaryId(), tone });
    const res = await fetch('/api/skills/generate-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showEmailResult(label, data.email, data.txtPath, data.attachments);
  } catch (err) {
    showSkillResult(label, false, `Error: ${err.message}`);
  }
});

// ── Skill: Thank You Email ─────────────────────────────────────────────────────
$('skill-thankyou').addEventListener('click', async () => {
  const tone = getGroupTone('thankyou');
  const label = skillLabel(`Thank You Email (${tone})`);
  showSkillResult(label, true, 'Drafting thank-you email with Claude AI…');
  try {
    const body = JSON.stringify({ summaryId: selectedSummaryId(), tone });
    const res = await fetch('/api/skills/thank-you-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showEmailResult(label, data.email, data.txtPath, data.attachments);
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

let insightsCache = {};      // keyed by range
let competitorsCache = {};   // keyed by range
let activeInsightsSubtab = 'keywords';

// ── Sub-tab switching ─────────────────────────────────────────────────────────
document.querySelectorAll('.insights-sub-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.insights-sub-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeInsightsSubtab = btn.dataset.subtab;

    if (activeInsightsSubtab === 'keywords') {
      show($('insights-keywords-pane'));
      $('insights-competitors-pane').classList.add('hidden');
      const range = document.querySelector('.range-tab.active')?.dataset.range || 'all';
      loadInsights(range);
    } else {
      $('insights-keywords-pane').classList.add('hidden');
      show($('insights-competitors-pane'));
      const range = document.querySelector('.range-tab.active')?.dataset.range || 'all';
      loadCompetitors(range);
    }
  });
});

document.querySelectorAll('.range-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.range-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    insightsCache = {};
    competitorsCache = {};
    if (activeInsightsSubtab === 'keywords') {
      loadInsights(btn.dataset.range);
    } else {
      loadCompetitors(btn.dataset.range);
    }
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

// ── Competitor Tracker ────────────────────────────────────────────────────────
async function loadCompetitors(range) {
  if (competitorsCache[range]) {
    renderCompetitors(competitorsCache[range]);
    return;
  }

  hide($('competitors-content'));
  hide($('competitors-empty'));
  show($('competitors-loading'));

  try {
    const res = await fetch('/api/insights/competitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ range }),
    });
    const data = await res.json();
    hide($('competitors-loading'));

    if (!res.ok) {
      $('competitors-empty-msg').textContent = data.error || 'No data available.';
      show($('competitors-empty'));
      return;
    }

    competitorsCache[range] = data;
    renderCompetitors(data);
  } catch (err) {
    hide($('competitors-loading'));
    $('competitors-empty-msg').textContent = 'Failed to load data. Is the server running?';
    show($('competitors-empty'));
  }
}

function renderCompetitors(data) {
  hide($('competitors-loading'));
  hide($('competitors-empty'));

  const list = $('competitors-list');
  list.innerHTML = '';

  if (!data.competitors?.length) {
    $('competitors-empty-msg').textContent = data.summary || 'No competitor mentions found.';
    show($('competitors-empty'));
    hide($('competitors-content'));
    return;
  }

  $('competitors-summary-bar').innerHTML =
    `<strong>${data.competitors.length} competitor${data.competitors.length !== 1 ? 's' : ''} identified</strong> across ${data.meetingCount} meeting${data.meetingCount !== 1 ? 's' : ''} · ${data.summary}`;

  const toneIcon = { positive: '↑', neutral: '→', negative: '↓' };

  data.competitors
    .sort((a, b) => b.mentions - a.mentions)
    .forEach((c, i) => {
      const card = document.createElement('div');
      card.className = 'competitor-card';

      const meetingChips = (c.meetings || [])
        .map(m => `<span class="competitor-meeting-chip">${esc(m)}</span>`)
        .join('');

      const contexts = (c.contexts || [])
        .map(ctx => `<div class="competitor-context-item">${esc(ctx)}</div>`)
        .join('');

      const tone = (c.tone || 'neutral').toLowerCase();
      const toneClass = `tone-${tone}`;

      card.innerHTML = `
        <div class="competitor-card-header">
          <div class="competitor-rank">${i + 1}</div>
          <div class="competitor-name">${esc(c.name)}</div>
          <span class="competitor-category">${esc(c.category || 'other')}</span>
          <div class="competitor-mention-count">${c.mentions} mention${c.mentions !== 1 ? 's' : ''}</div>
        </div>
        <div class="competitor-card-body">
          <div>
            <span class="competitor-tone ${toneClass}">${toneIcon[tone] || '→'} ${esc(tone)}</span>
            ${c.toneNote ? `<div class="competitor-tone-note">${esc(c.toneNote)}</div>` : ''}
          </div>
          ${meetingChips ? `<div class="competitor-meetings"><span class="competitor-meetings-label">Seen in:</span>${meetingChips}</div>` : ''}
          ${contexts ? `<div class="competitor-contexts"><div class="competitor-contexts-label">Context</div>${contexts}</div>` : ''}
        </div>
      `;

      list.appendChild(card);
    });

  show($('competitors-content'));
}

// ── Skill: Sentiment Analysis ─────────────────────────────────────────────────
$('skill-sentiment').addEventListener('click', async () => {
  const label = skillLabel('Sentiment Analysis');
  showSkillResult(label, true, 'Analysing emotional tone with Claude AI…');
  try {
    const body = JSON.stringify({ summaryId: selectedSummaryId() });
    const res = await fetch('/api/skills/sentiment-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    const a = data.analysis;
    const scoreBar = '█'.repeat(Math.round((a.sentimentScore + 1) * 5)) + '░'.repeat(10 - Math.round((a.sentimentScore + 1) * 5));
    const result = [
      `📊 SENTIMENT ANALYSIS — ${data.title}`,
      ``,
      `Overall Sentiment : ${a.overallSentiment?.toUpperCase()}  (score: ${a.sentimentScore?.toFixed(2)})`,
      `Confidence        : ${a.confidence}`,
      `Emotional Tone    : ${a.emotionalTone}`,
      `Score             : [${scoreBar}]`,
      ``,
      `── Breakdown ──────────────────────────`,
      `  Positive : ${a.breakdown?.positive ?? 0}%`,
      `  Neutral  : ${a.breakdown?.neutral  ?? 0}%`,
      `  Negative : ${a.breakdown?.negative ?? 0}%`,
      ``,
      `── Highlights ─────────────────────────`,
      `Positive signals:`,
      ...(a.highlights?.positive || []).map(h => `  ✓ ${h}`),
      `Concerns:`,
      ...(a.highlights?.concerns || []).map(c => `  ⚠ ${c}`),
      ``,
      `── Topic Sentiments ───────────────────`,
      ...(a.topicSentiments || []).map(t => `  ${t.topic}: ${t.sentiment} — ${t.note}`),
      ``,
      `── Team Dynamics ──────────────────────`,
      a.teamDynamics,
      ``,
      `── Recommendations ────────────────────`,
      ...(a.recommendations || []).map((r, i) => `  ${i + 1}. ${r}`),
    ].join('\n');
    showSkillResult(label, false, result);
  } catch (err) {
    showSkillResult(label, false, `Error: ${err.message}`);
  }
});

