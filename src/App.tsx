import React, { useState } from 'react';
import { Header } from './components/Header';
import { NavigationTabs } from './components/NavigationTabs';
import { BottomNavigation } from './components/BottomNavigation';
import { SmvForm } from './components/SmvForm';

export default function App() {
  const [activeModule, setActiveModule] = useState<string>('smv');

  return (
    <div className="min-h-screen bg-slate-50 text-[#2F2F2F] font-sans flex flex-col antialiased">
      {/* Institutional Top Header (Auto-hides on mobile scroll down, shows on scroll up) */}
      <Header />

      {/* Desktop Horizontal Navigation Menu (Hidden on mobile) */}
      <NavigationTabs
        activeModuleId={activeModule}
        onSelectModule={(id) => setActiveModule(id)}
      />

      {/* Main Container - Renders Active Module with safe bottom padding for mobile bottom nav */}
      <main className="flex-1 pb-24 sm:pb-16">
        {activeModule === 'smv' && <SmvForm />}
      </main>

      {/* Institutional Minimalist Footer */}
      <footer className="bg-white text-[#6B7280] py-6 border-t border-[#E5E7EB] text-center text-xs mb-14 sm:mb-0">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium text-[#454545]">
            Gerência de Análise e Processamento de Infrações - GEAPI &bull; PBH
          </p>
          <p className="text-[#6B7280] text-[11px]">
            Desenvolvido por Caio Henriques de O. L. Cordeiro
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (WhatsApp style, fixed on bottom, visible only on mobile) */}
      <BottomNavigation
        activeModuleId={activeModule}
        onSelectModule={(id) => setActiveModule(id)}
      />
    </div>
  );
}
