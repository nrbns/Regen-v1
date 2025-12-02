# Phase 2 Integration Guide

## Quick Start

### 1. Multi-Agent System

```typescript
import { multiAgentSystem } from './core/agents/multiAgentSystem';

// In your component
const handleAgentQuery = async (
  query: string,
  mode: 'trade' | 'research' | 'dev' | 'document' | 'workflow'
) => {
  const result = await multiAgentSystem.execute(mode, query, {
    mode,
    tabId: activeTabId,
    url: currentUrl,
  });

  // Execute actions if any
  if (result.actions && result.actions.length > 0) {
    await safeActionExecutor.executeBatch(result.actions);
  }
};
```

### 2. Multi-Language AI

```typescript
import { multiLanguageAI } from './core/language/multiLanguageAI';

// Detect and translate
const detected = await multiLanguageAI.detectLanguage(userInput);
const translated = await multiLanguageAI.translate(userInput, 'hi', detected);

// Multi-language search
const results = await multiLanguageAI.search(query, ['en', 'hi', 'ta']);

// Summarize in target language
const summary = await multiLanguageAI.summarize(text, 'hi');
```

### 3. Privacy Controls

```typescript
import { trustControls } from './core/privacy/trustControls';

// Check trust level
const trustLevel = trustControls.getTrustLevel(domain);

// Set trust level
trustControls.setTrustLevel(domain, 'trusted');

// Get privacy policy
const policy = trustControls.getPrivacyPolicy(domain);

// Audit privacy
const audit = await trustControls.auditPrivacy(domain);
```

### 4. Omni OS Layer

```typescript
import { omniOSLayer } from './core/os/omniOSLayer';

// Process documents
const pdf = await omniOSLayer.processPDF('/path/to/file.pdf');
const excel = await omniOSLayer.processExcel('/path/to/file.xlsx');
const doc = await omniOSLayer.processDoc('/path/to/file.docx');

// Voice commands
const command = await omniOSLayer.processVoiceCommand(audioData);
const result = await omniOSLayer.executeVoiceCommand(command);

// Workflows
const workflow = await omniOSLayer.executeWorkflow([
  { agent: 'research', query: 'Search...' },
  { agent: 'document', query: 'Extract...' },
]);
```

## Component Examples

### Agent Selector Component

```typescript
import { multiAgentSystem } from '../core/agents/multiAgentSystem';

function AgentSelector() {
  const [selectedAgent, setSelectedAgent] = useState<'trade' | 'research' | 'dev' | 'document' | 'workflow'>('research');
  const [capabilities, setCapabilities] = useState<string[]>([]);

  useEffect(() => {
    const caps = multiAgentSystem.getCapabilities(selectedAgent, {
      mode: selectedAgent,
    });
    setCapabilities(caps);
  }, [selectedAgent]);

  return (
    <div>
      <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
        <option value="trade">Trade</option>
        <option value="research">Research</option>
        <option value="dev">Dev</option>
        <option value="document">Document</option>
        <option value="workflow">Workflow</option>
      </select>
      <ul>
        {capabilities.map(cap => (
          <li key={cap}>{cap}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Language Selector Component

```typescript
import { multiLanguageAI, LANGUAGE_METADATA } from '../core/language/multiLanguageAI';

function LanguageSelector() {
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('en');
  const [detectedLang, setDetectedLang] = useState<SupportedLanguage>('en');

  const handleTextInput = async (text: string) => {
    const detected = await multiLanguageAI.detectLanguage(text);
    setDetectedLang(detected);
  };

  const handleTranslate = async (text: string) => {
    const translated = await multiLanguageAI.translate(text, selectedLang);
    return translated;
  };

  return (
    <div>
      <select value={selectedLang} onChange={(e) => setSelectedLang(e.target.value)}>
        {Object.entries(LANGUAGE_METADATA).map(([code, meta]) => (
          <option key={code} value={code}>
            {meta.nativeName} ({meta.name})
          </option>
        ))}
      </select>
      {detectedLang !== 'en' && (
        <div>Detected: {LANGUAGE_METADATA[detectedLang].nativeName}</div>
      )}
    </div>
  );
}
```

### Privacy Dashboard Component

```typescript
import { trustControls } from '../core/privacy/trustControls';

