import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  subscribeToCariAccounts,
  subscribeToKasaHareketleri,
  describeFirestoreReadError,
  settleOrderPaymentInFirestore,
  saveOrderPickingInFirestore,
  saveProductToFirestore,
  bulkUpdateProductsInFirestore,
  bulkImportProductsToFirestore,
  saveNotificationToFirestore,
  saveQuoteToFirestore,
} from '../../lib/firestoreService';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import AdminHome from './AdminHome';
import AdminDashboardOverview from './AdminDashboardOverview';
import { MobileCariOverview, MobileStockOverview } from '../mobile/MobileERP';
import AdminModuleOverview from './AdminModuleOverview';
import { Product, Order, Quote, OrderStatus, CariAccount, KasaHareketi } from '../../types';
import type { AdminSystemTool, AdminTab } from '../../types';
import { createTransactionalOrder, updateTransactionalOrderStatus } from '../../lib/transactionService';
import DeliverySettlementModal, { DeliverySettlementData } from './DeliverySettlementModal';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  FileText, 
  Package, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Sparkles, 
  Plus, 
  PackagePlus,
  Edit3, 
  Trash2, 
  ShieldCheck, 
  Eye, 
  Send, 
  Search, 
  Filter,
  Lock, ArrowDownToLine, BarChart2, Wallet, Zap,
  Unlock,
  AlertCircle,
  TrendingUp,
  User,
  Phone,
  MapPin,
  AlertTriangle,
  BellRing,
  X,
  RotateCcw,
  BarChart3,
  Activity,
  Printer,
  Download,
  Users,
  Building2,
  Receipt,
  Bug,
  Wrench,
  Barcode,
  ArrowLeft,
  ChevronRight,
  Camera,
  FileSpreadsheet,
  Tag,
  Percent,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  SlidersHorizontal,
  ArrowUpDown,
  Layers,
  Palette,
  Settings2,
  
  Banknote,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import AdminQuoteModal from './AdminQuoteModal';
import ProductManageModal from './ProductManageModal';
import ProductFastEditTable from './ProductFastEditTable';
import StockHealthSummaryModal from './StockHealthSummaryModal';
import BarcodeGeneratorModal from './BarcodeGeneratorModal';
import CameraBarcodeScannerModal from './CameraBarcodeScannerModal';
import SalesAnalyticsDashboard from './SalesAnalyticsDashboard';
import SystemDiagnosticsDashboard from './SystemDiagnosticsDashboard';
import ErrorDiagnosticsCenter from './ErrorDiagnosticsCenter';
import SalesPerformanceTrendChart from './SalesPerformanceTrendChart';
import CariManagementDashboard from './CariManagementDashboard';
import AlisFaturalariDashboard from './AlisFaturalariDashboard';
import TedarikciEkstresi from './TedarikciEkstresi';
import GiderTakipDashboard from './GiderTakipDashboard';
import CekSenetDashboard from './CekSenetDashboard';
import KasaDefteri from './KasaDefteri';
import KarZararRaporu from './KarZararRaporu';
import OrtakAracHesabi from './OrtakAracHesabi';
import KdvOzetRaporu from './KdvOzetRaporu';
import UrunKarMarjiRaporu from './UrunKarMarjiRaporu';
import EInvoiceDashboard from './EInvoiceDashboard';
import BulkPriceAdjustmentModal from './BulkPriceAdjustmentModal';
import SupplierPurchaseOrderModal from './SupplierPurchaseOrderModal';
import OrderShipmentPackingModal from './OrderShipmentPackingModal';
import FastPosCheckoutModal from './FastPosCheckoutModal';
import CompanySettingsModal from './CompanySettingsModal';
import CustomizationStudioModal from './CustomizationStudioModal';
import AlphaEnterpriseSuiteModal from './AlphaEnterpriseSuiteModal';
import { printThermalReceipt80mm } from '../../utils/printUtils';
import BulkExcelImportExportModal from './BulkExcelImportExportModal';
import CustomerTierManagementModal from './CustomerTierManagementModal';
import DriverDispatchRouteModal from './DriverDispatchRouteModal';
import { AdminReceiptVerificationModal } from './AdminReceiptVerificationModal';
import { OrderPickingInspectionModal } from './OrderPickingInspectionModal';
import { ManagerAgingAndStockReportsModal } from './ManagerAgingAndStockReportsModal';
import { OrderActionDropdown } from './OrderActionDropdown';
import UserManagementModal from './UserManagementModal';
import WhatsAppShareModal from '../common/WhatsAppShareModal';
import D3OrderStatusFlow from '../common/D3OrderStatusFlow';
import QuotePDFModal from '../QuotePDFModal';
import OrderPDFModal from '../OrderPDFModal';
import OverviewMetricsBar from '../common/OverviewMetricsBar';
import OrderPagination from '../common/OrderPagination';
import { copyToClipboard } from '../../utils/shareUtils';
import { decryptPayload } from '../../lib/crypto';
import { playNotificationSound } from '../../lib/audio';
import { generateOrderWhatsAppMessage, generateQuoteWhatsAppMessage } from '../../utils/shareUtils';
import FloatingScannerButton from '../common/FloatingScannerButton';
import { COMPANY_BANK_ACCOUNTS } from '../../data/bankAccounts';

interface AdminPortalProps {
  currentUserName?: string;
  products: Product[];
  orders: Order[];
  quotes: Quote[];
  activeTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
  onRefresh: () => void;
  onOpenAI: () => void;
  onOpenNotifications?: () => void;
  onMobileToggleTheme?: () => void;
  productsLoading?: boolean;
  productsError?: string;
  quotesLoading?: boolean;
  quotesError?: string;
  ordersLoading?: boolean;
  ordersError?: string;
  posRequested?: boolean;
  onPosClose?: () => void;
  theme?: 'dark' | 'light' | 'system';
  onToggleTheme?: (theme?: 'dark' | 'light' | 'system') => void;
}

function AdminContextActionsPortal({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById('admin-context-actions-portal'));
  }, []);

  if (!target) return <div className="admin-context-actions-fallback flex items-center gap-2 mb-3">{children}</div>;
  return createPortal(children, target);
}

