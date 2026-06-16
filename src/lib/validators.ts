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
  payment_method: z.enum(['razorpay', 'cod']),
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

/* ---------- Razorpay create-order ---------- */
export const createRzpOrderSchema = z.object({
  order_id: z.string().uuid(),
});
export type CreateRzpOrderInput = z.infer<typeof createRzpOrderSchema>;

/* ---------- Admin product ---------- */
export const productSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and dashes only'),
  description: z.string().min(10).max(5000),
  price: z.number().positive().max(1_000_000),
  original_price: z.number().positive().max(1_000_000),
  category_id: z.string().uuid().nullable().optional(),
  images: z.array(z.string().url()).min(1, 'At least one image is required'),
  tags: z.array(z.string()).default([]),
  in_stock: z.boolean().default(true),
  stock_count: z.number().int().min(0).default(0),
  is_trending: z.boolean().default(false),
  is_new_arrival: z.boolean().default(false),
  is_best_seller: z.boolean().default(false),
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
