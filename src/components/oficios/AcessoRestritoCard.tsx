import React, { useState, useRef, useEffect } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

interface AcessoRestritoCardProps {
  onAuthorized: () => void;
}

export const SENHA_CORRETA = 'GEAPIFE-CONTROLE';
export const STORAGE_AUTH_KEY = 'geapi_controle_oficios_authorized';
export const USERNAME_DEFAULT = 'geapi-operacional';

export const AcessoRestritoCard: React.FC<AcessoRestritoCardProps> = ({ onAuthorized }) => {
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Se já houver autorização prévia nesta sessão do navegador, desbloqueia imediatamente
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        if (sessionStorage.getItem(STORAGE_AUTH_KEY) === 'true') {
          onAuthorized();
        }
      }
    } catch (e) {}
  }, [onAuthorized]);

  // Sincroniza com autofill nativo do navegador caso o campo seja preenchido sem disparar onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      if (passwordInputRef.current && passwordInputRef.current.value && !senha) {
        setSenha(passwordInputRef.current.value);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [senha]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Obtém o valor real diretamente do DOM / FormData para garantir suporte a autofill
    const form = e.currentTarget;
    const formData = new FormData(form);
    const formPassword = (formData.get('password') as string) || '';
    const domPassword = passwordInputRef.current?.value || '';
    const valorSenha = (formPassword || domPassword || senha || '').trim();

    // Validação estrita por correspondência exata
    if (valorSenha === SENHA_CORRETA) {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.setItem(STORAGE_AUTH_KEY, 'true');
        }
      } catch (err) {
        // sessionStorage pode estar indisponível em casos extremos, prossegue
      }

      // Notifica o gerenciador nativo de credenciais do navegador (Chrome, Edge, Safari) para SPAs
      try {
        if (
          typeof window !== 'undefined' &&
          'credentials' in navigator &&
          (window as any).PasswordCredential
        ) {
          const cred = new (window as any).PasswordCredential({
            id: USERNAME_DEFAULT,
            password: SENHA_CORRETA,
            name: 'Controle de Ofícios - GEAPI',
          });
          navigator.credentials.store(cred).catch(() => {});
        }
      } catch (credErr) {
        // Fallback silencioso caso a API não esteja disponível ou contexto restrinja
      }

      onAuthorized();
    } else {
      setError('Senha de autorização inválida.');
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 sm:py-14 px-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <form
          ref={formRef}
          id="login-controle-oficios-form"
          name="login-controle-oficios-form"
          onSubmit={handleSubmit}
          method="POST"
          action="#"
          className="space-y-6"
        >
          {/* Identificador auxiliar estruturado para detecção por gerenciadores de senhas (Chrome, Edge, Safari, 1Password) */}
          <input
            type="text"
            id="username"
            name="username"
            autoComplete="username"
            defaultValue={USERNAME_DEFAULT}
            style={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              margin: '-1px',
              padding: '0',
              overflow: 'hidden',
              clip: 'rect(0, 0, 0, 0)',
              border: '0',
              opacity: 0.001,
              pointerEvents: 'none',
            }}
            tabIndex={-1}
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

          {/* Campo da Senha com identificadores padronizados para salvamento/preenchimento nativo */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Senha de Autorização
            </label>
            <div className="relative">
              <input
                ref={passwordInputRef}
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  if (error) setError(null);
                }}
                onInput={(e) => {
                  const target = e.target as HTMLInputElement;
                  if (target.value !== senha) {
                    setSenha(target.value);
                  }
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
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botão Principal de Acesso */}
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
