import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { assertJsonRequest, assertSameOrigin, errorResponse, badRequest } from '@/lib/api';
import { isRateLimited, getClientIdentifier } from '@/lib/rate-limit';

const schema = z.object({
  code: z.string().min(3).max(40),
  subtotal: z.number().min(0),
});

/** POST /api/coupons/validate { code, subtotal } */
export async function POST(req: NextRequest) {
  // Rate limiting: max 10 coupon checks per minute per client
  const clientId = getClientIdentifier(req);
  if (isRateLimited(clientId, { limit: 10, windowSec: 60 })) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    assertJsonRequest(req);
    assertSameOrigin(req);

    const body = await schema.parse(await req.json());
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: body.code,
      p_subtotal: body.subtotal,
    });
    if (error) throw error;
    const row = data?.[0];
    if (!row || !row.ok) {
      throw badRequest(row?.reason ?? 'Invalid coupon', 'invalid_coupon');
    }
    // Fetch the full coupon for client use
    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', row.coupon_code)
      .single();
    return NextResponse.json({
      ok: true,
      discount: row.discount,
      coupon,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
