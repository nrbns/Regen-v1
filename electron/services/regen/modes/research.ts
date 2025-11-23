/**
 * Research Mode Handler
 * Multi-source search + deep analysis + auto-open sites
 */

import { createLogger } from '../../utils/logger';
import type { RegenMessage, RegenResponse } from '../core';
import type { LanguageCode } from '../language/detector';
import { runResearchWorkflow } from '../tools/n8nTools';
import { getResponseLanguage } from '../session';

const log = createLogger('regen-research');

/**
 * Handle research mode queries
 */
export async function handleResearchQuery(
  msg: RegenMessage,
  detectedLang: LanguageCode
): Promise<RegenResponse> {
  log.info('Handling research query', { message: msg.message, language: detectedLang });

  const response: RegenResponse = {
    intent: 'research',
    text: '',
    commands: [],
    metadata: {},
  };

  // Step 1: Search the web (language-aware)
  const responseLang = getResponseLanguage(msg.sessionId);
  const langMessages: Record<LanguageCode, string> = {
    ta: '🔍 சிறந்த ஆதாரங்களைத் தேடுகிறது...',
    hi: '🔍 सर्वोत्तम स्रोतों की खोज कर रहा है...',
    en: '🔍 Searching the web for the best sources...',
    te: '🔍 ఉత్తమ వనరుల కోసం వెతుకుతోంది...',
    kn: '🔍 ಉತ್ತಮ ಮೂಲಗಳನ್ನು ಹುಡುಕುತ್ತಿದೆ...',
    ml: '🔍 മികച്ച സ്രോതസ്സുകൾ തിരയുന്നു...',
    mr: '🔍 सर्वोत्तम स्रोत शोधत आहे...',
    gu: '🔍 શ્રેષ્ઠ સ્રોતો શોધી રહ્યું છે...',
    pa: '🔍 ਸਭ ਤੋਂ ਵਧੀਆ ਸਰੋਤ ਲੱਭ ਰਿਹਾ ਹੈ...',
    bn: '🔍 সেরা উৎস খুঁজছে...',
  };

  response.text = langMessages[responseLang] || langMessages.en;
  response.commands = [
    {
      type: 'GET_DOM',
      payload: { tabId: msg.tabId || 'current' },
    },
  ];

  // Step 2: Call n8n research workflow for multi-source data (with language context)
  try {
    const researchResult = await runResearchWorkflow(msg.message, {
      inputLanguage: detectedLang,
      outputLanguage: responseLang,
      region: 'IN',
    });
    if (researchResult.success && researchResult.data) {
      const data = researchResult.data as any;

      // Step 3: Extract URLs to open
      const urls: string[] = [];
      if (Array.isArray(data.sources)) {
        data.sources.forEach((source: any) => {
          if (source.url) urls.push(source.url);
        });
      }

      // Step 4: Generate detailed review (in user's language)
      const foundMessages: Record<LanguageCode, string> = {
        ta: `📊 ${urls.length} ஆதாரங்கள் கண்டுபிடிக்கப்பட்டது. விரிவான ஒப்பீட்டைத் தயாரிக்கிறது...`,
        hi: `📊 ${urls.length} स्रोत मिले। विस्तृत तुलना तैयार कर रहा है...`,
        en: `📊 Found ${urls.length} sources. Analyzing and preparing detailed comparison...`,
        te: `📊 ${urls.length} వనరులు కనుగొనబడ్డాయి. వివరణాత్మక పోలికను తయారు చేస్తోంది...`,
        kn: `📊 ${urls.length} ಮೂಲಗಳು ಕಂಡುಬಂದಿವೆ. ವಿವರವಾದ ಹೋಲಿಕೆಯನ್ನು ತಯಾರಿಸುತ್ತಿದೆ...`,
        ml: `📊 ${urls.length} സ്രോതസ്സുകൾ കണ്ടെത്തി. വിശദമായ താരതമ്യം തയ്യാറാക്കുന്നു...`,
        mr: `📊 ${urls.length} स्रोत सापडले. तपशीलवार तुलना तयार करत आहे...`,
        gu: `📊 ${urls.length} સ્રોતો મળ્યા. વિગતવાર સરખામણી તૈયાર કરી રહ્યું છે...`,
        pa: `📊 ${urls.length} ਸਰੋਤ ਮਿਲੇ। ਵਿਸਤ੍ਰਿਤ ਤੁਲਨਾ ਤਿਆਰ ਕਰ ਰਿਹਾ ਹੈ...`,
        bn: `📊 ${urls.length}টি উৎস পাওয়া গেছে। বিস্তারিত তুলনা প্রস্তুত করছে...`,
      };

      response.text = foundMessages[responseLang] || foundMessages.en;

      // Step 5: Auto-open sites
      if (urls.length > 0) {
        response.commands = [
          ...response.commands,
          ...urls.slice(0, 5).map(url => ({
            type: 'OPEN_TAB' as const,
            payload: { url },
          })),
        ];

        const openedMessages: Record<LanguageCode, string> = {
          ta: `\n\n✅ ${urls.length} தாவல்கள் அதிகாரப்பூர்வ ஆதாரங்களுடன் திறக்கப்பட்டது.`,
          hi: `\n\n✅ ${urls.length} टैब आधिकारिक स्रोतों के साथ खोले गए।`,
          en: `\n\n✅ Opened ${urls.length} tabs with official sources.`,
          te: `\n\n✅ ${urls.length} టాబ్లు అధికారిక వనరులతో తెరవబడ్డాయి.`,
          kn: `\n\n✅ ${urls.length} ಟ್ಯಾಬ್ಗಳು ಅಧಿಕೃತ ಮೂಲಗಳೊಂದಿಗೆ ತೆರೆಯಲಾಗಿದೆ.`,
          ml: `\n\n✅ ${urls.length} ടാബുകൾ ഔദ്യോഗിക സ്രോതസ്സുകളുമായി തുറന്നു.`,
          mr: `\n\n✅ ${urls.length} टॅब अधिकृत स्रोतांसह उघडले.`,
          gu: `\n\n✅ ${urls.length} ટેબ્સ અધિકૃત સ્રોતો સાથે ખુલ્યા.`,
          pa: `\n\n✅ ${urls.length} ਟੈਬਾਂ ਅਧਿਕਾਰਿਤ ਸਰੋਤਾਂ ਨਾਲ ਖੁੱਲ੍ਹੀਆਂ.`,
          bn: `\n\n✅ ${urls.length}টি ট্যাব অফিসিয়াল উৎসের সাথে খোলা হয়েছে।`,
        };

        response.text += openedMessages[responseLang] || openedMessages.en;
      }

      // Step 6: Add summary metadata
      response.metadata = {
        sources: urls,
        summary: data.summary || 'Analysis complete',
        comparison: data.comparison || null,
      };
    } else {
      // Fallback: simple search
      response.text = 'Searching for information... This may take a moment.';
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error('Research workflow failed', { error: err.message });
    response.text = "I'll help you research this. Let me search and open relevant sources.";
  }

  return response;
}
