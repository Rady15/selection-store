import { db } from '../database/store.js';
// Tamara (Buy Now Pay Later) integration.
// - Create checkout: POST {base}/checkout  (Authorization: Bearer <API token>)
// - Retrieve order:  GET  {base}/orders/{orderId}
// Sandbox: https://api-sandbox.tamara.co · Production: https://api.tamara.co
// Base URL is overridable from Admin > Payment Gateways > additional_settings.

const SANDBOX_BASE = 'https://api-sandbox.tamara.co';
const LIVE_BASE = 'https://api.tamara.co';

export interface TamaraConfig {
  apiToken: string;
  baseUrl: string;
  mode: 'test' | 'live';
}

export function getTamaraConfig(): TamaraConfig | null {
  const gateway = db.getPaymentGateway('tamara', true);
  const apiToken = (gateway?.secret_key || process.env.TAMARA_API_TOKEN || '').trim();
  if (!apiToken) return null;
  if (gateway && !gateway.enabled) return null;
  const mode = (gateway?.mode === 'live' ? 'live' : 'test') as 'test' | 'live';
  const baseUrl = String(
    gateway?.additional_settings?.api_base_url || (mode === 'live' ? LIVE_BASE : SANDBOX_BASE)
  ).replace(/\/$/, '');
  return { apiToken, baseUrl, mode };
}

function tamaraError(res: any, data: any, fallback: string): Error {
  const msg = data?.message || data?.error || data?.errors?.[0]?.message || fallback;
  const err: any = new Error(typeof msg === 'string' ? msg : fallback);
  err.status = res.status;
  return err;
}

export interface TamaraSession {
  order_id: string;
  redirect_url: string;
  raw: any;
}

/** Creates a Tamara checkout session from a trusted order. Returns where to redirect the customer. */
export async function createTamaraSession(order: any, appUrl: string): Promise<TamaraSession> {
  const cfg = getTamaraConfig();
  if (!cfg) throw new Error('Tamara is not configured (API token required)');

  const address = order.shipping_address || {};
  const total = Number(Number(order.total_amount).toFixed(2));
  const nameParts = String(order.customer_name || 'Customer').split(' ');
  const firstName = nameParts[0] || 'Customer';
  const lastName = nameParts.slice(1).join(' ') || 'Customer';

  const payload = {
    order_reference_id: `SEL-${Date.now()}`,
    locale: 'ar_SA',
    total_amount: { amount: total, currency: 'SAR' },
    description: `Selection Coffee order`,
    country_code: 'SA',
    payment_type: { name: 'PAY_BY_INSTALMENTS' },
    items: (order.items || []).map((it: any) => ({
      name: it.product_name_en || it.product_name_ar || 'Item',
      sku: it.sku || it.product_id || 'item',
      quantity: Number(it.quantity) || 1,
      unit_price: { amount: Number(Number(it.unit_price).toFixed(2)), currency: 'SAR' },
      type: 'physical',
      reference_id: String(it.product_id || 'item')
    })),
    consumer: {
      first_name: firstName,
      last_name: lastName,
      phone_number: order.phone || '',
      email: order.email || ''
    },
    billing_address: {
      first_name: firstName,
      last_name: lastName,
      line1: address.street || '',
      city: address.city || '',
      country_code: 'SA',
      phone_number: order.phone || ''
    },
    shipping_address: {
      first_name: firstName,
      last_name: lastName,
      line1: address.street || '',
      city: address.city || '',
      country_code: 'SA',
      phone_number: order.phone || ''
    },
    merchant_url: {
      success: `${appUrl}/checkout?gateway=tamara&result=success`,
      failure: `${appUrl}/checkout?gateway=tamara&result=failure`,
      cancel: `${appUrl}/checkout?gateway=tamara&result=cancel`,
      notification: `${appUrl}/api/payments/tamara/webhook`
    }
  };

  const res = await fetch(`${cfg.baseUrl}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.apiToken}`
    },
    body: JSON.stringify(payload)
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 201) throw tamaraError(res, data, 'Tamara checkout creation failed');

  const orderId = String(data?.order_id || data?.orderId || '');
  const redirectUrl = String(data?.checkout_url || data?.checkoutUrl || data?.redirect_url || data?.url || '');
  if (!orderId || !redirectUrl) {
    throw new Error('Tamara response did not include a checkout session');
  }
  return { order_id: orderId, redirect_url: redirectUrl, raw: data };
}

export interface TamaraVerification {
  ok: boolean;
  status: string;
}

/** Authoritative server-side check: fetches the Tamara order and confirms it is approved/captured. */
export async function verifyTamaraOrder(orderId: string, expectedTotal: number): Promise<TamaraVerification> {
  const cfg = getTamaraConfig();
  if (!cfg) throw new Error('Tamara is not configured');

  const res = await fetch(`${cfg.baseUrl}/orders/${encodeURIComponent(orderId)}`, {
    headers: { 'Authorization': `Bearer ${cfg.apiToken}` }
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw tamaraError(res, data, 'Could not verify Tamara order');

  const status = String(data?.status || data?.order_status || '').toLowerCase();
  const paidTotal = Number(data?.total_amount?.amount ?? data?.total ?? NaN);
  if (!['approved', 'captured', 'authorised', 'authorized', 'canceled_reversed'].includes(status)) {
    return { ok: false, status };
  }
  if (Number.isFinite(paidTotal) && Math.abs(paidTotal - expectedTotal) > 0.05) {
    throw new Error('Tamara order amount does not match');
  }
  return { ok: true, status };
}
