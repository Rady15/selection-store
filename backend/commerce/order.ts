import { db } from '../database/store.js';
import type { Address, Order, OrderItem, PaymentMethod, ShippingMethod } from '../../src/types';

const SHIPPING_PRICES: Record<string, number> = {
  aramex: 28,
  smsa: 25,
  fastlo: 22,
  store_pickup: 0
};

const FREE_SHIPPING_THRESHOLD = 199;
const VAT_RATE = 0.15;
const COD_SURCHARGE = 15;

function cleanString(value: unknown, max = 300) {
  return String(value ?? '').trim().slice(0, max);
}

function normalizeAddress(input: any, user: any): Address {
  const address = input && typeof input === 'object' ? input : {};
  return {
    id: cleanString(address.id || `addr-${Date.now()}`, 80),
    title: cleanString(address.title || 'عنوان الشحن', 80),
    full_name: cleanString(address.full_name || user.name, 120),
    phone: cleanString(address.phone || user.phone, 40),
    country: cleanString(address.country || 'المملكة العربية السعودية', 100),
    city: cleanString(address.city, 100),
    district: cleanString(address.district, 100),
    street: cleanString(address.street, 180),
    building: cleanString(address.building, 80),
    postal_code: cleanString(address.postal_code, 30),
    delivery_notes: cleanString(address.delivery_notes, 500),
    is_default: false
  };
}

export function buildTrustedOrder(input: any, user: any): Omit<Order, 'id' | 'order_number' | 'created_at' | 'status_history'> {
  if (!input || typeof input !== 'object') throw new Error('Invalid order payload');
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50) throw new Error('Invalid order items');

  const paymentMethod = cleanString(input.payment_method, 30) as PaymentMethod;
  const allowedPayments: PaymentMethod[] = ['mada', 'apple_pay', 'visa', 'cod'];
  if (!allowedPayments.includes(paymentMethod)) throw new Error('Unsupported payment method');

  const shippingMethod = cleanString(input.shipping_method, 30) as ShippingMethod;
  if (!(shippingMethod in SHIPPING_PRICES)) throw new Error('Unsupported shipping method');

  const items: OrderItem[] = [];
  let subtotal = 0;

  for (const raw of input.items) {
    const productId = cleanString(raw?.product_id, 120);
    const product = db.getProductById(productId);
    if (!product) throw new Error(`Product not found: ${productId}`);

    const quantity = Number(raw?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new Error('Invalid quantity');

    const weight = cleanString(raw?.weight, 50) || product.weight_options?.[0]?.value || '';
    const grind = cleanString(raw?.grind, 50) as any;
    const weightOption = product.weight_options?.find(w => w.value === weight);
    if (!weightOption) throw new Error(`Invalid weight for ${product.slug}`);
    if (!product.grind_options?.includes(grind)) throw new Error(`Invalid grind for ${product.slug}`);

    const variant = product.variants?.find(v => v.weight === weight && v.grind === grind);
    const availableStock = variant ? Number(variant.stock) : Number(product.stock);
    if (!Number.isFinite(availableStock) || availableStock < quantity) {
      throw new Error(`Insufficient stock for ${product.slug}`);
    }

    const base = Number(variant?.sale_price ?? variant?.price ?? product.sale_price ?? product.price);
    const unitPrice = variant ? base : base + Number(weightOption.priceModifier || 0);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error(`Invalid product price for ${product.slug}`);

    const totalPrice = Number((unitPrice * quantity).toFixed(2));
    subtotal += totalPrice;
    items.push({
      product_id: product.id,
      product_name_ar: product.name_ar,
      product_name_en: product.name_en,
      image: product.images?.[0] || '',
      weight,
      grind,
      quantity,
      unit_price: Number(unitPrice.toFixed(2)),
      total_price: totalPrice,
      sku: variant?.sku || `${product.sku}${weightOption.skuSuffix || ''}`
    });
  }

  subtotal = Number(subtotal.toFixed(2));

  const couponCode = cleanString(input.coupon_code, 80).toUpperCase();
  let couponDiscount = 0;
  let freeShipping = false;
  if (couponCode) {
    const couponResult = db.validateCoupon(couponCode, subtotal);
    if (!couponResult.valid) throw new Error(couponResult.message_en || 'Invalid coupon');
    couponDiscount = Math.min(Number(couponResult.discountAmount || 0), subtotal);
    freeShipping = couponResult.coupon?.discount_type === 'free_shipping';
  }

  const userPoints = Math.max(0, Number(user.loyalty_points || 0));
  const pointsRequested = Math.max(0, Number(input.loyalty_points_used || 0));
  if (!Number.isInteger(pointsRequested)) throw new Error('Invalid loyalty points');
  if (pointsRequested > userPoints) throw new Error('Insufficient loyalty points');

  const maxRedeemablePoints = Math.floor(Math.max(0, subtotal - couponDiscount) / 0.05);
  if (pointsRequested > maxRedeemablePoints) throw new Error('Loyalty points exceed the payable amount');

  const loyaltyDiscount = Number((pointsRequested * 0.05).toFixed(2));
  const discountAmount = Number((couponDiscount + loyaltyDiscount).toFixed(2));
  const taxableSubtotal = Number(Math.max(0, subtotal - discountAmount).toFixed(2));
  const taxAmount = Number((taxableSubtotal * VAT_RATE).toFixed(2));
  const preShippingTotal = Number((taxableSubtotal + taxAmount).toFixed(2));
  const shippingCost = freeShipping || preShippingTotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_PRICES[shippingMethod];
  const codSurcharge = paymentMethod === 'cod' ? COD_SURCHARGE : 0;
  const totalAmount = Number((preShippingTotal + shippingCost + codSurcharge).toFixed(2));

  const address = normalizeAddress(input.shipping_address, user);
  if (!address.city || !address.district || !address.street) throw new Error('Complete shipping address is required');

  const isOnline = paymentMethod !== 'cod';
  return {
    user_id: user.id,
    customer_name: cleanString(user.name, 120),
    email: cleanString(user.email, 180).toLowerCase(),
    phone: cleanString(address.phone || user.phone, 40),
    shipping_address: address,
    items,
    subtotal,
    discount_amount: discountAmount,
    coupon_code: couponCode || undefined,
    loyalty_points_used: pointsRequested || undefined,
    loyalty_discount: loyaltyDiscount || undefined,
    shipping_cost: shippingCost,
    tax_amount: taxAmount,
    cod_surcharge: codSurcharge || undefined,
    total_amount: totalAmount,
    payment_method: paymentMethod,
    payment_status: isOnline ? 'pending' : 'pending',
    shipping_method: shippingMethod,
    status: 'pending',
    customer_notes: cleanString(input.customer_notes, 500)
  };
}
