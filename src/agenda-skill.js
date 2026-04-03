/**
 * Agenda Skill
 * Generates a structured meeting agenda for the next meeting
 * based on the previous meeting's summary (next steps, action items, decisions).
 */

import Anthropic from '@anthropic-ai/sdk';
import { config, validateConfig } from './config.js';

export class AgendaSkill {
  constructor() {
    validateConfig();
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  /**
   * Generate a next-meeting agenda from a summary object.
   * @param {object} summary - Meeting summary from Summarizer
   * @returns {Promise<string>} - Markdown agenda string
   */
  async generateAgenda(summary) {
    const summaryText = this._summaryToText(summary);

    const prompt = `You are an expert meeting facilitator. Based on the previous meeting summary below, generate a structured agenda for the NEXT follow-up meeting.

Previous Meeting Summary:
${summaryText}

Create a practical agenda in this exact markdown format:

# Agenda: [Follow-up to: Meeting Title]
**Date:** TBD
**Time:** TBD
**Attendees:** [List from previous meeting]

## 1. Welcome & Recap (5 min)
Brief recap of previous meeting decisions.

## 2. Action Item Status Updates (10 min)
Review progress on outstanding action items:
[List each action item with owner]

## 3. [Agenda item from next steps] (X min)
[Brief description]

[Continue for each next step, assigning realistic time estimates]

## [Last - 1]. Open Discussion & New Business (5 min)

## [Last]. Next Steps & Wrap-up (5 min)
Assign new action items and confirm owners.

---
**Total Estimated Duration:** [Sum of all times] min

Return only the markdown agenda, no other text.`;

    const response = await this.client.messages.create({
      model: config.models.email,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0].text.trim();
  }

  _summaryToText(summary) {
    const parts = [];
    parts.push(`Title: ${summary.title || 'Meeting'}`);
    parts.push(`Date: ${summary.date || 'N/A'}`);
    if (summary.attendees?.length) parts.push(`Attendees: ${summary.attendees.join(', ')}`);
    if (summary.overview) parts.push(`\nOverview: ${summary.overview}`);
    if (summary.decisions?.length) {
      parts.push('\nDecisions Made:');
      summary.decisions.forEach(d => parts.push(`  - ${d}`));
    }
    if (summary.actionItems?.length) {
      parts.push('\nAction Items:');
      summary.actionItems.forEach(i => parts.push(`  - ${i.task} (Owner: ${i.owner}, Due: ${i.deadline})`));
    }
    return parts.join('\n');
  }
}
