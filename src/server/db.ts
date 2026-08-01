import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import {
  Product,
  Category,
  Order,
  User,
  Coupon,
  Review,
  ProductQuestion,
  StockNotification,
  LoyaltyTransaction,
  HomepageSection,
  AnnouncementBarConfig,
  StoreSettings,
  WholesaleSubmission,
  ContactSubmission,
  Banner,
  QuizQuestion,
  QuizSettings,
  QuizConfig
} from '../types';

const DATA_FILE = process.env.VERCEL === '1'
  ? '/tmp/data-store.json'
  : process.env.DATA_FILE
    ? path.resolve(process.cwd(), process.env.DATA_FILE)
    : path.join(process.cwd(), 'data-store.json');

// Durable storage on Vercel: Vercel KV / Upstash Redis REST API.
// The filesystem (/tmp) is per-lambda-instance and resets on cold starts,
// so cross-request flows (create order -> create PaymentIntent) would
// otherwise fail with "Order not found" once two requests land on
// different instances. The whole store is kept under one KV key.
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const KV_KEY = 'fursan_data_store';
const useKV = Boolean(KV_URL && KV_TOKEN);

export interface DatabaseState {
  products: Product[];
  categories: Category[];
  orders: Order[];
  users: User[];
  coupons: Coupon[];
  reviews: Review[];
  questions: ProductQuestion[];
  stockNotifications: StockNotification[];
  loyaltyTransactions: LoyaltyTransaction[];
  homepageSections: HomepageSection[];
  announcementBar: AnnouncementBarConfig;
  storeSettings: StoreSettings;
  wholesaleSubmissions: WholesaleSubmission[];
  contactSubmissions: ContactSubmission[];
  newsletterSubscribers: any[];
  banners: Banner[];
  quizConfig: QuizConfig;
}

const initialCategories: Category[] = [
  {
    id: 'cat-1',
    slug: 'coffee-crops',
    name_ar: 'محاصيل القهوة المختصة',
    name_en: 'Specialty Coffee Crops',
    description_ar: 'محاصيل سينجل أوريجين فاخرة محمصة بأعلى معايير الجودة العالمية',
    description_en: 'Single origin specialty coffee crops roasted to perfection',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80',
    icon: 'Coffee',
    sort_order: 1,
    featured: true
  },
  {
    id: 'cat-2',
    slug: 'tasting-boxes',
    name_ar: 'الصناديق والمجموعات',
    name_en: 'Tasting Boxes & Bundles',
    description_ar: 'تشكيلات ومجموعات تجربة القهوة المميزة ومحاصيل التذوق',
    description_en: 'Curated coffee tasting boxes and special bundles',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
    icon: 'Package',
    sort_order: 2,
    featured: true
  },
  {
    id: 'cat-3',
    slug: 'drip-bags',
    name_ar: 'أظرف القهوة المقطرة',
    name_en: 'Drip Coffee Bags',
    description_ar: 'أظرف قهوة مقطرة جاهزة للتحضير السريع أينما كنت',
    description_en: 'Ready-to-brew drip coffee bags for quick specialty coffee on the go',
    image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=800&q=80',
    icon: 'Zap',
    sort_order: 3,
    featured: true
  },
  {
    id: 'cat-4',
    slug: 'brewing-equipment',
    name_ar: 'أدوات ومعدات التحضير',
    name_en: 'Brewing Equipment & Tools',
    description_ar: 'طواحين وأباريق ومقامات V60 وموازين وأدوات تحضير احترافية',
    description_en: 'Professional grinders, kettles, drippers, scales & brewing gear',
    image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80',
    icon: 'Sliders',
    sort_order: 4,
    featured: true
  },
  {
    id: 'cat-5',
    slug: 'cups-accessories',
    name_ar: 'الأكواب والمستلزمات',
    name_en: 'Cups & Glassware',
    description_ar: 'أكواب سيراميك وزجاجية فاخرة وفلاتر ورقية وتجهيزات تقديم',
    description_en: 'Ceramic cups, double-wall glasses, filters, and accessories',
    image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
    icon: 'CupSoda',
    sort_order: 5,
    featured: false
  }
];

