/**
 * Application-wide type definitions. These mirror the SQL schema
 * defined in `supabase/migrations/0001_init.sql`.
 *
 * If you regenerate Supabase types via `pnpm supabase:types`, merge
 * the generated `supabase.ts` with this file (this file is hand-tuned
 * for application-side ergonomics; the generated file is database-pure).
 */

export type OrderStatus =
  | 'draft'
  | 'pending_payment'
  | 'payment_processing'
  | 'placed'
  | 'confirmed'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'return_requested'
  | 'returned';
export type PaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'authorised'
  | 'captured'
  | 'paid'
  | 'failed'
  | 'partially_refunded'
  | 'refunded'
  | 'disputed';
export type PaymentMethod =
  | 'cod'
  | 'manual_upi'
  | 'bank_transfer'
  | 'razorpay'
  | 'upi'
  | 'card'
  | 'netbanking'
  | 'wallet'
  | 'emi'
  | 'manual';
export type CouponType =
  | 'percentage'
  | 'fixed'
  | 'free_shipping'
  | 'product_discount'
  | 'category_discount'
  | 'first_order'
  | 'minimum_cart';
export type AdminRole =
  | 'owner'
  | 'admin'
  | 'operations'
  | 'inventory_manager'
  | 'support'
  | 'analyst'
  | 'viewer';
export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';
export type RefundStatus = 'requested' | 'approved' | 'rejected' | 'processing' | 'processed' | 'failed';
export type CustomerStatus = 'active' | 'blocked' | 'guest' | 'high_value';

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
  short_description?: string | null;
  sku?: string | null;
  price: number;
  original_price: number;
  cost_price?: number | null;
  discount: number;
  images: string[];
  image_metadata?: Array<{ url: string; alt?: string; is_primary?: boolean }>;
  category_id: string | null;
  category?: Category | null;
  subcategory?: string | null;
  product_type?: string | null;
  gender?: string | null;
  material?: string | null;
  colour?: string | null;
  size?: string | null;
  weight_grams?: number | null;
  jewellery_type?: string | null;
  tags: string[];
  in_stock: boolean;
  stock_count: number;
  reserved_stock?: number;
  low_stock_threshold?: number;
  reorder_level?: number;
  inventory_status?: InventoryStatus;
  available_stock?: number;
  last_restocked_at?: string | null;
  last_sold_at?: string | null;
  rating: number;
  review_count: number;
  is_trending: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  is_featured?: boolean;
  is_active?: boolean;
  archived_at?: string | null;
  return_eligible?: boolean;
  cod_eligible?: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  search_keywords?: string[];
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
  sku: string | null;
  product_snapshot: Record<string, unknown>;
  unit_price: number;
  quantity: number;
  discount: number;
  discount_amount: number;
  tax: number;
  line_total: number;
  created_at: string;
}

export interface OrderAddress {
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface Order {
  id: string;
  order_number: string | null;
  checkout_reference?: string | null;
  user_id: string | null;
  customer_email: string | null;
  customer_phone: string;
  customer_name: string;
  address_id: string | null;
  shipping_address: OrderAddress;
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
  fulfilment_status?: string;
  gross_amount?: number | null;
  final_amount?: number | null;
  billing_address?: OrderAddress | null;
  customer_notes?: string | null;
  internal_notes?: string | null;
  shipment_tracking_number?: string | null;
  shipment_carrier?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  is_test?: boolean;
  is_archived?: boolean;
  data_classification?: 'test' | 'genuine' | 'cancelled' | 'archived';
  stock_reserved_until?: string | null;
  inventory_committed_at?: string | null;
  finalised_at?: string | null;
  reservation_released_at?: string | null;
  payment_failure_reason?: string | null;
  manual_payment_reference: string | null;
  manual_payment_sender_name: string | null;
  manual_payment_note: string | null;
  manual_payment_verified_at: string | null;
  manual_payment_verified_by: string | null;
  manual_payment_rejected_reason: string | null;
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
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  name?: string | null;
  description: string | null;
  type: CouponType;
  value: number;
  min_order: number;
  max_discount: number | null;
  maximum_discount?: number | null;
  minimum_order_value?: number | null;
  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number;
  usage_limit_per_customer?: number | null;
  applicable_product_ids?: string[];
  applicable_category_ids?: string[];
  new_customers_only?: boolean;
  allow_stacking?: boolean;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminProfile {
  user_id: string;
  role: AdminRole;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: string;
  order_id: string;
  customer_id: string | null;
  provider: string;
  gateway: string;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  amount_paise: number;
  currency: 'INR' | string;
  method: string | null;
  status: PaymentStatus;
  captured: boolean;
  captured_at: string | null;
  refund_amount_paise: number;
  failure_code: string | null;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RefundRecord {
  id: string;
  order_id: string;
  payment_id: string | null;
  requested_amount_paise: number;
  approved_amount_paise: number | null;
  reason: string;
  notes: string | null;
  status: RefundStatus;
  gateway_refund_id: string | null;
  requested_by: string | null;
  approved_by: string | null;
  created_at: string;
  approved_at: string | null;
  processed_at: string | null;
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
