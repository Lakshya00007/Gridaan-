import 'server-only';

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { serverEnv } from '@/lib/env.server';
import { ShippingError } from '../../errors';
import { getNimbusPostReadiness } from '../../config';
import { clearNimbusPostToken, getNimbusPostToken } from './auth';
import { mapNimbusPostStatus } from './mapper';
import { pickupSchema } from './schemas';
import type {
  NimbusPostBookingResult,
  NimbusPostCreateShipmentInput,
  NimbusPostProvider,
  NimbusPostRateInput,
  NimbusPostServiceabilityInput,
  NimbusPostTrackingInput,
  NimbusPostTrackingResult,
} from './types';

const rateSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  total_charges: z.coerce.number().finite().nonnegative(),
}).passthrough();

const bookingSchema = z.object({
  order_id: z.union([z.string(), z.number()]),
  shipment_id: z.union([z.string(), z.number()]),
  awb_number: z.union([z.string(), z.number()]),
  courier_id: z.union([z.string(), z.number()]),
  courier_name: z.string(),
  status: z.string().default('booked'),
  label: z.string().optional().nullable(),
}).passthrough();

function pickup() {
  const result = pickupSchema.safeParse(JSON.parse(serverEnv.NIMBUSPOST_PICKUP_JSON ?? 'null'));
  if (!result.success) {
    throw new ShippingError({ code: 'shipping_not_configured', message: 'NimbusPost pickup address is not configured.', status: 503 });
  }
  return result.data;
}

function assertAvailable() {
  const readiness = getNimbusPostReadiness();
  if (!readiness.enabled) throw new ShippingError({ code: 'shipping_disabled', message: 'NimbusPost is disabled.', status: 409 });
  if (!readiness.configured) throw new ShippingError({ code: 'shipping_not_configured', message: 'NimbusPost credentials or pickup address are missing.', status: 503, safeDetails: { missing: readiness.missing } });
}

export class NimbusPostClient implements NimbusPostProvider {
  name = 'nimbuspost' as const;

  capabilities = {
    serviceability: true,
    rates: true,
    createShipment: true,
    label: true,
    pickup: false,
    tracking: true,
    cancellation: false,
    ndr: false,
    reverse: false as const,
  };

  constructor(private readonly fetcher: typeof fetch = fetch) {}

