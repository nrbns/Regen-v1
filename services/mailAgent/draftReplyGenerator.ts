/**
 * Draft Reply Generator
 * Creates intelligent reply drafts using LLM + context
 */

import type { EmailThread, EmailSummary, DraftReply } from './types';
import { getCachedLLMClient } from '../llmClient';

/**
 * Tone options for reply
 */
type ReplyTone = 'professional' | 'casual' | 'appreciative' | 'urgent';

/**
 * Draft Reply Generator
 */
export class DraftReplyGenerator {
  /**
   * Generate draft reply from thread + summary
   */
  async generateDraft(
    thread: EmailThread,
    summary: EmailSummary,
    userId: string,
    options?: {
      tone?: ReplyTone;
      maxLength?: number;
    }
  ): Promise<DraftReply> {
    const tone = options?.tone || this.selectTone(summary);
    const maxLength = options?.maxLength || 500;

    try {
      // Use LLM to generate reply
      const client = getCachedLLMClient();
      const prompt = this.buildPrompt(thread, summary, tone, maxLength);

      const response = await client.chat.completions.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4.5',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: Math.ceil(maxLength / 4) + 100, // tokens ≈ words/4
      });

      const draftBody = response.choices[0]?.message?.content || '';

      // Extract recipient from thread
      const replyTo = thread.from || '';

      const draft: DraftReply = {
        threadId: thread.id,
        to: replyTo,
        subject: `Re: ${thread.subject}`,
        body: draftBody,
        confidence: 0.85, // LLM-generated drafts: medium-high confidence
      };

      console.log(`[DraftReplyGenerator] Generated draft for thread ${thread.id}`);
      return draft;
    } catch (error) {
      console.warn(`[DraftReplyGenerator] LLM failed, falling back to template:`, error);
      return this.generateTemplateReply(thread, summary, tone);
    }
  }

  /**
   * Generate multiple reply options (user chooses)
   */
  async generateOptions(
    thread: EmailThread,
    summary: EmailSummary,
    userId: string
  ): Promise<DraftReply[]> {
    const tones: ReplyTone[] = ['professional', 'casual', 'appreciative'];
    const options: DraftReply[] = [];

    for (const tone of tones) {
      const draft = await this.generateDraft(thread, summary, userId, { tone });
      options.push(draft);
    }

    return options;
  }

  /**
   * Auto-select tone based on sentiment + urgency
   */
  private selectTone(summary: EmailSummary): ReplyTone {
    if (summary.isUrgent) return 'urgent';
    if (summary.sentiment === 'positive') return 'appreciative';
    if (summary.sentiment === 'negative') return 'professional';
    return 'casual';
  }

  /**
   * Build prompt for LLM
   */
  private buildPrompt(
    thread: EmailThread,
    summary: EmailSummary,
    tone: ReplyTone,
    maxLength: number
  ): string {
    const toneGuidelines: Record<ReplyTone, string> = {
      professional: 'Be formal, concise, and action-oriented. Focus on facts and next steps.',
      casual: 'Be friendly and conversational. Use a warm, approachable tone.',
      appreciative: "Express gratitude and positivity. Acknowledge the sender's effort.",
      urgent: 'Be direct and immediate. Prioritize the most critical information.',
    };

    return `
You are an email assistant. Generate a concise reply to the following email summary.

**Sender**: ${thread.from}
**Subject**: ${thread.subject}
**Summary**: ${summary.keyPoints.join(' ')}
**Action Items**: ${summary.actionItems.join(', ') || 'None'}
**Sentiment**: ${summary.sentiment}

**Guidelines**:
- Tone: ${toneGuidelines[tone]}
- Max length: ${maxLength} characters
- Be professional yet human
- Address the main points from the summary
- If there are action items, acknowledge them
- Include a polite closing

Generate only the reply body, no subject line or greeting. Start directly with the content.
`;
  }

  /**
   * Fallback: template-based reply
   */
  private generateTemplateReply(
    thread: EmailThread,
    summary: EmailSummary,
    tone: ReplyTone
  ): DraftReply {
    const templates: Record<ReplyTone, (summary: EmailSummary) => string> = {
      professional: s =>
        `Thank you for your email. I've reviewed your message and the key points you mentioned. 
${s.actionItems.length > 0 ? `I will address the following items: ${s.actionItems.slice(0, 2).join(', ')}.` : 'Please let me know how I can assist further.'}
Best regards`,

      casual: s =>
        `Thanks for reaching out! I appreciate you taking the time to send this. 
${s.actionItems.length > 0 ? `I'll get on these items: ${s.actionItems.slice(0, 2).join(', ')}.` : 'Talk soon!'}`,

      appreciative: s =>
        `Thank you so much for your message! I really appreciate your thoughtfulness. 
${s.actionItems.length > 0 ? `I'll take care of ${s.actionItems[0]}.` : 'Looking forward to staying in touch!'}`,

      urgent: s =>
        `Acknowledged. Priority items: ${s.actionItems.slice(0, 2).join(', ') || 'noted'}.
Will confirm updates within 24 hours.`,
    };

    const replyBody = templates[tone](summary);
    const replyTo = thread.from || '';

    return {
      threadId: thread.id,
      to: replyTo,
      subject: `Re: ${thread.subject}`,
      body: replyBody,
      confidence: 0.6, // Template-based: lower confidence
    };
  }

  /**
   * Extract sender from Gmail message headers
   */
  private extractSender(message: any): string | null {
    if (!message?.payload?.headers) return null;

    const fromHeader = message.payload.headers.find((h: any) => h.name.toLowerCase() === 'from');
    return fromHeader?.value || null;
  }
}

/**
 * Factory
 */
export function createDraftGenerator(): DraftReplyGenerator {
  return new DraftReplyGenerator();
}
