import type { AlisFaturasi, GiderKaydi, KasaHareket, KasaHareketi, Order, OrtakAracFis } from '../types';

const ROUND = 100;

export function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * ROUND) / ROUND;
}

export function periodOf(dateLike?: string): string {
  return String(dateLike || new Date().toISOString()).slice(0, 7);
}

export function isPeriodLocked(period: string, lockedPeriods: string[] = []): boolean {
  return lockedPeriods.includes(period);
}

export function activeAccountingRows<T extends { status?: string; reversedById?: string }>(rows: T[]): T[] {
  return rows.filter((row) => row.status !== 'void' && !row.reversedById);
}

export function createKasaReversal(original: KasaHareketi, now = new Date().toISOString()): KasaHareketi {
  const reverseTip: KasaHareket = original.tip === 'giris' ? 'cikis' : 'giris';
  return {
    ...original,
    id: `KH-REV-${Date.now()}`,
    tip: reverseTip,
    aciklama: `İptal düzeltmesi: ${original.aciklama}`,
    referansNo: original.referansNo || original.id,
    status: 'void',
    reversalOfId: original.id,
    reversedById: undefined,
    lockedPeriod: periodOf(original.tarih),
    createdAt: now,
    updatedAt: now,
  };
}

export function createAlisFaturaReversal(original: AlisFaturasi, now = new Date().toISOString()): AlisFaturasi {
  return {
    ...original,
    id: `ALF-REV-${Date.now()}`,
    faturaNo: `IPTAL-${original.faturaNo}`,
    kalemler: original.kalemler.map((kalem) => ({
      ...kalem,
      miktar: -Math.abs(Number(kalem.miktar || 0)),
      kdvTutar: -Math.abs(Number(kalem.kdvTutar || 0)),
      toplam: -Math.abs(Number(kalem.toplam || 0)),
    })),
    araToplam: -Math.abs(Number(original.araToplam || 0)),
    kdvToplam: -Math.abs(Number(original.kdvToplam || 0)),
    genelToplam: -Math.abs(Number(original.genelToplam || 0)),
    durum: 'iptal',
    aciklama: `İptal düzeltmesi: ${original.aciklama || original.faturaNo}`,
    status: 'void',
    reversalOfId: original.id,
    reversedById: undefined,
    lockedPeriod: periodOf(original.tarih),
    createdAt: now,
    updatedAt: now,
  };
}

export function calculateVatSummary(input: {
  giderler: GiderKaydi[];
  alisFaturalari?: AlisFaturasi[];
  period: string;
}) {
  const giderRows = input.giderler
    .filter((g) => (g.tarih || '').startsWith(input.period) && g.kdvDahil)
    .map((g) => ({
      id: g.id,
      date: g.tarih,
      source: 'gider' as const,
      documentNo: g.faturaSeriNo || g.id,
      title: g.aciklama,
      party: g.tedarikci || '',
      vatRate: Number(g.kdvOrani || 0),
      vatAmount: roundMoney(Number(g.kdvTutar || 0)),
      grossAmount: roundMoney(Number(g.tutar || 0)),
    }));

  const invoiceRows = activeAccountingRows(input.alisFaturalari || [])
    .filter((f) => (f.tarih || '').startsWith(input.period) && f.durum !== 'taslak')
    .flatMap((f) =>
      f.kalemler.map((kalem, index) => ({
        id: `${f.id}-${index}`,
        date: f.tarih,
        source: 'alis_faturasi' as const,
        documentNo: f.faturaNo,
        title: kalem.urunAdi || f.aciklama || f.faturaNo,
        party: f.tedarikciAdi,
        vatRate: Number(kalem.kdvOrani || 0),
        vatAmount: roundMoney(Number(kalem.kdvTutar || 0)),
        grossAmount: roundMoney(Number(kalem.toplam || 0)),
      }))
    );

  const rows = [...giderRows, ...invoiceRows].filter((r) => r.vatAmount !== 0);
  return {
    rows,
    totalVat: roundMoney(rows.reduce((sum, row) => sum + row.vatAmount, 0)),
    totalGross: roundMoney(rows.reduce((sum, row) => sum + row.grossAmount, 0)),
  };
}

