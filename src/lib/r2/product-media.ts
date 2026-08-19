import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

export const PRODUCT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const PRODUCT_IMAGE_MAX_DIMENSION = 2400;
export const PRODUCT_IMAGE_WEBP_QUALITY = 88;
export const PRODUCT_IMAGE_CONTENT_TYPE = 'image/webp';
export const PRODUCT_IMAGE_EXTENSION = 'webp';
export const PRODUCT_IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export type ProductImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicBaseUrl: string;
};

export type ProductImageObject = {
  body: Buffer;
  contentType: ProductImageMime;
  extension: string;
  cacheControl: string;
  width?: number;
  height?: number;
  size: number;
};

export type UploadedProductImage = {
  productId: string;
  key: string;
  url: string;
  contentType: ProductImageMime;
  width?: number;
  height?: number;
  size: number;
};

export type ProductImageMeta = {
  url: string;
  alt?: string;
  is_primary?: boolean;
};

export type R2ObjectUploadInput = {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MANAGED_PRODUCT_IMAGE_KEY_PATTERN =
  /^products\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(webp|jpg|jpeg|png)$/i;
const ALLOWED_DECLARED_IMAGE_TYPES = new Set<ProductImageMime>([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const ALLOWED_PRODUCT_IMAGE_EXTENSIONS = new Set(['webp', 'jpg', 'jpeg', 'png']);

export class R2ConfigurationError extends Error {
  code = 'r2_configuration_error';
}

export class ProductImageValidationError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
  }
}

function requiredEnvValue(env: Record<string, unknown>, key: keyof typeof R2_ENV_KEYS) {
  const value = env[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

const R2_ENV_KEYS = {
  R2_ACCOUNT_ID: true,
  R2_ACCESS_KEY_ID: true,
  R2_SECRET_ACCESS_KEY: true,
  R2_BUCKET_NAME: true,
  R2_PUBLIC_BASE_URL: true,
} as const;

export function normalizeR2PublicBaseUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new R2ConfigurationError('R2_PUBLIC_BASE_URL must be a valid URL.');
  }

  if (url.protocol !== 'https:') {
    throw new R2ConfigurationError('R2_PUBLIC_BASE_URL must use https.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new R2ConfigurationError('R2_PUBLIC_BASE_URL must not include credentials, query, or hash.');
  }

  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString().replace(/\/$/, '');
}

export function parseR2Config(env: Record<string, unknown>): R2Config {
  const missing = Object.keys(R2_ENV_KEYS).filter((key) => !requiredEnvValue(env, key as keyof typeof R2_ENV_KEYS));
  if (missing.length > 0) {
    throw new R2ConfigurationError(`Missing R2 server environment variables: ${missing.join(', ')}`);
  }

  const accountId = requiredEnvValue(env, 'R2_ACCOUNT_ID')!;
  const accessKeyId = requiredEnvValue(env, 'R2_ACCESS_KEY_ID')!;
  const secretAccessKey = requiredEnvValue(env, 'R2_SECRET_ACCESS_KEY')!;
  const bucketName = requiredEnvValue(env, 'R2_BUCKET_NAME')!;
  const publicBaseUrl = normalizeR2PublicBaseUrl(requiredEnvValue(env, 'R2_PUBLIC_BASE_URL')!);

  if (!/^[a-f0-9]{32}$/i.test(accountId)) {
    throw new R2ConfigurationError('R2_ACCOUNT_ID must be a Cloudflare account ID.');
  }
  if (accessKeyId.length < 8) {
    throw new R2ConfigurationError('R2_ACCESS_KEY_ID is not configured correctly.');
  }
  if (secretAccessKey.length < 8) {
    throw new R2ConfigurationError('R2_SECRET_ACCESS_KEY is not configured correctly.');
  }
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucketName)) {
    throw new R2ConfigurationError('R2_BUCKET_NAME is not a valid bucket name.');
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl,
  };
}

export function getR2Endpoint(config: Pick<R2Config, 'accountId'>) {
  return `https://${config.accountId}.r2.cloudflarestorage.com`;
}

function assertUuid(value: string, label: string) {
  if (!UUID_PATTERN.test(value)) {
    throw new ProductImageValidationError(`${label} must be a valid UUID.`, 'invalid_uuid');
  }
}

function normalizeExtension(extension: string) {
  const normalized = extension.trim().toLowerCase().replace(/^\./, '');
  if (!ALLOWED_PRODUCT_IMAGE_EXTENSIONS.has(normalized)) {
    throw new ProductImageValidationError('Unsupported product image extension.', 'invalid_image_extension');
  }
  return normalized;
}

export function buildProductImageKey({
  productId,
  imageId = randomUUID(),
  extension = PRODUCT_IMAGE_EXTENSION,
}: {
  productId: string;
  imageId?: string;
  extension?: string;
}) {
  assertUuid(productId, 'Product ID');
  assertUuid(imageId, 'Image ID');
  return `products/${productId}/${imageId}.${normalizeExtension(extension)}`;
}

