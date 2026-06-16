import 'server-only';

import { serverEnv } from './env.server';
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
  if (!serverEnv.WHATSAPP_ADMIN_NUMBER) {
    warnMissingWhatsAppConfig('WHATSAPP_ADMIN_NUMBER is not configured. Admin WhatsApp links are disabled.');
    return '';
  }
  return buildAdminOrderLinkWithPhone(order, serverEnv.WHATSAPP_ADMIN_NUMBER);
}

export function getAdminWhatsAppNumber(): string | null {
  if (!serverEnv.WHATSAPP_ADMIN_NUMBER) {
    warnMissingWhatsAppConfig('WHATSAPP_ADMIN_NUMBER is not configured. Admin WhatsApp links are disabled.');
    return null;
  }
  return serverEnv.WHATSAPP_ADMIN_NUMBER;
}

export function buildStorefrontWhatsAppLink(): string | null {
  if (!serverEnv.WHATSAPP_ADMIN_NUMBER) {
    warnMissingWhatsAppConfig('WHATSAPP_ADMIN_NUMBER is not configured. Storefront WhatsApp button is disabled.');
    return null;
  }
  const message = encodeURIComponent('Hi! I want to know more about your jewelry collection.');
  return `https://wa.me/${serverEnv.WHATSAPP_ADMIN_NUMBER}?text=${message}`;
}

/**
 * Optional: send via WhatsApp Cloud API. Requires WHATSAPP_API_TOKEN
 * and `WHATSAPP_PHONE_NUMBER_ID` env. The default storefront uses
 * deep-links; this exists for automation.
 */
export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  if (!serverEnv.WHATSAPP_ADMIN_NUMBER) {
    warnMissingWhatsAppConfig('WHATSAPP_ADMIN_NUMBER is not configured. Skipping WhatsApp send.');
    return false;
  }
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
