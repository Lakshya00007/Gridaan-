import type { CanonicalShipmentStatus } from './types';

const terminalStatuses = new Set<CanonicalShipmentStatus>([
  'delivered',
  'cancelled',
  'rto_delivered',
  'lost',
]);

const statusRank: Record<CanonicalShipmentStatus, number> = {
  not_created: 0,
  ready_to_ship: 10,
  booking_failed: 15,
  booking_uncertain: 16,
  booking_in_progress: 17,
  booked: 20,
  pickup_scheduled: 30,
  picked_up: 40,
  in_transit: 50,
  out_for_delivery: 60,
  delivery_exception: 65,
  ndr: 70,
  rto_initiated: 80,
  rto_in_transit: 90,
  rto_delivered: 100,
  delivered: 110,
  cancelled: 120,
  lost: 130,
};

export function isTerminalShipmentStatus(status: CanonicalShipmentStatus) {
  return terminalStatuses.has(status);
}

export function shouldApplyShipmentStatusUpdate({
  current,
  next,
}: {
  current: CanonicalShipmentStatus;
  next: CanonicalShipmentStatus;
}) {
  if (current === next) return true;
  if (isTerminalShipmentStatus(current)) return false;
  if (next === 'lost' || next === 'cancelled') return true;
  return statusRank[next] >= statusRank[current];
}

export function mapProviderStatusToCanonical(
  rawStatus: string | null | undefined,
  documentedMap: Record<string, CanonicalShipmentStatus>
) {
  if (!rawStatus) return null;
  const key = rawStatus.trim().toLowerCase();
  return documentedMap[key] ?? null;
}
