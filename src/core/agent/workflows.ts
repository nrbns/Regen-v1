/**
 * Workflow Templates
 * Save, organize, and replay multi-step research workflows
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WorkflowStep {
  id: string;
  type: 'goal' | 'template' | 'batch';
  content: string; // goal text or template id
  parameters?: Record<string, string>; // template placeholders
  description?: string;
  order: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  steps: WorkflowStep[];
  parameters: Array<{
    key: string;
    label: string;
    defaultValue?: string;
    description?: string;
  }>;
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  author?: string;
}

interface WorkflowState {
  templates: WorkflowTemplate[];
  createTemplate: (name: string, description: string, tags?: string[]) => string;
  addStepToTemplate: (templateId: string, step: Omit<WorkflowStep, 'id'>) => void;
  removeStepFromTemplate: (templateId: string, stepId: string) => void;
  addParameterToTemplate: (templateId: string, param: WorkflowTemplate['parameters'][0]) => void;
  updateTemplate: (templateId: string, updates: Partial<WorkflowTemplate>) => void;
  deleteTemplate: (templateId: string) => void;
  getTemplate: (templateId: string) => WorkflowTemplate | undefined;
  getAllTemplates: () => WorkflowTemplate[];
  getTemplatesByTag: (tag: string) => WorkflowTemplate[];
  incrementUsageCount: (templateId: string) => void;
  exportTemplate: (templateId: string) => string;
  importTemplate: (json: string) => boolean;
  fillTemplateParameters: (template: WorkflowTemplate, values: Record<string, string>) => WorkflowStep[];
}

const builtInTemplates: WorkflowTemplate[] = [
  {
    id: 'builtin-competitive-analysis',
    name: 'Competitive Analysis Workflow',
    description: 'Research company, competitors, and market position',
    tags: ['analysis', 'competitive', 'market'],
    steps: [
      {
        id: 'step-1',
        type: 'goal',
        content: 'Research ${company} company profile, products, and positioning',
        description: 'Gather basic company information',
        order: 1,
      },
      {
        id: 'step-2',
        type: 'goal',
        content: 'Analyze ${company} pricing strategy and revenue model',
        description: 'Understand monetization approach',
        order: 2,
      },
      {
        id: 'step-3',
        type: 'goal',
        content: 'Compare ${company} with competitors: ${competitors}',
        description: 'Competitive positioning analysis',
        order: 3,
      },
      {
        id: 'step-4',
        type: 'goal',
        content: 'Identify market opportunities and threats for ${company}',
        description: 'Strategic recommendations',
        order: 4,
      },
    ],
    parameters: [
      {
        key: 'company',
        label: 'Company Name',
        defaultValue: 'TechCorp',
        description: 'Primary company to analyze',
      },
      {
        key: 'competitors',
        label: 'Competitors',
        defaultValue: 'Competitor A, Competitor B, Competitor C',
        description: 'Comma-separated list of competing companies',
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    author: 'System',
  },
  {
    id: 'builtin-market-research',
    name: 'Market Research Workflow',
    description: 'Comprehensive market analysis and opportunity assessment',
    tags: ['research', 'market', 'analysis'],
    steps: [
      {
        id: 'step-1',
        type: 'goal',
        content: 'Analyze ${market} market size, growth rate, and trends',
        description: 'Market sizing and CAGR',
        order: 1,
      },
      {
        id: 'step-2',
        type: 'goal',
        content: 'Identify key players and market leaders in ${market}',
        description: 'Competitive landscape',
        order: 2,
      },
      {
        id: 'step-3',
        type: 'goal',
        content: 'Research customer segments and demographics in ${market}',
        description: 'Target audience analysis',
        order: 3,
      },
      {
        id: 'step-4',
        type: 'goal',
        content: 'Assess market barriers to entry and regulatory factors',
        description: 'Risk and opportunity assessment',
        order: 4,
      },
      {
        id: 'step-5',
        type: 'goal',
        content: 'Forecast ${market} market trends for next 5 years',
        description: 'Future outlook and opportunities',
        order: 5,
      },
    ],
    parameters: [
      {
        key: 'market',
        label: 'Market/Industry',
        defaultValue: 'AI/ML Software',
        description: 'Market or industry to research',
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    author: 'System',
  },
  {
    id: 'builtin-due-diligence',
    name: 'Investment Due Diligence Workflow',
    description: 'Comprehensive due diligence for investment decisions',
    tags: ['investment', 'diligence', 'research'],
    steps: [
      {
        id: 'step-1',
        type: 'goal',
        content: 'Analyze ${company} financial performance and growth metrics',
        description: 'Financial analysis',
        order: 1,
      },
      {
        id: 'step-2',
        type: 'goal',
        content: 'Research ${company} management team and leadership',
        description: 'Team assessment',
        order: 2,
      },
      {
        id: 'step-3',
        type: 'goal',
        content: 'Evaluate ${company} technology, patents, and intellectual property',
        description: 'Tech moat analysis',
        order: 3,
      },
      {
        id: 'step-4',
        type: 'goal',
        content: 'Assess ${company} customer base, retention, and satisfaction',
        description: 'Customer health check',
        order: 4,
      },
      {
        id: 'step-5',
        type: 'goal',
        content: 'Identify risks, litigation, and regulatory issues for ${company}',
        description: 'Risk assessment',
        order: 5,
      },
    ],
    parameters: [
      {
        key: 'company',
        label: 'Company Name',
        defaultValue: 'TargetCorp',
        description: 'Company to perform due diligence on',
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    author: 'System',
  },
];

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      // Allow disabling built-ins via env for real-only runtime
      templates: (typeof process !== 'undefined' && process.env && process.env.OMNI_DISABLE_BUILTINS === '1')
        ? []
        : builtInTemplates,

      createTemplate: (name, description, tags = []) => {
        const id = `workflow-${Date.now()}`;
        const template: WorkflowTemplate = {
          id,
          name,
          description,
          tags,
          steps: [],
          parameters: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          usageCount: 0,
        };
        set(state => ({
          templates: [...state.templates, template],
        }));
        return id;
      },

      addStepToTemplate: (templateId, step) => {
        set(state => ({
          templates: state.templates.map(t => {
            if (t.id === templateId) {
              return {
                ...t,
                steps: [
                  ...t.steps,
                  {
                    id: `step-${Date.now()}`,
                    ...step,
                  },
                ],
                updatedAt: Date.now(),
              };
            }
            return t;
          }),
        }));
      },

      removeStepFromTemplate: (templateId, stepId) => {
        set(state => ({
          templates: state.templates.map(t => {
            if (t.id === templateId) {
              return {
                ...t,
                steps: t.steps.filter(s => s.id !== stepId),
                updatedAt: Date.now(),
              };
            }
            return t;
          }),
        }));
      },

      addParameterToTemplate: (templateId, param) => {
        set(state => ({
          templates: state.templates.map(t => {
            if (t.id === templateId) {
              return {
                ...t,
                parameters: [...t.parameters, param],
                updatedAt: Date.now(),
              };
            }
            return t;
          }),
        }));
      },

      updateTemplate: (templateId, updates) => {
        set(state => ({
          templates: state.templates.map(t => {
            if (t.id === templateId) {
              return {
                ...t,
                ...updates,
                updatedAt: Date.now(),
              };
            }
            return t;
          }),
        }));
      },

      deleteTemplate: (templateId) => {
        set(state => ({
          templates: state.templates.filter(t => t.id !== templateId),
        }));
      },

      getTemplate: (templateId) => {
        return get().templates.find(t => t.id === templateId);
      },

      getAllTemplates: () => {
        return get().templates;
      },

      getTemplatesByTag: (tag) => {
        return get().templates.filter(t => t.tags.includes(tag));
      },

      incrementUsageCount: (templateId) => {
        set(state => ({
          templates: state.templates.map(t => {
            if (t.id === templateId) {
              return {
                ...t,
                usageCount: t.usageCount + 1,
              };
            }
            return t;
          }),
        }));
      },

      exportTemplate: (templateId) => {
        const template = get().templates.find(t => t.id === templateId);
        if (!template) return '';
        return JSON.stringify(template, null, 2);
      },

      importTemplate: (json) => {
        try {
          const template = JSON.parse(json) as WorkflowTemplate;
          // Validate required fields
          if (!template.name || !template.steps || !Array.isArray(template.steps)) {
            return false;
          }
          // Generate new ID
          template.id = `workflow-${Date.now()}`;
          template.createdAt = Date.now();
          template.updatedAt = Date.now();
          template.usageCount = 0;

          set(state => ({
            templates: [...state.templates, template],
          }));
          return true;
        } catch {
          return false;
        }
      },

      fillTemplateParameters: (template, values) => {
        return template.steps.map(step => {
          let content = step.content;
          Object.entries(values).forEach(([key, value]) => {
            content = content.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
          });
          return {
            ...step,
            content,
          };
        });
      },
    }),
    {
      name: 'workflow-templates',
    }
  )
);
