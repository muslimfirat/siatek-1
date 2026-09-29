import {
  db,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  writeBatch
} from './firebase';
import {
  Product,
  Order,
  Quote,
  PushNotification,
  CariAccount,
  CariTransaction,
  EInvoice,
  Payment,
  PaymentMethod,
  CekSenet,
  KasaHareketi,
  GiderKaydi,
  OrtakAracFis,
  AlisFaturasi,
  Tedarikci,
  TedarikciIslem,
} from '../types';
import { STOCK_PDF_PRODUCTS } from '../data/stockProducts';
import { createAlisFaturaReversal, createKasaReversal } from '../utils/financeEngine';

/**
 * Kimin hangi veriyi gorebilecegini belirler.
 * Firestore kurallari musteriye SADECE kendi kayitlarini okutur; bu yuzden
 * sorgunun da filtreli acilmasi gerekir. Filtresiz sorgu kural tarafindan
 * komple reddedilir (Firestore sonucu filtrelemez, sorguyu reddeder).
 */
export interface DataAccess {
  /** Firebase Auth UID - sahipligin tek kaynagi. */
  uid: string | null;
  isAdmin: boolean;
}

export interface FirestoreReadError {
  code: string;
  message: string;
  kind: 'permission' | 'network' | 'rule' | 'unknown';
}

export type FirestoreReadErrorHandler = (error: FirestoreReadError) => void;

function classifyFirestoreReadError(error: any): FirestoreReadError {
  const code = String(error?.code || 'unknown');
  const message = String(error?.message || 'Veri okunamadi.');
  const lower = `${code} ${message}`.toLocaleLowerCase('tr-TR');

  const kind: FirestoreReadError['kind'] =
    code === 'permission-denied'
      ? 'permission'
      : code === 'failed-precondition'
        ? 'rule'
        : lower.includes('network') || code === 'unavailable'
          ? 'network'
          : 'unknown';

  return { code, message, kind };
}

export function describeFirestoreReadError(error: FirestoreReadError): string {
  if (error.kind === 'permission') {
    return 'Yetkiniz bu kayitlari okumaya izin vermiyor. Hesabi kontrol edin veya yonetici yetkisiyle tekrar deneyin.';
  }
  if (error.kind === 'rule') {
    return 'Veri sorgusu icin Firestore kuralı veya indeks eksik. Yoneticiye bildirin.';
  }
  if (error.kind === 'network') {
    return 'Baglanti koptu. Internet erisiminizi kontrol edip tekrar deneyin.';
  }
  return 'Veri okunamadi. Tekrar deneyin; sorun surerse destek ekibine bildirin.';
}

function sortByCreatedAtDesc<T extends { createdAt?: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

/**
 * Sanitizes object for Firestore by removing undefined values
 */
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === undefined) return null as any;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  const sanitized: any = {};
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key];
    if (val !== undefined) {
      sanitized[key] = sanitizeForFirestore(val);
    }
  }
  return sanitized;
}

/**
 * Initializes and seeds products in Firestore if collection is empty
 */
export async function seedProductsIfEmpty(): Promise<void> {
  // Seeding 1,835 documents on client startup exhausts Firestore daily free quota (50,000 reads/writes).
  // The complete ~1,835 product catalog is statically bundled in STOCK_PDF_PRODUCTS.
  return;
}

/**
 * Real-time listener for products (optimized to preserve daily Firestore quota)
 */
