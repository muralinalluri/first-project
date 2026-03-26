/**
 * Transcription Module
 * Transcribes audio files using the Claude API (via base64 audio input).
 * Falls back to Whisper-compatible endpoints if configured.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';
import { config, validateConfig } from './config.js';

const SUPPORTED_FORMATS = ['.wav', '.mp3', '.mp4', '.webm', '.m4a', '.ogg'];

const AUDIO_MEDIA_TYPES = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'audio/mp4',
  '.webm': 'audio/webm',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
};

export class Transcriber {
  constructor() {
    validateConfig();
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  /**
   * Transcribe an audio file.
   * @param {string} audioPath - Path to the audio file
   * @returns {Promise<string>} - The transcribed text
   */
  async transcribe(audioPath) {
    if (!existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    const ext = extname(audioPath).toLowerCase();
    if (!SUPPORTED_FORMATS.includes(ext)) {
      throw new Error(
        `Unsupported audio format: ${ext}. ` +
        `Supported formats: ${SUPPORTED_FORMATS.join(', ')}`
      );
    }

    const mediaType = AUDIO_MEDIA_TYPES[ext];
    const audioData = readFileSync(audioPath);
    const base64Audio = audioData.toString('base64');

    const response = await this.client.messages.create({
      model: config.models.transcription,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please transcribe the following audio recording verbatim. ' +
                    'Preserve speaker changes if detectable (use "Speaker 1:", "Speaker 2:", etc.). ' +
                    'Include filler words and natural speech patterns. ' +
                    'If there are multiple speakers, try to label them. ' +
                    'Output only the transcription, no commentary.',
            },
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Audio,
              },
            },
          ],
        },
      ],
    });

    return response.content[0].text.trim();
  }

  /**
   * Transcribe text that was already captured (for manual/paste input).
   * @param {string} rawText - Already captured text
   * @returns {string}
   */
  async transcribeText(rawText) {
    return rawText.trim();
  }
}
