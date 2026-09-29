import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  FileCheck2,
} from 'lucide-react';
import { RegistrarParadaForm } from './RegistrarParadaForm';
import { RegistrarRetorno } from './RegistrarRetorno';
import { HistoricoOficios } from './HistoricoOficios';
import { AcessoRestritoCard, STORAGE_AUTH_KEY } from './AcessoRestritoCard';
import { fetchEquipamentosList, isOficiosApiConfigured } from '../../services/oficiosService';

type ViewMode = 'MENU' | 'PARADA' | 'RETORNO';

interface ControleOficiosModuleProps {
  isAuthorized?: boolean;
  onAuthorized?: () => void;
}

export const ControleOficiosModule: React.FC<ControleOficiosModuleProps> = ({
  isAuthorized: propIsAuthorized,
  onAuthorized: propOnAuthorized,
}) => {
  // Helper para verificar autorização persistente no sessionStorage
  const getSessionAuth = (): boolean => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return sessionStorage.getItem(STORAGE_AUTH_KEY) === 'true';
      }
    } catch (e) {}
    return false;
  };

  // Verifica se já existe autorização ativa nesta sessão do navegador
  const [internalAuthorized, setInternalAuthorized] = useState<boolean>(() => getSessionAuth());

  // Sempre considera autorizado se a prop for true, se o estado interno for true OU se o sessionStorage tiver 'true'
  const isAuthorized = Boolean(propIsAuthorized || internalAuthorized || getSessionAuth());

  // Sincroniza estado de autorização do módulo com o componente pai (App)
  useEffect(() => {
    if (getSessionAuth()) {
      if (!internalAuthorized) {
        setInternalAuthorized(true);
      }
      if (!propIsAuthorized) {
        propOnAuthorized?.();
      }
    }
  }, [internalAuthorized, propIsAuthorized, propOnAuthorized]);

  const handleAuthorized = () => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(STORAGE_AUTH_KEY, 'true');
      }
    } catch (e) {}
    setInternalAuthorized(true);
    propOnAuthorized?.();
  };

  const [viewMode, setViewMode] = useState<ViewMode>('MENU');
  const [historyRefreshKey, setHistoryRefreshKey] = useState<number>(0);

  const handleReturnToMenu = () => {
    setViewMode('MENU');
    setHistoryRefreshKey((k) => k + 1);
  };

  // Pré-aquece o cache de equipamentos em background APENAS após a liberação da autorização
  useEffect(() => {
    if (isAuthorized && isOficiosApiConfigured()) {
      fetchEquipamentosList().catch(() => {});
    }
  }, [isAuthorized]);

  // Se não estiver autorizado na sessão, exibe a tela de acesso restrito exclusiva
  if (!isAuthorized) {
    return <AcessoRestritoCard onAuthorized={handleAuthorized} />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-4 sm:space-y-5">
      {/* 1. VISÃO DO MENU PRINCIPAL (Card Único Unificado com Título e Botões de Ação) */}
      {viewMode === 'MENU' && (
        <div className="space-y-4 sm:space-y-5 animate-fadeIn">
          {/* Card Único Superior */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 sm:space-y-3.5">
            {/* Cabeçalho do Card */}
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Controle de Ofícios
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                Lançamento de paralisação e retorno de equipamentos de fiscalização eletrônica.
              </p>
            </div>

            {/* Divisória Sutil */}
            <div className="border-t border-slate-100" />

            {/* Botões / Atalhos Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {/* Botão: Registrar Parada */}
              <button
                type="button"
                onClick={() => setViewMode('PARADA')}
                className="h-12 px-4 bg-white hover:bg-rose-50/40 border border-slate-200 hover:border-rose-300 rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center gap-3 cursor-pointer group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                  <PlusCircle className="w-4.5 h-4.5" />
                </div>
                <span className="text-sm font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                  Registrar Parada
                </span>
              </button>

              {/* Botão: Registrar Retorno */}
              <button
                type="button"
                onClick={() => setViewMode('RETORNO')}
                className="h-12 px-4 bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center gap-3 cursor-pointer group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                  <FileCheck2 className="w-4.5 h-4.5" />
                </div>
                <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Registrar Retorno
                </span>
              </button>
            </div>
          </div>

          {/* Relatório Histórico de Parada e Retorno de Equipamentos */}
          <HistoricoOficios refreshTrigger={historyRefreshKey} />
        </div>
      )}

      {/* 2. VISÃO DO FORMULÁRIO DE PARADA */}
      {viewMode === 'PARADA' && (
        <div className="space-y-4 sm:space-y-5 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3.5 sm:px-6 sm:py-4 shadow-xs flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Controle de Ofícios
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                Lançamento de paralisação de equipamento
              </p>
            </div>
            <button
              type="button"
              onClick={handleReturnToMenu}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-all cursor-pointer shrink-0"
            >
              Menu Principal
            </button>
          </div>
          <RegistrarParadaForm onBack={handleReturnToMenu} />
        </div>
      )}

      {/* 3. VISÃO DO FORMULÁRIO DE RETORNO */}
      {viewMode === 'RETORNO' && (
        <div className="space-y-4 sm:space-y-5 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3.5 sm:px-6 sm:py-4 shadow-xs flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Controle de Ofícios
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                Lançamento de retorno de equipamento
              </p>
            </div>
            <button
              type="button"
              onClick={handleReturnToMenu}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-all cursor-pointer shrink-0"
            >
              Menu Principal
            </button>
          </div>
          <RegistrarRetorno onBack={handleReturnToMenu} />
        </div>
      )}
    </div>
  );
};