export function subscribeToProducts(callback: (products: Product[]) => void, onError?: FirestoreReadErrorHandler): () => void {
  // Once: statik katalogu HEMEN ver (1.835 urun, sifir Firestore okumasi).
  callback(STOCK_PDF_PRODUCTS);

  // Sonra: Firestore'daki DEGISIKLIKLERI (fiyat/stok override'lari) dinle ve
  // statik katalogla birlestir.
  //
  // ONEMLI: Bu fonksiyon eskiden SADECE statik katalogu dondurup kapaniyordu.
  // saveProductToFirestore ile yazilan fiyat/stok degerleri hicbir zaman geri
  // OKUNMUYORDU; yonetici fiyati degistiriyor, kaydediliyor gibi gorunuyor ama
  // ekranda hep eski deger kaliyordu. (19.09.2026)
  //
  // Kota notu: 'products' koleksiyonunda yalnizca DEGISTIRILEN urunler tutulur
  // (tam katalog degil), bu yuzden okuma maliyeti dusuktur.
  const productsRef = collection(db, 'products');

  return onSnapshot(
    productsRef,
    (snapshot) => {
      if (snapshot.empty) {
        callback(STOCK_PDF_PRODUCTS);
        return;
      }

      const override = new Map<string, Partial<Product>>();
      snapshot.forEach((docSnap) => {
        override.set(docSnap.id, docSnap.data() as Partial<Product>);
      });

      const birlesik = STOCK_PDF_PRODUCTS.map((p) => {
        const o = override.get(p.id);
        return o ? ({ ...p, ...o, id: p.id } as Product) : p;
      });

      // Statik katalogda olmayan, sonradan eklenmis urunler
      const katalogIdleri = new Set(STOCK_PDF_PRODUCTS.map((p) => p.id));
      override.forEach((veri, id) => {
        if (!katalogIdleri.has(id)) {
          birlesik.push({ id, ...(veri as Omit<Product, 'id'>) } as Product);
        }
      });

      callback(birlesik);
    },
    (error) => {
      console.error('[SIATEK/Firestore] Products Firestore okunamadi ->', (error as any)?.code || '(kod yok)', (error as any)?.message || error);
      onError?.(classifyFirestoreReadError(error));
      callback(STOCK_PDF_PRODUCTS);
    }
  );
}

/**
 * Save or update product in Firestore
 */
export async function saveProductToFirestore(product: Product): Promise<void> {
  const docRef = doc(db, 'products', product.id);
  await setDoc(docRef, sanitizeForFirestore(product), { merge: true });
}

/**
 * Real-time listener for orders
 */
export function subscribeToOrders(
  callback: (orders: Order[]) => void,
  access: DataAccess,
  onError?: FirestoreReadErrorHandler
): () => void {
  // Giris yapilmamissa hic sorgu acma - kurallar zaten reddeder.
  if (!access.isAdmin && !access.uid) {
    callback([]);
    return () => {};
  }

  const ordersRef = collection(db, 'orders');
  // Sahiplik UID ile kurulur: e-posta degisebilir/yazilabilir, UID degismez.
  const q = access.isAdmin
    ? query(ordersRef, orderBy('createdAt', 'desc'))
    : query(ordersRef, where('customerUid', '==', access.uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Order, 'id'>) });
      });
      // Musteri sorgusunda orderBy kullanilmadi (bilesik indeks gerektirir),
      // siralama istemcide yapiliyor.
      callback(access.isAdmin ? list : sortByCreatedAtDesc(list));
    },
    (error) => {
      console.error('[SIATEK/Firestore] Orders Firestore okunamadi ->', (error as any)?.code || '(kod yok)', (error as any)?.message || error);
      onError?.(classifyFirestoreReadError(error));
    }
  );
}

/**
 * Save new Order to Firestore
 */
export async function saveOrderToFirestore(order: Order): Promise<void> {
  const docRef = doc(db, 'orders', order.id);
  await setDoc(docRef, sanitizeForFirestore(order));
}

/**
 * Update Order status in Firestore
 */
export async function updateOrderStatusInFirestore(
  orderId: string, 
  status: Order['status'], 
  historyItem?: any,
  additionalFields?: Partial<Order>
): Promise<void> {
  const docRef = doc(db, 'orders', orderId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    const existingHistory = data.statusHistory || [];
    const newHistory = historyItem ? [...existingHistory, historyItem] : existingHistory;
    
    await updateDoc(docRef, sanitizeForFirestore({
      status,
      statusHistory: newHistory,
      updatedAt: new Date().toISOString(),
      ...(additionalFields || {})
    }));
  }
}

/**
 * Real-time listener for quotes (RFQs)
 */
export function subscribeToQuotes(
  callback: (quotes: Quote[]) => void,
  access: DataAccess,
  onError?: FirestoreReadErrorHandler
): () => void {
  if (!access.isAdmin && !access.uid) {
    callback([]);
    return () => {};
  }

  const quotesRef = collection(db, 'quotes');
  const q = access.isAdmin
    ? query(quotesRef, orderBy('createdAt', 'desc'))
    : query(quotesRef, where('customerUid', '==', access.uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Quote[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Quote, 'id'>) });
      });
      callback(access.isAdmin ? list : sortByCreatedAtDesc(list));
    },
    (error) => {
      console.error('[SIATEK/Firestore] Quotes Firestore okunamadi ->', (error as any)?.code || '(kod yok)', (error as any)?.message || error);
      onError?.(classifyFirestoreReadError(error));
    }
  );
}

