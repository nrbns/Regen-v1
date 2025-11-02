/**
 * GPU Controls - Raster and hardware decode toggles
 */

import { app } from 'electron';

export interface GPUConfig {
  rasterEnabled: boolean;
  hardwareDecodeEnabled: boolean;
  webglEnabled: boolean;
}

export class GPUControls {
  private config: GPUConfig = {
    rasterEnabled: true,
    hardwareDecodeEnabled: true,
    webglEnabled: true,
  };

  /**
   * Enable GPU rasterization
   */
  enableRaster(): void {
    this.config.rasterEnabled = true;
    if (!app.isReady()) {
      app.commandLine.appendSwitch('enable-features', 'CanvasOOPRasterization');
    }
    this.emit('config-changed', this.config);
  }

  /**
   * Disable GPU rasterization
   */
  disableRaster(): void {
    this.config.rasterEnabled = false;
    if (!app.isReady()) {
      app.commandLine.appendSwitch('disable-features', 'CanvasOOPRasterization');
    }
    this.emit('config-changed', this.config);
  }

  /**
   * Enable hardware video decoding
   */
  enableHardwareDecode(): void {
    this.config.hardwareDecodeEnabled = true;
    if (!app.isReady()) {
      app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecode');
    }
    this.emit('config-changed', this.config);
  }

  /**
   * Disable hardware video decoding
   */
  disableHardwareDecode(): void {
    this.config.hardwareDecodeEnabled = false;
    if (!app.isReady()) {
      app.commandLine.appendSwitch('disable-features', 'VaapiVideoDecode');
    }
    this.emit('config-changed', this.config);
  }

  /**
   * Enable WebGL
   */
  enableWebGL(): void {
    this.config.webglEnabled = true;
    if (!app.isReady()) {
      app.commandLine.appendSwitch('enable-webgl');
    }
  }

  /**
   * Disable WebGL
   */
  disableWebGL(): void {
    this.config.webglEnabled = false;
    if (!app.isReady()) {
      app.commandLine.appendSwitch('disable-webgl');
    }
  }

  /**
   * Get current config
   */
  getConfig(): GPUConfig {
    return { ...this.config };
  }

  /**
   * Emit event (would use EventEmitter in production)
   */
  private emit(event: string, data: unknown): void {
    // In production, would emit IPC event
    console.log(`[GPUControls] ${event}:`, data);
  }
}

// Singleton instance
let gpuControlsInstance: GPUControls | null = null;

export function getGPUControls(): GPUControls {
  if (!gpuControlsInstance) {
    gpuControlsInstance = new GPUControls();
  }
  return gpuControlsInstance;
}

