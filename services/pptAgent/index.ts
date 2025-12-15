/**
 * PowerPoint Agent Service Module
 * Exports all PPT agent utilities and services
 */

export { PptExecutor } from './pptExecutor';
export { OutlineGenerator } from './outlineGenerator';
export { SlidesConnector } from './slidesConnector';

export type {
  GoogleSlidesPresentation,
  SlideContent,
  ChartData,
  PresentationOutline,
} from './types';
