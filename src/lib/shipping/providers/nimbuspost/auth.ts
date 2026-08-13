import { ShippingError } from '../../errors';
import { getNimbusPostReadiness } from '../../config';

export function assertNimbusPostOfficialContractAvailable(): never {
  const readiness = getNimbusPostReadiness();
  throw new ShippingError({
    code: readiness.enabled ? 'provider_contract_missing' : 'shipping_disabled',
    message: readiness.enabled
      ? 'NimbusPost official API contract is required before authentication can be implemented.'
      : 'NimbusPost live shipping is disabled.',
    status: readiness.enabled ? 503 : 409,
    safeDetails: { missing: readiness.missing },
  });
}
