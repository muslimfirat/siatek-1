import { UserRole } from '../types';
import { Home, ShoppingBag, CreditCard, Package, Grid, FileText, Users, BarChart3, Truck, Activity, Bug, Sliders, ShoppingCart, User, Palette, Wallet, Banknote, Receipt, TrendingUp, Percent, Building2, Plus } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: any;
  adminOnly?: boolean;
}

export const FEATURE_POS_ENABLED = false;

export function getNavigationForRole(role: UserRole): NavItem[] {
  if (role === 'admin') {
    return [
      { id: 'home', label: 'Ana Sayfa', icon: Home },
      { id: 'cariler', label: 'Cariler', icon: Users },
      { id: 'pos', label: 'İşlem', icon: Plus },
      { id: 'products', label: 'Stok', icon: Package },
      { id: 'more', label: 'Daha Fazla', icon: Grid },
    ];
  } else {
    return [
      { id: 'home', label: 'Ana Sayfa', icon: Home },
      { id: 'catalog', label: 'Katalog', icon: Package },
      { id: 'cart', label: 'Sepet', icon: ShoppingCart },
      { id: 'orders', label: 'Siparişlerim', icon: ShoppingBag },
      { id: 'more', label: 'Hesabım', icon: User },
    ];
  }
}

export function getMoreModulesForRole(role: UserRole) {
  const isAdmin = role === 'admin';

  if (isAdmin) {
    return {
      sales: [
        { id: 'orders', title: 'Siparişler', description: 'Satış siparişlerini yönetin', icon: ShoppingBag, color: 'text-info-text bg-info-fill/15' },
        { id: 'quotes', title: 'Teklifler', description: 'Teklif taleplerini hazırlayın', icon: FileText, color: 'text-warning-text bg-warning-fill/15' },
        { id: 'cariler', title: 'Cari Hesaplar', description: 'Müşteri ve tedarikçi bakiyeleri', icon: Users, color: 'text-success-text bg-success-fill/15' },
      ],
      finance: [
        { id: 'kasa', title: 'Kasa / Banka', description: 'Tahsilat ve ödeme hareketleri', icon: Wallet, color: 'text-success-text bg-success-fill/15' },
        { id: 'invoices', title: 'Faturalama', description: 'E-Fatura ve E-Arşiv işlemleri', icon: Receipt, color: 'text-info-text bg-info-fill/15' },
        { id: 'gider', title: 'Giderler', description: 'İşletme giderlerini takip edin', icon: Banknote, color: 'text-warning-text bg-warning-fill/15' },
        { id: 'cek-senet', title: 'Çek / Senet', description: 'Vadeli ödeme araçları', icon: CreditCard, color: 'text-text-secondary bg-base-surface-2' },
      ],
      partner: [
        { id: 'ortak-arac', title: 'Ortak Araç Hesabı', description: '11 ACH 644 kâr/zarar ortaklığı', icon: Truck, color: 'text-success-text bg-success-fill/15' },
      ],
      reports: [
        { id: 'analytics', title: 'Satış Analizi', description: 'Satış trendleri ve performans', icon: BarChart3, color: 'text-info-text bg-info-fill/15' },
        { id: 'kar-zarar', title: 'Kâr / Zarar', description: 'Dönemsel finansal sonuçlar', icon: TrendingUp, color: 'text-success-text bg-success-fill/15' },
        { id: 'kdv-ozet', title: 'KDV Özeti', description: 'Hesaplanan ve indirilecek KDV', icon: Percent, color: 'text-warning-text bg-warning-fill/15' },
      ],
      purchasing: [
        { id: 'alis-faturalari', title: 'Alış Faturaları', description: 'Tedarikçi faturalarını yönetin', icon: ShoppingCart, color: 'text-warning-text bg-warning-fill/15' },
        { id: 'tedarikci-ekstresi', title: 'Tedarikçi Ekstreleri', description: 'Borç ve ödeme hareketleri', icon: Building2, color: 'text-text-secondary bg-base-surface-2' },
      ],
      operations: [
        { id: 'products', title: 'Stok Yönetimi', description: 'Ürün ve stok seviyeleri', icon: Package, color: 'text-success-text bg-success-fill/15' },
      ],
      system: [
        { id: 'settings', title: 'Ayarlar', description: 'Hesap ve güvenlik tercihleri', icon: Sliders, color: 'text-text-secondary bg-base-surface-2' },
      ]
    };
  } else {
    return {
      customer: [
        { id: 'quotes', title: 'Tekliflerim', description: 'İletmiş olduğunuz özel teklif talepleri', icon: FileText, color: 'text-info-text bg-info-fill' },
        { id: 'dispatch', title: 'Teslimat Takibi', description: 'Aktif siparişlerinizin teslimat durumları', icon: Truck, color: 'text-warning-text bg-warning-fill' },
        { id: 'customization', title: 'Görünüm & Tema Modu', description: 'Gündüz / Gece teması ve arayüz kişiselleştirme', icon: Palette, color: 'text-brand-600 bg-brand-500/15' },
        { id: 'settings', title: 'Hesap Ayarları', description: 'Şifre değiştirme ve iletişim tercihleri', icon: Sliders, color: 'text-text-primary bg-base-surface-2' },
      ]
    };
  }
}
