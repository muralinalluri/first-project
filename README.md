# Voice Transcription & Meeting Summary App

A CLI app that records voice, transcribes it, summarizes the meeting, and auto-generates follow-up emails — all powered by Claude AI.

## Features

- **Voice Recording** — record meetings directly from your microphone
- **Transcription** — transcribe audio files using Claude's multimodal API
- **Meeting Summarization** — structured summaries with key points, decisions, and action items
- **Follow-up Email Skill** — auto-generate professional follow-up emails from any summary

## Quick Start

### 1. Install dependencies

```bash
npm install
```

For voice recording, also install SoX (audio backend):

```bash
# macOS
brew install sox

# Ubuntu/Debian
sudo apt-get install sox libsox-fmt-all

# Windows
# Download from: https://sourceforge.net/projects/sox/
```

### 2. Set your API key

```bash
cp .env.example .env
export ANTHROPIC_API_KEY=your_api_key_here
```

### 3. Run the app

```bash
node src/index.js
```

## Menu Options

| Option | Description |
|--------|-------------|
| `1` | Record a new meeting via microphone |
| `2` | Transcribe an existing audio file (WAV, MP3, MP4, etc.) |
| `3` | Paste or type meeting notes for summarization |
| `4` | Generate a follow-up email from a saved summary |
| `5` | Full pipeline: Record → Transcribe → Summarize → Email |

## Follow-up Email Skill

The email skill can also be run standalone:

```bash
node src/email-skill.js --summary outputs/summary-2024-01-01.json --tone formal
```

**Tone options:** `formal` | `friendly` | `concise` | `detailed`

Or use the Claude Code slash command:

```
/generate-followup-email formal
```

## Output Files

All outputs are saved to the `outputs/` directory:

| File | Description |
|------|-------------|
| `transcript-*.txt` | Raw transcription |
| `summary-*.json` | Structured summary (JSON) |
| `summary-*.md` | Formatted summary (Markdown) |
| `followup-email-*.html` | Follow-up email (HTML) |
| `followup-email-*.txt` | Follow-up email (plain text) |

Recordings are saved to `recordings/` as WAV files.

## Project Structure

```
src/
  index.js        # Main interactive CLI
  config.js       # Configuration and validation
  recorder.js     # Voice recording module
  transcriber.js  # Audio transcription via Claude API
  summarizer.js   # Meeting summarization via Claude API
  email-skill.js  # Follow-up email generation (standalone skill)

.claude/
  commands/
    generate-followup-email.md  # /generate-followup-email slash command
```

## Requirements

- Node.js 18+
- Anthropic API key
- SoX (for voice recording only)
