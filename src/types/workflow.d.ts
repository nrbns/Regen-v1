type WorkflowStep = {
  id: string;
  order: number;
  type: string;
  content: string;
  description?: string;
  timeout?: number;
  parameters?: Record<string, string>;
};
