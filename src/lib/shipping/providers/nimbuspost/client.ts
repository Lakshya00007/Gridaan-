import 'server-only';

import { assertNimbusPostOfficialContractAvailable } from './auth';
import type {
  NimbusPostCreateShipmentInput,
  NimbusPostProvider,
  NimbusPostRateInput,
  NimbusPostServiceabilityInput,
  NimbusPostTrackingInput,
} from './types';

export class NimbusPostClient implements NimbusPostProvider {
  name = 'nimbuspost' as const;

  capabilities = {
    serviceability: false,
    rates: false,
    createShipment: false,
    label: false,
    pickup: false,
    tracking: false,
    cancellation: false,
    ndr: false,
    reverse: false as const,
  };

  async checkServiceability(_input: NimbusPostServiceabilityInput) {
    return assertNimbusPostOfficialContractAvailable();
  }

  async getRates(_input: NimbusPostRateInput) {
    return assertNimbusPostOfficialContractAvailable();
  }

  async createShipment(_input: NimbusPostCreateShipmentInput) {
    return assertNimbusPostOfficialContractAvailable();
  }

  async getLabel(_input: NimbusPostTrackingInput) {
    return assertNimbusPostOfficialContractAvailable();
  }

  async syncTracking(_input: NimbusPostTrackingInput) {
    return assertNimbusPostOfficialContractAvailable();
  }

  async cancelShipment(_input: NimbusPostTrackingInput & { reason?: string }) {
    return assertNimbusPostOfficialContractAvailable();
  }
}

export function createNimbusPostClient() {
  return new NimbusPostClient();
}
