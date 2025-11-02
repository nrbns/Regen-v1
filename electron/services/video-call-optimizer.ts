/**
 * Video Call Optimizer Service
 * Enhances video call clarity with low bandwidth optimization
 * Works with Zoom, Google Meet, Teams, etc.
 */

import { WebContents, BrowserWindow } from 'electron';
import { EventEmitter } from 'events';

export interface VideoCallConfig {
  enabled: boolean;
  adaptiveQuality: boolean;
  maxResolution: '720p' | '480p' | '360p' | '240p';
  maxFrameRate: number; // 1-30
  bandwidthEstimate: number; // kbps
  priorityMode: 'performance' | 'balanced' | 'quality';
}

export interface NetworkQuality {
  bandwidth: number; // kbps
  latency: number; // ms
  packetLoss: number; // percentage
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

class VideoCallOptimizer extends EventEmitter {
  private config: VideoCallConfig = {
    enabled: true,
    adaptiveQuality: true,
    maxResolution: '720p',
    maxFrameRate: 30,
    bandwidthEstimate: 1000, // Default 1 Mbps
    priorityMode: 'balanced',
  };

  private activeCalls = new Map<string, { webContents: WebContents; url: string; quality: string }>();
  private networkMonitor: NodeJS.Timeout | null = null;
  private currentNetworkQuality: NetworkQuality = {
    bandwidth: 1000,
    latency: 50,
    packetLoss: 0,
    quality: 'good',
  };

  /**
   * Check if URL is a video calling platform
   */
  private isVideoCallSite(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      return [
        'zoom.us',
        'zoom.com',
        'meet.google.com',
        'teams.microsoft.com',
        'webex.com',
        'gotomeeting.com',
        'whereby.com',
        'jitsi.org',
        'talky.io',
        'appear.in',
        'bluejeans.com',
        'join.me',
        'skype.com',
        'hangouts.google.com',
        'discord.com',
        'discordapp.com',
      ].some(domain => hostname.includes(domain));
    } catch {
      return false;
    }
  }

