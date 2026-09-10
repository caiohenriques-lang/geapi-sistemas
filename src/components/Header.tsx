import React from 'react';
import { useHeaderScroll } from '../hooks/useHeaderScroll';

export const Header: React.FC = () => {
  const isVisible = useHeaderScroll(8);

  return (
    <header
      id="main-header"
      className={`bg-white text-[#2F2F2F] border-b border-[#E5E7EB] shadow-2xs sticky top-0 z-30 transition-transform duration-250 ease-in-out ${
        isVisible ? 'translate-y-0' : '-translate-y-full sm:translate-y-0'
      }`}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 sm:gap-4">
        {/* Logo Oficial PBH / BHTRANS: no mobile centralizada no topo, no desktop à direita */}
        <div className="order-1 sm:order-2 shrink-0 flex items-center justify-center w-full sm:w-auto">
          <img
            src="/logo_pbh_bhtrans.png"
            alt="Prefeitura de Belo Horizonte / BHTRANS"
            className="w-[170px] min-[390px]:w-[195px] sm:w-auto sm:h-14 md:h-16 max-w-[85vw] h-auto object-contain mx-auto sm:mx-0"
          />
        </div>

        {/* Identidade da Plataforma: Logo à esquerda do título no mobile e desktop */}
        <div className="order-2 sm:order-1 flex flex-row items-center gap-3 sm:gap-4 text-left w-full sm:w-auto">
          {/* Logo do Sistema GEAPI (à esquerda) */}
          <div className="shrink-0 flex items-center justify-center">
            <img
              src="/brand/logo_geapi_symbol.svg"
              alt="GEAPI - Sistemas"
              className="w-12 h-12 min-[390px]:w-14 min-[390px]:h-14 sm:w-16 sm:h-16 md:w-[68px] md:h-[68px] object-contain"
            />
          </div>

          {/* Textos da Plataforma */}
          <div className="space-y-0.5 min-w-0">
            <h1 className="text-lg min-[390px]:text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-[#2F2F2F] leading-tight">
              GEAPI - Sistemas
            </h1>
            <p className="text-[11px] min-[390px]:text-xs sm:text-sm text-[#454545] font-medium leading-tight">
              Gerência de Análise e Processamento de Infrações - GEAPI
            </p>
            <p className="text-[10px] min-[390px]:text-[11px] text-[#6B7280] font-normal">
              Desenvolvido por Caio Henriques de O. L. Cordeiro
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
