#!/usr/bin/env node
/**
 * Voice Transcription & Meeting Summary App
 * ==========================================
 * Main interactive CLI that ties together:
 *  1. Voice Recording
 *  2. Transcription (via Claude API)
 *  3. Meeting Summarization (via Claude API)
 *  4. Follow-up Email Generation (skill)
 *
 * Usage: node src/index.js
 */

import { createInterface } from 'readline';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { config, validateConfig } from './config.js';
import { Transcriber } from './transcriber.js';
import { Summarizer } from './summarizer.js';
import { EmailSkill } from './email-skill.js';

// ─── Simple terminal helpers ──────────────────────────────────────────────────

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BLUE = '\x1b[34m';

const c = {
  bold: (s) => `${BOLD}${s}${RESET}`,
  green: (s) => `${GREEN}${s}${RESET}`,
  cyan: (s) => `${CYAN}${s}${RESET}`,
  yellow: (s) => `${YELLOW}${s}${RESET}`,
  red: (s) => `${RED}${s}${RESET}`,
  dim: (s) => `${DIM}${s}${RESET}`,
  blue: (s) => `${BLUE}${s}${RESET}`,
};

function banner() {
  console.log('');
  console.log(c.cyan('╔══════════════════════════════════════════════════════╗'));
  console.log(c.cyan('║') + c.bold('       🎙  Voice Transcription & Summary App         ') + c.cyan('║'));
  console.log(c.cyan('║') + c.dim('    Powered by Claude AI  |  Record → Transcribe → Summarize') + c.cyan('  ║'));
  console.log(c.cyan('╚══════════════════════════════════════════════════════╝'));
  console.log('');
}

