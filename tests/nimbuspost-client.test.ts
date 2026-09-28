import { beforeEach, describe, expect, it, vi } from 'vitest';

const { serverEnv } = vi.hoisted(() => ({
  serverEnv: {
    NIMBUSPOST_ENABLED: true,
    NIMBUSPOST_EMAIL: 'seller@example.com',
    NIMBUSPOST_PASSWORD: 'secret',
    NIMBUSPOST_PICKUP_JSON: JSON.stringify({
      warehouse_name: 'Gridaan', name: 'Gridaan', address: 'Test Road',
      city: 'Delhi', state: 'Delhi', pincode: '110001', phone: '9876543210',
    }),
  },
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/env.server', () => ({ serverEnv }));

import { clearNimbusPostToken } from '@/lib/shipping/providers/nimbuspost/auth';
import { NimbusPostClient } from '@/lib/shipping/providers/nimbuspost/client';

const response = (data: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => ({ status: true, data }),
}) as Response;

const packageDetails = { weightGrams: 200, lengthCm: 12, widthCm: 8, heightCm: 4 };
const destination = { pincode: '400001', city: 'Mumbai', state: 'Maharashtra', country: 'India' };

describe('NimbusPost documented contract', () => {
  beforeEach(() => clearNimbusPostToken());

  it('uses server login and maps prepaid courier rates with actual package dimensions', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response('token'))
      .mockResolvedValueOnce(response([{ id: 7, name: 'Test Courier', total_charges: 85 }]));
    const rates = await new NimbusPostClient(fetcher as typeof fetch).getRates({ destination, packageDetails, orderValue: 1199 });
    expect(rates).toMatchObject([{ courierId: '7', paymentMode: 'prepaid', totalCharge: 85 }]);
    expect(fetcher).toHaveBeenNthCalledWith(1, 'https://api.nimbuspost.com/v1/users/login', expect.anything());
    expect(fetcher).toHaveBeenNthCalledWith(2, 'https://api.nimbuspost.com/v1/courier/serviceability', expect.objectContaining({
      headers: expect.objectContaining({ authorization: 'Bearer token' }),
      body: expect.stringContaining('"weight":200'),
    }));
  });

  it('treats a timed-out booking as uncertain, without retrying the provider request', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response('token')).mockRejectedValueOnce(new Error('timeout'));
    const client = new NimbusPostClient(fetcher as typeof fetch);
    const input = {
      orderId: 'order', provider: 'nimbuspost' as const, idempotencyKey: 'local', createdBy: 'admin',
      packageDetails, courierId: '7', shipment: {} as never,
      order: {
        order_number: 'GR-101', total: 1199, shipping: 0, discount: 0,
        customer_name: 'Buyer', customer_phone: '9876543210',
        shipping_address: { full_name: 'Buyer', phone: '9876543210', line1: 'Home', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', country: 'India' },
        items: [{ product_name: 'Earrings', quantity: 1, unit_price: 1199, sku: 'EAR-1' }],
      } as never,
    };
    await expect(client.createShipment(input)).rejects.toMatchObject({ code: 'shipment_creation_uncertain' });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenNthCalledWith(2, 'https://api.nimbuspost.com/v1/shipments', expect.objectContaining({
      body: expect.stringContaining('"request_auto_pickup":"no"'),
    }));
  });

  it('maps documented tracking codes', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response('token'))
      .mockResolvedValueOnce(response({ status: 'In Transit', history: [{ status_code: 'OFD', event_time: '2026-09-26' }] }));
    const result = await new NimbusPostClient(fetcher as typeof fetch).syncTracking({ shipment: { awb: 'AWB123' } as never });
    expect(result.status).toBe('out_for_delivery');
  });
});
