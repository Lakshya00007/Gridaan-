import { describe, expect, it } from 'vitest';
import { renderAdminOrderEmail, renderOrderEmail } from '@/lib/email/templates';
import type { Order } from '@/types';

const order = {
  id: '11111111-1111-4111-8111-111111111111',
  order_number: 'GR-00000042',
  checkout_reference: null,
  user_id: null,
  customer_email: 'customer@example.com',
  customer_phone: '9999999999',
  customer_name: 'Asha',
  address_id: null,
  shipping_address: {
    full_name: 'Asha',
    phone: '9999999999',
    line1: '1 Market Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    country: 'India',
  },
  subtotal: 500,
  discount: 0,
  shipping: 79,
  tax: 0,
  total: 579,
  coupon_id: null,
  coupon_code: null,
  payment_method: 'razorpay',
  payment_status: 'captured',
  order_status: 'placed',
  manual_payment_reference: null,
  manual_payment_sender_name: null,
  manual_payment_note: null,
  manual_payment_verified_at: null,
  manual_payment_verified_by: null,
  manual_payment_rejected_reason: null,
  notes: null,
  items: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      order_id: '11111111-1111-4111-8111-111111111111',
      product_id: '33333333-3333-4333-8333-333333333333',
      product_name: 'Pearl Drop Earrings',
      product_image: null,
      unit_price: 500,
      quantity: 1,
      discount_amount: 0,
      tax: 0,
      line_total: 500,
      created_at: '2026-09-23T10:00:00.000Z',
    },
  ],
  created_at: '2026-09-23T10:00:00.000Z',
  updated_at: '2026-09-23T10:00:00.000Z',
} as Order;

describe('transactional email templates', () => {
  it('uses order-time item and payment data in confirmation emails', () => {
    const email = renderOrderEmail({
      kind: 'confirmation',
      order,
      orderUrl: 'https://www.gridaan.com/order-success?order=GR-00000042',
    });

    expect(email.subject).toContain('GR-00000042');
    expect(email.html).toContain('Pearl Drop Earrings');
    expect(email.html).toContain('captured');
    expect(email.html).toContain('₹500.00');
    expect(email.html).toContain('Asha');
    expect(email.html).toContain('Subtotal');
    expect(email.html).toContain('Shipping');
    expect(email.html).toContain('each');
    expect(email.html).toContain('IST');
  });

  it('does not invent tracking details when AWB is unavailable', () => {
    const email = renderOrderEmail({
      kind: 'shipped',
      order,
      shipment: { awb: null, courier_name: null, tracking_url: null } as never,
      orderUrl: 'https://www.gridaan.com/order-success?order=GR-00000042',
    });

    expect(email.html).toContain('Tracking information will be available shortly.');
    expect(email.html).not.toContain('undefined');
  });

  it('renders an admin alert with the real admin order URL', () => {
    const email = renderAdminOrderEmail({
      order,
      orderUrl: 'https://www.gridaan.com/admin/orders/11111111-1111-4111-8111-111111111111',
    });

    expect(email.subject).toBe('New Gridaan Order #GR-00000042');
    expect(email.html).toContain('/admin/orders/11111111-1111-4111-8111-111111111111');
  });

  it('does not mislabel the order date as delivery or leak checkout notes as cancellation reason', () => {
    const delivered = renderOrderEmail({
      kind: 'delivered', order: { ...order, delivered_at: null }, orderUrl: 'https://www.gridaan.com/account',
    });
    expect(delivered.html).not.toContain('Delivered date');
    const cancelled = renderOrderEmail({
      kind: 'cancelled', order: { ...order, notes: 'Private checkout message', cancelled_at: '2026-09-24T10:00:00.000Z' },
      orderUrl: 'https://www.gridaan.com/account',
    });
    expect(cancelled.html).toContain('Cancellation date');
    expect(cancelled.html).not.toContain('Private checkout message');
  });
});
