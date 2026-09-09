import React, { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Building,
  MapPin,
  UserCheck,
  User,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileDown,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import {
  SmvFormData,
  TipoPavimento,
  ValidationErrors,
} from '../types/smv';
import {
  SERVIDORES_LISTA,
  ADMINISTRACOES_REGIONAIS,
  TIPOS_SMV,
  TIPOS_PAVIMENTO,
  AREA_FIXA,
  GERENTE_FIXO,
} from '../data/constants';
import {
  getPrefixoByTipoSMV,
  getEncaminhamentoByTipoSMV,
  formatDateToBR,
  validateForm,
  formatFullSmvNumber,
  padCentralNumber,
} from '../lib/smvRules';
import { generatePdf } from '../lib/generatePdf';
import { AutocompleteSelect, AutocompleteOption } from './AutocompleteSelect';
import { PhotoUploader } from './PhotoUploader';
import { PdfPreviewModal } from './PdfPreviewModal';

export const SmvForm: React.FC = () => {
  const currentYear = new Date().getFullYear();

  // Initial empty form state - completely empty / clean
  const getInitialFormData = (): SmvFormData => ({
    tipoSmv: '',
    numeroCentral: '',
    ano: currentYear,
    solicitante: null,
    area: AREA_FIXA,
    administracaoRegional: '',
    servicoReferente: '',
    logradouro: '',
    bairro: '',
    localizacao: '',
    tipoPavimento: '',
    fotos: [],
    responsavelTecnico: null,
    gerenteArea: GERENTE_FIXO,
    dataConfeccao: formatDateToBR(),
    encaminhamento: '',
  });

  // Form State
  const [formKey, setFormKey] = useState<number>(0);
  const [formData, setFormData] = useState<SmvFormData>(getInitialFormData());

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [validation, setValidation] = useState<{
    isValid: boolean;
    errors: ValidationErrors;
  }>({ isValid: false, errors: {} });

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Recalculate encaminhamento automatically when tipoSmv changes
  useEffect(() => {
    const autoEncaminhamento = getEncaminhamentoByTipoSMV(formData.tipoSmv);
    setFormData((prev) => ({
      ...prev,
      encaminhamento: autoEncaminhamento,
    }));
  }, [formData.tipoSmv]);

  // Recalculate validation whenever formData updates
  useEffect(() => {
    const result = validateForm(formData);
    setValidation(result);
  }, [formData]);

  // Helper to trigger padding on central number
  const ensurePaddedNumber = () => {
    if (formData.numeroCentral) {
      setFormData((prev) => ({
        ...prev,
        numeroCentral: padCentralNumber(prev.numeroCentral),
      }));
    }
  };

  // Scroll to the first error field in logical form order and set focus
  const scrollToFirstError = (errors: ValidationErrors) => {
    const fieldOrder: (keyof ValidationErrors)[] = [
      'tipoSmv',
      'numeroCentral',
      'solicitante',
      'responsavelTecnico',
      'administracaoRegional',
      'tipoPavimento',
      'servicoReferente',
      'logradouro',
      'bairro',
      'localizacao',
      'fotos',
      'dataConfeccao',
    ];

    const firstErrorKey = fieldOrder.find((key) => errors[key]);
    if (!firstErrorKey) return;

    const elementIdMap: Record<keyof ValidationErrors, string> = {
      tipoSmv: 'field-tipoSmv',
      numeroCentral: 'numeroCentral',
      solicitante: 'solicitante',
      responsavelTecnico: 'responsavelTecnico',
      administracaoRegional: 'administracaoRegional',
      tipoPavimento: 'tipoPavimento',
      servicoReferente: 'servicoReferente',
      logradouro: 'logradouro',
      bairro: 'bairro',
      localizacao: 'localizacao',
      fotos: 'photo-file-input',
      dataConfeccao: 'dataConfeccao',
    };

    const targetId = elementIdMap[firstErrorKey];
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if ('focus' in el && typeof (el as any).focus === 'function') {
        setTimeout(() => (el as any).focus(), 300);
      }
    }
  };

  // Handler for text inputs converting to UPPERCASE
  const handleUppercaseTextChange = (
    field: keyof SmvFormData,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value.toUpperCase(),
    }));
  };

  // Handler for Solicitante selection: automatically copies identicamente to Responsável Técnico (locked)
  const handleSolicitanteChange = (servidorId: string) => {
    const found = SERVIDORES_LISTA.find((s) => s.id === servidorId) || null;
    setFormData((prev) => ({
      ...prev,
      solicitante: found,
      responsavelTecnico: found,
    }));
  };

  // Action Triggers with Validation & Smooth Scrolling
  const handleOpenPreview = () => {
    setHasAttemptedSubmit(true);
    ensurePaddedNumber();
    const result = validateForm(formData);
    if (result.isValid) {
      setIsPreviewOpen(true);
    } else {
      scrollToFirstError(result.errors);
    }
  };

  const handleDirectDownloadPdf = async () => {
    setHasAttemptedSubmit(true);
    ensurePaddedNumber();
    const result = validateForm(formData);
    if (result.isValid) {
      const res = await generatePdf({ formData });
      setActionSuccessMsg(`Documento "${res.fileName}" baixado com sucesso!`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } else {
      scrollToFirstError(result.errors);
    }
  };

  const handleResetForm = () => {
    if (
      window.confirm(
        'Tem certeza de que deseja limpar todos os campos e zerar o formulário?'
      )
    ) {
      // Revoke all created photo object URLs to prevent memory leak
      formData.fotos.forEach((f) => {
        if (f.objectUrl) URL.revokeObjectURL(f.objectUrl);
      });

      // Clear HTML file input element if present
      const fileInput = document.getElementById('photo-file-input') as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = '';
      }

      // Reset all states to initial zero state and increment key to reinitialize all child components
      setFormData(getInitialFormData());
      setFormKey((prev) => prev + 1);
      setHasAttemptedSubmit(false);
      setActionSuccessMsg(null);
      setValidation({ isValid: false, errors: {} });
      setIsPreviewOpen(false);

      // Scroll smoothly to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prefixo = getPrefixoByTipoSMV(formData.tipoSmv);
  const fullSmvNumberFormatted = formatFullSmvNumber(
    prefixo,
    formData.numeroCentral,
    formData.ano
  );

  // Convert Servidores options for AutocompleteSelect
  const servidorOptions: AutocompleteOption[] = SERVIDORES_LISTA.map((s) => ({
    value: s.id,
    label: s.formattedLabel,
    sublabel: `Matrícula Institucional: ${s.matriculaBT}`,
  }));

  // Convert Administrações Regionais options for AutocompleteSelect
  const regionalOptions: AutocompleteOption[] = ADMINISTRACOES_REGIONAIS.map(
    (reg) => ({
      value: reg,
      label: reg,
    })
  );

  const getFieldError = (field: keyof ValidationErrors): string | undefined => {
    return hasAttemptedSubmit ? validation.errors[field] : undefined;
  };

  // Helper classes for field borders: reddish when empty/pending, turning normal upon filling
  const getFieldBorderClasses = (field: keyof ValidationErrors, isEmpty: boolean) => {
    const err = getFieldError(field);
    if (err) {
      return 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/20';
    }
    if (isEmpty) {
      return 'border-rose-300 bg-rose-50/15 focus:border-slate-600 focus:ring-2 focus:ring-slate-100';
    }
    return 'border-slate-300 focus:border-slate-600 focus:ring-2 focus:ring-slate-100';
  };

  return (
    <div key={formKey} className="w-full max-w-5xl mx-auto py-6 px-4 sm:px-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Page Title & Header Banner - Minimalist, light/neutral styling, NO logo here */}
        <div className="bg-slate-50 border-b border-slate-200 p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Confecção de SMV
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-normal">
              Formulário de preenchimento de Solicitação de Manutenção de Vias
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Limpar todos os campos e zerar o formulário"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Limpar Campos
            </button>

            <div className="bg-white border border-slate-200 px-3.5 py-1.5 rounded-lg text-right shadow-2xs">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Número SMV
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-slate-800">
                {fullSmvNumberFormatted}
              </span>
            </div>
          </div>
        </div>

        {/* Main Form Body */}
        <form onSubmit={(e) => e.preventDefault()} className="p-6 sm:p-8 space-y-8">
          {/* Section 1: Identificação da SMV */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <FileText className="w-4 h-4 text-slate-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Identificação do Documento e Tipo
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* TIPO DE SMV */}
              <div id="field-tipoSmv">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Tipo de SMV <span className="text-rose-500 font-bold">*</span>
                </label>
                <div
                  className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-1 rounded-xl transition-all ${
                    getFieldError('tipoSmv')
                      ? 'border border-rose-400 bg-rose-50/30'
                      : !formData.tipoSmv
                      ? 'border border-rose-200 bg-rose-50/15'
                      : ''
                  }`}
                >
                  {TIPOS_SMV.map((tipo) => {
                    const isSelected = formData.tipoSmv === tipo;
                    return (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, tipoSmv: tipo }))
                        }
                        className={`p-3 rounded-lg border text-xs font-bold transition-all text-center uppercase flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>{tipo}</span>
                        <span className={`text-[10px] font-mono ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          Prefixo: {getPrefixoByTipoSMV(tipo)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {getFieldError('tipoSmv') && (
                  <p className="mt-1.5 text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getFieldError('tipoSmv')}
                  </p>
                )}
              </div>

              {/* NÚMERO DA SMV */}
              <div>
                <label
                  htmlFor="numeroCentral"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
                >
                  Número da SMV <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="bg-slate-200 font-mono font-bold text-slate-800 text-sm px-2.5 py-1.5 rounded border border-slate-300 select-none shrink-0">
                    {prefixo}-
                  </span>
                  <input
                    id="numeroCentral"
                    type="text"
                    maxLength={6}
                    value={formData.numeroCentral}
                    onChange={(e) => {
                      const numOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setFormData((prev) => ({
                        ...prev,
                        numeroCentral: numOnly,
                      }));
                    }}
                    onBlur={ensurePaddedNumber}
                    placeholder="000053"
                    aria-invalid={!!getFieldError('numeroCentral')}
                    className={`w-full py-1.5 px-3 bg-white font-mono text-base font-extrabold text-slate-900 border rounded shadow-2xs focus:outline-none transition-all ${
                      getFieldBorderClasses('numeroCentral', !formData.numeroCentral)
                    }`}
                  />
                  <span className="bg-slate-200 font-mono font-bold text-slate-800 text-sm px-2.5 py-1.5 rounded border border-slate-300 select-none shrink-0">
                    /{formData.ano}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Preencha os 6 dígitos numéricos centrais (ex: 000053).
                </p>
                {getFieldError('numeroCentral') && (
                  <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getFieldError('numeroCentral')}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Section 2: Pessoas e Estrutura Institucional */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <UserCheck className="w-4 h-4 text-slate-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Solicitante, Área e Responsáveis
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SOLICITANTE */}
              <AutocompleteSelect
                id="solicitante"
                label="Solicitante"
                options={servidorOptions}
                value={formData.solicitante?.id || ''}
                onChange={handleSolicitanteChange}
                placeholder="DIGITE PARA BUSCAR SOLICITANTE..."
                required
                error={getFieldError('solicitante')}
                isInitialEmptyPending={!formData.solicitante}
                helpText="Ao selecionar, preenche e sincroniza identicamente o Responsável Técnico."
              />

              {/* ÁREA */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Área
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={formData.area}
                    disabled
                    readOnly
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-lg border border-slate-200 cursor-not-allowed uppercase"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Valor fixo institucional da gerência.
                </p>
              </div>

              {/* RESPONSÁVEL TÉCNICO - TRAVADO E PREENCHIDO IDENTICAMENTE AO SOLICITANTE */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Responsável Técnico <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={
                      formData.responsavelTecnico
                        ? formData.responsavelTecnico.formattedLabel
                        : ''
                    }
                    placeholder="PREENCHIDO AUTOMATICAMENTE PELO SOLICITANTE..."
                    disabled
                    readOnly
                    className={`w-full pl-9 pr-3 py-2.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-lg border cursor-not-allowed uppercase placeholder:normal-case placeholder:text-slate-400 ${
                      !formData.responsavelTecnico ? 'border-rose-300' : 'border-slate-200'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Campo travado: preenchido identicamente ao Solicitante.
                </p>
                {getFieldError('responsavelTecnico') && (
                  <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getFieldError('responsavelTecnico')}
                  </p>
                )}
              </div>

              {/* GERENTE DA ÁREA */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Gerente da Área
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={formData.gerenteArea}
                    disabled
                    readOnly
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-lg border border-slate-200 cursor-not-allowed uppercase"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Valor fixo institucional.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Dados do Local e Serviço */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <MapPin className="w-4 h-4 text-slate-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Localização e Detalhamento do Serviço
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ADMINISTRAÇÃO REGIONAL */}
              <AutocompleteSelect
                id="administracaoRegional"
                label="Administração Regional"
                options={regionalOptions}
                value={formData.administracaoRegional}
                onChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    administracaoRegional: val,
                  }))
                }
                placeholder="SELECIONE OU DIGITE A REGIONAL..."
                required
                error={getFieldError('administracaoRegional')}
                isInitialEmptyPending={!formData.administracaoRegional}
              />

              {/* TIPO DE PAVIMENTO */}
              <div>
                <label
                  htmlFor="tipoPavimento"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Tipo de Pavimento <span className="text-rose-500 font-bold">*</span>
                </label>
                <select
                  id="tipoPavimento"
                  value={formData.tipoPavimento}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      tipoPavimento: e.target.value as TipoPavimento,
                    }))
                  }
                  aria-invalid={!!getFieldError('tipoPavimento')}
                  className={`w-full py-2.5 px-3 bg-white text-slate-900 font-semibold text-sm rounded-lg border shadow-2xs focus:outline-none transition-all uppercase ${
                    getFieldBorderClasses('tipoPavimento', !formData.tipoPavimento)
                  }`}
                >
                  <option value="">SELECIONE O PAVIMENTO...</option>
                  {TIPOS_PAVIMENTO.map((pav) => (
                    <option key={pav} value={pav}>
                      {pav}
                    </option>
                  ))}
                </select>
                {getFieldError('tipoPavimento') && (
                  <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getFieldError('tipoPavimento')}
                  </p>
                )}
              </div>
            </div>

            {/* SERVIÇO REFERENTE */}
            <div>
              <label
                htmlFor="servicoReferente"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Serviço Referente <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                id="servicoReferente"
                type="text"
                value={formData.servicoReferente}
                onChange={(e) =>
                  handleUppercaseTextChange('servicoReferente', e.target.value)
                }
                placeholder="EX.: PODA? SINALIZAÇÃO HORIZONTAL? SINALIZAÇÃO VERTICAL?"
                aria-invalid={!!getFieldError('servicoReferente')}
                className={`w-full py-2.5 px-3.5 bg-white text-slate-900 font-medium text-sm rounded-lg border shadow-2xs focus:outline-none transition-all uppercase placeholder:normal-case placeholder:text-slate-400 ${
                  getFieldBorderClasses('servicoReferente', !formData.servicoReferente)
                }`}
              />
              {getFieldError('servicoReferente') && (
                <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getFieldError('servicoReferente')}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* LOGRADOURO */}
              <div>
                <label
                  htmlFor="logradouro"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Logradouro <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  id="logradouro"
                  type="text"
                  value={formData.logradouro}
                  onChange={(e) =>
                    handleUppercaseTextChange('logradouro', e.target.value)
                  }
                  placeholder="EX.: AV. AMAZONAS - ESQ. R. CURITIBA"
                  aria-invalid={!!getFieldError('logradouro')}
                  className={`w-full py-2.5 px-3.5 bg-white text-slate-900 font-medium text-sm rounded-lg border shadow-2xs focus:outline-none transition-all uppercase placeholder:normal-case placeholder:text-slate-400 ${
                    getFieldBorderClasses('logradouro', !formData.logradouro)
                  }`}
                />
                {getFieldError('logradouro') && (
                  <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getFieldError('logradouro')}
                  </p>
                )}
              </div>

              {/* BAIRRO */}
              <div>
                <label
                  htmlFor="bairro"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Bairro <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  id="bairro"
                  type="text"
                  value={formData.bairro}
                  onChange={(e) =>
                    handleUppercaseTextChange('bairro', e.target.value)
                  }
                  placeholder="EX.: CENTRO"
                  aria-invalid={!!getFieldError('bairro')}
                  className={`w-full py-2.5 px-3.5 bg-white text-slate-900 font-medium text-sm rounded-lg border shadow-2xs focus:outline-none transition-all uppercase placeholder:normal-case placeholder:text-slate-400 ${
                    getFieldBorderClasses('bairro', !formData.bairro)
                  }`}
                />
                {getFieldError('bairro') && (
                  <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getFieldError('bairro')}
                  </p>
                )}
              </div>
            </div>

            {/* LOCALIZAÇÃO */}
            <div>
              <label
                htmlFor="localizacao"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Localização <span className="text-rose-500 font-bold">*</span>
              </label>
              <textarea
                id="localizacao"
                rows={2}
                value={formData.localizacao}
                onChange={(e) =>
                  handleUppercaseTextChange('localizacao', e.target.value)
                }
                placeholder="EX.: SENTIDO CENTRO/BAIRRO (E MAIORES ORIENTAÇÕES, SE HOUVER)"
                aria-invalid={!!getFieldError('localizacao')}
                className={`w-full py-2.5 px-3.5 bg-white text-slate-900 font-medium text-sm rounded-lg border shadow-2xs focus:outline-none transition-all uppercase placeholder:normal-case placeholder:text-slate-400 ${
                  getFieldBorderClasses('localizacao', !formData.localizacao)
                }`}
              />
              {getFieldError('localizacao') && (
                <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getFieldError('localizacao')}
                </p>
              )}
            </div>
          </section>

          {/* Section 4: Fotos / Croqui */}
          <section className="space-y-4">
            <PhotoUploader
              photos={formData.fotos}
              onChange={(fotos) => setFormData((prev) => ({ ...prev, fotos }))}
              error={getFieldError('fotos')}
              isInitialEmptyPending={formData.fotos.length === 0}
            />
          </section>

          {/* Section 5: Data e Encaminhamento */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <Calendar className="w-4 h-4 text-slate-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Data de Confecção e Encaminhamento
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DATA DE CONFECÇÃO */}
              <div>
                <label
                  htmlFor="dataConfeccao"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Data de Confecção <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    id="dataConfeccao"
                    type="text"
                    value={formData.dataConfeccao}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dataConfeccao: e.target.value,
                      }))
                    }
                    placeholder="DD/MM/AAAA"
                    aria-invalid={!!getFieldError('dataConfeccao')}
                    className={`w-full pl-9 pr-3.5 py-2.5 bg-white text-slate-900 font-semibold text-sm rounded-lg border shadow-2xs focus:outline-none transition-all ${
                      getFieldBorderClasses('dataConfeccao', !formData.dataConfeccao)
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Formato DD/MM/AAAA.
                </p>
                {getFieldError('dataConfeccao') && (
                  <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getFieldError('dataConfeccao')}
                  </p>
                )}
              </div>

              {/* ENCAMINHAMENTO / PARA */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Encaminhamento / Para
                </label>
                <input
                  type="text"
                  value={formData.encaminhamento || 'SELECIONE O TIPO DE SMV'}
                  disabled
                  readOnly
                  className="w-full py-2.5 px-3.5 bg-slate-100 text-slate-800 font-bold text-sm rounded-lg border border-slate-200 cursor-not-allowed uppercase"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Preenchido automaticamente de acordo com o Tipo de SMV.
                </p>
              </div>
            </div>
          </section>

          {/* Validation Summary Warning Box when errors exist */}
          {hasAttemptedSubmit && !validation.isValid && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-800 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Atenção: Existem campos obrigatórios pendentes ou inválidos</span>
              </div>
              <ul className="list-disc list-inside space-y-1 font-medium pl-1 text-rose-700">
                {Object.values(validation.errors).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Success Message Banner */}
          {actionSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Form Bottom Action Area */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Primary Action Button: VISUALIZAR PDF */}
                <button
                  id="btn-visualizar-pdf"
                  type="button"
                  onClick={handleOpenPreview}
                  className="px-7 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <Eye className="w-4 h-4" />
                  Visualizar PDF
                </button>

                {/* Direct Download PDF Button */}
                <button
                  type="button"
                  onClick={handleDirectDownloadPdf}
                  className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <FileDown className="w-4 h-4 text-slate-600" />
                  Baixar PDF
                </button>
              </div>

              <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Clique em "Visualizar PDF" para conferir a prévia do documento.</span>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* PDF Document Preview Modal */}
      <PdfPreviewModal
        formData={formData}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};

