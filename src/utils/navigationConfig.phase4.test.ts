import { describe, expect, it } from 'vitest';
import { getMoreModulesForRole, getNavigationForRole } from './navigationConfig';

describe('Faz 4 — UI/UX navigasyon modeli', () => {
  it('admin mobil alt navigasyonu beş sekmeyi aşmaz', () => {
    const adminNav = getNavigationForRole('admin');

    expect(adminNav.length).toBeLessThanOrEqual(5);
    expect(adminNav.map((item) => item.id)).toEqual(['home', 'cariler', 'pos', 'products', 'more']);
  });

  it('ana finans ekranları Modüller altında iki tık içinde bulunur', () => {
    const modules = getMoreModulesForRole('admin');
    const financeIds = modules.finance.map((item: any) => item.id);

    expect(financeIds).toContain('kasa');
    expect(financeIds).toContain('gider');
    expect(financeIds).toContain('cek-senet');
    expect(modules.reports.map((item: any) => item.id)).toEqual(
      expect.arrayContaining(['analytics', 'kar-zarar', 'kdv-ozet'])
    );
  });

  it('satın alma ve fatura modülleri kategori karmaşası olmadan ayrılır', () => {
    const modules = getMoreModulesForRole('admin');

    expect(modules.finance.map((item: any) => item.id)).toContain('invoices');
    expect(modules.purchasing.map((item: any) => item.id)).toEqual(
      expect.arrayContaining(['alis-faturalari', 'tedarikci-ekstresi'])
    );
  });

  it('ortak araç hesabı finanstan ayrı, kendi kategorisinde durur', () => {
    const modules = getMoreModulesForRole('admin') as any;

    expect(modules.partner.map((item: any) => item.id)).toEqual(['ortak-arac']);
    expect(modules.finance.map((item: any) => item.id)).not.toContain('ortak-arac');
  });
});
