/**
 * Pre-Meeting Brief Skill
 * Generates a structured AI brief for an upcoming client meeting.
 */

import Anthropic from '@anthropic-ai/sdk';
import { config, validateConfig } from './config.js';

export class BriefSkill {
  constructor() {
    validateConfig();
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  /**
   * Generate a pre-meeting brief for a client.
   * @param {object} client - Client profile from ClientStore
   * @param {object[]} pastSummaries - Array of past meeting summary objects
   * @returns {Promise<object>} Structured brief
   */
  async generateBrief(client, pastSummaries = []) {
    const historyText = this._summarizeHistory(pastSummaries);

    const prompt = `You are a senior relationship manager at an Asset Management firm preparing for a client meeting.
Generate a comprehensive pre-meeting brief based on the client profile and meeting history below.

CLIENT PROFILE:
  Name              : ${client.name}
  Company           : ${client.company || 'N/A'}
  AUM Tier          : ${client.aumTier || 'N/A'}
  Risk Profile      : ${client.riskProfile || 'N/A'}
  Relationship Stage: ${client.relationshipStage || 'N/A'}
  Product Interests : ${(client.productInterests || []).join(', ') || 'None specified'}
  Advisor Notes     : ${client.advisorNotes || 'None'}

PAST MEETING HISTORY (most recent first):
${historyText || 'No past meetings recorded for this client.'}

Generate a detailed pre-meeting brief. Return a JSON object with exactly this structure:
{
  "meetingObjective": "A single clear sentence stating the primary goal for this meeting",
  "clientSnapshot": "2-3 sentences summarizing who this client is, their current status, and what matters most to them",
  "relationshipHistory": "A concise paragraph summarizing the relationship journey, key milestones, and current standing",
  "keyThemes": ["theme 1", "theme 2", "theme 3"],
  "talkingPoints": [
    { "point": "specific topic to raise", "rationale": "why this is relevant now" },
    { "point": "specific topic to raise", "rationale": "why this is relevant now" },
    { "point": "specific topic to raise", "rationale": "why this is relevant now" }
  ],
  "risksToWatch": ["risk or sensitivity 1", "risk or sensitivity 2"],
  "suggestedQuestions": [
    "Open-ended question to deepen understanding",
    "Question to uncover needs or concerns",
    "Question to advance the relationship"
  ],
  "recommendedProducts": ["product or strategy aligned to their interests/profile"],
  "nextStepSuggestion": "Specific recommended next step after this meeting"
}

Return only the JSON object, no markdown or other text.`;

    const response = await this.client.messages.create({
      model: config.models.summarization,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in AI response');
    return JSON.parse(jsonMatch[0]);
  }

  _summarizeHistory(summaries) {
    if (!summaries.length) return '';
    return summaries
      .slice(-5)
      .reverse()
      .map((s, i) => {
        const parts = [`[${i + 1}] ${s.title || 'Meeting'} — ${s.date || 'N/A'}`];
        if (s.overview) parts.push(`    Overview    : ${s.overview}`);
        if (s.keyPoints?.length)
          parts.push(`    Key Points  : ${s.keyPoints.slice(0, 3).join(' | ')}`);
        if (s.actionItems?.length)
          parts.push(`    Action Items: ${s.actionItems.map(a => a.task).slice(0, 3).join(' | ')}`);
        return parts.join('\n');
      })
      .join('\n\n');
  }
}
