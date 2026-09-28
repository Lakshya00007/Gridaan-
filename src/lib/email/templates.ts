import type { Order } from '@/types';
import type { ShipmentRecord } from '@/lib/shipping/types';

const colors = { ink: '#26221f', muted: '#756d67', gold: '#a67c52', border: '#e9e2dc' };

function businessDate(value: string) {
  return new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', timeZoneName: 'short' });
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function row(label: string, value: string) {
  return `<div style="border-bottom:1px solid ${colors.border};padding:11px 0"><div style="color:${colors.muted};font-size:12px;letter-spacing:1px;text-transform:uppercase">${escapeHtml(label)}</div><div style="margin:4px 0 0;font-size:15px">${value}</div></div>`;
}

function header() {
  return `<div style="text-align:center;padding-bottom:24px"><div style="color:${colors.gold};font-size:26px;letter-spacing:4px;font-weight:700">GRIDAAN</div><div style="color:${colors.muted};font-size:11px;letter-spacing:2px">ARTIFICIAL JEWELLERY</div></div>`;
}

function footer(supportEmail?: string) {
  const contact = supportEmail
    ? `<a href="mailto:${escapeHtml(supportEmail)}" style="color:${colors.gold}">${escapeHtml(supportEmail)}</a>`
    : 'Reply to this email and our team will help.';
  return `<div style="color:${colors.muted};font-size:12px;line-height:1.6;text-align:center;padding-top:22px">Need help? ${contact}<br>© ${new Date().getFullYear()} Gridaan. This is a transactional email about your order.</div>`;
}

function layout(content: string, supportEmail?: string) {
  return `<!doctype html><html><body style="margin:0;background-color:#faf8f6;color:${colors.ink};font-family:Arial,sans-serif"><div style="max-width:640px;margin:0 auto;padding:32px 20px">${header()}<div style="background:#fff;border:1px solid ${colors.border};padding:32px 28px">${content}</div>${footer(supportEmail)}</div></body></html>`;
}

function orderItems(order: Order) {
  return (order.items ?? [])
    .map(
      (item) =>
        `<div style="display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid ${colors.border};padding:12px 0;font-size:14px"><span>${escapeHtml(item.product_name)} × ${item.quantity}<br><small>₹${Number(item.unit_price).toFixed(2)} each</small></span><strong>₹${Number(item.line_total).toFixed(2)}</strong></div>`
    )
    .join('');
}

function address(order: Order) {
  const value = order.shipping_address;
  return `${escapeHtml(value.full_name)}<br>${escapeHtml(value.line1)}${value.line2 ? `<br>${escapeHtml(value.line2)}` : ''}<br>${escapeHtml(value.city)}, ${escapeHtml(value.state)} ${escapeHtml(value.pincode)}<br>${escapeHtml(value.country)}<br>${escapeHtml(value.phone)}`;
}

export function renderOrderEmail({
  kind,
  order,
  shipment,
  orderUrl,
  supportEmail,
}: {
  kind: 'confirmation' | 'shipped' | 'delivered' | 'cancelled';
  order: Order;
  shipment?: ShipmentRecord | null;
  orderUrl: string;
  supportEmail?: string;
}) {
  const number = order.order_number ?? order.checkout_reference ?? order.id.slice(0, 8);
  const titles = {
    confirmation: `Your Gridaan Order #${number} is Confirmed`,
    shipped: `Your Gridaan Order #${number} Has Shipped`,
    delivered: `Your Gridaan Order #${number} Has Been Delivered`,
    cancelled: `Your Gridaan Order #${number} Has Been Cancelled`,
  };
  const intros = {
    confirmation: 'Thank you for shopping with Gridaan. Your order has been successfully placed.',
    shipped: 'Good news — your Gridaan order is on its way.',
    delivered: 'Your Gridaan order has been delivered. We hope you enjoy your pieces.',
    cancelled: 'Your Gridaan order has been cancelled.',
  };
  const tracking = shipment?.awb
    ? `${escapeHtml(shipment.awb)}${shipment.tracking_url ? ` · <a href="${escapeHtml(shipment.tracking_url)}" style="color:${colors.gold}">Track shipment</a>` : ''}`
    : 'Tracking information will be available shortly.';
  const content = [
    `<h1 style="font-size:25px;font-weight:500;margin:0 0 12px">${escapeHtml(titles[kind])}</h1>`,
    `<p style="font-size:16px;line-height:1.6">Hi ${escapeHtml(order.customer_name || 'there')},<br>${intros[kind]}</p>`,
    row('Order number', escapeHtml(number)),
    row('Order date', escapeHtml(businessDate(order.created_at))),
    kind === 'delivered' && order.delivered_at ? row('Delivered date', escapeHtml(businessDate(order.delivered_at))) : '',
    kind === 'confirmation' ? row('Payment method', escapeHtml(order.payment_method)) + row('Payment status', escapeHtml(order.payment_status)) : '',
    kind === 'shipped' ? row('Courier', escapeHtml(shipment?.courier_name ?? 'Courier information will be available shortly.')) + row('Tracking', tracking) : '',
    kind !== 'cancelled' ? `<h2 style="font-size:16px;margin:26px 0 0">Items</h2>${orderItems(order)}${kind === 'confirmation' ? row('Subtotal', `₹${Number(order.subtotal).toFixed(2)}`) + (Number(order.discount) > 0 ? row('Discount', `-₹${Number(order.discount).toFixed(2)}`) : '') + row('Shipping', `₹${Number(order.shipping).toFixed(2)}`) : ''}${row('Total paid', `₹${Number(order.final_amount ?? order.total).toFixed(2)}`)}${kind !== 'delivered' ? `<h2 style="font-size:16px;margin:26px 0 0">Shipping address</h2><p style="line-height:1.6">${address(order)}</p>` : ''}` : '',
    kind === 'cancelled' && order.cancelled_at ? row('Cancellation date', escapeHtml(businessDate(order.cancelled_at))) : '',
    `<div style="margin-top:28px"><a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:${colors.ink};color:#fff;padding:13px 20px;text-decoration:none;font-size:14px">${kind === 'shipped' ? 'Track Your Order' : 'View Your Order'}</a></div>`,
  ].join('');
  return { subject: titles[kind], html: layout(content, supportEmail) };
}

export function renderAdminOrderEmail({ order, orderUrl }: { order: Order; orderUrl: string }) {
  const number = order.order_number ?? order.checkout_reference ?? order.id.slice(0, 8);
  const content = [
    '<h1 style="font-size:25px;font-weight:500">New Gridaan order</h1>',
    row('Order number', escapeHtml(number)),
    row('Customer', `${escapeHtml(order.customer_name)} · ${escapeHtml(order.customer_email ?? 'No email')} · ${escapeHtml(order.customer_phone)}`),
    row('Payment', `${escapeHtml(order.payment_method)} · ${escapeHtml(order.payment_status)}`),
    `<div style="margin:20px 0">${orderItems(order)}</div>`,
    row('Total', `₹${Number(order.final_amount ?? order.total).toFixed(2)}`),
    row('Ship to', `${escapeHtml(order.shipping_address.city)}, ${escapeHtml(order.shipping_address.state)}`),
    `<div style="margin-top:28px"><a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:${colors.ink};color:#fff;padding:13px 20px;text-decoration:none;font-size:14px">Open Order in Admin</a></div>`,
  ].join('');
  return { subject: `New Gridaan Order #${number}`, html: layout(content) };
}
