/**
 * MinIO Storage Service
 * HTML snapshot storage for RAG pipeline
 */

const MinIO = require('minio');
const crypto = require('crypto');
const Pino = require('pino');

const logger = Pino({ name: 'minio-storage' });

class MinIOStorage {
  constructor() {
    this.client = null;
    this.bucketName = process.env.MINIO_BUCKET || 'regen-snapshots';
    this.initialized = false;
  }

  /**
   * Initialize MinIO client
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = parseInt(process.env.MINIO_PORT || '9000', 10);
    const useSSL = process.env.MINIO_USE_SSL === 'true';
    const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
    const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';

    try {
      this.client = new MinIO.Client({
        endPoint: endpoint,
        port,
        useSSL,
        accessKey,
        secretKey,
      });

      // Ensure bucket exists
      const exists = await this.client.bucketExists(this.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.bucketName, 'us-east-1');
        logger.info(`Created bucket: ${this.bucketName}`);
      }

      this.initialized = true;
      logger.info('MinIO storage initialized');
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to initialize MinIO');
      // Continue without MinIO - will use fallback
      this.initialized = false;
    }
  }

  /**
   * Generate object key from URL
   */
  _generateKey(url) {
    const hash = crypto.createHash('sha256').update(url).digest('hex');
    const timestamp = Date.now();
    return `snapshots/${hash.substring(0, 8)}/${timestamp}.html`;
  }

  /**
   * Store HTML snapshot
   */
  async storeSnapshot(url, html, metadata = {}) {
    if (!this.initialized || !this.client) {
      logger.warn('MinIO not available, skipping snapshot storage');
      return null;
    }

    try {
      const key = this._generateKey(url);
      const buffer = Buffer.from(html, 'utf-8');
      const metaData = {
        'Content-Type': 'text/html',
        'X-Original-URL': url,
        'X-Timestamp': Date.now().toString(),
        ...metadata,
      };

      await this.client.putObject(this.bucketName, key, buffer, buffer.length, metaData);
      
      logger.debug({ url, key }, 'Stored HTML snapshot');
      return {
        key,
        url: `${process.env.MINIO_PUBLIC_URL || `http://${process.env.MINIO_ENDPOINT || 'localhost'}:9000`}/${this.bucketName}/${key}`,
        size: buffer.length,
      };
    } catch (error) {
      logger.error({ url, error: error.message }, 'Failed to store snapshot');
      return null;
    }
  }

  /**
   * Retrieve HTML snapshot
   */
  async getSnapshot(key) {
    if (!this.initialized || !this.client) {
      return null;
    }

    try {
      const dataStream = await this.client.getObject(this.bucketName, key);
      const chunks = [];
      
      return new Promise((resolve, reject) => {
        dataStream.on('data', chunk => chunks.push(chunk));
        dataStream.on('end', () => {
          const html = Buffer.concat(chunks).toString('utf-8');
          resolve(html);
        });
        dataStream.on('error', reject);
      });
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        return null;
      }
      logger.error({ key, error: error.message }, 'Failed to retrieve snapshot');
      return null;
    }
  }

  /**
   * Delete snapshot
   */
  async deleteSnapshot(key) {
    if (!this.initialized || !this.client) {
      return false;
    }

    try {
      await this.client.removeObject(this.bucketName, key);
      return true;
    } catch (error) {
      logger.error({ key, error: error.message }, 'Failed to delete snapshot');
      return false;
    }
  }

  /**
   * Get snapshot metadata
   */
  async getMetadata(key) {
    if (!this.initialized || !this.client) {
      return null;
    }

    try {
      const stat = await this.client.statObject(this.bucketName, key);
      return {
        size: stat.size,
        lastModified: stat.lastModified,
        metadata: stat.metaData,
      };
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        return null;
      }
      logger.error({ key, error: error.message }, 'Failed to get metadata');
      return null;
    }
  }
}

// Singleton instance
let storageInstance = null;

function getStorage() {
  if (!storageInstance) {
    storageInstance = new MinIOStorage();
    storageInstance.initialize().catch(err => {
      logger.error({ error: err.message }, 'Storage initialization failed');
    });
  }
  return storageInstance;
}

module.exports = { MinIOStorage, getStorage };







