import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  BarChart3, Box, FileText, Home,
  Settings, ShoppingCart, Truck, Users, Wallet, Bell, Search, Plus, Sun,
  UserRound, LogOut, Handshake,
} from 'lucide-react';
import type { AdminTab, User } from '../../types';

interface Props {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onOpenAI: () => void;
  onOpenNotifications: () => void;
  onToggleTheme?: () => void;
  unreadCount?: number;
  pendingSalesCount?: number;
  criticalStockCount?: number;
  currentUser: User;
  onLogout: () => void;
  children: ReactNode;
}

const items: Array<{ id: AdminTab; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'Genel Bakış', icon: Home },
  { id: 'orders', label: 'Satış', icon: FileText },
  { id: 'cariler', label: 'Cari Hesaplar', icon: Users },
  { id: 'kasa', label: 'Finans', icon: Wallet },
  { id: 'products', label: 'Stok Yönetimi', icon: Box },
  { id: 'alis-faturalari', label: 'Satın Alma', icon: ShoppingCart },
  { id: 'analytics', label: 'Raporlar', icon: BarChart3 },
  { id: 'ortak-arac', label: 'Ortak Araç', icon: Handshake },
  { id: 'ops-dispatch', label: 'Operasyon', icon: Truck },
];

const contextualTabs: Array<{ title: string; ids: AdminTab[]; tabs: Array<{ id: AdminTab; label: string }> }> = [
  { title: 'Satış Yönetimi', ids: ['pos', 'orders', 'quotes', 'cariler'], tabs: [
    { id: 'pos', label: 'POS' }, { id: 'orders', label: 'Siparişler' }, { id: 'quotes', label: 'Teklifler' }, { id: 'cariler', label: 'Cariler' },
  ] },
  { title: 'Finans Yönetimi', ids: ['kasa', 'invoices', 'gider', 'cek-senet'], tabs: [
    { id: 'kasa', label: 'Kasa / Banka' }, { id: 'invoices', label: 'Faturalama' }, { id: 'gider', label: 'Giderler' }, { id: 'cek-senet', label: 'Çek / Senet' }
  ] },
  { title: 'Stok Yönetimi', ids: ['products', 'barcodes'], tabs: [
    { id: 'products', label: 'Ürün & Stok Masası' },
    { id: 'barcodes', label: 'Barkod' },
  ] },
  { title: 'Satın Alma', ids: ['alis-faturalari', 'tedarikci-ekstresi'], tabs: [
    { id: 'alis-faturalari', label: 'Alış Faturaları' }, { id: 'tedarikci-ekstresi', label: 'Tedarikçi Ekstreleri' },
  ] },
  { title: 'Raporlama', ids: ['analytics', 'kar-zarar', 'kdv-ozet', 'urun-kar'], tabs: [
    { id: 'analytics', label: 'Satış Trendi' }, { id: 'kar-zarar', label: 'Kâr / Zarar' }, { id: 'kdv-ozet', label: 'KDV Özeti' }, { id: 'urun-kar', label: 'Ürün Kârı' },
  ] },
  { title: 'Saha Operasyonları', ids: ['ops-dispatch', 'ops-drivers', 'ops-sales', 'ops-wms', 'ops-delivery'], tabs: [
    { id: 'ops-dispatch', label: 'Operasyon Merkezi' },
  ] },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || 'Y') + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
}

