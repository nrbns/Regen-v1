/**
 * Plan Versioning & Rollback (Week 7)
 * Enables plan iteration, comparison, rollback, and change history tracking
 */

import { ExecutionPlan } from './planner.js';
import { getSentry } from '../monitoring/sentry';

export interface PlanVersion {
  versionId: string;
  planId: string;
  version: number;
  timestamp: Date;
  plan: ExecutionPlan;
  createdBy: string;
  changeDescription?: string;
  changes?: PlanChange[];
  tags?: string[];
  parentVersion?: number;
  checksum?: string;
}

export interface PlanChange {
  type: 'task-added' | 'task-removed' | 'task-modified' | 'dependency-changed' | 'metadata-changed';
  taskId?: string;
  field?: string;
  before?: any;
  after?: any;
  description?: string;
}

export interface VersionDiff {
  summary: {
    tasksAdded: number;
    tasksRemoved: number;
    tasksModified: number;
    dependenciesChanged: number;
    metadataChanged: number;
  };
  changes: PlanChange[];
}

export interface VersionTag {
  name: string;
  planId: string;
  version: number;
  timestamp: Date;
  createdBy: string;
}

export interface RollbackResult {
  success: boolean;
  planId: string;
  fromVersion: number;
  toVersion: number;
  plan: ExecutionPlan | null;
  error?: string;
}

export class PlanVersionControl {
  private versions: Map<string, PlanVersion[]> = new Map();
  private versionCounter: Map<string, number> = new Map();
  private tags: Map<string, VersionTag[]> = new Map();
  private maxVersionsPerPlan: number = 100; // Limit to prevent unbounded growth

  constructor(maxVersionsPerPlan: number = 100) {
    this.maxVersionsPerPlan = maxVersionsPerPlan;
  }

  /**
   * Save plan version with automatic change detection
   */
  saveVersion(
    planId: string,
    plan: ExecutionPlan,
    createdBy: string,
    changeDescription?: string,
    tags?: string[]
  ): PlanVersion {
    if (!this.versions.has(planId)) {
      this.versions.set(planId, []);
      this.versionCounter.set(planId, 0);
    }

    const version = (this.versionCounter.get(planId) || 0) + 1;
    const versionId = `${planId}-v${version}`;

    // Calculate changes from previous version
    const previousVersion = this.getLatestVersion(planId);
    const changes = previousVersion ? this.detectChanges(previousVersion.plan, plan) : [];

    // Calculate checksum for integrity
    const checksum = this.calculateChecksum(plan);

    const planVersion: PlanVersion = {
      versionId,
      planId,
      version,
      timestamp: new Date(),
      plan: JSON.parse(JSON.stringify(plan)), // Deep copy
      createdBy,
      changeDescription,
      changes,
      tags,
      parentVersion: previousVersion?.version,
      checksum,
    };

    // Add version
    const planVersions = this.versions.get(planId)!;
    planVersions.push(planVersion);
    this.versionCounter.set(planId, version);

    // Enforce version limit (keep latest N versions)
    if (planVersions.length > this.maxVersionsPerPlan) {
      planVersions.shift(); // Remove oldest
    }

    // Add tags if provided
    if (tags && tags.length > 0) {
      tags.forEach(tag => this.addTag(tag, planId, version, createdBy));
    }

    console.log(`[VersionControl] Saved version ${versionId} with ${changes.length} changes`);

    // Track in Sentry
    const sentry = getSentry();
    sentry?.addBreadcrumb(`Saved plan version ${versionId}`, 'version-control', {
      planId,
      version,
      changeCount: changes.length,
    });

    return planVersion;
  }

  /**
   * Get specific version
   */
  getVersion(planId: string, version: number): PlanVersion | null {
    const planVersions = this.versions.get(planId);
    return planVersions?.find(v => v.version === version) || null;
  }

  /**
   * Get latest version
   */
  getLatestVersion(planId: string): PlanVersion | null {
    const planVersions = this.versions.get(planId);
    if (!planVersions || planVersions.length === 0) return null;
    return planVersions[planVersions.length - 1];
  }

  /**
   * Get all versions for plan
   */
  getVersionHistory(planId: string, limit?: number): PlanVersion[] {
    const versions = this.versions.get(planId) || [];
    if (limit) {
      return versions.slice(-limit);
    }
    return versions;
  }

