import { db } from '../database/store.js';
// SMSA adapter. Uses the admin-configured shipping provider credentials when
// present (api_base_url + api_key/account/password from Admin > Shipping).
// Without credentials it honestly reports not_configured — production never
// fabricates tracking numbers.

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

export async function createSmsaShipment(request: SmsaShipmentRequest): Promise<SmsaShipmentResponse> {
  if (process.env.SMSA_MOCK === 'true' && process.env.NODE_ENV !== 'production') {
    const tracking_number = `DEV${Date.now()}`;
    return {
      success: true,
      tracking_number,
      tracking_url: db.buildTrackingUrl('smsa', tracking_number),
      shipment_id: `DEV-SHP-${Date.now()}`,
      estimated_delivery: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      shipping_cost: 25,
      status: 'development_mock'
    };
  }

  // Real shipment: requires admin-configured SMSA API credentials.
  const provider = db.getShippingProvider('smsa', true);
  const baseUrl = (provider?.api_base_url || process.env.SMSA_API_URL || '').replace(/\/$/, '');
  const apiKey = provider?.api_key || process.env.SMSA_API_KEY || '';

  if (!baseUrl || !apiKey) {
    return {
      success: false,
      tracking_number: '',
      tracking_url: '',
      shipment_id: '',
      estimated_delivery: '',
      shipping_cost: 0,
      status: 'not_configured',
      error_ar: 'لم يتم تهيئة بيانات سمسا (API URL + المفتاح) من لوحة الإدارة > الشحن',
      error_en: 'SMSA API credentials are not configured in Admin > Shipping'
    };
  }

  // Generic REST shipment creation against the merchant-configured endpoint.
  // The exact contract path/payload can be adjusted in Admin > Shipping via api_base_url.
  try {
    const res = await fetch(`${baseUrl}/shipments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Account': provider?.account || process.env.SMSA_ACCOUNT || ''
      },
      body: JSON.stringify({
        order_number: request.order_number,
        recipient: {
          name: request.recipient_name,
          phone: request.recipient_phone,
          address: request.recipient_address,
          city: request.recipient_city,
          district: request.recipient_district,
          postal_code: request.recipient_postal_code || ''
        },
        weight_grams: request.weight_grams,
        cod_amount: request.cod_amount || 0,
        description: request.description
      })
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || data?.error || `SMSA API error ${res.status}`);
    }
    const trackingNumber = String(
      data?.tracking_number || data?.trackingNumber || data?.awb || data?.awb_number || ''
    );
    if (!trackingNumber) {
      throw new Error('SMSA response did not include a tracking number');
    }
    return {
      success: true,
      tracking_number: trackingNumber,
      tracking_url: data?.tracking_url || data?.trackingUrl || db.buildTrackingUrl('smsa', trackingNumber),
      shipment_id: String(data?.shipment_id || data?.shipmentId || trackingNumber),
      estimated_delivery: String(data?.estimated_delivery || ''),
      shipping_cost: Number(data?.shipping_cost) || 0,
      status: 'created'
    };
  } catch (err: any) {
    console.error('[SMSA] shipment creation failed:', err?.message || err);
    return {
      success: false,
      tracking_number: '',
      tracking_url: '',
      shipment_id: '',
      estimated_delivery: '',
      shipping_cost: 0,
      status: 'error',
      error_ar: 'فشل إنشاء شحنة سمسا، تحقق من الإعدادات',
      error_en: err?.message || 'SMSA shipment creation failed'
    };
  }
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
