/**
 * Competitor Mention Tracker
 * Scans meeting summaries for competitor mentions and returns structured analysis.
 */

import Anthropic from '@anthropic-ai/sdk';
import { config, validateConfig } from './config.js';

export class CompetitorSkill {
  constructor() {
    validateConfig();
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  /**
   * @param {{ id: string, data: object }[]} summaries  — from getAllSummaries()
   * @param {string} yourCompany  — the advisor's firm name to exclude
   */
  async analyze(summaries, yourCompany = 'Nalluri&Co.') {
    if (!summaries.length) return { competitors: [], yourCompany, totalMeetings: 0 };

    const meetingTexts = summaries.map(({ data }) => {
      const parts = [
        `Meeting: ${data.title || 'Untitled'} (${data.date || 'N/A'})`,
        data.overview ? `Overview: ${data.overview}` : '',
        data.keyPoints?.length ? `Key Points: ${data.keyPoints.join(' | ')}` : '',
        data.decisions?.length ? `Decisions: ${data.decisions.join(' | ')}` : '',
        data.actionItems?.length
          ? `Actions: ${data.actionItems.map(a => a.task).join(' | ')}`
          : '',
      ].filter(Boolean);
      return parts.join('\n');
    }).join('\n\n---\n\n');

    const prompt = `You are an intelligence analyst for an Asset Management firm called "${yourCompany}".
Analyze the following meeting notes and identify every competitor firm, fund, or financial product/platform that was mentioned — directly or indirectly.

IMPORTANT:
- Exclude "${yourCompany}" and its own products — only report external competitors.
- A competitor is any other asset management firm, bank, brokerage, fintech platform, fund, or financial service provider mentioned.
- If a company name is ambiguous, include it with a note.
- For each competitor extract: exact name as mentioned, which meetings it appeared in, brief context quotes, and the overall tone (positive/neutral/negative) used when discussing them.

MEETING NOTES:
${meetingTexts}

Return a JSON object with this exact structure:
{
  "competitors": [
    {
      "name": "Competitor Name",
      "category": "asset manager | bank | fintech | fund | broker | other",
      "mentions": 3,
      "meetings": ["Meeting Title 1", "Meeting Title 2"],
      "contexts": ["brief quote or context 1", "brief quote or context 2"],
      "tone": "positive | neutral | negative",
      "toneNote": "one sentence explaining the tone"
    }
  ],
  "summary": "1-2 sentence overall competitive landscape summary"
}

If no competitors are found, return { "competitors": [], "summary": "No competitor mentions found in the analyzed meetings." }
Return only the JSON object, no other text.`;

    const response = await this.client.messages.create({
      model: config.models.summarization,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in AI response');

    const result = JSON.parse(jsonMatch[0]);
    result.yourCompany = yourCompany;
    result.totalMeetings = summaries.length;
    return result;
  }
}
