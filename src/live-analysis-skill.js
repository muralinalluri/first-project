/**
 * Live Meeting Analysis Skill
 * Real-time sentiment + JPMorgan product recommendations based on live transcript.
 */

import Anthropic from '@anthropic-ai/sdk';
import { config, validateConfig } from './config.js';

const JPM_PRODUCTS = [
  // ETFs
  { name: 'JPMorgan Equity Premium Income ETF', ticker: 'JEPI', category: 'ETF',
    focus: 'income, covered calls, low volatility, yield, conservative growth, dividends' },
  { name: 'JPMorgan Nasdaq Equity Premium Income ETF', ticker: 'JEPQ', category: 'ETF',
    focus: 'tech exposure, income, covered calls, growth plus yield, Nasdaq, technology' },
  { name: 'JPMorgan Ultra-Short Income ETF', ticker: 'JPST', category: 'ETF',
    focus: 'capital preservation, cash alternative, low duration, interest rate risk, liquidity, safety' },
  { name: 'JPMorgan Diversified Return US Equity ETF', ticker: 'JPUS', category: 'ETF',
    focus: 'factor-based, diversified US equity, value, quality, momentum, broad market' },
  { name: 'JPMorgan International Research Enhanced Equity ETF', ticker: 'JIRE', category: 'ETF',
    focus: 'international diversification, developed markets, active research, global exposure' },
  { name: 'JPMorgan Active Growth ETF', ticker: 'JGRO', category: 'ETF',
    focus: 'growth stocks, long-term capital appreciation, active management, high growth' },
  { name: 'JPMorgan Realty Income ETF', ticker: 'JPRE', category: 'ETF',
    focus: 'real estate, REITs, income, inflation hedge, alternative assets, property' },
  // Mutual Funds
  { name: 'JPMorgan Income Fund', ticker: null, category: 'Mutual Fund',
    focus: 'multi-asset income, moderate risk, regular distributions, balanced, steady income' },
  { name: 'JPMorgan US Equity Fund', ticker: null, category: 'Mutual Fund',
    focus: 'core US equity, growth, large cap, long-term capital appreciation, domestic stocks' },
  { name: 'JPMorgan Core Bond Fund', ticker: null, category: 'Mutual Fund',
    focus: 'investment grade bonds, fixed income, conservative, stability, interest rate, defensive' },
  { name: 'JPMorgan SmartRetirement Funds', ticker: null, category: 'Target-Date Fund',
    focus: 'retirement planning, target date, lifecycle, long-term, 401k, retirement income' },
  { name: 'JPMorgan Tax Aware Real Return Fund', ticker: null, category: 'Mutual Fund',
    focus: 'tax efficiency, inflation protection, TIPS, real return, tax sensitivity, after-tax' },
  { name: 'JPMorgan Global Select Equity Fund', ticker: null, category: 'Mutual Fund',
    focus: 'global equity, international, diversification, best ideas, active global management' },
  // Wealth & Advisory Services
  { name: 'J.P. Morgan Self-Directed Investing', ticker: null, category: 'Platform',
    focus: 'self-directed, control, low cost, hands-on, DIY investor, active trading, independence' },
  { name: 'J.P. Morgan Wealth Management', ticker: null, category: 'Advisory',
    focus: 'full-service advisory, financial planning, HNW, personalized advice, comprehensive' },
  { name: 'J.P. Morgan Private Bank', ticker: null, category: 'Private Bank',
    focus: 'ultra HNW, $10M+, bespoke, estate planning, alternative investments, family office, exclusive' },
];

export class LiveAnalysisSkill {
  constructor() {
    validateConfig();
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  /**
   * Analyze live transcript and recommend JPM products.
   * @param {string} transcript  — live speech transcript so far
   * @returns {Promise<object>}
   */
  async analyze(transcript) {
    const productCatalog = JPM_PRODUCTS.map(p =>
      `- ${p.name}${p.ticker ? ` (${p.ticker})` : ''} [${p.category}]: ${p.focus}`
    ).join('\n');

    const prompt = `You are a real-time AI advisor embedded in a meeting tool for Asset Management Sales Advisors at Nalluri&Co.

Analyze the live meeting transcript below to:
1. Assess the CLIENT's current emotional tone and engagement level
2. Identify specific financial signals — concerns, interests, goals, risk appetite — expressed by the client
3. Recommend 2–3 JPMorgan publicly available products that are most relevant RIGHT NOW based on what was just said

AVAILABLE JPMorgan PRODUCTS:
${productCatalog}

LIVE TRANSCRIPT:
"""
${transcript}
"""

Return a JSON object with this exact structure:
{
  "sentiment": "positive | cautious | negative | neutral",
  "sentimentScore": 0.7,
  "sentimentSignal": "One sentence explaining what in the conversation signals this sentiment",
  "engagementLevel": "high | medium | low",
  "detectedTopics": ["topic1", "topic2", "topic3"],
  "clientSignals": ["specific signal 1", "specific signal 2"],
  "recommendations": [
    {
      "productName": "Exact product name from catalog",
      "ticker": "TICKER or null",
      "category": "ETF | Mutual Fund | etc",
      "relevanceScore": 9,
      "whyNow": "One sentence tying this product directly to what the client just said",
      "talkingPoint": "One sentence the advisor can use to introduce this product naturally"
    }
  ],
  "advisorAlert": "Optional: one urgent tip for the advisor based on the conversation tone (e.g. client seems hesitant about fees — avoid leading with cost)"
}

Provide exactly 2–3 recommendations. Be specific and tie each recommendation directly to the conversation.
Return only the JSON object, no other text.`;

    const response = await this.client.messages.create({
      model: config.models.summarization,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in AI response');
    return JSON.parse(jsonMatch[0]);
  }
}
