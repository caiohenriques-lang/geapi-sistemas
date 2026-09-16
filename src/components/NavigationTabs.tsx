import React from 'react';
import { FileSpreadsheet, ShieldAlert } from 'lucide-react';

export interface SystemModule {
  id: string;
  label: string;
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
        <div className="flex items-center gap-2 py-2 overflow-x-auto no-scrollbar">
          {GEAPI_MODULES.map((mod) => {
            const isActive = mod.id === activeModuleId;
            const Icon = mod.icon || FileSpreadsheet;

            if (mod.externalUrl) {
              return (
                <a
                  key={mod.id}
                  href={mod.externalUrl}
                  target="_self"
                  className="relative px-4 py-2 rounded-lg text-xs sm:text-sm font-bold tracking-tight transition-all flex items-center gap-2 shrink-0 cursor-pointer bg-transparent text-[#6B7280] hover:text-[#2F2F2F] hover:bg-[#E5E7EB]/40 border border-transparent"
                  title={mod.fullName || mod.label}
                >
                  <Icon className="w-4 h-4 text-[#6B7280]" />
                  <span>{mod.label}</span>
                </a>
              );
            }

            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onSelectModule?.(mod.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative px-4 py-2 rounded-lg text-xs sm:text-sm font-bold tracking-tight transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#E5E7EB]/50 text-[#2F2F2F] border border-[#E5E7EB]'
                    : 'bg-transparent text-[#6B7280] hover:text-[#2F2F2F] hover:bg-[#E5E7EB]/30 border border-transparent'
                }`}
                title={mod.fullName || mod.label}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-[#2F2F2F]' : 'text-[#6B7280]'
                  }`}
                />
                <span>{mod.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F4B400] ml-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
