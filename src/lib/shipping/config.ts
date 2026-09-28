import 'server-only';

import { serverEnv } from '@/lib/env.server';
import { pickupSchema } from './providers/nimbuspost/schemas';

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
  const hasCredentials = Boolean(serverEnv.NIMBUSPOST_EMAIL && serverEnv.NIMBUSPOST_PASSWORD);
  let pickupValid = false;
  try {
    pickupValid = pickupSchema.safeParse(JSON.parse(serverEnv.NIMBUSPOST_PICKUP_JSON ?? '')).success;
  } catch {
    pickupValid = false;
  }
  const available = serverEnv.NIMBUSPOST_ENABLED && hasCredentials && pickupValid;
  const missing = [
    ...(!hasCredentials ? ['NimbusPost seller email and password'] : []),
    ...(!pickupValid ? ['Verified pickup address in NIMBUSPOST_PICKUP_JSON'] : []),
    ...(!serverEnv.NIMBUSPOST_ENABLED ? ['Enable NIMBUSPOST_ENABLED after account, wallet, and pickup verification'] : []),
  ];
  return {
    provider: 'nimbuspost',
    enabled: serverEnv.NIMBUSPOST_ENABLED,
    configured: hasCredentials && pickupValid,
    canCheckServiceability: available,
    canFetchRates: available,
    canCreateLiveShipments: available,
    canFetchLabels: available,
    canSyncTracking: available,
    missing,
  };
}