export default function AdminPortal({
  currentUserName = 'Fatih Fırat',
  products,
  orders,
  quotes,
  activeTab: controlledActiveTab,
  onTabChange,
  onRefresh,
  onOpenAI,
  onOpenNotifications,
  onMobileToggleTheme,
  productsLoading = false,
  productsError,
  quotesLoading = false,
  quotesError,
  ordersLoading = false,
  ordersError,
  posRequested = false,
  onPosClose,
  theme = 'dark',
  onToggleTheme,
}: AdminPortalProps) {
  const [internalTab, setInternalTab] = useState<AdminTab>('home');
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalTab;
  const setActiveTab = (tab: AdminTab) => {
    setInternalTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | Order['status'] | 'uncollected'>('all');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<'all' | Quote['status']>('all');
  const [settlementOrder, setSettlementOrder] = useState<Order | null>(null);
  const [isSettlementProcessing, setIsSettlementProcessing] = useState<boolean>(false);
  const [portalCariAccounts, setPortalCariAccounts] = useState<CariAccount[]>([]);
  const [portalCashMovements, setPortalCashMovements] = useState<KasaHareketi[]>([]);
  const [mobileCariLoading, setMobileCariLoading] = useState(true);
  const [mobileCashLoading, setMobileCashLoading] = useState(true);
  const [mobileFinanceError, setMobileFinanceError] = useState('');

  useEffect(() => {
    const handleSidebarAlert = (event: Event) => {
      const tab = (event as CustomEvent<{ tab?: AdminTab }>).detail?.tab;
      if (tab === 'orders') {
        setOrderStatusFilter('pending');
        setOrderCurrentPage(1);
      }
    };
    document.addEventListener('siatek:sidebar-alert', handleSidebarAlert);
    return () => document.removeEventListener('siatek:sidebar-alert', handleSidebarAlert);
  }, []);

  // Cari listesi Firestore canli aboneligi. Eskiden olu /api/cariler cagriliyor
  // ve hata .catch(()=>{}) ile yutuluyordu; cari secim kutulari hep bos kaliyordu.
  useEffect(() => {
    const unsub = subscribeToCariAccounts(
      (list) => { setPortalCariAccounts(list); setMobileCariLoading(false); },
      { uid: null, isAdmin: true },
      (error) => {
        setMobileFinanceError(describeFirestoreReadError(error));
        setMobileCariLoading(false);
      }
    );
    return unsub;
  }, []);

  useEffect(() => subscribeToKasaHareketleri((list) => {
    setPortalCashMovements(list);
    setMobileFinanceError('');
    setMobileCashLoading(false);
  }, (error) => {
    setMobileFinanceError(describeFirestoreReadError(error));
    setMobileCashLoading(false);
  }), []);

  const handleConfirmDeliverySettlement = async (orderId: string, settlementData: DeliverySettlementData) => {
    setIsSettlementProcessing(true);
    try {
      // Firestore'a yaz. Eskiden olu /api/orders/:id/settle-payment cagriliyor,
      // res.json() HTML uzerinde patliyor ve kullaniciya "Teslimat ve tahsilat
      // kaydedilemedi" hatasi gosteriliyordu. (19.09.2026)
      await settleOrderPaymentInFirestore(orderId, settlementData as any);

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      playNotificationSound('success');
      onRefresh();
      setSettlementOrder(null);
    } catch (e: any) {
      console.error('handleConfirmDeliverySettlement hatası:', e);
      throw e;
    } finally {
      setIsSettlementProcessing(false);
    }
  };

  const [selectedQuoteForResponse, setSelectedQuoteForResponse] = useState<Quote | null>(null);
  const [selectedQuoteForPDF, setSelectedQuoteForPDF] = useState<Quote | null>(null);
  const [selectedOrderForPDF, setSelectedOrderForPDF] = useState<Order | null>(null);
  const [selectedProductToEdit, setSelectedProductToEdit] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [posScannedBarcode, setPosScannedBarcode] = useState<{ code: string; sequence: number } | null>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showCameraScannerModal, setShowCameraScannerModal] = useState(false);
  const [scannerOriginRect, setScannerOriginRect] = useState<DOMRect | null>(null);
  const [wmsSessionScannedCount, setWmsSessionScannedCount] = useState<number>(0);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>('all');
  const [orderSort, setOrderSort] = useState<'date_desc' | 'date_asc' | 'total_desc' | 'total_asc'>('date_desc');
  const [orderCurrentPage, setOrderCurrentPage] = useState<number>(1);
  const [orderPageSize, setOrderPageSize] = useState<number>(10);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  const [copiedOrderFeedback, setCopiedOrderFeedback] = useState<string | null>(null);
  const [showSalesTrendWidget, setShowSalesTrendWidget] = useState<boolean>(false);
  const [selectedTrendDate, setSelectedTrendDate] = useState<string | null>(null);

  const createNewQuote = async () => {
    const now = new Date().toISOString();
    const quote: Quote = { id: `quote-${Date.now()}`, quoteNumber: `TKL-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`, customerName: 'Yeni müşteri / cari seçilmedi', customerCompany: 'Cari seçilmedi', customerEmail: '', customerPhone: '', requestedItems: [], offeredItems: [], status: 'pending_review', createdAt: now, updatedAt: now, taxRate: 20, subtotal: 0, taxAmount: 0, grandTotal: 0 };
    await saveQuoteToFirestore(quote);
    setSelectedQuoteForResponse(quote);
  };
  
  // Low stock alert state
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [stockFilterMode, setStockFilterMode] = useState<'all' | 'in_stock' | 'critical' | 'health'>('all');
  const [showStockHealthModal, setShowStockHealthModal] = useState<boolean>(false);
  const [showStockBulkMenu, setShowStockBulkMenu] = useState(false);
  const [isCheckingLowStock, setIsCheckingLowStock] = useState(false);
  const [restockLoadingId, setRestockLoadingId] = useState<string | null>(null);
  const [lowStockFeedback, setLowStockFeedback] = useState<string | null>(null);

  // New Feature States
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [showSupplierPOModal, setShowSupplierPOModal] = useState(false);
  const [internalPosOpen, setInternalPosOpen] = useState(false);
  const showPosModal = posRequested || internalPosOpen;
  const setShowPosModal = (open: boolean) => { setInternalPosOpen(open); if (!open) onPosClose?.(); };
  const [showBulkExcelModal, setShowBulkExcelModal] = useState(false);
  const [showCustomerTierModal, setShowCustomerTierModal] = useState(false);
  const [selectedOrderForPacking, setSelectedOrderForPacking] = useState<Order | null>(null);
  const [showReceiptVerificationModal, setShowReceiptVerificationModal] = useState(false);
  const [showPickingInspectionModal, setShowPickingInspectionModal] = useState(false);
  const [selectedOrderForPicking, setSelectedOrderForPicking] = useState<Order | null>(null);
  const [showAgingAndDiscountModal, setShowAgingAndDiscountModal] = useState(false);
  const [showCompanySettingsModal, setShowCompanySettingsModal] = useState(false);
  const [showCustomizationStudio, setShowCustomizationStudio] = useState(false);
  // Keep the home view focused on decisions; full module map remains one click away.
  const [showOperasyonMasasi, setShowOperasyonMasasi] = useState(false);
  const [showAdminNavDetails, setShowAdminNavDetails] = useState(false);
  const [showUserMgmtModal, setShowUserMgmtModal] = useState(false);
  const [showEnterpriseSuite, setShowEnterpriseSuite] = useState(false);
  const [enterpriseSuiteTab, setEnterpriseSuiteTab] = useState<'identity' | 'banks' | 'studio' | 'policies' | 'backup' | 'preview' | 'fleet'>('studio');
  const [settingsSection, setSettingsSection] = useState<'company' | 'users' | 'system'>('company');
  const [systemSettingsTab, setSystemSettingsTab] = useState<'health' | 'errors'>('health');

  useEffect(() => {
    const openCompanySettings = () => {
      setEnterpriseSuiteTab('identity');
      setShowEnterpriseSuite(true);
    };
    const openUserSettings = () => setShowUserMgmtModal(true);
    const openSystemSettings = (event: Event) => {
      const tool = (event as CustomEvent<{ tool?: AdminSystemTool }>).detail?.tool;
      setSettingsSection('system');
      setSystemSettingsTab(tool === 'errors' ? 'errors' : 'health');
      setActiveTab('settings');
    };

    document.addEventListener('siatek:open-company-settings', openCompanySettings);
    document.addEventListener('siatek:open-users-settings', openUserSettings);
    document.addEventListener('siatek:open-system-settings', openSystemSettings);
    return () => {
      document.removeEventListener('siatek:open-company-settings', openCompanySettings);
      document.removeEventListener('siatek:open-users-settings', openUserSettings);
      document.removeEventListener('siatek:open-system-settings', openSystemSettings);
    };
  }, []);
  const [whatsAppShareState, setWhatsAppShareState] = useState<{
    isOpen: boolean;
    title: string;
    defaultPhone: string;
    defaultMessage: string;
    recipientName: string;
  } | null>(null);

  // Smooth scroll and visual feedback states for action & metric cards
  const contentSectionRef = useRef<HTMLDivElement>(null);
  const [clickedCardId, setClickedCardId] = useState<string | null>(null);
  const [highlightSection, setHighlightSection] = useState<string | null>(null);

  const handleCardNavigate = (
    cardId: string,
    targetTab: Exclude<AdminTab, 'home' | 'pos' | 'settings' | `ops-${string}` | 'alis-faturalari' | 'tedarikci-ekstresi'> | AdminSystemTool,
    filterSetup?: () => void
  ) => {
    setClickedCardId(cardId);
    if (filterSetup) {
      filterSetup();
    }

    if (targetTab === 'diagnostics' || targetTab === 'errors') {
      setSettingsSection('system');
      setSystemSettingsTab(targetTab === 'errors' ? 'errors' : 'health');
      setActiveTab('settings');
    } else {
      setActiveTab(targetTab);
    }
    setHighlightSection(targetTab);
    setTimeout(() => {
      contentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);

    // Clear click state
    setTimeout(() => {
      setClickedCardId(null);
    }, 800);

    // Clear highlight ring
    setTimeout(() => {
      setHighlightSection(null);
    }, 2500);
  };

  // Tracking number modal / prompt
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState<string | null>(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [decryptedNotes, setDecryptedNotes] = useState<Record<string, string>>({});

  useModalBehavior(Boolean(activeTrackingOrderId), () => setActiveTrackingOrderId(null));
  useModalBehavior(showLowStockModal, () => setShowLowStockModal(false));

  // Quick stats
  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((acc, o) => acc + o.total, 0);
  const pendingOrdersCount = (orders || []).filter(o => o.status === 'pending').length;
  const pendingQuotesCount = (quotes || []).filter(q => q.status === 'pending_review').length;
  const offerSentQuotesCount = (quotes || []).filter(q => q.status === 'offer_sent').length;
  const lowStockProducts = products.filter(p => p.stock <= lowStockThreshold);
  const totalPendingActions = pendingOrdersCount + pendingQuotesCount + (lowStockProducts.length > 0 ? 1 : 0);

  // Trigger manual low stock check & send notifications
  const handleTriggerLowStockAlarm = async () => {
    setIsCheckingLowStock(true);
    try {
      // Tarama artik istemcide yapiliyor, bildirim Firestore'a yaziliyor.
      const kritikler = products.filter(p => (p.stock ?? 0) <= lowStockThreshold);

      if (kritikler.length > 0) {
        await saveNotificationToFirestore({
          id: `notif_lowstock_${Date.now()}`,
          title: 'Kritik Stok Uyarısı',
          message: `${kritikler.length} ürün kritik stok eşiğinde (≤ ${lowStockThreshold}).`,
          type: 'warning',
          targetRole: 'admin',
          read: false,
          timestamp: new Date().toISOString(),
        } as any);
      }

      playNotificationSound('alert');
      setLowStockFeedback(
        `Alarm taraması tamamlandı: ${kritikler.length} ürün kritik eşikte (≤ ${lowStockThreshold}).` +
        (kritikler.length > 0 ? ' Bildirim oluşturuldu.' : '')
      );
      onRefresh();
    } catch (e) {
      console.error('Error checking low stock:', e);
      setLowStockFeedback('Stok taraması tamamlanamadı.');
    } finally {
      setIsCheckingLowStock(false);
    }
  };

  // Quick restock single product
  const handleQuickRestock = async (product: Product, addQty: number) => {
    setRestockLoadingId(product.id);
    try {
      const newStock = product.stock + addQty;
      await saveProductToFirestore({ ...product, stock: newStock });
      playNotificationSound('success');
      onRefresh();
    } catch (e) {
      console.error('Stok eklenemedi:', e);
    } finally {
      setRestockLoadingId(null);
    }
  };

  // Batch restock all low stock products (+50)
  const handleBatchRestockAllLow = async (addQty: number = 50) => {
    if (lowStockProducts.length === 0) return;
    if (!confirm(`Eşik değeri (≤ ${lowStockThreshold}) altındaki toplam ${lowStockProducts.length} adet ürüne +${addQty} adet stok eklemek istiyor musunuz?`)) return;

    try {
      const updates = lowStockProducts.map(p => ({
        id: p.id,
        stock: p.stock + addQty,
      }));
      await bulkUpdateProductsInFirestore(updates);
      playNotificationSound('success');
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.5 } });
      setLowStockFeedback(`Tüm kritik stoklu ${lowStockProducts.length} ürüne +${addQty} adet stok başarıyla eklendi.`);
      onRefresh();
    } catch (e) {
      console.error('Toplu stok ekleme hatası:', e);
      setLowStockFeedback('Toplu stok eklenemedi.');
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: string, 
    newStatus: OrderStatus, 
    trackingNo?: string,
    extraData?: Partial<Order>
  ) => {
    let updatedSuccess = false;
    const serverError: string | null = null;

    // Olu sunucu denemesi KALDIRILDI (19.09.2026): her istekte bosuna bir tur
    // atiliyordu. Firestore zaten tek ve gercek kaynak.
    if (!updatedSuccess) {
      try {
        // Mock order control
        if (orderId.includes('POS-2026-') || orderId.includes('SIP-2026-')) {
          console.warn('Mock order bypass:', orderId);
          updatedSuccess = true;
        } else {
          await updateTransactionalOrderStatus(orderId, newStatus, {
            trackingNumber: trackingNo,
            ...(extraData || {})
          });
          updatedSuccess = true;
        }
      } catch (firestoreErr: any) {
        console.error('Firestore sipariş durum güncelleme hatası:', firestoreErr);
        if (serverError) {
          throw new Error(serverError);
        }
        throw firestoreErr;
      }
    }

    if (updatedSuccess) {
      if (newStatus === 'approved' || newStatus === 'shipped') {
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
      }
      playNotificationSound('status');
      onRefresh();
      return { success: true };
    } else if (serverError) {
      throw new Error(serverError);
    }
  };

  const handleDecryptNote = async (orderId: string, encryptedPayload: string) => {
    const dec = await decryptPayload(encryptedPayload);
    setDecryptedNotes(prev => ({ ...prev, [orderId]: dec }));
  };

  // Toplu Fiyat ve İskonto Güncelleme Handler
  const handleApplyBulkPriceAdjustment = async (updatedProducts: Product[], message: string) => {
    try {
      const updates = updatedProducts.map(p => ({
        id: p.id,
        price: p.price,
        wholesalePrice: p.wholesalePrice,
      }));
      await bulkUpdateProductsInFirestore(updates);
      setLowStockFeedback(`Fiyatlar başarıyla güncellendi: ${message}`);
      setTimeout(() => setLowStockFeedback(null), 5000);
      onRefresh();
    } catch (e) {
      console.error('Toplu fiyat güncelleme hatası:', e);
      alert('Fiyatlar güncellenemedi.');
    }
  };

  // Tedarikçi Satın Alma Siparişi Mal Kabul / Stok İkmal Handler
  const handleApplySupplierRestock = async (restockItems: Array<{ id: string; quantity: number }>) => {
    try {
      const productMap = new Map(products.map(p => [p.id, p]));
      const updates = restockItems.map(item => {
        const currentProd = productMap.get(item.id);
        const currentStock = currentProd ? currentProd.stock : 0;
        return {
          id: item.id,
          stock: currentStock + item.quantity,
        };
      });

      await bulkUpdateProductsInFirestore(updates);
      playNotificationSound('success');
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
      onRefresh();
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  };

  // Depo Sevkiyat & Çeki Listesi Tamamlama Handler
  const handleCompleteShipment = async (
    orderId: string, 
    trackingNumber: string, 
    carrier: string,
    vehiclePlate?: string,
    driverName?: string,
    packagesCount?: number
  ) => {
    try {
      await handleUpdateOrderStatus(orderId, 'shipped', trackingNumber, {
        shippingCompany: carrier,
        deliveryVehicle: vehiclePlate,
        deliveryPersonnel: driverName,
        packageCount: packagesCount,
        pickingStatus: 'completed',
        deliveryStatus: 'out_for_delivery'
      });
      playNotificationSound('success');
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    } catch (e) {
      console.error('handleCompleteShipment hatası:', e);
      throw e;
    }
  };

  // Depo Toplama (Picking & WMS Lite) Tamamlama Handler
  const handleCompletePicking = async (
    orderId: string,
    packageCount: number,
    shippingCompany: string,
    waybillNumber: string,
    recipientDetails?: {
      recipientName?: string;
      recipientPhone?: string;
      recipientIdNumber?: string;
      recipientTitle?: string;
      deliveryAddressOverride?: string;
      waybillNotes?: string;
    }
  ) => {
    try {
      await saveOrderPickingInFirestore(orderId, {
        packageCount,
        shippingCompany,
        waybillNumber,
        ...recipientDetails,
      });
      playNotificationSound('success');
      confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
      onRefresh();
    } catch (e: any) {
      console.error('handleCompletePicking hatası:', e);
      throw e;
    }
  };

  // Hızlı POS Kasa Sipariş Oluşturma Handler
  const handlePosSaleComplete = async (saleData: {
    customerName: string;
    customerPhone?: string;
    cariId?: string;
    paymentMethod: 'Nakit' | 'Kredi Kartı' | 'Cari Hesap' | 'Havale/EFT';
    items: Array<{ productId: string; productName?: string; unit?: string; quantity: number; unitPrice: number; totalPrice: number }>;
    totalAmount: number;
    discountAmount: number;
    paidAmount: number;
    changeAmount: number;
  }) => {
    try {
      const orderPayload = {
        customerName: saleData.customerName,
        customerPhone: saleData.customerPhone,
        customerAddress: 'Hızlı Kasa / Tezgah Siparişi',
        discount: saleData.discountAmount,
        paymentMethod: saleData.paymentMethod,
        cariId: saleData.cariId,
        notes: 'POS sipariş kaydı; tahsilat ve teslimat ayrıca doğrulanmalıdır.',
        items: saleData.items.map(it => ({
          productId: it.productId,
          productName: it.productName,
          unit: it.unit || 'ADET',
          quantity: it.quantity,
          unitPrice: it.unitPrice
        })),
      };
      // Sipariş, stok, stok hareketi, kritik alarm ve cari borç tek transaction.
      const yeniSiparis = await createTransactionalOrder(orderPayload, 'pos');

      onRefresh();
      return yeniSiparis;
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  };

  // Toplu Excel Ürün ve Fiyat İçe Aktarma Handler
  const handleApplyBulkImportProducts = async (importedProducts: any[]) => {
    try {
      await bulkImportProductsToFirestore(importedProducts as any);
      playNotificationSound('success');
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
      onRefresh();
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  };

  // Şoför Sevkiyat Rota Toplu Sipariş Durum Güncelleme
  const handleMarkOrdersShipped = async (orderIds: string[], trackingPrefix?: string) => {
    try {
      for (const id of orderIds) {
        await handleUpdateOrderStatus(id, 'shipped', `${trackingPrefix || 'SEVK'}-${Date.now().toString().slice(-4)}`);
      }
      playNotificationSound('success');
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
      onRefresh();
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const getOrderStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-full bg-bg-warning text-warning-text border border-warning-border text-xs font-bold flex items-center space-x-1 animate-pulse">
            <Clock className="w-3 h-3 text-warning-text" />
            <span>Yeni Sipariş (Onay Bekliyor)</span>
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-1 rounded-full bg-bg-success text-success-text border border-success-border text-xs font-semibold flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-success-text" />
            <span>Onaylandı</span>
          </span>
        );
      case 'preparing':
        return (
          <span className="px-2.5 py-1 rounded-full bg-base-surface-2 text-text-primary border border-border text-xs font-semibold flex items-center space-x-1">
            <Package className="w-3 h-3 text-text-secondary" />
            <span>Hazırlanıyor</span>
          </span>
        );
      case 'shipped':
        return (
          <span className="px-2.5 py-1 rounded-full bg-bg-warning text-warning-text border border-warning-border text-xs font-semibold flex items-center space-x-1">
            <Truck className="w-3 h-3 text-warning-text" />
            <span>Sevkiyatta / Yolda</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="px-2.5 py-1 rounded-full bg-bg-info text-info-text border border-info-border text-xs font-semibold flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-info-text" />
            <span>Teslim Edildi</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full bg-bg-danger text-danger-text border border-danger-border text-xs font-semibold">
            İptal
          </span>
        );
    }
  };

  return (
    <div className="premium-section-six admin-premium-surface space-y-6">
      <header className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-slate-950 px-5 py-5 text-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.55)] sm:px-7 sm:py-6">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-emerald-500/10 [clip-path:polygon(42%_0,100%_0,100%_100%,0_100%)]" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" />
              Alpha Teknik / Yönetim Merkezi
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Operasyon komuta merkezi</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-300">Satış, stok ve finans kararlarını tek görünümde yönetin.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:flex sm:items-center">
            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sistem</div>
              <div className="mt-1 flex items-center gap-1.5 font-bold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Çalışıyor</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Açık işlem</div>
              <div className="mt-1 font-mono font-bold tabular-nums text-white">{totalPendingActions}</div>
            </div>
          </div>
        </div>
      </header>
      
      {activeTab === 'cariler' && <div className="mobile-admin-module-only"><MobileCariOverview userName={currentUserName} accounts={portalCariAccounts} loading={mobileCariLoading} setActive={setActiveTab} onAdd={() => document.dispatchEvent(new CustomEvent('siatek:open-cari-create'))} pendingOrders={pendingOrdersCount} lowStock={lowStockProducts.length} onOpenNotifications={onOpenNotifications} onToggleTheme={onMobileToggleTheme} onOpenAI={onOpenAI}/></div>}
      {activeTab === 'products' && <div className="mobile-admin-module-only"><MobileStockOverview userName={currentUserName} products={products} setActive={setActiveTab} onAdd={() => { setSelectedProductToEdit(null); setShowProductModal(true); }} pendingOrders={pendingOrdersCount} lowStock={lowStockProducts.length} onOpenNotifications={onOpenNotifications} onToggleTheme={onMobileToggleTheme} onOpenAI={onOpenAI}/></div>}

      {activeTab === 'home' && (
        <div className="admin-home-mobile-layout space-y-6 ui-tab-fade">
          <AdminDashboardOverview
            userName={currentUserName}
            orders={orders}
            quotes={quotes}
            products={products}
            cariAccounts={portalCariAccounts}
            cashMovements={portalCashMovements}
            loading={ordersLoading || productsLoading || mobileCariLoading || mobileCashLoading}
            error={ordersError || productsError || mobileFinanceError || ''}
            onRetry={onRefresh}
            onOpenNotifications={onOpenNotifications}
            onToggleTheme={onMobileToggleTheme}
            onOpenAI={onOpenAI}
            pendingOrders={pendingOrdersCount}
            pendingQuotes={pendingQuotesCount}
            lowStock={lowStockProducts.length}
            onNavigate={(tab) => setActiveTab(tab)}
          />
          {/* Bekleyen Aksiyonlar & Hızlı Yönetim Masası */}
      <div className="bg-base-surface p-4 sm:p-5 rounded-2xl border border-border shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-extrabold text-text-primary tracking-tight flex items-center space-x-2">
              <span>Bekleyen Aksiyonlar</span>
              {totalPendingActions > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-bg-danger text-danger-text text-[11px] font-mono font-bold border border-danger-border">
                  {totalPendingActions} Öncelikli İşlem
                </span>
              )}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-text-muted hidden md:inline-block">
              Tek tıkla yönetim masalarına geçiş yapın
            </span>
          </div>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* 1. Bekleyen Siparişler */}
          <div 
            id="card-pending-orders"
            role="button"
            tabIndex={0}
            onClick={() => {
              handleCardNavigate('pending-orders', 'orders', () => setOrderStatusFilter('pending'));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleCardNavigate('pending-orders', 'orders', () => setOrderStatusFilter('pending'));
              }
            }}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
              clickedCardId === 'pending-orders'
                ? pendingOrdersCount > 0
                  ? 'ring-2 ring-warning-border bg-bg-warning shadow-md'
                  : 'ring-2 ring-neutral-border bg-base-surface-2 shadow-md'
                : (activeTab as string) === 'orders' && orderStatusFilter === 'pending'
                ? pendingOrdersCount > 0
                  ? 'bg-bg-warning border-warning-border ring-1 ring-warning-border shadow-xs'
                  : 'bg-base-surface-2 border-border-strong ring-1 ring-border-strong shadow-xs'
                : pendingOrdersCount > 0
                ? 'bg-bg-warning/25 border-warning-border/50 hover:border-warning-border hover:bg-bg-warning/40'
                : 'bg-base-surface-2/60 border-border hover:border-border-strong hover:bg-base-surface-2'
            }`}
            title="Onay bekleyen siparişlere kaydır ve incele"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary font-bold flex items-center space-x-1.5">
                <span>Bekleyen Siparişler</span>
                {pendingOrdersCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-warning-fill animate-pulse" />
                )}
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl border transition-transform ${
                clickedCardId === 'pending-orders' ? 'scale-105' : ''
              } ${
                pendingOrdersCount > 0
                  ? 'bg-bg-warning text-warning-text border-warning-border'
                  : 'bg-base-surface text-text-muted border-border'
              }`}>
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-xl sm:text-2xl font-black mt-1.5 font-mono ${
              pendingOrdersCount > 0 ? 'text-warning-text' : 'text-text-primary'
            }`}>
              {pendingOrdersCount} <span className="text-xs font-sans font-bold text-text-muted">Sipariş</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-text-muted font-medium">Onay & Hazırlık</span>
              <span className={pendingOrdersCount > 0 ? 'text-warning-text font-bold' : 'text-text-muted font-medium'}>
                {pendingOrdersCount > 0 ? 'İşlem Bekliyor' : 'Bekleyen Yok'}
              </span>
            </div>
          </div>

          {/* 2. Bekleyen Teklif Talepleri */}
          <div 
            id="card-pending-quotes"
            role="button"
            tabIndex={0}
            onClick={() => {
              handleCardNavigate('pending-quotes', 'quotes', () => setQuoteStatusFilter('pending_review'));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleCardNavigate('pending-quotes', 'quotes', () => setQuoteStatusFilter('pending_review'));
              }
            }}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
              clickedCardId === 'pending-quotes'
                ? pendingQuotesCount > 0
                  ? 'ring-2 ring-warning-border bg-bg-warning shadow-md'
                  : 'ring-2 ring-neutral-border bg-base-surface-2 shadow-md'
                : (activeTab as string) === 'quotes' && quoteStatusFilter === 'pending_review'
                ? pendingQuotesCount > 0
                  ? 'bg-bg-warning border-warning-border ring-1 ring-warning-border shadow-xs'
                  : 'bg-base-surface-2 border-border-strong ring-1 ring-border-strong shadow-xs'
                : pendingQuotesCount > 0
                ? 'bg-bg-warning/25 border-warning-border/50 hover:border-warning-border hover:bg-bg-warning/40'
                : 'bg-base-surface-2/60 border-border hover:border-border-strong hover:bg-base-surface-2'
            }`}
            title="Fiyatlandırma bekleyen teklif taleplerine kaydır"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary font-bold flex items-center space-x-1.5">
                <span>Bekleyen Teklifler</span>
                {pendingQuotesCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-warning-fill animate-ping" />
                )}
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl border transition-transform ${
                clickedCardId === 'pending-quotes' ? 'scale-105' : ''
              } ${
                pendingQuotesCount > 0
                  ? 'bg-bg-warning text-warning-text border-warning-border'
                  : 'bg-base-surface text-text-muted border-border'
              }`}>
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-xl sm:text-2xl font-black mt-1.5 font-mono ${
              pendingQuotesCount > 0 ? 'text-warning-text' : 'text-text-primary'
            }`}>
              {pendingQuotesCount} <span className="text-xs font-sans font-bold text-text-muted">Talep</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-text-muted font-medium">Fiyatlandırma Bekliyor</span>
              <span className={pendingQuotesCount > 0 ? 'text-warning-text font-bold' : 'text-text-muted font-medium'}>
                {pendingQuotesCount > 0 ? 'Fiyatlandır' : 'Bekleyen Yok'}
              </span>
            </div>
          </div>

          {/* 3. Müşteri Yanıtı Bekleyen Teklifler */}
          <div 
            id="card-offer-sent-quotes"
            role="button"
            tabIndex={0}
            onClick={() => {
              handleCardNavigate('offer-sent-quotes', 'quotes', () => setQuoteStatusFilter('offer_sent'));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleCardNavigate('offer-sent-quotes', 'quotes', () => setQuoteStatusFilter('offer_sent'));
              }
            }}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
              clickedCardId === 'offer-sent-quotes'
                ? offerSentQuotesCount > 0
                  ? 'ring-2 ring-info-border bg-bg-info shadow-md'
                  : 'ring-2 ring-neutral-border bg-base-surface-2 shadow-md'
                : (activeTab as string) === 'quotes' && quoteStatusFilter === 'offer_sent'
                ? offerSentQuotesCount > 0
                  ? 'bg-bg-info border-info-border ring-1 ring-info-border shadow-xs'
                  : 'bg-base-surface-2 border-border-strong ring-1 ring-border-strong shadow-xs'
                : offerSentQuotesCount > 0
                ? 'bg-bg-info/25 border-info-border/50 hover:border-info-border hover:bg-bg-info/40'
                : 'bg-base-surface-2/60 border-border hover:border-border-strong hover:bg-base-surface-2'
            }`}
            title="Müşteriye iletilen tekliflere kaydır"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary font-bold flex items-center space-x-1.5">
                <span>İletilen Teklifler</span>
                {offerSentQuotesCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-info-fill" />
                )}
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl border transition-transform ${
                clickedCardId === 'offer-sent-quotes' ? 'scale-105' : ''
              } ${
                offerSentQuotesCount > 0
                  ? 'bg-bg-info text-info-text border-info-border'
                  : 'bg-base-surface text-text-muted border-border'
              }`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-xl sm:text-2xl font-black mt-1.5 font-mono ${
              offerSentQuotesCount > 0 ? 'text-info-text' : 'text-text-primary'
            }`}>
              {offerSentQuotesCount} <span className="text-xs font-sans font-bold text-text-muted">Hazır Teklif</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-text-muted font-medium">Müşteri Onayında</span>
              <span className={offerSentQuotesCount > 0 ? 'text-info-text font-bold' : 'text-text-muted font-medium'}>
                {offerSentQuotesCount > 0 ? 'Takipte' : 'Aktif Yok'}
              </span>
            </div>
          </div>

          {/* 4. Düşük Stok Alarmları */}
          <div 
            id="card-low-stock-alert"
            role="button"
            tabIndex={0}
            onClick={() => {
              if (lowStockProducts.length > 0) {
                setShowLowStockModal(true);
              } else {
                handleCardNavigate('low-stock', 'products');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                if (lowStockProducts.length > 0) setShowLowStockModal(true);
                else handleCardNavigate('low-stock', 'products');
              }
            }}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
              clickedCardId === 'low-stock'
                ? lowStockProducts.length > 0
                  ? 'ring-2 ring-danger-border bg-bg-danger shadow-md'
                  : 'ring-2 ring-neutral-border bg-base-surface-2 shadow-md'
                : lowStockProducts.length > 0 
                ? 'bg-bg-danger/40 border-danger-border hover:bg-bg-danger/60 ring-1 ring-danger-border' 
                : 'bg-base-surface-2/60 border-border hover:border-border-strong hover:bg-base-surface-2'
            }`}
            title="Düşük stok detaylarını incele ve hızlı ikmal yap"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary font-bold flex items-center space-x-1.5">
                <span>Düşük Stok</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-base-surface text-text-secondary font-mono border border-border">≤{lowStockThreshold}</span>
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl border ${
                lowStockProducts.length > 0 
                  ? 'bg-bg-danger text-danger-text border-danger-border animate-pulse' 
                  : 'bg-base-surface text-text-muted border-border'
              }`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-xl sm:text-2xl font-black mt-1.5 font-mono ${
              lowStockProducts.length > 0 ? 'text-danger-text' : 'text-text-primary'
            }`}>
              {lowStockProducts.length} <span className="text-xs font-sans font-bold text-text-muted">Kritik Ürün</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className={lowStockProducts.length > 0 ? 'text-danger-text font-semibold' : 'text-text-muted'}>
                {lowStockProducts.length > 0 ? 'Hızlı İkmal ➔' : 'Stoklar Yeterli'}
              </span>
              <span className="text-text-muted">Toplam: {products.length}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Overview Analytics Bar (Toplam Sipariş & Aktif Ürün Adacıkları - Paylaşılan Bileşen) */}
      <OverviewMetricsBar
        products={products}
        orders={orders}
        activeTab={activeTab}
        clickedCardId={clickedCardId}
        onNavigateOrders={() => {
          if (activeTab === 'home') {
            setClickedCardId('total-orders-island');
            setOrderStatusFilter('all');
            setHighlightSection('orders');
            setTimeout(() => { contentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
            setTimeout(() => setClickedCardId(null), 800);
            setTimeout(() => setHighlightSection(null), 2500);
          } else {
            handleCardNavigate('total-orders-island', 'orders', () => setOrderStatusFilter('all'));
          }
        }}
        onNavigateProducts={() => {
          handleCardNavigate('active-products-island', 'products', () => setSearchFilter(''));
        }}
      />

      {/* Prominent Low Stock Alert Banner (Real-time & threshold driven) */}
      {lowStockProducts.length > 0 && (
        <div className="p-4 bg-bg-danger/25 border border-danger-border rounded-2xl shadow-xs space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center space-x-3">
              <div className="p-2 rounded-xl bg-danger-fill text-white shadow-xs shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap">
                  <h3 className="font-extrabold text-sm text-danger-text">
                    Otomatik 'Düşük Stok' Alarmı Aktif
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-bg-danger text-danger-text font-bold text-xs border border-danger-border">
                    {lowStockProducts.length} Üründe Stok Kritik (≤ {lowStockThreshold} Adet)
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  Sipariş ve satış akışında stok tükenmesi riskini önlemek için kritik ürünleri inceleyip ikmal yapabilirsiniz.
                </p>
              </div>
            </div>

            {/* Quick Action Buttons: 1 Primary CTA + Secondary Outline Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setShowLowStockModal(true)}
                className="px-3.5 py-1.5 bg-danger-fill hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Kritik Ürünleri İncele & İkmal Et</span>
              </button>

              <button
                onClick={() => setActiveTab('products')}
                className="px-3 py-1.5 bg-base-surface hover:bg-base-surface-2 text-text-primary border border-border rounded-xl text-xs font-semibold transition-colors cursor-pointer active:scale-[0.98]"
              >
                <span>Ürün Tablosunda Aç</span>
              </button>

              <button
                onClick={handleTriggerLowStockAlarm}
                disabled={isCheckingLowStock}
                className="px-3 py-1.5 bg-base-surface hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border border-border rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                title="Sisteme yeni bildirim alarmı fırlat"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>{isCheckingLowStock ? 'Taranıyor...' : 'Alarm Bildirimi'}</span>
              </button>
            </div>
          </div>

          {/* Quick Preview Chips of Top Low Stock Products */}
          <div className="pt-2 border-t border-danger-border/30 flex items-center gap-2 overflow-x-auto custom-scrollbar text-xs">
            <span className="text-text-muted font-bold text-[11px] shrink-0">En Kritikler:</span>
            {lowStockProducts.slice(0, 8).map(p => (
              <div key={p.id} className="flex items-center space-x-1.5 bg-base-surface px-2.5 py-1 rounded-lg border border-border shrink-0 shadow-2xs">
                <span className="font-semibold text-text-primary truncate max-w-[140px]">{p.name}</span>
                <span className="font-mono font-bold text-danger-text bg-bg-danger px-1.5 py-0.5 rounded text-[10px] border border-danger-border">
                  {p.stock} {p.unit}
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickRestock(p, 50)}
                  disabled={restockLoadingId === p.id}
                  className="text-[10px] font-bold text-success-text bg-bg-success hover:opacity-90 px-1.5 py-0.5 rounded transition-colors cursor-pointer border border-success-border active:scale-[0.95]"
                  title="+50 Adet Hızlı İkmal"
                >
                  {restockLoadingId === p.id ? '...' : '+50'}
                </button>
              </div>
            ))}
            {lowStockProducts.length > 8 && (
              <button 
                onClick={() => setShowLowStockModal(true)}
                className="text-danger-text font-bold text-[11px] hover:underline shrink-0 cursor-pointer"
              >
                +{lowStockProducts.length - 8} ürün daha ➔
              </button>
            )}
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {lowStockFeedback && (
        <div className="p-3 bg-bg-success border border-success-border text-success-text rounded-xl text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-success-text shrink-0" />
            <span>{lowStockFeedback}</span>
          </div>
          <button onClick={() => setLowStockFeedback(null)} className="text-success-text font-bold hover:underline cursor-pointer">
            Kapat
          </button>
        </div>
      )}

      {/* Sektörel Hızlı Aksiyon & Entegrasyon Masası (Dengelenmiş 4x3 Modül Mimarisi) */}
      <div className="bg-base-surface p-3.5 sm:p-4 rounded-2xl border border-border shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green"></span>
            </span>
            <span className="text-xs font-black text-text-primary uppercase tracking-wider">
              ALPHA HIZLI OPERASYON MASASI
            </span>
          </div>
          
          {/* Compact module summary + toggle */}
          <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
            <span className="text-text-muted font-medium">Satış, finans, stok ve operasyon modülleri</span>
            <button
              type="button"
              onClick={() => setShowOperasyonMasasi(v => !v)}
              aria-expanded={showOperasyonMasasi}
              className="ml-auto px-2.5 py-0.5 rounded-md bg-base-surface-2 border border-border text-text-muted hover:text-text-primary hover:bg-base-surface transition-colors cursor-pointer flex items-center space-x-1 text-[10px] font-bold"
            >
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showOperasyonMasasi ? 'rotate-180' : ''}`} />
              <span>{showOperasyonMasasi ? 'Gizle' : 'Göster'}</span>
            </button>
          </div>
        </div>

        <div className={`${showOperasyonMasasi ? 'grid' : 'hidden'} grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3`}>

          {/* GRUP 1: SATIŞ & SİPARİŞ — günlük en çok kullanılanlar */}
          <div className="p-2.5 rounded-xl bg-base-surface-2 border border-border space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-category-sales-text flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-blue" />
                <span>Satış & Sipariş</span>
              </span>
              <span className="text-[10px] text-text-muted font-medium">4 Modül</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {/* Siparişler */}
              <button
                onClick={() => setActiveTab('orders')}
                className="p-2 rounded-lg bg-base-surface hover:bg-category-sales-bg/30 border border-border hover:border-category-sales-border flex items-center space-x-2 transition-all cursor-pointer group text-left shadow-2xs active:scale-[0.98]"
              >
                <div className="p-1.5 rounded-lg bg-category-sales-bg text-category-sales-text group-hover:scale-105 transition-transform shrink-0 border border-category-sales-border/40">
                  <ShoppingBag className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-text-primary group-hover:text-category-sales-text flex items-center gap-1.5">
                    Siparişler
                    {pendingOrdersCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-warning-fill/20 text-warning-text text-[10px] font-bold">{pendingOrdersCount}</span>}
                  </div>
                  <div className="text-[10px] text-text-muted truncate">Onay & Takip</div>
                </div>
              </button>

              {/* POS Kasa */}
              <button
                onClick={() => setShowPosModal(true)}
                className="p-2 rounded-lg bg-base-surface hover:bg-category-sales-bg/30 border border-border hover:border-category-sales-border flex items-center space-x-2 transition-all cursor-pointer group text-left shadow-2xs active:scale-[0.98]"
              >
                <div className="p-1.5 rounded-lg bg-category-sales-bg text-category-sales-text group-hover:scale-105 transition-transform shrink-0 border border-category-sales-border/40">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-text-primary group-hover:text-category-sales-text truncate">POS Kasa</div>
                  <div className="text-[10px] text-text-muted truncate">Hızlı Satış & Barkod</div>
                </div>
              </button>

              {/* Teklifler */}
              <button
                onClick={() => setActiveTab('quotes')}
                className="p-2 rounded-lg bg-base-surface hover:bg-category-sales-bg/30 border border-border hover:border-category-sales-border flex items-center space-x-2 transition-all cursor-pointer group text-left shadow-2xs active:scale-[0.98]"
              >
                <div className="p-1.5 rounded-lg bg-category-sales-bg text-category-sales-text group-hover:scale-105 transition-transform shrink-0 border border-category-sales-border/40">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-text-primary group-hover:text-category-sales-text flex items-center gap-1.5">
                    Teklifler
                    {pendingQuotesCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-warning-fill/20 text-warning-text text-[10px] font-bold">{pendingQuotesCount}</span>}
                  </div>
                  <div className="text-[10px] text-text-muted truncate">Fiyatlandırma & Onay</div>
                </div>
              </button>

              {/* Cariler */}
              <button
                onClick={() => setActiveTab('cariler')}
                className="p-2 rounded-lg bg-base-surface hover:bg-category-sales-bg/30 border border-border hover:border-category-sales-border flex items-center space-x-2 transition-all cursor-pointer group text-left shadow-2xs active:scale-[0.98]"
              >
                <div className="p-1.5 rounded-lg bg-category-sales-bg text-category-sales-text group-hover:scale-105 transition-transform shrink-0 border border-category-sales-border/40">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-text-primary group-hover:text-category-sales-text truncate">Cariler</div>
                  <div className="text-[10px] text-text-muted truncate">Bayi & Müşteri Hesapları</div>
                </div>
              </button>
            </div>
          </div>

          {/* GRUP 2: FİNANS & ÖDEME */}
          <div className="p-2.5 rounded-xl bg-base-surface-2 border border-border space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-category-inventory-text flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-green" />
                <span>Finans & Ödeme</span>
              </span>
              <span className="text-[10px] text-text-muted font-medium">4 Modül</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {/* Kasa Defteri */}
              <button
                onClick={() => setActiveTab('kasa')}
                className="p-2 rounded-lg bg-base-surface hover:bg-category-inventory-bg/30 border border-border hover:border-category-inventory-border flex items-center space-x-2 transition-all cursor-pointer group text-left shadow-2xs active:scale-[0.98]"
              >
                <div className="p-1.5 rounded-lg bg-category-inventory-bg text-category-inventory-text group-hover:scale-105 transition-transform shrink-0 border border-category-inventory-border/40">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-text-primary group-hover:text-category-inventory-text truncate">Kasa Defteri</div>
                  <div className="text-[10px] text-text-muted truncate">Giriş / Çıkış & Bakiye</div>
                </div>
              </button>

              {/* E-Fatura */}
              <button
                id="card-quick-einvoice"
                onClick={() => setActiveTab('invoices')}
                className="p-2 rounded-lg bg-base-surface hover:bg-category-inventory-bg/30 border border-border hover:border-category-inventory-border flex items-center space-x-2 transition-all cursor-pointer group text-left shadow-2xs active:scale-[0.98]"
              >
                <div className="p-1.5 rounded-lg bg-category-inventory-bg text-category-inventory-text group-hover:scale-105 transition-transform shrink-0 border border-category-inventory-border/40">
                  <Receipt className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-text-primary group-hover:text-category-inventory-text truncate">E-Fatura & GİB</div>
                  <div className="text-[10px] text-text-muted truncate">UBL-TR 2.1 & Arşiv</div>
                </div>
              </button>

              {/* Dekont Onay */}
              <button
                onClick={() => setShowReceiptVerificationModal(true)}
                className="p-2 rounded-lg bg-base-surface hover:bg-category-inventory-bg/30 border border-border hover:border-category-inventory-border flex items-center space-x-2 transition-all cursor-pointer group text-left shadow-2xs active:scale-[0.98]"
              >
                <div className="p-1.5 rounded-lg bg-category-inventory-bg text-category-inventory-text group-hover:scale-105 transition-transform shrink-0 border border-category-inventory-border/40">
                  <Banknote className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-text-primary group-hover:text-category-inventory-text truncate">Dekont Onay</div>
                  <div className="text-[10px] text-text-muted truncate">Havale / EFT Eşleme</div>
                </div>
              </button>

              {/* Çek / Senet */}
              <button
                onClick={() => setActiveTab('cek-senet')}
                className="p-2 rounded-lg bg-base-surface hover:bg-category-inventory-bg/30 border border-border hover:border-category-inventory-border flex items-center space-x-2 transition-all cursor-pointer group text-left shadow-2xs active:scale-[0.98]"
              >
                <div className="p-1.5 rounded-lg bg-category-inventory-bg text-category-inventory-text group-hover:scale-105 transition-transform shrink-0 border border-category-inventory-border/40">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-text-primary group-hover:text-category-inventory-text truncate">Çek / Senet</div>
                  <div className="text-[10px] text-text-muted truncate">Vade & Tahsilat Takibi</div>
                </div>
              </button>
            </div>
          </div>

          {/* GRUP 3: STOK & RAPORLAR */}
          <div className="p-2.5 rounded-xl bg-base-surface-2 border border-border space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-category-logistics-text flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-amber" />
                <span>Stok & Raporlar</span>
              </span>
              <span className="text-[10px] text-text-muted font-medium">4 Modül</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {/* Ürün & Stok */}
              <button
                onClick={() => setActiveTab('products')}
                className="p-2 rounded-lg bg-base-surface hover:bg-category-logistics-bg/30 border border-border hover:border-category-logistics-border flex items-center space-x-2 transition-all cursor-pointer group text-left shadow-2xs active:scale-[0.98]"
              >
                <div className="p-1.5 rounded-lg bg-category-logistics-bg text-category-logistics-text group-hover:scale-105 transition-transform shrink-0 border border-category-logistics-border/40">
                  <Package className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-text-primary group-hover:text-category-logistics-text truncate">Ürün & Stok</div>
                  <div className="text-[10px] text-text-muted truncate">Katalog & Fiyat</div>
                </div>
              </button>

              {/* Satış Trendi */}
              <button
                onClick={() => setActiveTab('analytics')}
                className="p-2 rounded-lg bg-base-surface hover:bg-category-logistics-bg/30 border border-border hover:border-category-logistics-border flex items-center space-x-2 transition-all cursor-pointer group text-left shadow-2xs active:scale-[0.98]"
              >
                <div className="p-1.5 rounded-lg bg-category-logistics-bg text-category-logistics-text group-hover:scale-105 transition-transform shrink-0 border border-category-logistics-border/40">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-text-primary group-hover:text-category-logistics-text truncate">Satış Trendi</div>
                  <div className="text-[10px] text-text-muted truncate">Kategori Performans</div>
                </div>
              </button>

              {/* Kâr / Zarar */}
              <button
                onClick={() => setActiveTab('kar-zarar')}
                className="p-2 rounded-lg bg-base-surface hover:bg-category-logistics-bg/30 border border-border hover:border-category-logistics-border flex items-center space-x-2 transition-all cursor-pointer group text-left shadow-2xs active:scale-[0.98]"
              >
                <div className="p-1.5 rounded-lg bg-category-logistics-bg text-category-logistics-text group-hover:scale-105 transition-transform shrink-0 border border-category-logistics-border/40">
                  <BarChart3 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-text-primary group-hover:text-category-logistics-text truncate">Kâr / Zarar</div>
                  <div className="text-[10px] text-text-muted truncate">Dönem Raporu</div>
                </div>
              </button>

              {/* Ürün Kâr Marjı */}
              <button
                onClick={() => setActiveTab('urun-kar')}
                className="p-2 rounded-lg bg-base-surface hover:bg-category-logistics-bg/30 border border-border hover:border-category-logistics-border flex items-center space-x-2 transition-all cursor-pointer group text-left shadow-2xs active:scale-[0.98]"
              >
                <div className="p-1.5 rounded-lg bg-category-logistics-bg text-category-logistics-text group-hover:scale-105 transition-transform shrink-0 border border-category-logistics-border/40">
                  <Percent className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-text-primary group-hover:text-category-logistics-text truncate">Ürün Kâr Marjı</div>
                  <div className="text-[10px] text-text-muted truncate">SKU Karlılık Analizi</div>
                </div>
              </button>
            </div>
          </div>

          {/* GRUP 4: OPERASYon & YÖNETİM */}
          <div className="p-2.5 rounded-xl bg-base-surface-2 border border-border space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-category-system-text flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-red" />
                <span>Operasyon & Yönetim</span>
              </span>
              <span className="text-[10px] text-text-muted font-medium">2 Modül</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {/* Şoför Sevkiyat */}
              <button
                onClick={() => setActiveTab('ops-dispatch')}
                className="p-2 rounded-lg bg-base-surface hover:bg-category-system-bg/30 border border-border hover:border-category-system-border flex items-center space-x-2 transition-all cursor-pointer group text-left shadow-2xs active:scale-[0.98]"
              >
                <div className="p-1.5 rounded-lg bg-category-system-bg text-category-system-text group-hover:scale-105 transition-transform shrink-0 border border-category-system-border/40">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-text-primary group-hover:text-category-system-text truncate">Şoför Sevkiyat</div>
                  <div className="text-[10px] text-text-muted truncate">Rota & Harita</div>
                </div>
              </button>

              {/* WMS Toplama */}
              <button
                onClick={() => { setSelectedOrderForPicking(null); setShowPickingInspectionModal(true); }}
                className="p-2 rounded-lg bg-base-surface hover:bg-category-system-bg/30 border border-border hover:border-category-system-border flex items-center space-x-2 transition-all cursor-pointer group text-left shadow-2xs active:scale-[0.98]"
              >
                <div className="p-1.5 rounded-lg bg-category-system-bg text-category-system-text group-hover:scale-105 transition-transform shrink-0 border border-category-system-border/40">
                  <Barcode className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-text-primary group-hover:text-category-system-text truncate">WMS Toplama</div>
                  <div className="text-[10px] text-text-muted truncate">Depo & Barkod</div>
                </div>
              </button>

            </div>
          </div>

        </div>
      </div>
        </div>
      )}
      {/* Admin navigation lives in the left sidebar. Keep workspace content focused. */}
      {false && <>
      <div className="bg-base-surface/95 backdrop-blur-sm p-2.5 sm:p-3 rounded-[1.35rem] border border-slate-200/80 shadow-[0_12px_35px_-24px_rgba(15,23,42,0.55)] space-y-2.5 lg:sticky lg:top-3 lg:z-20">

        {/* Satır 1: Ana navigasyon — en sık kullanılanlar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <button id="tab-admin-home" onClick={() => setActiveTab('home')}
            className={`flex items-center justify-between gap-2 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer border ${(activeTab as string) === 'home' ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 border-brand-500/30 shadow-xs ring-1 ring-brand-500/30' : 'bg-base-surface-2/60 hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'}`}>
            <div className="flex items-center space-x-2 min-w-0">
              <LayoutDashboard className={`w-4 h-4 shrink-0 ${(activeTab as string) === 'home' ? 'text-brand-500' : 'text-text-secondary'}`} />
              <span className="truncate">Ana Masa</span>
            </div>
          </button>

          <button id="tab-admin-pos" onClick={() => setActiveTab('pos')}
            className={`flex items-center justify-between gap-2 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer border ${activeTab === 'pos' ? 'bg-category-sales-bg text-category-sales-text border-category-sales-border shadow-xs ring-1 ring-category-sales-border' : 'bg-base-surface-2/60 hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'}`}>
            <div className="flex items-center space-x-2 min-w-0">
              <CreditCard className={`w-4 h-4 shrink-0 ${activeTab === 'pos' ? 'text-category-sales-text' : 'text-text-secondary'}`} />
              <span className="truncate">Satış</span>
            </div>
          </button>

          <button id="tab-admin-orders" onClick={() => setActiveTab('orders')}
            className={`flex items-center justify-between gap-2 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer border ${activeTab === 'orders' ? 'bg-bg-success text-success-text border-success-border shadow-xs ring-1 ring-success-border' : 'bg-base-surface-2/60 hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'}`}>
            <div className="flex items-center space-x-2 min-w-0">
              <ShoppingBag className={`w-4 h-4 shrink-0 ${activeTab === 'orders' ? 'text-success-text' : 'text-text-secondary'}`} />
              <span className="truncate">Siparişler</span>
            </div>
            <div className="flex items-center space-x-1 shrink-0 ml-1">
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${activeTab === 'orders' ? 'bg-success-fill/20 text-success-text' : 'bg-base-surface text-text-muted border border-border/50'}`}>{orders.length}</span>
              {pendingOrdersCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-warning-fill text-base text-[9px] font-extrabold animate-pulse">{pendingOrdersCount}</span>}
            </div>
          </button>

          <button id="tab-admin-quotes" onClick={() => setActiveTab('quotes')}
            className={`flex items-center justify-between gap-2 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer border ${activeTab === 'quotes' ? 'bg-bg-warning text-warning-text border-warning-border shadow-xs ring-1 ring-warning-border' : 'bg-base-surface-2/60 hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'}`}>
            <div className="flex items-center space-x-2 min-w-0">
              <FileText className={`w-4 h-4 shrink-0 ${activeTab === 'quotes' ? 'text-warning-text' : 'text-text-secondary'}`} />
              <span className="truncate">Teklif Masası</span>
            </div>
            <div className="flex items-center space-x-1 shrink-0 ml-1">
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${activeTab === 'quotes' ? 'bg-warning-fill/20 text-warning-text' : 'bg-base-surface text-text-muted border border-border/50'}`}>{quotes.length}</span>
              {pendingQuotesCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-danger-fill text-base text-[9px] font-extrabold animate-pulse">{pendingQuotesCount}</span>}
            </div>
          </button>

          <button id="tab-admin-products" onClick={() => setActiveTab('products')}
            className={`flex items-center justify-between gap-2 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer border ${activeTab === 'products' ? 'bg-base-surface text-text-primary border-border-strong shadow-xs ring-1 ring-border-strong' : 'bg-base-surface-2/60 hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'}`}>
            <div className="flex items-center space-x-2 min-w-0">
              <Package className={`w-4 h-4 shrink-0 ${activeTab === 'products' ? 'text-text-primary' : 'text-text-secondary'}`} />
              <span className="truncate">Ürün & Stok</span>
            </div>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ml-1 ${activeTab === 'products' ? 'bg-base-surface-2 text-text-primary border border-border' : 'bg-base-surface text-text-muted border border-border/50'}`}>{products.length}</span>
          </button>

          <button id="tab-admin-cariler" onClick={() => setActiveTab('cariler')}
            className={`flex items-center justify-between gap-2 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer border ${activeTab === 'cariler' ? 'bg-bg-info text-info-text border-info-border shadow-xs ring-1 ring-info-border' : 'bg-base-surface-2/60 hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'}`}>
            <div className="flex items-center space-x-2 min-w-0">
              <Users className={`w-4 h-4 shrink-0 ${activeTab === 'cariler' ? 'text-info-text' : 'text-text-secondary'}`} />
              <span className="truncate">Cariler</span>
            </div>
          </button>

          <button id="tab-admin-kasa-primary" onClick={() => setActiveTab('kasa')}
            className={`flex items-center justify-between gap-2 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer border ${(activeTab as string) === 'kasa' ? 'bg-success-fill/15 text-success-text border-success-border shadow-xs ring-1 ring-success-border' : 'bg-base-surface-2/60 hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'}`}>
            <div className="flex items-center space-x-2 min-w-0">
              <Wallet className={`w-4 h-4 shrink-0 ${(activeTab as string) === 'kasa' ? 'text-success-text' : 'text-text-secondary'}`} />
              <span className="truncate">Kasa/Banka</span>
            </div>
          </button>

        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
          <div className="flex items-center gap-2 text-[11px] text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
            <span>Alış, fatura, rapor ve ayarlar</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAdminNavDetails(value => !value)}
            aria-expanded={showAdminNavDetails}
            className="min-h-[44px] px-3 rounded-xl border border-border bg-base-surface-2 text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-base-surface transition-colors active:scale-[0.98] flex items-center gap-1.5"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdminNavDetails ? 'rotate-180' : ''}`} />
            <span>{showAdminNavDetails ? 'Modülleri gizle' : 'Diğer modüller'}</span>
          </button>
        </div>

        {/* İkincil modüller: tek bilgi mimarisi, varsayılan kapalı */}
        <div className={`${showAdminNavDetails ? 'grid' : 'hidden'} grid-cols-1 sm:grid-cols-3 gap-2.5`}>

          {/* FİNANS */}
          <div className="p-2.5 rounded-xl bg-base-surface-2 border border-border space-y-1.5">
            <div className="flex items-center space-x-1.5 px-0.5 pb-0.5 border-b border-border/60">
              <span className="w-2 h-2 rounded-full bg-success-fill shrink-0" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-success-text">Finans</span>
            </div>
            <button id="tab-admin-gider" onClick={() => setActiveTab('gider')}
              className={`w-full flex items-center gap-2 px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer border ${(activeTab as string) === 'gider' ? 'bg-danger-fill/15 text-danger-text border-danger-border' : 'bg-base-surface hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'}`}>
              <TrendingUp className={`w-3.5 h-3.5 shrink-0 rotate-180 ${(activeTab as string) === 'gider' ? 'text-danger-text' : 'text-text-muted'}`} />
              Gider Takip
            </button>
            <button id="tab-admin-cek-senet" onClick={() => setActiveTab('cek-senet')}
              className={`w-full flex items-center gap-2 px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer border ${(activeTab as string) === 'cek-senet' ? 'bg-info-fill/15 text-info-text border-info-border' : 'bg-base-surface hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'}`}>
              <Banknote className={`w-3.5 h-3.5 shrink-0 ${(activeTab as string) === 'cek-senet' ? 'text-info-text' : 'text-text-muted'}`} />
              Çek / Senet
            </button>
            <button id="tab-admin-kasa" onClick={() => setActiveTab('kasa')}
              className={`w-full flex items-center gap-2 px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer border ${(activeTab as string) === 'kasa' ? 'bg-success-fill/15 text-success-text border-success-border' : 'bg-base-surface hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'}`}>
              <Wallet className={`w-3.5 h-3.5 shrink-0 ${(activeTab as string) === 'kasa' ? 'text-success-text' : 'text-text-muted'}`} />
              Kasa Defteri
            </button>
            <button id="tab-admin-invoices" onClick={() => setActiveTab('invoices')}
              className={`w-full flex items-center gap-2 px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer border ${activeTab === 'invoices' ? 'bg-danger-fill/15 text-danger-text border-danger-border' : 'bg-base-surface hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'}`}>
              <Receipt className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'invoices' ? 'text-danger-text' : 'text-text-muted'}`} />
              E-Fatura
            </button>
          </div>

          {/* RAPORLAR */}
          <div className="p-2.5 rounded-xl bg-base-surface-2 border border-border space-y-1.5">
            <div className="flex items-center space-x-1.5 px-0.5 pb-0.5 border-b border-border/60">
              <span className="w-2 h-2 rounded-full bg-info-fill shrink-0" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-info-text">Raporlar</span>
            </div>
            <button id="tab-admin-kar-zarar" onClick={() => setActiveTab('kar-zarar')}
              className={`w-full flex items-center gap-2 px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer border ${(activeTab as string) === 'kar-zarar' ? 'bg-success-fill/15 text-success-text border-success-border' : 'bg-base-surface hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'}`}>
              <TrendingUp className={`w-3.5 h-3.5 shrink-0 ${(activeTab as string) === 'kar-zarar' ? 'text-success-text' : 'text-text-muted'}`} />
              Kâr / Zarar
            </button>
            <button id="tab-admin-kdv-ozet" onClick={() => setActiveTab('kdv-ozet')}
              className={`w-full flex items-center gap-2 px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer border ${(activeTab as string) === 'kdv-ozet' ? 'bg-info-fill/15 text-info-text border-info-border' : 'bg-base-surface hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'}`}>
              <Receipt className={`w-3.5 h-3.5 shrink-0 ${(activeTab as string) === 'kdv-ozet' ? 'text-info-text' : 'text-text-muted'}`} />
              KDV Özeti
            </button>
            <button id="tab-admin-urun-kar" onClick={() => setActiveTab('urun-kar')}
              className={`w-full flex items-center gap-2 px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer border ${(activeTab as string) === 'urun-kar' ? 'bg-success-fill/15 text-success-text border-success-border' : 'bg-base-surface hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'}`}>
              <Percent className={`w-3.5 h-3.5 shrink-0 ${(activeTab as string) === 'urun-kar' ? 'text-success-text' : 'text-text-muted'}`} />
              Ürün Kâr Marjı
            </button>
            <button id="tab-admin-analytics" onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-2 px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer border ${activeTab === 'analytics' ? 'bg-bg-success text-success-text border-success-border' : 'bg-base-surface hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'}`}>
              <BarChart3 className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'analytics' ? 'text-success-text' : 'text-text-muted'}`} />
              Satış Trendi
            </button>
          </div>

          {/* SATIN ALMA */}
          <div className="p-2.5 rounded-xl bg-base-surface-2 border border-border space-y-1.5">
            <div className="flex items-center space-x-1.5 px-0.5 pb-0.5 border-b border-border/60">
              <span className="w-2 h-2 rounded-full bg-warning-fill shrink-0" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-warning-text">Satın Alma</span>
            </div>
            <button id="tab-admin-alis-faturalari" onClick={() => setActiveTab('alis-faturalari')}
              className={`w-full flex items-center gap-2 px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer border ${(activeTab as string) === 'alis-faturalari' ? 'bg-warning-fill/15 text-warning-text border-warning-border' : 'bg-base-surface hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'}`}>
              <Package className={`w-3.5 h-3.5 shrink-0 ${(activeTab as string) === 'alis-faturalari' ? 'text-warning-text' : 'text-text-muted'}`} />
              Alış Faturası
            </button>
            <button id="tab-admin-tedarikci-ekstresi" onClick={() => setActiveTab('tedarikci-ekstresi')}
              className={`w-full flex items-center gap-2 px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer border ${(activeTab as string) === 'tedarikci-ekstresi' ? 'bg-warning-fill/15 text-warning-text border-warning-border' : 'bg-base-surface hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'}`}>
              <Building2 className={`w-3.5 h-3.5 shrink-0 ${(activeTab as string) === 'tedarikci-ekstresi' ? 'text-warning-text' : 'text-text-muted'}`} />
              Tedarikçi Ekstre
            </button>
            <button id="tab-admin-settings" onClick={() => { setEnterpriseSuiteTab('identity'); setShowEnterpriseSuite(true); }}
              className="w-full flex items-center gap-2 px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer border bg-base-surface hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40">
              <Settings2 className="w-3.5 h-3.5 shrink-0 text-text-muted" />
              Ayarlar
            </button>
            {import.meta.env.DEV && <>
              <button id="tab-admin-diagnostics" onClick={() => handleCardNavigate('diagnostics', 'diagnostics')}
                className={`w-full flex items-center gap-2 px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer border ${activeTab === 'settings' && settingsSection === 'system' && systemSettingsTab === 'health' ? 'bg-bg-info text-info-text border-info-border' : 'bg-base-surface hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'}`}>
                <Activity className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'settings' && settingsSection === 'system' && systemSettingsTab === 'health' ? 'text-info-text animate-pulse' : 'text-text-muted'}`} />
                Sistem Tanı
                <span className="ml-auto w-2 h-2 rounded-full bg-success-fill animate-pulse" />
              </button>
              <button id="tab-admin-errors" onClick={() => handleCardNavigate('errors', 'errors')}
                className={`w-full flex items-center gap-2 px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer border ${activeTab === 'settings' && settingsSection === 'system' && systemSettingsTab === 'errors' ? 'bg-bg-danger text-danger-text border-danger-border' : 'bg-base-surface hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'}`}>
                <Bug className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'settings' && settingsSection === 'system' && systemSettingsTab === 'errors' ? 'text-danger-text animate-pulse' : 'text-text-muted'}`} />
                Hata & Tanı
                <span className="ml-auto px-1 py-0.5 rounded text-[9px] font-bold bg-danger-fill/20 text-danger-text">DEV</span>
              </button>
            </>}
          </div>

        </div>
      </div>

      </>}
      {/* ACTIVE TAB CONTENT VIEW WRAPPER WITH SMOOTH SCROLL TARGET AND HIGHLIGHT */}
      <div 
        ref={contentSectionRef} 
        id="admin-active-content-section" 
        className={`transition-all duration-500 rounded-3xl ${
          highlightSection 
            ? 'ring-4 ring-offset-4 ring-offset-base ring-border-strong p-1 sm:p-2 bg-base-surface/30' 
            : ''
        }`}
      >
        {activeTab === 'settings' && (
          <section className="admin-settings-workspace space-y-5 animate-in fade-in">
            <header className="rounded-3xl border border-border bg-base-surface p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-600">Sistem Yönetimi</p>
                  <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary">Ayarlar Merkezi</h1>
                  <p className="mt-1 max-w-2xl text-sm text-text-secondary">Şirket yapısı, finansal tanımlar, marka deneyimi ve kullanıcı yetkilerini tek çalışma alanından yönetin.</p>
                </div>
                <nav className="admin-settings-primary-tabs" aria-label="Ayarlar bölümleri">
                  <button type="button" aria-current={settingsSection === 'company' ? 'page' : undefined} onClick={() => setSettingsSection('company')}>
                    <Building2 className="h-4 w-4" />
                    Firma Ayarları
                  </button>
                  <button type="button" aria-current={settingsSection === 'users' ? 'page' : undefined} onClick={() => setSettingsSection('users')}>
                    <ShieldCheck className="h-4 w-4" />
                    Kullanıcı &amp; Roller
                  </button>
                  <button type="button" aria-current={settingsSection === 'system' ? 'page' : undefined} onClick={() => setSettingsSection('system')}>
                    <Activity className="h-4 w-4" />
                    Sistem &amp; Güvenlik
                  </button>
                </nav>
              </div>
            </header>

            {settingsSection === 'company' ? (
              <AlphaEnterpriseSuiteModal
                isOpen
                displayMode="page"
                onClose={() => {}}
                currentTheme={theme || 'dark'}
                onThemeChange={(nextTheme) => onToggleTheme?.(nextTheme)}
                initialTab="identity"
              />
            ) : settingsSection === 'users' ? (
              <UserManagementModal isOpen displayMode="page" onClose={() => {}} />
            ) : (
              <div className="space-y-4">
                <nav className="admin-settings-system-tabs" aria-label="Sistem ve güvenlik araçları">
                  <button type="button" aria-current={systemSettingsTab === 'health' ? 'page' : undefined} onClick={() => setSystemSettingsTab('health')}>Sistem Sağlığı</button>
                  {import.meta.env.DEV && <button type="button" aria-current={systemSettingsTab === 'errors' ? 'page' : undefined} onClick={() => setSystemSettingsTab('errors')}>Hata Kayıtları</button>}
                </nav>
                {systemSettingsTab === 'health' ? (
                  <SystemDiagnosticsDashboard products={products} orders={orders} quotes={quotes} onRefresh={onRefresh} />
                ) : import.meta.env.DEV ? (
                  <ErrorDiagnosticsCenter onRefresh={onRefresh} />
                ) : null}
              </div>
            )}
          </section>
        )}

        {(['ops-dispatch', 'ops-drivers', 'ops-sales', 'ops-wms', 'ops-delivery'] as string[]).includes(activeTab as string) && (
          <section className="admin-operation-page space-y-4">
                        <DriverDispatchRouteModal
              isOpen
              displayMode="page"
              onClose={() => {}}
              orders={orders}
              initialTab={activeTab === 'ops-wms' ? 'preparation' : activeTab === 'ops-delivery' ? 'map' : 'dispatch'}
              onMarkOrdersShipped={handleMarkOrdersShipped}
            />
          </section>
        )}

        {(['kasa', 'gider', 'cek-senet'] as string[]).includes(activeTab as string) && (
          <section className="finance-workspace mb-4 rounded-3xl border border-border bg-base-surface p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-success-border bg-success-fill/15 text-success-text">
                  {activeTab === 'cariler' ? <Users className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-success-text">Finans çalışma alanı</p>
                  <h2 className="truncate text-lg font-extrabold tracking-tight text-text-primary">
                    {activeTab === 'cariler' ? 'Cari hesaplar ve risk görünümü' : activeTab === 'kasa' ? 'Kasa hareketleri ve nakit akışı' : activeTab === 'gider' ? 'Gider takip merkezi' : 'Çek ve senet takip merkezi'}
                  </h2>
                  <p className="mt-0.5 text-xs text-text-secondary">Canlı kayıtlar, güvenli işlem akışı ve hızlı aksiyonlar.</p>
                </div>
              </div>
              <span className="inline-flex min-h-[32px] items-center self-start rounded-full border border-success-border bg-success-fill/10 px-3 text-[11px] font-bold text-success-text sm:self-auto">Canlı veri</span>
            </div>
            {activeTab === 'kasa' && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-success-border bg-success-fill/10 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-success-text">Finans akışı</p>
                  <p className="mt-1 text-xs text-text-secondary">Cari, kasa ve tahsilat kayıtları canlı senkronize.</p>
                </div>
                {COMPANY_BANK_ACCOUNTS.slice(0, 2).map((bank) => (
                  <div key={bank.id} className="rounded-2xl border border-border bg-base-surface-2/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-bold text-text-primary">{bank.bankName}</p>
                      <span className="rounded-full border border-success-border bg-success-fill/10 px-2 py-0.5 text-[10px] font-bold text-success-text">{bank.currency}</span>
                    </div>
                    <p className="mt-1 truncate font-mono text-[11px] tabular-nums text-text-secondary">{bank.iban}</p>
                    <p className="mt-1 text-[10px] text-text-muted">{bank.badgeText}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {highlightSection && (
          <div className="mb-3 px-4 py-2 rounded-2xl bg-base-surface-2 border border-border-strong text-xs font-bold text-text-primary flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-success-fill animate-pulse" />
              <span>
                {highlightSection === 'orders' && 'Sipariş Yönetimi Odaklandı'}
                {highlightSection === 'quotes' && 'Teklif Talepleri Masası Odaklandı'}
                {highlightSection === 'products' && 'Ürün Kataloğu & Fiyat Tablosu Odaklandı'}
                {highlightSection === 'cariler' && 'Cari Hesaplar & Finans Ekranı Odaklandı'}
                {highlightSection === 'invoices' && 'E-Fatura & E-Arşiv Masası Odaklandı'}
                {highlightSection === 'analytics' && 'Satış Trendi & Analiz Masası Odaklandı'}
                {highlightSection === 'diagnostics' && 'Sistem Tanı & Canlı Veri Odaklandı'}
                {highlightSection === 'errors' && 'Hata Tespit & Fix It Merkezi Odaklandı'}
              </span>
            </div>
            <span className="text-[11px] text-text-muted font-normal">Otomatik Kaydırıldı</span>
          </div>
        )}

        {/* TAB 0: POS TERMINALI */}
        {activeTab === 'pos' && (
          <div className="bg-base-surface p-6 sm:p-8 rounded-3xl border border-border shadow-sm text-center max-w-2xl mx-auto space-y-5 animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-category-sales-bg text-category-sales-text border border-category-sales-border flex items-center justify-center mx-auto shadow-sm">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">Hızlı Satış / POS Terminali</h2>
              <p className="text-xs text-text-secondary mt-1 max-w-md mx-auto">
                Barkod okutarak veya ürün seçerek hızlı perakende / toptan satış yapın. Kasa kayıtları anında sisteme işlenir.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPosModal(true)}
                className="w-full sm:w-auto px-6 py-3 bg-brand-blue hover:opacity-90 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Yeni Satış İşlemi Başlat</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCameraScannerModal(true)}
                className="w-full sm:w-auto px-5 py-3 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-xl text-sm font-semibold transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Kamera Barkod Okuyucu</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: ORDER MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-4 ui-tab-fade">
            <AdminModuleOverview
              mode="sales"
              orders={orders}
              quotes={quotes}
              products={products}
              onRefresh={onRefresh}
              onPrimaryAction={() => setShowPosModal(true)}
              onAlertAction={() => { setOrderStatusFilter('pending'); setOrderCurrentPage(1); }}
            />
            
            {/* Contextual Order Management Header & Action Toolbar */}
            <div className="bg-base-surface p-4 sm:p-5 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-xl bg-category-sales-bg text-category-sales-text border border-category-sales-border">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
                        <span>Gelen Siparişler & Sevkiyat Yönetimi</span>
                        <span className="px-2 py-0.5 rounded-full bg-base-surface-2 text-text-secondary text-xs font-mono font-bold border border-border">
                          {orders.length} Toplam Sipariş
                        </span>
                      </h2>
                      <p className="text-xs text-text-muted">
                        Canlı durum güncellemeleri, hızlı onay, irsaliye basımı ve müşteri bazlı sevkiyat takibi.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Top Quick Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Toggle All Accordions */}
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = (orders || []).map(o => o.id);
                      if (expandedOrderIds.size === allIds.length) {
                        setExpandedOrderIds(new Set());
                      } else {
                        setExpandedOrderIds(new Set(allIds));
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl border border-border bg-base-surface-2 hover:bg-base-surface text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                    title="Tüm siparişlerin detaylarını aç veya kapat"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{expandedOrderIds.size === orders.length && orders.length > 0 ? 'Tümünü Kapat' : 'Tümünü Aç'}</span>
                  </button>

                  {/* Sales Trend Chart Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowSalesTrendWidget(prev => !prev)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      showSalesTrendWidget
                        ? 'bg-bg-success text-success-text border-success-border shadow-2xs'
                        : 'bg-base-surface-2/60 text-text-secondary border-border hover:bg-base-surface-2'
                    }`}
                    title="Son 7 Günlük Satış Performans Trendi grafiğini aç/kapat"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>{showSalesTrendWidget ? 'Trend Grafiğini Gizle' : 'Satış Trendini Göster'}</span>
                  </button>
                </div>
              </div>

              {/* D3 7-Day Sales Performance Trend Chart Widget (Collapsible) */}
              {showSalesTrendWidget && (
                <div className="pt-2 border-t border-border/60">
                  <SalesPerformanceTrendChart
                    orders={orders}
                    products={products}
                    onSelectDate={(dateKey) => {
                      setSelectedTrendDate(prev => prev === dateKey ? null : dateKey);
                      setOrderCurrentPage(1);
                    }}
                  />
                </div>
              )}

              {/* Search, Customer Filter & Sort Controls Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-2 border-t border-border/60">
                
                {/* 1. Live Multi-Field Search */}
                <div className="lg:col-span-6 relative">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchFilter}
                    onChange={(e) => {
                      setSearchFilter(e.target.value);
                      setOrderCurrentPage(1);
                    }}
                    placeholder="Sipariş no, müşteri adı, firma, tel, adres veya ürün ara..."
                    className="w-full pl-9 pr-8 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-hidden focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
                      title="Aramayı temizle"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 2. Customer Dropdown Selector */}
                <div className="lg:col-span-3 relative">
                  <Users className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={selectedCustomerFilter}
                    onChange={(e) => {
                      setSelectedCustomerFilter(e.target.value);
                      setOrderCurrentPage(1);
                    }}
                    aria-label="Müşteri Seçimi"
                    className="w-full pl-9 pr-8 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary font-medium focus:outline-hidden focus:ring-1 focus:ring-brand-500 cursor-pointer appearance-none truncate"
                  >
                    <option value="all">👥 Tüm Müşteriler ({orders.length} Sipariş)</option>
                    {Array.from(new Set(orders.map(o => o.customerName).filter(Boolean)))
                      .map(name => {
                        const count = orders.filter(o => o.customerName === name).length;
                        return { name, count };
                      })
                      .sort((a, b) => b.count - a.count)
                      .map(({ name, count }) => (
                        <option key={name} value={name}>
                          {name} ({count} Sipariş)
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* 3. Sort Order Selector */}
                <div className="lg:col-span-3 relative">
                  <ArrowUpDown className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={orderSort}
                    onChange={(e) => setOrderSort(e.target.value as any)}
                    aria-label="Sipariş Sıralaması"
                    className="w-full pl-9 pr-8 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary font-medium focus:outline-hidden focus:ring-1 focus:ring-brand-500 cursor-pointer appearance-none truncate"
                  >
                    <option value="date_desc">⏱️ Tarih (Yeniden Eskiye)</option>
                    <option value="date_asc">⏱️ Tarih (Eskiden Yeniye)</option>
                    <option value="total_desc">💰 Tutar (Yüksekten Düşüğe)</option>
                    <option value="total_asc">💰 Tutar (Düşükten Yükseğe)</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

              </div>

              {/* Status Filter KPI Chips Bar */}
              {(() => {
                const counts = {
                  all: orders.length,
                  pending: orders.filter(o => o.status === 'pending').length,
                  approved: orders.filter(o => o.status === 'approved').length,
                  preparing: orders.filter(o => o.status === 'preparing').length,
                  shipped: orders.filter(o => o.status === 'shipped').length,
                  delivered: orders.filter(o => o.status === 'delivered').length,
                  cancelled: orders.filter(o => o.status === 'cancelled').length,
                  uncollected: orders.filter(o => o.status === 'delivered' && o.paymentStatus === 'pending_collection').length,
                };

                const statusChips = [
                  { 
                    key: 'all', 
                    label: 'Tüm Siparişler', 
                    count: counts.all, 
                    icon: ShoppingBag, 
                    activeClass: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 border-slate-900 dark:border-slate-100 shadow-sm font-extrabold',
                    inactiveClass: 'bg-base-surface-2 hover:bg-base-surface-3 text-text-secondary hover:text-text-primary border-border'
                  },
                  { 
                    key: 'pending', 
                    label: 'Bekleyen', 
                    count: counts.pending, 
                    icon: Clock, 
                    activeClass: 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm font-extrabold ring-1 ring-amber-500/50',
                    inactiveClass: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30'
                  },
                  { 
                    key: 'approved', 
                    label: 'Onaylandı', 
                    count: counts.approved, 
                    icon: CheckCircle2, 
                    activeClass: 'bg-emerald-600 text-white border-emerald-700 shadow-sm font-extrabold',
                    inactiveClass: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                  },
                  { 
                    key: 'preparing', 
                    label: 'Hazırlanıyor', 
                    count: counts.preparing, 
                    icon: Package, 
                    activeClass: 'bg-blue-600 text-white border-blue-700 shadow-sm font-extrabold',
                    inactiveClass: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-500/30'
                  },
                  { 
                    key: 'shipped', 
                    label: 'Sevkiyatta', 
                    count: counts.shipped, 
                    icon: Truck, 
                    activeClass: 'bg-slate-700 text-white border-slate-800 shadow-sm font-extrabold',
                    inactiveClass: 'bg-slate-500/10 hover:bg-slate-500/20 text-slate-800 dark:text-slate-300 border-slate-500/30'
                  },
                  { 
                    key: 'delivered', 
                    label: 'Teslim Edildi', 
                    count: counts.delivered, 
                    icon: CheckCircle2, 
                    activeClass: 'bg-teal-600 text-white border-teal-700 shadow-sm font-extrabold',
                    inactiveClass: 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-300 border-teal-500/30'
                  },
                  ...(counts.uncollected > 0 ? [{
                    key: 'uncollected',
                    label: '⚠️ Tahsilat Bekleyenler',
                    count: counts.uncollected,
                    icon: AlertTriangle,
                    activeClass: 'bg-rose-600 text-white border-rose-700 shadow-sm font-extrabold ring-1 ring-rose-500/50 animate-pulse',
                    inactiveClass: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/30'
                  }] : []),
                  { 
                    key: 'cancelled', 
                    label: 'İptal', 
                    count: counts.cancelled, 
                    icon: X, 
                    activeClass: 'bg-rose-600 text-white border-rose-700 shadow-sm font-extrabold',
                    inactiveClass: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/30'
                  },
                ];

                return (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar pt-1">
                    {statusChips.map((chip) => {
                      const isSelected = orderStatusFilter === chip.key;
                      const Icon = chip.icon;
                      return (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={() => {
                            setOrderStatusFilter(chip.key as any);
                            setOrderCurrentPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 border ${
                            isSelected ? chip.activeClass : chip.inactiveClass
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{chip.label}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                            isSelected 
                              ? chip.key === 'pending'
                                ? 'bg-slate-950/20 text-slate-950 font-bold'
                                : chip.key === 'all'
                                ? 'bg-white/20 dark:bg-slate-950/20 text-white dark:text-slate-950 font-bold'
                                : 'bg-white/20 text-white font-bold'
                              : 'bg-base-surface text-text-muted border border-border/50'
                          }`}>
                            {chip.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Active Filter Indicators Bar */}
              {(orderStatusFilter !== 'all' || selectedCustomerFilter !== 'all' || searchFilter.trim() || selectedTrendDate) && (
                <div className="flex items-center gap-2 flex-wrap text-xs text-text-muted pt-1">
                  <span>Aktif Filtreler:</span>
                  {orderStatusFilter !== 'all' && (
                    <span className="px-2 py-0.5 rounded-full bg-base-surface-2 border border-border font-medium flex items-center gap-1">
                      <span>Durum: {orderStatusFilter === 'uncollected' ? 'Tahsilat Bekleyenler' : orderStatusFilter}</span>
                      <button 
                        type="button" 
                        onClick={() => setOrderStatusFilter('all')}
                        className="hover:text-text-primary cursor-pointer ml-1"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedCustomerFilter !== 'all' && (
                    <span className="px-2 py-0.5 rounded-full bg-base-surface-2 border border-border font-medium flex items-center gap-1">
                      <span>Müşteri: {selectedCustomerFilter}</span>
                      <button 
                        type="button" 
                        onClick={() => setSelectedCustomerFilter('all')}
                        className="hover:text-text-primary cursor-pointer ml-1"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedTrendDate && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-600 dark:text-brand-400 font-medium flex items-center gap-1">
                      <span>Tarih: {selectedTrendDate}</span>
                      <button 
                        type="button" 
                        onClick={() => setSelectedTrendDate(null)}
                        className="hover:text-text-primary cursor-pointer ml-1"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {searchFilter.trim() && (
                    <span className="px-2 py-0.5 rounded-full bg-base-surface-2 border border-border font-medium flex items-center gap-1">
                      <span>Arama: "{searchFilter}"</span>
                      <button 
                        type="button" 
                        onClick={() => setSearchFilter('')}
                        className="hover:text-text-primary cursor-pointer ml-1"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setOrderStatusFilter('all');
                      setSelectedCustomerFilter('all');
                      setSearchFilter('');
                      setSelectedTrendDate(null);
                      setOrderCurrentPage(1);
                    }}
                    className="ml-auto text-brand-600 dark:text-brand-400 hover:underline font-bold text-[11px] cursor-pointer"
                  >
                    Tüm Filtreleri Temizle
                  </button>
                </div>
              )}

            </div>

            {/* Orders List & Pagination Calculation */}
            {(() => {
              const filteredOrders = (orders || []).filter(o => {
                if (orderStatusFilter === 'uncollected') {
                  if (!(o.status === 'delivered' && o.paymentStatus === 'pending_collection')) {
                    return false;
                  }
                } else if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) {
                  return false;
                }
                if (selectedCustomerFilter !== 'all' && o.customerName !== selectedCustomerFilter) {
                  return false;
                }
                if (selectedTrendDate) {
                  const oDate = new Date(o.createdAt).toISOString().split('T')[0];
                  if (oDate !== selectedTrendDate) return false;
                }
                if (searchFilter.trim()) {
                  const q = searchFilter.toLowerCase();
                  const matchNum = o.orderNumber.toLowerCase().includes(q);
                  const matchName = o.customerName.toLowerCase().includes(q);
                  const matchPhone = (o.customerPhone || '').toLowerCase().includes(q);
                  const matchAddr = (o.customerAddress || '').toLowerCase().includes(q);
                  const matchNotes = (o.notes || '').toLowerCase().includes(q);
                  const matchItems = (o.items || []).some(i => (i.productName || '').toLowerCase().includes(q));
                  if (!matchNum && !matchName && !matchPhone && !matchAddr && !matchNotes && !matchItems) return false;
                }
                return true;
              }).sort((a, b) => {
                if (orderSort === 'date_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                if (orderSort === 'total_desc') return (b.total || 0) - (a.total || 0);
                if (orderSort === 'total_asc') return (a.total || 0) - (b.total || 0);
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // date_desc default
              });

              if (filteredOrders.length === 0) {
                return (
                  <div className="p-12 text-center bg-base-surface rounded-2xl border border-border text-text-muted text-xs shadow-xs space-y-3">
                    <ShoppingBag className="w-12 h-12 mx-auto opacity-30 text-text-muted" />
                    <p className="font-bold text-sm text-text-primary">
                      {searchFilter || selectedCustomerFilter !== 'all' || orderStatusFilter !== 'all' || selectedTrendDate
                        ? 'Filtreleme kriterlerine uygun sipariş bulunamadı.'
                        : 'Henüz gelen sipariş bulunmuyor.'}
                    </p>
                    <p className="text-xs text-text-secondary max-w-sm mx-auto">
                      Arama terimini değiştirin veya aktif durum/müşteri filtrelerini sıfırlayın.
                    </p>
                    {(searchFilter || selectedCustomerFilter !== 'all' || orderStatusFilter !== 'all' || selectedTrendDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setOrderStatusFilter('all');
                          setSelectedCustomerFilter('all');
                          setSearchFilter('');
                          setSelectedTrendDate(null);
                          setOrderCurrentPage(1);
                        }}
                        className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                      >
                        Filtreleri Temizle
                      </button>
                    )}
                  </div>
                );
              }

              // Pagination slice
              const totalItems = filteredOrders.length;
              const totalPages = Math.max(1, Math.ceil(totalItems / orderPageSize));
              const safeCurrentPage = Math.min(Math.max(1, orderCurrentPage), totalPages);
              const paginatedOrders = filteredOrders.slice(
                (safeCurrentPage - 1) * orderPageSize,
                safeCurrentPage * orderPageSize
              );

              const handleToggleExpand = (orderId: string) => {
                setExpandedOrderIds(prev => {
                  const next = new Set(prev);
                  if (next.has(orderId)) next.delete(orderId);
                  else next.add(orderId);
                  return next;
                });
              };

              const handleCopyNum = async (num: string) => {
                const success = await copyToClipboard(num);
                if (success) {
                  setCopiedOrderFeedback(num);
                  setTimeout(() => setCopiedOrderFeedback(null), 2000);
                }
              };

              return (
                <div className="space-y-3">
                  
                  {/* Master-Detail Order Rows */}
                  {paginatedOrders.map((order, idx) => {
                    const isExpanded = expandedOrderIds.has(order.id);
                    const isCopied = copiedOrderFeedback === order.orderNumber;
                    const itemsCount = (order.items || []).length;

                    return (
                      <div
                        key={order.id}
                        id={`admin-order-${order.id}`}
                        style={{ zIndex: isExpanded ? 40 : 35 - Math.min(idx, 30) }}
                        className={`relative rounded-2xl border transition-all shadow-xs ${
                          order.status === 'pending'
                            ? 'bg-base-surface border-warning-border ring-1 ring-warning-border/70'
                            : 'bg-base-surface border-border hover:border-border-strong'
                        }`}
                      >
                        {/* Master Header Row */}
                        <div className={`p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-base-surface ${isExpanded ? 'rounded-t-2xl' : 'rounded-2xl'}`}>
                          
                          {/* Left: Expand toggle, Order No, Customer, Date, Status */}
                          <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => handleToggleExpand(order.id)}
                              className="p-1.5 rounded-lg border border-border bg-base-surface-2 hover:bg-base-surface-3 text-text-secondary hover:text-text-primary transition-colors cursor-pointer shrink-0 mt-0.5 sm:mt-0"
                              title={isExpanded ? 'Detayları Gizle' : 'Detayları Göster'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>

                            <div className="w-9 h-9 rounded-xl bg-bg-success text-success-text border border-success-border flex items-center justify-center font-bold text-xs shrink-0">
                              SIP
                            </div>

                            <div className="min-w-0 space-y-0.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-sm text-text-primary">
                                  {order.orderNumber}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyNum(order.orderNumber)}
                                  className="text-text-muted hover:text-text-primary cursor-pointer"
                                  title="Sipariş No Kopyala"
                                >
                                  {isCopied ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                {getOrderStatusBadge(order.status)}
                                {order.sourceQuoteId && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-warning text-warning-text border border-warning-border font-mono font-semibold shrink-0">
                                    Tekliften
                                  </span>
                                )}
                                {/* Ödeme & Tahsilat Durum Rozeti */}
                                {order.paymentStatus === 'paid' && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-success text-success-text border border-success-border font-bold flex items-center space-x-1 shrink-0" title="Tahsilat Alındı">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Tahsil Edildi</span>
                                  </span>
                                )}
                                {order.paymentStatus === 'on_account' && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-info text-info-text border border-info-border font-bold flex items-center space-x-1 shrink-0" title="Müşterinin Cari Hesabına Borç Yazıldı">
                                    <Building2 className="w-3 h-3" />
                                    <span>Cariye Borç</span>
                                  </span>
                                )}
                                {order.paymentStatus === 'pending_collection' && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-danger text-danger-text border border-danger-border font-bold flex items-center space-x-1 shrink-0 animate-pulse" title="Ürün teslim edildi fakat para henüz alınmadı!">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>⚠️ Para Alınmadı</span>
                                  </span>
                                )}
                                {order.status === 'delivered' && !order.paymentStatus && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-success text-success-text border border-success-border font-bold flex items-center space-x-1 shrink-0">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Tahsil Edildi</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap min-w-0">
                                <span className="font-semibold text-text-primary flex items-center gap-1 min-w-0">
                                  <User className="w-3 h-3 text-text-muted shrink-0" />
                                  <span className="truncate max-w-[200px] sm:max-w-[280px] md:max-w-[340px] xl:max-w-[420px]" title={order.customerName}>
                                    {order.customerName}
                                  </span>
                                </span>
                                <span className="text-text-muted shrink-0">•</span>
                                <span className="text-[11px] text-text-muted font-mono flex items-center gap-1 shrink-0">
                                  <Clock className="w-3 h-3" />
                                  <span>{new Date(order.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </span>
                                <span className="text-text-muted shrink-0">•</span>
                                <span className="text-[11px] text-text-secondary shrink-0 whitespace-nowrap">
                                  {itemsCount} Kalem Ürün
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Amount & Quick Operational Action Buttons */}
                          <div className="flex items-center justify-between lg:justify-end gap-2 sm:gap-3.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/50 shrink-0 lg:shrink-0">
                            
                            {/* Price Badge - Premium High-Contrast Redesign */}
                            <div className="shrink-0 text-left sm:text-right px-3.5 py-1.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 hover:border-emerald-500/60 shadow-2xs transition-all duration-200 min-w-[120px] sm:min-w-[132px]">
                              <span className="text-[9.5px] sm:text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block whitespace-nowrap mb-0.5">
                                Genel Toplam
                              </span>
                              <div className="text-sm sm:text-base font-black font-mono tracking-tight whitespace-nowrap tabular-nums flex items-baseline sm:justify-end leading-tight">
                                <span className="text-slate-950 dark:text-emerald-100 drop-shadow-2xs">
                                  {(order.total || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="ml-1 text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-400">₺</span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {order.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateOrderStatus(order.id, 'approved')}
                                  className="px-3 py-1.5 bg-success-fill hover:opacity-90 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Onayla</span>
                                </button>
                              )}

                              {order.status === 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                                  className="px-3 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                                >
                                  <Package className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Hazırla</span>
                                </button>
                              )}

                              {order.status === 'preparing' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveTrackingOrderId(order.id);
                                    setTrackingNumberInput(`SEVK-${Math.floor(100000 + Math.random() * 900000)}`);
                                  }}
                                  className="px-3 py-1.5 bg-warning-fill hover:opacity-90 text-slate-950 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Sevk Et</span>
                                </button>
                              )}

                              {order.status === 'shipped' && (
                                <button
                                  type="button"
                                  onClick={() => setSettlementOrder(order)}
                                  className="px-3 py-1.5 bg-success-fill hover:opacity-90 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                                  title="Teslimat & Tahsilat Uzlaştırma Masasını Aç"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Teslim & Tahsilat</span>
                                </button>
                              )}

                              {order.status === 'delivered' && order.paymentStatus === 'pending_collection' && (
                                <button
                                  type="button"
                                  onClick={() => setSettlementOrder(order)}
                                  className="px-2.5 py-1.5 bg-danger-fill hover:opacity-90 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer animate-pulse"
                                  title="Bu sipariş teslim edildi fakat tahsilatı açıkta! Tahsilatı kapatmak için tıklayın."
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Tahsilatı Kapat</span>
                                </button>
                              )}

                              {/* A4 PDF */}
                              <button
                                type="button"
                                onClick={() => setSelectedOrderForPDF(order)}
                                className="px-2.5 py-1.5 bg-base-surface-2 hover:bg-base-surface-3 text-text-primary border border-border rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                title="Resmi A4 İrsaliye & Sipariş Belgesi"
                              >
                                <Printer className="w-3.5 h-3.5 text-brand-500" />
                                <span className="hidden md:inline">İrsaliye</span>
                              </button>

                              {/* WhatsApp */}
                              <button
                                type="button"
                                onClick={() => {
                                  setWhatsAppShareState({
                                    isOpen: true,
                                    title: `Sipariş #${order.orderNumber} - ${order.customerName}`,
                                    defaultPhone: order.customerPhone || '',
                                    defaultMessage: generateOrderWhatsAppMessage(order),
                                    recipientName: order.customerName,
                                  });
                                }}
                                className="p-1.5 sm:px-2.5 sm:py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                                title="Müşteriye WhatsApp Gönder"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">WhatsApp</span>
                              </button>

                              {/* Order Action Dropdown */}
                              <OrderActionDropdown
                                order={order}
                                onOpenPicking={() => {
                                  setSelectedOrderForPicking(order);
                                  setShowPickingInspectionModal(true);
                                }}
                                onOpenPacking={() => setSelectedOrderForPacking(order)}
                                onOpenReceipts={() => setShowReceiptVerificationModal(true)}
                                onPrintThermalReceipt={() => {
                                  printThermalReceipt80mm({
                                    title: 'ALPHA TEKNİK',
                                    orderNumber: order.orderNumber || 'Sipariş',
                                    customerName: order.customerName || 'Müşteri',
                                    customerPhone: order.customerPhone,
                                    items: (order.items || []).map(i => ({
                                      name: i.productName || 'Ürün',
                                      qty: i.quantity || 1,
                                      unit: i.unit || 'ADET',
                                      price: i.unitPrice || 0,
                                      total: i.totalPrice || 0
                                    })),
                                    totalAmount: order.total || 0,
                                    taxAmount: order.tax !== undefined ? order.tax : Math.round((order.total || 0) * (20 / 120) * 100) / 100,
                                    notes: order.trackingNumber ? `Sevkiyat Ref: ${order.trackingNumber}` : undefined,
                                    documentType: 'SIPARIS_FISI'
                                  });
                                }}
                                onOpenInvoices={() => setActiveTab('invoices')}
                                onCancelOrder={['pending', 'approved', 'preparing'].includes(order.status) ? () => handleUpdateOrderStatus(order.id, 'cancelled') : undefined}
                              />
                            </div>
                          </div>

                        </div>

                        {/* Expanded Detail Panel (Master-Detail) */}
                        {isExpanded && (
                          <div className="p-4 sm:p-5 border-t border-border bg-base-surface-2/40 space-y-4 animate-in fade-in duration-150 rounded-b-2xl">
                            
                            {/* Mini Status Progress Stepper */}
                            <div className="p-3.5 bg-base-surface rounded-xl border border-border">
                              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-2">
                                Sevkiyat & İlerleme Aşamaları
                              </span>
                              <div className="grid grid-cols-5 gap-1 text-center text-xs">
                                {[
                                  { label: 'Alındı', done: true, current: order.status === 'pending' },
                                  { label: 'Onaylandı', done: ['approved', 'preparing', 'shipped', 'delivered'].includes(order.status), current: order.status === 'approved' },
                                  { label: 'Hazırlanıyor', done: ['preparing', 'shipped', 'delivered'].includes(order.status), current: order.status === 'preparing' },
                                  { label: 'Sevkiyatta', done: ['shipped', 'delivered'].includes(order.status), current: order.status === 'shipped' },
                                  { label: 'Teslim Edildi', done: order.status === 'delivered', current: order.status === 'delivered' },
                                ].map((st, i) => (
                                  <div key={i} className="flex flex-col items-center">
                                    <div className={`w-full h-1.5 rounded-full mb-1.5 ${
                                      st.done ? 'bg-emerald-500' : 'bg-border'
                                    }`} />
                                    <span className={`text-[11px] font-semibold truncate ${
                                      st.current ? 'text-brand-600 dark:text-brand-400 font-bold' : st.done ? 'text-text-primary' : 'text-text-muted'
                                    }`}>
                                      {st.label}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Customer & Address Information Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              <div className="p-3 bg-base-surface rounded-xl border border-border flex items-start space-x-2.5">
                                <User className="w-4 h-4 text-warning-text shrink-0 mt-0.5" />
                                <div className="space-y-0.5 min-w-0">
                                  <span className="text-text-muted text-[10px] uppercase font-bold block">Müşteri & Kurum</span>
                                  <strong className="text-text-primary block truncate">{order.customerName}</strong>
                                  <div className="text-text-muted text-[11px] truncate">{order.customerEmail}</div>
                                </div>
                              </div>

                              <div className="p-3 bg-base-surface rounded-xl border border-border flex items-start space-x-2.5">
                                <Phone className="w-4 h-4 text-success-text shrink-0 mt-0.5" />
                                <div className="space-y-0.5 min-w-0">
                                  <span className="text-text-muted text-[10px] uppercase font-bold block">İletişim & Takip</span>
                                  <span className="text-text-secondary block">{order.customerPhone}</span>
                                  {order.trackingNumber && (
                                    <div className="text-warning-text text-[11px] font-mono font-bold">
                                      Takip: {order.trackingNumber}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="p-3 bg-base-surface rounded-xl border border-border flex items-start space-x-2.5">
                                <MapPin className="w-4 h-4 text-info-text shrink-0 mt-0.5" />
                                <div className="space-y-0.5 min-w-0">
                                  <span className="text-text-muted text-[10px] uppercase font-bold block">Teslimat Adresi & Şantiye</span>
                                  <span className="text-text-secondary leading-snug block line-clamp-2">{order.customerAddress}</span>
                                  {order.constructionSiteName && (
                                    <span className="text-brand-500 font-semibold block text-[11px]">
                                      Şantiye: {order.constructionSiteName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Order Items Table */}
                            <div className="divide-y divide-border bg-base-surface rounded-xl border border-border overflow-hidden text-xs">
                              <div className="p-2.5 bg-base-surface-2 font-bold text-text-secondary flex justify-between text-[11px]">
                                <span>Sipariş Kalemleri ({order.items.length} Ürün)</span>
                                <span>Tutar</span>
                              </div>
                              {order.items.map((item, idx) => (
                                <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-base-surface-2/40 transition-colors">
                                  <div className="space-y-0.5">
                                    <span className="font-semibold text-text-primary">{item.productName}</span>
                                    <span className="text-text-muted text-[11px] ml-2">
                                      {item.quantity} {item.unit || 'Adet'} × {item.unitPrice} ₺
                                    </span>
                                    {item.note && (
                                      <p className="text-[11px] text-text-muted italic">{item.note}</p>
                                    )}
                                  </div>
                                  <span className="font-bold text-success-text font-mono shrink-0">
                                    {(item.totalPrice || 0).toLocaleString('tr-TR')} ₺
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Notes & Pricing Breakdown Footer */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 text-xs">
                              <div>
                                {order.encryptedPayload ? (
                                  <div className="flex items-center space-x-2">
                                    <Lock className="w-3.5 h-3.5 text-success-text" />
                                    <span className="text-text-muted text-[11px]">E2EE Şifreli Not:</span>
                                    {decryptedNotes[order.id] ? (
                                      <span className="text-success-text font-mono text-[11px] bg-bg-success border border-success-border px-2 py-0.5 rounded">
                                        {decryptedNotes[order.id]}
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleDecryptNote(order.id, order.encryptedPayload!)}
                                        className="text-[11px] text-success-text hover:underline font-semibold cursor-pointer"
                                      >
                                        (AES-256 Şifresini Çöz)
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-text-secondary">
                                    <strong>Not:</strong> {order.notes || 'Belirtilmedi'}
                                  </span>
                                )}
                              </div>

                              <div className="shrink-0 flex items-baseline space-x-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 shadow-2xs">
                                <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider whitespace-nowrap">Genel Toplam:</span>
                                <span className="text-base sm:text-lg font-black text-slate-950 dark:text-emerald-100 font-mono tabular-nums whitespace-nowrap">
                                  {(order.total || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}&nbsp;
                                  <span className="text-emerald-700 dark:text-emerald-400 font-black">₺</span>
                                </span>
                              </div>
                            </div>

                          </div>
                        )}

                      </div>
                    );
                  })}

                  {/* Pagination Component */}
                  <OrderPagination
                    currentPage={safeCurrentPage}
                    totalItems={totalItems}
                    pageSize={orderPageSize}
                    onPageChange={(p) => setOrderCurrentPage(p)}
                    onPageSizeChange={(sz) => {
                      setOrderPageSize(sz);
                      setOrderCurrentPage(1);
                    }}
                    pageSizeOptions={[10, 20, 50]}
                    itemLabel="sipariş"
                  />

                </div>
              );
            })()}

          </div>
        )}

      {/* TAB 2: QUOTES MANAGEMENT DESK */}
      {activeTab === 'quotes' && (
        <div className="space-y-4 admin-quote-desk">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary flex items-center space-x-2">
              <FileText className="w-5 h-5 text-warning-text" />
              <span>Gelen Teklif Talepleri & Hızlı Fiyatlandırma Masası</span>
            </h2>
            <button onClick={createNewQuote} className="min-h-[44px] px-4 rounded-xl bg-success-fill text-base font-bold text-xs flex items-center gap-2 shadow-sm active:scale-[0.98] transition-transform"><Plus className="w-4 h-4" /> Yeni Teklif Oluştur</button>
          </div>

          {/* Status Filter Active Notification */}
          {quoteStatusFilter !== 'all' && (
            <div className="p-3 bg-bg-warning border border-warning-border text-warning-text rounded-2xl text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-warning-text shrink-0" />
                <span>
                  Filtre Aktif: <strong>{quoteStatusFilter === 'pending_review' ? 'Yalnızca Fiyatlandırma Bekleyen Talepler' : quoteStatusFilter}</strong> listeleniyor ({(quotes || []).filter(q => q.status === quoteStatusFilter).length} talep).
                </span>
              </div>
              <button
                type="button"
                onClick={() => setQuoteStatusFilter('all')}
                className="px-2.5 py-1 bg-warning-fill hover:opacity-90 text-base rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
              >
                Tüm Talepleri Göster
              </button>
            </div>
          )}

          {(() => {
            const filteredQuotes = quotes.filter(q => {
              if (quoteStatusFilter !== 'all' && q.status !== quoteStatusFilter) {
                return false;
              }
              return true;
            });

            if (filteredQuotes.length === 0) {
              return (
                <div className="p-12 text-center bg-base-surface rounded-2xl border border-border text-text-muted text-xs shadow-xs space-y-2">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30 text-text-muted" />
                  <p>{quoteStatusFilter !== 'all' ? 'Filtreye uygun teklif talebi bulunamadı.' : 'Henüz teklif talebi bulunmuyor.'}</p>
                  {quoteStatusFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setQuoteStatusFilter('all')}
                      className="text-xs text-warning-text font-bold hover:underline cursor-pointer"
                    >
                      Tüm talepleri göster ➔
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {filteredQuotes.map(quote => (
                  <div
                  key={quote.id}
                  id={`admin-quote-${quote.id}`}
                  className={`admin-quote-card p-5 rounded-2xl border transition-all shadow-xs ${
                    quote.status === 'pending_review'
                      ? 'bg-base-surface border-warning-border ring-1 ring-warning-border'
                      : 'bg-base-surface border-border'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-bg-warning text-warning-text border border-warning-border flex items-center justify-center font-bold text-xs">
                        TKL
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-text-primary">{quote.quoteNumber}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            quote.status === 'pending_review' ? 'bg-bg-warning text-warning-text border border-warning-border' :
                            quote.status === 'offer_sent' ? 'bg-bg-info text-info-text border border-info-border' :
                            quote.status === 'accepted' ? 'bg-bg-success text-success-text border border-success-border' : 'bg-base-surface-2 text-text-secondary border border-border'
                          }`}>
                            {quote.status === 'pending_review' ? 'Fiyatlandırma Bekliyor' :
                             quote.status === 'offer_sent' ? 'Teklif İletildi' :
                             quote.status === 'accepted' ? 'Müşteri Onayladı' : quote.status}
                          </span>
                        </div>
                        <span className="text-[11px] text-text-muted">
                          {quote.customerName} ({quote.customerCompany || 'Kurumsal'}) - {quote.deliveryCity}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => setSelectedQuoteForPDF(quote)}
                        className="px-3 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                        title="Resmi Antetli Teklif PDF İncele / Yazdır"
                      >
                        <Printer className="w-3.5 h-3.5 text-success-text" />
                        <span>A4 Teklif</span>
                      </button>

                      {/* 80mm POS Thermal Quote Print Button */}
                      <button
                        onClick={() => {
                          const items = (quote.offeredItems && quote.offeredItems.length > 0)
                            ? quote.offeredItems.map(i => ({
                                name: i.productName,
                                qty: i.quantity,
                                unit: i.unit || 'ADET',
                                price: i.offeredUnitPrice,
                                total: i.totalPrice
                              }))
                            : (quote.requestedItems || []).map(i => ({
                                name: i.productName || 'Ürün',
                                qty: i.requestedQuantity || 1,
                                unit: i.unit || 'ADET',
                                price: i.targetUnitPrice || 0,
                                total: (i.requestedQuantity || 1) * (i.targetUnitPrice || 0)
                              }));

                          const totalCalc = quote.grandTotal || quote.subtotal || items.reduce((s, x) => s + (x.total || 0), 0);

                          printThermalReceipt80mm({
                            title: 'ALPHA TEKNİK',
                            orderNumber: quote.quoteNumber,
                            customerName: quote.customerName,
                            customerPhone: quote.customerPhone,
                            items,
                            totalAmount: totalCalc,
                            taxAmount: quote.taxAmount !== undefined ? quote.taxAmount : Math.round(totalCalc * (20 / 120) * 100) / 100,
                            notes: quote.deliveryCity ? `Teslimat Şehri: ${quote.deliveryCity}` : undefined,
                            documentType: 'TEKLIF_FISI'
                          });
                        }}
                        className="px-2.5 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                        title="80mm / 58mm Termal Teklif Fişi Yazdır"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-500" />
                        <span>80mm Fiş</span>
                      </button>

                      {/* WhatsApp Share Button */}
                      <button
                        onClick={() => {
                          setWhatsAppShareState({
                            isOpen: true,
                            title: `Teklif #${quote.quoteNumber} - ${quote.customerName}`,
                            defaultPhone: quote.customerPhone || '',
                            defaultMessage: generateQuoteWhatsAppMessage(quote),
                            recipientName: quote.customerName,
                          });
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                        title="Müşteriye WhatsApp ile Teklif Bilgilerini İlet"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('invoices');
                        }}
                        className="px-3.5 py-1.5 bg-danger-fill/15 hover:bg-danger-fill/25 text-danger-text border border-danger-border rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                        title="GİB UBL-TR 2.1 E-Fatura veya E-Arşiv Oluştur"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Faturaya Dönüştür</span>
                      </button>

                      {quote.status !== 'accepted' && (
                        <button
                          onClick={() => setSelectedQuoteForResponse(quote)}
                          className="px-4 py-1.5 bg-warning-fill hover:opacity-90 text-base font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{quote.status === 'offer_sent' ? 'Teklifi Revize Et' : 'Teklifi Hazırla & Gönder'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Requested Items Preview */}
                  <div className="p-3.5 bg-base-surface-2 rounded-xl border border-border text-xs space-y-2 mt-3">
                    <div className="font-semibold text-text-muted uppercase tracking-wider text-[10px]">
                      Müşterinin Talep Ettiği Kalemler:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(quote.requestedItems || []).length === 0 ? (
                        <div className="admin-quote-empty">Bu teklif için henüz ürün kalemi eklenmemiş.</div>
                      ) : (quote.requestedItems || []).map((item, i) => (
                        <div key={i} className="p-2.5 bg-base-surface rounded-lg border border-border shadow-xs">
                          <span className="font-medium text-text-primary">{item.productName || 'Ürün'}</span>
                          <div className="text-[11px] text-text-muted mt-0.5">
                            Miktar: <strong className="text-text-primary">{item.requestedQuantity || 1} {item.unit || 'ADET'}</strong>
                            {item.targetUnitPrice && (
                              <span className="ml-2 text-success-text font-semibold">Hedef Fiyat: {item.targetUnitPrice} ₺</span>
                            )}
                          </div>
                          {item.note && (
                            <div className="text-[10px] text-text-muted italic mt-0.5">{item.note}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Offered totals if offer already prepared */}
                  {quote.grandTotal && (
                    <div className="flex justify-between items-center text-xs text-text-secondary pt-3 border-t border-border">
                      <span>Vade: <strong className="text-text-primary">{quote.paymentTerms}</strong></span>
                      <span className="text-success-text font-mono text-sm font-bold">
                        Hazırlanan Teklif: {(quote.grandTotal || 0).toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                  )}

                </div>
              ))}
            </div>
            );
          })()}
        </div>
      )}

      {/* TAB 3: PRODUCT CATALOG & STOCK MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="admin-desktop-module space-y-4">
          {/* Top Bar Portaled Actions (Toplu İşlemler & Yeni Ürün) */}
          <AdminContextActionsPortal>
            <div className="flex items-center gap-2">
              {/* Toplu İşlemler Açılır Menüsü */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowStockBulkMenu(prev => !prev)}
                  className="min-h-[42px] px-3.5 py-2 bg-base-surface hover:bg-base-surface-2 text-text-primary border border-border rounded-xl text-[13px] font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                  title="Toplu İskonto, Satın Alma PO ve Diğer İşlemler"
                >
                  <Layers className="w-4 h-4 text-text-secondary" />
                  <span>Toplu İşlemler</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showStockBulkMenu ? 'rotate-180' : ''}`} />
                </button>

                {showStockBulkMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowStockBulkMenu(false)} 
                    />
                    <div className="absolute right-0 mt-1.5 w-60 bg-base-surface border border-border rounded-2xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          setShowStockBulkMenu(false);
                          setShowBulkPriceModal(true);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-amber-500/10 text-text-primary rounded-xl text-xs font-bold flex items-center space-x-2.5 transition-colors cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                          <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <div className="font-bold text-text-primary">Toplu İskonto / Zam Motoru</div>
                          <div className="text-[10px] text-text-muted font-normal">Kategori veya liste bazında fiyat güncelle</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowStockBulkMenu(false);
                          setShowSupplierPOModal(true);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-warning-fill/10 text-text-primary rounded-xl text-xs font-bold flex items-center space-x-2.5 transition-colors cursor-pointer mt-1"
                      >
                        <div className="w-7 h-7 rounded-lg bg-warning-fill/15 flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5 text-warning-text" />
                        </div>
                        <div>
                          <div className="font-bold text-text-primary">Tedarikçi Satın Alma (PO)</div>
                          <div className="text-[10px] text-text-muted font-normal">Kritik stok ikmali ve sipariş fişi</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowStockBulkMenu(false);
                          setShowBulkExcelModal(true);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-emerald-500/10 text-text-primary rounded-xl text-xs font-bold flex items-center space-x-2.5 transition-colors cursor-pointer mt-1"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <div className="font-bold text-text-primary">Toplu Excel & CSV Masası</div>
                          <div className="text-[10px] text-text-muted font-normal">Dışa aktar / İçe aktar</div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Yeni Ürün Butonu - Orijinal Premium Şekli */}
              <button
                type="button"
                onClick={() => { setSelectedProductToEdit(null); setShowProductModal(true); }}
                className="min-h-[42px] px-4 py-2 bg-[#064e3b] hover:bg-[#043d2e] text-white border border-[#064e3b] rounded-xl text-[13px] font-extrabold flex items-center space-x-2 transition-all cursor-pointer shadow-sm shadow-emerald-950/25 active:scale-[0.98]"
                title="Yeni Ürün Ekle"
              >
                <PackagePlus className="w-4 h-4 text-emerald-200" />
                <span>Yeni Ürün</span>
              </button>
            </div>
          </AdminContextActionsPortal>

          <AdminModuleOverview
            mode="stock"
            orders={orders}
            quotes={quotes}
            products={products}
            onRefresh={onRefresh}
            hideRefresh={true}
            hideTitlebar={true}
            onPrimaryAction={() => { setSelectedProductToEdit(null); setShowProductModal(true); }}
            onAlertAction={() => setStockFilterMode('critical')}
            activeStockFilter={stockFilterMode}
            onStockFilterChange={(filter) => {
              if (filter === 'health') {
                setShowStockHealthModal(true);
              } else {
                setStockFilterMode(filter);
              }
            }}
            hideAlertBanner={true}
          />

          <ProductFastEditTable
            products={products}
            onRefresh={onRefresh}
            filterMode={stockFilterMode}
            onFilterModeChange={setStockFilterMode}
            onOpenAddModal={() => {
              setSelectedProductToEdit(null);
              setShowProductModal(true);
            }}
            onEditProduct={(product) => {
              setSelectedProductToEdit(product);
              setShowProductModal(true);
            }}
          />
        </div>
      )}

      {/* TAB: BARKOD & RAF ETİKETİ STÜDYOSU (MÜSTAKİL AYRI SAYFA) */}
      {activeTab === 'barcodes' && (
        <div className="admin-desktop-module space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-base-surface border border-border rounded-2xl shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className="px-3.5 py-2 bg-base-surface-2 hover:bg-base-surface text-text-primary rounded-xl text-xs font-bold border border-border flex items-center gap-2 transition-all active:scale-[0.98] shadow-2xs cursor-pointer"
                title="Stok Tablosuna Geri Dön"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Stok Tablosuna Dön</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-text-primary">
                    Barkod &amp; Raf Etiketi Stüdyosu
                  </h1>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Müstakil Sayfa
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  Termal rulo, A4 tabaka, Code-128, EAN-13 ve QR etiket baskı masası
                </p>
              </div>
            </div>
          </div>

          <BarcodeGeneratorModal
            isOpen={true}
            onClose={() => setActiveTab('products')}
            products={products}
            isPageMode={true}
          />
        </div>
      )}

      {/* TAB 9: GİDER TAKİP DASHBOARD */}
      {(activeTab as string) === 'gider' && (
        <GiderTakipDashboard />
      )}

      {/* TAB 10: ÇEK / SENET TAKİP */}
      {(activeTab as string) === 'cek-senet' && (
        <CekSenetDashboard />
      )}

      {/* TAB 11: KASA DEFTERİ */}
      {(activeTab as string) === 'kasa' && (
        <div className="finance-surface">
          <KasaDefteri />
        </div>
      )}

      {/* ORTAK ARAÇ HESABI */}
      {(activeTab as string) === 'ortak-arac' && (
        <OrtakAracHesabi />
      )}

      {/* RAPOR: KÂR / ZARAR */}
      {(activeTab as string) === 'kar-zarar' && (
        <KarZararRaporu />
      )}

      {/* RAPOR: KDV ÖZETİ */}
      {(activeTab as string) === 'kdv-ozet' && (
        <KdvOzetRaporu />
      )}

      {/* RAPOR: ÜRÜN KÂR MARJI */}
      {(activeTab as string) === 'urun-kar' && (
        <UrunKarMarjiRaporu />
      )}

      {/* TAB 4: CARI HESAP & BORÇ/ALACAK YÖNETİMİ DASHBOARD */}
      {activeTab === 'cariler' && (
        <div className="admin-desktop-module finance-surface">
          <CariManagementDashboard
            onRefreshParent={onRefresh}
          />
        </div>
      )}

      {/* TAB 5: GİB E-FATURA & E-ARŞİV YÖNETİMİ DASHBOARD */}
      {activeTab === 'invoices' && (
        <EInvoiceDashboard
          orders={orders}
          quotes={quotes}
          products={products}
        />
      )}

      {/* TAB 6: D3 SALES TREND & CATEGORY ANALYTICS DASHBOARD */}
      {activeTab === 'analytics' && (
        <SalesAnalyticsDashboard
          orders={orders}
          products={products}
          onRefresh={onRefresh}
        />
      )}


      {/* TAB 12: ALIŞ FATURALARI */}
      {(activeTab as string) === 'alis-faturalari' && (
        <AlisFaturalariDashboard />
      )}

      {/* TAB 13: TEDARİKÇİ EKSTRESİ */}
      {(activeTab as string) === 'tedarikci-ekstresi' && (
        <TedarikciEkstresi />
      )}

      </div>

      {/* Tracking Number Input Modal */}
      {activeTrackingOrderId && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in p-3 sm:p-4 md:p-6"
          onClick={() => setActiveTrackingOrderId(null)}
        >
          <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
            <div 
              className="relative bg-base-surface border border-border rounded-2xl w-full max-w-md p-5 text-text-primary shadow-2xl space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-sm font-bold text-text-primary flex items-center space-x-2">
                <Truck className="w-4 h-4 text-warning-text" />
                <span>Sevkiyat / İrsaliye Referans Numarası Girin</span>
              </h3>
              <input
                type="text"
                value={trackingNumberInput}
                onChange={e => setTrackingNumberInput(e.target.value)}
                placeholder="Örn: SEVK-883920 veya İRS-4402"
                className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-lg text-xs text-text-primary focus:border-border-strong font-mono"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setActiveTrackingOrderId(null)}
                  className="px-3.5 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary rounded-lg text-xs font-semibold cursor-pointer border border-border"
                >
                  Vazgeç
                </button>
                <button
                  onClick={() => {
                    handleUpdateOrderStatus(activeTrackingOrderId, 'shipped', trackingNumberInput);
                    setActiveTrackingOrderId(null);
                  }}
                  className="px-4 py-1.5 bg-success-fill hover:opacity-90 text-base font-bold rounded-lg text-xs cursor-pointer shadow-sm"
                >
                  Sevkiyata Çıkarıldı Olarak Güncelle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Quote Response Modal */}
      {selectedQuoteForResponse && (
        <AdminQuoteModal
          quote={selectedQuoteForResponse}
          products={products}
          onClose={() => setSelectedQuoteForResponse(null)}
          onSuccess={onRefresh}
        />
      )}

      {/* Product Add/Edit Modal */}
      {showProductModal && (
        <ProductManageModal
          productToEdit={selectedProductToEdit}
          products={products}
          onClose={() => setShowProductModal(false)}
          onSuccess={onRefresh}
        />
      )}

      {/* Quote PDF View Modal */}
      {selectedQuoteForPDF && (
        <QuotePDFModal
          quote={selectedQuoteForPDF}
          onClose={() => setSelectedQuoteForPDF(null)}
        />
      )}

      {/* Order PDF View / Print Modal */}
      {selectedOrderForPDF && (
        <OrderPDFModal
          order={selectedOrderForPDF}
          onClose={() => setSelectedOrderForPDF(null)}
        />
      )}

      {/* DÜŞÜK STOK ALARM & HIZLI İKMAL MODALI */}
      {showLowStockModal && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in p-3 sm:p-4 md:p-6"
          onClick={() => setShowLowStockModal(false)}
        >
          <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
            <div 
              className="bg-base-surface border border-border rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col text-text-primary shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
            
            {/* Header */}
            <div className="p-5 bg-base-surface-2 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-bg-danger text-danger-text border border-danger-border">
                  <AlertTriangle className="w-5 h-5 text-danger-text animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary flex items-center space-x-2">
                    <span>Kritik Düşük Stok Takip & Hızlı İkmal Masası</span>
                    <span className="px-2 py-0.5 rounded-full bg-bg-danger text-danger-text text-xs font-bold border border-danger-border">
                      {lowStockProducts.length} Ürün
                    </span>
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Stok miktarı ≤ {lowStockThreshold} olan ürünler listelenmiştir. Tek tıkla stok ekleyebilir veya toplu ikmal yapabilirsiniz.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Threshold selector */}
                <div className="flex items-center space-x-1.5 bg-base-surface px-3 py-1.5 rounded-xl border border-border text-xs">
                  <span className="text-text-muted font-medium">Eşik:</span>
                  <select
                    value={lowStockThreshold}
                    onChange={e => setLowStockThreshold(Number(e.target.value))}
                    className="bg-transparent font-bold text-text-primary cursor-pointer text-xs"
                  >
                    <option value={3}>≤ 3 Adet</option>
                    <option value={5}>≤ 5 Adet (Standart)</option>
                    <option value={10}>≤ 10 Adet</option>
                    <option value={15}>≤ 15 Adet</option>
                    <option value={20}>≤ 20 Adet</option>
                    <option value={50}>≤ 50 Adet</option>
                  </select>
                </div>

                <button
                  onClick={() => setShowLowStockModal(false)}
                  className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-base-surface-2 transition-colors cursor-pointer border border-border"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content List */}
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              
              {/* Batch Actions Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-bg-danger/40 border border-danger-border rounded-2xl">
                <div className="text-xs text-danger-text font-semibold">
                  Tüm bu {lowStockProducts.length} adet ürünü tek tıkla ikmal etmek için:
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBatchRestockAllLow(25)}
                    className="px-3 py-1.5 bg-danger-fill hover:opacity-90 text-base rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Tümüne +25 Adet Ekle
                  </button>
                  <button
                    onClick={() => handleBatchRestockAllLow(50)}
                    className="px-3 py-1.5 bg-success-fill hover:opacity-90 text-base rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Tümüne +50 Adet Ekle
                  </button>
                </div>
              </div>

              {/* Table / Cards */}
              <div className="bg-base-surface rounded-2xl border border-border overflow-hidden shadow-xs">
                {/* DESKTOP TABLE */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-base-surface-2 text-text-secondary uppercase font-bold text-[11px] tracking-wider border-b border-border">
                      <tr>
                        <th className="py-3 px-3 w-8">#</th>
                        <th className="py-3 px-3 min-w-[200px]">Ürün Adı & Kodları</th>
                        <th className="py-3 px-3">Kategori</th>
                        <th className="py-3 px-3 text-right">Birim Fiyat</th>
                        <th className="py-3 px-3 text-center min-w-[100px]">Mevcut Stok</th>
                        <th className="py-3 px-3 text-center min-w-[160px]">Hızlı İkmal İşlemleri</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-text-primary">
                      {lowStockProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-text-muted">
                            Tebrikler! Belirlenen eşik (≤ {lowStockThreshold}) altında hiçbir ürün bulunmuyor.
                          </td>
                        </tr>
                      ) : (
                        lowStockProducts.map((product, idx) => (
                          <tr key={product.id} className="hover:bg-base-surface-2 transition-colors">
                            <td className="py-3 px-3 text-text-muted font-mono text-[11px]">
                              {idx + 1}
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-bold text-text-primary">{product.name}</div>
                              <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-text-muted">
                                <span className="font-mono bg-base-surface-2 px-1.5 py-0.5 rounded border border-border">
                                  {product.sku}
                                </span>
                                {product.barcode && (
                                  <span className="font-mono text-text-muted">
                                    Barkod: {product.barcode}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-base-surface-2 text-text-secondary font-semibold text-[10px] border border-border">
                                {product.category}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-right font-mono font-bold text-text-primary">
                              {product.price.toLocaleString('tr-TR')} ₺
                            </td>

                            <td className="py-3 px-3 text-center">
                              <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-bg-danger text-danger-text border border-danger-border font-mono font-extrabold text-xs">
                                <AlertTriangle className="w-3 h-3 text-danger-text animate-pulse" />
                                <span>{product.stock} {product.unit}</span>
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleQuickRestock(product, 10)}
                                  disabled={restockLoadingId === product.id}
                                  className="px-2 py-1 bg-base-surface-2 hover:bg-bg-success text-text-primary hover:text-success-text border border-border rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  title="+10 Adet Ekle"
                                >
                                  +10
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickRestock(product, 25)}
                                  disabled={restockLoadingId === product.id}
                                  className="px-2 py-1 bg-base-surface-2 hover:bg-bg-success text-text-primary hover:text-success-text border border-border rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  title="+25 Adet Ekle"
                                >
                                  +25
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickRestock(product, 50)}
                                  disabled={restockLoadingId === product.id}
                                  className="px-2.5 py-1 bg-success-fill hover:opacity-90 text-base rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                                  title="+50 Adet Ekle"
                                >
                                  {restockLoadingId === product.id ? '...' : '+50'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickRestock(product, 100)}
                                  disabled={restockLoadingId === product.id}
                                  className="px-2 py-1 bg-warning-fill hover:opacity-90 text-base rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                                  title="+100 Adet Ekle"
                                >
                                  +100
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE LIST CARDS */}
                <div className="block md:hidden divide-y divide-border">
                  {lowStockProducts.length === 0 ? (
                    <div className="py-8 px-4 text-center text-text-muted text-xs">
                      Tebrikler! Belirlenen eşik (≤ {lowStockThreshold}) altında hiçbir ürün bulunmuyor.
                    </div>
                  ) : (
                    lowStockProducts.map((product) => (
                      <div key={product.id} className="p-3.5 space-y-2.5 hover:bg-base-surface-2/40 transition-colors">
                        
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <span className="font-mono font-bold text-xs bg-base-surface-2 px-2 py-0.5 rounded border border-border">
                              {product.sku}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-base-surface-2 text-text-secondary text-[10px] font-semibold">
                              {product.category}
                            </span>
                          </div>

                          <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-bg-danger text-danger-text border border-danger-border font-mono font-black text-[11px] shrink-0">
                            <AlertTriangle className="w-3 h-3 text-danger-text animate-pulse" />
                            <span>{product.stock} {product.unit}</span>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-bold text-xs text-text-primary leading-snug">{product.name}</h4>
                          <div className="flex items-center justify-between mt-1 text-[11px]">
                            {product.barcode && (
                              <span className="text-text-muted font-mono">Barkod: {product.barcode}</span>
                            )}
                            <span className="font-mono font-black text-success-text ml-auto">
                              {product.price.toLocaleString('tr-TR')} ₺
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-text-muted">Hızlı Stok İkmali:</span>
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickRestock(product, 10)}
                              disabled={restockLoadingId === product.id}
                              className="px-2.5 py-1.5 bg-base-surface-2 hover:bg-bg-success text-text-primary rounded-lg text-xs font-bold transition-colors cursor-pointer active:scale-95"
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickRestock(product, 25)}
                              disabled={restockLoadingId === product.id}
                              className="px-2.5 py-1.5 bg-base-surface-2 hover:bg-bg-success text-text-primary rounded-lg text-xs font-bold transition-colors cursor-pointer active:scale-95"
                            >
                              +25
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickRestock(product, 50)}
                              disabled={restockLoadingId === product.id}
                              className="px-3 py-1.5 bg-success-fill hover:opacity-90 text-base rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer active:scale-95"
                            >
                              {restockLoadingId === product.id ? '...' : '+50'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickRestock(product, 100)}
                              disabled={restockLoadingId === product.id}
                              className="px-2.5 py-1.5 bg-warning-fill hover:opacity-90 text-base rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer active:scale-95"
                            >
                              +100
                            </button>
                          </div>
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-base-surface-2 border-t border-border flex items-center justify-between text-xs text-text-secondary">
              <div>
                Toplam Kritik Ürün: <strong>{lowStockProducts.length}</strong> / Toplam Katalog: <strong>{products.length}</strong>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setShowLowStockModal(false);
                    setShowSupplierPOModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-warning-fill hover:opacity-90 text-white rounded-xl font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Tedarikçi Satın Alma (PO) Başlat</span>
                </button>
                <button
                  onClick={() => {
                    setShowLowStockModal(false);
                    setActiveTab('products');
                  }}
                  className="px-3.5 py-1.5 bg-base-surface hover:bg-base-surface-2 border border-border text-text-primary rounded-xl font-semibold cursor-pointer"
                >
                  Ürün Tablosunda Yönet
                </button>
                <button
                  onClick={() => setShowLowStockModal(false)}
                  className="px-4 py-1.5 bg-success-fill hover:opacity-90 text-base font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Kapat
                </button>
              </div>
            </div>

            </div>
          </div>
        </div>
      )}

      {/* Barcode & Shelf Label Generator Modal (Products ve Barcodes sekmelerinde müstakil sayfa olarak render edilir) */}
      {activeTab !== 'products' && activeTab !== 'barcodes' && (
        <BarcodeGeneratorModal
          isOpen={showBarcodeModal}
          onClose={() => setShowBarcodeModal(false)}
          products={products}
        />
      )}

      {/* Camera Barcode & QR Scanner Modal */}
      <CameraBarcodeScannerModal
        isOpen={showCameraScannerModal}
        onClose={() => setShowCameraScannerModal(false)}
        products={products}
        originRect={scannerOriginRect}
        isWmsMode={Boolean(showPickingInspectionModal)}
        onScannedProduct={(product, barcode) => {
          if (showPosModal) {
            setPosScannedBarcode(previous => ({ code: barcode, sequence: (previous?.sequence || 0) + 1 }));
            setShowCameraScannerModal(false);
            return;
          }
          if (showPickingInspectionModal) {
            setWmsSessionScannedCount(c => c + 1);
          }
        }}
        onProductUpdated={onRefresh}
        onOpenProductEdit={(product) => {
          setShowCameraScannerModal(false);
          setSelectedProductToEdit(product);
          setShowProductModal(true);
        }}
        onOpenCreateWithBarcode={(_barcode) => {
          setShowCameraScannerModal(false);
          setSelectedProductToEdit(null);
          setShowProductModal(true);
        }}
        onOpenBarcodeGenerator={(ids) => {
          setShowCameraScannerModal(false);
          setShowBarcodeModal(true);
        }}
      />

      {/* Toplu İskonto ve Zam Motoru Modalı */}
      <BulkPriceAdjustmentModal
        isOpen={showBulkPriceModal}
        onClose={() => setShowBulkPriceModal(false)}
        products={products}
        onApplyAdjustment={handleApplyBulkPriceAdjustment}
      />

      {/* Kritik Stok & Otomatik Tedarikçi Satın Alma Siparişi (PO) Modalı */}
      <SupplierPurchaseOrderModal
        isOpen={showSupplierPOModal}
        onClose={() => setShowSupplierPOModal(false)}
        products={products}
        onApplyRestock={handleApplySupplierRestock}
      />

      {/* Depo Sevkiyat & Çeki Listesi Barkod Doğrulama Modalı */}
      {selectedOrderForPacking && (
        <OrderShipmentPackingModal
          isOpen={!!selectedOrderForPacking}
          onClose={() => setSelectedOrderForPacking(null)}
          order={selectedOrderForPacking}
          products={products}
          onCompleteShipment={handleCompleteShipment}
          onOpenEnterpriseSuite={() => {
            setSelectedOrderForPacking(null);
            setEnterpriseSuiteTab('fleet');
            setShowEnterpriseSuite(true);
          }}
        />
      )}

      {/* Hızlı POS Kasa & Barkod Satış Modalı */}
      <FastPosCheckoutModal
        loading={productsLoading}
        error={productsError}
        onRetry={onRefresh}
        isOpen={showPosModal}
        onClose={() => setShowPosModal(false)}
        products={products}
        onCompleteSale={handlePosSaleComplete}
        scannedBarcode={posScannedBarcode}
        onOpenBarcodeScanner={() => setShowCameraScannerModal(true)}
      />

      {/* Toplu Excel & CSV Stok / Fiyat Masası */}
      <BulkExcelImportExportModal
        isOpen={showBulkExcelModal}
        onClose={() => setShowBulkExcelModal(false)}
        products={products}
        onApplyBulkImport={handleApplyBulkImportProducts}
      />

      {/* Müşteri Kademeleri ve Kademeli İskonto Matrisi */}
      <CustomerTierManagementModal
        isOpen={showCustomerTierModal}
        onClose={() => setShowCustomerTierModal(false)}
      />

      {/* Kullanıcı & Rol Yönetimi */}
      <UserManagementModal
        isOpen={showUserMgmtModal}
        onClose={() => setShowUserMgmtModal(false)}
      />

      {/* Teslimat & Tahsilat Uzlaştırma Masası Modalı */}
      {settlementOrder && (
        <DeliverySettlementModal
          isOpen={Boolean(settlementOrder)}
          onClose={() => setSettlementOrder(null)}
          order={settlementOrder}
          cariAccounts={portalCariAccounts}
          onConfirmSettlement={handleConfirmDeliverySettlement}
          isProcessing={isSettlementProcessing}
        />
      )}

      {/* Evrensel WhatsApp Paylaşım Modalı */}
      {whatsAppShareState && (
        <WhatsAppShareModal
          isOpen={whatsAppShareState.isOpen}
          onClose={() => setWhatsAppShareState(null)}
          title={whatsAppShareState.title}
          defaultPhone={whatsAppShareState.defaultPhone}
          defaultMessage={whatsAppShareState.defaultMessage}
          recipientName={whatsAppShareState.recipientName}
        />
      )}

      {/* Havale / EFT & Banka Dekont Onay Masası */}
      {showReceiptVerificationModal && (
        <AdminReceiptVerificationModal
          isOpen={showReceiptVerificationModal}
          onClose={() => setShowReceiptVerificationModal(false)}
          orders={orders || []}
          receipts={(orders || [])
            .filter(o => o.receiptStatus === 'uploaded' || o.receiptFileUrl || o.paymentMethod === 'Havale/EFT')
            .map(o => ({
              id: `rec-${o.id}`,
              orderId: o.id,
              orderNumber: o.orderNumber,
              customerName: o.customerName,
              customerCompany: o.customerName,
              customerEmail: o.customerEmail || '',
              customerPhone: o.customerPhone || '',
              bankName: o.receiptBankName || 'Banka Havalesi',
              amount: o.receiptAmount || o.total,
              paymentDate: o.receiptUploadedAt || o.createdAt,
              receiptFileUrl: o.receiptFileUrl || '',
              receiptFileName: o.receiptFileName || 'dekont.pdf',
              status: (o.receiptStatus === 'verified' ? 'approved' : (o.receiptStatus === 'rejected' ? 'rejected' : 'pending')) as 'approved' | 'rejected' | 'pending',
              createdAt: o.receiptUploadedAt || o.createdAt,
              updatedAt: o.updatedAt || o.createdAt,
              adminNote: o.receiptNote || ''
            }))}
          onApproveReceipt={async (receiptId, orderId, adminNote) => {
            const targetId = orderId || receiptId.replace('rec-', '');
            await handleUpdateOrderStatus(targetId, 'approved', undefined, {
              receiptStatus: 'verified',
              receiptNote: adminNote,
              paymentStatus: 'paid'
            });
          }}
          onRejectReceipt={async (receiptId, adminNote) => {
            const targetId = receiptId.replace('rec-', '');
            await handleUpdateOrderStatus(targetId, 'pending', undefined, {
              receiptStatus: 'rejected',
              receiptNote: adminNote
            });
          }}
          onReceiptApproved={() => {
            onRefresh();
            playNotificationSound('success');
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
          }}
        />
      )}

      {/* WMS Depo Toplama (Picking List) & Barkod Masası */}
      {showPickingInspectionModal && (
        <OrderPickingInspectionModal
          isOpen={showPickingInspectionModal}
          onClose={() => {
            setShowPickingInspectionModal(false);
            setSelectedOrderForPicking(null);
          }}
          order={selectedOrderForPicking || (orders && orders.length > 0 ? orders[0] : null)}
          products={products || []}
          onOpenBarcodeScanner={() => setShowCameraScannerModal(true)}
          onCompletePicking={handleCompletePicking}
          onPickingComplete={() => {
            onRefresh();
            playNotificationSound('success');
            confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
          }}
        />
      )}

      {/* Stok Yaşlandırma Analizi & B2B Kategori İskonto Matrisi */}
      {showAgingAndDiscountModal && (
        <ManagerAgingAndStockReportsModal
          isOpen={showAgingAndDiscountModal}
          onClose={() => setShowAgingAndDiscountModal(false)}
          products={products || []}
          orders={orders || []}
          cariAccounts={[]}
          onApplyDiscountRule={() => {
            onRefresh();
            playNotificationSound('success');
          }}
        />
      )}

      {/* Stok Sağlığı & Envanter Özeti Modalı */}
      <StockHealthSummaryModal
        isOpen={showStockHealthModal}
        onClose={() => setShowStockHealthModal(false)}
        products={products || []}
        onSelectFilter={(mode) => setStockFilterMode(mode)}
      />

      {/* Floating Barcode Scanner Action Button (FAB) for POS and WMS Picking - Removed from products screen as per design */}
      {(activeTab === 'pos' || showPosModal || showPickingInspectionModal) && (
        <FloatingScannerButton
          onClick={(origin) => {
            setScannerOriginRect(origin || null);
            setShowCameraScannerModal(true);
          }}
          onManualInput={() => {
            setShowCameraScannerModal(true);
          }}
          isWmsMode={Boolean(showPickingInspectionModal)}
          wmsScannedCount={wmsSessionScannedCount}
        />
      )}

      {/* Alpha Enterprise Suite: Kurumsal Yönetim, Finans & Deneyim Merkezi */}
      <AlphaEnterpriseSuiteModal
        isOpen={showEnterpriseSuite || showCompanySettingsModal || showCustomizationStudio}
        onClose={() => {
          setShowEnterpriseSuite(false);
          setShowCompanySettingsModal(false);
          setShowCustomizationStudio(false);
        }}
        currentTheme={theme || 'dark'}
        onThemeChange={(t) => {
          if (onToggleTheme) {
            onToggleTheme(t);
          }
        }}
        initialTab={showCompanySettingsModal ? 'identity' : enterpriseSuiteTab}
      />

    </div>
  );
}
