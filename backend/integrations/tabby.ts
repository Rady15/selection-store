import { db } from '../database/store.js';
// Tabby (Buy Now Pay Later) integration.
// Docs: https://docs.tabby.ai
// - Create checkout session: POST {base}/api/v2/checkout  (Bearer <secret key>)
// - Retrieve payment:       GET  {base}/api/v1/payments/{paymentId}
// - Capture payment:        POST {base}/api/v1/payments/{paymentId}/captures { amount }
// Test mode is determined by the secret key prefix (sk_test_* vs sk_live_*).
// All URLs/paths are overridable from Admin > Payment Gateways > additional_settings.

const DEFAULT_BASE = 'https://api.tabby.ai';

export interface TabbyConfig {
  secretKey: string;
  merchantCode: string;
  baseUrl: string;
}

export function getTabbyConfig(): TabbyConfig | null {
  const gateway = db.getPaymentGateway('tabby', true);
  const secretKey = (gateway?.secret_key || process.env.TABBY_SECRET_KEY || '').trim();
  const merchantCode = String(gateway?.additional_settings?.merchant_code || process.env.TABBY_MERCHANT_CODE || '').trim();
  if (!secretKey || !merchantCode) return null;
  if (gateway && !gateway.enabled) return null;
  const baseUrl = String(gateway?.additional_settings?.api_base_url || DEFAULT_BASE).replace(/\/$/, '');
  return { secretKey, merchantCode, baseUrl };
}

function tabbyError(res: any, data: any, fallback: string): Error {
  const msg = data?.error?.message || data?.message || data?.error || fallback;
  const err: any = new Error(typeof msg === 'string' ? msg : fallback);
  err.status = res.status;
  return err;
}

export interface TabbySession {
  session_id: string;
  redirect_url: string;
  raw: any;
}

/** Creates a Tabby checkout session from a trusted order. Returns where to redirect the customer. */
export async function createTabbySession(order: any, appUrl: string): Promise<TabbySession> {
  const cfg = getTabbyConfig();
  if (!cfg) throw new Error('Tabby is not configured (secret key + merchant code required)');

  const currency = 'SAR';
  const amount = Number(order.total_amount).toFixed(2);
  const address = order.shipping_address || {};

  const payload = {
    merchant_code: cfg.merchantCode,
    lang: 'ar',
    payment: {
      amount,
      currency,
      buyer: {
        name: order.customer_name || 'Customer',
        email: order.email || '',
        phone: order.phone || ''
      },
      buyer_history: {
        registered_since: order.created_at || new Date().toISOString(),
        loyalty_level: 0
      },
      shipping_address: {
        city: address.city || '',
        address: [address.street, address.district, address.building].filter(Boolean).join(', ') || '',
        zip: address.postal_code || ''
      },
      order: {
        reference_id: `SEL-${Date.now()}`,
        items: (order.items || []).map((it: any) => ({
          title: it.product_name_en || it.product_name_ar || 'Item',
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price).toFixed(2),
          category: 'coffee',
          product_url: `${appUrl}/products`
        }))
      }
    },
    merchant_urls: {
      success: `${appUrl}/checkout?gateway=tabby&result=success`,
      cancel: `${appUrl}/checkout?gateway=tabby&result=cancel`,
      failure: `${appUrl}/checkout?gateway=tabby&result=failure`
    }
  };

  const res = await fetch(`${cfg.baseUrl}/api/v2/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.secretKey}`
    },
    body: JSON.stringify(payload)
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw tabbyError(res, data, 'Tabby checkout creation failed');

  const sessionId = String(data?.id || data?.payment?.id || '');
  const redirectUrl = String(
    data?.payment_url || data?.redirect_url || data?.checkout_url || data?.url ||
    data?.payment?.payment_url || data?.configuration?.redirect_url || ''
  );
  if (!sessionId || !redirectUrl) {
    throw new Error('Tabby response did not include a checkout session');
  }
  return { session_id: sessionId, redirect_url: redirectUrl, raw: data };
}

export interface TabbyVerification {
  ok: boolean;
  status: string;
  amount?: number;
}

/** Authoritative server-side check: fetches the payment from Tabby and captures it. */
export async function verifyAndCaptureTabby(sessionId: string, expectedTotal: number): Promise<TabbyVerification> {
  const cfg = getTabbyConfig();
  if (!cfg) throw new Error('Tabby is not configured');

  const res = await fetch(`${cfg.baseUrl}/api/v1/payments/${encodeURIComponent(sessionId)}`, {
    headers: { 'Authorization': `Bearer ${cfg.secretKey}` }
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw tabbyError(res, data, 'Could not verify Tabby payment');

  const status = String(data?.status || '').toUpperCase();
  const paidAmount = Number(data?.amount ?? data?.captured_amount ?? NaN);
  if (!['AUTHORIZED', 'CAPTURED', 'CLOSED'].includes(status)) {
    return { ok: false, status };
  }
  if (Number.isFinite(paidAmount) && Math.abs(paidAmount - expectedTotal) > 0.05) {
    throw new Error('Tabby payment amount does not match the order');
  }

  if (status === 'AUTHORIZED') {
    const capRes = await fetch(`${cfg.baseUrl}/api/v1/payments/${encodeURIComponent(sessionId)}/captures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.secretKey}`
      },
      body: JSON.stringify({ amount: Number(expectedTotal).toFixed(2) })
    });
    const capData: any = await capRes.json().catch(() => ({}));
    if (!capRes.ok) throw tabbyError(capRes, capData, 'Tabby capture failed');
  }

  return { ok: true, status: 'CAPTURED', amount: Number.isFinite(paidAmount) ? paidAmount : expectedTotal };
}
