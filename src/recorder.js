/**
 * Voice Recorder Module
 * Records audio from the microphone and saves it as a WAV file.
 * Uses node-record-lpcm16 for cross-platform microphone access.
 */

import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from './config.js';

export class VoiceRecorder {
  constructor() {
    this.recording = null;
    this.outputPath = null;
    this.startTime = null;
  }

  /**
   * Generate a timestamped filename for the recording.
   */
  _generateFilename() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `recording-${timestamp}.wav`;
  }

  /**
   * Start recording audio from the microphone.
   * @returns {Promise<string>} Path to the output file
   */
  async start() {
    // Ensure output directory exists
    const outputDir = config.recording.outputDir;
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const filename = this._generateFilename();
    this.outputPath = join(outputDir, filename);
    this.startTime = Date.now();

    // Dynamically import to handle optional dependency
    let recorder;
    try {
      const { default: record } = await import('node-record-lpcm16');
      recorder = record;
    } catch {
      throw new Error(
        'node-record-lpcm16 is not available. Please install it with:\n' +
        'npm install node-record-lpcm16\n\n' +
        'Also ensure SoX is installed:\n' +
        '  macOS:   brew install sox\n' +
        '  Ubuntu:  sudo apt-get install sox libsox-fmt-all\n' +
        '  Windows: https://sourceforge.net/projects/sox/'
      );
    }

    return new Promise((resolve, reject) => {
      try {
        this.recording = recorder.record({
          sampleRate: config.recording.sampleRate,
          channels: config.recording.channels,
          audioType: 'wav',
        });

        const fileStream = createWriteStream(this.outputPath);
        this.recording.stream().pipe(fileStream);

        fileStream.on('open', () => resolve(this.outputPath));
        fileStream.on('error', reject);
        this.recording.stream().on('error', reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Stop the current recording.
   * @returns {Promise<{path: string, duration: number}>}
   */
  async stop() {
    if (!this.recording) {
      throw new Error('No active recording to stop.');
    }

    return new Promise((resolve) => {
      const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
      this.recording.stop();
      this.recording = null;

      // Give the stream a moment to flush
      setTimeout(() => {
        resolve({
          path: this.outputPath,
          duration: parseFloat(duration),
        });
      }, 500);
    });
  }

  /**
   * Check if currently recording.
   */
  isRecording() {
    return this.recording !== null;
  }
}
