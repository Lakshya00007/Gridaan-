import { Buffer } from 'node:buffer';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PRODUCT_IMAGE_CACHE_CONTROL,
  PRODUCT_IMAGE_CONTENT_TYPE,
  PRODUCT_IMAGE_MAX_BYTES,
  R2ConfigurationError,
  ProductImageValidationError,
  buildProductImageKey,
  buildProductImageMetadata,
  buildR2PublicUrl,
  collectManagedR2Keys,
  deleteManagedProductImages,
  extractManagedR2KeyFromUrl,
  parseR2Config,
  uploadProductImageObject,
  validateProductImageUpload,
  type R2Config,
  type R2ObjectUploadInput,
} from '@/lib/r2/product-media';

const projectRoot = path.resolve(import.meta.dirname, '..');
const productId = '11111111-1111-4111-8111-111111111111';
const secondProductId = '22222222-2222-4222-8222-222222222222';
const imageId = '33333333-3333-4333-8333-333333333333';
const secondImageId = '44444444-4444-4444-8444-444444444444';

const r2Config: R2Config = {
  accountId: 'a'.repeat(32),
  accessKeyId: 'test-access-key',
  secretAccessKey: 'test-secret-key',
  bucketName: 'gridaan-product-media',
  publicBaseUrl: 'https://images.gridaan.com',
};

function read(relativePath: string) {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function walkFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = path.join(directory, entry);
    return statSync(absolute).isDirectory() ? walkFiles(absolute) : [absolute];
  });
}

function pngHeader() {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
}

describe('Cloudflare R2 product media configuration', () => {
  it('validates complete server-only R2 environment input', () => {
    expect(
      parseR2Config({
        R2_ACCOUNT_ID: r2Config.accountId,
        R2_ACCESS_KEY_ID: r2Config.accessKeyId,
        R2_SECRET_ACCESS_KEY: r2Config.secretAccessKey,
        R2_BUCKET_NAME: r2Config.bucketName,
        R2_PUBLIC_BASE_URL: `${r2Config.publicBaseUrl}/`,
      })
    ).toEqual(r2Config);
  });

  it('fails closed when required R2 environment is missing or malformed', () => {
    expect(() => parseR2Config({})).toThrow(R2ConfigurationError);
    expect(() =>
      parseR2Config({
        ...r2Config,
        R2_ACCOUNT_ID: r2Config.accountId,
        R2_ACCESS_KEY_ID: r2Config.accessKeyId,
        R2_SECRET_ACCESS_KEY: r2Config.secretAccessKey,
        R2_BUCKET_NAME: r2Config.bucketName,
        R2_PUBLIC_BASE_URL: 'http://images.gridaan.com',
      })
    ).toThrow(R2ConfigurationError);
  });

  it('documents R2 env names without exposing public credential variables', () => {
    const example = read('.env.example');
    for (const key of [
      'R2_ACCOUNT_ID=',
      'R2_ACCESS_KEY_ID=',
      'R2_SECRET_ACCESS_KEY=',
      'R2_BUCKET_NAME=',
      'R2_PUBLIC_BASE_URL=',
    ]) {
      expect(example).toContain(key);
    }
    expect(example).not.toMatch(/NEXT_PUBLIC_R2_(ACCESS_KEY|SECRET|ACCOUNT)/);
  });
});

