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
      <div className="flex items-center justify-around max-w-md mx-auto px-4 h-14">
        {GEAPI_MODULES.map((mod) => {
          const isActive = mod.id === activeModuleId;
          const Icon = mod.icon || FileSpreadsheet;

          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => onSelectModule?.(mod.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center w-full py-1 transition-colors cursor-pointer relative ${
                isActive ? 'text-[#2F2F2F]' : 'text-[#6B7280] hover:text-[#2F2F2F]'
              }`}
            >
              {/* Active Accent Indicator Bar */}
              {isActive && (
                <span className="absolute -top-1 w-8 h-1 rounded-full bg-[#F4B400]" />
              )}

              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                  isActive ? 'bg-[#F4B400]/15 text-[#2F2F2F]' : 'text-[#6B7280]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-[#2F2F2F]' : 'text-[#6B7280]'
                  }`}
                />
              </div>

              <span
                className={`text-[11px] font-bold tracking-tight mt-0.5 ${
                  isActive ? 'text-[#2F2F2F]' : 'text-[#6B7280]'
                }`}
              >
                {mod.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
