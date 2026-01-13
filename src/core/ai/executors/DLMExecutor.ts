/**
 * DLM Executor - Document Language Model Processor
 * 
 * Executes document-based tasks: extract text, tables, analyze structure, etc.
 * 
 * CRITICAL: This is a PROCESSOR, not an autonomous agent.
 * Tasks call this for document processing.
 */

import type {
  BaseExecutor,
  ExecutorInput,
  ExecutorResult,
  ExecutorCapabilities,
  DLMTaskType,
  StreamEvent,
  StreamHandler,
  ModelConfig,
} from './types';

export class DLMExecutor implements BaseExecutor {
  readonly type = 'dlm' as const;

  async execute(input: ExecutorInput): Promise<ExecutorResult> {
    if (!input.content) {
      return {
        success: false,
        output: '',
        error: 'Content (file/text) is required for DLM tasks',
      };
    }

    const startTime = Date.now();
    const taskType = input.taskType as DLMTaskType;

    try {
      // Extract text from file if needed
      const textContent = await this.extractText(input.content);

      // Route to appropriate handler
      switch (taskType) {
        case 'extract_text':
          return this.extractTextTask(textContent, input);
        case 'extract_tables':
          return this.extractTablesTask(textContent, input);
        case 'extract_metadata':
          return this.extractMetadataTask(textContent, input);
        case 'analyze_structure':
          return this.analyzeStructureTask(textContent, input);
        case 'extract_entities':
          return this.extractEntitiesTask(textContent, input);
        case 'summarize_document':
          return this.summarizeDocumentTask(textContent, input);
        case 'answer_question':
          return this.answerQuestionTask(textContent, input);
        default:
          return {
            success: false,
            output: '',
            error: `Unsupported DLM task type: ${taskType}`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error?.message || 'DLM execution failed',
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    }
  }

  async executeStream(
    input: ExecutorInput,
    onStream: StreamHandler
  ): Promise<ExecutorResult> {
    // For now, DLM tasks don't stream (they're typically extract/analyze operations)
    // But we can stream the LLM-based parts (summarize, answer_question)
    const result = await this.execute(input);
    
    if (result.success && typeof result.output === 'string') {
      // Stream the output in chunks
      const chunks = result.output.match(/.{1,100}/g) || [result.output];
      for (const chunk of chunks) {
        onStream({ type: 'token', data: chunk });
      }
      onStream({ type: 'done', data: '' });
    }
    
    return result;
  }

  async isAvailable(): Promise<boolean> {
    // DLM executor requires document parsing libraries
    try {
      // Check if we're in browser (has File API) or Node (has fs)
      return (
        typeof File !== 'undefined' ||
        (typeof process !== 'undefined' && process.versions?.node)
      );
    } catch {
      return false;
    }
  }

  getCapabilities(): ExecutorCapabilities {
    return {
      supportedTaskTypes: [
        'extract_text',
        'extract_tables',
        'extract_metadata',
        'analyze_structure',
        'extract_entities',
        'summarize_document',
        'answer_question',
      ],
      supportsStreaming: true,
      supportsFiles: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      supportedFormats: ['pdf', 'docx', 'txt', 'md', 'html'],
    };
  }

  /**
   * Extract text from content (File, Buffer, or string)
   */
  private async extractText(content: string | Buffer | File): Promise<string> {
    if (typeof content === 'string') {
      return content;
    }

    if (content instanceof File) {
      // In browser - use File API
      if (content.type === 'application/pdf') {
        // Use PDF parser
        const { parsePdfFile } = await import('../../../modes/docs/parsers/pdf');
        return await parsePdfFile(content);
      } else if (
        content.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        // Use DOCX parser (would need to implement or use library)
        const text = await content.text();
        return text; // Fallback - would need proper DOCX parsing
      } else {
        return await content.text();
      }
    }

    // Buffer (Node.js) - would need proper parsing
    return content.toString('utf-8');
  }

  private async extractTextTask(
    text: string,
    input: ExecutorInput
  ): Promise<ExecutorResult> {
    return {
      success: true,
      output: text,
      metadata: {
        duration: 0,
      },
    };
  }

  private async extractTablesTask(
    text: string,
    input: ExecutorInput
  ): Promise<ExecutorResult> {
    // Simple table extraction - in production, use proper table parsing
    const tableRegex = /(\|.+\|[\r\n]+)+/g;
    const tables = text.match(tableRegex) || [];

    return {
      success: true,
      output: {
        tables: tables.map((t, i) => ({
          id: i,
          content: t,
        })),
        count: tables.length,
      },
      metadata: {
        duration: 0,
      },
    };
  }

  private async extractMetadataTask(
    text: string,
    input: ExecutorInput
  ): Promise<ExecutorResult> {
    const metadata = {
      length: text.length,
      wordCount: text.split(/\s+/).length,
      lineCount: text.split('\n').length,
      estimatedReadingTime: Math.ceil(text.split(/\s+/).length / 200), // minutes
    };

    return {
      success: true,
      output: metadata,
      metadata: {
        duration: 0,
      },
    };
  }

  private async analyzeStructureTask(
    text: string,
    input: ExecutorInput
  ): Promise<ExecutorResult> {
    const structure = {
      hasHeadings: /^#+\s/m.test(text),
      hasLists: /^[\*\-\+]\s/m.test(text),
      hasCodeBlocks: /```/.test(text),
      paragraphCount: text.split(/\n\n+/).length,
    };

    return {
      success: true,
      output: structure,
      metadata: {
        duration: 0,
      },
    };
  }

  private async extractEntitiesTask(
    text: string,
    input: ExecutorInput
  ): Promise<ExecutorResult> {
    // Simple entity extraction - in production, use NER model
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const urlRegex = /https?:\/\/[^\s]+/g;
    const emails = text.match(emailRegex) || [];
    const urls = text.match(urlRegex) || [];

    return {
      success: true,
      output: {
        emails,
        urls,
      },
      metadata: {
        duration: 0,
      },
    };
  }

  private async summarizeDocumentTask(
    text: string,
    input: ExecutorInput
  ): Promise<ExecutorResult> {
    // Use LLM for summarization
    // In production, integrate with LLMExecutor
    const summary = text.substring(0, 200) + '...'; // Placeholder

    return {
      success: true,
      output: summary,
      metadata: {
        duration: 0,
      },
    };
  }

  private async answerQuestionTask(
    text: string,
    input: ExecutorInput
  ): Promise<ExecutorResult> {
    // Use LLM to answer question about document
    // In production, integrate with LLMExecutor
    const answer = 'Answer based on document content...'; // Placeholder

    return {
      success: true,
      output: answer,
      metadata: {
        duration: 0,
      },
    };
  }
}
