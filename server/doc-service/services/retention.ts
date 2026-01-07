/**
 * Retention Service
 * Manages file cleanup and retention policies
 */

import fs from 'fs/promises';
import path from 'path';

const RETENTION_HOURS = 24; // Keep files for 24 hours
const CLEANUP_INTERVAL = 60 * 60 * 1000; // Run cleanup every hour

export const retentionService = {
  /**
   * Clean up old files
   */
  async cleanupOldFiles(): Promise<{ deleted: number; errors: number }> {
    const dirs = ['temp/uploads', 'temp/processed', 'temp/encrypted'];
    let deleted = 0;
    let errors = 0;

    for (const dir of dirs) {
      try {
        const files = await fs.readdir(dir);
        const now = Date.now();

        for (const file of files) {
          const filePath = path.join(dir, file);
          try {
            const stats = await fs.stat(filePath);
            const age = now - stats.mtime.getTime();
            const ageHours = age / (1000 * 60 * 60);

            if (ageHours > RETENTION_HOURS) {
              await fs.unlink(filePath);
              deleted++;
            }
          } catch (error) {
            console.warn(`[RetentionService] Failed to delete ${filePath}:`, error);
            errors++;
          }
        }
      } catch (error) {
        console.warn(`[RetentionService] Failed to read directory ${dir}:`, error);
        errors++;
      }
    }

    return { deleted, errors };
  },

  /**
   * Start automatic cleanup
   */
  startAutoCleanup(): void {
    // Run cleanup immediately
    this.cleanupOldFiles().catch(console.error);

    // Then run every hour
    setInterval(() => {
      this.cleanupOldFiles().catch(console.error);
    }, CLEANUP_INTERVAL);

    console.log('[RetentionService] Auto-cleanup started');
  },

  /**
   * Delete specific file
   */
  async deleteFile(fileId: string): Promise<void> {
    const files = [
      path.join('temp/uploads', fileId),
      path.join('temp/processed', fileId),
      path.join('temp/encrypted', `${fileId}.enc`),
      path.join('temp/encrypted', `${fileId}.key`),
    ];

    for (const filePath of files) {
      try {
        await fs.unlink(filePath);
      } catch {
        // File doesn't exist, ignore
      }
    }
  },
};

// Start auto-cleanup on module load
retentionService.startAutoCleanup();
