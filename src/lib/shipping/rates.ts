import type { CourierQuote } from './types';

export function isEligiblePrepaidQuote(
  quote: CourierQuote,
  options: { excludedCourierIds?: string[] } = {}
) {
  const excluded = new Set((options.excludedCourierIds ?? []).map((id) => id.trim()).filter(Boolean));
  return (
    quote.paymentMode === 'prepaid' &&
    quote.serviceable === true &&
    quote.enabled === true &&
    Number.isFinite(quote.totalCharge) &&
    quote.totalCharge >= 0 &&
    !excluded.has(quote.courierId)
  );
}

export function chooseCheapestEligibleCourier(
  quotes: CourierQuote[],
  options: { excludedCourierIds?: string[] } = {}
) {
  return quotes
    .filter((quote) => isEligiblePrepaidQuote(quote, options))
    .sort((left, right) => {
      if (left.totalCharge !== right.totalCharge) return left.totalCharge - right.totalCharge;
      const nameCompare = left.courierName.localeCompare(right.courierName);
      if (nameCompare !== 0) return nameCompare;
      return left.courierId.localeCompare(right.courierId);
    })[0] ?? null;
}
