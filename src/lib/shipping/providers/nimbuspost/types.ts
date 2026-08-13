import type {
  CourierQuote,
  DestinationAddress,
  PackageDetails,
  ServiceabilityResult,
  ShipmentCreationDraft,
  ShipmentRecord,
} from '../../types';

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
  courierId: string;
};

export type NimbusPostTrackingInput = {
  shipment: ShipmentRecord;
};

export type NimbusPostProvider = {
  name: 'nimbuspost';
  capabilities: NimbusPostProviderCapabilities;
  checkServiceability(input: NimbusPostServiceabilityInput): Promise<ServiceabilityResult>;
  getRates(input: NimbusPostRateInput): Promise<CourierQuote[]>;
  createShipment(input: NimbusPostCreateShipmentInput): Promise<ShipmentRecord>;
  getLabel(input: NimbusPostTrackingInput): Promise<{ url: string | null; reference: string | null }>;
  syncTracking(input: NimbusPostTrackingInput): Promise<ShipmentRecord>;
  cancelShipment(input: NimbusPostTrackingInput & { reason?: string }): Promise<ShipmentRecord>;
};
