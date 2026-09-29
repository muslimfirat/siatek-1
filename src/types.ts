export type UserRole = 'customer' | 'admin' | 'operasyon';

export interface User {
  id: string;
  email: string;
  name: string;
  companyName?: string;
  phone?: string;
  address?: string;
  city?: string;
  taxNumber?: string;
  taxOffice?: string;
  role: UserRole;
  isDealer?: boolean;
  discountTier?: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: string;
}

export interface LoginCredentials {
  emailOrUsername: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
  companyName: string;
  phone: string;
  address?: string;
  city?: string;
  taxNumber?: string;
  taxOffice?: string;
}

export interface VolumeDiscountTier {
  minQuantity: number;
  discountPercent: number; // e.g. 5 means 5% extra discount
}

export interface Product {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  description: string;
  price: number; // Satış Fiyatı 1 (TRY)
  wholesalePrice?: number; // Satış Fiyatı 2 / Bayi Fiyatı (TRY)
  stock: number;
  unit: string; // 'ADET', 'METRE', 'Paket', 'Koli'
  minOrderQuantity: number;
  imageUrl: string;
  sku: string; // Stok Kodu (ST00xxx)
  barcode?: string; // Barkod (86900000xxxxx)
  vatRate?: number; // 20%
  featured?: boolean;
  brand?: string; // e.g. 'Pilsa', 'ECA', 'Kalde', 'Dizayn', 'DemirDöküm', 'Baymak'
  warehouseLocation?: string; // e.g. 'Raf A-02-04', 'B-01-10'
  minStockAlert?: number; // Minimum kritik stok seviyesi
  volumeTiers?: VolumeDiscountTier[]; // Miktar bazlı kademeli iskonto
}

export interface CartItem {
  product: Product;
  quantity: number;
  customerNote?: string;
}

export type OrderStatus = 
  | 'pending' // Beklemede (Yeni Sipariş)
  | 'approved' // Onaylandı
  | 'preparing' // Hazırlanıyor
  | 'shipped' // Sevk edildi
  | 'ready' // Hazırlandı
  | 'out_for_delivery' // Teslimata Çıktı
  | 'delivered' // Teslim Edildi
  | 'cancelled'; // İptal Edildi

/** Yönetim kabuğunda gerçekten render edilen üst seviye çalışma alanları. */
export const ADMIN_TABS = [
  'home', 'pos', 'orders', 'quotes', 'products', 'barcodes', 'cariler', 'invoices',
  'analytics', 'gider', 'cek-senet', 'kasa', 'alis-faturalari',
  'tedarikci-ekstresi', 'kar-zarar', 'kdv-ozet', 'urun-kar',
  'ops-dispatch', 'ops-drivers', 'ops-sales', 'ops-wms', 'ops-delivery',
  'ortak-arac',
  'settings',
] as const;
export type AdminTab = typeof ADMIN_TABS[number];
export const isAdminTab = (value: string): value is AdminTab =>
  (ADMIN_TABS as readonly string[]).includes(value);

/** Ayrı sekme olmayan, Ayarlar > Sistem içinde açılan araçlar. */
export type AdminSystemTool = 'diagnostics' | 'errors';

export type DeliveryTaskStatus =
  | 'unassigned'
  | 'scheduled'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'rescheduled'
  | 'cancelled';

export interface OrderStatusHistoryItem {
  id?: string;
  status: OrderStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;
  trackingNumber?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  note?: string;
  warehouseLocation?: string;
  isPicked?: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  /**
   * Kaydin sahibi: Firebase Auth UID.
   * Kimlik dogrulamasinin TEK kaynagi budur. E-posta degisebilir, buyuk/kucuk
   * harf farki olusturabilir ve kullanici tarafindan yazilabilir; UID olamaz.
   * Firestore kurallari erisimi bu alana gore verir.
   * Opsiyonel isaretli cunku gecis oncesi eski kayitlarda bulunmuyor.
   */
  customerUid?: string;
  customerId?: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentMethod?: string;
  cariId?: string;
  notes?: string;
  encryptedPayload?: string;
  signatureHash?: string;
  trackingNumber?: string;
  statusHistory?: OrderStatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
  sourceQuoteId?: string; // If created from an accepted quote
  /** Spark plan: müşteri talebinin fiyat/stok doğrulaması yönetici onayında yapılır. */
  pricingVerified?: boolean;
  stockState?: 'unreserved' | 'reserved' | 'released';
  idempotencyKey?: string;
  
