import { z } from 'zod';

/* ---------- Auth ---------- */
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = loginSchema
  .extend({
    full_name: z.string().min(2, 'Please enter your name').max(120),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type SignupInput = z.infer<typeof signupSchema>;

/* ---------- Address ---------- */
export const addressSchema = z.object({
  full_name: z.string().min(2).max(120),
  phone: z
    .string()
    .min(10, 'Phone must be 10 digits')
    .max(10)
    .regex(/^[6-9]\d{9}$/, 'Enter a valid Indian mobile number'),
  line1: z.string().min(4).max(200),
  line2: z.string().max(200).optional().or(z.literal('')),
  city: z.string().min(2).max(80),
  state: z.string().min(2).max(80),
  pincode: z.string().regex(/^\d{6}$/, 'PIN must be 6 digits'),
  country: z.string().default('India'),
});
export type AddressInput = z.infer<typeof addressSchema>;

/* ---------- Checkout ---------- */
export const checkoutSchema = z.object({
  customer_name: z.string().min(2).max(120),
  customer_email: z.string().email().optional().or(z.literal('')),
  customer_phone: z
    .string()
    .min(10)
    .max(10)
    .regex(/^[6-9]\d{9}$/),
  shipping_address: addressSchema,
  payment_method: z.literal('razorpay'),
  coupon_code: z.string().max(40).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().positive().max(50),
      })
    )
    .min(1, 'Cart is empty'),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/* ---------- Admin product ---------- */
export const productSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and dashes only'),
  description: z.string().min(10).max(5000),
  short_description: z.string().max(500).optional().nullable(),
  sku: z.string().trim().max(80).optional().nullable(),
  price: z.number().positive().max(1_000_000),
  original_price: z.number().positive().max(1_000_000),
  cost_price: z.number().min(0).max(1_000_000).optional().nullable(),
  category_id: z.string().uuid().nullable().optional(),
  subcategory: z.string().trim().max(120).optional().nullable(),
  product_type: z.string().trim().max(120).optional().nullable(),
  gender: z.string().trim().max(80).optional().nullable(),
  material: z.string().trim().max(120).optional().nullable(),
  colour: z.string().trim().max(80).optional().nullable(),
  size: z.string().trim().max(80).optional().nullable(),
  weight_grams: z.number().min(0).max(100000).optional().nullable(),
  jewellery_type: z.string().trim().max(120).optional().nullable(),
  tax_category: z.string().trim().max(120).optional().nullable(),
  images: z.array(z.string().url()).min(1, 'At least one image is required'),
  image_metadata: z
    .array(
      z.object({
        url: z.string(),
        alt: z.string().max(200).optional(),
        is_primary: z.boolean().optional(),
      })
    )
    .optional(),
  tags: z.array(z.string()).default([]),
  in_stock: z.boolean().default(true),
  stock_count: z.number().int().min(0).default(0),
  reserved_stock: z.number().int().min(0).optional(),
  low_stock_threshold: z.number().int().min(0).optional(),
  reorder_level: z.number().int().min(0).optional(),
  is_trending: z.boolean().default(false),
  is_new_arrival: z.boolean().default(false),
  is_best_seller: z.boolean().default(false),
  is_featured: z.boolean().optional(),
  is_active: z.boolean().optional(),
  return_eligible: z.boolean().optional(),
  cod_eligible: z.boolean().optional(),
  archived_at: z.string().datetime().nullable().optional(),
  seo_title: z.string().max(200).optional().nullable(),
  seo_description: z.string().max(500).optional().nullable(),
  search_keywords: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine((data) => data.original_price >= data.price, {
  message: 'MRP must be greater than or equal to selling price',
  path: ['original_price'],
});
export type ProductInput = z.infer<typeof productSchema>;

/* ---------- Admin category ---------- */
export const categorySchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional().or(z.literal('')),
  image_url: z.string().url().optional().or(z.literal('')),
  icon: z.string().max(20).optional().or(z.literal('')),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});
export type CategoryInput = z.infer<typeof categorySchema>;

/* ---------- Admin coupon ---------- */
export const couponSchema = z
  .object({
    code: z
      .string()
      .min(3)
      .max(40)
      .regex(/^[A-Z0-9_-]+$/, 'Use uppercase letters, numbers, underscore, or dash')
      .transform((v) => v.toUpperCase()),
    description: z.string().max(500).optional().or(z.literal('')),
    type: z.enum(['percentage', 'fixed']),
    value: z.number().positive().max(1_000_000),
    min_order: z.number().min(0).default(0),
    max_discount: z.number().min(0).nullable().optional(),
    usage_limit: z.number().int().min(0).nullable().optional(),
    is_active: z.boolean().default(true),
    starts_at: z.string().datetime().nullable().optional(),
    expires_at: z.string().datetime().nullable().optional(),
  })
  .refine(
    (d) => d.type !== 'percentage' || d.value <= 100,
    { message: 'Percentage value cannot exceed 100', path: ['value'] }
  );
export type CouponInput = z.infer<typeof couponSchema>;
