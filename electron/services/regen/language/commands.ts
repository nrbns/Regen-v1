/**
 * Multilingual Command Dictionary
 * Maps navigation verbs across Indian languages to internal actions
 */

import type { LanguageCode } from './detector';

export type CommandAction =
  | 'CLICK'
  | 'SCROLL'
  | 'OPEN'
  | 'SEARCH'
  | 'SAVE'
  | 'CLOSE'
  | 'BACK'
  | 'FORWARD'
  | 'RELOAD';

interface CommandMapping {
  action: CommandAction;
  patterns: string[];
}

/**
 * Command dictionary per language
 */
const commandDictionary: Record<LanguageCode, CommandMapping[]> = {
  ta: [
    { action: 'CLICK', patterns: ['கிளிக்', 'கிளிக் பண்ணு', 'அழுத்து', 'அழுத்த', 'தட்டு'] },
    { action: 'SCROLL', patterns: ['ஸ்க்ரோல்', 'ஸ்க்ரோல் பண்ணு', 'உருட்டு', 'கீழே', 'மேலே'] },
    { action: 'OPEN', patterns: ['திற', 'திறக்க', 'திறப்பு', 'ஓப்பன்'] },
    { action: 'SEARCH', patterns: ['தேடு', 'தேடல்', 'வேலை', 'சர்ச்'] },
    { action: 'SAVE', patterns: ['சேமி', 'சேமிக்க', 'சேமிப்பு'] },
    { action: 'CLOSE', patterns: ['மூடு', 'மூட', 'க்ளோஸ்'] },
    { action: 'BACK', patterns: ['பின்', 'பின்னால்', 'பேக்'] },
    { action: 'FORWARD', patterns: ['முன்', 'முன்னால்', 'ஃபார்வர்ட்'] },
    { action: 'RELOAD', patterns: ['ரிலோட்', 'மீண்டும்', 'ரிஃப்ரெஷ்'] },
  ],
  hi: [
    { action: 'CLICK', patterns: ['क्लिक', 'क्लिक करो', 'क्लिक करें', 'दबाएं', 'दबाओ'] },
    { action: 'SCROLL', patterns: ['स्क्रोल', 'स्क्रोल करो', 'स्क्रोल करें', 'नीचे', 'ऊपर'] },
    { action: 'OPEN', patterns: ['खोलो', 'खोलें', 'ओपन', 'खोल'] },
    { action: 'SEARCH', patterns: ['ढूंढो', 'ढूंढें', 'खोज', 'सर्च', 'तलाश'] },
    { action: 'SAVE', patterns: ['सेव', 'सेव करो', 'सेव करें', 'बचाओ'] },
    { action: 'CLOSE', patterns: ['बंद', 'बंद करो', 'बंद करें', 'क्लोज'] },
    { action: 'BACK', patterns: ['पीछे', 'बैक', 'वापस'] },
    { action: 'FORWARD', patterns: ['आगे', 'फॉरवर्ड'] },
    { action: 'RELOAD', patterns: ['रिलोड', 'फिर से', 'रिफ्रेश'] },
  ],
  en: [
    { action: 'CLICK', patterns: ['click', 'press', 'tap'] },
    { action: 'SCROLL', patterns: ['scroll', 'scroll down', 'scroll up'] },
    { action: 'OPEN', patterns: ['open', 'launch', 'start'] },
    { action: 'SEARCH', patterns: ['search', 'find', 'look for'] },
    { action: 'SAVE', patterns: ['save', 'store'] },
    { action: 'CLOSE', patterns: ['close', 'shut'] },
    { action: 'BACK', patterns: ['back', 'go back'] },
    { action: 'FORWARD', patterns: ['forward', 'go forward'] },
    { action: 'RELOAD', patterns: ['reload', 'refresh', 'reload page'] },
  ],
  te: [
    { action: 'CLICK', patterns: ['క్లిక్', 'నొక్కండి'] },
    { action: 'SCROLL', patterns: ['స్క్రోల్', 'క్రిందికి'] },
    { action: 'OPEN', patterns: ['తెరవండి', 'ఓపెన్'] },
    { action: 'SEARCH', patterns: ['శోధించండి', 'వెతకండి'] },
    { action: 'SAVE', patterns: ['సేవ్', 'సంరక్షించండి'] },
    { action: 'CLOSE', patterns: ['మూసివేయండి'] },
    { action: 'BACK', patterns: ['వెనుక'] },
    { action: 'FORWARD', patterns: ['ముందు'] },
    { action: 'RELOAD', patterns: ['రీలోడ్'] },
  ],
  kn: [
    { action: 'CLICK', patterns: ['ಕ್ಲಿಕ್', 'ಒತ್ತಿ'] },
    { action: 'SCROLL', patterns: ['ಸ್ಕ್ರೋಲ್', 'ಕೆಳಗೆ'] },
    { action: 'OPEN', patterns: ['ತೆರೆಯಿರಿ', 'ಓಪನ್'] },
    { action: 'SEARCH', patterns: ['ಹುಡುಕಿ', 'ಶೋಧಿಸಿ'] },
    { action: 'SAVE', patterns: ['ಸೇವ್', 'ಉಳಿಸಿ'] },
    { action: 'CLOSE', patterns: ['ಮುಚ್ಚಿ'] },
    { action: 'BACK', patterns: ['ಹಿಂದೆ'] },
    { action: 'FORWARD', patterns: ['ಮುಂದೆ'] },
    { action: 'RELOAD', patterns: ['ರೀಲೋಡ್'] },
  ],
  ml: [
    { action: 'CLICK', patterns: ['ക്ലിക്ക്', 'അമർത്തുക'] },
    { action: 'SCROLL', patterns: ['സ്ക്രോൾ', 'താഴേക്ക്'] },
    { action: 'OPEN', patterns: ['തുറക്കുക', 'ഓപ്പൺ'] },
    { action: 'SEARCH', patterns: ['തിരയുക', 'ശോധന'] },
    { action: 'SAVE', patterns: ['സേവ്', 'സംരക്ഷിക്കുക'] },
    { action: 'CLOSE', patterns: ['അടയ്ക്കുക'] },
    { action: 'BACK', patterns: ['പിന്നിലേക്ക്'] },
    { action: 'FORWARD', patterns: ['മുന്നിലേക്ക്'] },
    { action: 'RELOAD', patterns: ['റീലോഡ്'] },
  ],
  mr: [
    { action: 'CLICK', patterns: ['क्लिक', 'दाबा'] },
    { action: 'SCROLL', patterns: ['स्क्रोल', 'खाली'] },
    { action: 'OPEN', patterns: ['उघडा', 'उघड'] },
    { action: 'SEARCH', patterns: ['शोध', 'शोधा'] },
    { action: 'SAVE', patterns: ['सेव्ह', 'जतन'] },
    { action: 'CLOSE', patterns: ['बंद'] },
    { action: 'BACK', patterns: ['मागे'] },
    { action: 'FORWARD', patterns: ['पुढे'] },
    { action: 'RELOAD', patterns: ['रीलोड'] },
  ],
  gu: [
    { action: 'CLICK', patterns: ['ક્લિક', 'દબાવો'] },
    { action: 'SCROLL', patterns: ['સ્ક્રોલ', 'નીચે'] },
    { action: 'OPEN', patterns: ['ખોલો', 'ઓપન'] },
    { action: 'SEARCH', patterns: ['શોધો', 'શોધ'] },
    { action: 'SAVE', patterns: ['સેવ', 'સાચવો'] },
    { action: 'CLOSE', patterns: ['બંધ'] },
    { action: 'BACK', patterns: ['પાછળ'] },
    { action: 'FORWARD', patterns: ['આગળ'] },
    { action: 'RELOAD', patterns: ['રીલોડ'] },
  ],
  pa: [
    { action: 'CLICK', patterns: ['ਕਲਿਕ', 'ਦਬਾਓ'] },
    { action: 'SCROLL', patterns: ['ਸਕ੍ਰੋਲ', 'ਹੇਠਾਂ'] },
    { action: 'OPEN', patterns: ['ਖੋਲ੍ਹੋ', 'ਓਪਨ'] },
    { action: 'SEARCH', patterns: ['ਖੋਜੋ', 'ਖੋਜ'] },
    { action: 'SAVE', patterns: ['ਸੇਵ', 'ਸੁਰੱਖਿਅਤ'] },
    { action: 'CLOSE', patterns: ['ਬੰਦ'] },
    { action: 'BACK', patterns: ['ਪਿੱਛੇ'] },
    { action: 'FORWARD', patterns: ['ਅੱਗੇ'] },
    { action: 'RELOAD', patterns: ['ਰੀਲੋਡ'] },
  ],
  bn: [
    { action: 'CLICK', patterns: ['ক্লিক', 'চাপুন'] },
    { action: 'SCROLL', patterns: ['স্ক্রল', 'নিচে'] },
    { action: 'OPEN', patterns: ['খুলুন', 'ওপেন'] },
    { action: 'SEARCH', patterns: ['খুঁজুন', 'সার্চ'] },
    { action: 'SAVE', patterns: ['সেভ', 'সংরক্ষণ'] },
    { action: 'CLOSE', patterns: ['বন্ধ'] },
    { action: 'BACK', patterns: ['পিছনে'] },
    { action: 'FORWARD', patterns: ['সামনে'] },
    { action: 'RELOAD', patterns: ['রিলোড'] },
  ],
};

/**
 * Find command action from text in a specific language
 */
export function findCommandAction(text: string, lang: LanguageCode): CommandAction | null {
  const lower = text.toLowerCase();
  const mappings = commandDictionary[lang] || commandDictionary.en;

  for (const mapping of mappings) {
    for (const pattern of mapping.patterns) {
      if (lower.includes(pattern.toLowerCase())) {
        return mapping.action;
      }
    }
  }

  return null;
}

/**
 * Get all command patterns for a language (for LLM prompts)
 */
export function getCommandExamples(lang: LanguageCode): string {
  const mappings = commandDictionary[lang] || commandDictionary.en;
  const examples: string[] = [];

  for (const mapping of mappings) {
    examples.push(`${mapping.action}: ${mapping.patterns.slice(0, 2).join(', ')}`);
  }

  return examples.join('\n');
}
