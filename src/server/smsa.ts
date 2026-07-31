// SMSA Express Shipping Service (Mock - replace with real API)
// Docs: https://developer.smsaexpress.com/

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
  cod_amount?: number; // Cash on delivery amount
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

function generateTrackingNumber(): string {
  const digits = Math.floor(100000000000 + Math.random() * 900000000000);
  return `SMSA${digits}`;
}

function getEstimatedDelivery(): string {
  const now = new Date();
  const days = 2 + Math.floor(Math.random() * 3); // 2-4 days
  now.setDate(now.getDate() + days);
  while (now.getDay() === 0 || now.getDay() === 6) {
    now.setDate(now.getDate() + 1);
  }
  return now.toISOString().split('T')[0];
}

export function createSmsaShipment(request: SmsaShipmentRequest): SmsaShipmentResponse {
  const tracking_number = generateTrackingNumber();
  const estimated_delivery = getEstimatedDelivery();

  let shipping_cost = 25;
  if (request.weight_grams > 5000) shipping_cost = 35;
  if (request.weight_grams > 10000) shipping_cost = 45;

  if (request.cod_amount && request.cod_amount >= 199) {
    shipping_cost = 0;
  }

  return {
    success: true,
    tracking_number,
    tracking_url: `https://www.smsaexpress.com/tracking/${tracking_number}`,
    shipment_id: `SHP-${Date.now()}`,
    estimated_delivery,
    shipping_cost,
    status: 'manifested'
  };
}

export function trackSmsaShipment(tracking_number: string): SmsaTrackingResponse {
  const baseDate = new Date();
  baseDate.setHours(baseDate.getHours() - 12);

  return {
    tracking_number,
    status: 'in_transit',
    status_ar: 'في الطريق',
    status_en: 'In Transit',
    current_location: 'مركز سمسا - الرياض',
    events: [
      {
        timestamp: new Date(baseDate.getTime() - 3600000 * 24).toISOString(),
        status: 'picked_up',
        location: 'محل التحميص - حطين، الرياض',
        description_ar: 'تم استلام الشحنة من المُرسل',
        description_en: 'Shipment picked up from sender'
      },
      {
        timestamp: new Date(baseDate.getTime() - 3600000 * 18).toISOString(),
        status: 'at_hub',
        location: 'مركز سمسا الدوراني - الرياض',
        description_ar: 'وصلت الشحنة لمركز التوزيع',
        description_en: 'Shipment arrived at distribution center'
      },
      {
        timestamp: new Date(baseDate.getTime() - 3600000 * 6).toISOString(),
        status: 'in_transit',
        location: 'في الطريق للتوصيل',
        description_ar: 'الشحنة مع المُسلّم في طريقها إليك',
        description_en: 'Shipment with courier, out for delivery'
      }
    ]
  };
}

export function calculateSmsaShippingCost(
  weightGrams: number,
  totalAmount: number,
  freeShippingThreshold: number = 199
): number {
  if (totalAmount >= freeShippingThreshold) return 0;

  if (weightGrams <= 1000) return 25;
  if (weightGrams <= 5000) return 30;
  if (weightGrams <= 10000) return 40;
  return 50;
}