/**
 * Save new Quote to Firestore
 */
export async function saveQuoteToFirestore(quote: Quote): Promise<void> {
  const docRef = doc(db, 'quotes', quote.id);
  await setDoc(docRef, sanitizeForFirestore(quote));
}

/**
 * Update Quote in Firestore
 */
export async function updateQuoteInFirestore(quoteId: string, updates: Partial<Quote>): Promise<void> {
  const docRef = doc(db, 'quotes', quoteId);
  await updateDoc(docRef, sanitizeForFirestore({
    ...updates,
    updatedAt: new Date().toISOString(),
  }));
}

/**
 * Real-time listener for Notifications
 */
export function subscribeToNotifications(
  callback: (notifications: PushNotification[]) => void,
  access: DataAccess
): () => void {
  if (!access.isAdmin && !access.uid) {
    callback([]);
    return () => {};
  }
  const notifRef = collection(db, 'notifications');
  const q = access.isAdmin
    ? query(notifRef, orderBy('timestamp', 'desc'), limit(50))
    : query(notifRef, where('targetUid', '==', access.uid), limit(50));
  
  return onSnapshot(
    q,
    (snapshot) => {
      const list: PushNotification[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<PushNotification, 'id'>) });
      });
      callback(list);
    },
    (error) => {
      console.error('[SIATEK/Firestore] Notifications Firestore okunamadi ->', (error as any)?.code || '(kod yok)', (error as any)?.message || error);
    }
  );
}

/**
 * Save Notification to Firestore
 */
export async function saveNotificationToFirestore(notification: PushNotification): Promise<void> {
  const docRef = doc(db, 'notifications', notification.id);
  await setDoc(docRef, sanitizeForFirestore(notification));
}

/**
 * Mark notification read in Firestore
 */
export async function markNotificationReadInFirestore(notificationId: string): Promise<void> {
  const docRef = doc(db, 'notifications', notificationId);
  await updateDoc(docRef, { read: true });
}

/* ==========================================================================
 *  CARI HESAPLAR (B2B borc/alacak defteri)
 *
 *  ONEMLI: Bu fonksiyonlar 19.09.2026'da eklendi. Oncesinde cari ekleme/listeleme
 *  fetch('/api/cariler') uzerinden yapiliyordu. Bu uygulama Firebase Hosting'de
 *  STATIK yayinlaniyor; sunucu yok. /api/... istegi hosting rewrite'ina takilip
 *  HTTP 200 + index.html donuyordu, res.ok true oldugu icin kod basarili saniyor,
 *  modal kapaniyor ama HICBIR SEY KAYDEDILMIYORDU. Liste de ayni olu yoldan
 *  besleniyor, res.json() HTML uzerinde patlayip sessizce yutuluyordu.
 *  Artik dogrudan Firestore kullaniliyor.
 * ========================================================================== */

/** Cari hesaplar icin canli dinleyici. Kurallar geregi yalnizca admin listeleyebilir. */
export function subscribeToCariAccounts(
  callback: (cariler: CariAccount[]) => void,
  access: DataAccess,
  onError?: FirestoreReadErrorHandler
): () => void {
  if (!access.isAdmin) {
    callback([]);
    return () => {};
  }

  const cariRef = collection(db, 'cari_accounts');

  return onSnapshot(
    cariRef,
    (snapshot) => {
      const list: CariAccount[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<CariAccount, 'id'>) });
      });
      callback(sortByCreatedAtDesc(list as any) as CariAccount[]);
    },
    (error) => {
      console.error('[SIATEK/Firestore] Cari accounts Firestore okunamadi ->', (error as any)?.code || '(kod yok)', (error as any)?.message || error);
      onError?.(classifyFirestoreReadError(error));
    }
  );
}

export async function saveCariAccountToFirestore(cari: CariAccount): Promise<void> {
  const docRef = doc(db, 'cari_accounts', cari.id);
  await setDoc(docRef, sanitizeForFirestore(cari));
}

export async function updateCariAccountInFirestore(
  cariId: string,
  updates: Partial<CariAccount>
): Promise<void> {
  const docRef = doc(db, 'cari_accounts', cariId);
  await updateDoc(docRef, sanitizeForFirestore({
    ...updates,
    updatedAt: new Date().toISOString(),
  }));
}

