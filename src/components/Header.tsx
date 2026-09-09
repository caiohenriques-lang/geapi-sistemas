import React from 'react';
import { FileText, ShieldAlert } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header id="main-header" className="bg-slate-900 text-white border-b border-slate-800 shadow-sm sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          {/* Tenta renderizar a logo da PBH caso o arquivo seja adicionado a /public/logo-pbh.png ou /logo-pbh.svg */}
          <img
            src="/logo-pbh.png"
            alt="Logo PBH"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
            className="h-10 w-auto object-contain"
          />
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400 shrink-0" />
              <h1 className="text-lg font-bold tracking-tight text-white">
                GEAPI-SMV
              </h1>
              <span className="text-xs bg-blue-900/60 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded font-mono font-medium">
                PBH
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Solicitação de Manutenção de Vias &bull; Prefeitura de Belo Horizonte
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700/60">
          <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Sessão Temporária &bull; Sem armazenamento de dados</span>
        </div>
      </div>
    </header>
  );
};
