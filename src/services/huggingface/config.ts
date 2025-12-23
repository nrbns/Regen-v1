/**
 * Hugging Face Configuration
 * Pre-configured models for offline usage
 */

export const HF_CONFIG = {
  // Enable offline mode by default
  offlineMode: true,

  // Models to pre-cache on first run (will download once, then work offline)
  defaultModels: {
    // Embeddings: For semantic search, RAG, similarity
    embeddings: {
      model: 'Xenova/all-MiniLM-L6-v2',
      size: '90MB',
      task: 'feature-extraction',
      description: 'Fast embeddings for semantic search',
    },

    // Text Generation: Alternative to Ollama (smaller models)
    textGeneration: {
      model: 'Xenova/gpt2',
      size: '500MB',
      task: 'text-generation',
      description: 'Small text generation model (GPT-2)',
    },

    // Summarization: Auto-summarize long texts
    summarization: {
      model: 'Xenova/distilbart-cnn-6-6',
      size: '300MB',
      task: 'summarization',
      description: 'Fast summarization for articles/documents',
    },

    // Sentiment Analysis: Classify text sentiment
    sentiment: {
      model: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      size: '250MB',
      task: 'text-classification',
      description: 'Sentiment analysis (positive/negative)',
    },

    // Translation: English ↔️ Hindi (supports 32 languages via model variants)
    translation: {
      model: 'Xenova/opus-mt-en-hi',
      size: '300MB',
      task: 'translation',
      description: 'English to Hindi translation',
    },
  },

  // Additional models available on-demand
  optionalModels: {
    // Larger text generation
    'gpt2-medium': 'Xenova/gpt2-medium', // 1.4GB
    'gpt2-large': 'Xenova/gpt2-large', // 3GB

    // Question answering
    'qa-squad': 'Xenova/distilbert-base-cased-distilled-squad', // 250MB

    // Named Entity Recognition
    ner: 'Xenova/bert-base-NER', // 400MB

    // Zero-shot classification
    'zero-shot': 'Xenova/distilbert-base-uncased-mnli', // 250MB
  },

  // Supported languages for translation (via opus-mt models)
  supportedLanguages: [
    'hi', // Hindi
    'bn', // Bengali
    'te', // Telugu
    'mr', // Marathi
    'ta', // Tamil
    'ur', // Urdu
    'gu', // Gujarati
    'kn', // Kannada
    'ml', // Malayalam
    'pa', // Punjabi
    'es', // Spanish
    'fr', // French
    'de', // German
    'zh', // Chinese
    'ja', // Japanese
    'ko', // Korean
    'ru', // Russian
    'ar', // Arabic
    'pt', // Portuguese
    'it', // Italian
  ],

  // Cache settings
  cache: {
    // Browser cache storage
    storageKey: 'hf-models-cache',
    // Max cache size (GB)
    maxSize: 5,
    // Auto-cleanup old models
    autoCleanup: true,
  },

  // Performance settings
  performance: {
    // Use WebGPU if available (faster inference)
    useWebGPU: true,
    // Number of threads for inference
    numThreads: 4,
    // Batch size for embeddings
    batchSize: 32,
  },
};

export type HFTaskType =
  | 'text-generation'
  | 'feature-extraction'
  | 'summarization'
  | 'translation'
  | 'text-classification'
  | 'question-answering'
  | 'token-classification';

export interface HFModelInfo {
  model: string;
  size: string;
  task: HFTaskType;
  description: string;
}
