import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { checkoutSchema } from '@/lib/validators';
import { ApiError, assertJsonRequest, assertSameOrigin } from '@/lib/api';
import { getProfile } from '@/lib/supabase/auth';
import { isRateLimited, getClientIdentifier } from '@/lib/rate-limit';
import { createOnlineCheckout } from '@/lib/payments/payment-service';
import { publicEnv } from '@/lib/env.public';
import { CheckoutProcessingError, checkoutFailureLog } from '@/lib/payments/checkout-errors';

/**
 * POST /api/orders
 *
 * Online-payment-only checkout preparation.
 * This route creates a pending checkout/order record, reserves stock, creates
 * a Razorpay order, and returns the Standard Checkout payload. It does not
 * place an order or decrement stock.
 */
export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  const clientId = getClientIdentifier(req);
  if (isRateLimited(clientId, { limit: 8, windowSec: 60 })) {
    return NextResponse.json(
      {
        error: 'rate_limited',
        message: 'Too many checkout attempts. Please try again later.',
        request_id: requestId,
      },
      { status: 429 }
    );
  }

  try {
    assertJsonRequest(req);
    assertSameOrigin(req);

    const input = checkoutSchema.parse(await req.json());
    let profile: Awaited<ReturnType<typeof getProfile>>;
    try {
      profile = await getProfile();
    } catch (cause) {
      throw new CheckoutProcessingError({
        publicError: 'order_database_error',
        stage: 'profile_lookup',
        cause,
      });
    }
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
      message: providerOrder.integrationPending
        ? 'Mock payment order prepared.'
        : 'Razorpay payment order prepared.',
      request_id: requestId,
    });
  } catch (err) {
    if (err instanceof CheckoutProcessingError) {
      console.error('[checkout]', checkoutFailureLog(err, requestId));
      const message =
        err.publicError === 'stock_reservation_failed'
          ? 'Product stock could not be reserved. Please review your cart and retry.'
          : err.publicError === 'razorpay_order_creation_failed'
            ? 'Online payment could not be initialized. Please retry.'
            : err.publicError === 'checkout_in_progress'
              ? 'This checkout request is already being processed.'
              : err.publicError === 'idempotency_conflict'
                ? 'This checkout key was already used for different cart details.'
                : 'Checkout could not be prepared. Please retry.';
      return NextResponse.json(
        { error: err.publicError, message, request_id: requestId },
        { status: err.status }
      );
    }
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'validation_error', issues: err.flatten(), request_id: requestId },
        { status: 422 }
      );
    }
    if (err instanceof ApiError) {
      return NextResponse.json(
        {
          error: err.code ?? 'checkout_request_error',
          message: err.message,
          request_id: requestId,
        },
        { status: err.status }
      );
    }

    console.error('[checkout]', {
      request_id: requestId,
      processing_stage: 'unhandled',
    });
    return NextResponse.json({ error: 'internal_error', request_id: requestId }, { status: 500 });
  }
}
