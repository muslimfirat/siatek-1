import './lib/authenticatedFetch';
import PremiumSplashScreen from './components/common/PremiumSplashScreen';
import CustomerAccount from './components/customer/CustomerAccount';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRealtimeData } from './hooks/useRealtimeData';
import Header from './components/Header';
import CustomerPortal from './components/customer/CustomerPortal';
import AdminPortal from './components/admin/AdminPortal';
import AdminWorkspaceShell from './components/admin/AdminWorkspaceShell';
import OperasyonPortal from './components/operasyon/OperasyonPortal';
import NotificationCenter from './components/NotificationCenter';
import E2EESecurityModal from './components/E2EESecurityModal';
import AuthModal from './components/AuthModal';
import CommandPaletteModal from './components/CommandPaletteModal';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import ShortcutToast from './components/ShortcutToast';
import QuickQuoteModal from './components/customer/QuickQuoteModal';
import CameraBarcodeScannerModal from './components/admin/CameraBarcodeScannerModal';
import FloatingScannerButton from './components/common/FloatingScannerButton';
import MobileBottomNav from './components/common/MobileBottomNav';
import { MobileQuickActionSheet } from './components/mobile/MobileERP';
import MoreModulesView from './components/common/MoreModulesView';
import { isAdminTab, User, UserRole } from './types';
import type { AdminSystemTool, AdminTab } from './types';
import { getStoredUser, clearStoredSession, logoutUser, syncFirebaseUserToFirestore, handleGoogleRedirectResult } from './lib/auth';
import { auth, onAuthStateChanged } from './lib/firebase';
import { initGlobalErrorTracking } from './lib/errorTracker';
import confetti from 'canvas-confetti';
import { playNotificationSound } from './lib/audio';
import { shoppingService } from './lib/shoppingService';
import AnnouncementBanner from './components/common/AnnouncementBanner';
import { OfflineBanner } from './components/common/OfflineBanner';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';
import { useAndroidBackHandler } from './hooks/useAndroidBackHandler';
import { Haptics } from './utils/haptics';
import FloatingWhatsAppButton from './components/common/FloatingWhatsAppButton';
import AlphaEnterpriseSuiteModal from './components/admin/AlphaEnterpriseSuiteModal';
import DealerProfile from './components/customer/DealerProfile';
import { useCompanySettings } from './lib/companySettings';

