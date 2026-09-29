import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

interface AcessoRestritoCardProps {
  onAuthorized: () => void;
}

export const SENHA_CORRETA = 'GEAPIFE-CONTROLE';
export const STORAGE_AUTH_KEY = 'geapi_controle_oficios_authorized';

export const AcessoRestritoCard: React.FC<AcessoRestritoCardProps> = ({ onAuthorized }) => {
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Se já houver autorização prévia nesta sessão do navegador, desbloqueia imediatamente
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        if (sessionStorage.getItem(STORAGE_AUTH_KEY) === 'true') {
          onAuthorized();
        }
      }
    } catch (e) {}
  }, [onAuthorized]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validação estrita por correspondência exata
    if (senha.trim() === SENHA_CORRETA) {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.setItem(STORAGE_AUTH_KEY, 'true');
        }
      } catch (err) {
        // sessionStorage pode estar indisponível em casos extremos, mas prossegue
      }
      onAuthorized();
    } else {
      setError('Senha de autorização inválida.');
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 sm:py-14 px-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSubmit} method="post" action="#" className="space-y-6">
          {/* Identificador auxiliar oculto para navegadores e gerenciadores de senhas (ex: Chrome, Edge, Safari, 1Password) */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            value="geapi-operacional"
            readOnly
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />

          {/* Header do Card */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center shadow-2xs">
              <Lock className="w-6 h-6" />
            </div>

            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-slate-100 text-slate-600 border border-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                Acesso Restrito
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-1">
              Controle de Ofícios
            </h2>
          </div>

          {/* Mensagem de Erro Discreta */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-700 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Campo da Senha */}
          <div className="space-y-1.5">
            <label
              htmlFor="senha-controle-oficios"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Senha de Autorização
            </label>
            <div className="relative">
              <input
                id="senha-controle-oficios"
                name="geapi-controle-oficios-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Digite a senha de autorização"
                autoFocus
                required
                className={`w-full pl-3.5 pr-10 py-2.5 bg-white text-slate-900 font-medium text-sm rounded-xl border shadow-2xs transition-all outline-none ${
                  error
                    ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/20'
                    : 'border-slate-300 focus:border-slate-700 focus:ring-2 focus:ring-slate-100'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botão Principal de Acesso (SOMENTE ESTE BOTÃO) */}
          <button
            type="submit"
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            Acessar Módulo
          </button>

          {/* Texto de Rodapé Discreto */}
          <p className="text-[11px] text-center text-slate-500 leading-relaxed pt-1">
            A autorização permanece ativa apenas durante a sessão do navegador.
          </p>
        </form>
      </div>
    </div>
  );
};
