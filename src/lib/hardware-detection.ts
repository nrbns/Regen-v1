/**
 * Hardware Detection & Model Selection
 * Detects device capabilities and selects appropriate model
 */

export interface HardwareCapabilities {
  webgpu: boolean;
  webnn: boolean;
  wasm: boolean;
  wasmSimd: boolean;
  memoryGB: number;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  platform: string;
  recommendedModel: ModelRecommendation;
}

export interface ModelRecommendation {
  modelName: string;
  sizeGB: number;
  quantization: 'q4' | 'q8' | 'f16';
  minRAMGB: number;
  recommended: boolean;
  downloadUrl?: string;
  checksum?: string;
}

/**
 * Detect hardware capabilities
 */
export function detectHardwareCapabilities(): HardwareCapabilities {
  const capabilities: HardwareCapabilities = {
    webgpu: detectWebGPU(),
    webnn: detectWebNN(),
    wasm: detectWebAssembly(),
    wasmSimd: detectWASMSIMD(),
    memoryGB: detectMemory(),
    deviceType: detectDeviceType(),
    platform: detectPlatform(),
    recommendedModel: {
      modelName: '',
      sizeGB: 0,
      quantization: 'q4',
      minRAMGB: 0,
      recommended: false,
    },
  };

  // Recommend model based on capabilities
  capabilities.recommendedModel = recommendModel(capabilities);

  return capabilities;
}

/**
 * Detect WebGPU support
 */
function detectWebGPU(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  // Check for WebGPU
  if ('gpu' in navigator) {
    return true;
  }

  // Check for experimental WebGPU
  if ((navigator as any).webkitGPU) {
    return true;
  }

  return false;
}

/**
 * Detect WebNN support
 */
function detectWebNN(): boolean {
  if (typeof navigator === 'undefined') return false;
  return 'ml' in navigator && 'createContext' in (navigator as any).ml;
}

/**
 * Detect WebAssembly support
 */
function detectWebAssembly(): boolean {
  return typeof WebAssembly !== 'undefined';
}

/**
 * Detect WASM SIMD support (synchronous check)
 */
