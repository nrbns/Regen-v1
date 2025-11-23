/**
 * Browser Navigation Mode Handler
 * Handles navigation commands (scroll, click, go back, etc.)
 */

import { createLogger } from '../../utils/logger';
import type { RegenMessage, RegenResponse } from '../core';
import type { LanguageCode } from '../language/detector';
import { findCommandAction } from '../language/commands';
import { getResponseLanguage } from '../session';

const log = createLogger('regen-browser');

/**
 * Handle browser navigation commands
 */
export async function handleBrowserNav(
  msg: RegenMessage,
  detectedLang: LanguageCode
): Promise<RegenResponse> {
  log.info('Handling browser navigation', { message: msg.message, language: detectedLang });

  const responseLang = getResponseLanguage(msg.sessionId);
  const response: RegenResponse = {
    intent: 'navigate',
    text: '',
    commands: [],
  };

  // Find command action from multilingual dictionary
  const action = findCommandAction(msg.message, detectedLang);

  if (!action) {
    // No command found, try to understand intent
    const lower = msg.message.toLowerCase();

    if (lower.includes('scroll')) {
      const direction = lower.includes('down') ? 'down' : 'up';
      const amount = extractNumber(msg.message) || 500;

      response.commands = [
        {
          type: 'SCROLL',
          payload: {
            tabId: msg.tabId || 'current',
            direction,
            amount,
          },
        },
      ];

      const scrollMessages: Record<LanguageCode, string> = {
        ta: `கீழே ${amount}px ஸ்க்ரோல் செய்கிறது...`,
        hi: `${amount}px नीचे स्क्रोल कर रहा है...`,
        en: `Scrolling ${direction} by ${amount}px...`,
        te: `${amount}px క్రిందికి స్క్రోల్ చేస్తోంది...`,
        kn: `${amount}px ಕೆಳಗೆ ಸ್ಕ್ರೋಲ್ ಮಾಡುತ್ತಿದೆ...`,
        ml: `${amount}px താഴേക്ക് സ്ക്രോൾ ചെയ്യുന്നു...`,
        mr: `${amount}px खाली स्क्रोल करत आहे...`,
        gu: `${amount}px નીચે સ્ક્રોલ કરી રહ્યું છે...`,
        pa: `${amount}px ਹੇਠਾਂ ਸਕ੍ਰੋਲ ਕਰ ਰਿਹਾ ਹੈ...`,
        bn: `${amount}px নিচে স্ক্রল করছে...`,
      };

      response.text = scrollMessages[responseLang] || scrollMessages.en;
    } else {
      // Generic response
      response.text = 'I understand. What would you like me to do?';
    }

    return response;
  }

  // Execute command based on action
  switch (action) {
    case 'SCROLL': {
      const direction = msg.message.toLowerCase().includes('down') ? 'down' : 'up';
      const amount = extractNumber(msg.message) || 500;

      response.commands = [
        {
          type: 'SCROLL',
          payload: {
            tabId: msg.tabId || 'current',
            direction,
            amount,
          },
        },
      ];

      const scrollMessages: Record<LanguageCode, string> = {
        ta: 'பக்கம் ஸ்க்ரோல் செய்கிறது...',
        hi: 'पेज स्क्रोल कर रहा है...',
        en: 'Scrolling page...',
        te: 'పేజీ స్క్రోల్ చేస్తోంది...',
        kn: 'ಪುಟವನ್ನು ಸ್ಕ್ರೋಲ್ ಮಾಡುತ್ತಿದೆ...',
        ml: 'പേജ് സ്ക്രോൾ ചെയ്യുന്നു...',
        mr: 'पृष्ठ स्क्रोल करत आहे...',
        gu: 'પૃષ્ઠ સ્ક્રોલ કરી રહ્યું છે...',
        pa: 'ਪੰਨਾ ਸਕ੍ਰੋਲ ਕਰ ਰਿਹਾ ਹੈ...',
        bn: 'পৃষ্ঠা স্ক্রল করছে...',
      };

      response.text = scrollMessages[responseLang] || scrollMessages.en;
      break;
    }

    case 'CLICK': {
      // Extract target (first, second, etc.)
      const target = extractTarget(msg.message);

      response.commands = [
        {
          type: 'GET_DOM',
          payload: { tabId: msg.tabId || 'current' },
        },
        {
          type: 'CLICK',
          payload: {
            tabId: msg.tabId || 'current',
            target,
          },
        },
      ];

      const clickMessages: Record<LanguageCode, string> = {
        ta: 'உறுப்பைக் கிளிக் செய்கிறது...',
        hi: 'तत्व पर क्लिक कर रहा है...',
        en: 'Clicking element...',
        te: 'ఎలిమెంట్ క్లిక్ చేస్తోంది...',
        kn: 'ಅಂಶವನ್ನು ಕ್ಲಿಕ್ ಮಾಡುತ್ತಿದೆ...',
        ml: 'ഘടകം ക്ലിക്ക് ചെയ്യുന്നു...',
        mr: 'घटकावर क्लिक करत आहे...',
        gu: 'તત્વ પર ક્લિક કરી રહ્યું છે...',
        pa: "ਤੱਤ 'ਤੇ ਕਲਿਕ ਕਰ ਰਿਹਾ ਹੈ...",
        bn: 'উপাদানে ক্লিক করছে...',
      };

      response.text = clickMessages[responseLang] || clickMessages.en;
      break;
    }

    case 'OPEN': {
      // Extract URL or search term
      const urls = extractUrls(msg.message);

      if (urls.length > 0) {
        response.commands = urls.map(url => ({
          type: 'OPEN_TAB',
          payload: { url },
        }));
      }

      const openMessages: Record<LanguageCode, string> = {
        ta: `${urls.length} தாவல்களைத் திறக்கிறது...`,
        hi: `${urls.length} टैब खोल रहा है...`,
        en: `Opening ${urls.length} tab(s)...`,
        te: `${urls.length} టాబ్లను తెరుస్తోంది...`,
        kn: `${urls.length} ಟ್ಯಾಬ್ಗಳನ್ನು ತೆರೆಯುತ್ತಿದೆ...`,
        ml: `${urls.length} ടാബുകൾ തുറക്കുന്നു...`,
        mr: `${urls.length} टॅब उघडत आहे...`,
        gu: `${urls.length} ટેબ્સ ખોલી રહ્યું છે...`,
        pa: `${urls.length} ਟੈਬਾਂ ਖੋਲ੍ਹ ਰਿਹਾ ਹੈ...`,
        bn: `${urls.length}টি ট্যাব খুলছে...`,
      };

      response.text = openMessages[responseLang] || openMessages.en;
      break;
    }

    case 'BACK': {
      response.commands = [
        {
          type: 'WAIT',
          payload: { action: 'navigate', direction: 'back' },
        },
      ];

      const backMessages: Record<LanguageCode, string> = {
        ta: 'பின்னால் செல்கிறது...',
        hi: 'पीछे जा रहा है...',
        en: 'Going back...',
        te: 'వెనక్కి వెళ్తోంది...',
        kn: 'ಹಿಂದಕ್ಕೆ ಹೋಗುತ್ತಿದೆ...',
        ml: 'പിന്നിലേക്ക് പോകുന്നു...',
        mr: 'मागे जात आहे...',
        gu: 'પાછળ જઈ રહ્યું છે...',
        pa: 'ਪਿੱਛੇ ਜਾ ਰਿਹਾ ਹੈ...',
        bn: 'পিছনে যাচ্ছে...',
      };

      response.text = backMessages[responseLang] || backMessages.en;
      break;
    }

    case 'FORWARD': {
      response.commands = [
        {
          type: 'WAIT',
          payload: { action: 'navigate', direction: 'forward' },
        },
      ];

      response.text = 'Going forward...';
      break;
    }

    default:
      response.text = 'I understand. What would you like me to do?';
      break;
  }

  return response;
}

/**
 * Extract number from message
 */
function extractNumber(message: string): number | null {
  const match = message.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extract target element from message
 */
function extractTarget(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('first')) return 'first';
  if (lower.includes('second')) return 'second';
  if (lower.includes('third')) return 'third';
  if (lower.includes('last')) return 'last';
  return 'first';
}

/**
 * Extract URLs from message
 */
function extractUrls(message: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = message.match(urlRegex);
  return matches || [];
}
