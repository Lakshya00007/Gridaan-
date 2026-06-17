import { publicEnv } from '@/lib/env.public';

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
};

export type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: 'INR';
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayCheckoutResponse) => void | Promise<void>;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: { color: string };
  modal: { ondismiss: () => void };
};

export type RazorpayInstance = {
  open: () => void;
  on: (event: 'payment.failed', handler: () => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

export async function loadRzpScript(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (document.getElementById('razorpay-script')) return true;

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function getRazorpayKeyId(): string {
  return publicEnv.NEXT_PUBLIC_RAZORPAY_KEY_ID;
}
