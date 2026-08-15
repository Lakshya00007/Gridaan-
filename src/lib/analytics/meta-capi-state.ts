export const META_CAPI_CLAIM_LEASE_SECONDS = 10 * 60;

export type MetaConversionStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'skipped';

export type MetaConversionClaimSnapshot = {
  status: MetaConversionStatus;
  processing_started_at?: string | null;
};

export function isTerminalMetaConversionStatus(status: MetaConversionStatus) {
  return status === 'sent';
}

export function isMetaConversionLeaseStale({
  processing_started_at,
  now = new Date(),
  leaseSeconds = META_CAPI_CLAIM_LEASE_SECONDS,
}: {
  processing_started_at?: string | null;
  now?: Date;
  leaseSeconds?: number;
}) {
  if (!processing_started_at) return true;
  const startedAt = Date.parse(processing_started_at);
  if (!Number.isFinite(startedAt)) return true;
  return startedAt <= now.getTime() - leaseSeconds * 1000;
}

export function canClaimMetaConversionEvent(
  event: MetaConversionClaimSnapshot,
  options: { now?: Date; leaseSeconds?: number } = {}
) {
  if (event.status === 'pending' || event.status === 'failed') return true;
  if (event.status !== 'processing') return false;
  return isMetaConversionLeaseStale({
    processing_started_at: event.processing_started_at,
    now: options.now,
    leaseSeconds: options.leaseSeconds,
  });
}

export function canSkipMetaConversionEvent(
  event: MetaConversionClaimSnapshot,
  options: { now?: Date; leaseSeconds?: number } = {}
) {
  if (isTerminalMetaConversionStatus(event.status)) return false;
  if (event.status === 'processing') {
    return isMetaConversionLeaseStale({
      processing_started_at: event.processing_started_at,
      now: options.now,
      leaseSeconds: options.leaseSeconds,
    });
  }
  return true;
}

export function canCompleteMetaConversionClaim({
  event,
  expectedClaimId,
}: {
  event: MetaConversionClaimSnapshot & { claim_id?: string | null };
  expectedClaimId: string;
}) {
  return event.status === 'processing' && event.claim_id === expectedClaimId;
}