/** Atomic increment — race condition yok, stale state sorunu yok. */
export async function incrementCariBalanceInFirestore(
  cariId: string,
  delta: number,
  direction: 'debit' | 'credit',
  meta?: { lastTransactionDate?: string; lastTransactionDesc?: string }
): Promise<void> {
  const { db: fsDb, doc: fsDoc, updateDoc: fsUpdateDoc, increment: fsInc } = await import('./firebase');
  const docRef = fsDoc(fsDb, 'cari_accounts', cariId);
  await fsUpdateDoc(docRef, {
    balance: fsInc(direction === 'debit' ? delta : -delta),
    totalDebit: direction === 'debit' ? fsInc(delta) : fsInc(0),
    totalCredit: direction === 'credit' ? fsInc(delta) : fsInc(0),
    updatedAt: new Date().toISOString(),
    ...(meta?.lastTransactionDate ? { lastTransactionDate: meta.lastTransactionDate } : {}),
    ...(meta?.lastTransactionDesc ? { lastTransactionDesc: meta.lastTransactionDesc } : {}),
  });
}

export async function deleteCariAccountFromFirestore(cariId: string): Promise<void> {
  await deleteDoc(doc(db, 'cari_accounts', cariId));
}

/** Cari hareket (tahsilat/borclandirma) kaydi. */
export async function saveCariTransactionToFirestore(tx: CariTransaction): Promise<void> {
  const docRef = doc(db, 'cari_transactions', tx.id);
  await setDoc(docRef, sanitizeForFirestore(tx));
}

export function subscribeToCariTransactions(
  callback: (islemler: CariTransaction[]) => void,
  access: DataAccess
): () => void {
  if (!access.isAdmin) {
    callback([]);
    return () => {};
  }
  const ref = collection(db, 'cari_transactions');
  return onSnapshot(
    ref,
    (snapshot) => {
      const list: CariTransaction[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<CariTransaction, 'id'>) }));
      callback(sortByCreatedAtDesc(list as any) as CariTransaction[]);
    },
    (error) => console.error('[SIATEK/Firestore] Cari transactions okunamadi ->', (error as any)?.code || '(kod yok)', (error as any)?.message || error)
  );
}

/* ==========================================================================
 *  URUN TOPLU ISLEMLERI
 *  'products' koleksiyonu tam katalogu degil, yalnizca DEGISTIRILEN urunleri
 *  tutar (override deseni). subscribeToProducts bunlari statik katalogla
 *  birlestirir.
 * ========================================================================== */

/** Firestore toplu yazma siniri 500; guvenli parca boyutu 400. */
async function partalıYaz(
  islemler: Array<(toplu: ReturnType<typeof writeBatch>) => void>
): Promise<void> {
  for (let i = 0; i < islemler.length; i += 400) {
    const toplu = writeBatch(db);
    islemler.slice(i, i + 400).forEach((f) => f(toplu));
    await toplu.commit();
  }
}

/** Birden fazla urunun fiyat/stok gibi alanlarini tek seferde gunceller. */
export async function bulkUpdateProductsInFirestore(
  updates: Array<{ id: string } & Partial<Product>>
): Promise<void> {
  if (!updates || updates.length === 0) return;
  await partalıYaz(
    updates.map((u) => (toplu: any) => {
      const { id, ...alanlar } = u;
      toplu.set(
        doc(db, 'products', id),
        sanitizeForFirestore({ ...alanlar, updatedAt: new Date().toISOString() }),
        { merge: true }
      );
    })
  );
}

/** Excel/toplu ice aktarim. */
export async function bulkImportProductsToFirestore(products: Product[]): Promise<void> {
  if (!products || products.length === 0) return;
  await partalıYaz(
    products.map((p) => (toplu: any) => {
      toplu.set(doc(db, 'products', p.id), sanitizeForFirestore(p), { merge: true });
    })
  );
}

/**
 * Katalogu fabrika (stok.pdf) degerlerine dondurur: 'products' koleksiyonundaki
 * tum override dokumanlarini siler. Statik katalog zaten kaynak oldugu icin
 * silme islemi "sifirlama" anlamina gelir.
 */
export async function resetProductsToCatalogInFirestore(): Promise<void> {
  const snapshot = await getDocs(collection(db, 'products'));
  const idler: string[] = [];
  snapshot.forEach((d) => idler.push(d.id));
  if (idler.length === 0) return;
  await partalıYaz(idler.map((id) => (toplu: any) => toplu.delete(doc(db, 'products', id))));
}

