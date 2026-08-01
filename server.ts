import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { db } from './src/server/db.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'selection-dev-secret';

const signToken = (user: any) =>
  jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));

// Wait until the durable store is loaded (no-op locally) before handling
// any request — on Vercel the DB boots from KV asynchronously.
// Reads re-sync from KV at most every 2s so warm instances see mutations
// made by others (e.g. the Stripe webhook marking an order paid).
// Mutating requests (POST/PUT/PATCH/DELETE) additionally acquire a
// cross-instance KV lock and re-read the latest snapshot BEFORE the handler
// runs, then flush + release once the response is sent. This makes every
// read-modify-write atomic across warm instances, so an instance can never
// overwrite the durable snapshot with an older in-memory copy (which erased
// recently created orders).
app.use('/api', async (req, res, next) => {
  try { await db.ready; } catch { /* fall back to in-memory state */ }

  const method = req.method.toUpperCase();
  const isSafe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';

  if (isSafe) {
    try { await db.refreshIfStale(); } catch { /* serve from memory */ }
    return next();
  }

  let token: string | null = null;
  try {
    token = await db.acquireLock();
  } catch (err) {
    console.error('Store lock timeout', err);
    return res.status(503).json({ error_ar: 'المتجر مشغول، حاول مرة أخرى', error_en: 'Store is busy, please retry' });
  }

  try { await db.refreshIfStale(0); } catch { /* serve from memory */ }

  res.on('finish', () => {
    db.flush()
      .catch(() => {})
      .finally(() => db.releaseLock(token).catch(() => {}));
  });

  next();
});

// File upload configuration.
// The uploads folder is re-created on every boot: `public/uploads` is
// gitignored, so fresh deployments (Railway, VPS, ...) start without it.
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, jpeg, png, gif, webp, svg, avif) are allowed'));
    }
  }
});

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Upload endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error_ar: 'لم يتم رفع ملف', error_en: 'No file uploaded' });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', store: 'Selection Specialty Coffee Roasters' });
});

// Categories
app.get('/api/categories', (req, res) => {
  const categories = db.getCategories();
  res.json(categories);
});

app.post('/api/categories', (req, res) => {
  const category = db.saveCategory(req.body);
  res.json(category);
});

app.delete('/api/categories/:id', (req, res) => {
  db.deleteCategory(req.params.id);
  res.json({ success: true });
});

// Products
app.get('/api/products', (req, res) => {
  const {
    category_id,
    category_slug,
    search,
    is_new,
    is_bestseller,
    is_featured,
    process,
    origin,
    min_price,
    max_price,
    sort_by
  } = req.query;

  const products = db.getProducts({
    category_id: category_id as string,
    category_slug: category_slug as string,
    search: search as string,
    is_new: is_new === 'true',
    is_bestseller: is_bestseller === 'true',
    is_featured: is_featured === 'true',
    process: process as string,
    origin: origin as string,
    min_price: min_price ? Number(min_price) : undefined,
    max_price: max_price ? Number(max_price) : undefined,
    sort_by: sort_by as any
  });

  res.json(products);
});

app.get('/api/products/:slug', (req, res) => {
  const product = db.getProductBySlug(req.params.slug) || db.getProductById(req.params.slug);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

app.post('/api/products', (req, res) => {
  const product = db.saveProduct({
    ...req.body,
    id: req.body.id || `prod-${Date.now()}`,
    created_at: req.body.created_at || new Date().toISOString()
  });
  res.json(product);
});

app.put('/api/products/:id', (req, res) => {
  const product = db.saveProduct({ ...req.body, id: req.params.id });
  res.json(product);
});

app.delete('/api/products/:id', (req, res) => {
  db.deleteProduct(req.params.id);
  res.json({ success: true });
});

// Auth
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error_ar: 'اسم المستخدم أو كلمة المرور غير صحيحة', error_en: 'Invalid credentials' });
  }
  if (user.password && user.password !== password) {
    return res.status(401).json({ error_ar: 'اسم المستخدم أو كلمة المرور غير صحيحة', error_en: 'Invalid credentials' });
  }
  if (user.blocked) {
    return res.status(403).json({ error_ar: 'تم حظر حسابك، يرجى التواصل مع الدعم', error_en: 'Your account has been blocked, please contact support' });
  }
  db.linkOrdersToUser(user.id, user.email);
  res.json({ user, token: signToken(user) });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, phone, password } = req.body;
  const existing = db.getUserByEmail(email);
  if (existing) {
    if (existing.blocked) {
      return res.status(403).json({ error_ar: 'تم حظر حسابك، يرجى التواصل مع الدعم', error_en: 'Your account has been blocked, please contact support' });
    }
    return res.status(400).json({ error_ar: 'البريد الإلكتروني مسجل بالفعل', error_en: 'Email already registered' });
  }

  const user = db.createUser({
    id: `usr-${Date.now()}`,
    name,
    email,
    phone,
    role: 'customer',
    loyalty_points: 50,
    addresses: [],
    created_at: new Date().toISOString(),
    password
  });

  db.linkOrdersToUser(user.id, user.email);
  res.json({ user, token: signToken(user) });
});

