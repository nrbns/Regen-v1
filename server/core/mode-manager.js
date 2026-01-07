/* eslint-env node */
/**
 * Core Mode Manager
 * Toggles between ONLINE (free APIs) and OFFLINE (local models)
 * Auto-detects GPU/RAM and picks best models
 */

import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
// import axios from 'axios'; // Not currently used

const execAsync = promisify(exec);

// Mode detection
const MODE = (process.env.REGEN_MODE || 'online').toLowerCase();
const IS_OFFLINE = MODE === 'offline';

/**
 * System capabilities detection
 */
export async function detectSystemCapabilities() {
  const capabilities = {
    gpu: false,
    gpuMemory: 0,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    cpuCount: os.cpus().length,
    platform: os.platform(),
  };

  // Detect GPU (NVIDIA)
  try {
    const { stdout } = await execAsync(
      'nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits'
    );
    const gpuMemory = parseInt(stdout.trim(), 10);
    if (gpuMemory > 0) {
      capabilities.gpu = true;
      capabilities.gpuMemory = gpuMemory;
    }
  } catch {
    // No GPU or nvidia-smi not available
  }

  // Detect VRAM (for AMD/Intel)
  try {
    const { stdout } = await execAsync('lspci | grep -i vga');
    if (stdout.includes('AMD') || stdout.includes('Intel')) {
      capabilities.hasIntegratedGPU = true;
    }
  } catch {
    // Not Linux or lspci not available
  }

  return capabilities;
}

/**
 * Get recommended model based on system capabilities
 */
export async function getRecommendedModel(capabilities) {
  const totalMemoryGB = capabilities.totalMemory / (1024 * 1024 * 1024);
  const gpuMemoryGB = capabilities.gpuMemory / 1024;

  if (capabilities.gpu && gpuMemoryGB >= 24) {
    return 'llama3.1:70b'; // Best quality, needs 24GB+ VRAM
  } else if (capabilities.gpu && gpuMemoryGB >= 8) {
    return 'llama3.1:8b'; // Good quality, needs 8GB+ VRAM
  } else if (totalMemoryGB >= 32) {
    return 'llama3.1:8b'; // Can run in RAM if enough
  } else if (totalMemoryGB >= 16) {
    return 'phi3.5:mini'; // Lightweight, runs on any laptop
  } else {
    return 'gemma2:2b'; // Ultra-lightweight
  }
}

/**
 * Mode getter
 */
export function getMode() {
  return MODE;
}

export function isOffline() {
  return IS_OFFLINE;
}

export function isOnline() {
  return !IS_OFFLINE;
}
