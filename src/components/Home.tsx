import React from 'react';
import {
  FileSpreadsheet,
  ClipboardList,
  LayoutDashboard,
  ShieldAlert,
  Lock,
  LockOpen,
  ArrowRight,
} from 'lucide-react';

interface HomeProps {
  onSelectModule: (moduleId: 'smv' | 'controle-oficios') => void;
  isOficiosAuthorized?: boolean;
}

export const Home: React.FC<HomeProps> = ({
  onSelectModule,
  isOficiosAuthorized = false,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fadeIn">
      {/* Grade de 4 Cards: Desktop 2x2, Mobile 1 coluna */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Card 1: SMV */}
        <div
          onClick={() => onSelectModule('smv')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectModule('smv');
            }
          }}
          className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-2xl p-6 sm:p-7 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between space-y-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-slate-950 transition-colors">
                SMV
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                Módulo para confecção de Solicitação de Manutenção de Vias (sinalização vertical/horizontal e poda).
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
            <span>Acessar Módulo</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: CONTROLE DE OFÍCIOS */}
        <div
          onClick={() => onSelectModule('controle-oficios')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectModule('controle-oficios');
            }
          }}
          className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-2xl p-6 sm:p-7 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between space-y-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <ClipboardList className="w-5 h-5" />
              </div>

              {/* Indicador de Cadeado: fechado neutro se não autorizado, aberto verde se autorizado */}
              <div
                title={isOficiosAuthorized ? 'Acesso Liberado nesta sessão' : 'Acesso Restrito'}
                className="flex items-center gap-1.5"
              >
                {isOficiosAuthorized ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <LockOpen className="w-3 h-3 stroke-[2.5]" />
                    Liberado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                    <Lock className="w-3 h-3 stroke-[2.2]" />
                    Acesso Restrito
                  </span>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-slate-950 transition-colors">
                Controle de Ofícios
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                Módulo para cadastro de parada e retorno de equipamentos de fiscalização eletrônica.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
            <span>Acessar Módulo</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: PORTAL DE GESTÃO */}
        <a
          href="https://geapife.vercel.app/"
          target="_self"
          className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-2xl p-6 sm:p-7 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between space-y-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 no-underline"
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <LayoutDashboard className="w-5 h-5" />
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-slate-950 transition-colors">
                Portal de Gestão
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                Portal de Gestão da GEAPI.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
            <span>Acessar Portal</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </a>

        {/* Card 4: SAT */}
        <a
          href="https://geapife-sinistros.vercel.app"
          target="_self"
          className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-2xl p-6 sm:p-7 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between space-y-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 no-underline"
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-slate-950 transition-colors">
                SAT
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                Sistema de Análise Técnica.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
            <span>Acessar Sistema</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </a>
      </div>
    </div>
  );
};