app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential || typeof credential !== 'string') {
    return res.status(400).json({ error_ar: 'رمز جوجل غير صالح', error_en: 'Invalid Google credential' });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({
      error_ar: 'تسجيل الدخول بجوجل غير متاح حالياً، يرجى المحاولة لاحقاً',
      error_en: 'Google login is currently unavailable'
    });
  }

  try {
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(clientId);

    let ticket;
    try {
      ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    } catch (err: any) {
      const reason = err?.message || '';
      if (/expired/i.test(reason)) {
        return res.status(401).json({
          error_ar: 'انتهت صلاحية جلسة جوجل، يرجى المحاولة مرة أخرى',
          error_en: 'Google session expired, please try again'
        });
      }
      throw err;
    }

    const payload = ticket.getPayload() || {};

    const validIssuer = payload.iss === 'accounts.google.com' || payload.iss === 'https://accounts.google.com';
    if (!validIssuer) {
      return res.status(401).json({ error_ar: 'مصدر رمز جوجل غير موثوق', error_en: 'Untrusted Google token issuer' });
    }

    if (!payload.aud || payload.aud !== clientId) {
      return res.status(401).json({ error_ar: 'رمز جوجل غير موجه لهذا التطبيق', error_en: 'Google token audience mismatch' });
    }

    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
      return res.status(401).json({ error_ar: 'انتهت صلاحية رمز جوجل', error_en: 'Google token has expired' });
    }

    if (!payload.email) {
      return res.status(400).json({ error_ar: 'لم يتم العثور على بريد إلكتروني في حساب جوجل', error_en: 'No email found in Google account' });
    }

    if (!payload.email_verified) {
      return res.status(400).json({
        error_ar: 'يرجى تأكيد بريدك الإلكتروني في جوجل أولاً ثم المحاولة مرة أخرى',
        error_en: 'Please verify your Google email first and try again'
      });
    }

    const googleEmail = payload.email;
    const googleName = payload.name || googleEmail.split('@')[0] || 'Google User';

    let user = db.getUserByEmail(googleEmail);

    if (user && user.blocked) {
      return res.status(403).json({ error_ar: 'تم حظر حسابك، يرجى التواصل مع الدعم', error_en: 'Your account has been blocked, please contact support' });
    }

    if (!user) {
      user = db.createUser({
        id: `usr-${Date.now()}`,
        name: googleName,
        email: googleEmail,
        phone: '',
        role: 'customer',
        loyalty_points: 50,
        addresses: [],
        created_at: new Date().toISOString()
      });
    }

    db.linkOrdersToUser(user.id, user.email);
    res.json({ user, token: signToken(user) });
  } catch (err) {
    res.status(400).json({
      error_ar: 'فشل التحقق من حساب جوجل، يرجى المحاولة مرة أخرى',
      error_en: 'Google verification failed, please try again'
    });
  }
});

// Coupons
app.post('/api/coupons/validate', (req, res) => {
  const { code, subtotal } = req.body;
  const result = db.validateCoupon(code, subtotal);
  res.json(result);
});

app.get('/api/coupons', (req, res) => {
  res.json(db.getCoupons());
});

app.post('/api/coupons', (req, res) => {
  const coupon = db.saveCoupon(req.body);
  res.json(coupon);
});

app.delete('/api/coupons/:id', (req, res) => {
  db.deleteCoupon(req.params.id);
  res.json({ success: true });
});