const initialProducts: Product[] = [
  {
    id: 'prod-1',
    slug: 'ethiopia-chelchele-natural',
    name_ar: 'إثيوبيا شلشلي - مجففة',
    name_en: 'Ethiopia Chelchele - Natural',
    subtitle_ar: 'إيحاءات التوت الأزرق، الورد، والياسمين مع حلاوة قوية',
    subtitle_en: 'Notes of Blueberry, Rose, and Jasmine with intense sweetness',
    description_ar: 'محصول شلشلي القادم من منطقة يرقاتشيف الشهيرة في إثيوبيا. يتميز بمعالجة مجففة دقيقة تبرز الإيحاءات الفاكهية الجريئة وعبير الياسمين مع قوام متوازن وحلاوة ملحوظة تناسب تحضير الفلتر والإسبرسو الفاكهي.',
    description_en: 'Hailing from the renowned Yirgacheffe region in Ethiopia, Chelchele natural process showcases explosive blueberry aromatics, delicate jasmine florals, and a silky sweet body ideal for V60 drip and fruity espresso.',
    category_id: 'cat-1',
    price: 68,
    sale_price: 59,
    is_new: true,
    is_bestseller: true,
    is_featured: true,
    is_roasters_choice: true,
    rating: 4.9,
    review_count: 48,
    sold_count: 340,
    sku: 'FK-ETH-01',
    stock: 85,
    tasting_notes_ar: ['توت أزرق', 'ورد وياسمين', 'شوكولاتة فاتحة', 'خوخ'],
    tasting_notes_en: ['Blueberry', 'Rose & Jasmine', 'Milk Chocolate', 'Peach'],
    origin_country_ar: 'إثيوبيا',
    origin_country_en: 'Ethiopia',
    region_ar: 'يرغاتشيف - شلشلي',
    region_en: 'Yirgacheffe - Chelchele',
    altitude: '1950 - 2200 م',
    process_ar: 'مجففة طبيعية',
    process_en: 'Natural',
    roast_level_ar: 'محمصة للفلتر والإسبرسو (متوسطة-خفيفة)',
    roast_level_en: 'Medium-Light Omni Roast',
    variety: 'Heirloom',
    flavor_profile: { acidity: 4, sweetness: 5, body: 4, balance: 5 },
    images: [
      'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1000&q=80'
    ],
    grind_options: ['beans', 'v60', 'espresso', 'french_press', 'aeropress', 'cold_brew'],
    weight_options: [
      { value: '250g', label_ar: '250 جرام', label_en: '250g', priceModifier: 0, skuSuffix: '-250' },
      { value: '500g', label_ar: '500 جرام', label_en: '500g', priceModifier: 52, skuSuffix: '-500' },
      { value: '1kg', label_ar: '1 كيلو جرام', label_en: '1kg', priceModifier: 135, skuSuffix: '-1k' }
    ],
    variants: [],
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-2',
    slug: 'colombia-santuario-anaerobic',
    name_ar: 'كولومبيا سانتواريو - أنيروبيك',
    name_en: 'Colombia Santuario - Anaerobic',
    subtitle_ar: 'إيحاءات الكرز الأسود، العسل، والمربى الفاخر',
    subtitle_en: 'Black Cherry, Wild Honey, and Berry Jam notes',
    description_ar: 'محصول كولومبي فاخر خضع لمعالجة التخمير اللاهوائي (Anaerobic) لمدة 72 ساعة. يمنحك تجربة كوب استثنائية غنية بنكهات الفواكه الحمراء المركزة والشوكولاتة مع حمضية معقدة ونهاية حالمة.',
    description_en: 'A specialty Colombian microlot subjected to 72 hours of anaerobic fermentation. Delivers an extraordinarily rich cup bursting with dark cherry, fermented berries, honeyed sweetness, and lingering cocoa notes.',
    category_id: 'cat-1',
    price: 78,
    is_new: true,
    is_bestseller: false,
    is_featured: true,
    is_roasters_choice: true,
    rating: 4.8,
    review_count: 29,
    sold_count: 190,
    sku: 'FK-COL-02',
    stock: 42,
    tasting_notes_ar: ['كرز أسود', 'عسل بري', 'مربى التوت', 'كاكاو'],
    tasting_notes_en: ['Black Cherry', 'Wild Honey', 'Berry Jam', 'Cocoa'],
    origin_country_ar: 'كولومبيا',
    origin_country_en: 'Colombia',
    region_ar: 'كاوكا - سانتواريو',
    region_en: 'Cauca - Santuario',
    altitude: '1850 - 2050 م',
    process_ar: 'تخمير لاهوائي (Anaerobic)',
    process_en: 'Anaerobic Fermentation',
    roast_level_ar: 'محمصة للفلتر',
    roast_level_en: 'Filter Light Roast',
    variety: 'Castillo / Caturra',
    flavor_profile: { acidity: 4, sweetness: 5, body: 4, balance: 4 },
    images: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=1000&q=80'
    ],
    grind_options: ['beans', 'v60', 'espresso', 'french_press', 'aeropress'],
    weight_options: [
      { value: '250g', label_ar: '250 جرام', label_en: '250g', priceModifier: 0, skuSuffix: '-250' },
      { value: '500g', label_ar: '500 جرام', label_en: '500g', priceModifier: 65, skuSuffix: '-500' }
    ],
    variants: [],
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-3',
    slug: 'el-salvador-el-manar-honey',
    name_ar: 'السلفادور المنار - عسلية',
    name_en: 'El Salvador El Manar - Honey',
    subtitle_ar: 'إيحاءات المشمش، الكراميل، واللوز المحمص',
    subtitle_en: 'Apricot, Caramel, and Roasted Almond notes',
    description_ar: 'من مرتفعات السلفادور البركانية، يأتي محصول المنار بمعالجة عسلية حمراء متميزة تعطي توازناً ساحراً بين الحمضية الهادئة والنكهات السكرية الدافئة للكراميل والمكسرات.',
    description_en: 'Grown in rich volcanic soils of El Salvador, El Manar undergoes red honey processing to yield a beautifully balanced cup characterized by sweet apricot, buttery caramel, and toasted almond nuances.',
    category_id: 'cat-1',
    price: 64,
    sale_price: 54,
    is_new: false,
    is_bestseller: true,
    is_featured: true,
    is_roasters_choice: false,
    rating: 4.7,
    review_count: 53,
    sold_count: 510,
    sku: 'FK-SLV-03',
    stock: 120,
    tasting_notes_ar: ['مشمش', 'كراميل دافئ', 'لوز محمص', 'فانيلا'],
    tasting_notes_en: ['Apricot', 'Warm Caramel', 'Roasted Almond', 'Vanilla'],
    origin_country_ar: 'السلفادور',
    origin_country_en: 'El Salvador',
    region_ar: 'سانتا أنا',
    region_en: 'Santa Ana',
    altitude: '1600 - 1800 م',
    process_ar: 'معالجة عسلية (Red Honey)',
    process_en: 'Red Honey Process',
    roast_level_ar: 'متوسطة الإسبرسو والفلتر',
    roast_level_en: 'Medium Roast',
    variety: 'Bourbon',
    flavor_profile: { acidity: 3, sweetness: 5, body: 4, balance: 5 },
    images: [
      'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=1000&q=80'
    ],
    grind_options: ['beans', 'v60', 'espresso', 'french_press', 'aeropress', 'cold_brew'],
    weight_options: [
      { value: '250g', label_ar: '250 جرام', label_en: '250g', priceModifier: 0, skuSuffix: '-250' },
      { value: '500g', label_ar: '500 جرام', label_en: '500g', priceModifier: 48, skuSuffix: '-500' },
      { value: '1kg', label_ar: '1 كيلو جرام', label_en: '1kg', priceModifier: 125, skuSuffix: '-1k' }
    ],
    variants: [],
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-4',
    slug: 'saudi-khawlani-reserve',
    name_ar: 'محصول الخولاني السعودي الفاخر - جبال جازان',
    name_en: 'Saudi Khawlani Reserve - Jazan Mountains',
    subtitle_ar: 'إيحاءات التين المجفف، للهيل، والبهارات والعسل الجبلي',
    subtitle_en: 'Dried Fig, Cardamom, Mountain Honey, and Clove notes',
    description_ar: 'محصول الخولاني الأصيل من أعالي جبال جازان وذرا الخولان جنوب المملكة. محصول نادر وعالي الجودة بلمسة عريقة ونكهات دافئة تعكس كرم الضيافة وأصالة القهوة السعودية.',
    description_en: 'Authentic Saudi Khawlani beans grown high on the terraced slopes of Jazan mountains. A rare specialty reserve showcasing sweet dried fig, subtle cardamom warmth, and aromatic mountain honey notes.',
    category_id: 'cat-1',
    price: 95,
    is_new: true,
    is_bestseller: true,
    is_featured: true,
    is_roasters_choice: true,
    rating: 5.0,
    review_count: 64,
    sold_count: 420,
    sku: 'FK-SAU-04',
    stock: 28,
    tasting_notes_ar: ['تين مجفف', 'عسل جبلي', 'لمسة هيل وفاكهية', 'كراميل دافئ'],
    tasting_notes_en: ['Dried Fig', 'Mountain Honey', 'Cardamom Touch', 'Warm Caramel'],
    origin_country_ar: 'المملكة العربية السعودية',
    origin_country_en: 'Saudi Arabia',
    region_ar: 'جبال الخولان - جازان',
    region_en: 'Khawlan Mountains - Jazan',
    altitude: '1900 - 2300 م',
    process_ar: 'مجففة طبيعية',
    process_en: 'Natural Process',
    roast_level_ar: 'محمصة سعودية أشقر-متوسطة',
    roast_level_en: 'Light-Medium Traditional & Specialty Roast',
    variety: 'Khawlani Arabica',
    flavor_profile: { acidity: 3, sweetness: 5, body: 5, balance: 5 },
    images: [
      'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=1000&q=80'
    ],
    grind_options: ['beans', 'v60', 'espresso', 'french_press', 'turkish'],
    weight_options: [
      { value: '250g', label_ar: '250 جرام', label_en: '250g', priceModifier: 0, skuSuffix: '-250' },
      { value: '500g', label_ar: '500 جرام', label_en: '500g', priceModifier: 80, skuSuffix: '-500' }
    ],
    variants: [],
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-5',
    slug: 'selection-signature-espresso-blend',
    name_ar: 'مزيج سيليكشن الإسبرسو الفاخر (Signature Blend)',
    name_en: 'Selection Signature Espresso Blend',
    subtitle_ar: 'قوام غني، شوكولاتة داكنة، كراميل، ومكسرات محمصة',
    subtitle_en: 'Rich body, Dark Chocolate, Caramel, and Toasted Nuts',
    description_ar: 'مزيج سيليكشن الخاص المبتكر لتحضير مشروبات الإسبرسو والحليب (لاتيه، كابتشينو، فلات وايت). يدمج أفضل المحاصيل البرازيلية والكولومبية لمنحك كريمة كثيفة وطعماً متوازناً بلا حمضية مزعجة.',
    description_en: 'Our flagship espresso blend formulated specifically for rich espresso shots and milk-based drinks (Latte, Cappuccino, Flat White). Features thick crema, sweet chocolate notes, and a velvety smooth body.',
    category_id: 'cat-1',
    price: 58,
    sale_price: 49,
    is_new: false,
    is_bestseller: true,
    is_featured: true,
    is_roasters_choice: false,
    rating: 4.8,
    review_count: 112,
    sold_count: 890,
    sku: 'FK-ESP-05',
    stock: 200,
    tasting_notes_ar: ['شوكولاتة داكنة', 'كراميل غني', 'بندق محمص'],
    tasting_notes_en: ['Dark Chocolate', 'Rich Caramel', 'Toasted Hazelnut'],
    origin_country_ar: 'البرازيل وكولومبيا',
    origin_country_en: 'Brazil & Colombia',
    region_ar: 'مزيج محاصيل مختصة',
    region_en: 'Specialty Blend',
    altitude: '1200 - 1800 م',
    process_ar: 'مغسولة ومجففة',
    process_en: 'Washed & Natural Blend',
    roast_level_ar: 'محمصة إسبرسو متوسطة-داكنة',
    roast_level_en: 'Medium-Dark Espresso Roast',
    variety: 'Bourbon & Caturra',
    flavor_profile: { acidity: 2, sweetness: 4, body: 5, balance: 5 },
    images: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=1000&q=80'
    ],
    grind_options: ['beans', 'espresso', 'french_press', 'v60'],
    weight_options: [
      { value: '250g', label_ar: '250 جرام', label_en: '250g', priceModifier: 0, skuSuffix: '-250' },
      { value: '500g', label_ar: '500 جرام', label_en: '500g', priceModifier: 42, skuSuffix: '-500' },
      { value: '1kg', label_ar: '1 كيلو جرام', label_en: '1kg', priceModifier: 110, skuSuffix: '-1k' }
    ],
    variants: [],
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-6',
    slug: 'specialty-crop-discovery-box',
    name_ar: 'صندوق اكتشاف القهوة المختصة (4 محاصيل x 125ج)',
    name_en: 'Specialty Crop Discovery Box (4 Crops x 125g)',
    subtitle_ar: 'تذوق 4 محاصيل عالمية مختلفة في صندوق هدية أنيق',
    subtitle_en: 'Taste 4 world-class specialty crops in an elegant gift box',
    description_ar: 'الصندوق المثالي لعشاق القهوة والتذوق. يحتوي على 4 عبوات بحجم 125 جرام من أفضل المحاصيل المختصة المختارة من إثيوبيا، كولومبيا، السلفادور، وكوستاريكا مع بطاقات التذوق والتوجيهات.',
    description_en: 'The ultimate tasting experience or gift for coffee connoisseurs. Features four 125g bags of our finest single-origin specialty coffees from Ethiopia, Colombia, El Salvador, and Costa Rica complete with tasting notes cards.',
    category_id: 'cat-2',
    price: 129,
    sale_price: 109,
    is_new: true,
    is_bestseller: true,
    is_featured: true,
    is_roasters_choice: true,
    rating: 4.9,
    review_count: 82,
    sold_count: 610,
    sku: 'FK-BOX-DISC',
    stock: 50,
    tasting_notes_ar: ['فواكه حمراء', 'ورد وياسمين', 'كراميل', 'شوكولاتة'],
    tasting_notes_en: ['Red Berries', 'Jasmine', 'Caramel', 'Chocolate'],
    origin_country_ar: 'محاصيل متنوعة',
    origin_country_en: 'Multi-Origin',
    region_ar: 'صندوق التذوق الخاص',
    region_en: 'Discovery Box',
    altitude: '1600 - 2200 م',
    process_ar: 'مجففة ومغسولة ولاهوائية',
    process_en: 'Assorted Processes',
    roast_level_ar: 'محمصة للفلتر والإسبرسو',
    roast_level_en: 'Omni Roast',
    variety: 'Specialty Assorted',
    flavor_profile: { acidity: 4, sweetness: 5, body: 4, balance: 5 },
    images: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=1000&q=80'
    ],
    grind_options: ['beans', 'v60', 'espresso'],
    weight_options: [
      { value: '4x125g', label_ar: '4 عبوات x 125ج (500ج)', label_en: '4 x 125g (500g total)', priceModifier: 0, skuSuffix: '-SET' }
    ],
    variants: [],
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-7',
    slug: 'v60-drip-bags-box-10pcs',
    name_ar: 'صندوق أظرف القهوة المقطرة V60 (10 أظرف)',
    name_en: 'V60 Drip Coffee Bags Box (10 Bags)',
    subtitle_ar: 'قهوة مختصة 100% في أظرف سهلة التحضير أثناء السفر والعمل',
    subtitle_en: '100% specialty coffee drip bags for quick brewing anywhere',
    description_ar: 'استمتع بطعم القهوة المختصة الطازجة في أي وقت وأي مكان. 10 أظرف فلتر مقطرة محشوة بقهوة إثيوبية وكولومبية مطحونة طحنة مثالية معبأة تحت غاز النيتروجين للحفاظ على النكهة والنعومة.',
    description_en: 'Experience freshly brewed specialty coffee on the go. Box of 10 individual drip bag filters packed with freshly ground Ethiopian & Colombian specialty coffee sealed with nitrogen to preserve peak aroma.',
    category_id: 'cat-3',
    price: 45,
    sale_price: 39,
    is_new: false,
    is_bestseller: true,
    is_featured: true,
    is_roasters_choice: false,
    rating: 4.8,
    review_count: 94,
    sold_count: 1200,
    sku: 'FK-DRIP-10',
    stock: 180,
    tasting_notes_ar: ['توت وحمضيات', 'شوكولاتة خفيفة', 'حلاوة دافئة'],
    tasting_notes_en: ['Berries & Citrus', 'Light Chocolate', 'Sweet Finish'],
    origin_country_ar: 'إثيوبيا وكولومبيا',
    origin_country_en: 'Ethiopia & Colombia',
    region_ar: 'أظرف مقطرة سريعة',
    region_en: 'Drip Coffee Bags',
    altitude: '1800+ م',
    process_ar: 'معالجة مجففة',
    process_en: 'Natural Process',
    roast_level_ar: 'محمصة للفلتر',
    roast_level_en: 'Filter Roast',
    variety: 'Specialty Arabica 100%',
    flavor_profile: { acidity: 4, sweetness: 4, body: 3, balance: 4 },
    images: [
      'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=1000&q=80'
    ],
    grind_options: ['beans'],
    weight_options: [
      { value: '10bags', label_ar: '10 أظرف (150 جرام)', label_en: '10 Bags (150g)', priceModifier: 0, skuSuffix: '-10' },
      { value: '20bags', label_ar: '20 ظرف (300 جرام)', label_en: '20 Bags (300g)', priceModifier: 32, skuSuffix: '-20' }
    ],
    variants: [],
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-8',
    slug: 'pro-manual-coffee-grinder-metal',
    name_ar: 'طاحونة القهوة اليدوية الاحترافية (تروس ستانلس ستيل CNC)',
    name_en: 'Professional Manual Stainless Burr Coffee Grinder',
    subtitle_ar: 'دقة عالية لطحن الإسبرسو والفلتر مع هيكل ألومنيوم فاخر',
    subtitle_en: 'High-precision CNC stainless burrs for Espresso and V60 filter',
    description_ar: 'طاحونة يدوية احترافية مزودة بملف تروس مخروطية من الفولاذ المقاوم للصدأ CNC بـ 38 ملم. تتيح لك تعديل درجات الطحن بدقة متناهية من طحنة الإسبرسو الناعمة إلى V60 والمكبس الفرنسي بدون تكتلات.',
    description_en: 'Heavy-duty manual grinder featuring CNC 38mm stainless steel conical burrs and dual bearings for smooth, effortless grinding. Micro-click adjustment disc guarantees perfect consistency from fine espresso to coarse V60.',
    category_id: 'cat-4',
    price: 240,
    sale_price: 199,
    is_new: true,
    is_bestseller: true,
    is_featured: true,
    is_roasters_choice: true,
    rating: 4.9,
    review_count: 38,
    sold_count: 210,
    sku: 'FK-EQUIP-GRIND',
    stock: 25,
    tasting_notes_ar: ['طحن دقيق جداً', 'تروس فولاذية', 'جسم ألومنيوم أسود'],
    tasting_notes_en: ['Ultra Precise', 'Stainless Burrs', 'Matte Black Aluminum'],
    origin_country_ar: 'مستورد احترافي',
    origin_country_en: 'Imported',
    region_ar: 'أدوات سيليكشن',
    region_en: 'Selection Gear',
    altitude: '-',
    process_ar: '-',
    process_en: '-',
    roast_level_ar: '-',
    roast_level_en: '-',
    variety: '-',
    flavor_profile: { acidity: 0, sweetness: 0, body: 0, balance: 0 },
    images: [
      'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=1000&q=80'
    ],
    grind_options: ['beans'],
    weight_options: [
      { value: 'standard', label_ar: 'اللون الأسود المطفي', label_en: 'Matte Black Edition', priceModifier: 0, skuSuffix: '-BLK' }
    ],
    variants: [],
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-9',
    slug: 'v60-ceramic-dripper-black-02',
    name_ar: 'قمع ترشيح القهوة V60 سيراميك فاخر أسود (مقاس 02)',
    name_en: 'V60 Matte Black Ceramic Coffee Dripper (Size 02)',
    subtitle_ar: 'سيراميك ياباني عالي الجودة لاحتفاظ حراري ممتازة',
    subtitle_en: 'High-grade ceramic construction for superior heat retention',
    description_ar: 'قمع V60 مصمم بحلازونات داخلية مدروسة تضمن تدفقاً متوازناً واستخلاصاً كاملاً لإيحاءات القهوة. يتسع لتحضير من 1 إلى 4 أكواب سيراميك باللون الأسود الملكي المطفي.',
    description_en: 'Classic 60-degree angled dripper with interior spiral ribs for optimal airflow and water flow rate. Crafted from heat-retaining ceramic with a sleek matte black glaze finish. Capacity 1-4 cups.',
    category_id: 'cat-4',
    price: 85,
    sale_price: 69,
    is_new: false,
    is_bestseller: false,
    is_featured: true,
    is_roasters_choice: false,
    rating: 4.8,
    review_count: 45,
    sold_count: 430,
    sku: 'FK-EQUIP-DRIP02',
    stock: 60,
    tasting_notes_ar: ['سيراميك مقاوم للحرارة', 'مقاس 02', 'تصميم حلزوني'],
    tasting_notes_en: ['Heat resistant ceramic', 'Size 02', 'Spiral internal ribs'],
    origin_country_ar: 'مستورد',
    origin_country_en: 'Imported',
    region_ar: 'أدوات التقطير',
    region_en: 'Drip Tools',
    altitude: '-',
    process_ar: '-',
    process_en: '-',
    roast_level_ar: '-',
    roast_level_en: '-',
    variety: '-',
    flavor_profile: { acidity: 0, sweetness: 0, body: 0, balance: 0 },
    images: [
      'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=1000&q=80'
    ],
    grind_options: ['beans'],
    weight_options: [
      { value: 'size02', label_ar: 'مقاس 02 (1-4 أكواب)', label_en: 'Size 02 (1-4 Cups)', priceModifier: 0, skuSuffix: '-02' }
    ],
    variants: [],
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-10',
    slug: 'selection-signature-ceramic-cup-220ml',
    name_ar: 'كوب سيراميك سيليكشن الفاخر (220 مل)',
    name_en: 'Selection Signature Ceramic Mug (220ml)',
    subtitle_ar: 'مصنوع يدوياً بشعار سيليكشن المحفور وملمس حجري دافئ',
    subtitle_en: 'Handcrafted ceramic mug with engraved Selection emblem',
    description_ar: 'كوب سيراميك خاص مصمم خصيصاً لاحتساء الفلاتر والإسبرسو مع الحليب. سمك مدروس يحافظ على درجة حرارة القهوة وحافة مريحة للشفتين تبرز حلاوة المشروب.',
    description_en: 'Exclusive artisan ceramic cup with a tactile matte stone texture and engraved Selection gold foil accents. Designed specifically to enhance aroma and thermal retention for flat white, cappuccino, and filter coffee.',
    category_id: 'cat-5',
    price: 48,
    is_new: true,
    is_bestseller: true,
    is_featured: false,
    is_roasters_choice: false,
    rating: 4.9,
    review_count: 67,
    sold_count: 780,
    sku: 'FK-CUP-220',
    stock: 90,
    tasting_notes_ar: ['سيراميك يدوي', 'سعة 220مل', 'تصميم حجر أسود'],
    tasting_notes_en: ['Handcrafted', '220ml Capacity', 'Dark Stone Finish'],
    origin_country_ar: 'إصدار خاص',
    origin_country_en: 'Special Edition',
    region_ar: 'مستلزمات القهوة',
    region_en: 'Cups',
    altitude: '-',
    process_ar: '-',
    process_en: '-',
    roast_level_ar: '-',
    roast_level_en: '-',
    variety: '-',
    flavor_profile: { acidity: 0, sweetness: 0, body: 0, balance: 0 },
    images: [
      'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1000&q=80'
    ],
    grind_options: ['beans'],
    weight_options: [
      { value: '220ml', label_ar: '220 مل - أسود حجري', label_en: '220ml - Black Stone', priceModifier: 0, skuSuffix: '-220' }
    ],
    variants: [],
    created_at: new Date().toISOString()
  }
];