describe('Cloudflare R2 product image keys and URLs', () => {
  it('generates immutable product UUID scoped object keys', () => {
    expect(buildProductImageKey({ productId, imageId })).toBe(
      `products/${productId}/${imageId}.webp`
    );
    expect(buildProductImageKey({ productId: secondProductId, imageId })).toBe(
      `products/${secondProductId}/${imageId}.webp`
    );
    expect(() => buildProductImageKey({ productId: 'slug-only', imageId })).toThrow(
      ProductImageValidationError
    );
  });

  it('builds canonical public URLs from the configured custom domain', () => {
    const key = buildProductImageKey({ productId, imageId });
    expect(buildR2PublicUrl(r2Config, key)).toBe(
      `https://images.gridaan.com/products/${productId}/${imageId}.webp`
    );
    expect(() => buildR2PublicUrl(r2Config, '../secret')).toThrow(ProductImageValidationError);
  });

  it('detects only managed R2 product image URLs as deletable', () => {
    const key = buildProductImageKey({ productId, imageId });
    const managed = buildR2PublicUrl(r2Config, key);

    expect(extractManagedR2KeyFromUrl(managed, r2Config.publicBaseUrl)).toBe(key);
    expect(extractManagedR2KeyFromUrl(`${managed}?download=1`, r2Config.publicBaseUrl)).toBeNull();
    expect(
      extractManagedR2KeyFromUrl(
        `https://images.gridaan.com/products/${productId}/../${imageId}.webp`,
        r2Config.publicBaseUrl
      )
    ).toBeNull();
    expect(
      extractManagedR2KeyFromUrl(
        'https://example.supabase.co/storage/v1/object/public/product-images/old.jpg',
        r2Config.publicBaseUrl
      )
    ).toBeNull();
  });

  it('collects unique managed keys while preserving old external image compatibility', () => {
    const first = buildR2PublicUrl(r2Config, buildProductImageKey({ productId, imageId }));
    const second = buildR2PublicUrl(
      r2Config,
      buildProductImageKey({ productId, imageId: secondImageId })
    );

    expect(
      collectManagedR2Keys(
        [
          first,
          'https://example.supabase.co/storage/v1/object/public/product-images/old.jpg',
          'https://images.pexels.com/photos/1/product.jpg',
          first,
          second,
        ],
        r2Config.publicBaseUrl
      )
    ).toEqual([
      `products/${productId}/${imageId}.webp`,
      `products/${productId}/${secondImageId}.webp`,
    ]);
  });
});

describe('Cloudflare R2 product image validation', () => {
  it('accepts supported JPEG, PNG, and WebP bytes only when MIME matches', () => {
    expect(validateProductImageUpload({
      bytes: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      declaredMime: 'image/jpeg',
    }).mime).toBe('image/jpeg');
    expect(validateProductImageUpload({ bytes: pngHeader(), declaredMime: 'image/png' }).mime).toBe(
      'image/png'
    );
    expect(validateProductImageUpload({
      bytes: Buffer.from('RIFFxxxxWEBP', 'ascii'),
      declaredMime: 'image/webp',
    }).mime).toBe('image/webp');
  });

  it('rejects SVG, malformed data, mismatched MIME, and oversized uploads', () => {
    expect(() =>
      validateProductImageUpload({
        bytes: Buffer.from('<svg></svg>'),
        declaredMime: 'image/svg+xml',
      })
    ).toThrow(ProductImageValidationError);
    expect(() =>
      validateProductImageUpload({
        bytes: pngHeader(),
        declaredMime: 'image/jpeg',
      })
    ).toThrow(ProductImageValidationError);
    expect(() =>
      validateProductImageUpload({
        bytes: Buffer.from('not an image'),
        declaredMime: 'image/png',
      })
    ).toThrow(ProductImageValidationError);
    expect(() =>
      validateProductImageUpload({
        bytes: pngHeader(),
        declaredMime: 'image/png',
        size: PRODUCT_IMAGE_MAX_BYTES + 1,
      })
    ).toThrow(ProductImageValidationError);
  });
});

