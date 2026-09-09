import React from 'react';
import { Header } from './components/Header';
import { NoticeModal } from './components/NoticeModal';
import { SmvForm } from './components/SmvForm';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col antialiased selection:bg-blue-200 selection:text-blue-900">
      {/* Mandatory initial modal session warning */}
      <NoticeModal onAccept={() => {}} />

      {/* Institutional Top Header */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 pb-16">
        <SmvForm />
      </main>

      {/* Institutional Minimalist Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-center text-xs">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium">
            GEAPI &bull; Gerência de Apoio à Infraestrutura &bull; PBH
          </p>
          <p className="text-slate-300 font-mono text-[11px]">
            Sem armazenamento de dados &bull; Processamento local no navegador
          </p>
        </div>
      </footer>
    </div>
  );
}
