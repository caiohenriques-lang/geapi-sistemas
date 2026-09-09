import React from 'react';

export const Header: React.FC = () => {
  return (
    <header id="main-header" className="bg-white text-slate-900 border-b border-slate-200 shadow-2xs sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            GEAPI - Sistemas
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Gerência de Análise e Processamento de Infrações - GEAPI
          </p>
          <p className="text-[11px] text-slate-400 font-normal">
            Desenvolvido por Caio Henriques de O. L. Cordeiro
          </p>
        </div>

        {/* Logo PBH / BHTRANS no canto superior direito com tamanho aumentado */}
        <div className="shrink-0 flex items-center">
          <img
            src="/logo_pbh_bhtrans.png"
            alt="Prefeitura de Belo Horizonte / BHTRANS"
            className="h-12 sm:h-14 md:h-16 w-auto object-contain"
          />
        </div>
      </div>
    </header>
  );
};


