# NimbusPost Shipping Integration

## Current Status

NimbusPost live provider calls are intentionally disabled.

The only official public source found during implementation was NimbusPost's
channel integration guidance, which says API user credentials are generated from
the NimbusPost seller panel under Settings > API:
https://nimbuspost.com/channel-integrations/

No endpoint-level official API reference was available in this workspace or
public official pages.

Until GRIDAAN obtains the official current API documentation from the NimbusPost
seller panel, generated API credential package, or NimbusPost support, the code
must not implement endpoint paths, HTTP methods, authorization headers, webhook
signatures, payload schemas, status strings, label fields, or cancellation
methods.

## Architecture

Payment and shipping are separate state machines.

Checkout continues to use Razorpay only. A checkout creates a pending payment
order, reserves inventory, creates a Razorpay order, and finalizes the Gridaan
order only after verified captured payment. Shipping records are created only
after that captured order exists.

Shipping uses:

- `shipments`: outbound shipment records, package measurements, provider IDs,
  AWB, label/tracking references, carrier cost, customer shipping amount, and
  lifecycle timestamps.
- `shipment_events`: idempotent provider tracking/webhook events with raw
  provider status stored separately from canonical status.
- `begin_outbound_shipment_creation`: a service-role RPC that locks the order
  and prevents duplicate active outbound shipments before provider booking.

## Merchant Checklist

Verify these in NimbusPost before enabling live work:

- Account exists.
- KYC is completed.
- Shipping services are active.
- API access is enabled.
- API credentials have been generated.
- Shipping wallet has sufficient balance.
- Pickup location is configured and accurate.
- Pickup contact number and PIN code are correct.
- Prepaid shipping is enabled.
- Desired courier partners are active.
- Label format is configured where applicable.
- NimbusPost notifications are intentionally configured.
- NDR settings are configured where applicable.

## Environment

Current variable:

- `NIMBUSPOST_ENABLED`

Do not add `NEXT_PUBLIC_NIMBUSPOST_*`.

Future credential variable names must match the official NimbusPost
authentication contract. Do not invent names or store credentials in the
database.

## Admin Workflow

1. Customer pays through Razorpay.
2. Razorpay capture is verified server-side.
3. Order becomes a paid Gridaan order.
4. Admin opens the shipping queue.
5. Admin enters real package weight and dimensions.
6. Serviceability and prepaid courier rates are checked only after the official
   NimbusPost API contract is implemented.
7. Cheapest eligible prepaid courier is recommended.
8. Admin confirms before any wallet-affecting booking.
9. AWB, label, pickup, and tracking are stored from validated provider
   responses.

## Duplicate Prevention

The database prevents multiple simultaneous active outbound shipments for one
order. The RPC locks the order row, validates captured Razorpay payment, checks
for an active shipment, and returns the existing shipment for the same local
idempotency key.

Shipment creation must not be blindly retried after timeouts. Once the official
API supports provider lookup/reconciliation, uncertain booking states should be
resolved before another AWB is requested.

## Status Rules

Canonical shipment statuses are internal. Raw NimbusPost status text is stored
separately and must be mapped only from official documented values.

Shipping events must never:

- Change Razorpay payment status.
- Trigger automatic refunds.
- Restore inventory on RTO initiation.
- Treat NDR as cancellation.
- Treat shipment cancellation as payment refund.

## Customer UX

Payment success copy says the paid order is being prepared for shipment. It does
not imply courier booking or AWB assignment.

Customer serviceability checks return `temporarily_unable_to_check` while
NimbusPost is disabled or not configured. A timeout or missing provider contract
must never be shown as a definitely unserviceable PIN.

## Rollout

1. Deploy code with `NIMBUSPOST_ENABLED=false`.
2. Review and apply the additive database migration.
3. Obtain official NimbusPost API documentation and generated API credentials.
4. Implement provider auth, schemas, status mapping, serviceability, rates,
   booking, labels, pickup, tracking, cancellation, and webhook/reconciliation
   using only that documentation.
5. Configure verified server-only credentials in Vercel Production and Preview.
6. Verify pickup location, prepaid couriers, notifications, and wallet funding.
7. Enable for admin-only controlled testing.
8. Use one paid test order to a known address.
9. Confirm one AWB, one wallet charge, correct label, pickup, and tracking.
10. Expand to normal operations only after the controlled shipment succeeds.

## Rollback

Set `NIMBUSPOST_ENABLED=false`.

This must stop all new NimbusPost wallet-affecting operations without breaking
checkout, Razorpay payments, admin order viewing, or historical shipment
visibility. Never delete shipment history during rollback.
