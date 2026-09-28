import { z } from 'zod';
import type { CanonicalShipmentStatus } from '../../types';

export const pickupSchema = z.object({
  warehouse_name: z.string().trim().min(1),
  name: z.string().trim().min(1),
  address: z.string().trim().min(1),
  address_2: z.string().trim().optional(),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  pincode: z.string().regex(/^\d{6}$/),
  phone: z.string().regex(/^\d{10}$/),
});

export const documentedNimbusPostStatusMap: Record<string, CanonicalShipmentStatus> = {
  booked: 'booked',
  'pending pickup': 'booked',
  pp: 'booked',
  'pickup scheduled': 'pickup_scheduled',
  'picked up': 'picked_up',
  'in transit': 'in_transit',
  it: 'in_transit',
  'out for delivery': 'out_for_delivery',
  ofd: 'out_for_delivery',
  delivered: 'delivered',
  dl: 'delivered',
  exception: 'delivery_exception',
  ex: 'delivery_exception',
  ndr: 'ndr',
  rto: 'rto_initiated',
  'rto in transit': 'rto_in_transit',
  'rt-it': 'rto_in_transit',
  'rto delivered': 'rto_delivered',
  'rt-dl': 'rto_delivered',
  cancelled: 'cancelled',
};