const initialUsers: User[] = [
  {
    id: 'usr-admin-1',
    name: 'مدير النظام (Admin)',
    email: process.env.ADMIN_EMAIL || 'admin@selection.sa',
    phone: '+966500000000',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    role: 'admin',
    loyalty_points: 1500,
    addresses: [
      {
        id: 'addr-1',
        title: 'مقر المقر الرئيسي',
        full_name: 'إدارة سيليكشن القهوة',
        phone: '+966500000000',
        country: 'المملكة العربية السعودية',
        city: 'الرياض',
        district: 'حي حطين',
        street: 'طريق الملك فهد',
        building: 'برج سيليكشن 102',
        postal_code: '13512',
        is_default: true
      }
    ],
    created_at: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: 'usr-cust-1',
    name: 'عبدالرحمن العتيبي',
    email: 'abdulrahman@example.com',
    phone: '+966551234567',
    role: 'customer',
    loyalty_points: 380,
    addresses: [
      {
        id: 'addr-2',
        title: 'المنزل',
        full_name: 'عبدالرحمن العتيبي',
        phone: '+966551234567',
        country: 'المملكة العربية السعودية',
        city: 'الرياض',
        district: 'حي الملقا',
        street: 'شارع أنس بن مالك',
        building: 'فيللا 45',
        postal_code: '13521',
        is_default: true
      }
    ],
    created_at: new Date(Date.now() - 15 * 86400000).toISOString()
  }
];

const initialCoupons: Coupon[] = [
  {
    id: 'coup-1',
    code: 'WELCOME10',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_amount: 100,
    max_discount_amount: 50,
    valid_until: '2027-12-31',
    usage_count: 42,
    usage_limit: 1000,
    is_active: true
  },
  {
    id: 'coup-2',
    code: 'FREESHIP',
    discount_type: 'free_shipping',
    discount_value: 0,
    min_order_amount: 150,
    valid_until: '2027-12-31',
    usage_count: 120,
    usage_limit: 500,
    is_active: true
  },
  {
    id: 'coup-3',
    code: 'SELECTION20',
    discount_type: 'fixed',
    discount_value: 20,
    min_order_amount: 180,
    valid_until: '2027-12-31',
    usage_count: 18,
    usage_limit: 200,
    is_active: true
  }
];

