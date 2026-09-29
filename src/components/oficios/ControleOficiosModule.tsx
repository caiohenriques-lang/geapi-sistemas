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
      {/* Module Top Bar (Cabeçalho compacto institucional) */}
      <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3.5 sm:px-6 sm:py-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Controle de Ofícios
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 leading-normal">
            Lançamento de paralisação e retorno de equipamentos de fiscalização eletrônica.
          </p>
        </div>

        {viewMode !== 'MENU' && (
          <button
            type="button"
            onClick={handleReturnToMenu}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-all cursor-pointer shrink-0"
          >
            Menu Principal
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {viewMode === 'MENU' && (
        <div className="space-y-4 sm:space-y-5 animate-fadeIn">
          {/* Action Cards Grid (Mais compactos, densos e ágeis) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
            {/* Card 1: REGISTRAR PARADA */}
            <div
              onClick={() => setViewMode('PARADA')}
              className="bg-white hover:bg-slate-50/70 border border-slate-200 hover:border-rose-300 rounded-xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                  <PlusCircle className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                    Registrar Parada
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    Cadastrar parada de um equipamento.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 text-xs font-semibold text-rose-600 group-hover:text-rose-700">
                <span>Preencher Formulário de Parada &rarr;</span>
              </div>
            </div>

            {/* Card 2: REGISTRAR RETORNO */}
            <div
              onClick={() => setViewMode('RETORNO')}
              className="bg-white hover:bg-slate-50/70 border border-slate-200 hover:border-emerald-300 rounded-xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                  <FileCheck2 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                    Registrar Retorno
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    Localizar um equipamento parado e cadastrar seu retorno.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
                <span>Ver Ocorrências Abertas &rarr;</span>
              </div>
            </div>
          </div>

          {/* Relatório Histórico de Parada e Retorno de Equipamentos */}
          <HistoricoOficios refreshTrigger={historyRefreshKey} />
        </div>
      )}

      {viewMode === 'PARADA' && (
        <RegistrarParadaForm onBack={handleReturnToMenu} />
      )}

      {viewMode === 'RETORNO' && (
        <RegistrarRetorno onBack={handleReturnToMenu} />
      )}
    </div>
  );
};
