import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  send: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('resend', () => ({ Resend: class {
  emails = { send: mocks.send };
} }));
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
vi.mock('@/lib/env.server', () => ({
  serverEnv: { RESEND_API_KEY: 'test-key', RESEND_FROM_EMAIL: 'Gridaan <orders@example.com>' },
}));
vi.mock('@/lib/business-info.server', () => ({
  getPublishedBusinessInfo: () => ({ supportEmail: 'help@example.com' }),
}));

import { sendOrderEmailEvent } from '@/lib/email/service';

const orderId = '11111111-1111-4111-8111-111111111111';
const payload = { from: 'Gridaan <orders@example.com>', to: 'buyer@example.com', subject: 'Order placed', html: '<p>Order placed</p>' };

function claimed() {
  return { id: '22222222-2222-4222-8222-222222222222', claim_id: '33333333-3333-4333-8333-333333333333', attempt_count: 1, payload, claim_result: 'claimed' };
}

describe('durable order email sending', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.send.mockResolvedValue({ data: { id: 'provider-message' }, error: null });
  });

  it('sends a claimed event with a stable provider key, then checks the sent-state write', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [claimed()], error: null })
      .mockResolvedValueOnce({ data: true, error: null });
    const result = await sendOrderEmailEvent({ orderId, eventType: 'order_confirmation' });
    expect(result).toMatchObject({ sent: true, messageId: 'provider-message' });
    expect(mocks.send).toHaveBeenCalledWith(payload, {
      idempotencyKey: `order-email/order_confirmation/${orderId}`,
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, 'finish_order_email_event', expect.objectContaining({
      p_status: 'sent', p_provider_message_id: 'provider-message',
    }));
  });

  it('does not send when another callback already owns or completed the event', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [{ ...claimed(), claim_id: null, claim_result: 'already_claimed' }], error: null })
      .mockResolvedValueOnce({ data: [{ ...claimed(), claim_id: null, claim_result: 'already_sent' }], error: null });
    const first = await sendOrderEmailEvent({ orderId, eventType: 'order_confirmation' });
    const second = await sendOrderEmailEvent({ orderId, eventType: 'order_confirmation' });
    expect(first).toMatchObject({ sent: false, reason: 'already_claimed' });
    expect(second).toMatchObject({ sent: false, reason: 'already_sent' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('records provider failure for a later bounded retry', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [claimed()], error: null })
      .mockResolvedValueOnce({ data: true, error: null });
    mocks.send.mockResolvedValueOnce({ data: null, error: { message: 'Temporary provider failure' } });
    const result = await sendOrderEmailEvent({ orderId, eventType: 'order_confirmation' });
    expect(result).toMatchObject({ sent: false, reason: 'send_failed' });
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, 'finish_order_email_event', expect.objectContaining({
      p_status: 'failed', p_error: 'Temporary provider failure',
    }));
  });

  it('reports a failed bookkeeping write after provider acceptance', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [claimed()], error: null })
      .mockResolvedValueOnce({ data: false, error: null });
    const result = await sendOrderEmailEvent({ orderId, eventType: 'order_confirmation' });
    expect(result).toMatchObject({ sent: false, reason: 'bookkeeping_failed' });
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
});
