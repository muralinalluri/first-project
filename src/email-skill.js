/**
 * Follow-Up Email Skill
 * Generates a professional follow-up email based on the meeting summary.
 * Can be invoked as a standalone skill or integrated into the main app.
 *
 * Usage as a skill:
 *   node src/email-skill.js --summary outputs/summary-2024-01-01.json
 *   node src/email-skill.js --summary outputs/summary-2024-01-01.json --tone formal
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { config, validateConfig } from './config.js';

const EMAIL_TONE_PROMPTS = {
  formal: 'Write in a formal, professional tone suitable for business correspondence.',
  friendly: 'Write in a warm, friendly but professional tone.',
  concise: 'Write in a very concise, bullet-point style. Keep it brief.',
  detailed: 'Write in a detailed style, elaborating on each point with context.',
};

export class EmailSkill {
  constructor() {
    validateConfig();
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  /**
   * Generate a follow-up email from a meeting summary.
   * @param {object} summary - Meeting summary object from Summarizer
   * @param {object} options - Email options
   * @param {string} options.tone - Email tone: formal|friendly|concise|detailed
   * @param {string} options.senderName - Name of the email sender
   * @param {string} options.senderTitle - Title of the email sender
   * @param {string[]} options.recipients - List of recipient names/emails
   * @returns {Promise<object>} - {subject, body, plainText}
   */
  async generateEmail(summary, options = {}) {
    const {
      tone = 'formal',
      senderName = 'Meeting Organizer',
      senderTitle = '',
      recipients = [],
      emailType = 'follow-up',
    } = options;

    const toneInstruction = EMAIL_TONE_PROMPTS[tone] || EMAIL_TONE_PROMPTS.formal;

    const recipientLine = recipients.length
      ? `Recipients: ${recipients.join(', ')}`
      : 'Recipients: Meeting Attendees';

    const summaryText = this._summaryToText(summary);

    const isThankYou = emailType === 'thank-you';

    const prompt = `You are a professional business communication expert.
Generate a ${isThankYou ? 'thank-you' : 'follow-up'} email based on this meeting summary.

${toneInstruction}

${recipientLine}
Sender: ${senderName}${senderTitle ? ` (${senderTitle})` : ''}

Meeting Summary:
${summaryText}

Generate a complete ${isThankYou ? 'thank-you' : 'follow-up'} email. Return a JSON object with this structure:
{
  "subject": "Email subject line",
  "body": "Full email body in HTML format with proper paragraphs and lists",
  "plainText": "Full email body in plain text format"
}

${isThankYou ? `The thank-you email should:
1. Open with sincere thanks for attendees' time and participation
2. Highlight what was accomplished or decided in the meeting
3. Briefly acknowledge each person's contribution if attendees are listed
4. Express enthusiasm about the outcomes and next steps
5. Close warmly and professionally` : `The email should:
1. Thank attendees for their time
2. Recap the key discussion points briefly
3. List decisions made
4. Clearly state action items with owners and deadlines
5. Outline next steps
6. Include a professional closing`}

Return only the JSON object, no other text.`;

    const response = await this.client.messages.create({
      model: config.models.email,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const rawContent = response.content[0].text.trim();

    let email;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      email = JSON.parse(jsonMatch[0]);
    } catch {
      // Fallback: treat entire response as plain text body
      email = {
        subject: `Follow-up: ${summary.title || 'Our Meeting'}`,
        body: `<p>${rawContent.replace(/\n/g, '</p><p>')}</p>`,
        plainText: rawContent,
      };
    }

    return email;
  }

  /**
   * Convert summary object to readable text for the prompt.
   */
  _summaryToText(summary) {
    const parts = [];

    parts.push(`Title: ${summary.title || 'Meeting'}`);
    parts.push(`Date: ${summary.date || 'N/A'}`);
    if (summary.attendees?.length) {
      parts.push(`Attendees: ${summary.attendees.join(', ')}`);
    }

    parts.push(`\nOverview: ${summary.overview || ''}`);

    if (summary.keyPoints?.length) {
      parts.push('\nKey Points:');
      summary.keyPoints.forEach(p => parts.push(`  - ${p}`));
    }

    if (summary.decisions?.length) {
      parts.push('\nDecisions Made:');
      summary.decisions.forEach(d => parts.push(`  - ${d}`));
    }

    if (summary.actionItems?.length) {
      parts.push('\nAction Items:');
      summary.actionItems.forEach(item => {
        parts.push(`  - ${item.task} (Owner: ${item.owner}, Due: ${item.deadline})`);
      });
    }

    if (summary.nextSteps?.length) {
      parts.push('\nNext Steps:');
      summary.nextSteps.forEach(s => parts.push(`  - ${s}`));
    }

    return parts.join('\n');
  }

  /**
   * Save the generated email to the output directory.
   * @param {object} email - {subject, body, plainText}
   * @param {string} baseFilename
   * @returns {{htmlPath: string, txtPath: string}}
   */
  saveEmail(email, baseFilename = 'followup-email') {
    const outputDir = config.output.dir;
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const htmlPath = join(outputDir, `${baseFilename}-${timestamp}.html`);
    const txtPath = join(outputDir, `${baseFilename}-${timestamp}.txt`);

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${email.subject}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; color: #333; line-height: 1.6; }
    h1 { color: #2c3e50; }
    .subject { background: #f8f9fa; padding: 12px; border-left: 4px solid #3498db; margin-bottom: 20px; }
    ul { padding-left: 20px; }
    li { margin: 4px 0; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <div class="subject"><strong>Subject:</strong> ${email.subject}</div>
  ${email.body}
</body>
</html>`;

    writeFileSync(htmlPath, htmlContent);
    writeFileSync(txtPath, `Subject: ${email.subject}\n\n${email.plainText}`);

    return { htmlPath, txtPath };
  }
}

// ─── Standalone CLI ───────────────────────────────────────────────────────────
// Run as: node src/email-skill.js --summary outputs/summary.json --tone formal

if (process.argv[1].endsWith('email-skill.js')) {
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : null;
  };

  const summaryPath = getArg('--summary');
  const tone = getArg('--tone') || 'formal';
  const sender = getArg('--sender') || 'Meeting Organizer';

  if (!summaryPath) {
    console.error('Usage: node src/email-skill.js --summary <path-to-summary.json> [--tone formal|friendly|concise|detailed] [--sender "Your Name"]');
    process.exit(1);
  }

  if (!existsSync(summaryPath)) {
    console.error(`Summary file not found: ${summaryPath}`);
    process.exit(1);
  }

  (async () => {
    try {
      const summary = JSON.parse(readFileSync(summaryPath, 'utf-8'));
      const skill = new EmailSkill();

      console.log('Generating follow-up email...');
      const email = await skill.generateEmail(summary, { tone, senderName: sender });
      const { htmlPath, txtPath } = skill.saveEmail(email);

      console.log('\n✓ Follow-up email generated!');
      console.log(`  Subject : ${email.subject}`);
      console.log(`  HTML    : ${htmlPath}`);
      console.log(`  Text    : ${txtPath}`);
      console.log('\n--- Email Preview ---\n');
      console.log(email.plainText);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  })();
}
