// Regen Permissions: central authority for agent/task permissions

export type PermissionType = 'ai' | 'agent' | 'memory' | 'network' | 'battery' | 'background';

export type PermissionRequest = {
  id: string;
  type: PermissionType;
  requester: string;
  reason: string;
  requestedAt: number;
};

export type PermissionStatus = 'granted' | 'denied' | 'pending';

export class PermissionsManager {
  private requests: PermissionRequest[] = [];
  private status: { [id: string]: PermissionStatus } = {};

  requestPermission(req: PermissionRequest): PermissionStatus {
    this.requests.push(req);
    // Simple rule: heavy tasks require explicit grant
    if (req.type === 'battery' || req.type === 'background') {
      this.status[req.id] = 'pending';
      // UI should prompt user
      return 'pending';
    }
    this.status[req.id] = 'granted';
    return 'granted';
  }

  getStatus(id: string): PermissionStatus {
    return this.status[id] || 'pending';
  }

  getRequests(): PermissionRequest[] {
    return this.requests;
  }
}