  /**
   * Get optimal video constraints based on network quality
   */
  private getOptimalConstraints(quality: NetworkQuality, config: VideoCallConfig): MediaStreamConstraints {
    if (!config.enabled) {
      return { video: true, audio: true };
    }

    let width = 1280;
    let height = 720;
    let frameRate = 30;

    // Adjust based on network quality
    if (quality.quality === 'poor' || quality.bandwidth < 500) {
      width = 640;
      height = 480;
      frameRate = 15;
    } else if (quality.quality === 'fair' || quality.bandwidth < 1000) {
      width = 640;
      height = 480;
      frameRate = 20;
    } else if (quality.quality === 'good' || quality.bandwidth < 2000) {
      width = 960;
      height = 540;
      frameRate = 25;
    }

    // Override with config limits
    switch (config.maxResolution) {
      case '240p':
        width = 320;
        height = 240;
        break;
      case '360p':
        width = 640;
        height = 360;
        break;
      case '480p':
        width = 640;
        height = 480;
        break;
      case '720p':
        width = Math.min(width, 1280);
        height = Math.min(height, 720);
        break;
    }

    frameRate = Math.min(frameRate, config.maxFrameRate);

    return {
      video: {
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: frameRate, max: frameRate },
        aspectRatio: { ideal: 16 / 9 },
        facingMode: 'user',
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000, // Lower sample rate for bandwidth savings
        channelCount: 1, // Mono for bandwidth savings
      },
    };
  }

  /**
   * Inject optimization script into web contents
   */
  private injectOptimizer(webContents: WebContents): void {
    const script = `
      (function() {
        if (window.__obVideoCallOptimizer) return;
        window.__obVideoCallOptimizer = true;

        // Intercept getUserMedia
        const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        
        navigator.mediaDevices.getUserMedia = async function(constraints) {
          try {
            // Apply optimization constraints
            const optimizedConstraints = ${JSON.stringify(this.config.enabled ? {
              video: {
                width: { ideal: 640, max: 960 },
                height: { ideal: 480, max: 540 },
                frameRate: { ideal: 20, max: 25 },
                aspectRatio: { ideal: 16 / 9 },
              },
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 16000,
                channelCount: 1,
              },
            } : { video: true, audio: true })};

            // Merge with user constraints
            const finalConstraints = {
              video: constraints.video === false ? false : {
                ...optimizedConstraints.video,
                ...(typeof constraints.video === 'object' ? constraints.video : {}),
              },
              audio: constraints.audio === false ? false : {
                ...optimizedConstraints.audio,
                ...(typeof constraints.audio === 'object' ? constraints.audio : {}),
              },
            };

            console.log('[OmniBrowser] Optimized video constraints:', finalConstraints);
            
            // Get the stream
            const stream = await originalGetUserMedia(finalConstraints);
            
            // Apply additional optimizations to the stream
            stream.getVideoTracks().forEach(track => {
              const settings = track.getSettings();
              
              // Apply constraints if supported
              if (track.applyConstraints) {
                track.applyConstraints({
                  width: { ideal: settings.width ? Math.min(settings.width, 960) : 640 },
                  height: { ideal: settings.height ? Math.min(settings.height, 540) : 480 },
                  frameRate: { ideal: Math.min(settings.frameRate || 30, 25) },
                }).catch(err => console.warn('[OmniBrowser] Failed to apply constraints:', err));
              }
            });

            // Monitor bandwidth and adjust quality
            if (typeof RTCPeerConnection !== 'undefined') {
              const originalRTCPeerConnection = window.RTCPeerConnection;
              window.RTCPeerConnection = function(...args) {
                const pc = new originalRTCPeerConnection(...args);
                
                // Monitor statistics
                const statsInterval = setInterval(async () => {
                  try {
                    const stats = await pc.getStats();
                    let totalBytesReceived = 0;
                    let totalBytesSent = 0;
                    
                    stats.forEach(report => {
                      if (report.type === 'inbound-rtp' || report.type === 'outbound-rtp') {
                        if (report.bytesReceived) totalBytesReceived += report.bytesReceived;
                        if (report.bytesSent) totalBytesSent += report.bytesSent;
                      }
                    });

                    // Adjust quality based on bandwidth
                    pc.getSenders().forEach(sender => {
                      if (sender.track && sender.track.kind === 'video') {
                        const params = sender.getParameters();
                        if (params && params.encodings) {
                          params.encodings.forEach(encoding => {
                            if (totalBytesReceived < 50000) {
                              // Low bandwidth - reduce quality
                              encoding.maxBitrate = 250000; // 250 kbps
                              encoding.scaleResolutionDownBy = 2;
                            } else if (totalBytesReceived < 200000) {
                              encoding.maxBitrate = 500000; // 500 kbps
                              encoding.scaleResolutionDownBy = 1.5;
                            } else {
                              encoding.maxBitrate = 1000000; // 1 Mbps
                              encoding.scaleResolutionDownBy = 1;
                            }
                          });
                          sender.setParameters(params).catch(err => 
                            console.warn('[OmniBrowser] Failed to set encoding parameters:', err)
                          );
                        }
                      }
                    });
                  } catch (err) {
                    console.warn('[OmniBrowser] Stats monitoring error:', err);
                  }
                }, 3000);

                pc.addEventListener('connectionstatechange', () => {
                  if (pc.connectionState === 'closed') {
                    clearInterval(statsInterval);
                  }
                });

                return pc;
              };
            }

            return stream;
          } catch (error) {
            console.error('[OmniBrowser] Optimization error, falling back:', error);
            return originalGetUserMedia(constraints);
          }
        };
      })();
    `;

    webContents.executeJavaScript(script, true).catch(err => {
      console.warn('[VideoCallOptimizer] Failed to inject optimizer:', err);
    });
  }

  /**
   * Monitor network quality
   */
  private startNetworkMonitoring(): void {
    if (this.networkMonitor) return;

    this.networkMonitor = setInterval(() => {
      // Simulate network quality monitoring
      // In production, this would use actual network APIs
      const quality: NetworkQuality = {
        bandwidth: this.currentNetworkQuality.bandwidth,
        latency: this.currentNetworkQuality.latency,
        packetLoss: this.currentNetworkQuality.packetLoss,
        quality: this.currentNetworkQuality.bandwidth > 2000 ? 'excellent' :
                 this.currentNetworkQuality.bandwidth > 1000 ? 'good' :
                 this.currentNetworkQuality.bandwidth > 500 ? 'fair' : 'poor',
      };

      this.currentNetworkQuality = quality;
      this.emit('network-quality', quality);
    }, 5000);
  }

  /**
   * Update network quality estimate
   */
  updateNetworkQuality(bandwidth: number, latency: number = 50, packetLoss: number = 0): void {
    this.currentNetworkQuality = {
      bandwidth,
      latency,
      packetLoss,
      quality: bandwidth > 2000 ? 'excellent' :
               bandwidth > 1000 ? 'good' :
               bandwidth > 500 ? 'fair' : 'poor',
    };
    this.emit('network-quality', this.currentNetworkQuality);
  }

  /**
   * Setup optimizer for a web contents
   */
  setupForWebContents(webContents: WebContents, url: string): void {
    if (!this.isVideoCallSite(url)) {
      return;
    }

    const callId = webContents.id.toString();
    
    // Inject optimizer on DOM ready
    webContents.once('dom-ready', () => {
      this.injectOptimizer(webContents);
      this.activeCalls.set(callId, { webContents, url, quality: 'auto' });
      this.emit('call-started', { callId, url });
    });

    // Update on navigation
    webContents.on('did-navigate', (_event, navUrl) => {
      if (this.isVideoCallSite(navUrl)) {
        setTimeout(() => {
          this.injectOptimizer(webContents);
        }, 1000);
      }
    });

    // Clean up on close
    webContents.on('destroyed', () => {
      this.activeCalls.delete(callId);
      this.emit('call-ended', { callId });
    });
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VideoCallConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config-updated', this.config);
    
    // Re-inject into active calls
    this.activeCalls.forEach(({ webContents }) => {
      this.injectOptimizer(webContents);
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): VideoCallConfig {
    return { ...this.config };
  }

  /**
   * Get current network quality
   */
  getNetworkQuality(): NetworkQuality {
    return { ...this.currentNetworkQuality };
  }

  /**
   * Start the optimizer
   */
  start(): void {
    this.startNetworkMonitoring();
  }

  /**
   * Stop the optimizer
   */
  stop(): void {
    if (this.networkMonitor) {
      clearInterval(this.networkMonitor);
      this.networkMonitor = null;
    }
  }
}

let optimizerInstance: VideoCallOptimizer | null = null;

export function getVideoCallOptimizer(): VideoCallOptimizer {
  if (!optimizerInstance) {
    optimizerInstance = new VideoCallOptimizer();
    optimizerInstance.start();
  }
  return optimizerInstance;
}

