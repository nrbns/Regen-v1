/**
 * Tor Integration Service
 * Manages Tor process lifecycle, NEWNYM, and onion routing
 */

import { spawn, ChildProcess } from 'child_process';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import { createLogger } from './utils/logger';

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
  private logger = createLogger('tor');
  private dataDirectory: string | null = null;

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

    const dataDir = this.config.dataDir
      ? path.isAbsolute(this.config.dataDir)
        ? this.config.dataDir
        : path.join(app.getPath('userData'), this.config.dataDir)
      : path.join(app.getPath('userData'), 'tor');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dataDirectory = dataDir;

    // Find Tor executable (bundled or system)
    const torPath = await this.findTorExecutable();
    if (!torPath) {
      this.logger.warn('Tor executable not found; stub mode required');
      throw new Error('Tor executable not found. Please install Tor Browser or tor package.');
    }

    // Generate Tor config
    const torrc = this.generateTorrc(dataDir);
    const torrcPath = path.join(dataDir, 'torrc');
    fs.writeFileSync(torrcPath, torrc, 'utf-8');

    // Spawn Tor
    this.process = spawn(torPath, ['-f', torrcPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: dataDir,
    });

    this.logger.info('Starting Tor process', { torPath, dataDir, port: this.config.port, controlPort: this.config.controlPort });

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
        this.logger.error('Tor stderr', { output });
      } else {
        this.logger.warn('Tor stderr', { output });
      }
    });

    this.process.on('exit', (code) => {
      this.status.running = false;
      this.process = null;
      this.emit('status', this.status);
      if (code !== 0 && code !== null) {
        const message = `Tor exited with code ${code}`;
        this.emit('error', message);
        this.logger.error(message);
      } else {
        this.logger.info('Tor process exited');
      }
    });

    this.status.running = true;
    this.emit('status', this.status);
    this.logger.info('Tor process flagged as running');

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
    this.logger.info('Stopping Tor process');
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
    this.logger.info('Tor process stopped');
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
          const cookie = this.readControlCookie();
          const authLine = cookie ? `AUTHENTICATE ${cookie}\r\n` : 'AUTHENTICATE\r\n';
          client.write(authLine);
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
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to renew Tor identity', { error: message });
      throw new Error(`Failed to renew identity: ${message}`);
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
    const envPath = process.env.OB_TOR_BIN || process.env.TOR_BIN;
    if (envPath && fs.existsSync(envPath)) {
      return envPath;
    }

    // Check bundled Tor (if available)
    const bundledPaths = [
      path.join(process.resourcesPath || '', 'tor', process.platform === 'win32' ? 'tor.exe' : 'tor'),
      path.join(__dirname, '..', '..', 'tor', process.platform === 'win32' ? 'tor.exe' : 'tor'),
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
        '/opt/homebrew/bin/tor',
        'C:\\Program Files\\Tor\\tor.exe',
        path.join(process.env.PROGRAMFILES || '', 'Tor', 'tor.exe'),
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
ControlPortWriteToFile control-port.txt
AvoidDiskWrites 0`.trim();
  }

  private parseTorOutput(output: string): void {
    // Parse bootstrap progress
    const bootstrapMatch = output.match(/Bootstrapped (\d+)%/);
    if (bootstrapMatch) {
      this.status.progress = parseInt(bootstrapMatch[1], 10);
      this.emit('progress', this.status.progress);
      this.logger.info('Tor bootstrap progress', { progress: this.status.progress });
    }

    // Check for circuit established
    if (output.includes('Bootstrapped 100%') || output.includes('Done')) {
      this.status.bootstrapped = true;
      this.status.circuitEstablished = true;
      this.status.progress = 100;
      this.emit('ready');
      this.logger.info('Tor circuit established');
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
          this.logger.warn('Tor process missing during health check');
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
          this.logger.warn('Tor control port health probe failed');
        }
      } catch (error) {
        this.logger.warn('Tor health check error', {
          error: error instanceof Error ? error.message : String(error),
        });
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
        this.logger.info('Tor identity auto-renewed');
      } catch (error) {
        this.logger.warn('Auto-renew identity failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, intervalMs);
  }

  private readControlCookie(): string | null {
    try {
      if (!this.dataDirectory) return null;
      const cookiePath = path.join(this.dataDirectory, 'control_auth_cookie');
      if (!fs.existsSync(cookiePath)) return null;
      const cookie = fs.readFileSync(cookiePath);
      return cookie.toString('hex').toUpperCase();
    } catch (error) {
      this.logger.warn('Failed to read Tor control cookie', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
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

