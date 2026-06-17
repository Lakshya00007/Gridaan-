/**
 * Application-wide type definitions. These mirror the SQL schema
 * defined in `supabase/migrations/0001_init.sql`.
 *
 * If you regenerate Supabase types via `pnpm supabase:types`, merge
 * the generated `supabase.ts` with this file (this file is hand-tuned
 * for application-side ergonomics; the generated file is database-pure).
 */

export type OrderStatus = 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'razorpay' | 'cod';
export type CouponType = 'percentage' | 'fixed';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  original_price: number;
  discount: number;
  images: string[];
  category_id: string | null;
  category?: Category | null;
  tags: string[];
  in_stock: boolean;
  stock_count: number;
  rating: number;
  review_count: number;
  is_trending: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type ProductSort = 'featured' | 'newest' | 'trending' | 'price_asc' | 'price_desc' | 'rating';

export interface ProductFilter {
  category?: string;
  search?: string;
  sort?: ProductSort;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface Address {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_email: string | null;
  customer_phone: string;
  customer_name: string;
  address_id: string | null;
  shipping_address: {
    full_name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  coupon_id: string | null;
  coupon_code: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  notes: string | null;
  items?: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderSuccessSummary {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  razorpay_order_id: string | null;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: CouponType;
  value: number;
  min_order: number;
  max_discount: number | null;
  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  product?: Product;
  created_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

/* ----------------- Cart (client-side) ----------------- */

export interface CartProductSnapshot {
  id: string;
  slug: string;
  name: string;
  price: number;
  original_price: number;
  discount: number;
  images: string[];
  in_stock: boolean;
  stock_count: number;
  category?: Pick<Category, 'id' | 'slug' | 'name'> | null;
}

export interface CartItem {
  product_id: string;
  product: CartProductSnapshot;
  quantity: number;
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  item_count: number;
}
