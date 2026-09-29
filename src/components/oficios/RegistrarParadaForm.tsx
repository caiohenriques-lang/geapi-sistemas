import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  PlusCircle,
  ArrowLeft,
  Info,
  X,
} from 'lucide-react';
import {
  MOTIVOS_OFICIAIS,
  OcorrenciaAberta,
  OcorrenciaParadaPayload,
} from '../../types/controleOficios';
import {
  fetchEquipamentosList,
  fetchOcorrenciasAbertas,
  isOficiosApiConfigured,
  registrarParada,
} from '../../services/oficiosService';
import { formatDateBR, formatEquipamentosListBR } from '../../utils/dateUtils';
import { AutocompleteField } from './AutocompleteField';

interface RegistrarParadaFormProps {
  onBack: () => void;
}

/**
 * Validador de formato de ofício (número/ano com conteúdo antes e depois da barra)
 */
export function isValidOficioFormat(str: string): boolean {
  if (!str) return false;
  const s = str.trim();
  if (!s.includes('/')) return false;
  const parts = s.split('/');
  if (parts.length < 2) return false;
  const before = parts[0].trim();
  const after = parts.slice(1).join('/').trim();
  return before.length > 0 && after.length > 0;
}

export const RegistrarParadaForm: React.FC<RegistrarParadaFormProps> = ({ onBack }) => {
  // Form State
  const [selectedCodigos, setSelectedCodigos] = useState<string[]>([]);
  const [currentCodigoInput, setCurrentCodigoInput] = useState('');
  const [oficioParada, setOficioParada] = useState('');
  const [informadoI, setInformadoI] = useState('');
  const [dataParadaI, setDataParadaI] = useState('');
  const [motivo, setMotivo] = useState('');
  const [horarioVandalismo, setHorarioVandalismo] = useState('');
  const [observacao, setObservacao] = useState('');

  // UI & Data State
  const [equipamentosList, setEquipamentosList] = useState<string[]>([]);
  const [ocorrenciasAbertas, setOcorrenciasAbertas] = useState<OcorrenciaAberta[]>([]);
  const [isLoadingEquipamentos, setIsLoadingEquipamentos] = useState(true);
  const [equipamentosError, setEquipamentosError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    count?: number;
    codigos?: string[];
    rowNumber?: number;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isVandalismo = motivo === 'VANDALISMO/FURTO';

  // Carrega lista oficial de equipamentos de MATRIZ!D2:Z6152 (Contratos 2740/24, 2741/24 e 2742/24) e ocorrências abertas
  useEffect(() => {
    let isMounted = true;

    if (!isOficiosApiConfigured()) {
      setEquipamentosError('Integração com Controle de Ofícios ainda não configurada.');
      setIsLoadingEquipamentos(false);
      return;
    }

    setIsLoadingEquipamentos(true);
    setEquipamentosError(null);

    // 1. Busca lista de equipamentos (instantâneo se já estiver em cache na sessão)
    fetchEquipamentosList()
      .then((equipamentos) => {
        if (isMounted) {
          setEquipamentosList(equipamentos);
          setIsLoadingEquipamentos(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          console.error('Erro ao carregar lista de equipamentos:', err);
          setEquipamentosError(err.message || 'Não foi possível carregar a lista de equipamentos.');
          setIsLoadingEquipamentos(false);
        }
      });

    // 2. Busca ocorrências abertas em background (para alerta preventivo de duplicidade)
    fetchOcorrenciasAbertas()
      .then((abertas) => {
        if (isMounted) {
          setOcorrenciasAbertas(abertas);
        }
      })
      .catch(() => {
        // Falha no alerta secundário não impede o uso do formulário
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Limpa horário se motivo mudar e não for vandalismo
  useEffect(() => {
    if (!isVandalismo && horarioVandalismo) {
      setHorarioVandalismo('');
    }
  }, [isVandalismo, horarioVandalismo]);

  // Manipulador de adição de código na seleção múltipla
  const handleSelectCodigo = (code: string) => {
    if (!code || !code.trim()) return;
    const trimmed = code.trim().toUpperCase();

    // Evita duplicidades na lista de seleção
    if (!selectedCodigos.includes(trimmed)) {
      setSelectedCodigos((prev) => [...prev, trimmed]);
      if (errors.codigo) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.codigo;
          return next;
        });
      }
    }
    // Reseta o input do autocomplete para permitir nova busca
    setCurrentCodigoInput('');
  };

  const handleRemoveCodigo = (codeToRemove: string) => {
    setSelectedCodigos((prev) => prev.filter((c) => c !== codeToRemove));
  };

  // Verifica quais códigos selecionados possuem ocorrências abertas (alerta informativo)
  const codesWithOpenOccurrences = useMemo(() => {
    return selectedCodigos.filter((cod) =>
      ocorrenciasAbertas.some(
        (oc) => oc.codigo.trim().toUpperCase() === cod.trim().toUpperCase()
      )
    );
  }, [selectedCodigos, ocorrenciasAbertas]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (selectedCodigos.length === 0) {
      newErrors.codigo = 'Selecione ao menos um código de equipamento.';
    }
    if (!oficioParada.trim()) {
      newErrors.oficioParada = 'O ofício de parada é obrigatório.';
    } else if (!isValidOficioFormat(oficioParada)) {
      newErrors.oficioParada = 'Informe o ofício no formato número/ano. Ex.: 187/26.';
    }

    if (!informadoI.trim()) {
      newErrors.informadoI = 'A data de informação é obrigatória.';
    }
    if (!dataParadaI.trim()) {
      newErrors.dataParadaI = 'A data de início da parada é obrigatória.';
    }
    if (!motivo.trim()) {
      newErrors.motivo = 'Selecione o motivo da paralisação.';
    }
    if (isVandalismo && !horarioVandalismo.trim()) {
      newErrors.horarioVandalismo = 'Horário do vandalismo é obrigatório quando o motivo é VANDALISMO/FURTO.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const payload: OcorrenciaParadaPayload = {
      codigos: selectedCodigos,
      oficioParada: oficioParada.trim(),
      informadoI: informadoI.trim(),
      dataParadaI: dataParadaI.trim(),
      motivo: motivo.trim(),
      ...(isVandalismo && horarioVandalismo ? { horarioVandalismo: horarioVandalismo.trim() } : {}),
      ...(observacao.trim() ? { observacao: observacao.trim() } : {}),
    };

    try {
      const response = await registrarParada(payload);

      if (response.ok) {
        setSuccessData({
          count: selectedCodigos.length,
          codigos: [...selectedCodigos],
          ...(response.data || {}),
        });
      } else {
        setErrorMessage(
          response.error?.message ||
            'Não foi possível registrar a parada. Verifique os dados e tente novamente.'
        );
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Ocorreu um erro inesperado ao tentar salvar a ocorrência.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSelectedCodigos([]);
    setCurrentCodigoInput('');
    setOficioParada('');
    setInformadoI('');
    setDataParadaI('');
    setMotivo('');
    setHorarioVandalismo('');
    setObservacao('');
    setErrors({});
    setErrorMessage(null);
    setSuccessData(null);
  };

  // Se registrou com sucesso, mostra tela de confirmação clara
  if (successData) {
    const count = successData.count || successData.codigos?.length || 1;
    return (
      <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs animate-fadeIn">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center text-emerald-600 shadow-2xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900">
              {count > 1
                ? 'Paradas Registradas com Sucesso!'
                : 'Parada Registrada com Sucesso!'}
            </h3>
            <p className="text-sm text-slate-700 font-medium">
              {count === 1
                ? `A ocorrência do equipamento ${successData.codigos?.[0] || ''} foi registrada com sucesso.`
                : `As ocorrências dos equipamentos ${formatEquipamentosListBR(successData.codigos || [])} foram registradas com sucesso.`}
            </p>
          </div>

          {/* Resumo da Ocorrência Gravada */}
          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5 mt-4 text-xs sm:text-sm">
            <div className="border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium block mb-1">
                Equipamento(s) Registrado(s) ({count}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(successData.codigos || []).map((cod) => (
                  <span
                    key={cod}
                    className="px-2.5 py-0.5 bg-white border border-slate-300 rounded-md font-mono font-bold text-slate-900 uppercase text-xs"
                  >
                    {cod}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Ofício de Parada:</span>
              <span className="font-bold text-slate-900">{oficioParada}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Data Parada:</span>
              <span className="font-semibold text-slate-900">{formatDateBR(dataParadaI)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Motivo:</span>
              <span className="font-semibold text-slate-900">{motivo}</span>
            </div>
            {isVandalismo && horarioVandalismo && (
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Horário Vandalismo:</span>
                <span className="font-semibold text-slate-900">{horarioVandalismo}</span>
              </div>
            )}
            {observacao && (
              <div className="pt-1">
                <span className="text-slate-500 font-medium block mb-0.5">Observação:</span>
                <span className="text-slate-700 italic block">{observacao}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-4">
            <button
              type="button"
              onClick={handleResetForm}
              className="w-full sm:flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Novo Registro
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:flex-1 py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Top Header Card */}
      <div className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            title="Voltar ao menu de ações"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-rose-600" />
              Registrar Parada
            </h2>
            <p className="text-xs text-slate-500">
              Lançamento operacional de paralisação de equipamento(s)
            </p>
          </div>
        </div>
      </div>

      {!isOficiosApiConfigured() && (
        <div className="mx-6 mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-800">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">Integração com Controle de Ofícios ainda não configurada.</span>
            A variável pública <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-900">VITE_OFICIOS_API_URL</code> deve conter a URL do Web App do Google Apps Script publicado para sincronizar com a planilha real.
          </div>
        </div>
      )}

      {equipamentosError && isOficiosApiConfigured() && (
        <div className="mx-6 mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">Não foi possível carregar a lista de equipamentos:</span>
            {equipamentosError}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mx-6 mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">Erro no salvamento:</span>
            {errorMessage}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Alerta Informativo de ocorrência em aberto para códigos selecionados */}
        {codesWithOpenOccurrences.length > 0 && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 animate-fadeIn">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">ATENÇÃO:</span> Existem ocorrências em aberto para o(s) equipamento(s):{' '}
              <span className="font-mono font-bold uppercase">{codesWithOpenOccurrences.join(', ')}</span>.{' '}
              Isto não impede o registro de uma nova parada legítima.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Campo: CÓDIGO (Seleção Múltipla) */}
          <div className="sm:col-span-2 space-y-2">
            <AutocompleteField
              id="campo-codigo"
              label="CÓDIGO(S) DO(S) EQUIPAMENTO(S)"
              value={currentCodigoInput}
              options={equipamentosList.filter((c) => !selectedCodigos.includes(c.toUpperCase()))}
              onChange={(val) => handleSelectCodigo(val)}
              placeholder={
                isLoadingEquipamentos
                  ? 'Carregando lista de equipamentos...'
                  : equipamentosError
                  ? 'Lista indisponível (configuração pendente)'
                  : 'Pesquise e selecione os equipamentos (ex: KBH, 520)...'
              }
              required={selectedCodigos.length === 0}
              disabled={isLoadingEquipamentos || isSubmitting || !!equipamentosError}
              helpText={
                equipamentosError
                  ? 'Aguardando configuração de VITE_OFICIOS_API_URL para carregar MATRIZ!D2:Z6152.'
                  : 'Pesquisa por CONTÉM. Selecione um ou mais equipamentos dos contratos 2740/24, 2741/24 e 2742/24.'
              }
              error={errors.codigo}
            />

            {/* Chips de Equipamentos Selecionados */}
            {selectedCodigos.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Equipamentos Selecionados ({selectedCodigos.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCodigos([])}
                    disabled={isSubmitting}
                    className="text-[11px] text-slate-500 hover:text-rose-600 font-semibold cursor-pointer transition-colors"
                  >
                    Limpar todos
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCodigos.map((cod) => (
                    <span
                      key={cod}
                      className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 uppercase shadow-2xs"
                    >
                      {cod}
                      <button
                        type="button"
                        onClick={() => handleRemoveCodigo(cod)}
                        disabled={isSubmitting}
                        className="text-slate-400 hover:text-rose-600 rounded-md p-0.5 transition-colors cursor-pointer"
                        title={`Remover ${cod}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Campo: NÚMERO DO OFÍCIO DE PARADA */}
          <div>
            <label
              htmlFor="campo-oficio-parada"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              NÚMERO DO OFÍCIO DE PARADA <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="relative">
              <input
                id="campo-oficio-parada"
                type="text"
                value={oficioParada}
                onChange={(e) => setOficioParada(e.target.value)}
                placeholder="Ex: 043/25 ou 187/26"
                disabled={isSubmitting}
                className={`w-full px-3.5 py-2.5 bg-white text-slate-900 font-medium text-sm rounded-lg border shadow-2xs transition-all outline-none ${
                  errors.oficioParada
                    ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/20'
                    : 'border-slate-300 focus:border-slate-600 focus:ring-2 focus:ring-slate-100'
                } ${isSubmitting ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
              />
            </div>
            {errors.oficioParada ? (
              <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                <span>&bull;</span> {errors.oficioParada}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                Formato obrigatório número/ano (ex: 187/26). Preserva zeros.
              </p>
            )}
          </div>

          {/* Campo: DATA DO OFÍCIO */}
          <div>
            <label
              htmlFor="campo-informado-i"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              DATA DO OFÍCIO <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              id="campo-informado-i"
              type="date"
              value={informadoI}
              onChange={(e) => setInformadoI(e.target.value)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker?.();
                } catch {
                  // Fallback nativo silencioso se não suportado ou bloqueado
                }
              }}
              disabled={isSubmitting}
              className={`w-full px-3.5 py-2.5 bg-white text-slate-900 font-medium text-sm rounded-lg border shadow-2xs transition-all outline-none cursor-pointer ${
                errors.informadoI
                  ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/20'
                  : 'border-slate-300 focus:border-slate-600 focus:ring-2 focus:ring-slate-100'
              } ${isSubmitting ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
            />
            {errors.informadoI && (
              <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                <span>&bull;</span> {errors.informadoI}
              </p>
            )}
          </div>

          {/* Campo: DATA DA PARADA */}
          <div>
            <label
              htmlFor="campo-data-parada-i"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              DATA DA PARADA <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              id="campo-data-parada-i"
              type="date"
              value={dataParadaI}
              onChange={(e) => setDataParadaI(e.target.value)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker?.();
                } catch {
                  // Fallback nativo silencioso se não suportado ou bloqueado
                }
              }}
              disabled={isSubmitting}
              className={`w-full px-3.5 py-2.5 bg-white text-slate-900 font-medium text-sm rounded-lg border shadow-2xs transition-all outline-none cursor-pointer ${
                errors.dataParadaI
                  ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/20'
                  : 'border-slate-300 focus:border-slate-600 focus:ring-2 focus:ring-slate-100'
              } ${isSubmitting ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
            />
            {errors.dataParadaI && (
              <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                <span>&bull;</span> {errors.dataParadaI}
              </p>
            )}
          </div>

          {/* Campo: MOTIVO */}
          <div>
            <AutocompleteField
              id="campo-motivo"
              label="MOTIVO"
              value={motivo}
              options={MOTIVOS_OFICIAIS as unknown as string[]}
              onChange={(val) => setMotivo(val)}
              placeholder="Pesquise o motivo oficial..."
              required
              disabled={isSubmitting}
              helpText="Lista oficial de 26 motivos homologados."
              error={errors.motivo}
            />
          </div>

          {/* Campo: HORÁRIO DO VANDALISMO (Aparece SOMENTE se VANDALISMO/FURTO) */}
          {isVandalismo && (
            <div className="sm:col-span-2 p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-1.5 animate-fadeIn">
              <label
                htmlFor="campo-horario-vandalismo"
                className="block text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-rose-600" />
                HORÁRIO DO VANDALISMO <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                id="campo-horario-vandalismo"
                type="time"
                value={horarioVandalismo}
                onChange={(e) => setHorarioVandalismo(e.target.value)}
                disabled={isSubmitting}
                className={`w-full sm:w-64 px-3.5 py-2.5 bg-white text-slate-900 font-medium text-sm rounded-lg border shadow-2xs transition-all outline-none ${
                  errors.horarioVandalismo
                    ? 'border-rose-400 ring-2 ring-rose-100'
                    : 'border-rose-300 focus:border-rose-600 focus:ring-2 focus:ring-rose-100'
                }`}
              />
              {errors.horarioVandalismo ? (
                <p className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                  <span>&bull;</span> {errors.horarioVandalismo}
                </p>
              ) : (
                <p className="text-[11px] text-rose-700">
                  Campo obrigatório exclusivamente para ocorrências com motivo VANDALISMO/FURTO.
                </p>
              )}
            </div>
          )}

          {/* Campo: OBSERVAÇÃO (OPCIONAL) */}
          <div className="sm:col-span-2">
            <label
              htmlFor="campo-observacao"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              OBSERVAÇÃO (OPCIONAL)
            </label>
            <textarea
              id="campo-observacao"
              rows={3}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Informações operacionais adicionais relevantes para todos os equipamentos selecionados..."
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 bg-white text-slate-900 font-medium text-sm rounded-lg border border-slate-300 focus:border-slate-600 focus:ring-2 focus:ring-slate-100 shadow-2xs transition-all outline-none resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gravando {selectedCodigos.length > 1 ? `${selectedCodigos.length} Paradas` : 'Parada'}...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Salvar Parada {selectedCodigos.length > 1 ? `(${selectedCodigos.length})` : ''}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
