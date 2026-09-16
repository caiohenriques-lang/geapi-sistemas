import React from 'react';
import { FileSpreadsheet, LayoutDashboard, ShieldAlert } from 'lucide-react';

export interface SystemModule {
  id: string;
  label: string;
  lines?: [string, string];
  fullName?: string;
  description?: string;
  externalUrl?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const GEAPI_MODULES: SystemModule[] = [
  {
    id: 'smv',
    label: 'SMV',
    fullName: 'Solicitação de Manutenção de Vias',
    description: 'Emissão e confecção de formulários de manutenção de vias',
    icon: FileSpreadsheet,
  },
  {
    id: 'portal-gestao',
    label: 'Portal de Gestão GEAPI',
    lines: ['Portal de Gestão', 'GEAPI'],
    fullName: 'Portal de Gestão GEAPI',
    description: 'Portal de Gestão Integrada GEAPI',
    externalUrl: 'https://geapife.vercel.app/',
    icon: LayoutDashboard,
  },
  {
    id: 'sat',
    label: 'SAT',
    fullName: 'Sistema de Análise Técnica',
    description: 'Portal de Sinistros e Acidentes de Trânsito',
    externalUrl: 'https://geapife-sinistros.vercel.app',
    icon: ShieldAlert,
  },
];

interface NavigationTabsProps {
  activeModuleId?: string;
  onSelectModule?: (moduleId: string) => void;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeModuleId = 'smv',
  onSelectModule,
}) => {
  return (
    <nav
      id="system-navigation"
      aria-label="Sistemas GEAPI"
      className="hidden sm:block bg-white border-b border-[#E5E7EB]"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2.5 py-2.5 overflow-x-auto no-scrollbar">
          {GEAPI_MODULES.map((mod) => {
            const isActive = mod.id === activeModuleId;
            const Icon = mod.icon || FileSpreadsheet;

            const minWidthClass =
              mod.id === 'portal-gestao' ? 'min-w-[150px] px-3.5' : 'min-w-[105px] px-4';

            const labelContent = mod.lines ? (
              <span className="flex flex-col items-center justify-center text-center leading-none">
                <span className="text-xs sm:text-sm font-medium leading-none">{mod.lines[0]}</span>
                <span className="text-xs sm:text-sm font-bold leading-none tracking-wide mt-1">{mod.lines[1]}</span>
              </span>
            ) : (
              <span className="text-xs sm:text-sm font-bold tracking-tight">{mod.label}</span>
            );

            if (mod.externalUrl) {
              return (
                <a
                  key={mod.id}
                  href={mod.externalUrl}
                  target="_self"
                  className={`relative h-12 ${minWidthClass} rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2.5 shrink-0 cursor-pointer bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-2xs`}
                  title={mod.fullName || mod.label}
                >
                  <Icon className="w-4 h-4 text-slate-600 shrink-0" />
                  {labelContent}
                </a>
              );
            }

            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onSelectModule?.(mod.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative h-12 ${minWidthClass} rounded-xl text-xs sm:text-sm tracking-tight transition-all flex items-center justify-center gap-2.5 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-slate-100 text-[#2F2F2F] font-bold border border-slate-300 shadow-2xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
                title={mod.fullName || mod.label}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#2F2F2F]' : 'text-slate-600'
                  }`}
                />
                {labelContent}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F4B400] ml-0.5 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
