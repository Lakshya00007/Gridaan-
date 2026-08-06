import { NextRequest, NextResponse } from 'next/server';
import { checkoutSchema } from '@/lib/validators';
import { assertJsonRequest, assertSameOrigin, errorResponse } from '@/lib/api';
import { getProfile } from '@/lib/supabase/auth';
import { isRateLimited, getClientIdentifier } from '@/lib/rate-limit';
import { createOnlineCheckout } from '@/lib/payments/payment-service';
import { publicEnv } from '@/lib/env.public';

/**
 * POST /api/orders
 *
 * Online-payment-only checkout preparation.
 * This route creates a pending checkout/order record, reserves stock, creates
 * a Razorpay order, and returns the Standard Checkout payload. It does not
 * place an order or decrement stock.
 */
export async function POST(req: NextRequest) {
  const clientId = getClientIdentifier(req);
  if (isRateLimited(clientId, { limit: 8, windowSec: 60 })) {
    return NextResponse.json(
      { error: 'Too many checkout attempts. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    assertJsonRequest(req);
    assertSameOrigin(req);

    const input = checkoutSchema.parse(await req.json());
    const profile = await getProfile();
    const idempotencyKey = req.headers.get('idempotency-key') ?? undefined;
    const result = await createOnlineCheckout({
      input,
      profileId: profile?.id ?? null,
      idempotencyKey,
    });

    const providerOrder = result.provider_order as {
      gatewayOrderId: string;
      amountPaise: number;
      currency: string;
      status: string;
      integrationPending?: boolean;
    };
    const payment = result.payment as { id: string; gateway_order_id: string | null } | undefined;
    const attempt = result.attempt as { id: string; expires_at?: string | null } | undefined;
    const order = result.order as {
      id: string;
      checkout_reference?: string | null;
      customer_name: string;
      customer_email: string | null;
      customer_phone: string;
    };

    return NextResponse.json({
      ok: true,
      checkout: {
        order_id: order.id,
        payment_id: payment?.id ?? null,
        attempt_id: attempt?.id ?? null,
        checkout_reference: order.checkout_reference ?? result.checkout_reference,
        razorpay_order_id: providerOrder.gatewayOrderId,
        amount: providerOrder.amountPaise,
        currency: providerOrder.currency,
        key: publicEnv.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? null,
        business_name: 'Gridaan',
        prefill: {
          name: order.customer_name,
          email: order.customer_email ?? '',
          contact: order.customer_phone,
        },
        expires_at: attempt?.expires_at ?? null,
      },
      provider_order: providerOrder,
      reused: result.reused,
      message:
        providerOrder.integrationPending
          ? 'Mock payment order prepared.'
          : 'Razorpay payment order prepared.',
    });
  } catch (err) {
    return errorResponse(err);
  }
}