  private async request(path: string, method: 'GET' | 'POST', payload?: Record<string, unknown>, booking = false): Promise<unknown> {
    assertAvailable();
    const token = await getNimbusPostToken(this.fetcher);
    let response: Response;
    try {
      response = await this.fetcher(`https://api.nimbuspost.com/v1/${path}`, {
        method,
        headers: { authorization: `Bearer ${token}`, ...(payload ? { 'content-type': 'application/json' } : {}) },
        ...(payload ? { body: JSON.stringify(payload) } : {}),
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new ShippingError({
        code: booking ? 'shipment_creation_uncertain' : 'provider_unavailable',
        message: booking ? 'Booking outcome is unknown. Check NimbusPost before retrying.' : 'NimbusPost is temporarily unavailable.',
        status: 503,
      });
    }
    if (response.status === 401) clearNimbusPostToken();
    if (response.status === 429) throw new ShippingError({ code: 'provider_rate_limited', message: 'NimbusPost rate limit reached.', status: 503 });
    if (booking && response.status >= 500) {
      throw new ShippingError({ code: 'shipment_creation_uncertain', message: 'Booking outcome is unknown. Check NimbusPost before retrying.', status: 503 });
    }
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok || !body || typeof body !== 'object' || !('status' in body) || body.status !== true || !('data' in body)) {
      throw new ShippingError({ code: response.status === 401 ? 'provider_auth_failed' : 'provider_unavailable', message: 'NimbusPost rejected the request.', status: 503 });
    }
    return body.data;
  }

  private async rates(input: NimbusPostRateInput) {
    const data = await this.request('courier/serviceability', 'POST', {
      origin: pickup().pincode,
      destination: input.destination.pincode,
      payment_type: 'prepaid',
      weight: input.packageDetails.weightGrams,
      length: input.packageDetails.lengthCm,
      breadth: input.packageDetails.widthCm,
      height: input.packageDetails.heightCm,
      order_amount: input.orderValue,
    });
    if (!Array.isArray(data)) throw new ShippingError({ code: 'provider_unavailable', message: 'NimbusPost returned an invalid courier list.', status: 502 });
    return data.flatMap((entry) => {
      const parsed = rateSchema.safeParse(entry);
      if (!parsed.success) return [];
      return [{
        provider: this.name,
        courierId: String(parsed.data.id),
        courierName: parsed.data.name,
        paymentMode: 'prepaid' as const,
        serviceable: true,
        enabled: true,
        totalCharge: parsed.data.total_charges,
        currency: 'INR' as const,
      }];
    });
  }

  async checkServiceability(input: NimbusPostServiceabilityInput) {
    const quotes = await this.rates({
      destination: input.destination,
      packageDetails: { weightGrams: 500, lengthCm: 10, widthCm: 10, heightCm: 5 },
      orderValue: 0,
    });
    return {
      status: quotes.length ? 'serviceable' as const : 'unserviceable' as const,
      pincode: input.destination.pincode,
      provider: this.name,
      requestId: randomUUID(),
      checkedAt: new Date().toISOString(),
      message: 'Indicative result for a 500 g package; final courier options depend on actual package details.',
    };
  }

  async getRates(input: NimbusPostRateInput) {
    return this.rates(input);
  }

  async createShipment(input: NimbusPostCreateShipmentInput): Promise<NimbusPostBookingResult> {
    const order = input.order;
    const orderNumber = order.order_number ?? order.checkout_reference;
    if (!orderNumber || orderNumber.length > 20 || !order.items?.length) {
      throw new ShippingError({ code: 'provider_unavailable', message: 'Order reference or items are invalid for NimbusPost booking.', status: 422 });
    }
    const address = order.shipping_address;
    const data = await this.request('shipments', 'POST', {
      order_number: orderNumber,
      payment_type: 'prepaid',
      order_amount: Number(order.final_amount ?? order.total),
      shipping_charges: Number(order.shipping ?? 0),
      discount: Number(order.discount ?? 0),
      consignee: {
        name: address.full_name || order.customer_name,
        address: address.line1,
        address_2: address.line2 || undefined,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        phone: address.phone || order.customer_phone,
      },
      pickup: pickup(),
      package_weight: input.packageDetails.weightGrams,
      package_length: input.packageDetails.lengthCm,
      package_breadth: input.packageDetails.widthCm,
      package_height: input.packageDetails.heightCm,
      request_auto_pickup: 'no',
      courier_id: Number(input.courierId),
      order_items: order.items.map((item) => ({ name: item.product_name, qty: item.quantity, price: Number(item.unit_price), sku: item.sku || item.product_id })),
    }, true);
    const parsed = bookingSchema.safeParse(data);
    if (!parsed.success) {
      throw new ShippingError({ code: 'shipment_creation_uncertain', message: 'NimbusPost booking response was incomplete. Check the seller panel before retrying.', status: 503 });
    }
    return {
      providerShipmentId: String(parsed.data.shipment_id),
      providerOrderId: String(parsed.data.order_id),
      awb: String(parsed.data.awb_number),
      courierId: String(parsed.data.courier_id),
      courierName: parsed.data.courier_name,
      rawStatus: parsed.data.status,
      labelUrl: parsed.data.label ?? null,
    };
  }

  async getLabel({ shipment }: NimbusPostTrackingInput) {
    return { url: shipment.label_url, reference: shipment.label_reference };
  }

  async syncTracking({ shipment }: NimbusPostTrackingInput): Promise<NimbusPostTrackingResult> {
    if (!shipment.awb) throw new ShippingError({ code: 'tracking_unavailable', message: 'AWB is not assigned.', status: 409 });
    const data = await this.request(`shipments/track/${encodeURIComponent(shipment.awb)}`, 'GET');
    const parsed = z.object({ status: z.string(), history: z.array(z.record(z.string(), z.unknown())).optional() }).safeParse(data);
    if (!parsed.success) throw new ShippingError({ code: 'tracking_unavailable', message: 'NimbusPost tracking response was incomplete.', status: 503 });
    const history = parsed.data.history ?? [];
    const latestCode = typeof history[0]?.status_code === 'string' ? history[0].status_code : null;
    return { rawStatus: parsed.data.status, status: mapNimbusPostStatus(latestCode) ?? mapNimbusPostStatus(parsed.data.status), history };
  }

  async cancelShipment(_input: NimbusPostTrackingInput & { reason?: string }): Promise<never> {
    throw new ShippingError({ code: 'shipment_not_cancellable', message: 'Cancel this shipment in NimbusPost and reconcile its status manually.', status: 409 });
  }
}

export function createNimbusPostClient() {
  return new NimbusPostClient();
}