/* ==========================================================================
 *  SIPARIS EK ISLEMLERI
 * ========================================================================== */

/** Sevkiyat/toplama bilgisi (irsaliye, kargo, teslim alan). */
export async function saveOrderPickingInFirestore(
  orderId: string,
  picking: Record<string, any>
): Promise<void> {
  await updateDoc(doc(db, 'orders', orderId), sanitizeForFirestore({
    picking,
    status: 'ready',
    updatedAt: new Date().toISOString(),
  }));
}

/** Teslimat + tahsilat kapanisi. */
export async function settleOrderPaymentInFirestore(
  orderId: string,
  settlement: Record<string, any>
): Promise<void> {
  await updateDoc(doc(db, 'orders', orderId), sanitizeForFirestore({
    settlement,
    status: 'delivered',
    updatedAt: new Date().toISOString(),
  }));
}

/* ==========================================================================
 *  DEKONT BILDIRIMLERI (havale/EFT)
 * ========================================================================== */

/** Musterinin dekont bildirimi. Kurallar: sahibi olusturur, admin onaylar. */
export async function saveReceiptToFirestore(receipt: any): Promise<void> {
  await setDoc(doc(db, 'receipts', receipt.id), sanitizeForFirestore(receipt));
}

/** Dekont listesi: admin hepsini, musteri kendisininkini gorur. */
export function subscribeToReceipts(
  callback: (list: any[]) => void,
  access: DataAccess
): () => void {
  if (!access.isAdmin && !access.uid) {
    callback([]);
    return () => {};
  }
  const ref = collection(db, 'receipts');
  const q = access.isAdmin ? ref : query(ref, where('customerUid', '==', access.uid));
  return onSnapshot(
    q as any,
    (snapshot: any) => {
      const list: any[] = [];
      snapshot.forEach((d: any) => list.push({ id: d.id, ...d.data() }));
      callback(sortByCreatedAtDesc(list));
    },
    (error: any) => console.error('[SIATEK/Firestore] Receipts okunamadi ->', (error as any)?.code || '(kod yok)', (error as any)?.message || error)
  );
}

/* ==========================================================================
 *  KULLANICI PROFILI
 * ========================================================================== */

/**
 * Kullanicinin kendi profilini gunceller.
 *
 * GUVENLIK: yalnizca beyaz listedeki alanlar yazilir. role / isDealer /
 * discountTier BILEREK disarida birakilmistir; Firestore kurali da bu alanlarin
 * degismesini reddeder (yetkiAlanlariSabit). Boylece bir bayi kendini admin
 * yapamaz veya iskonto kademesini yukseltemez.
 */
export async function updateUserProfileInFirestore(
  uid: string,
  updates: {
    name?: string;
    companyName?: string;
    phone?: string;
    address?: string;
    city?: string;
    taxNumber?: string;
    taxOffice?: string;
  }
): Promise<void> {
  const izinliAlanlar = ['name', 'companyName', 'phone', 'address', 'city', 'taxNumber', 'taxOffice'];
  const temiz: Record<string, any> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (izinliAlanlar.includes(k) && v !== undefined) temiz[k] = v;
  }
  if (Object.keys(temiz).length === 0) return;

  await updateDoc(doc(db, 'users', uid), sanitizeForFirestore({
    ...temiz,
    updatedAt: new Date().toISOString(),
  }));
}


/* ==========================================================================
 *  TAHSILAT / KASA
 *
 *  Eskiden tahsilat yalnizca siparisin icine (orders/{id}.settlement) bir alan
 *  olarak yaziliyordu. Bunun sonucu: kasa dokumu yok, odeme tipine gore kirilim
 *  yok, cari borcu dusmuyor, "bugun kasaya ne girdi" sorusu cevapsiz.
 *  Artik her tahsilat 'payments' koleksiyonunda bagimsiz bir kayit ve ayni
 *  anda cari hareketi olusturup bakiyeyi guncelliyor. (19.09.2026)
 * ========================================================================== */

/** THS-2026-00042 bicimli makbuz numarasi. */
export function yeniTahsilatNo(sonuncu?: string): string {
  const yil = new Date().getFullYear();
  const sira = sonuncu && sonuncu.startsWith(`THS-${yil}-`)
    ? parseInt(sonuncu.slice(-5), 10) + 1
    : 1;
  return `THS-${yil}-${String(sira).padStart(5, '0')}`;
}

