/**
 * Image Mode Adapter
 *
 * Provides unified interface for:
 * - searchImages(query)
 * - optimizeImage(file)
 * - removeBackground(file)
 */
export interface ImageResult {
    id: string;
    url: string;
    thumbnailUrl?: string;
    width: number;
    height: number;
    photographer?: string;
    source?: string;
    downloadUrl?: string;
}
export interface OptimizedImage {
    originalSize: number;
    optimizedSize: number;
    url: string;
    format: string;
}
export interface BackgroundRemovedImage {
    originalUrl: string;
    processedUrl: string;
    format: string;
}
export declare class ImageModeAdapter {
    private client;
    /**
     * Search for images
     */
    searchImages(query: string, limit?: number): Promise<ImageResult[]>;
    /**
     * Optimize/compress an image
     */
    optimizeImage(file: File | Blob): Promise<OptimizedImage>;
    /**
     * Remove background from an image
     */
    removeBackground(file: File | Blob): Promise<BackgroundRemovedImage>;
}
export declare function getImageAdapter(): ImageModeAdapter;