function detectWASMSIMD(): boolean {
  if (!detectWebAssembly()) return false;

  // Check if WebAssembly supports SIMD
  // SIMD support is typically available in modern browsers
  try {
    // Check for SIMD via feature detection
    // In production, you'd use actual SIMD WASM module
    // For now, assume modern browsers support it
    if (typeof WebAssembly !== 'undefined' && typeof WebAssembly.validate === 'function') {
      // Simple heuristic: if WASM is available, likely SIMD is too in modern browsers
      // Can be enhanced with actual SIMD WASM module check
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Detect available memory (if available)
 */
function detectMemory(): number {
  if (typeof navigator === 'undefined') return 2; // Default fallback

  // deviceMemory API (if available)
  const deviceMemory = (navigator as any).deviceMemory;
  if (deviceMemory) {
    return Math.round(deviceMemory);
  }

  // Try performance.memory (Chrome)
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const mem = (performance as any).memory;
    const totalGB = mem.jsHeapSizeLimit / (1024 * 1024 * 1024);
    return Math.round(totalGB * 0.5); // Estimate available (conservative)
  }

  // Default based on platform
  if (detectDeviceType() === 'mobile') {
    return 2; // Conservative for mobile
  }

  return 4; // Default for desktop
}

/**
 * Detect device type
 */
function detectDeviceType(): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown';

  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform.toLowerCase();

  // Mobile detection
  if (
    /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
    /mobile/i.test(userAgent)
  ) {
    // Check for tablet
    if (
      /ipad|android(?!.*mobile)|tablet/i.test(userAgent) ||
      (platform === 'macintel' && 'ontouchend' in document)
    ) {
      return 'tablet';
    }
    return 'mobile';
  }

  // Desktop
  if (
    /win|mac|linux/i.test(platform) ||
    /windows|macintosh|linux/i.test(userAgent)
  ) {
    return 'desktop';
  }

  return 'unknown';
}

/**
 * Detect platform
 */
function detectPlatform(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  return navigator.platform || 'unknown';
}

/**
 * Recommend model based on capabilities
 */
function recommendModel(capabilities: HardwareCapabilities): ModelRecommendation {
  const { webgpu, memoryGB, deviceType } = capabilities;

  // Desktop with good resources
  if (deviceType === 'desktop' && memoryGB >= 8) {
    return {
      modelName: 'llama3.1-8b-q4.gguf',
      sizeGB: 4.5,
      quantization: 'q4',
      minRAMGB: 6,
      recommended: true,
      downloadUrl: 'https://huggingface.co/quantized-models/llama3.1-8b-q4',
    };
  }

  // Desktop with moderate resources
  if (deviceType === 'desktop' && memoryGB >= 4) {
    return {
      modelName: 'llama3.1-8b-q4.gguf',
      sizeGB: 4.5,
      quantization: 'q4',
      minRAMGB: 4,
      recommended: true,
      downloadUrl: 'https://huggingface.co/quantized-models/llama3.1-8b-q4',
    };
  }

  // Mobile/Tablet with WebGPU
  if ((deviceType === 'mobile' || deviceType === 'tablet') && webgpu && memoryGB >= 3) {
    return {
      modelName: 'smollm-1.2b-q4.gguf',
      sizeGB: 0.7,
      quantization: 'q4',
      minRAMGB: 2,
      recommended: true,
      downloadUrl: 'https://huggingface.co/quantized-models/smollm-1.2b-q4',
    };
  }

  // Low-end devices
  return {
    modelName: 'tinyllama-1.1b-q4.gguf',
    sizeGB: 0.6,
    quantization: 'q4',
    minRAMGB: 1,
    recommended: true,
    downloadUrl: 'https://huggingface.co/quantized-models/tinyllama-1.1b-q4',
  };
}

/**
 * Get available models list
 */
export function getAvailableModels(): ModelRecommendation[] {
  return [
    {
      modelName: 'llama3.1-8b-q4.gguf',
      sizeGB: 4.5,
      quantization: 'q4',
      minRAMGB: 6,
      recommended: true,
      downloadUrl: 'https://huggingface.co/quantized-models/llama3.1-8b-q4',
      checksum: 'sha256:...', // Add actual checksum
    },
    {
      modelName: 'qwen2.5-7b-q4.gguf',
      sizeGB: 4.2,
      quantization: 'q4',
      minRAMGB: 5,
      recommended: false,
      downloadUrl: 'https://huggingface.co/quantized-models/qwen2.5-7b-q4',
      checksum: 'sha256:...',
    },
    {
      modelName: 'mistral-7b-q4.gguf',
      sizeGB: 4.1,
      quantization: 'q4',
      minRAMGB: 5,
      recommended: false,
      downloadUrl: 'https://huggingface.co/quantized-models/mistral-7b-q4',
      checksum: 'sha256:...',
    },
    {
      modelName: 'smollm-1.2b-q4.gguf',
      sizeGB: 0.7,
      quantization: 'q4',
      minRAMGB: 2,
      recommended: false,
      downloadUrl: 'https://huggingface.co/quantized-models/smollm-1.2b-q4',
      checksum: 'sha256:...',
    },
    {
      modelName: 'tinyllama-1.1b-q4.gguf',
      sizeGB: 0.6,
      quantization: 'q4',
      minRAMGB: 1,
      recommended: false,
      downloadUrl: 'https://huggingface.co/quantized-models/tinyllama-1.1b-q4',
      checksum: 'sha256:...',
    },
  ];
}

/**
 * Check if model is compatible with current hardware
 */
export function isModelCompatible(
  model: ModelRecommendation,
  capabilities: HardwareCapabilities
): boolean {
  return capabilities.memoryGB >= model.minRAMGB;
}

/**
 * Get recommended runtime based on capabilities
 */
export function getRecommendedRuntime(capabilities: HardwareCapabilities): 'webgpu' | 'wasm' | 'native' | 'cloud' {
  // Check if we're in Tauri (native available)
  try {
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      return 'native';
    }
  } catch {
    // Not in Tauri
  }

  if (capabilities.webgpu) {
    return 'webgpu';
  }

  if (capabilities.wasm) {
    return 'wasm';
  }

  return 'cloud';
}