function PrivacyDashboard() {
  const [records, setRecords] = useState(trustControls.getAllRecords());

  const handleSetTrust = (domain: string, level: TrustLevel) => {
    trustControls.setTrustLevel(domain, level);
    setRecords(trustControls.getAllRecords());
  };

  return (
    <div>
      <h2>Privacy Dashboard</h2>
      {records.map(record => (
        <div key={record.domain}>
          <span>{record.domain}</span>
          <span>Trust: {record.trustLevel}</span>
          <span>Score: {record.privacyScore}</span>
          <button onClick={() => handleSetTrust(record.domain, 'trusted')}>
            Trust
          </button>
          <button onClick={() => handleSetTrust(record.domain, 'blocked')}>
            Block
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Document Processor Component

```typescript
import { omniOSLayer } from '../core/os/omniOSLayer';

function DocumentProcessor() {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileUpload = async (file: File) => {
    setProcessing(true);
    try {
      let processed;
      if (file.name.endsWith('.pdf')) {
        processed = await omniOSLayer.processPDF(file.path);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        processed = await omniOSLayer.processExcel(file.path);
      } else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
        processed = await omniOSLayer.processDoc(file.path);
      }
      setResult(processed);
    } catch (error) {
      console.error('Processing failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
      }} />
      {processing && <div>Processing...</div>}
      {result && (
        <div>
          <h3>Summary</h3>
          <p>{result.summary}</p>
          <h3>Insights</h3>
          {result.insights?.map((insight: any, i: number) => (
            <div key={i}>
              <strong>{insight.type}:</strong> {insight.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Integration with Existing Modes

### Trade Mode Integration

```typescript
// In src/modes/trade/index.tsx
import { multiAgentSystem } from '../../core/agents/multiAgentSystem';

// Replace existing agent calls with:
const result = await multiAgentSystem.execute('trade', query, {
  mode: 'trade',
  tabId: activeTabId,
  url: currentUrl,
});
```

### Research Mode Integration

```typescript
// In src/modes/research/index.tsx
import { multiAgentSystem } from '../../core/agents/multiAgentSystem';
import { multiLanguageAI } from '../../core/language/multiLanguageAI';

// Use research agent
const result = await multiAgentSystem.execute('research', query, {
  mode: 'research',
  tabId: activeTabId,
});

// Add language support
const detected = await multiLanguageAI.detectLanguage(query);
const translated = await multiLanguageAI.translate(query, 'en', detected);
```

## Testing

### Test Multi-Agent System

```typescript
// Test each agent
const agents = ['trade', 'research', 'dev', 'document', 'workflow'];
for (const agent of agents) {
  const result = await multiAgentSystem.execute(agent, 'test query', {
    mode: agent,
  });
  console.log(`${agent} agent:`, result);
}
```

### Test Multi-Language

```typescript
// Test language detection
const texts = ['Hello world', 'नमस्ते दुनिया', 'வணக்கம் உலகம்', 'హలో వరల్డ్'];
for (const text of texts) {
  const lang = await multiLanguageAI.detectLanguage(text);
  console.log(`${text} -> ${lang}`);
}
```

### Test Privacy Controls

```typescript
// Test trust levels
const domains = ['example.com', 'google.com', 'facebook.com'];
for (const domain of domains) {
  const level = trustControls.getTrustLevel(domain);
  const policy = trustControls.getPrivacyPolicy(domain);
  console.log(`${domain}: ${level}`, policy);
}
```

## Performance Tips

1. **Cache Language Detection**: Language detection results are cached automatically
2. **Batch Agent Operations**: Use `executeBatch` for multiple operations
3. **Lazy Load Documents**: Process documents on-demand, not on load
4. **Privacy Policy Caching**: Privacy policies are computed on-demand and cached

## Troubleshooting

### Agents Not Executing

- Check Tauri backend is running
- Verify streaming orchestrator is connected
- Check agent mode is valid

### Language Detection Failing

- Check Tauri `detect_language` command exists
- Verify text is not empty
- Check cache for previous results

### Privacy Controls Not Working

- Check localStorage is available
- Verify domain format is correct
- Check trust level is valid

### Document Processing Failing

- Check file path is valid
- Verify Tauri backend commands exist
- Check file permissions