const initialOrders: Order[] = [
  {
    id: 'ord-1001',
    order_number: 'FK-98231',
    user_id: 'usr-cust-1',
    customer_name: 'عبدالرحمن العتيبي',
    email: 'abdulrahman@example.com',
    phone: '+966551234567',
    shipping_address: {
      id: 'addr-2',
      title: 'المنزل',
      full_name: 'عبدالرحمن العتيبي',
      phone: '+966551234567',
      country: 'المملكة العربية السعودية',
      city: 'الرياض',
      district: 'حي الملقا',
      street: 'شارع أنس بن مالك',
      building: 'فيللا 45',
      is_default: true
    },
    items: [
      {
        product_id: 'prod-1',
        product_name_ar: 'إثيوبيا شلشلي - مجففة',
        product_name_en: 'Ethiopia Chelchele - Natural',
        image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=400&q=80',
        weight: '250g',
        grind: 'v60',
        quantity: 2,
        unit_price: 59,
        total_price: 118,
        sku: 'FK-ETH-01-250'
      },
      {
        product_id: 'prod-7',
        product_name_ar: 'صندوق أظرف القهوة المقطرة V60',
        product_name_en: 'V60 Drip Coffee Bags Box',
        image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=400&q=80',
        weight: '10bags',
        grind: 'beans',
        quantity: 1,
        unit_price: 39,
        total_price: 39,
        sku: 'FK-DRIP-10'
      }
    ],
    subtotal: 157,
    discount_amount: 15.7,
    coupon_code: 'WELCOME10',
    shipping_cost: 0,
    tax_amount: 18.43,
    total_amount: 141.3,
    payment_method: 'apple_pay',
    payment_status: 'paid',
    shipping_method: 'smsa',
    tracking_number: 'SMSA982138249',
    tracking_url: 'https://www.smsaexpress.com/tracking/SMSA982138249',
    status: 'shipped',
    status_history: [
      { status: 'pending', timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), note_ar: 'تم إنشاء الطلب', note_en: 'Order Created' },
      { status: 'paid', timestamp: new Date(Date.now() - 3 * 86400000 + 300000).toISOString(), note_ar: 'تم تأكيد الدفع بنجاح عبر Apple Pay', note_en: 'Payment Confirmed via Apple Pay' },
      { status: 'roasting', timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), note_ar: 'جاري تحميص وطحن المحصول طازجاً', note_en: 'Roasting and fresh grinding in progress' },
      { status: 'shipped', timestamp: new Date(Date.now() - 1 * 86400000).toISOString(), note_ar: 'تم تسليم الشحنة لشركة سمسا للتوصيل', note_en: 'Handed over to SMSA Express' }
    ],
    created_at: new Date(Date.now() - 3 * 86400000).toISOString()
  }
];

const initialReviews: Review[] = [
  {
    id: 'rev-1',
    product_id: 'prod-1',
    user_id: 'usr-cust-1',
    customer_name: 'عبدالرحمن العتيبي',
    rating: 5,
    title: 'محصول خرافي وإيحاءات فاكهية واضحة جداً',
    comment: 'من أفضل المحاصيل الإثيوبية التي جربتها هذا الموسم. إيحاء التوت والورد ظاهر بوضوح مع تحضير V60 على درجة حرارة 90. التوصيل كان سريعاً والتحميص حديث جداً.',
    verified_purchase: true,
    status: 'approved',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    staff_reply_ar: 'شكراً لك أستاذ عبدالرحمن! يسعدنا جداً أن المحصول حاز على رضاك ونتمنى لك دائماً أوقاتاً ممتعة مع قهوة سيليكشن.',
    staff_reply_en: 'Thank you Abdulrahman! We are delighted that you enjoyed our Chelchele crop.'
  }
];

const initialQuestions: ProductQuestion[] = [
  {
    id: 'q-1',
    product_id: 'prod-1',
    customer_name: 'محمد الشمري',
    question: 'هل يفضل تحضير هذا المحصول للفلتر أم الإسبرسو؟',
    answer_ar: 'أهلاً بك محمد! محصول شلشلي يعتبر أومني روزت (Omni Roast) ممتاز جداً لكلا الطريقتين، ولكن إيحاءات التوت والورد تتألق بشكل خاص مع تقطير الفلتر V60.',
    answer_en: 'Hello Mohamed! Chelchele is an excellent omni roast, but its berry and rose notes truly shine with V60 drip brewing.',
    status: 'approved',
    created_at: new Date(Date.now() - 4 * 86400000).toISOString()
  }
];

const initialHomepageSections: HomepageSection[] = [
  {
    id: 'sec-hero',
    type: 'hero_slider',
    is_enabled: true,
    sort_order: 1,
    config: {
      slides: [
        {
          id: 'slide-1',
          badge_ar: 'محاصيل الموسم الجديدة',
          badge_en: 'NEW SEASON CROPS',
          title_ar: 'سيليكشن القهوة المختصة - أصالة النكهة وحرفية التحميص',
          title_en: 'Selection Specialty Coffee - Craft Roasting & Pure Origin',
          subtitle_ar: 'اكتشف أنقى محاصيل القهوة العالية التقييم والمحمصة أسبوعياً طازجة باحترافية عالية',
          subtitle_en: 'Discover top-rated single origin specialty crops freshly roasted every week',
          cta_text_ar: 'تسوق المحاصيل الآن',
          cta_text_en: 'Shop Crops Now',
          cta_link: '/products?category=coffee-crops',
          image_desktop: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1800&q=80',
          image_mobile: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80'
        },
        {
          id: 'slide-2',
          badge_ar: 'عروض الحزمة الذهبية',
          badge_en: 'GOLDEN BUNDLE OFFERS',
          title_ar: 'صندوق التذوق الاستكشافي - 4 محاصيل عالمية',
          title_en: 'Discovery Tasting Box - 4 World-Class Specialty Crops',
          subtitle_ar: 'رحلة تذوق استثنائية تجمع محاصيل إثيوبيا، كولومبيا، السلفادور، وكوستاريكا في علبة أنيقة',
          subtitle_en: 'An extraordinary tasting journey featuring top microlots from across the world',
          cta_text_ar: 'اكتشف الصندوق',
          cta_text_en: 'Explore Discovery Box',
          cta_link: '/products/specialty-crop-discovery-box',
          image_desktop: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1800&q=80',
          image_mobile: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80'
        }
      ]
    }
  },
  {
    id: 'sec-benefits',
    type: 'benefits',
    is_enabled: true,
    sort_order: 2,
    config: {
      items: [
        { icon: 'Coffee', title_ar: 'قهوة مختصة 100%', title_en: '100% Specialty Coffee', desc_ar: 'محاصيل سينجل أوريجين فاخرة من أفضل المزارع العالمية', desc_en: 'Premium single-origin crops from world-class farms' },
        { icon: 'Truck', title_ar: 'شحن سريع لباب بيتك', title_en: 'Fast Home Delivery', desc_ar: 'توصيل سريع واحترافي داخل المملكة العربية السعودية', desc_en: 'Fast professional delivery across Saudi Arabia' },
        { icon: 'ShieldCheck', title_ar: 'جودة مضمونة 100%', title_en: '100% Quality Guaranteed', desc_ar: 'نضمن جودة وطزاجة كل كيس قهوة نرسله لعملائنا', desc_en: 'We guarantee freshness and quality in every bag' },
        { icon: 'RotateCcw', title_ar: 'استرجاع سهل وسريع', title_en: 'Easy Returns', desc_ar: 'سياسة استرجاع مرنة خلال 7 أيام من تاريخ الشراء', desc_en: 'Flexible 7-day return policy from purchase date' }
      ]
    }
  },
  {
    id: 'sec-quiz-callout',
    type: 'coffee_quiz',
    is_enabled: true,
    sort_order: 3,
    config: {
      title_ar: 'محتار في اختيار محصولك المناسب؟',
      title_en: 'Not Sure Which Bean Suits You Best?',
      subtitle_ar: 'استخدم مستشار القهوة الذكي لمساعدتك في العثور على القهوة المثالية لذوقك في 30 ثانية',
      subtitle_en: 'Take our 30-second Interactive Coffee Quiz to match your taste profile'
    }
  },
  {
    id: 'sec-categories',
    type: 'featured_categories',
    title_ar: 'تصفح حسب الأقسام',
    title_en: 'Shop by Categories',
    is_enabled: true,
    sort_order: 4,
    config: {}
  },
  {
    id: 'sec-new-arrivals',
    type: 'product_carousel',
    title_ar: 'أحدث المحاصيل والمنتجات',
    title_en: 'New Arrivals & Fresh Crops',
    subtitle_ar: 'محاصيل جديدة وصلت حديثاً لمحمصة سيليكشن',
    subtitle_en: 'Freshly arrived crops and new specialty additions',
    is_enabled: true,
    sort_order: 5,
    config: { collection: 'new' }
  },
  {
    id: 'sec-bestsellers',
    type: 'product_carousel',
    title_ar: 'الأكثر مبيعاً وتقييماً',
    title_en: 'Best Sellers & Top Rated',
    subtitle_ar: 'المحاصيل والأدوات المفضلات لدى مجتمع عشاق القهوة',
    subtitle_en: 'Customer favorites and highest rated coffee crops',
    is_enabled: true,
    sort_order: 6,
    config: { collection: 'bestseller', badge_ar: 'الأعلى طلباً', badge_en: 'Top Rated' }
  },
  {
    id: 'sec-values-carousel',
    type: 'values_carousel',
    title_ar: 'قيم والتزامات سيليكشن القهوة',
    title_en: 'Our Core Brand Values & Guarantees',
    is_enabled: true,
    sort_order: 7,
    config: {
      items: [
        { icon: 'Leaf', title_ar: 'مصداقية و تجارة عادل', title_en: 'Direct Trade', desc_ar: 'نعمل مباشرة مع المزارع بدون وسطاء لضمان عوائد عادلة', desc_en: 'Working directly with farms ensuring fair farmer income' },
        { icon: 'Flame', title_ar: 'تحميص طازج أسبوعياً', title_en: 'Fresh Weekly Roast', desc_ar: 'نحمص المحاصيل كل أسبوع لضمان أقصى طزاجة', desc_en: 'We roast fresh every week for maximum freshness' },
        { icon: 'Award', title_ar: 'جودة SCA معتمدة', title_en: 'SCA Certified Quality', desc_ar: 'نختار كل محصول بأعلى معايير جودة السبيشياليتي', desc_en: 'Every crop scored above 84 points by SCA standards' },
        { icon: 'Coffee', title_ar: 'تحميص يدوي بعناية', title_en: 'Artisan Hand Roasted', desc_ar: 'كل دفعة محمصة يدوياً بخبرة وعناية فائقة', desc_en: 'Every batch artisan roasted with extreme care' },
        { icon: 'Heart', title_ar: 'مجتمع القهوة', title_en: 'Coffee Community', desc_ar: 'نبني مجتمع عشاق القهوة المختصة في المملكة', desc_en: "Building Saudi Arabia's specialty coffee community" },
        { icon: 'Recycle', title_ar: 'استدامة بيئية', title_en: 'Eco-Sustainable', desc_ar: 'تغليف صديق للبيئة وممارسات مستدامة في كل مرحلة', desc_en: 'Eco-friendly packaging and sustainable practices' }
      ]
    }
  },
  {
    id: 'sec-drip-bags',
    type: 'product_carousel',
    title_ar: 'أظرف القهوة المقطرة السريعة (Drip Bags)',
    title_en: 'Ready Specialty Drip Coffee Bags',
    subtitle_ar: 'جاهزة للتحضير السريع في المكتب وفي السفر بدون أدوات معقدة',
    subtitle_en: 'Pre-portioned specialty drip bags for instant brewing anywhere',
    is_enabled: true,
    sort_order: 8,
    config: { collection: 'all', categorySlug: 'drip-bags', badge_ar: 'مثالي للعمل والأسفار', badge_en: 'Travel Ready' }
  },
  {
    id: 'sec-equipment-gear',
    type: 'product_carousel',
    title_ar: 'معدات وأدوات التحضير والباريستا',
    title_en: 'Specialty Brewing Gear & Barista Tools',
    subtitle_ar: 'أدوات V60، طواحين يدوية احترافية، موازين ذكية وأبريق التقطير',
    subtitle_en: 'Precision grinders, V60 drippers, scales, and gooseneck kettles',
    is_enabled: true,
    sort_order: 9,
    config: { collection: 'all', categorySlug: 'equipment', badge_ar: 'أدوات معتمدة', badge_en: 'Pro Gear' }
  },
  {
    id: 'sec-roastery-story',
    type: 'roastery_story',
    is_enabled: true,
    sort_order: 10,
    config: {
      title_ar: 'فلسفة التحميص في محمصة سيليكشن القهوة',
      title_en: 'The Roasting Philosophy at Selection Coffee',
      subtitle_ar: 'نحن لا نحمص القهوة فحسب، بل ننقب عن أجود السلالات حول العالم من المزارع المستدامة مباشرة.',
      subtitle_en: 'We do not just roast beans; we carefully source top 1% specialty micro-lots directly from ethical farmers.',
      video_url: 'https://www.w3schools.com/html/mov_bbb.mp4'
    }
  },
  {
    id: 'sec-testimonials',
    type: 'testimonials',
    title_ar: 'ماذا يقول عملاؤنا عن قهوة سيليكشن؟',
    title_en: 'What Our Coffee Community Says',
    is_enabled: true,
    sort_order: 11,
    config: {
      items: [
        { name_ar: 'سعود الحربي', name_en: 'Saud Al-Harbi', role_ar: 'باريستا ومحب قهوة', role_en: 'Barista & Coffee Enthusiast', rating: 5, comment_ar: 'أفضل قهوة مختصة جربتها في السعودية. محصول إثيوبيا شلشلي كان خرافي مع تحضير V60.', comment_en: 'Best specialty coffee I\'ve tried in Saudi Arabia. The Ethiopia Chelchele was incredible with V60.' },
        { name_ar: 'نورة القحطاني', name_en: 'Noura Al-Qahtani', role_ar: 'باريستا منزلي', role_en: 'Home Barista', rating: 5, comment_ar: 'صندوق الاكتشاف كان هدية مثالية. كل محصول كان أجمل من الثاني. التغليف فخم جداً.', comment_en: 'The Discovery Box was a perfect gift. Every crop was better than the last. Premium packaging too.' },
        { name_ar: 'فهد العتيبي', name_en: 'Fahd Al-Otaibi', role_ar: 'محمم قهوة', role_en: 'Coffee Roaster', rating: 5, comment_ar: 'جودة التحميص ممتازة. استخدمت الإسبرسو بلند他们在拿铁 وطلع كريمي وغني.', comment_en: "Excellent roast quality. I use their espresso blend for lattes and it's rich and creamy." }
      ]
    }
  },
  {
    id: 'sec-newsletter',
    type: 'newsletter',
    is_enabled: true,
    sort_order: 12,
    config: {}
  }
];

