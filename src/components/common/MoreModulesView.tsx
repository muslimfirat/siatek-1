import React from 'react';
import {
  ChevronRight,
  Lock,
  Layers
} from 'lucide-react';
import { UserRole } from '../../types';
import { getMoreModulesForRole } from '../../utils/navigationConfig';

interface MoreModulesViewProps {
  currentRole: UserRole;
  onSelectModule: (moduleKey: string) => void;
  onOpenAuth: (initialTab?: 'login' | 'register', targetRole?: 'customer' | 'admin') => void;
}

export default function MoreModulesView({
  currentRole,
  onSelectModule,
  onOpenAuth,
}: MoreModulesViewProps) {
  const isAdmin = currentRole === 'admin';
  const categorizedModules = getMoreModulesForRole(currentRole);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8 pb-24 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {isAdmin ? 'Operasyonel Modüller & Araçlar' : 'Hesap & İşlemler'}
          </h1>
          <p className="text-sm text-text-secondary">
            {isAdmin ? 'Alpha Teknik yönetim ve sevkiyat masası' : 'Müşteri portali ve teslimat takip merkezi'}
          </p>
        </div>
        {!isAdmin && (
          <button
            type="button"
            onClick={() => onOpenAuth('login', 'admin')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-warning-fill text-warning-text rounded-xl text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Yönetici Modu</span>
          </button>
        )}
      </div>

      {Object.entries(categorizedModules).filter(([, list]) => list.length > 0).map(([categoryKey, list]) => {
        const categoryTitles: Record<string, string> = {
          sales: 'Satış ve Müşteri',
          finance: 'Finans ve Ödeme',
          partner: 'Ortak Araç',
          reports: 'Raporlar',
          purchasing: 'Satın Alma',
          operations: 'Stok ve Operasyon',
          system: 'Hesap ve Sistem',
          customer: 'Müşteri İşlemleri ve Takip'
        };

        return (
          <div key={categoryKey} className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted px-1 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" />
              {categoryTitles[categoryKey] || 'İşlemler'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((mod: any) => {
                const Icon = mod.icon;
                return (
                  <div
                    key={mod.id}
                    onClick={() => onSelectModule(mod.id)}
                    className="min-h-[88px] p-4 rounded-2xl bg-base-surface border border-border hover:border-border-strong transition-all cursor-pointer flex items-start justify-between group hover:shadow-md active:scale-[0.98]"
                  >
                    <div className="flex items-start space-x-3.5">
                      <div className={`p-2.5 rounded-xl ${mod.color} shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-text-primary text-sm group-hover:text-accent-text transition-colors">
                          {mod.title}
                        </h3>
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                          {mod.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-text-muted group-hover:text-text-primary transition-colors self-center shrink-0 pl-2">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
