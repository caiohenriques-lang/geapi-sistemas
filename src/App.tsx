import React from 'react';
import { Header } from './components/Header';
import { NoticeModal } from './components/NoticeModal';
import { SmvForm } from './components/SmvForm';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      {/* Mandatory initial modal session warning */}
      <NoticeModal onAccept={() => {}} />

      {/* Institutional Top Header */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 pb-16">
        <SmvForm />
      </main>

      {/* Institutional Minimalist Footer */}
      <footer className="bg-white text-slate-500 py-6 border-t border-slate-200 text-center text-xs">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium text-slate-600">
            Gerência de Análise e Processamento de Infrações - GEAPI &bull; PBH
          </p>
          <p className="text-slate-400 text-[11px]">
            Desenvolvido por Caio Henriques de O. L. Cordeiro
          </p>
        </div>
      </footer>
    </div>
  );
}

