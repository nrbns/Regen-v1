/**
 * Encryption Service
 * Handles file encryption for cloud processing
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits

export const encryptionService = {
  /**
   * Encrypt a file
   */
  async encryptFile(filePath: string, fileId: string): Promise<string> {
    const key = crypto.randomBytes(KEY_LENGTH);
    const iv = crypto.randomBytes(16);

    const fileContent = await fs.readFile(filePath);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(fileContent), cipher.final()]);

    const authTag = cipher.getAuthTag();

    // Save encrypted file
    const encryptedPath = path.join('temp/encrypted', `${fileId}.enc`);
    await fs.writeFile(encryptedPath, Buffer.concat([iv, authTag, encrypted]));

    // Save key separately (in production, use secure key management)
    const keyPath = path.join('temp/encrypted', `${fileId}.key`);
    await fs.writeFile(keyPath, key.toString('hex'));

    return encryptedPath;
  },

  /**
   * Decrypt a file
   */
  async decryptFile(encryptedPath: string, fileId: string): Promise<string> {
    const encryptedData = await fs.readFile(encryptedPath);
    const keyPath = path.join('temp/encrypted', `${fileId}.key`);
    const keyHex = await fs.readFile(keyPath, 'utf-8');
    const key = Buffer.from(keyHex, 'hex');

    const iv = encryptedData.slice(0, 16);
    const authTag = encryptedData.slice(16, 32);
    const encrypted = encryptedData.slice(32);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    const decryptedPath = path.join('temp/processed', `decrypted_${fileId}`);
    await fs.writeFile(decryptedPath, decrypted);

    return decryptedPath;
  },

  /**
   * Delete encrypted files (cleanup)
   */
  async deleteEncrypted(fileId: string): Promise<void> {
    const encryptedPath = path.join('temp/encrypted', `${fileId}.enc`);
    const keyPath = path.join('temp/encrypted', `${fileId}.key`);

    await fs.unlink(encryptedPath).catch(() => {});
    await fs.unlink(keyPath).catch(() => {});
  },
};
