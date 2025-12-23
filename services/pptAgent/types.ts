/**
 * PPT Agent Types
 * Data structures for presentation generation
 */

export interface PresentationRequest {
  userId: string;
  prompt: string;
  options?: {
    slideCount?: number;
    theme?: 'professional' | 'creative' | 'minimal' | 'dark';
    aspectRatio?: '16:9' | '4:3';
    includeImages?: boolean;
    templateId?: string;
  };
}

export interface SlideContent {
  slideNumber: number;
  type: 'title' | 'content' | 'image' | 'chart' | 'quote' | 'closing';
  title: string;
  content: string[];
  imageQuery?: string;
  chartData?: ChartData;
  notes?: string;
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'column';
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color?: string;
  }>;
}

export interface PresentationOutline {
  title: string;
  subtitle: string;
  slides: SlideContent[];
  totalSlides: number;
  estimatedDuration: number; // minutes
}

export interface GoogleSlidesPresentation {
  presentationId: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  slideCount: number;
  createdAt: Date;
}

export interface PptTask {
  id: string;
  type: 'generate_outline' | 'create_slides' | 'add_content' | 'add_images' | 'finalize';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface PptPlan {
  id: string;
  userId: string;
  prompt: string;
  tasks: PptTask[];
  outline?: PresentationOutline;
  estimatedTime: number; // seconds
  createdAt: Date;
}

export interface ImageSearchResult {
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  source: string;
  license?: string;
}
