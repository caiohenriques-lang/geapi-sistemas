import React, { useState } from 'react';
import { Header } from './components/Header';
import { NavigationTabs } from './components/NavigationTabs';
import { BottomNavigation } from './components/BottomNavigation';
import { Home } from './components/Home';
import { SmvForm } from './components/SmvForm';
import { ControleOficiosModule } from './components/oficios/ControleOficiosModule';
import { STORAGE_AUTH_KEY } from './components/oficios/AcessoRestritoCard';

export type ActiveModule = 'home' | 'smv' | 'controle-oficios';

export default function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('home');
  const [isOficiosAuthorized, setIsOficiosAuthorized] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return sessionStorage.getItem(STORAGE_AUTH_KEY) === 'true';
      }
    } catch (e) {}
    return false;
  });

  // Sincroniza o estado de autorização com o sessionStorage ao trocar de abas/módulos
  const handleSelectModule = (id: string) => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const isAuth = sessionStorage.getItem(STORAGE_AUTH_KEY) === 'true';
        if (isAuth !== isOficiosAuthorized) {
          setIsOficiosAuthorized(isAuth);
        }
      }
    } catch (e) {}

    if (id === 'home' || id === 'smv' || id === 'controle-oficios') {
      setActiveModule(id);
    }
  };

  // Callback acionado após sucesso na inserção da senha
  const handleAuthorizeOficios = () => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(STORAGE_AUTH_KEY, 'true');
      }
    } catch (e) {}
    setIsOficiosAuthorized(true);
  };

  // Garante sincronização se o usuário alternar abas, retornar de links externos (SAT, Portal de Gestão) ou focar a janela
  React.useEffect(() => {
    const syncAuth = () => {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const isAuth = sessionStorage.getItem(STORAGE_AUTH_KEY) === 'true';
          setIsOficiosAuthorized(isAuth);
        }
      } catch (e) {}
    };

    window.addEventListener('focus', syncAuth);
    window.addEventListener('pageshow', syncAuth);
    return () => {
      window.removeEventListener('focus', syncAuth);
      window.removeEventListener('pageshow', syncAuth);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-[#2F2F2F] font-sans flex flex-col antialiased">
      {/* Institutional Top Header (Clicar na marca/identidade retorna à HOME) */}
      <Header onGoHome={() => handleSelectModule('home')} />

      {/* Desktop Horizontal Navigation Menu (Oculto na HOME para evitar redundância) */}
      {activeModule !== 'home' && (
        <NavigationTabs
          activeModuleId={activeModule}
          onSelectModule={handleSelectModule}
          isOficiosAuthorized={isOficiosAuthorized}
        />
      )}

      {/* Main Container - Renders Active Module with safe bottom padding for mobile bottom nav when active */}
      <main className={`flex-1 ${activeModule !== 'home' ? 'pb-24 sm:pb-16' : 'pb-10 sm:pb-14'}`}>
        {activeModule === 'home' && (
          <Home
            onSelectModule={(mod) => handleSelectModule(mod)}
            isOficiosAuthorized={isOficiosAuthorized}
          />
        )}
        {activeModule === 'smv' && <SmvForm />}
        {activeModule === 'controle-oficios' && (
          <ControleOficiosModule
            isAuthorized={isOficiosAuthorized}
            onAuthorized={handleAuthorizeOficios}
          />
        )}
      </main>

      {/* Institutional Minimalist Footer */}
      <footer
        className={`bg-white text-[#6B7280] py-6 border-t border-[#E5E7EB] text-center text-xs ${
          activeModule !== 'home' ? 'mb-14 sm:mb-0' : ''
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium text-[#454545]">
            Gerência de Análise e Processamento de Infrações - GEAPI &bull; PBH
          </p>
          <p className="text-[#6B7280] text-[11px]">
            Desenvolvido por Caio Henriques de O. L. Cordeiro
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (Oculto na HOME, visível nos módulos internos) */}
      {activeModule !== 'home' && (
        <BottomNavigation
          activeModuleId={activeModule}
          onSelectModule={handleSelectModule}
          isOficiosAuthorized={isOficiosAuthorized}
        />
      )}
    </div>
  );
}