// Admin Coupons (alias)
app.get('/api/admin/coupons', (req, res) => {
  res.json(db.getCoupons());
});

app.post('/api/admin/coupons', (req, res) => {
  const coupon = db.saveCoupon(req.body);
  res.json(coupon);
});

app.delete('/api/admin/coupons/:id', (req, res) => {
  db.deleteCoupon(req.params.id);
  res.json({ success: true });
});

// Admin Products (alias)
app.get('/api/admin/products', (req, res) => {
  res.json(db.getProducts());
});

app.post('/api/admin/products', (req, res) => {
  const product = db.saveProduct({
    ...req.body,
    id: req.body.id || `prod-${Date.now()}`,
    created_at: req.body.created_at || new Date().toISOString()
  });
  res.json(product);
});

app.put('/api/admin/products/:id', (req, res) => {
  const product = db.saveProduct({ ...req.body, id: req.params.id });
  res.json(product);
});

app.delete('/api/admin/products/:id', (req, res) => {
  db.deleteProduct(req.params.id);
  res.json({ success: true });
});

// Orders
app.get('/api/orders', (req, res) => {
  const { user_id } = req.query;
  const orders = db.getOrders(user_id as string);
  res.json(orders);
});

app.get('/api/orders/:orderNumber', (req, res) => {
  const order = db.getOrderByNumber(req.params.orderNumber);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

app.post('/api/orders', async (req, res) => {
  try {
    const userId = req.body.user_id;
    if (userId) {
      const user = db.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error_ar: 'المستخدم غير موجود', error_en: 'User not found' });
      }
      if (user.blocked) {
        return res.status(403).json({ error_ar: 'تم حظر حسابك، لا يمكنك إتمام الطلب. يرجى التواصل مع الدعم', error_en: 'Your account has been blocked, you cannot place orders' });
      }
    }
    const order = db.createOrder(req.body);
    await db.flush();
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create order' });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  const { status, note_ar, note_en } = req.body || {};
  if (!status) {
    return res.status(400).json({ error_ar: 'يرجى تحديد الحالة الجديدة', error_en: 'New status is required' });
  }
  try {
    const order = db.updateOrderStatus(req.params.id, status, note_ar, note_en);
    if (!order) {
      return res.status(404).json({ error_ar: 'الطلب غير موجود', error_en: 'Order not found' });
    }
    await db.flush();
    res.json(order);
  } catch (err: any) {
    console.error('PUT /api/orders/:id/status', err);
    res.status(500).json({ error_ar: 'فشل تحديث حالة الطلب', error_en: 'Failed to update order status' });
  }
});

// Admin Orders (alias)
app.get('/api/admin/orders', (req, res) => {
  const { status } = req.query;
  let orders = db.getOrders();
  if (status && status !== 'all') {
    orders = orders.filter(o => o.status === status);
  }
  res.json(orders);
});

app.put('/api/admin/orders/:id', async (req, res) => {
  const { status, note_ar, note_en } = req.body || {};
  try {
    const order = db.updateOrderStatus(req.params.id, status, note_ar, note_en);
    if (!order) {
      return res.status(404).json({ error_ar: 'الطلب غير موجود', error_en: 'Order not found' });
    }
    await db.flush();
    res.json(order);
  } catch (err: any) {
    console.error('PUT /api/admin/orders/:id', err);
    res.status(500).json({ error_ar: 'فشل تحديث الطلب', error_en: 'Failed to update order' });
  }
});

// Delete an order (admin + alias)
app.delete('/api/admin/orders/:id', async (req, res) => {
  try {
    const order = db.getOrderById(req.params.id) || db.getOrderByNumber(req.params.id);
    if (!order) {
      return res.status(404).json({ error_ar: 'الطلب غير موجود', error_en: 'Order not found' });
    }
    db.deleteOrder(req.params.id);
    await db.flush();
    res.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/admin/orders/:id', err);
    res.status(500).json({ error_ar: 'فشل حذف الطلب', error_en: 'Failed to delete order' });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    const order = db.getOrderById(req.params.id) || db.getOrderByNumber(req.params.id);
    if (!order) {
      return res.status(404).json({ error_ar: 'الطلب غير موجود', error_en: 'Order not found' });
    }
    db.deleteOrder(req.params.id);
    await db.flush();
    res.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/orders/:id', err);
    res.status(500).json({ error_ar: 'فشل حذف الطلب', error_en: 'Failed to delete order' });
  }
});

