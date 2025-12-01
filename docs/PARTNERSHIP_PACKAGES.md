# Partnership Packages - Detailed Specifications

Complete technical and commercial specifications for RegenBrowser partnership packages.

---

## 📦 Package A: Regen AI Browser (Default Browser)

### Overview
Pre-install RegenBrowser as the default browser on devices with custom branding and revenue sharing.

### Technical Specifications

#### Installation
- **Format**: MSI (Windows), DMG (macOS), AppImage (Linux)
- **Size**: ~150MB (includes AI models)
- **Installation Time**: < 2 minutes
- **Auto-updates**: Enabled by default

#### Customization Options
- **Branding**: Custom logo, colors, name
- **Start Page**: Custom homepage URL
- **Search Engine**: Default search provider
- **Extensions**: Pre-installed extensions
- **Bookmarks**: Pre-configured bookmarks

#### Integration Requirements
- Default browser registration
- File association (.html, .htm)
- Protocol handler (http://, https://)
- System notifications

### Revenue Model

#### Revenue Share Structure
- **Search Revenue**: 20-30% of search ad revenue
- **Display Ads**: 20% of display ad revenue
- **Premium Features**: 50% of premium subscriptions

#### Minimum Commitments
- **Tier 1**: 10,000+ devices/year → 30% revenue share
- **Tier 2**: 50,000+ devices/year → 25% revenue share + co-marketing
- **Tier 3**: 100,000+ devices/year → 20% revenue share + dedicated support

### Support & SLA
- **Support**: Email + Slack channel
- **SLA**: 48-hour response time
- **Updates**: Monthly feature updates
- **Security**: Critical patches within 24 hours

### Pricing
- **Setup Fee**: ₹50,000 (one-time)
- **Monthly Maintenance**: ₹10,000/month
- **Revenue Share**: 20-30% (based on volume)

---

## 📦 Package B: Regen Inside SDK

### Overview
Embeddable SDK for AI search, voice transcription, agents, and secure web views.

### SDK Components

#### 1. AI Search SDK

**Installation**:
```bash
npm install @regen/sdk-search
```

**Usage**:
```typescript
import { RegenSearch } from '@regen/sdk-search';

const search = new RegenSearch({
  apiKey: process.env.REGEN_API_KEY,
  language: 'hi', // Hindi
  offline: true, // Use offline AI
  providers: ['duckduckgo', 'bing', 'local']
});

// Search
const results = await search.query('Bitcoin price analysis', {
  limit: 10,
  language: 'hi'
});

// Results format
interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: 'duckduckgo' | 'bing' | 'local';
  score: number;
}
```

**Features**:
- Multi-language support (22 Indian languages)
- Offline search capability
- Multi-source aggregation
- AI-powered relevance ranking

**Rate Limits**:
- Free: 1,000 requests/month
- Paid: Based on plan

---

#### 2. Whisper SDK (Voice Transcription)

**Installation**:
```bash
npm install @regen/sdk-whisper
```

**Usage**:
```typescript
import { RegenWhisper } from '@regen/sdk-whisper';

const whisper = new RegenWhisper({
  apiKey: process.env.REGEN_API_KEY,
  language: 'hi-IN', // Hindi (India)
  model: 'whisper-large-v3',
  offline: true
});

// Transcribe audio
const transcript = await whisper.transcribe(audioBlob, {
  language: 'hi',
  translate: false,
  timestamp: true
});

// Real-time transcription
const stream = whisper.transcribeStream(audioStream);
stream.on('text', (text) => {
  console.log('Transcript:', text);
});
```

**Supported Languages**:
- Hindi (hi-IN)
- Tamil (ta-IN)
- Telugu (te-IN)
- Bengali (bn-IN)
- Marathi (mr-IN)
- Gujarati (gu-IN)
- Kannada (kn-IN)
- Malayalam (ml-IN)
- And 14 more Indian languages

**Features**:
- Real-time transcription
- Offline support
- Multi-language detection
- Punctuation & formatting

---

#### 3. Agents SDK

**Installation**:
```bash
npm install @regen/sdk-agents
```

**Usage**:
```typescript
import { RegenAgent } from '@regen/sdk-agents';

const agent = new RegenAgent({
  apiKey: process.env.REGEN_API_KEY,
  mode: 'research', // 'research' | 'trade' | 'automation'
  language: 'hi',
  offline: true
});

// Execute agent task
const result = await agent.execute({
  query: 'Tesla Q4 earnings research',
  context: 'Stock analysis',
  mode: 'research'
});

// Stream results
const stream = agent.executeStream({
  query: 'Bitcoin price prediction',
  mode: 'trade'
});

stream.on('token', (token) => {
  console.log('Token:', token);
});

stream.on('complete', (result) => {
  console.log('Complete:', result);
});
```

**Agent Modes**:
- **Research**: Multi-source research with citations
- **Trade**: Trading signals and analysis
- **Automation**: Task automation workflows

---

#### 4. Safe WebView SDK

**Installation**:
```bash
npm install @regen/sdk-webview
```

**Usage**:
```typescript
import { RegenWebView } from '@regen/sdk-webview';

const webview = new RegenWebView({
  sandbox: true,
  privacy: 'strict',
  adBlock: true,
  fingerprintProtection: true
});

// Load URL
await webview.load('https://example.com');

// Inject scripts
webview.injectScript(`
  console.log('Custom script injected');
`);

// Listen to events
webview.on('load', (url) => {
  console.log('Loaded:', url);
});

webview.on('error', (error) => {
  console.error('Error:', error);
});
```

**Security Features**:
- Sandboxed execution
- Ad & tracker blocking
- Fingerprint protection
- HTTPS-only mode
- Cookie isolation

---

### SDK Pricing

#### Free Tier
- 1,000 API calls/month
- Community support
- Basic features

#### Starter - ₹7,999/month
- 10,000 API calls/month
- Email support
- All SDK components
- Offline AI included

#### Pro - ₹39,999/month
- 100,000 API calls/month
- Priority support
- Custom integrations
- SLA: 4-hour response

#### Enterprise - Custom
- Unlimited API calls
- Dedicated support
- Custom features
- On-premise deployment
- SLA: 1-hour response

---

## 📦 Package C: Regen Cloud Sync for OEMs

### Overview
Enterprise-grade sync and management platform for organizations.

### Features

#### 1. History Sync
- Cross-device browsing history
- Search history
- Download history
- Encrypted end-to-end

#### 2. Bookmarks Sync
- Centralized bookmark management
- Folder organization
- Tagging system
- Import/export

#### 3. Agent Memory Sync
- AI agent context across devices
- Research sessions
- Trade signals
- Automation workflows

#### 4. Secure Vault
- Encrypted password storage
- Credit card information
- Personal notes
- Documents

#### 5. Admin Dashboard
- User management
- Policy enforcement
- Usage analytics
- Security monitoring

### Technical Specifications

#### Infrastructure
- **Storage**: Encrypted at rest (AES-256)
- **Transit**: TLS 1.3
- **Backup**: Daily automated backups
- **Uptime**: 99.9% SLA
- **Compliance**: GDPR, India Data Protection Act

#### SSO Integration
- Active Directory
- Google Workspace
- Okta
- Azure AD
- Custom SAML 2.0

#### API Access
```typescript
import { RegenSync } from '@regen/sync-api';

const sync = new RegenSync({
  apiKey: process.env.REGEN_SYNC_API_KEY,
  organizationId: 'org-123'
});

// Sync history
await sync.history.sync({
  userId: 'user-123',
  deviceId: 'device-456'
});

// Manage users
await sync.users.create({
  email: 'user@example.com',
  role: 'admin'
});

// Get analytics
const analytics = await sync.analytics.get({
  dateRange: 'last-30-days'
});
```

### Pricing

#### Basic - ₹99/user/month
- Up to 100 users
- 10GB storage per user
- Email support
- Basic analytics

#### Professional - ₹199/user/month
- Up to 1,000 users
- 50GB storage per user
- Priority support
- Advanced analytics
- SSO integration

#### Enterprise - Custom
- Unlimited users
- Unlimited storage
- Dedicated support
- Custom features
- On-premise option
- SLA: 99.9% uptime

#### Education Discount
- 50% off for schools/universities
- Free for < 50 users
- Special training included

---

## 📞 Partnership Contact

**Email**: partnerships@regenbrowser.com  
**Phone**: +91-XXXXX-XXXXX  
**Website**: https://regenbrowser.com/partnerships

**Response Time**: Within 24 hours

---

**Last Updated**: 2024-12  
**Version**: 1.0