describe('Cloudflare R2 product image upload and deletion mapping', () => {
  it('uploads optimized product image objects with canonical URL mapping', async () => {
    const calls: R2ObjectUploadInput[] = [];
    const uploaded = await uploadProductImageObject({
      productId,
      imageId,
      r2Config,
      image: {
        body: Buffer.from('optimized-webp'),
        contentType: PRODUCT_IMAGE_CONTENT_TYPE,
        extension: 'webp',
        cacheControl: PRODUCT_IMAGE_CACHE_CONTROL,
        width: 1200,
        height: 1200,
        size: 14,
      },
      uploadObject: async (input) => {
        calls.push(input);
      },
    });

    expect(calls).toEqual([
      {
        key: `products/${productId}/${imageId}.webp`,
        body: Buffer.from('optimized-webp'),
        contentType: 'image/webp',
        cacheControl: PRODUCT_IMAGE_CACHE_CONTROL,
      },
    ]);
    expect(uploaded).toMatchObject({
      productId,
      key: `products/${productId}/${imageId}.webp`,
      url: `https://images.gridaan.com/products/${productId}/${imageId}.webp`,
      contentType: 'image/webp',
      width: 1200,
      height: 1200,
      size: 14,
    });
  });

  it('deletes managed R2 image objects and ignores external URLs', async () => {
    const managed = buildR2PublicUrl(r2Config, buildProductImageKey({ productId, imageId }));
    const deletedBatches: string[][] = [];
    const deleted = await deleteManagedProductImages({
      urls: [managed, 'https://res.cloudinary.com/demo/image/upload/old.jpg'],
      r2Config,
      deleteObjects: async (keys) => {
        deletedBatches.push(keys);
      },
    });

    expect(deleted).toEqual([`products/${productId}/${imageId}.webp`]);
    expect(deletedBatches).toEqual([[`products/${productId}/${imageId}.webp`]]);
  });

  it('preserves primary image and ordering metadata for multiple images', () => {
    const oldUrl = 'https://example.supabase.co/storage/v1/object/public/product-images/old.jpg';
    const newUrl = buildR2PublicUrl(r2Config, buildProductImageKey({ productId, imageId }));

    expect(
      buildProductImageMetadata({
        images: [newUrl, oldUrl],
        existingMetadata: [{ url: oldUrl, alt: 'Historical image', is_primary: true }],
        defaultAlt: 'Gold Necklace',
      })
    ).toEqual([
      { url: newUrl, alt: 'Gold Necklace', is_primary: true },
      { url: oldUrl, alt: 'Historical image', is_primary: false },
    ]);
  });
});

describe('Cloudflare R2 integration guardrails', () => {
  it('keeps admin upload/delete endpoints authorized and off Supabase Storage', () => {
    const uploadRoute = read('src/app/api/admin/upload/route.ts');

    expect(uploadRoute).toContain("requireAdminPermission('products.write')");
    expect(uploadRoute).toContain('assertSameOrigin(req)');
    expect(uploadRoute).toContain('uploadProductImage');
    expect(uploadRoute).toContain('deleteManagedProductImageUrls');
    expect(uploadRoute).not.toContain(".storage.from('product-images')");
  });

  it('cleans up managed R2 objects after product create failures and product removals', () => {
    const createRoute = read('src/app/api/admin/products/route.ts');
    const updateRoute = read('src/app/api/admin/products/[id]/route.ts');

    expect(createRoute).toContain('!insertedProductId');
    expect(createRoute).toContain('deleteManagedProductImageUrls(input.images)');
    expect(updateRoute).toContain('getRemovedImages');
    expect(updateRoute).toContain('deleteManagedProductImageUrls(urls)');
    expect(updateRoute).toContain('product-delete');
  });

  it('allows images.gridaan.com in Next image optimization and CSP without removing old hosts', () => {
    const config = read('next.config.mjs');

    expect(config).toContain("hostname: 'images.gridaan.com'");
    expect(config).toContain('https://images.gridaan.com');
    expect(config).toContain("hostname: '*.supabase.co'");
    expect(config).toContain('https://*.supabase.co');
    expect(config).toContain('https://www.facebook.com');
    expect(config).toContain('https://checkout.razorpay.com');
    expect(config).toContain("frame-ancestors 'none'");
  });

  it('does not import server-only R2 modules from client components', () => {
    const clientFiles = walkFiles(path.join(projectRoot, 'src')).filter((file) => {
      if (!/\.(ts|tsx)$/.test(file)) return false;
      return readFileSync(file, 'utf8').trimStart().startsWith("'use client'");
    });

    for (const file of clientFiles) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toContain('@/lib/r2/client');
      expect(source, file).not.toContain('@/lib/r2/product-images.server');
      expect(source, file).not.toMatch(/R2_(ACCESS_KEY|SECRET_ACCESS_KEY|ACCOUNT_ID)/);
    }
  });
});