  // B2B Ödeme & Dekont
  receiptStatus?: 'none' | 'uploaded' | 'verified' | 'rejected';
  receiptFileUrl?: string;
  receiptFileName?: string;
  receiptNote?: string;
  receiptAmount?: number;
  receiptBankName?: string;
  receiptUploadedAt?: string;
  
  // Şantiye / Sevk Noktası
  constructionSiteName?: string;
  constructionSiteContact?: string;
  constructionSitePhone?: string;
  
  // Kredi Limiti Kontrolü
  isCreditLimitExceeded?: boolean;
  creditLimitApprovedByAdmin?: boolean;

  // Depo & Sevkiyat (WMS Lite)
  pickingStatus?: 'unassigned' | 'in_progress' | 'completed';
  pickedBy?: string;
  pickedAt?: string;
  packageCount?: number;
  shippingCompany?: string;
  waybillNumber?: string;

  // Kendi Teslimat Operasyonu (Faz 3C)
  deliveryStatus?: DeliveryTaskStatus;
  deliveryPersonnel?: string;
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  deliveryVehicle?: string;
  deliveryNote?: string;
  collectionAmount?: number;
  collectionMethod?: 'cash' | 'transfer' | 'none';
  collectionStatus?: 'pending' | 'collected' | 'partially_collected' | 'none';
  failedReason?: string;
  deliveryAttempts?: Array<{
    timestamp: string;
    reason: string;
    personnel?: string;
  }>;
  // Finansal & Tahsilat Uzlaştırma (Teslimat Anı)
  paymentStatus?: OrderPaymentStatus;
  settlementChannel?: 'cash' | 'pos' | 'transfer' | 'cari';
  settledAt?: string;
  settledBy?: string;
  settlementNote?: string;
  cariTransactionId?: string;

  recipientName?: string;
  recipientPhone?: string;
  recipientIdNumber?: string;
  recipientTitle?: string;
  deliveryAddressOverride?: string;
  waybillNotes?: string;
  deliveredAt?: string;
}

export type OrderPaymentStatus = 
  | 'paid'                // Tahsil Edildi (Nakit, POS, Havale)
  | 'on_account'           // Cari Hesaba Borç Yazıldı (Açık Hesap / Vadeli)
  | 'pending_collection'  // Tahsilat Bekliyor (Para Henüz Alınmadı / Riskli)
  | 'partially_paid';     // Kısmi Tahsilat

export type QuoteStatus = 
  | 'pending' // Beklemede (alias for pending_review)
  | 'pending_review' // Müşteri Gönderdi, Yönetici İncelemesinde
  | 'offer_sent' // Yönetici Fiyatlandırdı ve Teklifi Gönderdi
  | 'accepted' // Müşteri Onayladı (Siparişe dönüştü)
  | 'rejected' // Reddedildi
  | 'expired'; // Süresi Doldu

export interface QuoteRequestedItem {
  productId?: string;
  productName: string;
  requestedQuantity: number;
  unit: string;
  targetUnitPrice?: number; // Müşterinin hedef fiyatı (varsa)
  note?: string;
}

