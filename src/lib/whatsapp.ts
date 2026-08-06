import 'server-only';

import { serverEnv } from './env.server';
import { buildBusinessWhatsAppHref, businessInfo } from './business-info';
import {
  buildAdminOrderMessage,
  buildAdminOrderLink as buildAdminOrderLinkWithPhone,
  buildCustomerOrderLink,
  buildCustomerOrderMessage,
  buildStatusUpdateLink,
  buildStatusUpdateMessage,
} from './whatsapp-links';
import type { Order } from '@/types';

let hasWarnedAboutMissingWhatsAppConfig = false;

function warnMissingWhatsAppConfig(reason: string) {
  if (hasWarnedAboutMissingWhatsAppConfig) return;
  hasWarnedAboutMissingWhatsAppConfig = true;
  console.warn(`[whatsapp] ${reason}`);
}

export function buildAdminOrderLink(order: Order): string {
  return buildAdminOrderLinkWithPhone(order, businessInfo.whatsappNumber);
}

export function getAdminWhatsAppNumber(): string | null {
  return businessInfo.whatsappNumber;
}

export function buildStorefrontWhatsAppLink(): string | null {
  return buildBusinessWhatsAppHref(
    'Hi! I want to know more about your fashion jewellery collection.'
  );
}

/**
 * Optional: send via WhatsApp Cloud API. Requires WHATSAPP_API_TOKEN
 * and `WHATSAPP_PHONE_NUMBER_ID` env. The default storefront uses
 * deep-links; this exists for automation.
 */
export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  if (!serverEnv.WHATSAPP_API_TOKEN) {
    warnMissingWhatsAppConfig('WHATSAPP_API_TOKEN is not configured. Skipping WhatsApp send.');
    return false;
  }
  const phoneNumberId = serverEnv.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneNumberId) {
    warnMissingWhatsAppConfig('WHATSAPP_PHONE_NUMBER_ID is not configured. Skipping WhatsApp send.');
    return false;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serverEnv.WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body },
        }),
      }
    );

    return res.ok;
  } catch {
    return false;
  }
}

export {
  buildAdminOrderMessage,
  buildCustomerOrderLink,
  buildCustomerOrderMessage,
  buildStatusUpdateLink,
  buildStatusUpdateMessage,
};