export function isSafeR2ObjectKey(key: string) {
  return (
    key.length > 0 &&
    key.length <= 512 &&
    !key.startsWith('/') &&
    !key.includes('\\') &&
    !key.includes('//') &&
    !key.split('/').includes('..')
  );
}

export function isManagedProductImageKey(key: string) {
  return isSafeR2ObjectKey(key) && MANAGED_PRODUCT_IMAGE_KEY_PATTERN.test(key);
}

export function buildR2PublicUrl(config: Pick<R2Config, 'publicBaseUrl'>, key: string) {
  if (!isSafeR2ObjectKey(key)) {
    throw new ProductImageValidationError('Invalid R2 object key.', 'invalid_r2_key');
  }
  return `${normalizeR2PublicBaseUrl(config.publicBaseUrl)}/${key}`;
}

export function extractManagedR2KeyFromUrl(url: string, publicBaseUrl: string) {
  let base: URL;
  let candidate: URL;
  try {
    base = new URL(`${normalizeR2PublicBaseUrl(publicBaseUrl)}/`);
    candidate = new URL(url);
  } catch {
    return null;
  }

  if (candidate.origin !== base.origin) return null;
  if (candidate.search || candidate.hash) return null;

  const basePath = base.pathname === '/' ? '/' : base.pathname.replace(/\/+$/, '/');
  if (basePath !== '/' && !candidate.pathname.startsWith(basePath)) return null;

  const key = basePath === '/'
    ? candidate.pathname.slice(1)
    : candidate.pathname.slice(basePath.length);

  return isManagedProductImageKey(key) ? key : null;
}

export function collectManagedR2Keys(urls: string[], publicBaseUrl: string) {
  const keys = new Set<string>();
  for (const url of urls) {
    const key = extractManagedR2KeyFromUrl(url, publicBaseUrl);
    if (key) keys.add(key);
  }
  return [...keys];
}

export function detectImageMime(bytes: Uint8Array): ProductImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    Buffer.from(bytes.subarray(0, 4)).toString('ascii') === 'RIFF' &&
    Buffer.from(bytes.subarray(8, 12)).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export function validateProductImageUpload({
  bytes,
  declaredMime,
  size = bytes.byteLength,
}: {
  bytes: Uint8Array;
  declaredMime?: string | null;
  size?: number;
}) {
  if (size <= 0) {
    throw new ProductImageValidationError('Image file is empty.', 'empty_file');
  }
  if (size > PRODUCT_IMAGE_MAX_BYTES) {
    throw new ProductImageValidationError('Image must be 10MB or smaller.', 'file_too_large');
  }

  const normalizedDeclaredMime = declaredMime?.trim().toLowerCase();
  if (
    normalizedDeclaredMime &&
    !ALLOWED_DECLARED_IMAGE_TYPES.has(normalizedDeclaredMime as ProductImageMime)
  ) {
    throw new ProductImageValidationError('Unsupported image type.', 'invalid_file_type');
  }

  const detectedMime = detectImageMime(bytes);
  if (!detectedMime) {
    throw new ProductImageValidationError('Image data is invalid or unsupported.', 'invalid_image_data');
  }
  if (normalizedDeclaredMime && normalizedDeclaredMime !== detectedMime) {
    throw new ProductImageValidationError('Image MIME type does not match its contents.', 'image_type_mismatch');
  }

  return {
    mime: detectedMime,
    size,
  };
}

export async function uploadProductImageObject({
  productId,
  image,
  r2Config,
  uploadObject,
  imageId = randomUUID(),
}: {
  productId: string;
  image: ProductImageObject;
  r2Config: Pick<R2Config, 'publicBaseUrl'>;
  uploadObject: (input: R2ObjectUploadInput) => Promise<void>;
  imageId?: string;
}): Promise<UploadedProductImage> {
  const key = buildProductImageKey({
    productId,
    imageId,
    extension: image.extension,
  });

  await uploadObject({
    key,
    body: image.body,
    contentType: image.contentType,
    cacheControl: image.cacheControl,
  });

  return {
    productId,
    key,
    url: buildR2PublicUrl(r2Config, key),
    contentType: image.contentType,
    width: image.width,
    height: image.height,
    size: image.size,
  };
}

export async function deleteManagedProductImages({
  urls,
  r2Config,
  deleteObjects,
}: {
  urls: string[];
  r2Config: Pick<R2Config, 'publicBaseUrl'>;
  deleteObjects: (keys: string[]) => Promise<void>;
}) {
  const keys = collectManagedR2Keys(urls, r2Config.publicBaseUrl);
  if (keys.length > 0) {
    await deleteObjects(keys);
  }
  return keys;
}

export function buildProductImageMetadata({
  images,
  existingMetadata,
  defaultAlt,
}: {
  images: string[];
  existingMetadata: ProductImageMeta[];
  defaultAlt: string;
}) {
  return images.map((url, index) => ({
    ...(existingMetadata.find((item) => item.url === url) ?? { url, alt: defaultAlt }),
    url,
    is_primary: index === 0,
  }));
}
