# Consent Ledger

The **Consent Ledger** is Regen's audit trail system for tracking user consent to sensitive operations.

## Purpose

Every sensitive operation (file downloads, camera access, agent actions, etc.) requires explicit user consent. The ledger records:

- **What** action was requested
- **When** it occurred (timestamp)
- **Who** requested it (origin/context)
- **Approval Status** (granted/denied)
- **Checksum** (SHA-256 hash for tamper detection)

## How It Works

### 1. Consent Request Flow

```
User Action → Agent/Extension Request → Consent Prompt → User Decision → Ledger Entry
```

### 2. Ledger Structure

```typescript
interface LedgerEntry {
  id: string;
  timestamp: number;
  origin: string; // URL or 'agent' or 'system'
  action: {
    type: string; // 'download', 'camera', 'agent:tool', etc.
    description: string;
    risk: 'low' | 'medium' | 'high';
  };
  approved: boolean;
  context?: Record<string, unknown>; // Additional metadata
  hash: string; // SHA-256 hash of entry (parent_hash + action + timestamp)
  parentHash?: string; // For chain integrity
}
```

### 3. Chain of Trust

Each entry includes a hash of:

- Previous entry hash (parent_hash)
- Current action data
- Timestamp

This creates an immutable chain that detects tampering.

### 4. Verification

```typescript
// Verify ledger integrity
ledger.verify(); // Returns { ok: boolean, badId?: number }
```

## What Requires Consent

### High Risk

- **File System Access**: Reading/writing files
- **Camera/Microphone**: Media access
- **Agent Tool Execution**: External tool calls
- **Download Large Files**: > 100MB downloads

### Medium Risk

- **Location Access**: Geolocation
- **Notifications**: Push notifications
- **Agent Actions**: Navigation, form filling
- **Workspace Export**: Exporting session data

### Low Risk

- **Download Small Files**: < 100MB
- **Agent Information Gathering**: Read-only operations
- **History Access**: Reading browsing history

## User Controls

### 1. View Ledger

- **Settings → Privacy → Consent Ledger**
- Shows all entries with filters:
  - By date range
  - By action type
  - By approval status
  - By origin

### 2. Export Ledger

- Export as JSON or CSV
- Includes all entries with hashes
- Verify integrity later

### 3. Clear Ledger

- **Warning**: This clears audit trail
- Useful for privacy after sensitive operations
- Cannot be undone

### 4. Auto-Approve (Optional)

- Set TTL (Time-To-Live) for low-risk actions
- Auto-approve for trusted origins
- Still logged in ledger

## Example Entry

```json
{
  "id": "ledger_123",
  "timestamp": 1704067200000,
  "origin": "https://example.com",
  "action": {
    "type": "download",
    "description": "Download file: report.pdf (2.5MB)",
    "risk": "low"
  },
  "approved": true,
  "context": {
    "filename": "report.pdf",
    "size": 2621440,
    "mimeType": "application/pdf"
  },
  "hash": "a1b2c3d4e5f6...",
  "parentHash": "previous_hash_here"
}
```

## Privacy Considerations

- **Ledger is Local Only**: Never transmitted
- **User Controlled**: Can be cleared anytime
- **Hash-Based**: No plaintext sensitive data in hashes
- **Optional**: Can disable for performance (not recommended)

## Agent Integration

When an agent requests tool execution:

1. Agent proposes action
2. System checks if auto-approve enabled
3. If not, show consent prompt
4. User approves/denies
5. Entry logged with `origin: 'agent'`
6. Agent proceeds or stops

## Technical Details

### Hash Algorithm

```typescript
function hashEntry(entry: LedgerEntry): string {
  const data = `${entry.parentHash || 'GENESIS'}|${entry.origin}|${entry.action.type}|${entry.timestamp}`;
  return sha256(data);
}
```

### Storage

- Stored in `userData/consent-ledger.json`
- Encrypted if system supports `safeStorage`
- Backup: `consent-ledger.backup.json`

## Future Enhancements

- [ ] Blockchain-style distributed ledger (optional)
- [ ] Time-limited consent (auto-expire)
- [ ] Consent templates (pre-approve common actions)
- [ ] Ledger visualization (graph of consent flow)

---

**Last Updated**: 2024-12