export default function App() {
  // localStorage yalnizca ILK KARE icin gorsel ipucudur (isim/avatar yanip
  // sonmesin diye). Veri sorgulari icin ASLA kullanilmaz; onlarin kapisi
  // authReady'dir. Bu ayrim olmadan, ayni tarayicida hesap degistirildiginde
  // uygulama bir onceki kullanicinin kimligiyle sorgu acabiliyordu.
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredUser());
  const [authReady, setAuthReady] = useState(false);
  const [hesapDegistiUyarisi, setHesapDegistiUyarisi] = useState<string | null>(null);
  const oncekiUidRef = useRef<string | null>(getStoredUser()?.id || null);

  // Initialize automatic global runtime and network error listener
  useEffect(() => {
    initGlobalErrorTracking();
    // Yonlendirmeli Google girisinden donusu karsila (popup engellenmisse
    // bu yola dusuluyor). Donus sonucu varsa kullanici oturumunu derhal bagla.
    handleGoogleRedirectResult().then(user => {
      if (user) {
        setCurrentUser(user);
        setCurrentRole(user.role === 'admin' ? 'admin' : user.role === 'operasyon' ? 'operasyon' : 'customer');
        setAuthReady(true);
      }
    }).catch(err => {
      console.warn('Google redirect sonucu islenirken hata:', err);
    });
  }, []);

  // Firebase Auth durumu - kimligin TEK kaynagi.
  // Firebase oturumu tarayici genelinde (tum sekmelerde) tektir; baska bir
  // sekmede baska hesapla giris yapilirsa bu dinleyici burada da tetiklenir.
  useEffect(() => {
    let generation = 0;
    let disposed = false;
    const initialAuthTimeout = window.setTimeout(() => {
      // Firebase bazen ağ/IndexedDB problemi nedeniyle ilk auth olayını hiç
      // göndermiyor. Uygulamayı sonsuz yüklemede bırakmak yerine güvenli biçimde
      // oturumsuz aç: localStorage kullanıcısı doğrulanmış kimlik sayılmaz.
      if (generation !== 0 || disposed) return;
      setCurrentUser(null);
      setCurrentRole('customer');
      clearStoredSession();
      setAuthReady(true);
      console.warn('Firebase oturum doğrulaması zaman aşımına uğradı; oturumsuz devam ediliyor.');
    }, 5000);
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      const request = ++generation;
      window.clearTimeout(initialAuthTimeout);
      setAuthReady(false);
      if (fbUser) {
        try {
          const user = await Promise.race([
            syncFirebaseUserToFirestore(fbUser),
            new Promise<never>((_, reject) => window.setTimeout(
              () => reject(new Error('Firebase kullanıcı senkronizasyonu zaman aşımına uğradı.')),
              10000,
            )),
          ]);
          if (request !== generation) return;

          // Ayni tarayicida hesap degistiyse yerel izleri temizle ve kullaniciyi uyar.
          if (oncekiUidRef.current && oncekiUidRef.current !== fbUser.uid) {
            try {
              localStorage.removeItem('alpha_cached_orders');
              localStorage.removeItem('alpha_cached_quotes');
            } catch {}
            setHesapDegistiUyarisi(
              `Oturum ${user.email} hesabına geçti. Aynı tarayıcıda aynı anda tek hesap açık olabilir.`
            );
          }
          oncekiUidRef.current = fbUser.uid;

          setCurrentUser(user);
          setCurrentRole(user.role === 'admin' ? 'admin' : user.role === 'operasyon' ? 'operasyon' : 'customer');
        } catch (err) {
          if (request !== generation) return;
          console.warn('Firebase auth state sync error:', err);
          // Senkronizasyon basarisizsa kimligi DOGRULANMIS sayma.
          setCurrentUser(null);
          setCurrentRole('customer');
          clearStoredSession();
        } finally {
          if (request === generation) setAuthReady(true);
        }
      } else {
        // GUVENLIK: cikis yapildiginda (veya oturum duserse) her sey temizlenir.
        // Eski surumde bu dal hic yoktu; kullanici localStorage'dan "girisli"
        // gorunmeye devam ediyordu.
        oncekiUidRef.current = null;
        setCurrentUser(null);
        setCurrentRole('customer');
        clearStoredSession();
        try {
          localStorage.removeItem('alpha_cached_orders');
          localStorage.removeItem('alpha_cached_quotes');
        } catch {}
        setAuthReady(true);
      }
    });
    return () => {
      disposed = true;
      generation++;
      window.clearTimeout(initialAuthTimeout);
      unsubscribe();
    };
  }, []);

  const {
    currentRole,
    setCurrentRole,
    products,
    orders,
    ordersLoading,
    ordersError,
    productsLoading,
    productsError,
    quotesLoading,
    quotesError,
    quotes,
    notifications,
    connected,
    audioEnabled,
    setAudioEnabled,
    markNotificationRead,
    markAllNotificationsRead,
    fetchData,
  } = useRealtimeData(
    'customer',
    currentUser?.id || null,
    currentUser?.id || null,        // Firebase UID = User.id
    currentUser?.role === 'admin' || currentUser?.role === 'operasyon',
    authReady
  );
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [authTargetRole, setAuthTargetRole] = useState<'customer' | 'admin' | undefined>(undefined);

  const companySettings = useCompanySettings();
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(() => {
    const saved = localStorage.getItem('app_theme');
    // Kayıt yoksa HTML pre-mount script ile aynı mantık: OS tercihini oku.
    return (saved === 'light' || saved === 'dark' || saved === 'system') ? saved : 'system';
  });

  // resolvedTheme: 'system' belirsizliğini çözerek her zaman gerçek aktif
  // temayı ('dark' | 'light') tutar. Header tema butonu bu değere göre
  // çalışır; aksi hâlde 'system' + gündüz OS = toggle çalışmıyor bug'ı oluşur.
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('app_theme');
    if (saved === 'dark') return 'dark';
    if (saved === 'light') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [customerTab, setCustomerTab] = useState<'home' | 'catalog' | 'orders' | 'quotes'>('home');
  const [adminTab, setAdminTab] = useState<AdminTab>('home');
  const openAdminSystemTool = (tool: AdminSystemTool) => {
    setAdminTab('settings');
    document.dispatchEvent(new CustomEvent('siatek:open-system-settings', { detail: { tool } }));
  };
  const [mobileNav, setMobileNav] = useState<string>('home');
  const [cartRequested, setCartRequested] = useState(false);
  const [posRequested, setPosRequested] = useState(false);
  const [mobileQuickOpen, setMobileQuickOpen] = useState(false);

  useEffect(() => { const open = () => setMobileQuickOpen(true); document.addEventListener('siatek:open-mobile-quick-actions', open); return () => document.removeEventListener('siatek:open-mobile-quick-actions', open); }, []);
  const [cartCount, setCartCount] = useState(0);
  useEffect(() => { setMobileNav('home'); setCartRequested(false); setPosRequested(false); setCartCount(0); }, [currentRole, currentUser?.id]);

  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);

  // Arayuz durumu hicbir zaman kimlik rolunun ustune cikamaz. Bu kontrol,
  // yanlis bir bildirim/klavye olayi admin gorunumunu istese bile ilk renderi de kapatir.
  const adminAccessAllowed = authReady && currentUser?.role === 'admin';
  useEffect(() => {
    if (!authReady) return;
    if (currentRole === 'admin' && currentUser?.role !== 'admin') {
      setCurrentRole(currentUser?.role === 'operasyon' ? 'operasyon' : 'customer');
    } else if (currentRole === 'operasyon' && currentUser?.role !== 'operasyon') {
      setCurrentRole(currentUser?.role === 'admin' ? 'admin' : 'customer');
    }
  }, [authReady, currentRole, currentUser?.role, setCurrentRole]);

  // Keyboard Shortcuts & Command Palette Modals
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showQuickQuoteModal, setShowQuickQuoteModal] = useState(false);
  const [showGlobalScannerModal, setShowGlobalScannerModal] = useState(false);
  const [globalScannerOrigin, setGlobalScannerOrigin] = useState<DOMRect | null>(null);

  // HUD Toast feedback for executed shortcuts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastKeys, setToastKeys] = useState<string[]>([]);

  const triggerToast = useCallback((msg: string, keys: string[]) => {
    setToastMessage(msg);
    setToastKeys(keys);
  }, []);

  // Android Donanım Geri Tuşu Yönetimi (Hardware Back Button Handler)
  const isAnyModalOpen = showAuthModal || showSecurityModal || showAIModal || showCommandPalette || 
    showShortcutsModal || showQuickQuoteModal || showGlobalScannerModal || showCustomizationModal || 
    showNotificationDrawer || cartRequested || posRequested;

  useAndroidBackHandler({
    activeModalCount: isAnyModalOpen ? 1 : 0,
    closeActiveModal: () => {
      Haptics.tap();
      if (showAuthModal) { setShowAuthModal(false); return true; }
      if (showSecurityModal) { setShowSecurityModal(false); return true; }
      if (showAIModal) { setShowAIModal(false); return true; }
      if (showCommandPalette) { setShowCommandPalette(false); return true; }
      if (showShortcutsModal) { setShowShortcutsModal(false); return true; }
      if (showQuickQuoteModal) { setShowQuickQuoteModal(false); return true; }
      if (showGlobalScannerModal) { setShowGlobalScannerModal(false); return true; }
      if (showCustomizationModal) { setShowCustomizationModal(false); return true; }
      if (showNotificationDrawer) { setShowNotificationDrawer(false); return true; }
      if (cartRequested) { setCartRequested(false); return true; }
      if (posRequested) { setPosRequested(false); return true; }
      return false;
    },
    canGoBack: currentRole === 'customer' ? customerTab !== 'home' : adminTab !== 'home',
    onGoBack: () => {
      Haptics.tap();
      if (currentRole === 'customer') {
        setCustomerTab('home');
      } else {
        setAdminTab('home');
      }
    }
  });

  // Sync theme with HTML document element, colorScheme, and mobile browser address bar
  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    const root = document.documentElement;

    const applyResolvedTheme = (resolved: 'dark' | 'light') => {
      // React state'i güncelle — Header tema butonu bunu kullanır
      setResolvedTheme(resolved);
      const body = document.body;
      if (resolved === 'light') {
        root.classList.add('light');
        root.classList.remove('dark');
        if (body) {
          body.classList.add('light');
          body.classList.remove('dark');
          body.setAttribute('data-theme', 'light');
        }
        root.setAttribute('data-theme', 'light');
        root.style.colorScheme = 'light';
        const metaThemeColor = document.querySelector('meta[name="theme-color"]:not([media])');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#F8FAFC');
      } else {
        root.classList.add('dark');
        root.classList.remove('light');
        if (body) {
          body.classList.add('dark');
          body.classList.remove('light');
          body.removeAttribute('data-theme');
        }
        root.removeAttribute('data-theme');
        root.style.colorScheme = 'dark';
        const metaThemeColor = document.querySelector('meta[name="theme-color"]:not([media])');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#0B0F19');
      }
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyResolvedTheme(mediaQuery.matches ? 'dark' : 'light');

      const listener = (e: MediaQueryListEvent) => {
        applyResolvedTheme(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      applyResolvedTheme(theme);
    }
  }, [theme]);

  const toggleTheme = useCallback((targetTheme?: 'dark' | 'light' | 'system') => {
    if (targetTheme) {
      setTheme(targetTheme);
    } else {
      // resolvedTheme her zaman gerçek aktif temayı tutar;
      // 'system' modunda bile doğru toggle yapar
      setTheme(prev => {
        const current = prev === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : prev;
        return current === 'dark' ? 'light' : 'dark';
      });
    }
  }, []);

  // Handle Global Keyboard Shortcuts — YALNIZCA admin rolünde aktif.
  // Müşteri ve operasyon rollerinde tüm kısayollar devre dışıdır;
  // aksi hâlde Ctrl+P → admin girişi, Ctrl+K → admin navigasyonu gibi
  // güvenlik açıkları oluşur.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // GÜVENLİK: admin olmayan rollerde tüm kısayolları engelle
      if (currentRole !== 'admin') return;

      const isInput = 
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement)?.isContentEditable;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // 1. ESC: Close active overlays/modals
      if (e.key === 'Escape') {
        if (showCommandPalette) {
          setShowCommandPalette(false);
          e.preventDefault();
        } else if (showShortcutsModal) {
          setShowShortcutsModal(false);
          e.preventDefault();
        } else if (showQuickQuoteModal) {
          setShowQuickQuoteModal(false);
          e.preventDefault();
        } else if (showGlobalScannerModal) {
          setShowGlobalScannerModal(false);
          e.preventDefault();
        } else if (showNotificationDrawer) {
          setShowNotificationDrawer(false);
          e.preventDefault();
        } else if (showSecurityModal) {
          setShowSecurityModal(false);
          e.preventDefault();
        } else if (showAIModal) {
          setShowAIModal(false);
          e.preventDefault();
        } else if (showAuthModal) {
          setShowAuthModal(false);
          e.preventDefault();
        }
        return;
      }

      // 2. Help Shortcut: '?' or 'Shift+?' or 'Ctrl+/' (when not typing inside an input)
      if ((e.key === '?' || (e.shiftKey && e.key === '?') || (modKey && e.key === '/')) && !isInput) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
        triggerToast('Klavye Kısayolları Kılavuzu', ['?']);
        return;
      }

      // 3. Modifier-based shortcuts (Ctrl + Key or Cmd + Key)
      if (modKey) {
        const key = e.key.toLowerCase();

        // Ctrl + P : Switch Role / Panel Mode (Customer ⟷ Admin)
        if (key === 'p') {
          e.preventDefault();
          setCurrentRole('customer');
          triggerToast('Müşteri Portalına Geçildi', ['Ctrl', 'P']);
          return;
        }

        // Ctrl + N : New Quote / Quote Desk
        if (key === 'n') {
          e.preventDefault();
          if (currentRole === 'admin') {
            setAdminTab('quotes');
            triggerToast('Teklifler Masası Açıldı', ['Ctrl', 'N']);
          } else {
            setShowQuickQuoteModal(true);
            triggerToast('Yeni Teklif Talebi Masası Açıldı', ['Ctrl', 'N']);
          }
          return;
        }

        // Ctrl + S : Stock & Product Quick Search
        if (key === 's') {
          e.preventDefault();
          if (currentRole === 'admin') {
            setAdminTab('products');
            triggerToast('Stok & Fiyat Masasına Geçildi', ['Ctrl', 'S']);
          } else {
            setCustomerTab('catalog');
            setShowCommandPalette(true);
            triggerToast('Hızlı Ürün & Stok Arama', ['Ctrl', 'S']);
          }
          return;
        }

        // Ctrl + K : Command Palette & Universal Spotlight
        if (key === 'k') {
          e.preventDefault();
          setShowCommandPalette(prev => !prev);
          triggerToast('Hızlı Komut & Arama Paleti', ['Ctrl', 'K']);
          return;
        }

        // Ctrl + B : Camera Barcode Scanner
        if (key === 'b') {
          e.preventDefault();
          setShowGlobalScannerModal(prev => !prev);
          triggerToast('Kamera ile Barkod Okuyucu', ['Ctrl', 'B']);
          return;
        }

        // Ctrl + I : Push Notifications Drawer
        if (key === 'i') {
          e.preventDefault();
          setShowNotificationDrawer(prev => !prev);
          triggerToast('Canlı Bildirimler Paneli', ['Ctrl', 'I']);
          return;
        }

        // Ctrl + D : Toggle Theme
        if (key === 'd') {
          e.preventDefault();
          toggleTheme();
          return;
        }

        // Ctrl + 1..7 : Quick Tab Jump
        if (e.key >= '1' && e.key <= '7') {
          e.preventDefault();
          const tabNum = e.key;
          if (currentRole === 'admin') {
            const adminTabs: Array<'orders' | 'quotes' | 'products' | 'cariler' | 'invoices' | 'analytics' | 'settings'> = [
              'orders', 'quotes', 'products', 'cariler', 'invoices', 'analytics', 'settings'
            ];
            const tabName = adminTabs[parseInt(tabNum) - 1];
            if (tabName) {
              setAdminTab(tabName);
              const titles = {
                orders: 'Siparişler Masası',
                quotes: 'Teklifler Masası',
                products: 'Stok & Fiyat Masası',
                cariler: 'Cari Hesaplar Masası',
                invoices: 'E-Fatura & Maliye',
                analytics: 'Satış Analitiği',
                settings: 'Sistem Ayarları'
              };
              triggerToast(titles[tabName], ['Ctrl', tabNum]);
            }
          } else {
            if (tabNum === '1') {
              setCustomerTab('orders');
              triggerToast('Siparişlerim Sekmesi', ['Ctrl', '1']);
            } else if (tabNum === '2') {
              setCustomerTab('quotes');
              triggerToast('Teklif Taleplerim Sekmesi', ['Ctrl', '2']);
            } else if (tabNum === '3') {
              setCustomerTab('catalog');
              triggerToast('Ürün Kataloğu & Stoklar', ['Ctrl', '3']);
            }
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Custom event listener for buttons that trigger command palette
    const handleCustomOpenPalette = () => setShowCommandPalette(true);
    document.addEventListener('siatek:open-command-palette', handleCustomOpenPalette);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('siatek:open-command-palette', handleCustomOpenPalette);
    };
  }, [
    currentRole, 
    currentUser, 
    showCommandPalette, 
    showShortcutsModal, 
    showQuickQuoteModal, 
    showGlobalScannerModal, 
    showNotificationDrawer, 
    showSecurityModal, 
    showAIModal, 
    showAuthModal,
    setCurrentRole,
    toggleTheme,
    triggerToast
  ]);

  // Handle native Web Notification clicks from window event
  useEffect(() => {
    const handleNotificationClickEvent = (e: any) => {
      const data = e.detail;
      if (!data) return;
      handleNotificationNavigate({
        type: data.type,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
        targetRole: 'all',
      } as any);
    };

    window.addEventListener('app_notification_click', handleNotificationClickEvent);
    return () => window.removeEventListener('app_notification_click', handleNotificationClickEvent);
  }, [currentRole]);

  const handleNotificationNavigate = (notif: { type?: string; referenceType?: string; targetRole?: string }) => {
    setShowNotificationDrawer(false);

    const isQuote = notif.referenceType === 'quote' || (notif.type && notif.type.startsWith('quote_'));
    const isOrder = notif.referenceType === 'order' || (notif.type && notif.type.startsWith('order_'));
    const isProduct = notif.referenceType === 'product' || notif.type === 'low_stock';

    if (isQuote) {
      if (currentRole === 'admin' || notif.targetRole === 'admin') {
        setCurrentRole('admin');
        setAdminTab('quotes');
      } else {
        setCurrentRole('customer');
        setCustomerTab('quotes');
      }
    } else if (isOrder) {
      if (currentRole === 'admin' || notif.targetRole === 'admin') {
        setCurrentRole('admin');
        setAdminTab('orders');
      } else {
        setCurrentRole('customer');
        setCustomerTab('orders');
      }
    } else if (isProduct) {
      if (currentRole !== 'admin') {
        setCurrentRole('admin');
      }
      setAdminTab('products');
    }
  };

  const handleOpenAuth = (tab: 'login' | 'register' = 'login', targetRole?: 'customer' | 'admin') => {
    setAuthModalTab(tab);
    setAuthTargetRole(targetRole);
    setShowAuthModal(true);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setShowAuthModal(false);
    if (user.role === 'admin') {
      setCurrentRole('admin');
      triggerToast('Yönetici olarak giriş yapıldı', ['Giriş']);
    } else {
      setCurrentRole('customer');
      triggerToast('Müşteri olarak giriş yapıldı', ['Giriş']);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setCurrentRole('customer');
    triggerToast('Oturum kapatıldı', ['Çıkış']);
  };

  const handleSendQuoteRequest = async (quoteData: any) => {
    try {
      await shoppingService.requestQuote(quoteData);
        setShowQuickQuoteModal(false);
        setCustomerTab('quotes');
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        playNotificationSound('quote');
        fetchData();
        triggerToast('Teklif talebiniz başarıyla iletildi!', ['Ctrl', 'N']);
    } catch (err: any) {
      alert('Teklif kaydı doğrulanamadı. Yeniden göndermeden önce Tekliflerim bölümünü kontrol edin. ' + err.message);
    }
  };

  const handleExecuteShortcutFromGuide = (actionKey: string) => {
    switch (actionKey) {
      case 'switch_role':
        if (currentRole === 'customer') {
          if (!currentUser || currentUser.role !== 'admin') {
            handleOpenAuth('login', 'admin');
          } else {
            setCurrentRole('admin');
          }
        } else {
          setCurrentRole('customer');
        }
        break;
      case 'open_command_palette':
        setShowCommandPalette(true);
        break;
      case 'open_search':
        if (currentRole === 'admin') {
          setAdminTab('products');
        } else {
          setCustomerTab('catalog');
          setShowCommandPalette(true);
        }
        break;
      case 'new_quote':
        if (currentRole === 'admin') {
          setAdminTab('quotes');
        } else {
          setShowQuickQuoteModal(true);
        }
        break;
      case 'open_scanner':
        setShowGlobalScannerModal(true);
        break;
      case 'open_ai':
        setShowAIModal(true);
        break;
      case 'open_notifications':
        setShowNotificationDrawer(true);
        break;
      case 'toggle_theme':
        toggleTheme();
        break;
      case 'tab_orders':
        if (currentRole === 'admin') setAdminTab('orders');
        else setCustomerTab('orders');
        break;
      case 'tab_quotes':
        if (currentRole === 'admin') setAdminTab('quotes');
        else setCustomerTab('quotes');
        break;
      case 'tab_products':
        if (currentRole === 'admin') setAdminTab('products');
        else setCustomerTab('catalog');
        break;
      case 'tab_cariler':
        setCurrentRole('admin');
        setAdminTab('cariler');
        break;
      case 'tab_invoices':
        setCurrentRole('admin');
        setAdminTab('invoices');
        break;
      case 'tab_analytics':
        setCurrentRole('admin');
        setAdminTab('analytics');
        break;
      case 'tab_diagnostics':
        setCurrentRole('admin');
        openAdminSystemTool('diagnostics');
        break;
      default:
        break;
    }
  };

  const unreadNotificationsCount = notifications.filter(
    n => !n.read && (n.targetRole === 'all' || n.targetRole === currentRole)
  ).length;

  if (!authReady) {
    return <PremiumSplashScreen />;
  }

  return (
    <div className="min-h-screen bg-base text-text-primary flex flex-col font-sans selection:bg-[#3C5468] selection:text-[#EDEBE8] overflow-x-hidden w-full max-w-full">
      
      {/* Offline Status Banner */}
      <OfflineBanner />

      {/* PWA & Mobile Web App Install Banner (Brave, Chrome, Safari, Android) */}
      <PwaInstallPrompt />

      {/* Top Announcement Banner */}
      {currentRole !== 'admin' && <AnnouncementBanner banner={companySettings.announcementBanner} />}

      {/* Top Main Navigation Header — operasyon rolünde kendi header'ı var */}
      {currentRole === 'customer' && <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        connected={connected}
        unreadCount={unreadNotificationsCount}
        audioEnabled={audioEnabled}
        onToggleAudio={() => setAudioEnabled(!audioEnabled)}
        onOpenNotifications={() => setShowNotificationDrawer(true)}
        onOpenSecurity={() => setShowSecurityModal(true)}
        onOpenAI={() => setShowAIModal(true)}
        theme={theme}
        resolvedTheme={resolvedTheme}
        onToggleTheme={toggleTheme}
      />}

      {/* Main Content Area */}
      <main data-has-cart={currentRole === 'customer' && cartCount > 0} className={`shell-main flex-1 overflow-x-hidden ${currentRole === 'admin' ? 'w-full' : currentRole !== 'operasyon' ? 'max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-28 sm:pt-8 sm:pb-32' : ''}`}>
        {mobileNav === 'more' && currentRole === 'customer' ? (
          // Bayi profil sayfasi. Eskiden buradaki CustomerAccount'un
          // "customization" secenegi AlphaEnterpriseSuiteModal'i (kurumsal
          // yonetim paneli) aciyordu; bayi tema ayari saniyor, tum Enterprise
          // ekranini goruyordu. (19.09.2026)
          <DealerProfile
            user={currentUser}
            orders={orders}
            quotes={quotes}
            theme={theme}
            onThemeChange={setTheme}
            onUserUpdated={(u) => setCurrentUser(u)}
            onLogin={() => handleOpenAuth('login', 'customer')}
            onLogout={handleLogout}
            onNavigate={(key) => {
              setMobileNav('home');
              setCustomerTab(key);
            }}
          />
        ) : mobileNav === 'more' ? (
          <MoreModulesView
            currentRole={currentRole}
            onSelectModule={(modKey) => {
              setMobileNav('home');
              if (modKey === 'quotes') {
                if (currentRole === 'admin') setAdminTab('quotes');
                else setCustomerTab('quotes');
              } else if (['cariler', 'invoices', 'analytics', 'diagnostics', 'errors', 'gider', 'cek-senet', 'kasa', 'alis-faturalari', 'tedarikci-ekstresi', 'kar-zarar', 'kdv-ozet', 'urun-kar', 'ortak-arac'].includes(modKey)) {
                // GUVENLIK: rol yalnizca GERCEKTEN admin olan hesapta degisir.
                // Eskiden burada kontrolsuz setCurrentRole('admin') vardi;
                // herhangi bir bayi bu menuden yonetici arayuzune geciyordu.
                if (currentUser?.role === 'admin') {
                  setCurrentRole('admin');
                  if (modKey === 'diagnostics' || modKey === 'errors') openAdminSystemTool(modKey);
                  else setAdminTab(modKey as AdminTab);
                } else {
                  handleOpenAuth('login', 'admin');
                }
              } else if (modKey === 'products') {
                if (currentUser?.role === 'admin') setAdminTab('products');
                else handleOpenAuth('login', 'admin');
              } else if (modKey === 'customization') {
                setShowCustomizationModal(true);
              } else if (modKey === 'settings') {
                setShowSecurityModal(true);
              }
            }}
            onOpenAuth={handleOpenAuth}
          />
        ) : null}
        <div className={currentRole === 'admin' ? 'admin-shell-host' : undefined} key={currentUser?.id || 'guest'} hidden={mobileNav === 'more'}>
        {currentRole === 'operasyon' ? (
          <OperasyonPortal
            orders={orders}
            products={products}
            currentUser={currentUser}
            ordersLoading={ordersLoading}
            onRefresh={fetchData}
            onToggleTheme={() => toggleTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          />
        ) : currentRole === 'customer' ? (
          <CustomerPortal
            productsLoading={productsLoading}
            productsError={productsError}
            ordersLoading={ordersLoading}
            ordersError={ordersError}
            quotesLoading={quotesLoading}
            quotesError={quotesError}
            cartRequested={cartRequested}
            onCartClose={() => setCartRequested(false)}
            onCartCountChange={setCartCount}
            products={products}
            orders={orders}
            quotes={quotes}
            currentUser={currentUser}
            activeTab={customerTab}
            onTabChange={setCustomerTab}
            onOpenAuth={handleOpenAuth}
            onOpenAI={() => setShowAIModal(true)}
            onRefresh={fetchData}
          />
        ) : adminAccessAllowed && currentUser ? (
          <AdminWorkspaceShell
            activeTab={adminTab}
            onTabChange={setAdminTab}
            onOpenAI={() => setShowAIModal(true)}
            onOpenNotifications={() => setShowNotificationDrawer(true)}
            onToggleTheme={() => toggleTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            unreadCount={unreadNotificationsCount}
            pendingSalesCount={orders.filter(order => order.status === 'pending').length}
            criticalStockCount={products.filter(product => product.stock <= 5).length}
            currentUser={currentUser}
            onLogout={handleLogout}
          >
          <AdminPortal
            currentUserName={currentUser.name}
            productsLoading={productsLoading}
            productsError={productsError}
            quotesLoading={quotesLoading}
            quotesError={quotesError}
            ordersLoading={ordersLoading}
            ordersError={ordersError}
            posRequested={posRequested}
            onPosClose={() => setPosRequested(false)}
            products={products}
            orders={orders}
            quotes={quotes}
            activeTab={adminTab}
            onTabChange={setAdminTab}
            onOpenAI={() => setShowAIModal(true)}
            onOpenNotifications={() => setShowNotificationDrawer(true)}
            onMobileToggleTheme={() => toggleTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            onRefresh={fetchData}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
          </AdminWorkspaceShell>
        ) : (
          <CustomerPortal
            productsLoading={productsLoading}
            productsError={productsError}
            ordersLoading={ordersLoading}
            ordersError={ordersError}
            quotesLoading={quotesLoading}
            quotesError={quotesError}
            cartRequested={cartRequested}
            onCartClose={() => setCartRequested(false)}
            onCartCountChange={setCartCount}
            products={products}
            orders={orders}
            quotes={quotes}
            currentUser={currentUser}
            activeTab={customerTab}
            onTabChange={setCustomerTab}
            onOpenAuth={handleOpenAuth}
            onOpenAI={() => setShowAIModal(true)}
            onRefresh={fetchData}
          />
        )}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar — operasyon kendi nav'ını tab olarak taşıyor */}
      {currentRole !== 'operasyon' && <MobileBottomNav
        activeNav={mobileNav === 'more' ? 'more' : cartRequested ? 'cart' : posRequested ? 'pos' : currentRole === 'customer' ? customerTab : adminTab}
        onNavChange={(nav) => {
          setMobileNav(nav);
          if (nav === 'home') {
            setCartRequested(false);
            setPosRequested(false);
            if (currentRole === 'admin') setAdminTab('home');
            else setCustomerTab('home');
          } else if (nav === 'orders') {
            setCartRequested(false);
            setPosRequested(false);
            if (currentRole === 'admin') setAdminTab('orders');
            else setCustomerTab('orders');
          } else if (nav === 'cariler' && currentRole === 'admin') {
            setCartRequested(false);
            setPosRequested(false);
            setAdminTab('cariler');
          } else if (nav === 'products' || nav === 'catalog') {
            setCartRequested(false);
            setPosRequested(false);
            if (currentRole === 'admin') setAdminTab('products');
            else setCustomerTab('catalog');
          } else if (nav === 'pos') {
            if (currentRole !== 'admin') {
              handleOpenAuth('login', 'admin');
            } else {
              setMobileQuickOpen(true);
            }
          } else if (nav === 'cart') {
            setPosRequested(false);
            setCartRequested(true);
          } else if (nav === 'more') {
            setCartRequested(false);
            setPosRequested(false);
            if (currentRole === 'admin') {
              setMobileNav('home');
              document.dispatchEvent(new CustomEvent('siatek:open-mobile-admin-menu'));
            } else setMobileNav('more');
          }
        }}
        currentRole={currentRole}
        cartItemCount={cartCount}
      />}
      {currentRole === 'admin' && <MobileQuickActionSheet open={mobileQuickOpen} onClose={() => setMobileQuickOpen(false)} onSelect={(tab) => { setMobileNav('home'); setAdminTab(tab); }} />}

      {/* Global Command Palette Modal — YALNIZCA admin rolünde */}
      {currentRole === 'admin' && (
        <CommandPaletteModal
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          products={products}
          orders={orders}
          quotes={quotes}
          currentRole={currentRole}
          onRoleChange={(target) => {
            if (target === 'admin') {
              if (!currentUser || currentUser.role !== 'admin') {
                handleOpenAuth('login', 'admin');
                return;
              }
            }
            setCurrentRole(target);
          }}
          onNavigateTab={(role, tab) => {
            if (role === 'admin') {
              if (!currentUser || currentUser.role !== 'admin') {
                handleOpenAuth('login', 'admin');
                return;
              }
              setCurrentRole('admin');
              if (tab === 'diagnostics' || tab === 'errors') openAdminSystemTool(tab);
              else if (isAdminTab(tab)) setAdminTab(tab);
            } else if (role === 'customer' && (tab === 'home' || tab === 'catalog' || tab === 'orders' || tab === 'quotes')) {
              setCurrentRole('customer');
              setCustomerTab(tab);
            }
          }}
          onOpenNewQuote={() => {
            if (currentRole === 'admin') {
              setAdminTab('quotes');
            } else {
              setShowQuickQuoteModal(true);
            }
          }}
          onOpenBarcodeScanner={() => setShowGlobalScannerModal(true)}
          onOpenAI={() => setShowAIModal(true)}
          onOpenNotifications={() => setShowNotificationDrawer(true)}
          onOpenSecurity={() => setShowSecurityModal(true)}
          onToggleTheme={toggleTheme}
          onOpenShortcutsHelp={() => setShowShortcutsModal(true)}
        />
      )}

      {/* Global Keyboard Shortcuts Cheat Sheet Modal — YALNIZCA admin rolünde */}
      {currentRole === 'admin' && (
        <KeyboardShortcutsModal
          isOpen={showShortcutsModal}
          onClose={() => setShowShortcutsModal(false)}
          onExecuteShortcut={handleExecuteShortcutFromGuide}
        />
      )}


      {/* Global Quick Quote Request Modal (Ctrl + N) */}
      {showQuickQuoteModal && (
        <QuickQuoteModal
          products={products}
          currentUser={currentUser}
          onClose={() => setShowQuickQuoteModal(false)}
          onSubmit={handleSendQuoteRequest}
        />
      )}

      {/* Global Live Camera Barcode Scanner Modal (Ctrl + B) */}
      {showGlobalScannerModal && (
        <CameraBarcodeScannerModal
          isOpen={showGlobalScannerModal}
          onClose={() => setShowGlobalScannerModal(false)}
          products={products}
          originRect={globalScannerOrigin}
          onProductUpdated={fetchData}
          onOpenProductEdit={(product) => {
            setShowGlobalScannerModal(false);
            if (currentUser?.role === 'admin' && currentRole !== 'admin') setCurrentRole('admin');
            setAdminTab('products');
          }}
          onOpenCreateWithBarcode={(_barcode) => {
            setShowGlobalScannerModal(false);
            if (currentUser?.role === 'admin' && currentRole !== 'admin') setCurrentRole('admin');
            setAdminTab('products');
          }}
          onOpenBarcodeGenerator={(_ids) => {
            setShowGlobalScannerModal(false);
            if (currentUser?.role === 'admin' && currentRole !== 'admin') setCurrentRole('admin');
            setAdminTab('products');
          }}
        />
      )}

      {/* Floating Barcode Scanner Action Button (FAB) for Customer Catalog */}
      {currentRole === 'customer' && customerTab === 'catalog' && (
        <FloatingScannerButton
          onClick={(origin) => {
            setGlobalScannerOrigin(origin || null);
            setShowGlobalScannerModal(true);
          }}
          onManualInput={() => {
            setShowGlobalScannerModal(true);
          }}
        />
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
        initialTab={authModalTab}
        targetRole={authTargetRole}
      />

      {/* Real-Time Push Notification Drawer with click routing */}
      <NotificationCenter
        isOpen={showNotificationDrawer}
        onClose={() => setShowNotificationDrawer(false)}
        notifications={notifications}
        currentRole={currentRole}
        onMarkAllRead={markAllNotificationsRead}
        onMarkRead={markNotificationRead}
        onNavigate={handleNotificationNavigate}
      />

      {/* E2EE Security & Cryptography Modal */}
      {showSecurityModal && (
        <E2EESecurityModal
          onClose={() => setShowSecurityModal(false)}
        />
      )}

      {/* Gemini AI asistani KALDIRILDI (19.09.2026) */}

      {/* Alpha Enterprise Suite — YALNIZCA yonetici.
          Bayiler icin tema/profil ayarlari DealerProfile sayfasindadir. */}
      {currentUser?.role === 'admin' && (
        <AlphaEnterpriseSuiteModal
          isOpen={showCustomizationModal}
          onClose={() => setShowCustomizationModal(false)}
          currentTheme={theme}
          onThemeChange={toggleTheme}
        />
      )}

      {/* Floating WhatsApp Support & Quick Order Button — YALNIZCA müşteri ve bayi arayüzünde */}
      {currentRole !== 'admin' && <FloatingWhatsAppButton />}

      {/* HUD Toast feedback for shortcuts — YALNIZCA admin rolünde */}
      {currentRole === 'admin' && (
        <ShortcutToast
          message={toastMessage}
          keys={toastKeys}
          onClear={() => setToastMessage(null)}
        />
      )}

      {/* Responsive WCAG 2.2 AA Dark Tone Footer */}
      <footer className="border-t border-border py-5 px-4 sm:px-8 bg-base-surface text-center text-xs text-text-secondary">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-text-primary">&copy; {new Date().getFullYear()} Sipariş & Teklif Yönetim Platformu</span>
          </div>
          <p className="text-[11px] text-text-secondary">Sipariş ve teklif işlemleri oturum gerektirir. Cari hesap ve tahsilat entegrasyonu mevcut değil.</p>
        </div>
      </footer>

    </div>
  );
}
