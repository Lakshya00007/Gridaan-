import type { Order } from '@/types';

export function buildAdminOrderMessage(order: Order): string {
  const lines: string[] = [];
  lines.push(`*New Order* - ${order.order_number}`);
  lines.push('');
  lines.push(`*Customer:* ${order.customer_name}`);
  lines.push(`*Phone:* ${order.customer_phone}`);
  if (order.customer_email) lines.push(`*Email:* ${order.customer_email}`);
  lines.push('');
  lines.push('*Items:*');
  for (const item of order.items ?? []) {
    lines.push(
      `• ${item.product_name} x${item.quantity} - Rs. ${item.line_total.toLocaleString('en-IN')}`
    );
  }
  lines.push('');
  lines.push(`*Subtotal:* Rs. ${order.subtotal.toLocaleString('en-IN')}`);
  if (order.discount > 0) lines.push(`*Discount:* -Rs. ${order.discount.toLocaleString('en-IN')}`);
  if (order.shipping > 0) lines.push(`*Shipping:* Rs. ${order.shipping.toLocaleString('en-IN')}`);
  lines.push(`*Total:* Rs. ${order.total.toLocaleString('en-IN')}`);
  lines.push('');
  lines.push(`*Payment:* ${order.payment_method.toUpperCase()} - ${order.payment_status}`);
  if (order.coupon_code) lines.push(`*Coupon:* ${order.coupon_code}`);
  if (order.notes) lines.push(`*Notes:* ${order.notes}`);
  return lines.join('\n');
}

export function buildAdminOrderLink(order: Order, adminPhone: string): string {
  return `https://wa.me/${adminPhone}?text=${encodeURIComponent(buildAdminOrderMessage(order))}`;
}

export function buildCustomerOrderMessage(order: Order): string {
  const lines: string[] = [];
  lines.push(`Hi ${order.customer_name.split(' ')[0]},`);
  lines.push('');
  lines.push(`Thank you for your order at *Gridaan*!`);
  lines.push('');
  lines.push(`*Order:* ${order.order_number}`);
  lines.push(`*Total:* Rs. ${order.total.toLocaleString('en-IN')}`);
  lines.push(`*Payment:* ${order.payment_method.toUpperCase()} (${order.payment_status})`);
  lines.push('');
  lines.push("We'll notify you when your order ships. For any questions, reply to this message.");
  return lines.join('\n');
}

export function buildCustomerOrderLink(order: Order): string {
  const phone = order.customer_phone.replace(/\D/g, '').slice(-10);
  const intl = phone.length === 10 ? `91${phone}` : phone;
  return `https://wa.me/${intl}?text=${encodeURIComponent(buildCustomerOrderMessage(order))}`;
}

export function buildStatusUpdateMessage(order: Order, status: string): string {
  return [
    `Hi ${order.customer_name.split(' ')[0]},`,
    '',
    `Your order *${order.order_number}* status has been updated to: *${status}*.`,
    '',
    'Thank you for shopping with Gridaan.',
  ].join('\n');
}

export function buildStatusUpdateLink(order: Order, status: string): string {
  const phone = order.customer_phone.replace(/\D/g, '').slice(-10);
  const intl = phone.length === 10 ? `91${phone}` : phone;
  return `https://wa.me/${intl}?text=${encodeURIComponent(
    buildStatusUpdateMessage(order, status)
  )}`;
}
