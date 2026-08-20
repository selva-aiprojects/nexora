import { db } from './db.js';

export type AuditAction =
  | 'login'
  | 'create'
  | 'update'
  | 'approve'
  | 'reject'
  | 'post'
  | 'delete';

export interface AuditEntry {
  id: string;
  tenantId: string;
  actorId: string;
  actorName: string;
  action: AuditAction;
  module: string;
  recordRef?: string;
  oldState?: unknown;
  newState?: unknown;
  ip: string;
  timestamp: string;
}

/**
 * Append an immutable-ish audit event. Every important business action
 * (approve, post, pay) calls this so the platform satisfies the PRD's
 * "every important business action must generate an audit event" requirement.
 */
export async function recordAudit(entry: {
  tenantId: string;
  actorId: string;
  actorName: string;
  action: AuditAction;
  module: string;
  recordRef?: string;
  oldState?: unknown;
  newState?: unknown;
  ip?: string;
}): Promise<AuditEntry> {
  const record: AuditEntry = {
    id: await db.nextId('aud', 'platform_audit'),
    timestamp: new Date().toISOString(),
    ip: entry.ip ?? '0.0.0.0',
    ...entry,
  };
  await db.insert(entry.tenantId, 'platform_audit', record);
  return record;
}
