/**
 * Sentiment Analysis Skill
 * Performs deep sentiment analysis on a meeting summary using Claude AI.
 */

import Anthropic from '@anthropic-ai/sdk';
import { config, validateConfig } from './config.js';

export class SentimentSkill {
  constructor() {
    validateConfig();
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  /**
   * Run deep sentiment analysis on a meeting summary.
   * @param {object} summary - Meeting summary object
   * @returns {Promise<object>} Detailed sentiment report
   */
  async analyze(summary) {
    const summaryText = this._summaryToText(summary);

    const response = await this.client.messages.create({
      model: config.models.email,
      max_tokens: 1536,
      messages: [{
        role: 'user',
        content: `You are an expert meeting analyst specialising in emotional intelligence and team dynamics.
Perform a detailed sentiment analysis on this meeting summary.

${summaryText}

Return a JSON object with this exact structure:
{
  "overallSentiment": "positive | neutral | negative",
  "sentimentScore": <number from -1.0 (very negative) to 1.0 (very positive)>,
  "confidence": "high | medium | low",
  "emotionalTone": "brief phrase describing the dominant emotional tone",
  "breakdown": {
    "positive": <percentage 0-100>,
    "neutral": <percentage 0-100>,
    "negative": <percentage 0-100>
  },
  "highlights": {
    "positive": ["key positive signal 1", "key positive signal 2"],
    "concerns": ["concern or risk 1", "concern or risk 2"]
  },
  "topicSentiments": [
    { "topic": "topic name", "sentiment": "positive | neutral | negative", "note": "brief reason" }
  ],
  "teamDynamics": "2-3 sentence assessment of team energy, alignment, and engagement",
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2", "actionable recommendation 3"]
}

Return only the JSON object.`,
      }],
    });

    const raw = response.content[0].text.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');
    return JSON.parse(match[0]);
  }

  _summaryToText(summary) {
    const parts = [`Meeting: ${summary.title || 'Unknown'}`, `Date: ${summary.date || 'N/A'}`];
    if (summary.attendees?.length) parts.push(`Attendees: ${summary.attendees.join(', ')}`);
    if (summary.overview)          parts.push(`\nOverview: ${summary.overview}`);
    if (summary.keyPoints?.length) {
      parts.push('\nKey Points:');
      summary.keyPoints.forEach(p => parts.push(`  - ${p}`));
    }
    if (summary.decisions?.length) {
      parts.push('\nDecisions:');
      summary.decisions.forEach(d => parts.push(`  - ${d}`));
    }
    if (summary.actionItems?.length) {
      parts.push('\nAction Items:');
      summary.actionItems.forEach(i => parts.push(`  - ${i.task} (${i.owner})`));
    }
    if (summary.nextSteps?.length) {
      parts.push('\nNext Steps:');
      summary.nextSteps.forEach(s => parts.push(`  - ${s}`));
    }
    return parts.join('\n');
  }
}
