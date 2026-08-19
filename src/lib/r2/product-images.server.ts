import 'server-only';

import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { getR2Config, uploadObject } from './client';
import {
  PRODUCT_IMAGE_CACHE_CONTROL,
  PRODUCT_IMAGE_CONTENT_TYPE,
  PRODUCT_IMAGE_EXTENSION,
  PRODUCT_IMAGE_MAX_DIMENSION,
  PRODUCT_IMAGE_WEBP_QUALITY,
  ProductImageValidationError,
  uploadProductImageObject,
  validateProductImageUpload,
  type ProductImageObject,
  type UploadedProductImage,
} from './product-media';

export async function prepareProductImage(file: File): Promise<ProductImageObject> {
  const input = Buffer.from(await file.arrayBuffer());
  validateProductImageUpload({
    bytes: input,
    declaredMime: file.type,
    size: file.size,
  });

  const pipeline = sharp(input, { animated: false, failOn: 'warning' });
  const metadata = await pipeline.metadata();
  if ((metadata.pages ?? 1) > 1) {
    throw new ProductImageValidationError('Animated product images are not supported.', 'animated_image_unsupported');
  }

  const output = await pipeline
    .rotate()
    .resize({
      width: PRODUCT_IMAGE_MAX_DIMENSION,
      height: PRODUCT_IMAGE_MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: PRODUCT_IMAGE_WEBP_QUALITY,
      smartSubsample: true,
    })
    .toBuffer({ resolveWithObject: true });

  return {
    body: output.data,
    contentType: PRODUCT_IMAGE_CONTENT_TYPE,
    extension: PRODUCT_IMAGE_EXTENSION,
    cacheControl: PRODUCT_IMAGE_CACHE_CONTROL,
    width: output.info.width,
    height: output.info.height,
    size: output.data.byteLength,
  };
}

export async function uploadProductImage({
  file,
  productId = randomUUID(),
}: {
  file: File;
  productId?: string;
}): Promise<UploadedProductImage> {
  const image = await prepareProductImage(file);
  return uploadProductImageObject({
    productId,
    image,
    r2Config: getR2Config(),
    uploadObject,
  });
}