  /**
   * Get version by tag
   */
  getVersionByTag(planId: string, tagName: string): PlanVersion | null {
    const planTags = this.tags.get(planId) || [];
    const tag = planTags.find(t => t.name === tagName);
    return tag ? this.getVersion(planId, tag.version) : null;
  }

  /**
   * Compare two versions with detailed diff
   */
  compareVersions(planId: string, version1: number, version2: number): VersionDiff {
    const v1 = this.getVersion(planId, version1);
    const v2 = this.getVersion(planId, version2);

    if (!v1 || !v2) {
      return {
        summary: {
          tasksAdded: 0,
          tasksRemoved: 0,
          tasksModified: 0,
          dependenciesChanged: 0,
          metadataChanged: 0,
        },
        changes: [],
      };
    }

    const changes = this.detectChanges(v1.plan, v2.plan);

    return {
      summary: {
        tasksAdded: changes.filter(c => c.type === 'task-added').length,
        tasksRemoved: changes.filter(c => c.type === 'task-removed').length,
        tasksModified: changes.filter(c => c.type === 'task-modified').length,
        dependenciesChanged: changes.filter(c => c.type === 'dependency-changed').length,
        metadataChanged: changes.filter(c => c.type === 'metadata-changed').length,
      },
      changes,
    };
  }

  /**
   * Detect changes between two plans
   */
  private detectChanges(oldPlan: ExecutionPlan, newPlan: ExecutionPlan): PlanChange[] {
    const changes: PlanChange[] = [];
    const oldTaskIds = new Set(oldPlan.tasks.map(t => t.id));
    const newTaskIds = new Set(newPlan.tasks.map(t => t.id));

    // Tasks removed
    for (const taskId of oldTaskIds) {
      if (!newTaskIds.has(taskId)) {
        const task = oldPlan.tasks.find(t => t.id === taskId);
        changes.push({
          type: 'task-removed',
          taskId,
          before: task,
          description: `Removed task: ${task?.action || taskId}`,
        });
      }
    }

    // Tasks added or modified
    for (const taskId of newTaskIds) {
      const newTask = newPlan.tasks.find(t => t.id === taskId);
      const oldTask = oldPlan.tasks.find(t => t.id === taskId);

      if (!oldTask) {
        changes.push({
          type: 'task-added',
          taskId,
          after: newTask,
          description: `Added task: ${newTask?.action || taskId}`,
        });
      } else {
        // Check for modifications
        const taskChanges = this.detectTaskChanges(oldTask, newTask!);
        changes.push(...taskChanges);
      }
    }

    // Note: ExecutionPlan doesn't have metadata field, skipping metadata checks

    return changes;
  }

  /**
   * Detect changes in a single task
   */
  private detectTaskChanges(oldTask: any, newTask: any): PlanChange[] {
    const changes: PlanChange[] = [];

    // Compare each field
    const fields = ['description', 'agentType', 'status', 'priority', 'context'];

    for (const field of fields) {
      if (JSON.stringify(oldTask[field]) !== JSON.stringify(newTask[field])) {
        changes.push({
          type: 'task-modified',
          taskId: newTask.id,
          field,
          before: oldTask[field],
          after: newTask[field],
          description: `Modified ${field} in task ${newTask.id}`,
        });
      }
    }

    // Check dependencies
    const oldDeps = JSON.stringify(oldTask.dependencies || []);
    const newDeps = JSON.stringify(newTask.dependencies || []);

    if (oldDeps !== newDeps) {
      changes.push({
        type: 'dependency-changed',
        taskId: newTask.id,
        before: oldTask.dependencies,
        after: newTask.dependencies,
        description: `Dependencies changed for task ${newTask.id}`,
      });
    }

    return changes;
  }

