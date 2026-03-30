/**
 * Insights Skill
 * Extracts business keywords and topics from meeting summaries
 * and builds heatmap data for visualization.
 */

import Anthropic from '@anthropic-ai/sdk';
import { config, validateConfig } from './config.js';

export const CATEGORY_COLORS = {
  economics:   '#B5923A',
  finance:     '#003087',
  hr:          '#005EB8',
  technology:  '#0891B2',
  strategy:    '#7C3AED',
  market:      '#0D7A4E',
  operations:  '#C2410C',
  other:       '#5A7399',
};

export class InsightsSkill {
  constructor() {
    validateConfig();
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  async extractKeywords(summaries) {
    if (!summaries.length) return { keywords: [], heatmapData: [], categories: CATEGORY_COLORS };

    const combinedText = summaries.map(({ data }) => [
      `Meeting: ${data.title}`,
      `Overview: ${data.overview || ''}`,
      ...(data.keyPoints   || []).map(p => `- ${p}`),
      ...(data.decisions   || []).map(d => `- ${d}`),
      ...(data.nextSteps   || []).map(s => `- ${s}`),
      ...(data.actionItems || []).map(i => `- ${i.task}`),
    ].join('\n')).join('\n\n===\n\n');

    const prompt = `Analyze these meeting summaries and extract the most important business keywords and topics discussed.

${combinedText}

Return ONLY a JSON object with this exact structure:
{
  "keywords": [
    {"word": "inflation", "count": 3, "category": "economics"},
    {"word": "attrition", "count": 2, "category": "hr"}
  ]
}

Rules:
- Extract 20 to 30 meaningful business keywords or topics
- category must be one of: economics, finance, hr, technology, strategy, market, operations, other
- count = number of meetings (out of ${summaries.length}) where this topic appears
- Focus on domain-specific terms (e.g. ETF, inflation, attrition, cloud migration, roadmap, churn)
- Ignore generic words like: meeting, discuss, team, update, review, noted, also, will
- Sort by count descending
- Return only valid JSON, no other text`;

    const response = await this.client.messages.create({
      model: config.models.summarization,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    let keywords = [];
    try {
      const match = response.content[0].text.match(/\{[\s\S]*\}/);
      keywords = JSON.parse(match[0]).keywords || [];
    } catch { keywords = []; }

    // Build per-meeting heatmap counts via string matching
    const heatmapData = keywords.slice(0, 15).map(kw => ({
      ...kw,
      meetings: summaries.map(({ data }) => {
        const text = JSON.stringify(data).toLowerCase();
        const count = (text.match(new RegExp(kw.word.toLowerCase(), 'g')) || []).length;
        return { title: data.title || 'Untitled', count: Math.min(count, 5) };
      }),
    }));

    return { keywords, heatmapData, categories: CATEGORY_COLORS };
  }
}
