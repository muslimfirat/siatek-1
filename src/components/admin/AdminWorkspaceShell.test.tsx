import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import AdminWorkspaceShell from './AdminWorkspaceShell';

const admin = {
  id: 'admin-test',
  email: 'fatih@example.com',
  name: 'Fatih Fırat',
  role: 'admin' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('AdminWorkspaceShell profile access', () => {
  it('keeps a profile trigger outside the desktop-only sidebar', () => {
    const html = renderToStaticMarkup(
      <AdminWorkspaceShell
        activeTab="home"
        onTabChange={vi.fn()}
        onOpenAI={vi.fn()}
        onOpenNotifications={vi.fn()}
        currentUser={admin}
        onLogout={vi.fn()}
      >
        <div>İçerik</div>
      </AdminWorkspaceShell>,
    );
    const sidebarEnd = html.indexOf('</aside>');
    const mobileTrigger = html.indexOf('aria-label="Yönetici profil menüsü"');
    expect(mobileTrigger).toBeGreaterThan(sidebarEnd);
  });

  it('shows one finance entry and removes the inactive workspace selector', () => {
    const html = renderToStaticMarkup(
      <AdminWorkspaceShell
        activeTab="kasa"
        onTabChange={vi.fn()}
        onOpenAI={vi.fn()}
        onOpenNotifications={vi.fn()}
        currentUser={admin}
        onLogout={vi.fn()}
      >
        <div>İçerik</div>
      </AdminWorkspaceShell>,
    );

    const sidebar = html.slice(0, html.indexOf('</aside>'));
    expect(sidebar).toContain('<span>Finans</span>');
    expect(sidebar).not.toContain('<span>Faturalama</span>');
    expect(sidebar).not.toContain('admin-workspace-company');
    expect(html).toContain('Kasa / Banka');
    expect(html).toContain('Faturalama');
    expect(html).toContain('Giderler');
    expect(html).toContain('Çek / Senet');
  });

  it('shows Ortak Araç as its own sidebar module', () => {
    const html = renderToStaticMarkup(
      <AdminWorkspaceShell
        activeTab="ortak-arac"
        onTabChange={vi.fn()}
        onOpenAI={vi.fn()}
        onOpenNotifications={vi.fn()}
        currentUser={admin}
        onLogout={vi.fn()}
      >
        <div>İçerik</div>
      </AdminWorkspaceShell>,
    );
    const sidebar = html.slice(html.indexOf('admin-workspace-sidebar'), html.indexOf('admin-workspace-content'));

    expect(sidebar).toContain('<span>Ortak Araç</span>');
    expect(sidebar).toMatch(/aria-current="page"[^>]*><svg[^>]*>.*?<\/svg><span>Ortak Araç<\/span>/s);
  });
});
