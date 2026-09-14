import crypto from 'node:crypto';
import { db } from '../database/store.js';
// Paymob (Accept) integration using the Intention API.
// - Create intention: POST https://accept.paymob.com/v1/intention/  (Authorization: Token <SECRET_KEY>)
// - Pay: redirect customer to https://accept.paymob.com/unifiedcheckout/?publicKey=<PUBLIC_KEY>&clientSecret=<CLIENT_SECRET>
// - Verify: HMAC-SHA512 on the callback payload using the HMAC secret (no network needed).
// Required admin config (Admin > Payment Gateways > Paymob):
//   publishable_key = Public key, secret_key = Secret key,
//   additional_settings = { hmac_secret, integration_ids: [<card integration id>, ...] }

const INTENTION_URL = 'https://accept.paymob.com/v1/intention/';
const CHECKOUT_URL = 'https://accept.paymob.com/unifiedcheckout/';

export interface PaymobConfig {
  publicKey: string;
  secretKey: string;
  hmacSecret: string;
  integrationIds: number[];
}

export function getPaymobConfig(): PaymobConfig | null {
  const gateway = db.getPaymentGateway('paymob', true);
  const publicKey = (gateway?.publishable_key || process.env.PAYMOB_PUBLIC_KEY || '').trim();
  const secretKey = (gateway?.secret_key || process.env.PAYMOB_SECRET_KEY || '').trim();
  const extra = (gateway?.additional_settings || {}) as any;
  const hmacSecret = String(extra.hmac_secret || process.env.PAYMOB_HMAC_SECRET || '').trim();
  const integrationIds = (Array.isArray(extra.integration_ids) ? extra.integration_ids : [])
    .map((x: any) => Number(x))
    .filter((x: number) => Number.isFinite(x) && x > 0);
  if (!publicKey || !secretKey || !hmacSecret || integrationIds.length < 1) return null;
  if (gateway && !gateway.enabled) return null;
  return { publicKey, secretKey, hmacSecret, integrationIds };
}

function paymobError(res: any, data: any, fallback: string): Error {
  const msg = data?.detail || data?.message || data?.error || fallback;
  const err: any = new Error(typeof msg === 'string' ? msg : fallback);
  err.status = res.status;
  return err;
}

export interface PaymobIntention {
  client_secret: string;
  checkout_url: string;
  intention_id: string;
  raw: any;
}

/** Creates a Paymob payment intention from a trusted order. Returns the hosted checkout URL. */
export async function createPaymobIntention(order: any, appUrl: string): Promise<PaymobIntention> {
  const cfg = getPaymobConfig();
  if (!cfg) throw new Error('Paymob is not configured (public key + secret key + HMAC + integration IDs required)');

  const address = order.shipping_address || {};
  // Paymob amounts are integers in the smallest currency unit (halalas for SAR).
  const amountCents = Math.round(Number(order.total_amount) * 100);
  const nameParts = String(order.customer_name || 'Customer').split(' ');

  const payload = {
    amount: amountCents,
    currency: 'SAR',
    payment_methods: cfg.integrationIds,
    items: (order.items || []).map((it: any) => ({
      name: it.product_name_en || it.product_name_ar || 'Item',
      amount: Math.round(Number(it.unit_price) * 100),
      description: `${it.weight || ''} ${it.grind || ''}`.trim(),
      quantity: Number(it.quantity) || 1
    })),
    billing_data: {
      apartment: address.building || 'NA',
      first_name: nameParts[0] || 'Customer',
      last_name: nameParts.slice(1).join(' ') || 'Customer',
      street: address.street || '',
      building: address.building || 'NA',
      phone_number: order.phone || '',
      city: address.city || '',
      country: 'SA',
      email: order.email || '',
      floor: 'NA',
      state: address.district || ''
    },
    customer: {
      first_name: nameParts[0] || 'Customer',
      last_name: nameParts.slice(1).join(' ') || 'Customer',
      email: order.email || '',
      phone_number: order.phone || '',
      extras: { order_ref: `SEL-${Date.now()}` }
    },
    extras: {
      ee: Math.floor(Math.random() * 1000000),
      merchant_order_id: `SEL-${Date.now()}`
    },
    redirection_url: `${appUrl}/checkout?gateway=paymob`,
    notification_url: `${appUrl}/api/payments/paymob/webhook`
  };

  const res = await fetch(INTENTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${cfg.secretKey}`
    },
    body: JSON.stringify(payload)
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw paymobError(res, data, 'Paymob intention creation failed');

  const clientSecret = String(data?.client_secret || data?.clientSecret || '');
  if (!clientSecret) throw new Error('Paymob response did not include a client secret');
  const checkoutUrl = `${CHECKOUT_URL}?publicKey=${encodeURIComponent(cfg.publicKey)}&clientSecret=${encodeURIComponent(clientSecret)}`;
  return {
    client_secret: clientSecret,
    checkout_url: checkoutUrl,
    intention_id: String(data?.id || data?.intention_order_id || clientSecret),
    raw: data
  };
}

// Paymob HMAC field order for transaction response verification.
const HMAC_FIELDS = [
  'amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction',
  'id', 'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded',
  'is_standalone_payment', 'is_voided', 'order_id', 'owner', 'pending',
  'source_data_pan', 'source_data_sub_type', 'source_data_type', 'success'
];

/** Verifies a Paymob callback payload using HMAC-SHA512. Throws on mismatch. */
export function verifyPaymobHmac(payload: Record<string, any>): { success: boolean; amountCents: number } {
  const cfg = getPaymobConfig();
  if (!cfg) throw new Error('Paymob is not configured');
  const received = String(payload?.hmac || '');
  if (!received) throw new Error('Missing Paymob HMAC signature');
  const concatenated = HMAC_FIELDS.map(f => {
    const v = payload?.[f];
    return v === undefined || v === null ? '' : String(v);
  }).join('');
  const computed = crypto.createHmac('sha512', cfg.hmacSecret).update(concatenated).digest('hex');
  const a = Buffer.from(received, 'utf8');
  const b = Buffer.from(computed, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Invalid Paymob signature');
  }
  return {
    success: String(payload?.success).toLowerCase() === 'true',
    amountCents: Number(payload?.amount_cents) || 0
  };
}