function spinner(message) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r${c.cyan(frames[i++ % frames.length])}  ${message}   `);
  }, 80);
  return () => {
    clearInterval(interval);
    process.stdout.write('\r\x1b[K'); // clear line
  };
}

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function printSection(title) {
  console.log('');
  console.log(c.bold(c.blue(`── ${title} ${'─'.repeat(Math.max(0, 48 - title.length))}`)));
}

// ─── Main Menu ────────────────────────────────────────────────────────────────

async function mainMenu(rl) {
  printSection('Main Menu');
  console.log(`  ${c.cyan('1')}  Record a new meeting`);
  console.log(`  ${c.cyan('2')}  Transcribe an existing audio file`);
  console.log(`  ${c.cyan('3')}  Paste/type meeting notes for summarization`);
  console.log(`  ${c.cyan('4')}  Generate follow-up email from saved summary`);
  console.log(`  ${c.cyan('5')}  Full pipeline: Record → Transcribe → Summarize → Email`);
  console.log(`  ${c.cyan('q')}  Quit`);
  console.log('');

  const choice = await ask(rl, c.bold('Select an option: '));
  return choice.trim().toLowerCase();
}

// ─── 1. Record audio ──────────────────────────────────────────────────────────

async function recordMeeting(rl) {
  printSection('Record Meeting');

  let VoiceRecorder;
  try {
    ({ VoiceRecorder } = await import('./recorder.js'));
  } catch {
    console.log(c.red('✗ Recorder module could not be loaded.'));
    return null;
  }

  console.log(c.dim('  Press ENTER to start recording, then ENTER again to stop.\n'));
  await ask(rl, `  ${c.green('▶  Press ENTER to start recording...')}`);

  const recorder = new VoiceRecorder();
  let outputPath;
  try {
    outputPath = await recorder.start();
    console.log(c.green(`\n  ● Recording to: ${outputPath}`));
    console.log(c.dim('  Speak clearly into your microphone...'));
  } catch (err) {
    console.log(c.red(`\n✗ Could not start recording: ${err.message}`));
    console.log(c.yellow('\nTip: Make sure SoX is installed:'));
    console.log(c.dim('  macOS:  brew install sox'));
    console.log(c.dim('  Linux:  sudo apt-get install sox libsox-fmt-all'));
    return null;
  }

  await ask(rl, `\n  ${c.yellow('■  Press ENTER to stop recording...')}`);

  const result = await recorder.stop();
  console.log(c.green(`\n  ✓ Recorded ${result.duration}s → ${result.path}`));
  return result.path;
}

// ─── 2. Transcribe ────────────────────────────────────────────────────────────

async function transcribeAudio(rl, audioPath) {
  if (!audioPath) {
    printSection('Transcribe Audio File');
    audioPath = (await ask(rl, '  Path to audio file: ')).trim();
  }

  if (!existsSync(audioPath)) {
    console.log(c.red(`✗ File not found: ${audioPath}`));
    return null;
  }

  const stop = spinner('Transcribing audio with Claude...');
  try {
    const transcriber = new Transcriber();
    const transcript = await transcriber.transcribe(audioPath);
    stop();
    console.log(c.green('✓ Transcription complete!\n'));

    // Save transcript
    const outputDir = config.output.dir;
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const txPath = join(outputDir, `transcript-${timestamp}.txt`);
    writeFileSync(txPath, transcript);
    console.log(c.dim(`  Saved to: ${txPath}`));

    printSection('Transcript');
    console.log(transcript);
    return { transcript, txPath };
  } catch (err) {
    stop();
    console.log(c.red(`✗ Transcription failed: ${err.message}`));
    return null;
  }
}

// ─── 3. Paste/type text ───────────────────────────────────────────────────────

async function pasteTranscript(rl) {
  printSection('Enter Meeting Notes / Transcript');
  console.log(c.dim('  Paste or type the meeting transcript. Type END on a new line when done.\n'));

  const lines = [];
  while (true) {
    const line = await ask(rl, '');
    if (line.trim() === 'END') break;
    lines.push(line);
  }

  const transcript = lines.join('\n').trim();
  if (!transcript) {
    console.log(c.red('✗ No text entered.'));
    return null;
  }

  return { transcript, txPath: null };
}

// ─── 4. Summarize ─────────────────────────────────────────────────────────────

async function summarizeTranscript(rl, transcript) {
  printSection('Meeting Details');

  const meetingName = (await ask(rl, '  Meeting name (or press ENTER to auto-detect): ')).trim()
    || undefined;
  const attendeesRaw = (await ask(rl, '  Attendees, comma-separated (or press ENTER to skip): ')).trim();
  const attendees = attendeesRaw ? attendeesRaw.split(',').map(a => a.trim()) : [];

  const stop = spinner('Summarizing meeting with Claude...');
  try {
    const summarizer = new Summarizer();
    const summary = await summarizer.summarize(transcript, { meetingName, attendees });
    stop();

    console.log(c.green('✓ Summary generated!\n'));
    console.log(summarizer.formatAsMarkdown(summary));

    const { jsonPath, mdPath } = summarizer.saveSummary(summary);
    console.log('');
    console.log(c.dim(`  Saved JSON : ${jsonPath}`));
    console.log(c.dim(`  Saved MD   : ${mdPath}`));

    return { summary, jsonPath, mdPath };
  } catch (err) {
    stop();
    console.log(c.red(`✗ Summarization failed: ${err.message}`));
    return null;
  }
}

// ─── 5. Generate Email ────────────────────────────────────────────────────────

async function generateEmail(rl, summary) {
  printSection('Generate Follow-up Email');

  if (!summary) {
    // Load from file
    const summaryPath = (await ask(rl, '  Path to summary JSON file: ')).trim();
    if (!existsSync(summaryPath)) {
      console.log(c.red(`✗ File not found: ${summaryPath}`));
      return;
    }
    const { readFileSync } = await import('fs');
    summary = JSON.parse(readFileSync(summaryPath, 'utf-8'));
  }

  const toneChoice = (await ask(
    rl,
    `  Email tone [${c.cyan('formal')}/${c.cyan('friendly')}/${c.cyan('concise')}/${c.cyan('detailed')}] (default: formal): `
  )).trim().toLowerCase() || 'formal';

  const senderName = (await ask(rl, '  Your name (sender): ')).trim() || 'Meeting Organizer';
  const senderTitle = (await ask(rl, '  Your title (optional): ')).trim() || '';

  const recipientsRaw = (await ask(rl, '  Recipients (comma-separated, optional): ')).trim();
  const recipients = recipientsRaw ? recipientsRaw.split(',').map(r => r.trim()) : [];

  const stop = spinner('Drafting follow-up email with Claude...');
  try {
    const skill = new EmailSkill();
    const email = await skill.generateEmail(summary, {
      tone: toneChoice,
      senderName,
      senderTitle,
      recipients,
    });
    stop();

    const { htmlPath, txtPath } = skill.saveEmail(email);

    console.log(c.green('\n✓ Follow-up email generated!\n'));
    console.log(`  ${c.bold('Subject:')} ${email.subject}`);
    console.log('');
    console.log(email.plainText);
    console.log('');
    console.log(c.dim(`  Saved HTML : ${htmlPath}`));
    console.log(c.dim(`  Saved TXT  : ${txtPath}`));
  } catch (err) {
    stop();
    console.log(c.red(`✗ Email generation failed: ${err.message}`));
  }
}

// ─── Full Pipeline ────────────────────────────────────────────────────────────

async function fullPipeline(rl) {
  printSection('Full Pipeline: Record → Transcribe → Summarize → Email');

  // Step 1: Record
  let transcript;
  const useRecorder = (await ask(
    rl,
    `  Do you want to (r) record audio or (p) paste text? [r/p]: `
  )).trim().toLowerCase();

  if (useRecorder === 'p') {
    const result = await pasteTranscript(rl);
    if (!result) return;
    transcript = result.transcript;
  } else {
    const audioPath = await recordMeeting(rl);
    if (!audioPath) return;

    const txResult = await transcribeAudio(rl, audioPath);
    if (!txResult) return;
    transcript = txResult.transcript;
  }

  // Step 2: Summarize
  const summaryResult = await summarizeTranscript(rl, transcript);
  if (!summaryResult) return;

  // Step 3: Email
  const generateEmailChoice = (await ask(
    rl,
    `\n  ${c.bold('Generate follow-up email?')} [Y/n]: `
  )).trim().toLowerCase();

  if (generateEmailChoice !== 'n') {
    await generateEmail(rl, summaryResult.summary);
  }

  console.log(c.green('\n✓ Pipeline complete!\n'));
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

async function main() {
  try {
    validateConfig();
  } catch (err) {
    console.error(c.red(`\nConfiguration Error: ${err.message}\n`));
    process.exit(1);
  }

  banner();

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.on('close', () => {
    console.log(c.dim('\nGoodbye!\n'));
    process.exit(0);
  });

  let running = true;
  while (running) {
    const choice = await mainMenu(rl);

    switch (choice) {
      case '1':
        await recordMeeting(rl);
        break;
      case '2':
        await transcribeAudio(rl, null);
        break;
      case '3': {
        const result = await pasteTranscript(rl);
        if (result) await summarizeTranscript(rl, result.transcript);
        break;
      }
      case '4':
        await generateEmail(rl, null);
        break;
      case '5':
        await fullPipeline(rl);
        break;
      case 'q':
      case 'quit':
      case 'exit':
        running = false;
        break;
      default:
        console.log(c.yellow('  Invalid option. Please choose 1-5 or q.'));
    }
  }

  rl.close();
}

main().catch((err) => {
  console.error(c.red(`\nFatal error: ${err.message}`));
  process.exit(1);
});
