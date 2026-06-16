/** Augments Product with a list filter type used in server queries. */
import type { Product } from '@/types';

export interface ProductFilter {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
  sort?:
    | 'price_asc'
    | 'price_desc'
    | 'newest'
    | 'rating'
    | 'trending'
    | 'featured';
  limit?: number;
  offset?: number;
}

export type { Product };
