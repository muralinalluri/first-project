/**
 * Summarization Module
 * Takes a meeting transcript and generates a structured summary including:
 * - Meeting overview
 * - Key discussion points
 * - Decisions made
 * - Action items with owners
 * - Next steps
 */

import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { config, validateConfig } from './config.js';

const SUMMARY_PROMPT = `You are an expert meeting analyst. Analyze the following meeting transcript and produce a structured summary.

Format your response as a JSON object with this exact structure:
{
  "title": "Meeting title or topic (inferred from context)",
  "date": "Today's date or extracted from transcript",
  "duration": "Estimated duration if inferable",
  "attendees": ["List of attendees if mentioned"],
  "overview": "2-3 sentence overview of what the meeting was about",
  "keyPoints": [
    "Key discussion point 1",
    "Key discussion point 2"
  ],
  "decisions": [
    "Decision made during the meeting"
  ],
  "actionItems": [
    {
      "task": "What needs to be done",
      "owner": "Who is responsible (or 'TBD' if not clear)",
      "deadline": "When it's due (or 'Not specified')"
    }
  ],
  "nextSteps": [
    "Next step 1"
  ],
  "sentiment": "Overall meeting sentiment: positive/neutral/negative",
  "followUpRequired": true
}

Transcript:
`;

export class Summarizer {
  constructor() {
    validateConfig();
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  /**
   * Generate a structured summary from a transcript.
   * @param {string} transcript - The meeting transcript
   * @param {object} metadata - Optional metadata (meetingName, attendees, etc.)
   * @returns {Promise<object>} - Structured summary object
   */
  async summarize(transcript, metadata = {}) {
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('Transcript is empty. Nothing to summarize.');
    }

    const response = await this.client.messages.create({
      model: config.models.summarization,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: SUMMARY_PROMPT + transcript,
        },
      ],
    });

    const rawContent = response.content[0].text.trim();

    // Extract JSON from response
    let summary;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      summary = JSON.parse(jsonMatch[0]);
    } catch {
      // If JSON parsing fails, return a basic structure with raw content
      summary = {
        title: metadata.meetingName || 'Meeting Summary',
        date: new Date().toLocaleDateString(),
        overview: rawContent,
        keyPoints: [],
        decisions: [],
        actionItems: [],
        nextSteps: [],
        sentiment: 'neutral',
        followUpRequired: true,
      };
    }

    // Merge in any provided metadata
    if (metadata.meetingName) summary.title = metadata.meetingName;
    if (metadata.attendees) summary.attendees = metadata.attendees;
    summary.date = summary.date || new Date().toLocaleDateString();

    return summary;
  }

  /**
   * Format a summary object into a human-readable Markdown string.
   * @param {object} summary
   * @returns {string}
   */
  formatAsMarkdown(summary) {
    const lines = [];

    lines.push(`# ${summary.title}`);
    lines.push('');
    lines.push(`**Date:** ${summary.date}`);
    if (summary.duration) lines.push(`**Duration:** ${summary.duration}`);
    if (summary.attendees?.length) {
      lines.push(`**Attendees:** ${summary.attendees.join(', ')}`);
    }
    lines.push('');

    lines.push('## Overview');
    lines.push(summary.overview || '');
    lines.push('');

    if (summary.keyPoints?.length) {
      lines.push('## Key Discussion Points');
      summary.keyPoints.forEach(p => lines.push(`- ${p}`));
      lines.push('');
    }

    if (summary.decisions?.length) {
      lines.push('## Decisions Made');
      summary.decisions.forEach(d => lines.push(`- ${d}`));
      lines.push('');
    }

    if (summary.actionItems?.length) {
      lines.push('## Action Items');
      lines.push('| Task | Owner | Deadline |');
      lines.push('|------|-------|----------|');
      summary.actionItems.forEach(item => {
        lines.push(`| ${item.task} | ${item.owner} | ${item.deadline} |`);
      });
      lines.push('');
    }

    if (summary.nextSteps?.length) {
      lines.push('## Next Steps');
      summary.nextSteps.forEach(s => lines.push(`- ${s}`));
      lines.push('');
    }

    lines.push(`**Sentiment:** ${summary.sentiment || 'neutral'}`);
    lines.push(`**Follow-up Required:** ${summary.followUpRequired ? 'Yes' : 'No'}`);

    return lines.join('\n');
  }

  /**
   * Save summary to the output directory.
   * @param {object} summary
   * @param {string} baseFilename - Base name for the files
   * @returns {{jsonPath: string, mdPath: string}}
   */
  saveSummary(summary, baseFilename = 'summary') {
    const outputDir = config.output.dir;
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const jsonPath = join(outputDir, `${baseFilename}-${timestamp}.json`);
    const mdPath = join(outputDir, `${baseFilename}-${timestamp}.md`);

    writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
    writeFileSync(mdPath, this.formatAsMarkdown(summary));

    return { jsonPath, mdPath };
  }
}
