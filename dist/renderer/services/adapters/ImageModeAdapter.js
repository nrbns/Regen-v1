/**
 * Image Mode Adapter
 *
 * Provides unified interface for:
 * - searchImages(query)
 * - optimizeImage(file)
 * - removeBackground(file)
 */
import { getApiClient } from '../externalApiClient';
import { useExternalApisStore } from '../../state/externalApisStore';
export class ImageModeAdapter {
    client = getApiClient();
    /**
     * Search for images
     */
    async searchImages(query, limit = 20) {
        const enabledApis = useExternalApisStore.getState().getEnabledApisForMode('image');
        // Try Pexels (good free tier)
        const pexels = enabledApis.find(a => a.id === 'pexels');
        if (pexels) {
            try {
                const response = await this.client.request('pexels', `/search?query=${encodeURIComponent(query)}&per_page=${limit}`, {
                    headers: {
                        Authorization: useExternalApisStore.getState().getApiConfig('pexels')?.apiKey || '',
                    },
                });
                return response.data.photos.map(photo => ({
                    id: `pexels-${photo.id}`,
                    url: photo.src.original,
                    thumbnailUrl: photo.src.medium,
                    width: photo.width,
                    height: photo.height,
                    photographer: photo.photographer,
                    source: 'Pexels',
                    downloadUrl: photo.src.large,
                }));
            }
            catch (error) {
                console.warn('[ImageAdapter] Pexels failed:', error);
            }
        }
        // Try Unsplash
        const unsplash = enabledApis.find(a => a.id === 'unsplash');
        if (unsplash) {
            try {
                const response = await this.client.request('unsplash', `/search/photos?query=${encodeURIComponent(query)}&per_page=${limit}`, {
                    headers: {
                        Authorization: `Client-ID ${useExternalApisStore.getState().getApiConfig('unsplash')?.apiKey || ''}`,
                    },
                });
                return response.data.results.map(photo => ({
                    id: `unsplash-${photo.id}`,
                    url: photo.urls.raw,
                    thumbnailUrl: photo.urls.small,
                    width: photo.width,
                    height: photo.height,
                    photographer: photo.user.name,
                    source: 'Unsplash',
                    downloadUrl: photo.links.download,
                }));
            }
            catch (error) {
                console.warn('[ImageAdapter] Unsplash failed:', error);
            }
        }
        // Try Pixabay
        const pixabay = enabledApis.find(a => a.id === 'pixabay');
        if (pixabay) {
            try {
                const response = await this.client.request('pixabay', `/?key=${useExternalApisStore.getState().getApiConfig('pixabay')?.apiKey || ''}&q=${encodeURIComponent(query)}&image_type=photo&per_page=${limit}`);
                return response.data.hits.map(hit => ({
                    id: `pixabay-${hit.id}`,
                    url: hit.largeImageURL,
                    thumbnailUrl: hit.previewURL,
                    width: hit.imageWidth,
                    height: hit.imageHeight,
                    photographer: hit.user,
                    source: 'Pixabay',
                    downloadUrl: hit.webformatURL,
                }));
            }
            catch (error) {
                console.warn('[ImageAdapter] Pixabay failed:', error);
            }
        }
        return [];
    }
    /**
     * Optimize/compress an image
     */
    async optimizeImage(file) {
        const enabledApis = useExternalApisStore.getState().getEnabledApisForMode('image');
        // Try TinyPNG
        const tinypng = enabledApis.find(a => a.id === 'tinypng');
        if (tinypng) {
            try {
                const apiKey = useExternalApisStore.getState().getApiConfig('tinypng')?.apiKey || '';
                const originalSize = file.size;
                // Convert file to base64
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const result = reader.result;
                        resolve(result.split(',')[1]);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                // Compress
                const response = await this.client.request('tinypng', '/shrink', {
                    method: 'POST',
                    headers: {
                        Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
                        'Content-Type': 'application/json',
                    },
                    body: { source: { data: base64 } },
                });
                return {
                    originalSize,
                    optimizedSize: response.data.output.size,
                    url: response.data.output.url,
                    format: response.data.output.type,
                };
            }
            catch (error) {
                console.warn('[ImageAdapter] TinyPNG failed:', error);
            }
        }
        throw new Error('Unable to optimize image from any enabled API');
    }
    /**
     * Remove background from an image
     */
    async removeBackground(file) {
        const enabledApis = useExternalApisStore.getState().getEnabledApisForMode('image');
        // Try Remove.bg
        const removebg = enabledApis.find(a => a.id === 'removebg');
        if (removebg) {
            try {
                const apiKey = useExternalApisStore.getState().getApiConfig('removebg')?.apiKey || '';
                // Convert file to form data
                const formData = new FormData();
                formData.append('image_file', file);
                const response = await this.client.request('removebg', '/removebg', {
                    method: 'POST',
                    headers: {
                        'X-Api-Key': apiKey,
                    },
                    body: formData,
                });
                return {
                    originalUrl: URL.createObjectURL(file),
                    processedUrl: response.data.data.result_url,
                    format: 'png',
                };
            }
            catch (error) {
                console.warn('[ImageAdapter] Remove.bg failed:', error);
            }
        }
        throw new Error('Unable to remove background from any enabled API');
    }
}
/**
 * Get singleton ImageModeAdapter instance
 */
let imageAdapterInstance = null;
export function getImageAdapter() {
    if (!imageAdapterInstance) {
        imageAdapterInstance = new ImageModeAdapter();
    }
    return imageAdapterInstance;
}
