import React from 'react';
import {
  FileSpreadsheet,
  LayoutDashboard,
  ShieldAlert,
  ClipboardList,
  Lock,
  LockOpen,
} from 'lucide-react';

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
    id: 'controle-oficios',
    label: 'Controle de Ofícios',
    lines: ['Controle de', 'Ofícios'],
    fullName: 'Controle de Ofícios / Lançamentos',
    description: 'Lançamento operacional de paradas e retornos de equipamentos',
    icon: ClipboardList,
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
  isOficiosAuthorized?: boolean;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeModuleId = 'smv',
  onSelectModule,
  isOficiosAuthorized = false,
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
              mod.id === 'portal-gestao' || mod.id === 'controle-oficios'
                ? 'min-w-[140px] px-3.5'
                : 'min-w-[105px] px-4';

            const labelContent = mod.lines ? (
              <span className="flex flex-col items-center justify-center text-center leading-none">
                <span className="text-xs sm:text-sm font-bold leading-none">{mod.lines[0]}</span>
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

                {/* Indicador de Cadeado no canto inferior direito para Controle de Ofícios */}
                {mod.id === 'controle-oficios' && (
                  <span
                    className="absolute bottom-1 right-1.5 flex items-center justify-center transition-colors pointer-events-none"
                    title={isOficiosAuthorized ? 'Acesso Liberado nesta sessão' : 'Acesso Restrito'}
                  >
                    {isOficiosAuthorized ? (
                      <LockOpen className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                    ) : (
                      <Lock className="w-3 h-3 text-slate-400 stroke-[2.2]" />
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