export function calculateProfitLoss(input: {
  orders: Order[];
  giderler: GiderKaydi[];
  alisFaturalari?: AlisFaturasi[];
  period: string;
}) {
  const sales = input.orders.filter(
    (o) => o.status === 'delivered' && (o.deliveredAt || o.createdAt || '').startsWith(input.period)
  );
  const expenses = input.giderler.filter((g) => (g.tarih || '').startsWith(input.period));
  const purchaseInvoices = activeAccountingRows(input.alisFaturalari || []).filter(
    (f) => (f.tarih || '').startsWith(input.period) && f.durum !== 'taslak'
  );

  const revenue = roundMoney(sales.reduce((sum, order) => sum + Number(order.total || 0), 0));
  const operatingExpense = roundMoney(expenses.reduce((sum, gider) => sum + Number(gider.tutar || 0), 0));
  const purchaseCost = roundMoney(purchaseInvoices.reduce((sum, invoice) => sum + Number(invoice.genelToplam || 0), 0));
  const totalExpense = roundMoney(operatingExpense + purchaseCost);
  const profit = roundMoney(revenue - totalExpense);

  return {
    revenue,
    operatingExpense,
    purchaseCost,
    totalExpense,
    profit,
    marginPercent: revenue > 0 ? (profit / revenue) * 100 : 0,
    salesCount: sales.length,
    expenseCount: expenses.length + purchaseInvoices.length,
  };
}

/** Ortak araç hesabında ortağın sabit pay oranı (yarı yarıya). */
export const ORTAK_ARAC_ORTAK_PAY_ORANI = 0.5;

/**
 * Ortak araç hesabı: net = satışlar − mal maliyeti − tüm araç giderleri.
 * Kâr da zarar da eşit paylaşılır. Dönem özeti `period` (YYYY-MM) içindir;
 * cari bakiye ise tüm zamanların net payı ile ortak ödemelerinin farkıdır.
 */
export function calculateOrtakAracHesap(fisler: OrtakAracFis[], period: string) {
  const active = activeAccountingRows(fisler);
  const inPeriod = active.filter((f) => (f.tarih || '').startsWith(period));

  const summarize = (rows: OrtakAracFis[]) => {
    const revenue = roundMoney(rows.filter((f) => f.tur === 'satis').reduce((s, f) => s + Number(f.tutar || 0), 0));
    const goodsCost = roundMoney(rows.filter((f) => f.tur === 'satis').reduce((s, f) => s + Number(f.malMaliyeti || 0), 0));
    const expenses = roundMoney(rows.filter((f) => f.tur === 'gider').reduce((s, f) => s + Number(f.tutar || 0), 0));
    const net = roundMoney(revenue - goodsCost - expenses);
    const partnerShare = roundMoney(net * ORTAK_ARAC_ORTAK_PAY_ORANI);
    const ourShare = roundMoney(net - partnerShare);
    return { revenue, goodsCost, expenses, net, partnerShare, ourShare };
  };

  const expenseByCategory: Record<string, number> = {};
  for (const f of inPeriod) {
    if (f.tur !== 'gider') continue;
    const key = f.giderKategori || 'diger';
    expenseByCategory[key] = roundMoney((expenseByCategory[key] || 0) + Number(f.tutar || 0));
  }

  const allTime = summarize(active);
  const paidToPartner = roundMoney(
    active.filter((f) => f.tur === 'ortak_odeme').reduce(
      (s, f) => s + (f.odemeYonu === 'ortaktan_aldik' ? -1 : 1) * Number(f.tutar || 0),
      0,
    ),
  );
  /** Pozitif: ortağa borcumuz var · negatif: ortak bize borçlu. */
  const partnerBalance = roundMoney(allTime.partnerShare - paidToPartner);

  return {
    period: summarize(inPeriod),
    expenseByCategory,
    receiptCount: inPeriod.length,
    allTime,
    paidToPartner,
    partnerBalance,
  };
}
