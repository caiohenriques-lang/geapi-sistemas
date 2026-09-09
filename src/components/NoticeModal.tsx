import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface NoticeModalProps {
  onAccept: () => void;
}

export const NoticeModal: React.FC<NoticeModalProps> = ({ onAccept }) => {
  const [isChecked, setIsChecked] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const accepted = sessionStorage.getItem('geapi_smv_notice_accepted');
    if (accepted !== 'true') {
      setIsOpen(true);
    }
  }, []);

  const handleContinue = () => {
    if (!isChecked) return;
    sessionStorage.setItem('geapi_smv_notice_accepted', 'true');
    setIsOpen(false);
    onAccept();
  };

  if (!isOpen) return null;

  return (
    <div
      id="notice-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        id="notice-modal-content"
        className="bg-white text-slate-900 rounded-xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-slate-200"
      >
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-700">
            <AlertTriangle className="w-6 h-6 shrink-0" />
          </div>
          <div>
            <h2 id="modal-title" className="text-xl font-extrabold text-slate-900 tracking-tight">
              AVISO DE USO
            </h2>
            <p className="text-xs text-slate-500 font-medium">GEAPI-SMV &bull; Uso Institucional</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-slate-700 leading-relaxed font-normal mb-6">
          <p>
            Este sistema tem como finalidade exclusiva facilitar a confecção da Solicitação de Manutenção de Vias (SMV).
          </p>
          <p>
            Os dados informados não são destinados a armazenamento permanente. As imagens inseridas são utilizadas apenas para a geração dos documentos e são descartadas após o processamento.
          </p>
          <p className="font-semibold text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-200">
            A conferência das informações e do documento gerado permanece sob responsabilidade do usuário.
          </p>
        </div>

        <div className="space-y-5 pt-2 border-t border-slate-100">
          <label
            htmlFor="check-aware"
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/30 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              id="check-aware"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm font-semibold text-slate-800 select-none">
              Li e estou ciente.
            </span>
          </label>

          <button
            id="btn-continuar-modal"
            type="button"
            disabled={!isChecked}
            onClick={handleContinue}
            className={`w-full py-3 px-6 rounded-lg font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
              isChecked
                ? 'bg-blue-700 hover:bg-blue-800 text-white shadow-md active:scale-[0.99] cursor-pointer'
                : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            CONTINUAR
          </button>
        </div>
      </div>
    </div>
  );
};