  /**
   * Calculate checksum for plan integrity
   */
  private calculateChecksum(plan: ExecutionPlan): string {
    const planString = JSON.stringify(plan);
    let hash = 0;

    for (let i = 0; i < planString.length; i++) {
      const char = planString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Verify plan integrity using checksum
   */
  verifyIntegrity(planId: string, version: number): boolean {
    const planVersion = this.getVersion(planId, version);
    if (!planVersion || !planVersion.checksum) return false;

    const currentChecksum = this.calculateChecksum(planVersion.plan);
    return currentChecksum === planVersion.checksum;
  }

  /**
   * Rollback to previous version
   */
  async rollback(
    planId: string,
    targetVersion: number,
    createdBy: string
  ): Promise<RollbackResult> {
    const version = this.getVersion(planId, targetVersion);
    const currentVersion = this.getLatestVersion(planId);

    if (!version) {
      return {
        success: false,
        planId,
        fromVersion: currentVersion?.version || 0,
        toVersion: targetVersion,
        plan: null,
        error: `Version ${targetVersion} not found`,
      };
    }

    // Verify integrity before rollback
    if (!this.verifyIntegrity(planId, targetVersion)) {
      const sentry = getSentry();
      const error = new Error('Plan version integrity check failed');
      sentry?.captureException?.(error, {
        tags: { planId, version: targetVersion.toString() },
      });

      return {
        success: false,
        planId,
        fromVersion: currentVersion?.version || 0,
        toVersion: targetVersion,
        plan: null,
        error: 'Integrity check failed',
      };
    }

    console.log(
      `[VersionControl] Rolling back plan ${planId} from v${currentVersion?.version} to v${targetVersion}`
    );

    // Create rollback version (new version with old content)
    const rolledBackPlan = JSON.parse(JSON.stringify(version.plan));
    // Save rollback as new version
    await this.saveVersion(
      planId,
      rolledBackPlan,
      createdBy,
      `Rolled back to version ${targetVersion}`,
      ['rollback']
    );

    const sentry = getSentry();
    sentry?.addBreadcrumb?.(`Rolled back plan ${planId}`, 'version-control', {
      fromVersion: currentVersion?.version,
      toVersion: targetVersion,
    });

    return {
      success: true,
      planId,
      fromVersion: currentVersion?.version || 0,
      toVersion: targetVersion,
      plan: rolledBackPlan,
    };
  }

  /**
   * Add tag to version
   */
  addTag(tagName: string, planId: string, version: number, createdBy: string): boolean {
    const planVersion = this.getVersion(planId, version);
    if (!planVersion) return false;

    if (!this.tags.has(planId)) {
      this.tags.set(planId, []);
    }

    const tag: VersionTag = {
      name: tagName,
      planId,
      version,
      timestamp: new Date(),
      createdBy,
    };

    this.tags.get(planId)!.push(tag);
    console.log(`[VersionControl] Tagged version ${version} as "${tagName}"`);
    return true;
  }

  /**
   * Get all tags for a plan
   */
  getTags(planId: string): VersionTag[] {
    return this.tags.get(planId) || [];
  }

  /**
   * Delete old versions (retention policy)
   */
  pruneVersions(planId: string, keepLatest: number = 10): number {
    const planVersions = this.versions.get(planId);
    if (!planVersions || planVersions.length <= keepLatest) return 0;

    const toRemove = planVersions.length - keepLatest;
    const removed = planVersions.splice(0, toRemove);

    console.log(`[VersionControl] Pruned ${removed.length} old versions for plan ${planId}`);
    return removed.length;
  }

  /**
   * Get version statistics
   */
  getStats(planId: string): {
    totalVersions: number;
    latestVersionNumber: number;
    firstVersion?: PlanVersion;
    latestVersion?: PlanVersion;
    totalTags: number;
    storageSize: number; // Approximate size in bytes
  } {
    const planVersions = this.versions.get(planId) || [];
    const planTags = this.tags.get(planId) || [];

    return {
      totalVersions: planVersions.length,
      latestVersionNumber: planVersions[planVersions.length - 1]?.version || 0,
      firstVersion: planVersions[0],
      latestVersion: planVersions[planVersions.length - 1],
      totalTags: planTags.length,
      storageSize: JSON.stringify(planVersions).length,
    };
  }

  /**
   * Export version history
   */
  exportHistory(planId: string): {
    planId: string;
    versions: PlanVersion[];
    tags: VersionTag[];
  } {
    return {
      planId,
      versions: this.getVersionHistory(planId),
      tags: this.getTags(planId),
    };
  }

  /**
   * Import version history
   */
  importHistory(data: { planId: string; versions: PlanVersion[]; tags: VersionTag[] }): boolean {
    try {
      this.versions.set(data.planId, data.versions);
      this.tags.set(data.planId, data.tags);

      if (data.versions.length > 0) {
        const latestVersion = Math.max(...data.versions.map(v => v.version));
        this.versionCounter.set(data.planId, latestVersion);
      }

      console.log(
        `[VersionControl] Imported ${data.versions.length} versions for plan ${data.planId}`
      );
      return true;
    } catch (error) {
      console.error(`[VersionControl] Import failed:`, error);
      return false;
    }
  }
}

// Global version control instance
export const globalVersionControl = new PlanVersionControl(100);

export default PlanVersionControl;
