/**
 * Tor Integration Service
 * Manages Tor process lifecycle, NEWNYM, and onion routing
 */

import { spawn, ChildProcess } from 'child_process';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';

export interface TorConfig {
  enabled: boolean;
  port: number;
  controlPort: number;
  dataDir: string;
  newnymInterval?: number; // Auto-renew identity every N minutes
}

export interface TorStatus {
  running: boolean;
  bootstrapped: boolean;
  progress: number; // 0-100
  error?: string;
  circuitEstablished: boolean;
}

class TorService extends EventEmitter {
  private process: ChildProcess | null = null;
  private config: TorConfig;
  private status: TorStatus = {
    running: false,
    bootstrapped: false,
    progress: 0,
    circuitEstablished: false,
  };
  private newnymTimer: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: TorConfig) {
    super();
    this.config = config;
  }

  /**
   * Start Tor process
   */
  async start(): Promise<void> {
    if (this.process) {
      throw new Error('Tor is already running');
    }

    const dataDir = path.join(app.getPath('userData'), 'tor');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Find Tor executable (bundled or system)
    const torPath = await this.findTorExecutable();
    if (!torPath) {
      throw new Error('Tor executable not found. Please install Tor Browser or tor package.');
    }

    // Generate Tor config
    const torrc = this.generateTorrc(dataDir);

    // Spawn Tor
    this.process = spawn(torPath, ['-f', '-'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: dataDir,
    });

    // Write config to stdin
    this.process.stdin?.write(torrc);
    this.process.stdin?.end();

    // Monitor stdout for bootstrap progress
    this.process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      this.parseTorOutput(output);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      if (output.includes('ERROR')) {
        this.status.error = output;
        this.emit('error', output);
      }
    });

    this.process.on('exit', (code) => {
      this.status.running = false;
      this.process = null;
      this.emit('status', this.status);
      if (code !== 0 && code !== null) {
        this.emit('error', `Tor exited with code ${code}`);
      }
    });

    this.status.running = true;
    this.emit('status', this.status);

    // Start health checks
    this.startHealthCheck();
    
    // Setup auto-renew if configured
    if (this.config.newnymInterval) {
      this.startAutoRenew();
    }
  }

  /**
   * Stop Tor process
   */
  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    if (this.newnymTimer) {
      clearInterval(this.newnymTimer);
      this.newnymTimer = null;
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.status.running = false;
    this.status.bootstrapped = false;
    this.emit('status', this.status);
  }

  /**
   * Request new Tor identity (NEWNYM)
   */
  async newIdentity(): Promise<void> {
    if (!this.status.running || !this.status.circuitEstablished) {
      throw new Error('Tor is not ready');
    }

    try {
      // Send NEWNYM signal to control port
      const net = await import('net');
      return new Promise((resolve, reject) => {
        const client = net.createConnection(this.config.controlPort, '127.0.0.1', () => {
          client.write('AUTHENTICATE\r\n');
        });

        client.on('data', (data) => {
          const response = data.toString();
          if (response.includes('250 OK')) {
            client.write('SIGNAL NEWNYM\r\n');
            client.end();
            resolve();
          } else {
            reject(new Error(`Tor auth failed: ${response}`));
          }
        });

        client.on('error', reject);
        setTimeout(() => reject(new Error('Tor control timeout')), 5000);
      });
    } catch (error) {
      throw new Error(`Failed to renew identity: ${error}`);
    }
  }

  /**
   * Get current Tor status
   */
  getStatus(): TorStatus {
    return { ...this.status };
  }

  /**
   * Get SOCKS5 proxy string
   */
  getProxyString(): string {
    return `socks5://127.0.0.1:${this.config.port}`;
  }

  private async findTorExecutable(): Promise<string | null> {
    // Check bundled Tor (if available)
    const bundledPaths = [
      path.join(process.resourcesPath || '', 'tor', 'tor'),
      path.join(__dirname, '..', '..', 'tor', 'tor'),
    ];

    for (const torPath of bundledPaths) {
      if (fs.existsSync(torPath)) {
        return torPath;
      }
    }

    // Check system PATH
    const which = process.platform === 'win32' ? 'where' : 'which';
    const { execSync } = await import('child_process');
    try {
      const result = execSync(`${which} tor`, { encoding: 'utf-8' });
      return result.trim();
    } catch {
      // Check common install locations
      const commonPaths = [
        '/usr/bin/tor',
        '/usr/local/bin/tor',
        'C:\\Program Files\\Tor\\tor.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Tor Browser', 'Browser', 'TorBrowser', 'Tor', 'tor.exe'),
      ];
      for (const torPath of commonPaths) {
        if (fs.existsSync(torPath)) {
          return torPath;
        }
      }
    }

    return null;
  }

  private generateTorrc(dataDir: string): string {
    return `DataDirectory ${dataDir}
SOCKSPort ${this.config.port} IsolateDestAddr IsolateDestPort
ControlPort ${this.config.controlPort}
CookieAuthentication 1
AvoidDiskWrites 0`.trim();
  }

  private parseTorOutput(output: string): void {
    // Parse bootstrap progress
    const bootstrapMatch = output.match(/Bootstrapped (\d+)%/);
    if (bootstrapMatch) {
      this.status.progress = parseInt(bootstrapMatch[1], 10);
      this.emit('progress', this.status.progress);
    }

    // Check for circuit established
    if (output.includes('Circuit establish')) {
      this.status.bootstrapped = true;
      this.status.circuitEstablished = true;
      this.status.progress = 100;
      this.emit('ready');
    }
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      if (!this.process || !this.status.running) return;

      try {
        // Check if process is alive
        if (this.process.killed || !this.process.pid) {
          this.status.running = false;
          this.emit('status', this.status);
          return;
        }

        // Check control port
        const net = await import('net');
        const test = new Promise<boolean>((resolve) => {
          const client = net.createConnection(this.config.controlPort, '127.0.0.1');
          client.on('connect', () => {
            client.destroy();
            resolve(true);
          });
          client.on('error', () => resolve(false));
          setTimeout(() => resolve(false), 1000);
        });

        const healthy = await test;
        if (!healthy && this.status.running) {
          this.status.running = false;
          this.emit('status', this.status);
        }
      } catch (error) {
        // Health check failed
      }
    }, 5000);
  }

  private startAutoRenew(): void {
    if (this.newnymTimer) return;
    const intervalMs = (this.config.newnymInterval || 10) * 60 * 1000;
    this.newnymTimer = setInterval(async () => {
      try {
        await this.newIdentity();
        this.emit('identity-renewed');
      } catch (error) {
        console.error('Auto-renew identity failed:', error);
      }
    }, intervalMs);
  }
}

// Singleton instance
let torService: TorService | null = null;

export function getTorService(config?: TorConfig): TorService {
  if (!torService && config) {
    torService = new TorService(config);
  }
  if (!torService) {
    throw new Error('Tor service not initialized. Call with config first.');
  }
  return torService;
}

export function initializeTor(config: TorConfig): TorService {
  torService = new TorService(config);
  return torService;
}

