import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminPermission } from '@/lib/admin/permissions';
import { assertJsonRequest, assertSameOrigin, badRequest, errorResponse } from '@/lib/api';
import { deleteManagedProductImageUrls } from '@/lib/r2/client';
import { ProductImageValidationError } from '@/lib/r2/product-media';
import { uploadProductImage } from '@/lib/r2/product-images.server';

const uploadProductImageSchema = z.object({
  product_id: z.string().uuid().optional(),
});

const deleteProductImagesSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(50),
});

function productImageErrorResponse(error: ProductImageValidationError) {
  return errorResponse(badRequest(error.message, error.code));
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await requireAdminPermission('products.write');

    const formData = await req.formData();
    const productIdValue = formData.get('product_id');
    const { product_id: productId } = uploadProductImageSchema.parse({
      product_id: typeof productIdValue === 'string' && productIdValue.trim()
        ? productIdValue.trim()
        : undefined,
    });
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw badRequest('File is required', 'missing_file');
    }

    const uploaded = await uploadProductImage({
      file,
      productId,
    });

    return NextResponse.json({
      url: uploaded.url,
      product_id: uploaded.productId,
      width: uploaded.width,
      height: uploaded.height,
      size: uploaded.size,
      content_type: uploaded.contentType,
    });
  } catch (err) {
    if (err instanceof ProductImageValidationError) {
      return productImageErrorResponse(err);
    }
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    assertJsonRequest(req);
    assertSameOrigin(req);
    await requireAdminPermission('products.write');

    const input = deleteProductImagesSchema.parse(await req.json());
    const deletedKeys = await deleteManagedProductImageUrls(input.urls);

    return NextResponse.json({
      deleted: deletedKeys.length,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