export interface QuoteOfferedItem {
  productId?: string;
  itemType?: 'product' | 'labor' | 'service' | 'custom';
  productName: string;
  quantity: number;
  unit: string;
  listPrice: number;
  offeredUnitPrice: number;
  discountRate: number; // Percentage
  totalPrice: number;
  adminNote?: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  /** Kaydin sahibi: Firebase Auth UID. Bkz. Order.customerUid */
  customerUid?: string;
  customerId?: string;
  userId?: string;
  customerName: string;
  customerCompany?: string;
  customerEmail: string;
  customerPhone: string;
  deliveryCity?: string;
  requestedItems?: QuoteRequestedItem[];
  offeredItems?: QuoteOfferedItem[];
  items?: any[];
  subtotal?: number;
  discount?: number;
  discountAmount?: number;
  tax?: number;
  total?: number;
  shippingFee?: number;
  taxRate?: number; // default 20%
  taxAmount?: number;
  grandTotal?: number;
  status: QuoteStatus;
  projectTitle?: string;
  notes?: string;
  customerNote?: string;
  adminResponseNote?: string;
  paymentTerms?: string; // 'Peşin (Nakit/Havale)', 'Kredi Kartı', '30 Gün Vade', '60 Gün Vade'
  validUntil?: string;
  aiSuggestedDiscount?: number;
  aiNotes?: string;
  encryptedConfidentialNote?: string;
  securityHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PushNotification {
  id: string;
  title: string;
  message: string;
  type: 'order_created' | 'order_updated' | 'quote_requested' | 'quote_offered' | 'quote_accepted' | 'security_alert' | 'low_stock' | 'system';
  targetRole: 'all' | 'customer' | 'admin';
  referenceId?: string;
  referenceType?: 'order' | 'quote' | 'product';
  read: boolean;
  timestamp: string;
}

export type CariType = 'customer' | 'dealer' | 'supplier';

export type CariTransactionType = 
  | 'sale_invoice'       // Satış Faturası (Müşteri Borçlanır / +Borç)
  | 'payment_received'   // Tahsilat - Havale/Nakit/Kredi Kartı (Borç Azalır / +Alacak)
  | 'supplier_invoice'   // Alış Faturası (Tedarikçi Alacaklanır)
  | 'payment_made'       // Tedarikçiye Ödeme (Borç Azalır)
  | 'return_credit'      // İade Faturası / Mahsup
  | 'opening_balance';   // Devir / Açılış Bakiyesi

export interface CariTransaction {
  id: string;
  cariId: string;
  date: string;
  type: CariTransactionType;
  amount: number;
  direction: 'debit' | 'credit'; // 'debit' (Borç), 'credit' (Alacak/Tahsilat)
  description: string;
  documentNo?: string;
  paymentMethod?: 'Nakit' | 'Havale/EFT' | 'Kredi Kartı' | 'Çek/Senet' | 'Cari Hesap';
  dueDate?: string;
  orderId?: string;
  createdAt: string;
}

// 'pending': self-servis kayit sonrasi acilan, admin onayi bekleyen kart.
export type CariStatus = 'pending' | 'active' | 'passive' | 'blocked';

/** Kasaya giren tahsilatin yontemi. */
export type PaymentMethod = 'Nakit' | 'Kredi Kartı' | 'Havale/EFT' | 'Çek/Senet';

/**
 * Tahsilat kaydi. Eskiden tahsilat YALNIZCA siparisin icine
 * (orders/{id}.settlement) yaziliyordu; kasa dokumu, odeme tipine gore kirilim
 * ve cari etkisi hicbir yerde yoktu. Artik her tahsilat bagimsiz bir kayit.
 */
export interface Payment {
  id: string;
  receiptNo: string;          // THS-2026-00001
  date: string;               // ISO
  amount: number;
  method: PaymentMethod;
  cariId?: string;
  cariCode?: string;
  cariName?: string;
  orderId?: string;
  orderNumber?: string;
  /** Sahiplik: musteri kendi tahsilatlarini gorebilsin diye. */
  customerUid?: string;
  customerEmail?: string;
  customerName: string;
  note?: string;
  recordedBy?: string;        // kaydi giren admin e-postasi
  createdAt: string;
}

export interface CariAccount {
  id: string;
  code: string; // Örn: CR-1001
  name: string; // Yetkili veya Ünvan
  companyName: string; // Şirket Tam Ünvanı
  type: CariType;
  taxNumber?: string;
  taxOffice?: string;
  phone: string;
  email: string;
  city: string;
  address?: string;
  creditLimit: number; // Kredi / Risk Limiti (₺)
  paymentTermDays: number; // Vade Günü (örn: 30, 60, 90)
  balance: number; // Güncel Net Bakiye: Pozitif (+) = Müşteri bize borçlu, Negatif (-) = Biz borçluyuz
  totalDebit: number; // Toplam Borçlandırılan Tutar
  totalCredit: number; // Toplam Tahsil Edilen / Ödenen Tutar
  status: CariStatus;
  notes?: string;
  lastTransactionDate?: string;
  lastTransactionDesc?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RealtimeEventPayload {
  type: 'ORDER_CREATED' | 'ORDER_UPDATED' | 'QUOTE_CREATED' | 'QUOTE_UPDATED' | 'PRODUCT_UPDATED' | 'NOTIFICATION_ADDED' | 'CARI_UPDATED' | 'INVOICE_CREATED' | 'INVOICE_UPDATED' | 'INVOICE_DELETED';
  data: any;
  timestamp: string;
}

// ==========================================
// GİB E-FATURA & E-ARŞİV TYPES (UBL-TR 2.1)
// ==========================================

export type EInvoiceType = 
  | 'SATIS'      // Temel / Ticari Satış Faturası
  | 'IADE'       // İade Faturası
  | 'TEVKIFAT'   // KDV Tevkifatlı Fatura (601 vb.)
  | 'ISTISNA'    // KDV İstisna Faturası (301 vb.)
  | 'IHRACAT';   // İhracat Faturası

export type EInvoiceProfile = 
  | 'TICARIFATURA'   // Ticari Fatura (Kabul/Red Akışı)
  | 'TEMELFATURA'    // Temel Fatura (Doğrudan Kabul)
  | 'EARSIVFATURA'   // E-Arşiv Fatura (Bireysel / E-Fatura Mükellefi Olmayanlar)
  | 'KAMU';          // Kamu Kurumu Faturası

export type EInvoiceStatus = 
  | 'draft'          // Taslak
  | 'queued'         // GİB Entegratör Kuyruğunda
  | 'sent'           // GİB'e İletildi / Onaylandı (1300 Başarılı)
  | 'approved'       // Ticari Fatura Müşteri Onayı
  | 'rejected'       // Reddedildi
  | 'cancelled';     // İptal Edildi

export type EInvoiceTemplateType = 'detailed' | 'simple';

export interface EInvoiceItem {
  id?: string;
  name: string;
  sku?: string;
  quantity: number;
  unit: string; // 'ADET' | 'METRE' | 'SET' | 'PAKET' | 'KOLİ' | 'KG'
  unitPrice: number; // KDV Hariç Birim Fiyat
  discountPercent: number; // 0 - 100
  discountAmount: number;
  vatRate: number; // 0, 1, 10, 20
  vatAmount: number;
  tevkifatCode?: string; // Örn: '601', '602', '604'
  tevkifatRate?: string; // Örn: '5/10', '7/10', '9/10'
  tevkifatAmount?: number;
  totalPrice?: number;
  lineTotal: number; // KDV Dahil Net Satır Tutarı
}

export interface EInvoice {
  id: string;
  invoiceNumber: string; // 16 Haneli GİB No: ALP2026000000001 veya EAR2026000000001
  uuid: string; // ETTN (UUID v4)
  profile: EInvoiceProfile;
  type: EInvoiceType;
  invoiceDate: string; // YYYY-MM-DD
  invoiceTime: string; // HH:mm:ss
  currency: string; // 'TRY'
  currencyRate: number; // 1.0
  status: EInvoiceStatus;
  gibStatusCode?: number; // 1300 = Başarılı, 1200 = İşleniyor, 1100 = Kuyrukta, 1400 = Hata
  gibStatusDescription?: string;
  gibEnvironment?: 'test' | 'prod';
  gibAttemptCount?: number;
  gibLastRequestId?: string;
  gibLastCheckedAt?: string;
  gibRetryAfter?: string;
  archivedAt?: string;