// Users (Admin)
app.get('/api/admin/users', (req, res) => {
  try { res.json(db.getUsers()); } catch (e) { console.error('GET /api/admin/users', e); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/admin/users/:id', (req, res) => {
  try {
    const user = db.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const stats = db.getUserStats(req.params.id);
    const orders = db.getOrders(req.params.id);
    const reviews = db.getUserReviews(req.params.id);
    const addresses = db.getUserAddresses(req.params.id);
    res.json({ user, stats, orders, reviews, addresses });
  } catch (e) { console.error('GET /api/admin/users/:id', e); res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/admin/users/:id', (req, res) => {
  const existing = db.getUserById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  const updated = db.updateUser({ ...existing, ...req.body, id: req.params.id });
  res.json(updated);
});

app.delete('/api/admin/users/:id', (req, res) => {
  db.deleteUser(req.params.id);
  res.json({ success: true });
});

app.post('/api/admin/users/:id/loyalty', (req, res) => {
  const { points, type, description_ar, description_en } = req.body;
  const user = db.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const tx = {
    id: `lt-${Date.now()}`,
    user_id: user.id,
    type: type || 'bonus',
    points: Math.abs(points),
    amount_sar: 0,
    description_ar: description_ar || 'تعديل يدوي من الإدارة',
    description_en: description_en || 'Manual adjustment by admin',
    created_at: new Date().toISOString()
  };

  if (type === 'redeemed') {
    user.loyalty_points = Math.max(0, user.loyalty_points - Math.abs(points));
  } else {
    user.loyalty_points += Math.abs(points);
  }

  db.updateUser(user);
  db.addLoyaltyTransaction(tx);
  res.json({ user, transaction: tx });
});

app.get('/api/users/:id', (req, res) => {
  const user = db.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.put('/api/users/:id', (req, res) => {
  const existing = db.getUserById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  const user = db.updateUser({ ...existing, ...req.body, id: req.params.id });
  res.json({ user });
});

app.get('/api/admin/users/:id/loyalty-transactions', (req, res) => {
  const transactions = db.getLoyaltyTransactions(req.params.id);
  res.json(transactions);
});

// Reviews & Questions
app.get('/api/reviews', (req, res) => {
  const { product_id, all } = req.query;
  if (product_id && all === 'true') {
    const allReviews = db.getAllReviews(product_id as string);
    return res.json(allReviews);
  }
  res.json(db.getReviews(product_id as string));
});

app.post('/api/reviews', (req, res) => {
  const { product_id, rating, comment, user_id, customer_name, title, verified_purchase } = req.body || {};

  if (!product_id || !db.getProductById(product_id)) {
    return res.status(400).json({ error_ar: 'المنتج غير موجود', error_en: 'Product not found' });
  }
  const numRating = Number(rating);
  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    return res.status(400).json({ error_ar: 'التقييم يجب أن يكون من 1 إلى 5', error_en: 'Rating must be between 1 and 5' });
  }
  if (!comment || !String(comment).trim()) {
    return res.status(400).json({ error_ar: 'يرجى كتابة نص التقييم', error_en: 'Review comment is required' });
  }

  const isVerified = !!(user_id && db.hasDeliveredPurchase(String(user_id), product_id));
  const review = db.addReview({
    product_id,
    user_id: user_id ? String(user_id) : undefined,
    customer_name: (customer_name || '').trim() || 'عميل سيليكشن',
    rating: numRating,
    title: (title || '').trim(),
    comment: String(comment).trim(),
    verified_purchase: verified_purchase ? isVerified : false
  });
  res.json(review);
});

app.get('/api/questions', (req, res) => {
  const { product_id } = req.query;
  res.json(db.getQuestions(product_id as string));
});

app.post('/api/questions', (req, res) => {
  const question = db.addQuestion(req.body);
  res.json(question);
});

app.put('/api/questions/:id/answer', (req, res) => {
  const { answer_ar, answer_en } = req.body;
  const question = db.answerQuestion(req.params.id, answer_ar, answer_en);
  res.json(question);
});

// Stock notifications
app.post('/api/stock-notifications', (req, res) => {
  const sub = db.addStockNotification(req.body);
  res.json({ success: true, notification: sub });
});

app.get('/api/stock-notifications', (req, res) => {
  res.json(db.getStockNotifications());
});

app.get('/api/admin/stock-notifications', (req, res) => {
  res.json(db.getStockNotifications());
});

// Wholesale & Contact
app.post('/api/wholesale', (req, res) => {
  const sub = db.addWholesaleSubmission(req.body);
  res.json({ success: true, submission: sub });
});

app.get('/api/wholesale', (req, res) => {
  res.json(db.getWholesaleSubmissions());
});

app.get('/api/admin/wholesale-requests', (req, res) => {
  res.json(db.getWholesaleSubmissions());
});

app.post('/api/contact', (req, res) => {
  const sub = db.addContactSubmission(req.body);
  res.json({ success: true, submission: sub });
});

app.get('/api/contact', (req, res) => {
  res.json(db.getContactSubmissions());
});

app.get('/api/admin/contact-submissions', (req, res) => {
  res.json(db.getContactSubmissions());
});

app.put('/api/admin/contact/:id/reply', (req, res) => {
  const { reply_ar, reply_en } = req.body || {};
  if (!reply_ar && !reply_en) {
    return res.status(400).json({ error_ar: 'يرجى كتابة نص الرد', error_en: 'Reply text is required' });
  }
  const sub = db.replyContactSubmission(req.params.id, reply_ar, reply_en);
  if (!sub) {
    return res.status(404).json({ error_ar: 'الرسالة غير موجودة', error_en: 'Message not found' });
  }
  res.json(sub);
});

// Admin Reviews (all, including pending)
app.get('/api/admin/reviews', (req, res) => {
  res.json(db.getAllReviews());
});

app.put('/api/admin/reviews/:id/status', (req, res) => {
  const { status } = req.body;
  const review = db.updateReviewStatus(req.params.id, status);
  res.json(review);
});

app.put('/api/admin/reviews/:id/reply', (req, res) => {
  const { reply_ar, reply_en } = req.body || {};
  if (!reply_ar && !reply_en) {
    return res.status(400).json({ error_ar: 'يرجى كتابة نص الرد', error_en: 'Reply text is required' });
  }
  const review = db.updateReviewReply(req.params.id, reply_ar, reply_en);
  if (!review) {
    return res.status(404).json({ error_ar: 'التقييم غير موجود', error_en: 'Review not found' });
  }
  res.json(review);
});

app.delete('/api/admin/reviews/:id', (req, res) => {
  db.deleteReview(req.params.id);
  res.json({ success: true });
});

// Admin Questions (all, including pending)
app.get('/api/admin/questions', (req, res) => {
  res.json(db.getAllQuestions());
});

app.delete('/api/admin/questions/:id', (req, res) => {
  db.deleteQuestion(req.params.id);
  res.json({ success: true });
});

// Newsletter subscription
app.post('/api/newsletter/subscribe', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const sub = db.addNewsletterSubscriber(email);
  res.json({ success: true, subscriber: sub });
});

app.get('/api/newsletter/subscribers', (req, res) => {
  res.json(db.getNewsletterSubscribers());
});

app.delete('/api/newsletter/subscribers/:id', (req, res) => {
  db.deleteNewsletterSubscriber(req.params.id);
  res.json({ success: true });
});

// Banners
app.get('/api/banners', (req, res) => {
  const { position } = req.query;
  res.json(db.getBanners(position as string));
});

app.get('/api/admin/banners', (req, res) => {
  try { res.json(db.getAllBanners()); } catch (e) { console.error('GET /api/admin/banners', e); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/banners', (req, res) => {
  const banner = db.saveBanner({
    ...req.body,
    id: req.body.id || `banner-${Date.now()}`,
    created_at: req.body.created_at || new Date().toISOString()
  });
  res.json(banner);
});

app.put('/api/admin/banners/:id', (req, res) => {
  const banner = db.saveBanner({ ...req.body, id: req.params.id });
  res.json(banner);
});

app.delete('/api/admin/banners/:id', (req, res) => {
  db.deleteBanner(req.params.id);
  res.json({ success: true });
});

// New orders since timestamp (for notifications)
app.get('/api/admin/orders/new', (req, res) => {
  const since = (req.query.since as string) || new Date(0).toISOString();
  const newOrders = db.getNewOrdersSince(since);
  res.json({ count: newOrders.length, orders: newOrders });
});

// Admin Stats & Config
app.get('/api/admin/stats', (req, res) => {
  res.json(db.getDashboardStats());
});

app.get('/api/admin/homepage', (req, res) => {
  res.json(db.getHomepageSections());
});

app.put('/api/admin/homepage', (req, res) => {
  const sections = db.saveHomepageSections(req.body);
  res.json(sections);
});

app.get('/api/admin/announcement', (req, res) => {
  res.json(db.getAnnouncementBar());
});

app.put('/api/admin/announcement', (req, res) => {
  const bar = db.saveAnnouncementBar(req.body);
  res.json(bar);
});

app.get('/api/admin/settings', (req, res) => {
  res.json(db.getStoreSettings());
});

app.put('/api/admin/settings', (req, res) => {
  const settings = db.saveStoreSettings(req.body);
  res.json(settings);
});

// Quiz Config
app.get('/api/admin/quiz', (req, res) => {
  res.json(db.getQuizConfig());
});

app.put('/api/admin/quiz', (req, res) => {
  const quizConfig = db.saveQuizConfig(req.body);
  res.json(quizConfig);
});

// Export CSV Endpoint
app.get('/api/admin/export/:type', (req, res) => {
  const type = req.params.type;
  if (type === 'orders') {
    const orders = db.getOrders();
    let csv = 'OrderNumber,Customer,Phone,TotalSAR,Status,CreatedAt\n';
    orders.forEach(o => {
      csv += `"${o.order_number}","${o.customer_name}","${o.phone}",${o.total_amount},"${o.status}","${o.created_at}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    return res.send(csv);
  }

  if (type === 'products') {
    const products = db.getProducts();
    let csv = 'SKU,NameAR,NameEN,PriceSAR,Stock,SoldCount\n';
    products.forEach(p => {
      csv += `"${p.sku}","${p.name_ar}","${p.name_en}",${p.price},${p.stock},${p.sold_count}\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
    return res.send(csv);
  }

  if (type === 'customers') {
    const users = db.getUsers().filter(u => u.role === 'customer');
    let csv = 'Name,Email,Phone,LoyaltyPoints,RegisteredAt\n';
    users.forEach(u => {
      csv += `"${u.name}","${u.email}","${u.phone}",${u.loyalty_points},"${u.created_at}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
    return res.send(csv);
  }

  res.status(400).json({ error: 'Unknown export type' });
});

// Delete contact submission
app.delete('/api/admin/contact/:id', (req, res) => {
  db.deleteContactSubmission(req.params.id);
  res.json({ success: true });
});

// Update wholesale submission status
app.put('/api/admin/wholesale/:id', (req, res) => {
  const sub = db.updateWholesaleSubmission(req.params.id, req.body);
  res.json(sub);
});

// Update stock notification status
app.put('/api/admin/stock-notifications/:id', (req, res) => {
  const sub = db.updateStockNotification(req.params.id, req.body);
  res.json(sub);
});

// ============ Stripe Payments ============
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Compares the server-side secret key with the browser publishable key.
// They must share the same mode (test/live) AND belong to the same Stripe
// account, otherwise confirmPayment fails on the client. The account match is
// resolved authoritatively from the Stripe API (cached for 60s) because keys
// embed their account id followed by a variable-length random suffix, so
// naive slicing of the token produces false mismatches.
let keyPairCache: { diag: any; at: number } | null = null;

async function stripeKeyDiagnostics() {
  const now = Date.now();
  if (keyPairCache && now - keyPairCache.at < 60_000) return keyPairCache.diag;

  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  const pubKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
  const secretMode = secretKey.startsWith('sk_test_') ? 'test' : secretKey.startsWith('sk_live_') ? 'live' : null;
  const pubMode = pubKey.startsWith('pk_test_') ? 'test' : pubKey.startsWith('pk_live_') ? 'live' : null;

  let key_account_mismatch = false;
  if (secretKey && pubKey && stripe) {
    try {
      const acct = await stripe.accounts.retrieveCurrent();
      const acctPart = (acct.id || '').replace(/^acct_/, '');
      const pubToken = pubKey.replace(/^pk_(test|live)_/, '');
      key_account_mismatch = !(acctPart && pubToken.includes(acctPart));
    } catch (err: any) {
      console.error('[Stripe] could not resolve account for key-pair check:', err?.message || err);
      key_account_mismatch = true;
    }
  }

  const diag = {
    secret_mode: secretMode,
    publishable_mode: pubMode,
    key_mode_mismatch: !!(secretMode && pubMode && secretMode !== pubMode),
    key_account_mismatch
  };
  keyPairCache = { diag, at: now };
  return diag;
}

app.get('/api/payments/config', async (_req, res) => {
  const diag = await stripeKeyDiagnostics();
  if (diag.key_mode_mismatch) {
    console.error(`[Stripe] KEY MODE MISMATCH: secret=${diag.secret_mode}, publishable=${diag.publishable_mode}. Use keys from the same mode.`);
  }
  if (diag.key_account_mismatch) {
    console.error('[Stripe] KEY ACCOUNT MISMATCH: secret and publishable keys belong to different Stripe accounts.');
  }
  res.json({
    mode: stripe ? 'live' : 'sandbox',
    configured: !!stripe,
    publishable_key: process.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    ...diag
  });
});

app.post('/api/payments/create-intent', async (req, res) => {
  // The order is NOT created here — it only exists as a staged payload so that
  // abandoned/failed payments never show up in the dashboards. The order is
  // persisted (status=paid) once the payment actually succeeds.
  const { order } = req.body || {};
  if (!order || typeof order !== 'object' || !order.total_amount || !Array.isArray(order.items)) {
    return res.status(400).json({ error_ar: 'بيانات الطلب غير مكتملة', error_en: 'Incomplete order data' });
  }

  const amountHalala = Math.round(order.total_amount * 100);

  if (!stripe) {
    return res.json({ mode: 'sandbox', client_secret: null, amount_halala: amountHalala });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountHalala,
      currency: 'sar',
      payment_method_types: ['card'],
      description: `Order - Selection Specialty Coffee`
    });
    db.savePendingPayment(paymentIntent.id, order);
    console.log(`[Stripe] create-intent OK: pi=${paymentIntent.id}, status=${paymentIntent.status}, amount=${paymentIntent.amount}, client_secret=${paymentIntent.client_secret ? 'present' : 'MISSING'}`);
    if (!paymentIntent.client_secret) {
      return res.status(500).json({
        error_ar: 'تعذر إنشاء عملية الدفع',
        error_en: 'create-intent did not return a clientSecret',
        detail: 'client_secret is null'
      });
    }
    res.json({ mode: 'live', client_secret: paymentIntent.client_secret, amount_halala: paymentIntent.amount, payment_intent_id: paymentIntent.id });
  } catch (err: any) {
    console.error('[Stripe] create-intent error:', err);
    res.status(500).json({ error_ar: 'تعذر إنشاء عملية الدفع', error_en: 'Could not create payment', detail: err.message });
  }
});

app.post('/api/payments/confirm', async (req, res) => {
  const { payment_intent_id } = req.body || {};
  if (!payment_intent_id) {
    return res.status(400).json({ error_ar: 'معرّف الدفع مطلوب', error_en: 'payment_intent_id is required' });
  }

  // Idempotent: a webhook or a previous confirm may have created the order already.
  const existing = db.getOrderByPaymentIntent(payment_intent_id);
  if (existing) return res.json(existing);

  if (!stripe) {
    return res.status(400).json({ error_ar: 'وضع الدفع الحقيقي غير مفعّل', error_en: 'Live payment is not configured' });
  }

  let intent: Stripe.PaymentIntent;
  try {
    intent = await stripe.paymentIntents.retrieve(payment_intent_id);
  } catch (err: any) {
    console.error('[Stripe] confirm retrieve error:', err);
    return res.status(500).json({ error_ar: 'تعذر التحقق من الدفع', error_en: 'Could not verify payment', detail: err.message });
  }

  if (intent.status !== 'succeeded') {
    return res.status(400).json({
      error_ar: 'لم يكتمل الدفع بعد',
      error_en: 'Payment has not completed yet',
      status: intent.status
    });
  }

  const orderPayload = db.getPendingPayment(payment_intent_id);
  if (!orderPayload) {
    return res.status(400).json({ error_ar: 'بيانات الطلب غير متوفرة', error_en: 'Order data is not available' });
  }

  const order = db.createOrder({
    ...orderPayload,
    status: 'pending',
    payment_status: 'paid',
    payment_intent_id
  });
  db.removePendingPayment(payment_intent_id);
  await db.flush();
  res.json(order);
});

app.post('/api/payments/sandbox-confirm', async (req, res) => {
  if (stripe) {
    return res.status(400).json({ error_ar: 'وضع الدفع الحقيقي مفعّل', error_en: 'Live mode is active' });
  }
  const { order } = req.body || {};
  if (!order || typeof order !== 'object' || !order.total_amount || !Array.isArray(order.items)) {
    return res.status(400).json({ error_ar: 'بيانات الطلب غير مكتملة', error_en: 'Incomplete order data' });
  }
  const created = db.createOrder({ ...order, status: 'pending', payment_status: 'paid' });
  await db.flush();
  res.json(created);
});

app.post('/api/payments/webhook', async (req: any, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret || !req.rawBody) {
    return res.status(400).json({ error: 'Webhook not configured' });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const piId = pi.id;
    const existing = db.getOrderByPaymentIntent(piId);
    if (existing) {
      db.updateOrderPaymentStatus(existing.id, 'paid', piId);
    } else {
      const orderPayload = db.getPendingPayment(piId);
      if (orderPayload) {
        db.createOrder({ ...orderPayload, status: 'pending', payment_status: 'paid', payment_intent_id: piId });
        db.removePendingPayment(piId);
      }
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const existing = db.getOrderByPaymentIntent(pi.id);
    if (existing) db.updateOrderPaymentStatus(existing.id, 'failed', pi.id);
  }

  await db.flush();
  res.json({ received: true });
});

// SMSA Shipping
import { createSmsaShipment, trackSmsaShipment } from './src/server/smsa.js';

// Create shipment for an order
app.post('/api/admin/orders/:id/shipment', (req, res) => {
  const order = db.getOrderByNumber(req.params.id) || db.getOrderById?.(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const totalWeightGrams = order.items.reduce((sum, item) => {
    const weightNum = parseInt(item.weight) || 250;
    return sum + (weightNum * item.quantity);
  }, 0);

  const shipment = createSmsaShipment({
    order_id: order.id,
    order_number: order.order_number,
    recipient_name: order.customer_name,
    recipient_phone: order.phone,
    recipient_address: `${order.shipping_address.street}, ${order.shipping_address.district}`,
    recipient_city: order.shipping_address.city,
    recipient_district: order.shipping_address.district,
    recipient_postal_code: order.shipping_address.postal_code,
    weight_grams: totalWeightGrams,
    cod_amount: order.payment_method === 'cod' ? order.total_amount : undefined,
    description: `Order ${order.order_number} - Selection Coffee`
  });

  if (shipment.success) {
    db.updateOrderTracking(order.id, shipment.tracking_number, shipment.tracking_url);
    db.updateOrderStatus(order.id, 'shipped',
      `تم الشحن عبر سمسا - رقم التتبع: ${shipment.tracking_number}`,
      `Shipped via SMSA - Tracking: ${shipment.tracking_number}`
    );
  }

  res.json(shipment);
});

// Track a shipment
app.get('/api/tracking/:trackingNumber', (req, res) => {
  const tracking = trackSmsaShipment(req.params.trackingNumber);
  res.json(tracking);
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err?.message || err);
  res.status(500).json({ error: 'Internal server error' });
});

// Vite Middleware for Dev / Static serving for Prod
// The Vite dev middleware runs ONLY when explicitly in development. Any other
// value (production, or unset — which is what most hosts default to) serves the
// built app from dist/. Otherwise deployments without NODE_ENV=production would
// boot the dev server on production hosts and block their host names.
async function startServer() {
  if (process.env.NODE_ENV === 'development') {
    // vite is ESM-only and must stay out of the Vercel serverless bundle,
    // so it is loaded lazily and only when running the local dev server.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

// On Vercel the app runs as a serverless function (api/index.ts):
// do not listen on a port — just export the Express app.
if (process.env.VERCEL !== '1') {
  startServer();
}

export default app;
