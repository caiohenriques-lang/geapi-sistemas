import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { GEAPI_MODULES } from './NavigationTabs';

interface BottomNavigationProps {
  activeModuleId?: string;
  onSelectModule?: (moduleId: string) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeModuleId = 'smv',
  onSelectModule,
}) => {
  return (
    <nav
      id="bottom-navigation"
      aria-label="Navegação móvel"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E7EB] shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)',
      }}
    >
      <div className="flex items-center justify-between gap-1.5 max-w-md mx-auto px-2 py-1.5 min-h-[62px]">
        {GEAPI_MODULES.map((mod) => {
          const isActive = mod.id === activeModuleId;
          const Icon = mod.icon || FileSpreadsheet;

          const labelNode = mod.lines ? (
            <span
              className={`flex flex-col items-center justify-center text-center leading-none ${
                isActive ? 'text-[#2F2F2F]' : 'text-slate-600'
              }`}
            >
              <span className="text-[10px] font-medium leading-none">{mod.lines[0]}</span>
              <span className="text-[10.5px] font-bold leading-none tracking-wide mt-0.5">{mod.lines[1]}</span>
            </span>
          ) : (
            <span
              className={`text-[11.5px] font-bold tracking-tight text-center leading-none ${
                isActive ? 'text-[#2F2F2F]' : 'text-slate-600'
              }`}
            >
              {mod.label}
            </span>
          );

          if (mod.externalUrl) {
            return (
              <a
                key={mod.id}
                href={mod.externalUrl}
                target="_self"
                className="flex-1 flex flex-col items-center justify-center h-[52px] px-1 py-1 rounded-xl transition-all cursor-pointer relative bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 shadow-2xs"
                title={mod.fullName || mod.label}
              >
                <div className="flex items-center justify-center w-5 h-5 mb-0.5 text-slate-600 shrink-0">
                  <Icon className="w-4 h-4 text-slate-600" />
                </div>
                {labelNode}
              </a>
            );
          }

          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => onSelectModule?.(mod.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center h-[52px] px-1 py-1 rounded-xl transition-all cursor-pointer relative ${
                isActive
                  ? 'bg-slate-100 text-[#2F2F2F] font-bold border border-slate-300 shadow-2xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              {/* Active Accent Indicator Dot */}
              {isActive && (
                <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-[#F4B400]" />
              )}

              <div
                className={`flex items-center justify-center w-5 h-5 mb-0.5 shrink-0 ${
                  isActive ? 'text-[#2F2F2F]' : 'text-slate-600'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-[#2F2F2F]' : 'text-slate-600'
                  }`}
                />
              </div>

              {labelNode}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
