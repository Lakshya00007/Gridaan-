export type ApprovedReviewRating = {
  product_id: string;
  rating: number;
};

export type ReviewSummary = {
  rating: number;
  review_count: number;
};

export function calculateApprovedReviewSummaries(
  productIds: string[],
  reviews: ApprovedReviewRating[],
) {
  const totals = new Map<string, { total: number; count: number }>();
  const allowedProductIds = new Set(productIds);

  for (const review of reviews) {
    const rating = Number(review.rating);
    if (!allowedProductIds.has(review.product_id) || !Number.isFinite(rating) || rating < 1 || rating > 5) {
      continue;
    }

    const current = totals.get(review.product_id) ?? { total: 0, count: 0 };
    current.total += rating;
    current.count += 1;
    totals.set(review.product_id, current);
  }

  return new Map<string, ReviewSummary>(
    productIds.map((productId) => {
      const total = totals.get(productId);
      return [
        productId,
        total
          ? { rating: Number((total.total / total.count).toFixed(1)), review_count: total.count }
          : { rating: 0, review_count: 0 },
      ];
    }),
  );
}
