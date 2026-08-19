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
export function recordAudit(entry: {
  tenantId: string;
  actorId: string;
  actorName: string;
  action: AuditAction;
  module: string;
  recordRef?: string;
  oldState?: unknown;
  newState?: unknown;
  ip?: string;
}): AuditEntry {
  const record: AuditEntry = {
    id: db.nextId('aud', 'platform_audit'),
    timestamp: new Date().toISOString(),
    ip: entry.ip ?? '0.0.0.0',
    ...entry,
  };
  db.collection('platform_audit').push(record);
  return record;
}
