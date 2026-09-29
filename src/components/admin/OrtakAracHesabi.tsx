import { useEffect, useMemo, useState } from 'react';
import {
  subscribeToOrtakAracFisleri,
  saveOrtakAracFisToFirestore,
  voidOrtakAracFisInFirestore,
} from '../../lib/firestoreService';
import { calculateOrtakAracHesap, activeAccountingRows, roundMoney } from '../../utils/financeEngine';
import type {
  OrtakAracFis,
  OrtakAracFisTur,
  OrtakAracGiderKategori,
  OrtakAracOdemeYonu,
} from '../../types';
import { Truck, Plus, X, CheckCircle2, AlertCircle, Receipt, ChevronDown, Handshake, Ban, Printer } from 'lucide-react';

const PLAKA = '11 ACH 644';
const ORTAK_YUZDE = 50;

const GiderKategoriLabel: Record<OrtakAracGiderKategori, string> = {
  sofor_maas: 'Şoför Maaşı',
  yakit: 'Yakıt',
  yemek: 'Yeme / İçme',
  vergi_harc: 'Vergi & Harç',
  bakim_onarim: 'Bakım & Onarım',
  sigorta: 'Sigorta',
  diger: 'Diğer',
};

const TurLabel: Record<OrtakAracFisTur, string> = {
  satis: 'Satış',
  gider: 'Gider',
  ortak_odeme: 'Ortak Ödemesi',
};

const TurRenk: Record<OrtakAracFisTur, string> = {
  satis: 'bg-bg-success text-success-text border-success-border',
  gider: 'bg-bg-danger text-danger-text border-danger-border',
  ortak_odeme: 'bg-bg-info text-info-text border-info-border',
};

const num = 'font-mono tabular-nums';

type Gorunum = 'ozet' | 'fisler' | 'cari';
const GORUNUMLER: Array<{ id: Gorunum; label: string }> = [
  { id: 'ozet', label: 'Özet' },
  { id: 'fisler', label: 'Fişler' },
  { id: 'cari', label: 'Ortak Cari' },
];

function formatTL(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}

function ayEtiketi(ay: string): string {
  const [y, m] = ay.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
}

function bosForm() {
  return {
    tur: 'satis' as OrtakAracFisTur,
    tarih: new Date().toISOString().split('T')[0],
    tutar: '',
    malMaliyeti: '',
    giderKategori: 'yakit' as OrtakAracGiderKategori,
    odemeYonu: 'ortaga_odedik' as OrtakAracOdemeYonu,
    fisNo: '',
    aciklama: '',
  };
}

const inputCls =
  'w-full min-h-[44px] px-3 py-2 rounded-xl bg-base-surface-2 border border-border text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40';

