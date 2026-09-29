import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  Info,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  OcorrenciaAberta,
  OcorrenciaRetornoPayload,
} from '../../types/controleOficios';
import {
  fetchOcorrenciasAbertas,
  isOficiosApiConfigured,
  registrarRetorno,
} from '../../services/oficiosService';
import { formatDateBR } from '../../utils/dateUtils';
import { isValidOficioFormat } from './RegistrarParadaForm';

interface RegistrarRetornoProps {
  onBack: () => void;
}

interface SuccessClosedSummary {
  codigo: string;
  oficioRetorno: string;
  retornoF: string;
}

export const RegistrarRetorno: React.FC<RegistrarRetornoProps> = ({ onBack }) => {
  // Navigation inside Retorno (list view vs form view vs confirmation view)
  const [selectedOcorrencia, setSelectedOcorrencia] = useState<OcorrenciaAberta | null>(null);
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaAberta[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form Fields for Return
  const [oficioRetorno, setOficioRetorno] = useState('');
  const [informadoF, setInformadoF] = useState('');
  const [retornoF, setRetornoF] = useState('');
  const [complementoObservacao, setComplementoObservacao] = useState('');

  // Form Submission & Confirmation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successClosedData, setSuccessClosedData] = useState<SuccessClosedSummary | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadOcorrencias = async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const list = await fetchOcorrenciasAbertas();
      setOcorrencias(list);
    } catch (err: any) {
      setListError(err.message || 'Erro ao carregar lista de ocorrências abertas.');
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadOcorrencias();
  }, []);

  // Filtro de busca na lista de ocorrências abertas (preservado durante toda a navegação)
  const filteredOcorrencias = useMemo(() => {
    if (!searchTerm.trim()) return ocorrencias;
    const term = searchTerm.trim().toLowerCase();

    return ocorrencias.filter((oc) => {
      const matchCodigo = oc.codigo.toLowerCase().includes(term);
      const matchOficio = oc.oficioParada.toLowerCase().includes(term);
      const matchData =
        oc.dataParadaI.toLowerCase().includes(term) ||
        formatDateBR(oc.dataParadaI).toLowerCase().includes(term);
      const matchMotivo = oc.motivo.toLowerCase().includes(term);
      const matchObs = (oc.observacao || '').toLowerCase().includes(term);
      return matchCodigo || matchOficio || matchData || matchMotivo || matchObs;
    });
  }, [ocorrencias, searchTerm]);

  const handleSelectOcorrencia = (oc: OcorrenciaAberta) => {
    setSelectedOcorrencia(oc);
    setOficioRetorno('');
    setInformadoF('');
    setRetornoF('');
    setComplementoObservacao('');
    setFormError(null);
    setErrors({});
    setSuccessClosedData(null);
  };

  const handleBackToList = () => {
    setSelectedOcorrencia(null);
    setFormError(null);
    setErrors({});
    setSuccessClosedData(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!oficioRetorno.trim()) {
      newErrors.oficioRetorno = 'O ofício de retorno é obrigatório.';
    } else if (!isValidOficioFormat(oficioRetorno)) {
      newErrors.oficioRetorno = 'Informe o ofício no formato número/ano. Ex.: 187/26.';
    }

    if (!informadoF.trim()) {
      newErrors.informadoF = 'A data de informação do retorno é obrigatória.';
    }
    if (!retornoF.trim()) {
      newErrors.retornoF = 'A data efetiva de retorno é obrigatória.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitRetorno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOcorrencia) return;

    setFormError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const payload: OcorrenciaRetornoPayload = {
      idControle: selectedOcorrencia.idControle,
      codigo: selectedOcorrencia.codigo,
      oficioParada: selectedOcorrencia.oficioParada,
      dataParadaI: selectedOcorrencia.dataParadaI,
      oficioRetorno: oficioRetorno.trim(),
      informadoF: informadoF.trim(),
      retornoF: retornoF.trim(),
      ...(complementoObservacao.trim()
        ? { complementoObservacao: complementoObservacao.trim() }
        : {}),
    };

    try {
      const response = await registrarRetorno(payload);

      if (response.ok) {
        // Guarda resumo do retorno e exibe tela de confirmação (sem retorno automático)
        setSuccessClosedData({
          codigo: selectedOcorrencia.codigo,
          oficioRetorno: oficioRetorno.trim(),
          retornoF: retornoF.trim(),
        });
        setSelectedOcorrencia(null);
        // Atualiza a lista em segundo plano para que a ocorrência encerrada desapareça
        loadOcorrencias();
      } else {
        setFormError(
          response.error?.message ||
            'Não foi possível registrar o retorno. Verifique os dados.'
        );
      }
    } catch (err: any) {
      setFormError(
        err.message || 'Erro inesperado ao salvar retorno.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // VIEW 3: CONFIRMAÇÃO VISÍVEL APÓS SALVAR RETORNO
  // ==========================================
  if (successClosedData) {
    return (
      <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs animate-fadeIn">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center text-emerald-600 shadow-2xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900">
              Retorno Registrado com Sucesso!
            </h3>
            <p className="text-sm text-slate-700 font-medium">
              A ocorrência do equipamento{' '}
              <span className="font-mono font-bold text-slate-900 uppercase">
                {successClosedData.codigo}
              </span>{' '}
              foi registrada com sucesso.
            </p>
          </div>

          {/* Resumo do Retorno Gravado */}
          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5 mt-4 text-xs sm:text-sm">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Equipamento:</span>
              <span className="font-bold text-slate-900 uppercase font-mono">{successClosedData.codigo}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Ofício de Retorno:</span>
              <span className="font-bold text-slate-900">{successClosedData.oficioRetorno}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Data de Retorno:</span>
              <span className="font-semibold text-slate-900">{formatDateBR(successClosedData.retornoF)}</span>
            </div>
          </div>

          <div className="pt-4 w-full">
            <button
              type="button"
              onClick={() => {
                setSuccessClosedData(null);
                setSelectedOcorrencia(null);
              }}
              className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Ocorrências em Aberto
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: FORMULÁRIO DE RETORNO DA OCORRÊNCIA SELECIONADA
  // ==========================================
  if (selectedOcorrencia) {
    return (
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden animate-fadeIn">
        {/* Top Header Card */}
        <div className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackToList}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              title="Voltar para a lista de ocorrências"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-600" />
                Registrar Retorno
              </h2>
              <p className="text-xs text-slate-500">
                Complementando a ocorrência aberta do equipamento{' '}
                <span className="font-bold text-slate-800 uppercase font-mono">
                  {selectedOcorrencia.codigo}
                </span>
              </p>
            </div>
          </div>
        </div>

        {formError && (
          <div className="mx-6 mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Falha no registro:</span>
              {formError}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmitRetorno} className="p-6 space-y-6">
          {/* Seção 1: DADOS DA PARADA (SOMENTE LEITURA) */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4.5 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <ShieldCheck className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Dados Originais da Parada (Somente Leitura)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block font-medium">CÓDIGO DO EQUIPAMENTO:</span>
                <span className="font-bold text-slate-900 text-sm uppercase font-mono">
                  {selectedOcorrencia.codigo}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">NÚMERO DO OFÍCIO DE PARADA:</span>
                <span className="font-semibold text-slate-900">
                  {selectedOcorrencia.oficioParada || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">DATA DA PARADA:</span>
                <span className="font-semibold text-slate-900">
                  {formatDateBR(selectedOcorrencia.dataParadaI) || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">DATA DO OFÍCIO:</span>
                <span className="font-semibold text-slate-900">
                  {formatDateBR(selectedOcorrencia.informadoI) || '—'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 block font-medium">MOTIVO:</span>
                <span className="font-semibold text-slate-900">
                  {selectedOcorrencia.motivo}
                </span>
              </div>
              {selectedOcorrencia.horarioVandalismo && (
                <div className="sm:col-span-3 flex items-center gap-1.5 text-rose-700 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>HORÁRIO DO VANDALISMO: {selectedOcorrencia.horarioVandalismo}</span>
                </div>
              )}
            </div>

            {/* Observação Anterior Existente */}
            {selectedOcorrencia.observacao && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 block text-[11px] font-medium mb-1">
                  OBSERVAÇÃO:
                </span>
                <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 whitespace-pre-wrap">
                  {selectedOcorrencia.observacao}
                </div>
              </div>
            )}
          </div>

          {/* Seção 2: CAMPOS EDITÁVEIS DO RETORNO */}
          <div className="space-y-4 pt-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              Campos do Retorno
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Campo: NÚMERO DO OFÍCIO DE RETORNO */}
              <div>
                <label
                  htmlFor="campo-oficio-retorno"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  NÚMERO DO OFÍCIO DE RETORNO <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  id="campo-oficio-retorno"
                  type="text"
                  value={oficioRetorno}
                  onChange={(e) => setOficioRetorno(e.target.value)}
                  placeholder="Ex: 088/25 ou 187/26"
                  disabled={isSubmitting}
                  className={`w-full px-3.5 py-2.5 bg-white text-slate-900 font-medium text-sm rounded-lg border shadow-2xs transition-all outline-none ${
                    errors.oficioRetorno
                      ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/20'
                      : 'border-slate-300 focus:border-slate-600 focus:ring-2 focus:ring-slate-100'
                  } ${isSubmitting ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                />
                {errors.oficioRetorno ? (
                  <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <span>&bull;</span> {errors.oficioRetorno}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    Formato número/ano (ex: 187/26). Preserva zeros.
                  </p>
                )}
              </div>

              {/* Campo: DATA DO OFÍCIO */}
              <div>
                <label
                  htmlFor="campo-informado-f"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  DATA DO OFÍCIO <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  id="campo-informado-f"
                  type="date"
                  value={informadoF}
                  onChange={(e) => setInformadoF(e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full px-3.5 py-2.5 bg-white text-slate-900 font-medium text-sm rounded-lg border shadow-2xs transition-all outline-none ${
                    errors.informadoF
                      ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/20'
                      : 'border-slate-300 focus:border-slate-600 focus:ring-2 focus:ring-slate-100'
                  } ${isSubmitting ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                />
                {errors.informadoF && (
                  <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <span>&bull;</span> {errors.informadoF}
                  </p>
                )}
              </div>

              {/* Campo: DATA DO RETORNO */}
              <div>
                <label
                  htmlFor="campo-retorno-f"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  DATA DO RETORNO <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  id="campo-retorno-f"
                  type="date"
                  value={retornoF}
                  onChange={(e) => setRetornoF(e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full px-3.5 py-2.5 bg-white text-slate-900 font-medium text-sm rounded-lg border shadow-2xs transition-all outline-none ${
                    errors.retornoF
                      ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/20'
                      : 'border-slate-300 focus:border-slate-600 focus:ring-2 focus:ring-slate-100'
                  } ${isSubmitting ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                />
                {errors.retornoF && (
                  <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <span>&bull;</span> {errors.retornoF}
                  </p>
                )}
              </div>

              {/* COMPLEMENTAR OBSERVAÇÃO (OPCIONAL) */}
              <div className="sm:col-span-3">
                <label
                  htmlFor="campo-complemento-obs"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  COMPLEMENTAR OBSERVAÇÃO (OPCIONAL)
                </label>
                <textarea
                  id="campo-complemento-obs"
                  rows={2}
                  value={complementoObservacao}
                  onChange={(e) => setComplementoObservacao(e.target.value)}
                  placeholder="Ex: Equipamento restabelecido e operando normalmente."
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 bg-white text-slate-900 font-medium text-sm rounded-lg border border-slate-300 focus:border-slate-600 focus:ring-2 focus:ring-slate-100 shadow-2xs transition-all outline-none resize-none"
                />
                <p className="mt-1 text-xs text-slate-500">
                  O novo texto será adicionado após a observação existente com quebra de linha, preservando o histórico.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleBackToList}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer"
            >
              Voltar à Lista
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registrando Retorno...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar Retorno
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: LISTA DE OCORRÊNCIAS EM ABERTO
  // ==========================================
  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fadeIn">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Voltar ao menu de ações"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-600" />
              Ocorrências em Aberto
            </h2>
            <p className="text-xs text-slate-500">
              Selecione uma ocorrência para registrar o ofício e data de retorno
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadOcorrencias}
          disabled={isLoadingList}
          className="self-start sm:self-auto px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin' : ''}`} />
          Atualizar Lista
        </button>
      </div>

      {!isOficiosApiConfigured() && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-800">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">Integração com Controle de Ofícios ainda não configurada.</span>
            A variável pública <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-900">VITE_OFICIOS_API_URL</code> deve conter a URL do Web App do Google Apps Script publicado para sincronizar com a planilha real.
          </div>
        </div>
      )}

      {listError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">Erro ao consultar ocorrências:</span>
            {listError}
          </div>
        </div>
      )}

      {/* Search Input Filter (Preservado) */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Pesquisar por Código, Ofício, Data ou Motivo..."
          className="w-full pl-10 pr-10 py-3 bg-white text-slate-900 font-medium text-sm rounded-xl border border-slate-200 shadow-2xs focus:border-slate-600 focus:ring-2 focus:ring-slate-100 transition-all outline-none"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            title="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Occurrences List Cards */}
      {isLoadingList ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">
            Consultando ocorrências em aberto...
          </p>
        </div>
      ) : filteredOcorrencias.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-2">
          <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            {searchTerm ? 'Nenhuma ocorrência encontrada para esta busca.' : 'Nenhuma ocorrência em aberto no momento.'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm
              ? 'Tente buscar por outro código de equipamento ou número de ofício.'
              : 'Todos os equipamentos paralisados já possuem retorno registrado.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredOcorrencias.map((oc, idx) => (
            <div
              key={oc.idControle || `${oc.codigo}-${oc.oficioParada}-${oc.dataParadaI}-${idx}`}
              onClick={() => handleSelectOcorrencia(oc)}
              className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-emerald-300 rounded-xl p-4.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 group-hover:bg-emerald-50 group-hover:text-emerald-900 px-2.5 py-1 rounded-lg transition-colors uppercase">
                    {oc.codigo}
                  </span>
                  <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                    Parada Aberta
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Ofício Parada:</span>
                    <span className="font-semibold text-slate-800">{oc.oficioParada || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Data Parada:</span>
                    <span className="font-medium text-slate-800 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDateBR(oc.dataParadaI) || '—'}
                    </span>
                  </div>
                  <div className="pt-1 text-slate-700">
                    <span className="text-slate-400 block text-[11px] mb-0.5">Motivo:</span>
                    <span className="font-medium bg-slate-50 p-1.5 rounded block text-slate-800 line-clamp-2">
                      {oc.motivo}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-bold group-hover:text-emerald-800">
                <span>Registrar Retorno &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
