import 'server-only';

import { serverEnv } from '@/lib/env.server';

export type NimbusPostReadiness = {
  provider: 'nimbuspost';
  enabled: boolean;
  configured: boolean;
  canCheckServiceability: boolean;
  canFetchRates: boolean;
  canCreateLiveShipments: boolean;
  canFetchLabels: boolean;
  canSyncTracking: boolean;
  missing: string[];
};

export function getNimbusPostReadiness(): NimbusPostReadiness {
  return {
    provider: 'nimbuspost',
    enabled: serverEnv.NIMBUSPOST_ENABLED,
    configured: false,
    canCheckServiceability: false,
    canFetchRates: false,
    canCreateLiveShipments: false,
    canFetchLabels: false,
    canSyncTracking: false,
    missing: [
      'Official NimbusPost endpoint-level API documentation from seller panel or generated API credentials',
      'Official NimbusPost authentication contract',
      'Verified NimbusPost pickup location and prepaid courier configuration',
    ],
  };
}
