/**
 * Agent Goal Templates
 * Pre-configured research templates for common agent tasks
 */

import type { SafetyContext } from './safety';

export interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  category: 'research' | 'analysis' | 'monitoring' | 'extraction';
  prompt: (input: Record<string, string>) => string;
  placeholders: Array<{
    key: string;
    label: string;
    type: 'text' | 'url' | 'list';
    required: boolean;
  }>;
  defaultSafetyContext: SafetyContext;
  suggestedDomains?: string[];
  expectedOutputType: 'summary' | 'comparison' | 'list' | 'report';
  icon: string;
}

const templates: Record<string, GoalTemplate> = {
  competitor_analysis: {
    id: 'competitor_analysis',
    name: 'Competitor Analysis',
    description: 'Research and analyze competitor products, pricing, and strategies',
    category: 'analysis',
    prompt: input => `
Conduct a comprehensive competitive analysis for: ${input.company || 'the specified company'}

Please research and analyze:
1. Product offerings and features
2. Pricing strategy and models
3. Target market and positioning
4. Unique value propositions
5. Recent news and announcements
6. Strengths and weaknesses
7. Market share and competitive position

Focus on objective facts and verifiable information.
    `,
    placeholders: [
      {
        key: 'company',
        label: 'Company/Product Name',
        type: 'text',
        required: true,
      },
      {
        key: 'competitors',
        label: 'Competitors to Compare',
        type: 'list',
        required: false,
      },
    ],
    defaultSafetyContext: {
      requireConsent: true,
      allowedDomains: ['crunchbase.com', 'builtwith.com', 'similarweb.com', 'g2.com'],
    },
    suggestedDomains: [
      'crunchbase.com',
      'builtwith.com',
      'similarweb.com',
      'g2.com',
      'producthunt.com',
    ],
    expectedOutputType: 'report',
    icon: 'Target',
  },

  market_research: {
    id: 'market_research',
    name: 'Market Research',
    description: 'Analyze market trends, size, and growth opportunities',
    category: 'research',
    prompt: input => `
Conduct market research for the ${input.market || 'specified'} market in ${input.region || 'global'} region.

Research and compile:
1. Market size and revenue
2. Growth rate and projections
3. Key market drivers and trends
4. Major players and market leaders
5. Customer segments and demographics
6. Barriers to entry
7. Regulatory landscape
8. Future opportunities and threats

Provide data-backed insights with citations.
    `,
    placeholders: [
      {
        key: 'market',
        label: 'Market/Industry',
        type: 'text',
        required: true,
      },
      {
        key: 'region',
        label: 'Geographic Region',
        type: 'text',
        required: false,
      },
    ],
    defaultSafetyContext: {
      requireConsent: true,
      allowedDomains: [
        'statista.com',
        'grandviewresearch.com',
        'marketresearch.com',
        'linkedin.com',
      ],
    },
    suggestedDomains: [
      'statista.com',
      'grandviewresearch.com',
      'linkedin.com',
      'forrester.com',
      'gartner.com',
    ],
    expectedOutputType: 'report',
    icon: 'BarChart3',
  },

  technical_deep_dive: {
    id: 'technical_deep_dive',
    name: 'Technical Deep Dive',
    description: 'Research technology stack, architecture, and implementation details',
    category: 'research',
    prompt: input => `
Conduct a technical deep dive into: ${input.technology || 'the specified technology'}

Research and document:
1. Core concepts and fundamentals
2. Architecture and design patterns
3. Use cases and applications
4. Performance characteristics
5. Security considerations
6. Integration options
7. Learning curve and adoption
8. Comparison with alternatives

Focus on technical accuracy and practical implementation details.
    `,
    placeholders: [
      {
        key: 'technology',
        label: 'Technology/Framework',
        type: 'text',
        required: true,
      },
    ],
    defaultSafetyContext: {
      requireConsent: false,
      allowedDomains: ['github.com', 'stackoverflow.com', 'documentation sites'],
    },
    suggestedDomains: ['github.com', 'stackoverflow.com', 'dev.to', 'medium.com', 'npm.js'],
    expectedOutputType: 'report',
    icon: 'Code2',
  },

  news_monitoring: {
    id: 'news_monitoring',
    name: 'News & Trend Monitoring',
    description: 'Track latest news, announcements, and trends',
    category: 'monitoring',
    prompt: input => `
Monitor and summarize recent news and developments for: ${input.topic || 'the specified topic'}

Gather and summarize:
1. Latest news and announcements
2. Recent developments and updates
3. Industry trends and shifts
4. Key insights and implications
5. Market impact and significance
6. Future outlook

Focus on recent information (last 30 days) with credible sources.
    `,
    placeholders: [
      {
        key: 'topic',
        label: 'Topic/Company',
        type: 'text',
        required: true,
      },
    ],
    defaultSafetyContext: {
      requireConsent: false,
      allowedDomains: ['news.google.com', 'techcrunch.com', 'forbes.com', 'bloomberg.com'],
    },
    suggestedDomains: [
      'news.google.com',
      'techcrunch.com',
      'forbes.com',
      'theverge.com',
      'wired.com',
    ],
    expectedOutputType: 'list',
    icon: 'Newspaper',
  },

  documentation_research: {
    id: 'documentation_research',
    name: 'Documentation Research',
    description: 'Extract and synthesize technical documentation',
    category: 'extraction',
    prompt: input => `
Research and compile documentation for: ${input.product || 'the specified product'}

Extract and organize:
1. Installation and setup guide
2. Core concepts and terminology
3. API reference and methods
4. Configuration options
5. Common use cases and examples
6. Troubleshooting and FAQ
7. Performance optimization tips
8. Migration and upgrade guides

Focus on official documentation and proven resources.
    `,
    placeholders: [
      {
        key: 'product',
        label: 'Product/Library',
        type: 'text',
        required: true,
      },
      {
        key: 'docUrl',
        label: 'Documentation URL (optional)',
        type: 'url',
        required: false,
      },
    ],
    defaultSafetyContext: {
      requireConsent: false,
      allowedDomains: [],
    },
    expectedOutputType: 'report',
    icon: 'BookOpen',
  },

  url_comparison: {
    id: 'url_comparison',
    name: 'URL Comparison',
    description: 'Compare and analyze multiple URLs side-by-side',
    category: 'analysis',
    prompt: input => `
Compare and analyze the following URLs:
${input.urls || 'provided URLs'}

For each URL, analyze:
1. Content type and purpose
2. Key messages and value proposition
3. Target audience
4. Design and UX approach
5. Technical stack (if visible)
6. Unique features or differentiators
7. Call-to-action and engagement tactics

Provide a structured comparison highlighting similarities, differences, and insights.
    `,
    placeholders: [
      {
        key: 'urls',
        label: 'URLs to Compare',
        type: 'list',
        required: true,
      },
    ],
    defaultSafetyContext: {
      requireConsent: true,
      allowedDomains: [],
    },
    expectedOutputType: 'comparison',
    icon: 'GitCompare',
  },

  seo_analysis: {
    id: 'seo_analysis',
    name: 'SEO Analysis',
    description: 'Analyze search engine optimization and competitive landscape',
    category: 'analysis',
    prompt: input => `
Conduct SEO analysis for: ${input.domain || 'the specified domain'} or keyword: ${input.keyword || 'specified keyword'}

Research and analyze:
1. Keyword analysis and search volume
2. Competitor rankings for target keywords
3. Content gap analysis
4. Backlink profile and authority
5. Technical SEO factors
6. Page speed and performance metrics
7. Content structure recommendations
8. Opportunities for improvement

Focus on actionable insights and competitive positioning.
    `,
    placeholders: [
      {
        key: 'domain',
        label: 'Domain',
        type: 'url',
        required: false,
      },
      {
        key: 'keyword',
        label: 'Target Keyword',
        type: 'text',
        required: false,
      },
    ],
    defaultSafetyContext: {
      requireConsent: true,
      allowedDomains: ['ahrefs.com', 'semrush.com', 'moz.com', 'serpstat.com'],
    },
    suggestedDomains: ['ahrefs.com', 'semrush.com', 'moz.com', 'google.com'],
    expectedOutputType: 'report',
    icon: 'TrendingUp',
  },
};

export function getTemplates(): GoalTemplate[] {
  return Object.values(templates);
}

export function getTemplate(id: string): GoalTemplate | undefined {
  return templates[id];
}

export function getTemplatesByCategory(category: GoalTemplate['category']): GoalTemplate[] {
  return Object.values(templates).filter(t => t.category === category);
}

export function fillTemplate(template: GoalTemplate, inputs: Record<string, string>): string {
  // Validate required placeholders
  const missing = template.placeholders.filter(p => p.required && !inputs[p.key]).map(p => p.label);

  if (missing.length > 0) {
    throw new Error(`Missing required inputs: ${missing.join(', ')}`);
  }

  return template.prompt(inputs);
}