export default function AdminWorkspaceShell({ activeTab, onTabChange, onOpenNotifications, onToggleTheme, unreadCount = 0, pendingSalesCount = 0, criticalStockCount = 0, currentUser, onLogout, children }: Props) {
  const activeContext = contextualTabs.find(group => group.ids.includes(activeTab));
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickActionsPending, setQuickActionsPending] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const mobileProfileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!quickActionsPending || activeTab !== 'home') return;
    const timer = window.setTimeout(() => {
      document.dispatchEvent(new CustomEvent('siatek:open-quick-actions'));
      setQuickActionsPending(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, quickActionsPending]);

  useEffect(() => {
    if (!profileOpen) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!profileRef.current?.contains(target) && !mobileProfileRef.current?.contains(target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [profileOpen]);

  const run = (action: () => void) => {
    setProfileOpen(false);
    action();
  };

  const handleNavigation = (id: AdminTab) => {
    onTabChange(id);
    if (id === 'orders') {
      document.dispatchEvent(new CustomEvent('siatek:sidebar-alert', { detail: { tab: id } }));
    }
  };

  const openQuickActions = () => {
    setQuickActionsPending(true);
    if (activeTab !== 'home') onTabChange('home');
  };

  const profileMenu = (mobile = false) => (
    <div className={`admin-profile-popover${mobile ? ' is-mobile' : ''}`} role="menu" aria-label="Yönetici profili">
      <div className="admin-profile-popover-head"><span>{initials(currentUser.name)}</span><div><b>{currentUser.name}</b><small>{currentUser.email}</small></div></div>
      <button type="button" role="menuitem" onClick={() => run(() => onTabChange('settings'))}><UserRound size={18} /><span><b>Profilim</b><small>Yönetici bilgileri</small></span></button>
      <button type="button" role="menuitem" onClick={() => run(() => onTabChange('settings'))}><Settings size={18} /><span><b>Hesap ayarları</b><small>Güvenlik ve tercihler</small></span></button>
      <button type="button" role="menuitem" onClick={() => run(onOpenNotifications)}><Bell size={18} /><span><b>Bildirimler</b><small>{unreadCount ? `${unreadCount} okunmamış` : 'Yeni bildirim yok'}</small></span></button>
      {onToggleTheme && <button type="button" role="menuitem" onClick={() => run(onToggleTheme)}><Sun size={18} /><span><b>Tema</b><small>Görünümü değiştir</small></span></button>}
      <button type="button" role="menuitem" className="is-danger" onClick={() => run(onLogout)}><LogOut size={18} /><span><b>Oturumu kapat</b><small>Güvenli çıkış</small></span></button>
    </div>
  );

  return <div className="admin-workspace-shell" data-active-tab={activeTab}>
    <aside className="admin-workspace-sidebar" aria-label="Yönetim navigasyonu">
      <div className="admin-workspace-brand"><img className="admin-collapsed-logo-image" src="/branding/siatek-icon.png" alt="Siatek" /><div><strong>ALPHA TEKNİK</strong><span>İş Yönetim Platformu</span></div></div>
      <div className="admin-workspace-sidebar-body">
        <p className="admin-workspace-label">YÖNETİM</p>
        <nav className="admin-workspace-nav">
          {items.map(({ id, label, icon: Icon }) => {
            const isTabActive = activeTab === id || (id === 'products' && activeTab === 'barcodes');
            const badge = id === 'orders' ? pendingSalesCount : id === 'products' ? criticalStockCount : 0;
            const badgeLabel = id === 'orders' ? `${badge} işlem bekleyen sipariş` : `${badge} kritik stok bildirimi`;
            return <button key={id} type="button" title={badge > 0 ? `${label}: ${badgeLabel}` : label} aria-current={isTabActive ? 'page' : undefined} onClick={() => handleNavigation(id)} className={isTabActive ? 'is-active' : ''}><Icon size={22} strokeWidth={1.8} /><span>{label}</span>{badge > 0 && <em aria-label={badgeLabel}>{badge > 99 ? '99+' : badge}</em>}</button>;
          })}
        </nav>
        <button type="button" title="Ayarlar" onClick={() => onTabChange('settings')} className={`admin-workspace-settings ${activeTab === 'settings' ? 'is-open' : ''}`}>
          <Settings size={22} strokeWidth={1.8} />
          <span>Ayarlar</span>
        </button>
      </div>
      <div className="admin-workspace-sidebar-footer">
        <div className="admin-profile-menu" ref={profileRef}>
          {profileOpen && profileMenu()}
          <button type="button" className="admin-workspace-user" aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(open => !open)}>
            <span>{initials(currentUser.name)}</span><div><b>{currentUser.name}</b><small>Yönetici</small></div><strong aria-hidden="true">•••</strong>
          </button>
        </div>
      </div>
    </aside>
    <div className="admin-workspace-content">
      <header className="admin-workspace-header"><button type="button" className="admin-workspace-search" onClick={() => document.dispatchEvent(new CustomEvent('siatek:open-command-palette'))}><Search size={22} /><span>Sipariş, müşteri veya ürün ara...</span><kbd>⌘ K</kbd></button><div className="admin-workspace-actions"><button type="button" aria-label="Tema değiştir" onClick={onToggleTheme}><Sun size={22} strokeWidth={1.8} /></button><button type="button" aria-label={unreadCount ? `Bildirimler, ${unreadCount} okunmamış` : 'Bildirimler'} onClick={onOpenNotifications}><Bell size={22} strokeWidth={1.8} />{unreadCount > 0 && <i aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</i>}</button><button type="button" className="admin-workspace-quick" onClick={openQuickActions}><Plus size={22} /> Hızlı işlem</button><div className="admin-mobile-profile" ref={mobileProfileRef}><button type="button" aria-label="Yönetici profil menüsü" aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(open => !open)}>{initials(currentUser.name)}</button>{profileOpen && profileMenu(true)}</div></div></header>
      <main className="admin-workspace-main">
        {activeContext && activeContext.tabs.length > 1 && activeTab !== 'ops-dispatch' && (
          <section className="admin-context-tabs" aria-label={`${activeContext.title} modülleri`}>
            <div className="admin-context-title-group">
              <h1 className="admin-context-title">{activeContext.title}</h1>
            </div>
            <div className="admin-context-right-group">
              <nav aria-label={`${activeContext.title} sekmeleri`}>
                {activeContext.tabs.map(tab => (
                  <button key={tab.id} type="button" aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => onTabChange(tab.id)}>
                    {tab.label}
                  </button>
                ))}
              </nav>
              <div id="admin-context-actions-portal" className="admin-context-actions" />
            </div>
          </section>
        )}
        {children}
      </main>
    </div>
  </div>;
}