  // Satıcı (Tedarikçi) Bilgileri
  supplierTitle: string;
  supplierVkn: string;
  supplierTaxOffice: string;
  supplierAddress: string;
  supplierCity: string;
  supplierDistrict?: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierMersisNo?: string;
  supplierTicaretSicilNo?: string;

  // Alıcı (Müşteri) Bilgileri
  customerCariId?: string;
  customerTitle: string;
  customerName?: string;
  customerVknTckn: string;
  customerTaxOffice?: string;
  customerAddress: string;
  customerCity: string;
  customerDistrict?: string;
  customerPhone?: string;
  customerEmail?: string;
  isEInvoicePayer: boolean; // true = E-Fatura (TICARIFATURA / TEMELFATURA), false = E-Arşiv

  // Kaynak Belge Referansı
  sourceType?: 'order' | 'quote' | 'manual';
  sourceId?: string;
  sourceNumber?: string; // ORD-xxx veya QT-xxx
  despatchNumber?: string; // İrsaliye No
  despatchDate?: string; // İrsaliye Tarihi
  orderNumber?: string;
  orderDate?: string;

  // Kalemler
  items: EInvoiceItem[];

  // Finansal Toplamlar & Matrah Detayları
  subtotal: number; // Mal/Hizmet Toplamı (İskonto Öncesi)
  totalDiscount: number; // Toplam İskonto
  taxExclusiveAmount: number; // Vergi Hariç Toplam (Matrah)
  
