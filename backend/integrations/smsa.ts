// SMSA adapter. Production never fabricates tracking numbers.
// Configure a real SMSA API adapter before enabling shipment creation.

export interface SmsaShipmentRequest {
  order_id: string;
  order_number: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city: string;
  recipient_district: string;
  recipient_postal_code?: string;
  weight_grams: number;
  cod_amount?: number;
  description: string;
}

export interface SmsaShipmentResponse {
  success: boolean;
  tracking_number: string;
  tracking_url: string;
  shipment_id: string;
  estimated_delivery: string;
  shipping_cost: number;
  status: string;
  error_ar?: string;
  error_en?: string;
}

export interface SmsaTrackingResponse {
  tracking_number: string;
  status: string;
  status_ar: string;
  status_en: string;
  current_location: string;
  events: Array<{
    timestamp: string;
    status: string;
    location: string;
    description_ar: string;
    description_en: string;
  }>;
}

export function createSmsaShipment(_request: SmsaShipmentRequest): SmsaShipmentResponse {
  if (process.env.SMSA_MOCK === 'true' && process.env.NODE_ENV !== 'production') {
    const tracking_number = `DEV${Date.now()}`;
    return {
      success: true,
      tracking_number,
      tracking_url: `https://www.smsaexpress.com/tracking/${tracking_number}`,
      shipment_id: `DEV-SHP-${Date.now()}`,
      estimated_delivery: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      shipping_cost: 25,
      status: 'development_mock'
    };
  }
  return {
    success: false,
    tracking_number: '',
    tracking_url: '',
    shipment_id: '',
    estimated_delivery: '',
    shipping_cost: 0,
    status: 'not_configured',
    error_ar: 'تكامل سمسا الحقيقي غير مهيأ على الخادم',
    error_en: 'SMSA live integration is not configured on this server'
  };
}

export function trackSmsaShipment(tracking_number: string): SmsaTrackingResponse {
  return {
    tracking_number,
    status: 'unknown',
    status_ar: 'غير متاح',
    status_en: 'Unavailable',
    current_location: '',
    events: []
  };
}

export function calculateSmsaShippingCost(
  weightGrams: number,
  totalAmount: number,
  freeShippingThreshold = 199
): number {
  if (totalAmount >= freeShippingThreshold) return 0;
  if (weightGrams <= 1000) return 25;
  if (weightGrams <= 5000) return 30;
  if (weightGrams <= 10000) return 40;
  return 50;
}