const initialAnnouncementBar: AnnouncementBarConfig = {
  is_enabled: true,
  text_ar: '🎉 شحن مجاني لجميع الطلبات داخل المملكة بقيمة 199 ﷼ أو أكثر! واستخدم كود WELCOME10 للحصول على خصم 10%',
  text_en: '🎉 FREE Shipping on all Saudi orders over 199 SAR! Use code WELCOME10 for 10% OFF!',
  link: '/products',
  bg_color: '#1C1613',
  text_color: '#D99B26',
  free_shipping_threshold: 199
};

const initialStoreSettings: StoreSettings = {
  store_name_ar: 'محمصة سيليكشن القهوة المختصة',
  store_name_en: 'Selection Specialty Coffee Roasters',
  vat_number: '310928374800003',
  vat_rate: 0.15,
  free_shipping_threshold: 199,
  default_currency: 'SAR',
  support_phone: '+966 9200 12345',
  support_email: 'care@selection.coffee',
  whatsapp_number: '+966500000000',
  address_ar: 'طريق الملك فهد - حي حطين - الرياض - المملكة العربية السعودية',
  address_en: 'King Fahd Road - Hittin Dist. - Riyadh - Saudi Arabia',
  instagram_url: 'https://instagram.com/selection.sa',
  twitter_url: 'https://x.com/selection.sa',
  tiktok_url: 'https://tiktok.com/@selection.sa',
  enable_loyalty: true,
  points_per_sar: 1, // 1 point per 1 SAR spent
  sar_per_point: 0.05 // 20 points = 1 SAR discount
};

const initialQuizConfig: QuizConfig = {
  settings: {
    base_score: 70,
    results_count: 3,
    badge_ar: 'مستشار القهوة الذكي',
    badge_en: 'Interactive Coffee Selector',
    title_ar: 'اكتشف المحصول المخصص لذوقك بـ 30 ثانية',
    title_en: 'Discover Your Ideal Specialty Crop in 30 Secs',
    subtitle_ar: 'أجب عن 3 أسئلة بسيطة وسيقوم الخوارزمية الخاصة بسيليكشن باقتراح القهوة الأكثر ملاءمة لمعايير تحضيرك.',
    subtitle_en: 'Answer 3 simple questions to find the perfect micro-lot matched to your brew preference.'
  },
  questions: [
    {
      id: 'q-brew-method',
      title_ar: 'ما هي طريقتك الأساسية في تحضير القهوة؟',
      title_en: 'What is your primary brewing method?',
      sort_order: 1,
      is_enabled: true,
      options: [
        { id: 'v60', label_ar: 'الترشيح V60 / كاليتا / أظرف مقطرة', label_en: 'Filter V60 / Kalita / Drip Bags', icon: '☕️', score_rules: [{ field: 'process_ar', operator: 'includes', value: 'مجففة', points: 15 }, { field: 'process_en', operator: 'includes', value: 'natural', points: 15 }, { field: 'process_en', operator: 'includes', value: 'dried', points: 15 }] },
        { id: 'espresso', label_ar: 'الإسبرسو ومشروبات الحليب (اللاتيه)', label_en: 'Espresso & Milk Drinks', icon: '🥛', score_rules: [{ field: 'name_ar', operator: 'includes', value: 'مزيج', points: 20 }, { field: 'name_en', operator: 'includes', value: 'blend', points: 20 }, { field: 'process_ar', operator: 'includes', value: 'غسول', points: 20 }, { field: 'process_en', operator: 'includes', value: 'washed', points: 20 }] },
        { id: 'frenchpress', label_ar: 'المكابس الفرنساوية / القهوة الباردة Cold Brew', label_en: 'French Press / Cold Brew', icon: '🧊', score_rules: [] },
        { id: 'saudi', label_ar: 'القهوة السعودية التقليدية الهيل والزعفران', label_en: 'Traditional Saudi Coffee', icon: '🇸🇦', score_rules: [] }
      ]
    },
    {
      id: 'q-flavor',
      title_ar: 'ما هي طابع النكهات والإيحاءات التي تفضلها في الكوب؟',
      title_en: 'Which flavor notes do you prefer?',
      sort_order: 2,
      is_enabled: true,
      options: [
        { id: 'fruity', label_ar: 'فاكهية ياسمين وتوت وأزهار عطرية', label_en: 'Fruity, Floral, Jasmine & Berry', icon: '🫐', score_rules: [{ field: 'tasting_notes_ar', operator: 'includes', value: 'توت', points: 15 }, { field: 'tasting_notes_en', operator: 'includes', value: 'berry', points: 15 }, { field: 'tasting_notes_ar', operator: 'includes', value: 'ورد', points: 15 }, { field: 'tasting_notes_en', operator: 'includes', value: 'floral', points: 15 }] },
        { id: 'chocolate', label_ar: 'شوكولاتة فاخرة ومكسرات كاجو ولوز', label_en: 'Dark Chocolate, Nuts & Almond', icon: '🍫', score_rules: [{ field: 'tasting_notes_ar', operator: 'includes', value: 'شوكولاتة', points: 15 }, { field: 'tasting_notes_en', operator: 'includes', value: 'chocolate', points: 15 }, { field: 'tasting_notes_ar', operator: 'includes', value: 'مكسرات', points: 15 }, { field: 'tasting_notes_en', operator: 'includes', value: 'nut', points: 15 }] },
        { id: 'caramel', label_ar: 'حلاوة كراميل وعسل صافي متوازن', label_en: 'Caramel Sweetness & Honey', icon: '🍯', score_rules: [{ field: 'tasting_notes_ar', operator: 'includes', value: 'كراميل', points: 15 }, { field: 'tasting_notes_en', operator: 'includes', value: 'caramel', points: 15 }, { field: 'tasting_notes_ar', operator: 'includes', value: 'عسل', points: 15 }, { field: 'tasting_notes_en', operator: 'includes', value: 'honey', points: 15 }] },
        { id: 'citrus', label_ar: 'حمضية منعشة مثل الخوخ والعنب الأحمر', label_en: 'Crisp Citrus, Peach & Red Grape', icon: '🍑', score_rules: [{ field: 'tasting_notes_ar', operator: 'includes', value: 'حمضية', points: 15 }, { field: 'tasting_notes_en', operator: 'includes', value: 'citrus', points: 15 }, { field: 'tasting_notes_ar', operator: 'includes', value: 'خوخ', points: 15 }, { field: 'tasting_notes_en', operator: 'includes', value: 'peach', points: 15 }] }
      ]
    },
    {
      id: 'q-roast',
      title_ar: 'اختر درجة التحميص المفضلة لديك',
      title_en: 'Preferred Roast Level',
      sort_order: 3,
      is_enabled: true,
      options: [
        { id: 'light', label_ar: 'تحميص خفيف (لإبراز الحمضية والفاكهة)', label_en: 'Light Roast (Filter Oriented)', icon: '', score_rules: [{ field: 'roast_level_ar', operator: 'includes', value: 'خفيفة', points: 15 }, { field: 'roast_level_en', operator: 'includes', value: 'light', points: 15 }] },
        { id: 'medium', label_ar: 'تحميص متوسط (متوازن لجميع الطرق)', label_en: 'Medium Roast (Omni-Roast)', icon: '', score_rules: [{ field: 'roast_level_ar', operator: 'includes', value: 'متوسطة', points: 15 }, { field: 'roast_level_en', operator: 'includes', value: 'medium', points: 15 }] },
        { id: 'dark', label_ar: 'تحميص غامق (قوام ثقيل للإسبرسو)', label_en: 'Dark Roast (Rich Espresso)', icon: '', score_rules: [{ field: 'roast_level_ar', operator: 'includes', value: 'داكنة', points: 15 }, { field: 'roast_level_en', operator: 'includes', value: 'dark', points: 15 }] }
      ]
    }
  ]
};