/** Tahsilatlar icin canli dinleyici. Admin hepsini, musteri kendisininkini gorur. */
export function subscribeToPayments(
  callback: (list: Payment[]) => void,
  access: DataAccess
): () => void {
  if (!access.isAdmin && !access.uid) {
    callback([]);
    return () => {};
  }

  const ref = collection(db, 'payments');
  const q = access.isAdmin
    ? query(ref, orderBy('date', 'desc'))
    : query(ref, where('customerUid', '==', access.uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Payment[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Payment, 'id'>) }));
      callback(access.isAdmin ? list : sortByCreatedAtDesc(list as any) as Payment[]);
    },
    (error) => console.error('[SIATEK/Firestore] Tahsilatlar okunamadi ->', (error as any)?.code || '(kod yok)', (error as any)?.message || error)
  );
}

/**
 * Tahsilati kaydeder VE cari etkisini yazar.
 *  1) payments/{id}
 *  2) cariId varsa cari_transactions/{id} (direction: 'credit' = borc azalir)
 *  3) cariId varsa cari kartin bakiye/toplam alanlarini gunceller
 * Cari bagli degilse (or. perakende nakit satis) yalnizca 1. adim calisir;
 * tahsilat yine de kasada gorunur.
 */
export async function recordPaymentInFirestore(payment: Payment): Promise<void> {
  await setDoc(doc(db, 'payments', payment.id), sanitizeForFirestore(payment));

  if (!payment.cariId) return;

  const tx: CariTransaction = {
    id: `CTX-${payment.id}`,
    cariId: payment.cariId,
    date: payment.date,
    type: 'payment_received',
    amount: payment.amount,
    direction: 'credit',
    description: payment.orderNumber
      ? `${payment.orderNumber} tahsilat (${payment.method})`
      : `Tahsilat (${payment.method})`,
    documentNo: payment.receiptNo,
    paymentMethod: payment.method,
    orderId: payment.orderId,
    createdAt: payment.createdAt,
  };
  await saveCariTransactionToFirestore(tx);

  // Bakiye guncellemesi: oku-degistir-yaz. Tahsilat borcu azaltir.
  const cariRef = doc(db, 'cari_accounts', payment.cariId);
  const snap = await getDoc(cariRef);
  if (!snap.exists()) return;
  const d = snap.data() as CariAccount;
  await updateDoc(cariRef, sanitizeForFirestore({
    balance: Number(d.balance || 0) - payment.amount,
    totalCredit: Number(d.totalCredit || 0) + payment.amount,
    lastTransactionDate: payment.date,
    lastTransactionDesc: tx.description,
    updatedAt: new Date().toISOString(),
  }));
}

/** Kasa dokumu: odeme tipine gore toplamlar + genel toplam. */
export function kasaDokumu(payments: Payment[]): {
  toplam: number;
  adet: number;
  yontemler: { yontem: PaymentMethod; toplam: number; adet: number }[];
} {
  const YONTEMLER: PaymentMethod[] = ['Nakit', 'Kredi Kartı', 'Havale/EFT', 'Çek/Senet'];
  const yontemler = YONTEMLER.map((yontem) => {
    const grup = payments.filter((p) => p.method === yontem);
    return {
      yontem,
      toplam: grup.reduce((t, p) => t + Number(p.amount || 0), 0),
      adet: grup.length,
    };
  });
  return {
    toplam: payments.reduce((t, p) => t + Number(p.amount || 0), 0),
    adet: payments.length,
    yontemler,
  };
}

/* ==========================================================================
 *  ÇEK / SENET TAKİP
 * ========================================================================== */

export async function saveCekSenetToFirestore(data: CekSenet): Promise<void> {
  const ref = data.id ? doc(db, 'cek_senet', data.id) : doc(collection(db, 'cek_senet'));
  await setDoc(ref, { ...data, id: ref.id, updatedAt: new Date().toISOString() });
}

export async function updateCekSenetInFirestore(id: string, data: Partial<CekSenet>): Promise<void> {
  await updateDoc(doc(db, 'cek_senet', id), { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteCekSenetFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, 'cek_senet', id));
}

