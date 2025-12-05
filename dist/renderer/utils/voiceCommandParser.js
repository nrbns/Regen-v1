/**
 * Voice Command Parser for Research Mode
 * Parses voice commands like "Research in Bengali about AI" or "Research about quantum computing"
 */
const LANGUAGE_KEYWORDS = {
    hindi: ['hindi', 'हिंदी'],
    tamil: ['tamil', 'தமிழ்'],
    telugu: ['telugu', 'తెలుగు'],
    bengali: ['bengali', 'bangla', 'বাংলা'],
    marathi: ['marathi', 'मराठी'],
    kannada: ['kannada', 'ಕನ್ನಡ'],
    malayalam: ['malayalam', 'മലയാളം'],
    gujarati: ['gujarati', 'ગુજરાતી'],
    punjabi: ['punjabi', 'ਪੰਜਾਬੀ'],
    urdu: ['urdu', 'اردو'],
    english: ['english'],
    spanish: ['spanish', 'español'],
    french: ['french', 'français'],
    german: ['german', 'deutsch'],
    chinese: ['chinese', '中文'],
    japanese: ['japanese', '日本語'],
    korean: ['korean', '한국어'],
    russian: ['russian', 'Русский'],
    portuguese: ['portuguese', 'português'],
    arabic: ['arabic', 'العربية'],
};
const LANGUAGE_CODE_MAP = {
    hindi: 'hi',
    tamil: 'ta',
    telugu: 'te',
    bengali: 'bn',
    marathi: 'mr',
    kannada: 'kn',
    malayalam: 'ml',
    gujarati: 'gu',
    punjabi: 'pa',
    urdu: 'ur',
    english: 'en',
    spanish: 'es',
    french: 'fr',
    german: 'de',
    chinese: 'zh',
    japanese: 'ja',
    korean: 'ko',
    russian: 'ru',
    portuguese: 'pt',
    arabic: 'ar',
};
const RESEARCH_TRIGGERS = [
    'research',
    'search',
    'find',
    'look up',
    'investigate',
    'explore',
    'analyze',
    'study',
];
/**
 * Parse voice command to extract research query and language
 */
export function parseResearchVoiceCommand(text) {
    const lowerText = text.toLowerCase().trim();
    const originalText = text.trim();
    // Check if it's a research command
    const isResearchCommand = RESEARCH_TRIGGERS.some(trigger => lowerText.includes(trigger));
    if (!isResearchCommand) {
        return {
            isResearchCommand: false,
            query: originalText,
            originalText,
        };
    }
    // Extract language from phrases like "research in [language]" or "research [language]"
    let detectedLanguage;
    let query = originalText;
    // Pattern 1: "research in [language] about [query]"
    const inPattern = /research\s+in\s+(\w+)(?:\s+about\s+(.+))?/i;
    const inMatch = originalText.match(inPattern);
    if (inMatch) {
        const langKeyword = inMatch[1].toLowerCase();
        detectedLanguage = findLanguageCode(langKeyword);
        query = inMatch[2] || originalText.replace(inPattern, '').trim();
    }
    // Pattern 2: "research [language] [query]" (without "in")
    if (!detectedLanguage) {
        for (const [langName, keywords] of Object.entries(LANGUAGE_KEYWORDS)) {
            for (const keyword of keywords) {
                const pattern = new RegExp(`research\\s+${keyword}\\s+(.+)$`, 'i');
                const match = originalText.match(pattern);
                if (match) {
                    detectedLanguage = LANGUAGE_CODE_MAP[langName];
                    query = match[1].trim();
                    break;
                }
            }
            if (detectedLanguage)
                break;
        }
    }
    // Pattern 3: "research about [query]" or "research [query]"
    if (!detectedLanguage) {
        const aboutPattern = /research\s+(?:about\s+)?(.+)$/i;
        const aboutMatch = originalText.match(aboutPattern);
        if (aboutMatch) {
            query = aboutMatch[1].trim();
        }
        else {
            // Remove research trigger words and clean up
            query = originalText
                .replace(new RegExp(`(${RESEARCH_TRIGGERS.join('|')})\\s+`, 'gi'), '')
                .trim();
        }
    }
    // Clean up query - remove common filler words
    query = query.replace(/^(in|about|on|for|regarding|concerning)\s+/i, '').trim();
    return {
        isResearchCommand: true,
        language: detectedLanguage,
        query: query || originalText, // Fallback to original if query is empty
        originalText,
    };
}
/**
 * Find language code from keyword
 */
function findLanguageCode(keyword) {
    const lowerKeyword = keyword.toLowerCase();
    for (const [langName, keywords] of Object.entries(LANGUAGE_KEYWORDS)) {
        if (keywords.some(k => k.toLowerCase() === lowerKeyword)) {
            return LANGUAGE_CODE_MAP[langName];
        }
    }
    // Direct code match
    if (LANGUAGE_CODE_MAP[lowerKeyword]) {
        return LANGUAGE_CODE_MAP[lowerKeyword];
    }
    return undefined;
}
/**
 * Check if text contains a research command
 */
export function isResearchCommand(text) {
    return parseResearchVoiceCommand(text).isResearchCommand;
}
