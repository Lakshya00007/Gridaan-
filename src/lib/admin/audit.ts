import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

export async function writeAdminAuditLog({
  supabase,
  adminId,
  action,
  entity,
  entityId,
  beforeData,
  afterData,
  metadata,
}: {
  supabase: SupabaseClient;
  adminId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: Record<string, unknown>;
}) {
  const payload = {
    admin_id: adminId,
    action,
    entity,
    entity_id: entityId ?? null,
    before_data: beforeData ?? null,
    after_data: afterData ?? null,
    metadata: metadata ?? {},
  };

  const { error } = await supabase.from('admin_audit_logs').insert(payload);
  if (error) {
    console.warn('[admin/audit] Failed to write audit log', {
      action,
      entity,
      entityId,
      message: error.message,
    });
  }
}