export default function OrtakAracHesabi() {
  const now = new Date();
  const buAy = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [seciliAy, setSeciliAy] = useState(buAy);
  const [fisler, setFisler] = useState<OrtakAracFis[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [okumaHatasi, setOkumaHatasi] = useState(false);
  const [yenidenDene, setYenidenDene] = useState(0);
  const [modalAcik, setModalAcik] = useState(false);
  const [form, setForm] = useState(bosForm());
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [formHata, setFormHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);
  const [iptalOnayId, setIptalOnayId] = useState<string | null>(null);
  const [islemHatasi, setIslemHatasi] = useState<string | null>(null);
  const [gorunum, setGorunum] = useState<Gorunum>('ozet');

  useEffect(() => {
    setYukleniyor(true);
    setOkumaHatasi(false);
    const unsub = subscribeToOrtakAracFisleri(
      (list) => {
        setFisler(list);
        setYukleniyor(false);
      },
      () => {
        setOkumaHatasi(true);
        setYukleniyor(false);
      },
    );
    return unsub;
  }, [yenidenDene]);

  useEffect(() => {
    if (!basari) return;
    const t = window.setTimeout(() => setBasari(null), 3500);
    return () => window.clearTimeout(t);
  }, [basari]);

  const ayListesi = useMemo(() => {
    const list: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buAy]);

  const hesap = useMemo(() => calculateOrtakAracHesap(fisler, seciliAy), [fisler, seciliAy]);
  const listeFisler = useMemo(
    () => activeAccountingRows(fisler).filter((f) => f.tarih.startsWith(seciliAy)),
    [fisler, seciliAy],
  );
  const ortakOdemeleri = useMemo(
    () => activeAccountingRows(fisler).filter((f) => f.tur === 'ortak_odeme'),
    [fisler],
  );
  const giderDagilimi = useMemo(
    () =>
      Object.entries(hesap.expenseByCategory)
        .map(([kat, toplam]) => ({ kat: kat as OrtakAracGiderKategori, toplam }))
        .sort((a, b) => b.toplam - a.toplam),
    [hesap],
  );
  const maxGider = giderDagilimi[0]?.toplam || 1;

  const gosterilenFisler = gorunum === 'cari' ? ortakOdemeleri : listeFisler;
  const p = hesap.period;
  const zarar = p.net < 0;
  const bakiye = hesap.partnerBalance;

  const setF = <K extends keyof ReturnType<typeof bosForm>>(k: K, v: ReturnType<typeof bosForm>[K]) => {
    setFormHata(null);
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  const yeniAc = () => {
    setForm(bosForm());
    setFormHata(null);
    setModalAcik(true);
  };

  const kaydet = async () => {
    if (kaydediliyor) return;
    const tutar = parseFloat(String(form.tutar).replace(',', '.'));
    const maliyet = parseFloat(String(form.malMaliyeti).replace(',', '.')) || 0;
    if (!(tutar > 0)) return setFormHata('Tutar 0’dan büyük olmalı.');
    if (!form.tarih) return setFormHata('Tarih seçin.');
    if (form.tur === 'satis' && maliyet < 0) return setFormHata('Mal maliyeti negatif olamaz.');

    const ts = new Date().toISOString();
    const fis: OrtakAracFis = {
      id: '',
      tur: form.tur,
      tutar: roundMoney(tutar),
      aciklama: form.aciklama.trim(),
      fisNo: form.fisNo.trim() || undefined,
      tarih: form.tarih,
      createdAt: ts,
      updatedAt: ts,
      ...(form.tur === 'satis' ? { malMaliyeti: roundMoney(maliyet) } : {}),
      ...(form.tur === 'gider' ? { giderKategori: form.giderKategori } : {}),
      ...(form.tur === 'ortak_odeme' ? { odemeYonu: form.odemeYonu } : {}),
    };
    // undefined alanları Firestore reddeder
    if (!fis.fisNo) delete fis.fisNo;

    setKaydediliyor(true);
    setFormHata(null);
    try {
      await saveOrtakAracFisToFirestore(fis);
      setModalAcik(false);
      if (form.tarih.slice(0, 7) !== seciliAy) setSeciliAy(form.tarih.slice(0, 7));
      setBasari(`${TurLabel[form.tur]} fişi kaydedildi.`);
    } catch (err) {
      console.error('[SIATEK] ortak_arac_fisleri kaydet:', err);
      setFormHata('Kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setKaydediliyor(false);
    }
  };

  const iptalEt = async (id: string) => {
    setIslemHatasi(null);
    try {
      await voidOrtakAracFisInFirestore(id);
      setIptalOnayId(null);
      setBasari('Fiş iptal edildi.');
    } catch (err) {
      console.error('[SIATEK] ortak_arac_fisleri iptal:', err);
      setIptalOnayId(null);
      setIslemHatasi('Fiş iptal edilemedi. Tekrar deneyin.');
    }
  };

  const fisBaslik = (f: OrtakAracFis) => {
    if (f.tur === 'gider') return GiderKategoriLabel[f.giderKategori || 'diger'];
    if (f.tur === 'ortak_odeme') return f.odemeYonu === 'ortaktan_aldik' ? 'Ortaktan alınan' : 'Ortağa ödenen';
    return 'Satış';
  };

  const onizlemeKar =
    form.tur === 'satis'
      ? roundMoney((parseFloat(String(form.tutar).replace(',', '.')) || 0) - (parseFloat(String(form.malMaliyeti).replace(',', '.')) || 0))
      : 0;

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="bg-base-surface p-4 sm:p-5 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-success-fill/15 text-success-text border border-success-border/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">Ortak Araç Hesabı</h2>
              <p className="text-xs text-text-muted">
                <span className={`${num} font-bold text-text-secondary`}>{PLAKA}</span> · %{ORTAK_YUZDE} ortak · kâr ve zarar yarı yarıya
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="min-h-[44px] px-3 rounded-xl bg-base-surface-2 border border-border text-xs font-bold text-text-secondary hover:text-text-primary cursor-pointer active:scale-[0.98] transition-all flex items-center gap-2 print:hidden"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Yazdır</span>
            </button>
            <button
              onClick={yeniAc}
              className="min-h-[44px] px-4 rounded-xl bg-success-fill hover:opacity-90 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-[0.98] transition-all flex items-center gap-2 print:hidden"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Fiş</span>
            </button>
          </div>
        </div>

        <div className="relative w-fit">
          <select
            value={seciliAy}
            onChange={(e) => setSeciliAy(e.target.value)}
            aria-label="Dönem"
            className="appearance-none min-h-[44px] pl-3 pr-8 rounded-lg bg-base-surface-2 border border-border text-xs font-semibold text-text-primary cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500/50"
          >
            {ayListesi.map((a) => (
              <option key={a} value={a}>{ayEtiketi(a)}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
        </div>
      </div>

      {basari && (
        <div role="status" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-bg-success border border-success-border text-success-text text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {basari}
        </div>
      )}

      <div role="tablist" aria-label="Ortak araç görünümü" className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-base-surface-2 border border-border print:hidden">
        {GORUNUMLER.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={gorunum === g.id}
            onClick={() => setGorunum(g.id)}
            className={`min-h-[44px] rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-[0.98] ${
              gorunum === g.id ? 'bg-base-surface text-text-primary border border-border shadow-2xs' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {islemHatasi && (
        <div role="alert" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-bg-danger border border-danger-border text-danger-text text-xs font-bold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {islemHatasi}
        </div>
      )}

      {okumaHatasi ? (
        <div role="alert" className="bg-base-surface p-6 rounded-2xl border border-danger-border/40 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-danger-text mx-auto" />
          <p className="text-sm font-bold text-text-primary">Fişler yüklenemedi</p>
          <p className="text-xs text-text-muted">Bağlantınızı kontrol edin. Yönetici yetkisiyle giriş yaptığınızdan emin olun.</p>
          <button
            onClick={() => setYenidenDene((n) => n + 1)}
            className="min-h-[44px] px-4 rounded-xl bg-base-surface-2 border border-border text-xs font-bold text-text-primary cursor-pointer active:scale-[0.98]"
          >
            Tekrar Dene
          </button>
        </div>
      ) : yukleniyor ? (
        <div className="space-y-4" aria-busy="true" aria-label="Yükleniyor">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-base-surface-2 border border-border animate-pulse" />
            ))}
          </div>
          <div className="h-40 rounded-2xl bg-base-surface-2 border border-border animate-pulse" />
        </div>
      ) : (
        <>
          {gorunum === 'ozet' && (
            <>
          {/* Özet */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Satış Cirosu', v: p.revenue, c: 'text-success-text' },
              { label: 'Mal Maliyeti', v: p.goodsCost, c: 'text-text-primary' },
              { label: 'Araç Giderleri', v: p.expenses, c: 'text-danger-text' },
              { label: zarar ? 'Net Zarar' : 'Net Kâr', v: p.net, c: zarar ? 'text-danger-text' : 'text-success-text' },
            ].map((k) => (
              <div key={k.label} className="p-3.5 rounded-2xl border border-border bg-base-surface">
                <p className="text-[11px] font-bold text-text-muted">{k.label}</p>
                <p className={`text-lg font-black mt-1 ${num} ${k.c}`}>{formatTL(k.v)}</p>
                <p className="text-[10px] text-text-muted mt-0.5">{ayEtiketi(seciliAy)}</p>
              </div>
            ))}
          </div>

          {/* Paylaşım + cari */}
          <div className="grid gap-3">
            <div className="p-4 rounded-2xl border border-border bg-base-surface space-y-3">
              <h3 className="text-xs font-bold text-text-primary flex items-center gap-2">
                <Handshake className="w-3.5 h-3.5 text-text-muted" />
                {ayEtiketi(seciliAy)} paylaşımı (%{ORTAK_YUZDE} / %{100 - ORTAK_YUZDE})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-base-surface-2 border border-border">
                  <p className="text-[11px] font-bold text-text-muted">Bizim payımız</p>
                  <p className={`text-base font-black mt-1 ${num} ${p.ourShare < 0 ? 'text-danger-text' : 'text-text-primary'}`}>{formatTL(p.ourShare)}</p>
                </div>
                <div className="p-3 rounded-xl bg-base-surface-2 border border-border">
                  <p className="text-[11px] font-bold text-text-muted">Ortağın payı</p>
                  <p className={`text-base font-black mt-1 ${num} ${p.partnerShare < 0 ? 'text-danger-text' : 'text-text-primary'}`}>{formatTL(p.partnerShare)}</p>
                </div>
              </div>
              {zarar && <p className="text-[11px] text-warning-text">Bu dönem zarar var; zarar da yarı yarıya paylaşılır.</p>}
            </div>
            <button
              type="button"
              onClick={() => setGorunum('cari')}
              className="w-full min-h-[44px] flex items-center justify-between gap-3 px-4 rounded-2xl border border-border bg-base-surface text-left cursor-pointer active:scale-[0.99] transition-all"
            >
              <span className="text-xs font-bold text-text-secondary">Ortak cari</span>
              <span className={`text-xs font-black ${num} text-text-primary`}>
                {formatTL(Math.abs(bakiye))} · {bakiye > 0 ? 'ortağa borcumuz var' : bakiye < 0 ? 'ortak bize borçlu' : 'hesap kapalı'}
              </span>
            </button>
          </div>

          {/* Gider dağılımı */}
          {giderDagilimi.length > 0 && (
            <div className="bg-base-surface p-4 rounded-2xl border border-border shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-text-primary">Gider dağılımı — {ayEtiketi(seciliAy)}</h3>
              <div className="space-y-2">
                {giderDagilimi.map(({ kat, toplam }) => (
                  <div key={kat} className="flex items-center gap-2">
                    <span className="w-28 sm:w-36 text-[11px] font-semibold text-text-secondary truncate shrink-0">{GiderKategoriLabel[kat]}</span>
                    <div className="flex-1 h-4 bg-base-surface-2 rounded-full overflow-hidden border border-border/50">
                      <div className="h-full rounded-full bg-danger-fill/70" style={{ width: `${Math.max(2, (toplam / maxGider) * 100)}%` }} />
                    </div>
                    <span className={`w-28 text-[11px] font-bold text-text-primary text-right shrink-0 ${num}`}>{formatTL(toplam)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

            </>
          )}

          {gorunum === 'cari' && (
            <>
          <div className="grid lg:grid-cols-2 gap-3">
            <div
              className={`p-4 rounded-2xl border space-y-1 ${
                bakiye > 0 ? 'bg-bg-warning/30 border-warning-border/50' : bakiye < 0 ? 'bg-bg-info/30 border-info-border/50' : 'bg-bg-success/20 border-success-border/40'
              }`}
            >
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Ortak cari (tüm zamanlar)</p>
              <p className={`text-xl font-black ${num} text-text-primary`}>{formatTL(Math.abs(bakiye))}</p>
              <p className="text-xs font-semibold text-text-secondary">
                {bakiye > 0 ? 'Ortağa borcumuz var' : bakiye < 0 ? 'Ortak bize borçlu' : 'Hesap kapalı, borç yok'}
              </p>
              <p className="text-[10px] text-text-muted">
                Tahsilatın bizde olduğu varsayılır. Ortağa yapılan ödemeleri “Ortak Ödemesi” fişiyle girin.
              </p>
            </div>
            <div className="p-4 rounded-2xl border border-border bg-base-surface space-y-2">
              <h3 className="text-xs font-bold text-text-primary flex items-center gap-2">
                <Handshake className="w-3.5 h-3.5 text-text-muted" />
                Hesap dökümü (tüm zamanlar)
              </h3>
              {[
                ['Ortağın toplam payı', hesap.allTime.partnerShare],
                ['Ortağa net ödenen', hesap.paidToPartner],
              ].map(([l, v]) => (
                <div key={l as string} className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary font-semibold">{l as string}</span>
                  <span className={`font-bold text-text-primary ${num}`}>{formatTL(v as number)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                <span className="text-text-primary font-bold">Kalan</span>
                <span className={`font-black text-text-primary ${num}`}>{formatTL(bakiye)}</span>
              </div>
            </div>
          </div>

            </>
          )}

          {gorunum !== 'ozet' && (
            <>
          {/* Fiş listesi */}
          <div className="bg-base-surface rounded-2xl border border-border shadow-xs overflow-hidden">
            {gosterilenFisler.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <Receipt className="w-10 h-10 text-text-muted mx-auto" />
                <p className="text-sm font-semibold text-text-primary">{gorunum === 'cari' ? 'Henüz ortak ödemesi yok' : `${ayEtiketi(seciliAy)} için fiş yok`}</p>
                <p className="text-xs text-text-muted">{gorunum === 'cari' ? 'Ortağa yaptığınız ödemeleri ya da aldığınız avansları fişle girin.' : 'Satış, gider ya da ortak ödemesi fişi ekleyin; hesap otomatik oluşur.'}</p>
                <button
                  onClick={yeniAc}
                  className="min-h-[44px] px-4 rounded-xl bg-success-fill text-white text-xs font-bold cursor-pointer hover:opacity-90 active:scale-[0.98]"
                >
                  İlk Fişi Ekle
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {gosterilenFisler.map((f) => {
                  const kar = f.tur === 'satis' ? roundMoney(f.tutar - Number(f.malMaliyeti || 0)) : null;
                  return (
                    <div key={f.id} className="flex items-center gap-3 px-4 py-3 hover:bg-base-surface-2/40 transition-colors">
                      <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${TurRenk[f.tur]}`}>
                        {TurLabel[f.tur]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-text-primary truncate">
                          {fisBaslik(f)}{f.aciklama ? ` · ${f.aciklama}` : ''}
                        </p>
                        <p className={`text-[10px] text-text-muted ${num}`}>
                          {f.tarih}{f.fisNo ? ` · #${f.fisNo}` : ''}
                          {kar !== null ? ` · maliyet ${formatTL(Number(f.malMaliyeti || 0))} · kâr ${formatTL(kar)}` : ''}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-black shrink-0 ${num} ${
                          f.tur === 'satis' ? 'text-success-text' : f.tur === 'gider' ? 'text-danger-text' : 'text-info-text'
                        }`}
                      >
                        {f.tur === 'gider' ? '−' : f.tur === 'ortak_odeme' && f.odemeYonu !== 'ortaktan_aldik' ? '→ ' : ''}
                        {formatTL(f.tutar)}
                      </span>
                      {iptalOnayId === f.id ? (
                        <div className="flex items-center gap-1 shrink-0 print:hidden">
                          <button
                            onClick={() => iptalEt(f.id)}
                            className="min-h-[44px] px-3 rounded-lg bg-bg-danger text-danger-text border border-danger-border text-[11px] font-bold cursor-pointer active:scale-[0.98]"
                          >
                            İptal Et
                          </button>
                          <button
                            onClick={() => setIptalOnayId(null)}
                            aria-label="Vazgeç"
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-base-surface-2 border border-border text-text-muted cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIptalOnayId(f.id)}
                          title="Fişi iptal et"
                          aria-label="Fişi iptal et"
                          className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-base-surface-2 hover:bg-bg-danger/30 text-text-muted hover:text-danger-text border border-border transition-all cursor-pointer active:scale-[0.98] print:hidden"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
            </>
          )}
        </>
      )}

      {/* Fiş modalı */}
      {modalAcik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !kaydediliyor && setModalAcik(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Yeni fiş"
            className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-base-surface rounded-2xl border border-border shadow-xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">Yeni Fiş — {PLAKA}</h3>
              <button onClick={() => setModalAcik(false)} aria-label="Kapat" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-base-surface-2 border border-border">
              {(['satis', 'gider', 'ortak_odeme'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setF('tur', t)}
                  className={`min-h-[44px] rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-[0.98] ${
                    form.tur === t ? 'bg-base-surface text-text-primary border border-border shadow-2xs' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {TurLabel[t]}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">Tarih *</label>
                <input type="date" value={form.tarih} onChange={(e) => setF('tarih', e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">
                  {form.tur === 'satis' ? 'Satış Tutarı (₺) *' : form.tur === 'gider' ? 'Gider Tutarı (₺) *' : 'Ödeme Tutarı (₺) *'}
                </label>
                <input type="number" inputMode="decimal" min="0" step="0.01" value={form.tutar} onChange={(e) => setF('tutar', e.target.value)} placeholder="0,00" className={`${inputCls} ${num}`} />
              </div>

              {form.tur === 'satis' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-text-muted uppercase">Mal Maliyeti (₺)</label>
                    <input type="number" inputMode="decimal" min="0" step="0.01" value={form.malMaliyeti} onChange={(e) => setF('malMaliyeti', e.target.value)} placeholder="0,00" className={`${inputCls} ${num}`} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-text-muted uppercase">Bu Satışın Kârı</label>
                    <div className={`min-h-[44px] flex items-center px-3 rounded-xl bg-base-surface-2/50 border border-border/50 text-sm font-bold ${num} ${onizlemeKar < 0 ? 'text-danger-text' : 'text-success-text'}`}>
                      {formatTL(onizlemeKar)}
                    </div>
                  </div>
                </>
              )}

              {form.tur === 'gider' && (
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-text-muted uppercase">Gider Türü</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(GiderKategoriLabel) as OrtakAracGiderKategori[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setF('giderKategori', k)}
                        className={`min-h-[44px] px-3 rounded-lg text-xs font-bold cursor-pointer border transition-all active:scale-[0.98] ${
                          form.giderKategori === k ? 'bg-brand-500/20 text-brand-600 dark:text-brand-400 border-brand-500/40' : 'bg-base-surface-2 text-text-muted border-border hover:border-border-strong'
                        }`}
                      >
                        {GiderKategoriLabel[k]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.tur === 'ortak_odeme' && (
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-text-muted uppercase">Yön</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      ['ortaga_odedik', 'Ortağa ödedik'],
                      ['ortaktan_aldik', 'Ortaktan aldık'],
                    ] as const).map(([k, l]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setF('odemeYonu', k)}
                        className={`min-h-[44px] rounded-lg text-xs font-bold cursor-pointer border transition-all active:scale-[0.98] ${
                          form.odemeYonu === k ? 'bg-brand-500/20 text-brand-600 dark:text-brand-400 border-brand-500/40' : 'bg-base-surface-2 text-text-muted border-border'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">Fiş No</label>
                <input type="text" value={form.fisNo} onChange={(e) => setF('fisNo', e.target.value)} placeholder="Opsiyonel" className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">Açıklama</label>
                <input type="text" value={form.aciklama} onChange={(e) => setF('aciklama', e.target.value)} placeholder="Ör: Müşteri adı, istasyon…" className={inputCls} />
              </div>
            </div>

            {formHata && (
              <p role="alert" className="flex items-center gap-2 text-xs font-semibold text-danger-text">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formHata}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setModalAcik(false)}
                disabled={kaydediliyor}
                className="min-h-[44px] px-4 rounded-xl bg-base-surface-2 border border-border text-xs font-semibold text-text-primary cursor-pointer disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={kaydet}
                disabled={kaydediliyor}
                className="min-h-[44px] px-5 rounded-xl bg-success-fill hover:opacity-90 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-xs active:scale-[0.98]"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
