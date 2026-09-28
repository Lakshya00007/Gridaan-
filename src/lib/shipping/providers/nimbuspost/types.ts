import type {
  CourierQuote,
  DestinationAddress,
  PackageDetails,
  ServiceabilityResult,
  ShipmentCreationDraft,
  ShipmentRecord,
} from '../../types';
import type { Order } from '@/types';

export type NimbusPostProviderCapabilities = {
  serviceability: boolean;
  rates: boolean;
  createShipment: boolean;
  label: boolean;
  pickup: boolean;
  tracking: boolean;
  cancellation: boolean;
  ndr: boolean;
  reverse: false;
};

export type NimbusPostServiceabilityInput = {
  destination: DestinationAddress;
};

export type NimbusPostRateInput = {
  destination: DestinationAddress;
  packageDetails: PackageDetails;
  orderValue: number;
};

export type NimbusPostCreateShipmentInput = ShipmentCreationDraft & {
  order: Order;
  shipment: ShipmentRecord;
  courierId: string;
};

export type NimbusPostBookingResult = {
  providerShipmentId: string;
  providerOrderId: string;
  awb: string;
  courierId: string;
  courierName: string;
  rawStatus: string;
  labelUrl: string | null;
};

export type NimbusPostTrackingResult = {
  rawStatus: string;
  status: ShipmentRecord['status'] | null;
  history: Array<Record<string, unknown>>;
};

export type NimbusPostTrackingInput = {
  shipment: ShipmentRecord;
};

export type NimbusPostProvider = {
  name: 'nimbuspost';
  capabilities: NimbusPostProviderCapabilities;
  checkServiceability(input: NimbusPostServiceabilityInput): Promise<ServiceabilityResult>;
  getRates(input: NimbusPostRateInput): Promise<CourierQuote[]>;
  createShipment(input: NimbusPostCreateShipmentInput): Promise<NimbusPostBookingResult>;
  getLabel(input: NimbusPostTrackingInput): Promise<{ url: string | null; reference: string | null }>;
  syncTracking(input: NimbusPostTrackingInput): Promise<NimbusPostTrackingResult>;
  cancelShipment(input: NimbusPostTrackingInput & { reason?: string }): Promise<ShipmentRecord>;
};