class Database {
  private state: DatabaseState;

  constructor() {
    this.state = {
      products: initialProducts,
      categories: initialCategories,
      orders: initialOrders,
      users: initialUsers,
      coupons: initialCoupons,
      reviews: initialReviews,
      questions: initialQuestions,
      stockNotifications: [],
      loyaltyTransactions: [],
      homepageSections: initialHomepageSections,
      announcementBar: initialAnnouncementBar,
      storeSettings: initialStoreSettings,
      wholesaleSubmissions: [],
      contactSubmissions: [],
      newsletterSubscribers: [],
      banners: [],
      quizConfig: initialQuizConfig
    };

    if (useKV) {
      // Load the durable snapshot from KV first, then migrate the admin user.
      // All reads await this.ready, so a warm instance never serves stale state.
      this.ready = this.loadFromKV().then(() => {
        this.migrateAdminUser();
      }).catch(err => {
        console.error('KV init failed, falling back to seed state:', err);
        this.migrateAdminUser();
      });
    } else {
      this.loadState();
      this.migrateAdminUser();
    }
  }

  /** Resolves once the durable store has been loaded (always resolved locally). */
  ready: Promise<void> = Promise.resolve();

  /** Serialized write queue for KV so concurrent mutations can't clobber each other. */
  private _kvWrite: Promise<void> = Promise.resolve();

  /** Incremented on every saveState() so a KV refresh never overwrites newer in-memory changes. */
  private _mutGen = 0;

  private _lastKvRefresh = 0;

  private applyParsed(parsed: any) {
    this.state = {
      ...this.state,
      ...parsed,
      products: (parsed.products || initialProducts).map((p: any) => ({
        ...p,
        weight_options: p.weight_options || [],
        grind_options: p.grind_options || [],
        tasting_notes_ar: p.tasting_notes_ar || [],
        tasting_notes_en: p.tasting_notes_en || [],
        images: p.images || []
      })),
      categories: parsed.categories || initialCategories,
      orders: parsed.orders || initialOrders,
      users: parsed.users || initialUsers,
      coupons: parsed.coupons || initialCoupons,
      reviews: parsed.reviews || initialReviews,
      questions: parsed.questions || initialQuestions,
      stockNotifications: parsed.stockNotifications || [],
      loyaltyTransactions: parsed.loyaltyTransactions || [],
      homepageSections: parsed.homepageSections || initialHomepageSections,
      wholesaleSubmissions: parsed.wholesaleSubmissions || [],
      contactSubmissions: parsed.contactSubmissions || [],
      newsletterSubscribers: parsed.newsletterSubscribers || [],
      banners: parsed.banners || [],
      quizConfig: Array.isArray(parsed.quizConfig) ? { ...initialQuizConfig, questions: parsed.quizConfig } : (parsed.quizConfig?.questions ? parsed.quizConfig : initialQuizConfig)
    };
  }

