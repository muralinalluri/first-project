// Configuration for the Voice Transcription & Summary App
export const config = {
  // Anthropic API key from environment
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

  // Recording settings
  recording: {
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16,
    outputDir: './recordings',
  },

  // Output settings
  output: {
    dir: './outputs',
  },

  // Models
  models: {
    transcription: 'claude-opus-4-6',  // Used for audio transcription
    summarization: 'claude-opus-4-6',  // Used for meeting summarization
    email: 'claude-opus-4-6',          // Used for email generation
  },
};

export function validateConfig() {
  if (!config.anthropicApiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is not set.\n' +
      'Please set it with: export ANTHROPIC_API_KEY=your_api_key'
    );
  }
}