export function subscribeToCekSenetList(callback: (list: CekSenet[]) => void): () => void {
  const q = query(collection(db, 'cek_senet'), orderBy('vadeTarihi', 'asc'));
  return onSnapshot(q,
    snap => callback(snap.docs.map(d => d.data() as CekSenet)),
    err => { console.error('[SIATEK] cek_senet:', err.code); callback([]); }
  );
}

/* ==========================================================================
 *  KASA HAREKETLERİ
 * ========================================================================== */

export async function saveKasaHareketiToFirestore(data: KasaHareketi): Promise<void> {
  const ref = data.id ? doc(db, 'kasa_hareketleri', data.id) : doc(collection(db, 'kasa_hareketleri'));
  await setDoc(ref, { ...data, id: ref.id, updatedAt: new Date().toISOString() });
}

export async function updateKasaHareketiInFirestore(id: string, data: Partial<KasaHareketi>): Promise<void> {
  await updateDoc(doc(db, 'kasa_hareketleri', id), { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteKasaHareketiFromFirestore(id: string): Promise<void> {
  const ref = doc(db, 'kasa_hareketleri', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const original = { id, ...(snap.data() as Omit<KasaHareketi, 'id'>) } as KasaHareketi;
  if (original.reversedById) return;
  const reversal = createKasaReversal(original);
  const batch = writeBatch(db);
  batch.set(doc(db, 'kasa_hareketleri', reversal.id), sanitizeForFirestore(reversal));
  batch.update(ref, sanitizeForFirestore({
    status: 'void',
    reversedById: reversal.id,
    updatedAt: new Date().toISOString(),
  }));
  await batch.commit();
}

export function subscribeToKasaHareketleri(callback: (list: KasaHareketi[]) => void, onError?: FirestoreReadErrorHandler): () => void {
  const q = query(collection(db, 'kasa_hareketleri'), orderBy('tarih', 'desc'));
  return onSnapshot(q,
    snap => callback(snap.docs.map(d => d.data() as KasaHareketi)),
    err => { console.error('[SIATEK] kasa_hareketleri:', err.code); onError?.(classifyFirestoreReadError(err)); }
  );
}

/* ==========================================================================
 *  GİDER TAKİP
 * ========================================================================== */

export async function saveGiderKaydiToFirestore(data: GiderKaydi): Promise<void> {
  const ref = data.id ? doc(db, 'gider_kayitlari', data.id) : doc(collection(db, 'gider_kayitlari'));
  await setDoc(ref, { ...data, id: ref.id, updatedAt: new Date().toISOString() });
}

export async function updateGiderKaydiInFirestore(id: string, data: Partial<GiderKaydi>): Promise<void> {
  await updateDoc(doc(db, 'gider_kayitlari', id), { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteGiderKaydiFromFirestore(id: string): Promise<void> {
  await updateDoc(doc(db, 'gider_kayitlari', id), {
    status: 'void',
    reversedById: `VOID-${Date.now()}`,
    updatedAt: new Date().toISOString(),
  });
}

export function subscribeToGiderKayitlari(callback: (list: GiderKaydi[]) => void, ay?: string): () => void {
  const q = query(collection(db, 'gider_kayitlari'), orderBy('tarih', 'desc'));
  return onSnapshot(q,
    snap => {
      let list = snap.docs.map(d => d.data() as GiderKaydi);
      if (ay) list = list.filter(g => g.tarih.startsWith(ay));
      callback(list);
    },
    err => { console.error('[SIATEK] gider_kayitlari:', err.code); callback([]); }
  );
}

/* ==========================================================================
 *  ORTAK ARAÇ HESABI (tek araç / tek ortak)
 * ========================================================================== */

export async function saveOrtakAracFisToFirestore(data: OrtakAracFis): Promise<void> {
  const ref = data.id ? doc(db, 'ortak_arac_fisleri', data.id) : doc(collection(db, 'ortak_arac_fisleri'));
  await setDoc(ref, { ...data, id: ref.id, status: 'active', updatedAt: new Date().toISOString() });
}

export async function updateOrtakAracFisInFirestore(id: string, data: Partial<OrtakAracFis>): Promise<void> {
  await updateDoc(doc(db, 'ortak_arac_fisleri', id), { ...data, updatedAt: new Date().toISOString() });
}

/** Silme yerine iptal: kayıt izi korunur, hesaptan düşer. */
export async function voidOrtakAracFisInFirestore(id: string): Promise<void> {
  await updateDoc(doc(db, 'ortak_arac_fisleri', id), {
    status: 'void',
    reversedById: `VOID-${Date.now()}`,
    updatedAt: new Date().toISOString(),
  });
}

export function subscribeToOrtakAracFisleri(
  callback: (list: OrtakAracFis[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  const q = query(collection(db, 'ortak_arac_fisleri'), orderBy('tarih', 'desc'));
  return onSnapshot(q,
    snap => callback(snap.docs.map(d => d.data() as OrtakAracFis)),
    err => { console.error('[SIATEK] ortak_arac_fisleri:', err.code); onError?.(err); }
  );
}

/* ==========================================================================
 *  ALIŞ FATURALARI
 * ========================================================================== */

export async function saveAlisFaturasToFirestore(data: AlisFaturasi): Promise<void> {
  const ref = data.id ? doc(db, 'alis_faturalari', data.id) : doc(collection(db, 'alis_faturalari'));
  await setDoc(ref, { ...data, id: ref.id, updatedAt: new Date().toISOString() });
}

export async function updateAlisFaturasInFirestore(id: string, data: Partial<AlisFaturasi>): Promise<void> {
  await updateDoc(doc(db, 'alis_faturalari', id), { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteAlisFaturaFromFirestore(id: string): Promise<void> {
  const ref = doc(db, 'alis_faturalari', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const original = { id, ...(snap.data() as Omit<AlisFaturasi, 'id'>) } as AlisFaturasi;
  if (original.reversedById) return;
  const reversal = createAlisFaturaReversal(original);
  const batch = writeBatch(db);
  batch.set(doc(db, 'alis_faturalari', reversal.id), sanitizeForFirestore(reversal));
  batch.update(ref, sanitizeForFirestore({
    durum: 'iptal',
    status: 'void',
    reversedById: reversal.id,
    updatedAt: new Date().toISOString(),
  }));
  await batch.commit();
}

export function subscribeToAlisFaturalari(callback: (list: AlisFaturasi[]) => void, onError?: FirestoreReadErrorHandler): () => void {
  const q = query(collection(db, 'alis_faturalari'), orderBy('tarih', 'desc'));
  return onSnapshot(q,
    snap => callback(snap.docs.map(d => d.data() as AlisFaturasi)),
    err => { console.error('[SIATEK] alis_faturalari:', err.code); onError?.(classifyFirestoreReadError(err)); }
  );
}

/* ==========================================================================
 *  TEDARİKÇİLER
 * ========================================================================== */

export async function saveTedarikciToFirestore(data: Tedarikci): Promise<void> {
  const ref = data.id ? doc(db, 'tedarikciler', data.id) : doc(collection(db, 'tedarikciler'));
  await setDoc(ref, { ...data, id: ref.id, updatedAt: new Date().toISOString() });
}

export async function deleteTedarikciFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, 'tedarikciler', id));
}

export function subscribeToTedarikciler(callback: (list: Tedarikci[]) => void, onError?: FirestoreReadErrorHandler): () => void {
  const q = query(collection(db, 'tedarikciler'), orderBy('ad', 'asc'));
  return onSnapshot(q,
    snap => callback(snap.docs.map(d => d.data() as Tedarikci)),
    err => { console.error('[SIATEK] tedarikciler:', err.code); onError?.(classifyFirestoreReadError(err)); }
  );
}

// ==========================================
// TEDARİKÇİ CARİ İŞLEMLERİ
// ==========================================

export async function saveTedarikciIslemToFirestore(islem: TedarikciIslem): Promise<void> {
  const ref = islem.id
    ? doc(db, 'tedarikci_islemleri', islem.id)
    : doc(collection(db, 'tedarikci_islemleri'));
  await setDoc(ref, sanitizeForFirestore({ ...islem, id: ref.id }));
}

export async function deleteTedarikciIslemFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, 'tedarikci_islemleri', id));
}

export function subscribeToTedarikciIslemleri(
  tedarikciAdi: string,
  callback: (list: TedarikciIslem[]) => void,
  onError?: FirestoreReadErrorHandler
): () => void {
  const q = query(
    collection(db, 'tedarikci_islemleri'),
    where('tedarikciAdi', '==', tedarikciAdi),
    orderBy('tarih', 'desc')
  );
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as TedarikciIslem))),
    err => { console.error('[SIATEK] tedarikci_islemleri:', err.code); onError?.(classifyFirestoreReadError(err)); }
  );
}
