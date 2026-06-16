import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { assertSameOrigin, badRequest, errorResponse } from '@/lib/api';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await requireAdmin();

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw badRequest('File is required', 'missing_file');
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw badRequest('Unsupported image type', 'invalid_file_type');
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw badRequest('Image must be 5MB or smaller', 'file_too_large');
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
    const path = `products/${randomUUID()}.${extension}`;
    const supabase = createServiceClient();

    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage.from('product-images').getPublicUrl(path);

    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    return errorResponse(err);
  }
}