  private async loadFromKV(): Promise<void> {
    try {
      const res = await fetch(`${KV_URL}/get/${KV_KEY}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      });
      const data = await res.json() as any;
      const raw = data?.result ?? data?.value ?? null;
      if (raw && typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.applyParsed(parsed);
          this._lastKvRefresh = Date.now();
          return;
        }
      }
    } catch (err) {
      console.error('Error loading store from KV:', err);
    }
    // Nothing durable yet — persist the seed so future cold starts read it.
    this._lastKvRefresh = Date.now();
    this.saveState();
  }

  /**
   * Re-reads the durable snapshot into memory at most once per interval.
   * On Vercel multiple warm instances share one KV key, so a request may hit
   * an instance whose in-memory copy is older than the last mutation made by
   * another instance (e.g. the webhook marking an order paid). Called by the
   * request middleware before handling. Local runs (file store) are a no-op.
   */
  async refreshIfStale(intervalMs = 2000): Promise<void> {
    if (!useKV) return;
    const now = Date.now();
    if (now - this._lastKvRefresh < intervalMs) return;
    const genAtStart = this._mutGen;
    try {
      const res = await fetch(`${KV_URL}/get/${KV_KEY}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      });
      const data = await res.json() as any;
      const raw = data?.result ?? data?.value ?? null;
      this._lastKvRefresh = Date.now();
      if (raw && typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && genAtStart === this._mutGen) {
          this.applyParsed(parsed);
        }
      }
    } catch (err) {
      console.error('KV refresh error (serving from memory):', err);
      this._lastKvRefresh = Date.now();
    }
  }

  private loadState() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        let raw = fs.readFileSync(DATA_FILE, 'utf-8');
        if (raw.charCodeAt(0) === 0xFEFF) { raw = raw.slice(1); }
        this.applyParsed(JSON.parse(raw));
      } else {
        this.saveState();
      }
    } catch (err) {
      console.error('Error loading data-store.json, resetting to initial state:', err);
      this.saveState();
    }
  }

  private saveState() {
    this._mutGen += 1;
    const payload = JSON.stringify(this.state, null, 2);
    if (useKV) {
      // Fire-and-forget but serialized: every mutation enqueues behind the
      // previous write. Call flush() on critical routes to guarantee the
      // snapshot is durable before the request responds.
      this._kvWrite = this._kvWrite.then(() =>
        fetch(`${KV_URL}/set/${KV_KEY}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: payload })
        }).then(res => {
          if (!res.ok) console.error('KV save error:', res.status, res.statusText);
        }).catch(err => console.error('KV save error:', err))
      );
    } else {
      try {
        fs.writeFileSync(DATA_FILE, payload, 'utf-8');
      } catch (err) {
        console.error('Error saving DB state:', err);
      }
    }
  }

  /** Waits until all pending writes to the durable store have completed. */
  async flush() {
    if (useKV) {
      await this._kvWrite;
    }
  }

  private migrateAdminUser() {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@selection.sa';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminUser = this.state.users.find(u => u.id === 'usr-admin-1');
    if (adminUser) {
      adminUser.email = adminEmail;
      adminUser.password = adminPassword;
    } else {
      this.state.users.unshift({
        id: 'usr-admin-1',
        name: 'مدير النظام (Admin)',
        email: adminEmail,
        phone: '+966500000000',
        password: adminPassword,
        role: 'admin',
        loyalty_points: 1500,
        addresses: [],
        created_at: new Date(Date.now() - 30 * 86400000).toISOString()
      });
    }
    this.saveState();
  }

  // Categories
  getCategories() {
    return this.state.categories.sort((a, b) => a.sort_order - b.sort_order);
  }

  getCategoryBySlug(slug: string) {
    return this.state.categories.find(c => c.slug === slug);
  }

  saveCategory(category: Category) {
    const idx = this.state.categories.findIndex(c => c.id === category.id);
    if (idx >= 0) {
      this.state.categories[idx] = category;
    } else {
      this.state.categories.push(category);
    }
    this.saveState();
    return category;
  }

  deleteCategory(id: string) {
    this.state.categories = this.state.categories.filter(c => c.id !== id);
    this.saveState();
  }

  // Products
  getProducts(filters?: {
    category_id?: string;
    category_slug?: string;
    search?: string;
    is_new?: boolean;
    is_bestseller?: boolean;
    is_featured?: boolean;
    grind?: string;
    process?: string;
    origin?: string;
    min_price?: number;
    max_price?: number;
    sort_by?: 'newest' | 'price_low' | 'price_high' | 'rating' | 'popular';
  }) {
    let list = [...this.state.products];

    if (filters?.category_slug) {
      const cat = this.getCategoryBySlug(filters.category_slug);
      if (cat) {
        list = list.filter(p => p.category_id === cat.id);
      }
    } else if (filters?.category_id) {
      list = list.filter(p => p.category_id === filters.category_id);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(p =>
        (p.name_ar || '').toLowerCase().includes(q) ||
        (p.name_en || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.origin_country_ar || '').toLowerCase().includes(q) ||
        (p.origin_country_en || '').toLowerCase().includes(q) ||
        (p.process_ar || '').toLowerCase().includes(q) ||
        (p.tasting_notes_ar || []).some(n => (n || '').toLowerCase().includes(q)) ||
        (p.tasting_notes_en || []).some(n => (n || '').toLowerCase().includes(q))
      );
    }

    if (filters?.is_new) list = list.filter(p => p.is_new);
    if (filters?.is_bestseller) list = list.filter(p => p.is_bestseller);
    if (filters?.is_featured) list = list.filter(p => p.is_featured);

    if (filters?.process) {
      list = list.filter(p => (p.process_en || '').toLowerCase().includes(filters.process!.toLowerCase()) || (p.process_ar || '').includes(filters.process!));
    }

    if (filters?.origin) {
      list = list.filter(p => (p.origin_country_en || '').toLowerCase() === filters.origin!.toLowerCase() || (p.origin_country_ar || '') === filters.origin);
    }

    if (filters?.min_price !== undefined) {
      list = list.filter(p => (p.sale_price ?? p.price) >= filters.min_price!);
    }

    if (filters?.max_price !== undefined) {
      list = list.filter(p => (p.sale_price ?? p.price) <= filters.max_price!);
    }

    if (filters?.sort_by) {
      switch (filters.sort_by) {
        case 'newest':
          list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
        case 'price_low':
          list.sort((a, b) => (a.sale_price ?? a.price) - (b.sale_price ?? b.price));
          break;
        case 'price_high':
          list.sort((a, b) => (b.sale_price ?? b.price) - (a.sale_price ?? a.price));
          break;
        case 'rating':
          list.sort((a, b) => b.rating - a.rating);
          break;
        case 'popular':
          list.sort((a, b) => b.sold_count - a.sold_count);
          break;
      }
    }

    return list;
  }

  getProductBySlug(slug: string) {
    return this.state.products.find(p => p.slug === slug);
  }

  getProductById(id: string) {
    return this.state.products.find(p => p.id === id);
  }

  saveProduct(product: Product) {
    const idx = this.state.products.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      this.state.products[idx] = product;
    } else {
      this.state.products.push(product);
    }
    this.saveState();
    return product;
  }

  deleteProduct(id: string) {
    this.state.products = this.state.products.filter(p => p.id !== id);
    this.saveState();
  }

  // Users & Auth
  getUsers() {
    return this.state.users;
  }

  getUserById(id: string) {
    return this.state.users.find(u => u.id === id);
  }

  getUserByEmail(email: string) {
    return this.state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(user: User) {
    this.state.users.push(user);
    this.saveState();
    return user;
  }

  updateUser(user: User) {
    const idx = this.state.users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      this.state.users[idx] = user;
      this.saveState();
    }
    return user;
  }

  deleteUser(id: string) {
    this.state.users = this.state.users.filter(u => u.id !== id);
    this.saveState();
  }

  addLoyaltyTransaction(transaction: LoyaltyTransaction) {
    this.state.loyaltyTransactions.push(transaction);
    this.saveState();
  }

  getLoyaltyTransactions(userId?: string) {
    if (userId) {
      return this.state.loyaltyTransactions.filter(tx => tx.user_id === userId);
    }
    return this.state.loyaltyTransactions;
  }

  getUserStats(userId: string) {
    const orders = this.getOrders(userId);
    const reviews = this.state.reviews.filter(r => r.user_id === userId);
    const transactions = this.getLoyaltyTransactions(userId);
    return {
      total_orders: orders.length,
      total_spent: orders.reduce((sum, o) => sum + o.total_amount, 0),
      last_order_date: orders.length > 0 ? orders[0].created_at : null,
      total_reviews: reviews.length,
      total_loyalty_earned: transactions.filter(tx => tx.type !== 'redeemed').reduce((sum, t) => sum + t.points, 0),
      total_loyalty_redeemed: transactions.filter(tx => tx.type === 'redeemed').reduce((sum, t) => sum + t.points, 0),
    };
  }

  getUserReviews(userId: string) {
    return this.state.reviews.filter(r => r.user_id === userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getUserAddresses(userId: string) {
    const user = this.getUserById(userId);
    return user?.addresses || [];
  }

  // Orders
  getOrders(user_id?: string) {
    if (user_id) {
      const user = this.getUserById(user_id);
      const userEmail = user?.email ? String(user.email).trim().toLowerCase() : '';
      return this.state.orders
        .filter(o => {
          if (o.user_id === user_id) return true;
          // Guest orders (no user_id) are linked to the account by email so
          // the customer can see every order they placed under that email.
          if (userEmail && o.email && String(o.email).trim().toLowerCase() === userEmail) return true;
          return false;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return [...this.state.orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /**
   * Backfills user_id on past guest orders whose email matches the given
   * account, so login/registration ties historical orders to the user.
   */
  linkOrdersToUser(userId: string, email: string) {
    if (!userId || !email) return;
    const targetEmail = String(email).trim().toLowerCase();
    let changed = false;
    for (const o of this.state.orders) {
      if (!o.user_id && o.email && String(o.email).trim().toLowerCase() === targetEmail) {
        o.user_id = userId;
        changed = true;
      }
    }
    if (changed) this.saveState();
  }

  getNewOrdersSince(since: string) {
    const sinceDate = new Date(since).getTime();
    return this.state.orders.filter(o => new Date(o.created_at).getTime() > sinceDate);
  }

  getOrderByNumber(orderNumber: string) {
    return this.state.orders.find(o => o.order_number === orderNumber || o.id === orderNumber);
  }

  getOrderById(id: string) {
    return this.state.orders.find(o => o.id === id);
  }

  updateOrderTracking(orderId: string, trackingNumber: string, trackingUrl: string) {
    const order = this.state.orders.find(o => o.id === orderId);
    if (order) {
      order.tracking_number = trackingNumber;
      order.tracking_url = trackingUrl;
      this.saveState();
    }
    return order;
  }

  createOrder(orderData: Omit<Order, 'id' | 'order_number' | 'created_at' | 'status_history'>) {
    const orderNumber = `FK-${Math.floor(10000 + Math.random() * 90000)}`;
    const timestamp = new Date().toISOString();
    // Orders paid upfront (e.g. Tabby/Tamara) are immediately marked "تم الدفع".
    const paidUpfront = orderData.payment_status === 'paid' && orderData.status === 'pending';
    const newOrder: Order = {
      ...orderData,
      status: paidUpfront ? 'paid' : orderData.status,
      id: `ord-${Date.now()}`,
      order_number: orderNumber,
      created_at: timestamp,
      status_history: [
        {
          status: orderData.status,
          timestamp,
          note_ar: 'تم إنشاء الطلب بنجاح',
          note_en: 'Order successfully created'
        },
        ...(paidUpfront ? [{
          status: 'paid' as Order['status'],
          timestamp,
          note_ar: 'تم دفع قيمة الطلب',
          note_en: 'Order payment received'
        }] : [])
      ]
    };

    // Auto-generate tracking number for SMSA shipments
    if (newOrder.shipping_method === 'smsa') {
      const smsaTracking = `SMSA${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      newOrder.tracking_number = smsaTracking;
      newOrder.tracking_url = `https://www.smsaexpress.com/tracking/${smsaTracking}`;
    }

    // Deduct stock
    for (const item of newOrder.items) {
      const prod = this.getProductById(item.product_id);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        prod.sold_count += item.quantity;
        this.saveProduct(prod);
      }
    }

    // Award loyalty points if registered user
    if (newOrder.user_id && this.state.storeSettings.enable_loyalty) {
      const pointsEarned = Math.floor(newOrder.total_amount * this.state.storeSettings.points_per_sar);
      const user = this.getUserById(newOrder.user_id);
      if (user) {
        user.loyalty_points += pointsEarned;
        this.updateUser(user);
        newOrder.loyalty_points_earned = pointsEarned;

        this.state.loyaltyTransactions.push({
          id: `lt-${Date.now()}`,
          user_id: user.id,
          type: 'earned',
          points: pointsEarned,
          amount_sar: newOrder.total_amount,
          order_id: newOrder.id,
          description_ar: `نقاط مكتسبة من الطلب ${orderNumber}`,
          description_en: `Points earned from order ${orderNumber}`,
          created_at: new Date().toISOString()
        });
      }
    }

    // Deduct redeemed loyalty points
    if (newOrder.loyalty_points_used && newOrder.loyalty_points_used > 0 && newOrder.user_id) {
      const user = this.getUserById(newOrder.user_id);
      if (user && user.loyalty_points >= newOrder.loyalty_points_used) {
        user.loyalty_points -= newOrder.loyalty_points_used;
        this.updateUser(user);
        this.state.loyaltyTransactions.push({
          id: `lt-${Date.now()}-redeem`,
          user_id: user.id,
          type: 'redeemed',
          points: newOrder.loyalty_points_used,
          amount_sar: -(newOrder.loyalty_discount || 0),
          order_id: newOrder.id,
          description_ar: `استبدال نقاط في الطلب ${orderNumber}`,
          description_en: `Points redeemed in order ${orderNumber}`,
          created_at: new Date().toISOString()
        });
      }
    }

    this.state.orders.push(newOrder);
    // Tie any earlier guest orders placed with the same email to this user.
    if (newOrder.user_id && newOrder.email) {
      this.linkOrdersToUser(newOrder.user_id, newOrder.email);
    }
    this.saveState();
    return newOrder;
  }

  updateOrderStatus(orderId: string, status: Order['status'], note_ar?: string, note_en?: string) {
    const order = this.state.orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      order.status_history.push({
        status,
        timestamp: new Date().toISOString(),
        note_ar: note_ar || `تغيرت حالة الطلب إلى ${status}`,
        note_en: note_en || `Order status updated to ${status}`
      });
      this.saveState();
    }
    return order;
  }

  updateOrderPaymentStatus(orderId: string, paymentStatus: Order['payment_status'], paymentIntentId?: string) {
    const order = this.state.orders.find(o => o.id === orderId);
    if (order) {
      order.payment_status = paymentStatus;
      // Keep the fulfillment status in sync: a paid order is shown as "تم الدفع".
      if (paymentStatus === 'paid' && order.status === 'pending') {
        order.status = 'paid';
        order.status_history.push({
          status: 'paid',
          timestamp: new Date().toISOString(),
          note_ar: 'تم دفع قيمة الطلب',
          note_en: 'Order payment received'
        });
      }
      if (paymentIntentId) order.payment_intent_id = paymentIntentId;
      this.saveState();
    }
    return order;
  }

  deleteOrder(orderId: string) {
    this.state.orders = this.state.orders.filter(o => o.id !== orderId && o.order_number !== orderId);
    this.saveState();
  }

  // Coupons
  getCoupons() {
    return this.state.coupons;
  }

  getCouponByCode(code: string) {
    return this.state.coupons.find(c => c.code.toUpperCase() === code.toUpperCase() && c.is_active);
  }

  validateCoupon(code: string, subtotal: number) {
    const coupon = this.getCouponByCode(code);
    if (!coupon) {
      return { valid: false, message_ar: 'كود الخصم غير صحيح أو منتهي الصلاحية', message_en: 'Invalid or expired coupon code' };
    }

    if (new Date(coupon.valid_until).getTime() < Date.now()) {
      return { valid: false, message_ar: 'انتهت صلاحية كود الخصم', message_en: 'Coupon code has expired' };
    }

    if (coupon.usage_count >= coupon.usage_limit) {
      return { valid: false, message_ar: 'تم تجاوز الحد الأقصى لاستخدام الكود', message_en: 'Coupon usage limit reached' };
    }

    if (subtotal < coupon.min_order_amount) {
      return {
        valid: false,
        message_ar: `الحد الأدنى لاستخدام هذا الكود هو ${coupon.min_order_amount} ﷼`,
        message_en: `Minimum order amount for this coupon is ${coupon.min_order_amount} SAR`
      };
    }

    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = (subtotal * coupon.discount_value) / 100;
      if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
        discountAmount = coupon.max_discount_amount;
      }
    } else if (coupon.discount_type === 'fixed') {
      discountAmount = coupon.discount_value;
    } else if (coupon.discount_type === 'free_shipping') {
      discountAmount = 0; // handled in shipping logic
    }

    return { valid: true, coupon, discountAmount };
  }

  saveCoupon(coupon: Coupon) {
    const idx = this.state.coupons.findIndex(c => c.id === coupon.id);
    if (idx >= 0) {
      this.state.coupons[idx] = coupon;
    } else {
      this.state.coupons.push(coupon);
    }
    this.saveState();
    return coupon;
  }

  deleteCoupon(id: string) {
    this.state.coupons = this.state.coupons.filter(c => c.id !== id);
    this.saveState();
  }

  // Reviews & Questions
  getAllReviews(productId?: string) {
    if (productId) {
      return this.state.reviews.filter(r => r.product_id === productId);
    }
    return this.state.reviews;
  }

  updateReviewStatus(id: string, status: Review['status']) {
    const review = this.state.reviews.find(r => r.id === id);
    if (review) {
      review.status = status;
      this.saveState();
    }
    return review;
  }

  updateReviewReply(id: string, reply_ar?: string, reply_en?: string) {
    const review = this.state.reviews.find(r => r.id === id);
    if (review) {
      review.staff_reply_ar = reply_ar || '';
      review.staff_reply_en = reply_en || '';
      this.saveState();
    }
    return review;
  }

  hasDeliveredPurchase(userId: string, productId: string) {
    const user = this.getUserById(userId);
    const userEmail = user?.email ? String(user.email).trim().toLowerCase() : '';
    return this.state.orders.some(
      o =>
        (o.user_id === userId ||
          (userEmail && o.email && String(o.email).trim().toLowerCase() === userEmail)) &&
        o.status === 'delivered' &&
        o.items.some(i => i.product_id === productId)
    );
  }

  deleteReview(id: string) {
    this.state.reviews = this.state.reviews.filter(r => r.id !== id);
    this.saveState();
  }

  getAllQuestions() {
    return this.state.questions;
  }

  deleteQuestion(id: string) {
    this.state.questions = this.state.questions.filter(q => q.id !== id);
    this.saveState();
  }

  // Newsletter
  addNewsletterSubscriber(email: string) {
    const existing = this.state.newsletterSubscribers.find(
      (s: any) => (typeof s === 'string' ? s : s.email) === email.toLowerCase()
    );
    if (!existing) {
      this.state.newsletterSubscribers.push({
        id: `nl-${Date.now()}`,
        email: email.toLowerCase(),
        created_at: new Date().toISOString()
      });
      this.saveState();
    }
    return { email: email.toLowerCase(), subscribed_at: new Date().toISOString() };
  }

  getNewsletterSubscribers() {
    return this.state.newsletterSubscribers.map((s: any) =>
      typeof s === 'string'
        ? { id: `nl-migrated-${s}`, email: s, created_at: new Date().toISOString() }
        : s
    );
  }

  deleteNewsletterSubscriber(id: string) {
    this.state.newsletterSubscribers = this.state.newsletterSubscribers.filter((s: any) =>
      typeof s === 'string' ? s !== id : s.id !== id
    );
    this.saveState();
  }
  getReviews(productId?: string) {
    if (productId) {
      return this.state.reviews.filter(r => r.product_id === productId && r.status === 'approved');
    }
    return this.state.reviews;
  }

  addReview(review: Omit<Review, 'id' | 'created_at' | 'status'>) {
    const newRev: Review = {
      ...review,
      id: `rev-${Date.now()}`,
      status: 'approved', // Auto-approve for instant feedback
      created_at: new Date().toISOString()
    };
    this.state.reviews.push(newRev);

    // Recalculate product rating
    const prodReviews = this.state.reviews.filter(r => r.product_id === review.product_id && r.status === 'approved');
    const totalRating = prodReviews.reduce((sum, r) => sum + r.rating, 0);
    const prod = this.getProductById(review.product_id);
    if (prod) {
      prod.review_count = prodReviews.length;
      prod.rating = parseFloat((totalRating / prodReviews.length).toFixed(1));
      this.saveProduct(prod);
    }

    this.saveState();
    return newRev;
  }

  getQuestions(productId?: string) {
    if (productId) {
      return this.state.questions.filter(q => q.product_id === productId && q.status === 'approved');
    }
    return this.state.questions;
  }

  addQuestion(q: Omit<ProductQuestion, 'id' | 'created_at' | 'status'>) {
    const newQ: ProductQuestion = {
      ...q,
      id: `q-${Date.now()}`,
      status: 'approved',
      created_at: new Date().toISOString()
    };
    this.state.questions.push(newQ);
    this.saveState();
    return newQ;
  }

  answerQuestion(id: string, answer_ar: string, answer_en: string) {
    const q = this.state.questions.find(item => item.id === id);
    if (q) {
      q.answer_ar = answer_ar;
      q.answer_en = answer_en;
      q.status = 'approved';
      this.saveState();
    }
    return q;
  }

  // Stock Notifications
  addStockNotification(sub: Omit<StockNotification, 'id' | 'created_at' | 'status'>) {
    const newSub: StockNotification = {
      ...sub,
      id: `stock-${Date.now()}`,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    this.state.stockNotifications.push(newSub);
    this.saveState();
    return newSub;
  }

  getStockNotifications() {
    return this.state.stockNotifications;
  }

  // Settings & Homepage
  getHomepageSections() {
    return this.state.homepageSections.sort((a, b) => a.sort_order - b.sort_order);
  }

  saveHomepageSections(sections: HomepageSection[]) {
    this.state.homepageSections = sections;
    this.saveState();
    return this.state.homepageSections;
  }

  getAnnouncementBar() {
    return this.state.announcementBar;
  }

  saveAnnouncementBar(config: AnnouncementBarConfig) {
    this.state.announcementBar = config;
    this.saveState();
    return this.state.announcementBar;
  }

  getStoreSettings() {
    return this.state.storeSettings;
  }

  saveStoreSettings(settings: StoreSettings) {
    this.state.storeSettings = settings;
    this.saveState();
    return this.state.storeSettings;
  }

  // Forms
  addWholesaleSubmission(sub: Omit<WholesaleSubmission, 'id' | 'created_at' | 'status'>) {
    const newSub: WholesaleSubmission = {
      ...sub,
      id: `ws-${Date.now()}`,
      status: 'new',
      created_at: new Date().toISOString()
    };
    this.state.wholesaleSubmissions.push(newSub);
    this.saveState();
    return newSub;
  }

  getWholesaleSubmissions() {
    return this.state.wholesaleSubmissions;
  }

  addContactSubmission(sub: Omit<ContactSubmission, 'id' | 'created_at' | 'status'>) {
    const newSub: ContactSubmission = {
      ...sub,
      id: `ct-${Date.now()}`,
      status: 'new',
      created_at: new Date().toISOString()
    };
    this.state.contactSubmissions.push(newSub);
    this.saveState();
    return newSub;
  }

  getContactSubmissions() {
    return this.state.contactSubmissions;
  }

  deleteContactSubmission(id: string) {
    this.state.contactSubmissions = this.state.contactSubmissions.filter(c => c.id !== id);
    this.saveState();
  }

  replyContactSubmission(id: string, reply_ar?: string, reply_en?: string) {
    const sub = this.state.contactSubmissions.find(c => c.id === id);
    if (sub) {
      sub.reply_ar = reply_ar || '';
      sub.reply_en = reply_en || '';
      sub.status = 'resolved';
      sub.replied_at = new Date().toISOString();
      this.saveState();
    }
    return sub;
  }

  updateWholesaleSubmission(id: string, data: Partial<WholesaleSubmission>) {
    const idx = this.state.wholesaleSubmissions.findIndex(s => s.id === id);
    if (idx >= 0) {
      this.state.wholesaleSubmissions[idx] = { ...this.state.wholesaleSubmissions[idx], ...data };
      this.saveState();
    }
    return this.state.wholesaleSubmissions[idx];
  }

  updateStockNotification(id: string, data: Partial<StockNotification>) {
    const idx = this.state.stockNotifications.findIndex(s => s.id === id);
    if (idx >= 0) {
      this.state.stockNotifications[idx] = { ...this.state.stockNotifications[idx], ...data };
      this.saveState();
    }
    return this.state.stockNotifications[idx];
  }

  // Banners
  getBanners(position?: string) {
    let banners = this.state.banners.filter(b => b.is_active);
    if (position) banners = banners.filter(b => b.position === position);
    return banners.sort((a, b) => a.sort_order - b.sort_order);
  }

  getAllBanners() {
    return this.state.banners.sort((a, b) => a.sort_order - b.sort_order);
  }

  saveBanner(banner: Banner) {
    const idx = this.state.banners.findIndex(b => b.id === banner.id);
    if (idx >= 0) {
      this.state.banners[idx] = banner;
    } else {
      this.state.banners.push(banner);
    }
    this.saveState();
    return banner;
  }

  deleteBanner(id: string) {
    this.state.banners = this.state.banners.filter(b => b.id !== id);
    this.saveState();
  }

  // Admin Dashboard Aggregated KPIs
  getDashboardStats() {
    const totalOrders = this.state.orders.length;
    const totalRevenue = this.state.orders.reduce((sum, o) => sum + o.total_amount, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalCustomers = this.state.users.filter(u => u.role === 'customer').length;
    const lowStockProducts = this.state.products.filter(p => p.stock <= 10);
    const recentOrders = this.state.orders.slice(0, 5);

    return {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      totalCustomers,
      lowStockCount: lowStockProducts.length,
      recentOrders,
      lowStockProducts
    };
  }

  getQuizConfig(): QuizConfig {
    return this.state.quizConfig;
  }

  saveQuizConfig(quizConfig: QuizConfig): QuizConfig {
    this.state.quizConfig = quizConfig;
    this.saveState();
    return this.state.quizConfig;
  }
}

export const db = new Database();
