/**
 * Security Exports - Tier 2
 */

export { permissionManager, type Permission, type PermissionRequest } from './permissions';
// Note: PermissionManager class is not exported, only the instance
export { secureVault } from './vault';
// Note: SecureVault class is not exported, only the instance
