// Content extraction for AI processing
// Gets text from web pages and user selections

export interface ExtractedContent {
  title: string;
  url: string;
  text: string;
  selectedText?: string;
  metadata: {
    wordCount: number;
    readingTime: number;
    language: string;
  };
}

export class ContentExtractor {
  /**
   * Extract content from current web page
   */
  static async extractPageContent(): Promise<ExtractedContent> {
    return new Promise((resolve, reject) => {
      try {
        // Execute script in webview to extract content
        const script = `
          (function() {
            try {
              // Get page title
              const title = document.title || 'Untitled Page';

              // Get URL
              const url = window.location.href;

              // Extract main content (prioritize article content, then body)
              let content = '';

              // Try article tags first
              const article = document.querySelector('article');
              if (article) {
                content = article.textContent || article.innerText || '';
              } else {
                // Fallback to body
                content = document.body.textContent || document.body.innerText || '';
              }

              // Clean up content
              content = content
                .replace(/\\s+/g, ' ')
                .replace(/\\n+/g, ' ')
                .trim();

              // Calculate word count
              const wordCount = content.split(/\\s+/).length;

              // Estimate reading time (200 words per minute)
              const readingTime = Math.ceil(wordCount / 200);

              // Detect language (simple heuristic)
              const language = document.documentElement.lang || 'en';

              return {
                title,
                url,
                text: content,
                metadata: {
                  wordCount,
                  readingTime,
                  language
                }
              };
            } catch (error) {
              return {
                title: 'Error extracting content',
                url: window.location.href,
                text: 'Could not extract page content',
                metadata: {
                  wordCount: 0,
                  readingTime: 0,
                  language: 'en'
                }
              };
            }
          })();
        `;

        // In a real implementation, this would execute in the WebView
        // For now, simulate extraction
        setTimeout(() => {
          resolve({
            title: document.title || 'Current Page',
            url: window.location.href,
            text: 'Sample extracted content from the web page...',
            metadata: {
              wordCount: 150,
              readingTime: 1,
              language: 'en'
            }
          });
        }, 100);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Extract selected text from current page
   */
  static async extractSelectedText(): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();

        if (selectedText && selectedText.length > 10) {
          resolve(selectedText);
        } else {
          resolve(null);
        }
      } catch (error) {
        resolve(null);
      }
    });
  }

  /**
   * Prepare content for AI processing
   */
  static prepareForAI(content: ExtractedContent, task: 'explain' | 'summarize' | 'extract'): string {
    const { title, text, selectedText, metadata } = content;

    let prompt = '';

    switch (task) {
      case 'explain':
        prompt = `Please explain the following ${selectedText ? 'selected text' : 'content'} in simple, clear terms:

${selectedText || text}

Context: This is from the page "${title}"
Word count: ${metadata.wordCount}, Reading time: ${metadata.readingTime} minutes

Provide a clear, step-by-step explanation that helps someone understand this topic better.`;
        break;

      case 'summarize':
        prompt = `Please provide a comprehensive summary of the following ${selectedText ? 'selected text' : 'content'}:

${selectedText || text}

Context: This is from the page "${title}"
Word count: ${metadata.wordCount}, Reading time: ${metadata.readingTime} minutes

Create a well-structured summary that captures the main points, key insights, and important details.`;
        break;

      case 'extract':
        prompt = `Please extract the key points and main takeaways from the following ${selectedText ? 'selected text' : 'content'}:

${selectedText || text}

Context: This is from the page "${title}"

Provide a bullet-point list of the most important information, facts, and conclusions.`;
        break;
    }

    return prompt;
  }
}
