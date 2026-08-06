import 'server-only';

import { businessInfo, isPublishableSupportEmail, isValidIndianGstin } from '@/lib/business-info';
import { serverEnv } from '@/lib/env.server';

export type PublishedBusinessInfo = typeof businessInfo & {
  supportEmail: string | null;
  gstin: string | null;
  grievance: {
    name: string;
    email: string;
    contactMethod: string;
    responseExpectation: string;
  } | null;
  operations: {
    dispatchEstimate: string | null;
    deliveryEstimate: string | null;
    remoteAreaEstimate: string | null;
    refundInitiationEstimate: string | null;
  };
};

export function getPublishedBusinessInfo(): PublishedBusinessInfo {
  const supportEmail = isPublishableSupportEmail(serverEnv.SUPPORT_EMAIL)
    ? serverEnv.SUPPORT_EMAIL ?? null
    : null;
  const gstin = isValidIndianGstin(serverEnv.GSTIN) ? serverEnv.GSTIN ?? null : null;
  const grievance =
    serverEnv.GRIEVANCE_OFFICER_NAME &&
    serverEnv.GRIEVANCE_EMAIL &&
    serverEnv.GRIEVANCE_CONTACT_METHOD &&
    serverEnv.GRIEVANCE_RESPONSE_EXPECTATION
      ? {
          name: serverEnv.GRIEVANCE_OFFICER_NAME,
          email: serverEnv.GRIEVANCE_EMAIL,
          contactMethod: serverEnv.GRIEVANCE_CONTACT_METHOD,
          responseExpectation: serverEnv.GRIEVANCE_RESPONSE_EXPECTATION,
        }
      : null;

  return {
    ...businessInfo,
    supportEmail,
    gstin,
    grievance,
    operations: {
      dispatchEstimate: serverEnv.SHIPPING_DISPATCH_ESTIMATE ?? null,
      deliveryEstimate: serverEnv.SHIPPING_DELIVERY_ESTIMATE ?? null,
      remoteAreaEstimate: serverEnv.SHIPPING_REMOTE_AREA_ESTIMATE ?? null,
      refundInitiationEstimate: serverEnv.REFUND_INITIATION_ESTIMATE ?? null,
    },
  };
}
