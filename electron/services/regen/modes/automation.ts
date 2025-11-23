/**
 * Automation Mode Handler
 * Handles automation creation, management, and execution
 */

import { createLogger } from '../../utils/logger';
import type { RegenMessage, RegenResponse } from '../core';
import type { LanguageCode } from '../language/detector';
import { getResponseLanguage } from '../session';
import * as n8nTools from '../tools/n8nTools';
import * as tradeTools from '../tools/tradeTools';

const log = createLogger('regen-automation');

/**
 * Handle automation commands
 */
export async function handleAutomation(
  msg: RegenMessage,
  detectedLang: LanguageCode
): Promise<RegenResponse> {
  log.info('Handling automation command', { message: msg.message, language: detectedLang });

  const responseLang = getResponseLanguage(msg.sessionId);
  const lower = msg.message.toLowerCase();
  const response: RegenResponse = {
    intent: 'automate',
    text: '',
    commands: [],
  };

  // Parse automation commands
  if (lower.includes('stop') && (lower.includes('automation') || lower.includes('all'))) {
    // Stop all automations
    const userId = msg.sessionId; // Use sessionId as userId for now
    const count = tradeTools.stopAllAutomations(userId);

    const stopMessages: Record<LanguageCode, string> = {
      ta: `${count} தானியக்கங்கள் நிறுத்தப்பட்டது.`,
      hi: `${count} स्वचालन रोक दिए गए।`,
      en: `Stopped ${count} automation(s).`,
      te: `${count} ఆటోమేషన్లు ఆపబడ్డాయి.`,
      kn: `${count} ಸ್ವಯಂಚಾಲನೆಗಳನ್ನು ನಿಲ್ಲಿಸಲಾಗಿದೆ.`,
      ml: `${count} ഓട്ടോമേഷനുകൾ നിർത്തി.`,
      mr: `${count} स्वयंचलित रोखले.`,
      gu: `${count} ઓટોમેશન બંધ કર્યા.`,
      pa: `${count} ਆਟੋਮੇਸ਼ਨ ਰੋਕ ਦਿੱਤੇ.`,
      bn: `${count}টি অটোমেশন বন্ধ করা হয়েছে।`,
    };

    response.text = stopMessages[responseLang] || stopMessages.en;
  } else if (lower.includes('list') && lower.includes('automation')) {
    // List automations
    const userId = msg.sessionId;
    const automations = tradeTools.listAutomations(userId);

    if (automations.length === 0) {
      response.text = 'No active automations.';
    } else {
      response.text = `You have ${automations.length} active automation(s).`;
      response.metadata = { automations };
    }
  } else if (lower.includes('watch') || lower.includes('monitor')) {
    // Create page watch automation
    const url = extractUrl(msg.message) || msg.context?.url;
    if (!url) {
      response.text = 'Please provide a URL to watch.';
      return response;
    }

    // Extract threshold if mentioned
    const threshold = extractNumber(msg.message);

    const result = await n8nTools.runWatchPageWorkflow(url, threshold, msg.sessionId);

    if (result.success) {
      const watchMessages: Record<LanguageCode, string> = {
        ta: 'பக்கத்தை கண்காணிக்கிறது. நீங்கள் எச்சரிக்கை பெறுவீர்கள்.',
        hi: 'पेज की निगरानी कर रहा है। आपको अलर्ट मिलेगा।',
        en: 'Watching page. You will receive alerts when conditions are met.',
        te: 'పేజీని వీక్షిస్తోంది. మీరు హెచ్చరికలను పొందుతారు.',
        kn: 'ಪುಟವನ್ನು ವೀಕ್ಷಿಸುತ್ತಿದೆ. ನೀವು ಎಚ್ಚರಿಕೆಗಳನ್ನು ಸ್ವೀಕರಿಸುತ್ತೀರಿ.',
        ml: 'പേജ് നിരീക്ഷിക്കുന്നു. നിങ്ങൾക്ക് അലേർട്ടുകൾ ലഭിക്കും.',
        mr: 'पृष्ठ पाहत आहे. तुम्हाला सतर्कता मिळेल.',
        gu: 'પૃષ્ઠ જોઈ રહ્યું છે. તમને સતર્કતા મળશે.',
        pa: 'ਪੰਨਾ ਦੇਖ ਰਿਹਾ ਹੈ। ਤੁਹਾਨੂੰ ਚੇਤਾਵਨੀਆਂ ਮਿਲਣਗੀਆਂ।',
        bn: 'পৃষ্ঠা দেখছে। আপনি সতর্কতা পাবেন।',
      };

      response.text = watchMessages[responseLang] || watchMessages.en;
    } else {
      response.text = 'Failed to create automation. Please try again.';
      response.metadata = { error: result.error };
    }
  } else {
    // Generic automation help
    response.text =
      'I can help you create automations. Try:\n- "Watch this page for price changes"\n- "Stop all automations"\n- "List automations"';
  }

  return response;
}

/**
 * Extract URL from message
 */
function extractUrl(message: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/;
  const match = message.match(urlRegex);
  return match ? match[1] : null;
}

/**
 * Extract number from message
 */
function extractNumber(message: string): number | undefined {
  const match = message.match(/(\d+(?:\.\d+)?)%/);
  return match ? parseFloat(match[1]) : undefined;
}