  vat20Matrah?: number;
  vat20Amount?: number;
  vat10Matrah?: number;
  vat10Amount?: number;
  vat1Matrah?: number;
  vat1Amount?: number;
  
  totalVat: number; // Toplam KDV Tutarı
  totalTevkifat?: number; // Toplam Tevkifat Tutarı
  payableAmount: number; // Ödenecek Tutar (KDV Dahil - Varsa Tevkifat)
  amountInWords: string; // Yazıyla Tutar

  // Açıklamalar & Ödeme Bilgisi
  notes: string[];
  paymentMethod?: 'Havale/EFT' | 'Kredi Kartı' | 'Nakit' | 'Cari Hesap';
  bankName?: string;
  bankIban?: string;
  cariTransactionId?: string; // Otomatik cari hesap hareketi ID'si
  
  createdAt: string;
  updatedAt: string;
}

export interface EInvoiceCreateInput {
  sourceType?: 'order' | 'quote' | 'manual';
  sourceId?: string;
  sourceNumber?: string;
  profile?: EInvoiceProfile;
  type?: EInvoiceType;
  customerCariId?: string;
  customerTitle: string;
  customerName?: string;
  customerVknTckn: string;
  customerTaxOffice?: string;
  customerAddress: string;
  customerCity: string;
  customerDistrict?: string;
  customerPhone?: string;
  customerEmail?: string;
  isEInvoicePayer?: boolean;
  invoiceDate?: string;
  despatchNumber?: string;
  despatchDate?: string;
  orderNumber?: string;
  orderDate?: string;
  items: Array<{
    name: string;
    sku?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    discountPercent?: number;
    vatRate?: number;
    tevkifatCode?: string;
    tevkifatRate?: string;
  }>;
  notes?: string[];
  paymentMethod?: 'Havale/EFT' | 'Kredi Kartı' | 'Nakit' | 'Cari Hesap';
  bankName?: string;
  bankIban?: string;
  autoProcessCari?: boolean; // Otomatik cari borç kaydı oluştur
}

// ==========================================
// B2B BANKA DEKONTU & ÖDEME BİLDİRİMİ
// ==========================================
export interface BankPaymentReceipt {
  id: string;
  /** Kaydin sahibi: Firebase Auth UID. Firestore kurallari buna gore izin verir. */
  customerUid?: string;
  orderId?: string;
  orderNumber?: string;
  customerName: string;
  customerCompany?: string;
  customerEmail: string;
  customerPhone?: string;
  bankName: string;
  senderIban?: string;
  amount: number;
  paymentDate: string;
  referenceNo?: string;
  receiptFileUrl: string; // Base64 or URL
  receiptFileName?: string;
  customerNote?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  processedBy?: string;
  cariTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// HIZLI SANAL POS & TAHSİLAT LİNKİ
// ==========================================
export interface PaymentLink {
  id: string;
  linkCode: string;
  amount: number;
  description: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  orderId?: string;
  orderNumber?: string;
  cariId?: string;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  paidAt?: string;
  paymentCardLast4?: string;
  paymentCardBrand?: string;
  installmentCount?: number;
  createdAt: string;
  expiresAt: string;
}

// ==========================================
// ŞANTİYE & SEVK ADRESİ YÖNETİMİ
// ==========================================
export interface ConstructionSite {
  id: string;
  userId?: string;
  siteName: string; // örn: "Vadi İstanbul Konutları 2. Etap"
  city: string;
  district: string;
  fullAddress: string;
  contactPerson: string;
  contactPhone: string;
  notes?: string; // örn: "Vinç girişi arka nizamiyeden"
  deliveryNotes?: string;
  isDefault?: boolean;
  createdAt: string;
}

// ==========================================
// ŞABLON SEPETLER & HAZIR PROJE PAKETLERİ
// ==========================================
export interface ProjectPackageItem {
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface ProjectPackage {
  id: string;
  title: string;
  category: 'daire_tesisat' | 'yerden_isitma' | 'kombi_montaj' | 'kazan_yangin' | 'ozel';
  categoryLabel: string;
  description: string;
  items: ProjectPackageItem[];
  estimatedTotal: number;
  iconName?: string;
  isCustom?: boolean;
  createdBy?: string;
  createdAt: string;
}

// ==========================================
// DEPO TOPLAMA (PICKING LIST / WMS LITE)
// ==========================================
export interface PickingListItem {
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  warehouseLocation: string; // Raf No: örn. A-02-04
  requestedQuantity: number;
  pickedQuantity: number;
  unit: string;
  isCompleted: boolean;
}

export interface OrderPickingSession {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  pickerName: string;
  status: 'in_progress' | 'completed' | 'partial';
  items: PickingListItem[];
  packageCount: number;
  shippingCompany?: string;
  waybillNumber?: string;
  startedAt: string;
  completedAt?: string;
}

// ==========================================
// BAYİ İSKONTO MATRİSİ & KATEGORİ ORANLARI
// ==========================================
export interface CategoryDiscountRule {
  category: string;
  categoryLabel: string;
  tierA_Percent: number; // A Bayi (Ana Bayi)
  tierB_Percent: number; // B Bayi (Toptan Müşteri)
  tierC_Percent: number; // C Bayi (Usta / Taahhütçü)
}

export interface BrandDiscountRule {
  brand: string;
  discountPercent: number;
}

// ==========================================
// YÖNETİCİ YAŞLANDIRMA & KRİTİK STOK RAPORLARI
// ==========================================
export interface StockAgingItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  warehouseLocation?: string;
  currentStock: number;
  minStockAlert: number;
  price: number;
  stockValue: number;
  daysWithoutSale: number;
  status: 'critical_low' | 'out_of_stock' | 'slow_moving' | 'healthy';
  suggestedReorderQuantity: number;
}

export interface CariAgingItem {
  cariId: string;
  code: string;
  name: string;
  companyName: string;
  phone: string;
  balance: number;
  creditLimit: number;
  termDays: number;
  overdueAmount: number;
  overdueDays: number;
  riskStatus: 'normal' | 'due_soon' | 'overdue' | 'critical';
  breakdown: {
    current: number; // Vadesi gelmemiş
    days1_30: number; // 1-30 gün gecikmiş
    days31_60: number; // 31-60 gün gecikmiş
    days61_90: number; // 61-90 gün gecikmiş
    days90Plus: number; // 90+ gün gecikmiş
  };
}

// ==========================================
// GİDER TAKİP MODÜLܒ
// ==========================================

export type GiderKategori =
  | 'kira'
  | 'elektrik_dogalgaz'
  | 'internet_telefon'
  | 'personel_maas'
  | 'personel_ssk'
  | 'arac_yakiti'
  | 'kargo_nakliye'
  | 'bakim_onarim'
  | 'ofis_malzeme'
  | 'reklam_pazarlama'
  | 'muhasebe_hukuk'
  | 'vergi_harclari'
  | 'banka_komisyon'
  | 'diger';

export type GiderTekrarTipi = 'tek_seferlik' | 'aylik' | 'yillik';

export interface GiderKaydi {
  id: string;
  kategori: GiderKategori;
  tutar: number;
  kdvDahil: boolean;
  kdvOrani?: number;
  kdvTutar?: number;
  aciklama: string;
  tedarikci?: string;
  faturaSeriNo?: string;
  tekrar: GiderTekrarTipi;
  tarih: string;
  odemeTarihi?: string;
  odendi: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// ORTAK ARAÇ HESABI (tek araç / tek ortak, ayrı defter)
// ==========================================
export type OrtakAracFisTur = 'satis' | 'gider' | 'ortak_odeme';

export type OrtakAracGiderKategori =
  | 'sofor_maas'
  | 'yakit'
  | 'yemek'
  | 'vergi_harc'
  | 'bakim_onarim'
  | 'sigorta'
  | 'diger';

/** ortaga_odedik: ortağa para verdik / ortaktan_aldik: ortaktan avans aldık. */
export type OrtakAracOdemeYonu = 'ortaga_odedik' | 'ortaktan_aldik';

export interface OrtakAracFis {
  id: string;
  tur: OrtakAracFisTur;
  /** Satış: satış tutarı · Gider: gider tutarı · Ortak ödeme: ödeme tutarı. */
  tutar: number;
  /** Yalnızca satış fişi: satılan malın bize maliyeti. */
  malMaliyeti?: number;
  giderKategori?: OrtakAracGiderKategori;
  odemeYonu?: OrtakAracOdemeYonu;
  aciklama: string;
  fisNo?: string;
  tarih: string;
  status?: 'active' | 'void';
  reversedById?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// ÇEK / SENET TAKİP
// ==========================================
export type CekSenetTur = 'cek' | 'senet';
export type CekSenetYon = 'alinan' | 'verilen';
export type CekSenetDurum = 'beklemede' | 'tahsil_edildi' | 'iade_edildi' | 'protesto' | 'ciro_edildi';

export interface CekSenet {
  id: string;
  tur: CekSenetTur;
  yon: CekSenetYon;
  durum: CekSenetDurum;
  tutar: number;
  vadeTarihi: string;
  kesilenBanka?: string;
  sube?: string;
  hesapNo?: string;
  cekNo?: string;
  senetNo?: string;
  cariId?: string;
  cariAdi?: string;
  aciklama?: string;
  tahsilTarihi?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// KASA DEFTERİ
// ==========================================
export type KasaHareket = 'giris' | 'cikis';

export type KasaKategori = 'satis_tahsilat' | 'cari_odeme' | 'tedarikci_odeme' | 'gider' | 'personel' | 'diger';

export interface KasaHareketi {
  id: string;
  tip: KasaHareket;
  kategori: KasaKategori;
  tutar: number;
  aciklama: string;
  referansNo?: string;
  cariId?: string;
  cariAdi?: string;
  tarih: string;
  status?: 'active' | 'void';
  reversalOfId?: string;
  reversedById?: string;
  lockedPeriod?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// ALIŞ FATURASI & TEDARİKÇİ
// ==========================================
export type AlisFaturasiDurum = 'taslak' | 'onaylandi' | 'odendi' | 'iptal';

export interface AlisFaturasiKalem {
  urunAdi: string;
  miktar: number;
  birim: string;
  birimFiyat: number;
  kdvOrani: number;
  kdvTutar: number;
  toplam: number;
}

export interface AlisFaturasi {
  id: string;
  faturaNo: string;
  tedarikciId?: string;
  tedarikciAdi: string;
  tarih: string;
  vadeTarihi?: string;
  kalemler: AlisFaturasiKalem[];
  araToplam: number;
  kdvToplam: number;
  genelToplam: number;
  durum: AlisFaturasiDurum;
  aciklama?: string;
  status?: 'active' | 'void';
  reversalOfId?: string;
  reversedById?: string;
  lockedPeriod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tedarikci {
  id: string;
  ad: string;
  vergiNo?: string;
  telefon?: string;
  email?: string;
  adres?: string;
  notlar?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// TEDARİKÇİ CARİ İŞLEMLERİ
// ==========================================
export type TedarikciIslemTipi =
  | 'alis_faturasi'   // Alış faturası / borçlandık
  | 'odeme_yapildi'   // Tedarikçiye ödeme
  | 'iade_alacak'     // İade / kredi notu
  | 'devir_bakiye'    // Devir / açılış bakiyesi
  | 'mutabakat';      // Bakiye düzeltme

export interface TedarikciIslem {
  id: string;
  tedarikciAdi: string;
  tedarikciId?: string;
  tarih: string;
  vadeTarihi?: string;
  tip: TedarikciIslemTipi;
  yon: 'borc' | 'alacak'; // borc = borcumuz artar, alacak = borcumuz azalır
  tutar: number;
  aciklama: string;
  belgeNo?: string;
  odemeSekli?: 'Havale/EFT' | 'Nakit' | 'Kredi Kartı' | 'Çek/Senet' | 'Açık Hesap';
  createdAt: string;
}
