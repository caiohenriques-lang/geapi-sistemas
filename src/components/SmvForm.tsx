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
  FileSpreadsheet,
  Layers,
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
import { generateExcel } from '../lib/generateExcel';
import { AutocompleteSelect, AutocompleteOption } from './AutocompleteSelect';
import { PhotoUploader } from './PhotoUploader';
import { PdfPreviewModal } from './PdfPreviewModal';

export const SmvForm: React.FC = () => {
  const currentYear = new Date().getFullYear();

  // Initial empty form state
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
  const [formData, setFormData] = useState<SmvFormData>(getInitialFormData());

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [responsavelTecnicoManual, setResponsavelTecnicoManual] = useState(false);
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

  // Handler for Solicitante selection: copies to Responsável Técnico ONLY ONCE if RT hasn't been manually set
  const handleSolicitanteChange = (servidorId: string) => {
    const found = SERVIDORES_LISTA.find((s) => s.id === servidorId) || null;
    setFormData((prev) => ({
      ...prev,
      solicitante: found,
      responsavelTecnico: responsavelTecnicoManual ? prev.responsavelTecnico : found,
    }));
  };

  // Handler for Responsável Técnico selection (marks as manually changed)
  const handleResponsavelTecnicoChange = (servidorId: string) => {
    const found = SERVIDORES_LISTA.find((s) => s.id === servidorId) || null;
    setResponsavelTecnicoManual(true);
    setFormData((prev) => ({
      ...prev,
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

  const handleDirectDownloadExcel = async () => {
    setHasAttemptedSubmit(true);
    ensurePaddedNumber();
    const result = validateForm(formData);
    if (result.isValid) {
      const res = await generateExcel({ formData });
      setActionSuccessMsg(`Planilha "${res.fileName}" baixada com sucesso!`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } else {
      scrollToFirstError(result.errors);
    }
  };

  const handleDirectDownloadBoth = async () => {
    setHasAttemptedSubmit(true);
    ensurePaddedNumber();
    const result = validateForm(formData);
    if (result.isValid) {
      const pdfRes = await generatePdf({ formData });
      const excelRes = await generateExcel({ formData });
      setActionSuccessMsg(`Documentos "${pdfRes.fileName}" e "${excelRes.fileName}" baixados com sucesso!`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } else {
      scrollToFirstError(result.errors);
    }
  };

  const handleResetForm = () => {
    if (
      window.confirm(
        'Tem certeza de que deseja limpar todos os dados preenchidos e iniciar uma nova SMV?'
      )
    ) {
      setFormData(getInitialFormData());
      setHasAttemptedSubmit(false);
      setResponsavelTecnicoManual(false);
      setActionSuccessMsg(null);
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

  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-4 sm:px-6">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Page Title & Header Banner */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/80 px-2.5 py-1 rounded border border-blue-800/60 uppercase">
              Formulário Oficial
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">
              Novo SMV
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
              Preencha os campos abaixo para gerar a Solicitação de Manutenção de Vias.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Limpar todos os campos"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              LIMPAR CAMPOS
            </button>

            <div className="bg-slate-800/90 border border-slate-700 p-3.5 rounded-xl text-right">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                NÚMERO SMV
              </span>
              <span className="text-lg font-mono font-black text-blue-300">
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
              <FileText className="w-5 h-5 text-blue-700" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                1. IDENTIFICAÇÃO DO DOCUMENTO E TIPO
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. TIPO DE SMV */}
              <div id="field-tipoSmv">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  1. TIPO DE SMV <span className="text-red-500 font-bold">*</span>
                </label>
                <div
                  className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-1 rounded-xl transition-all ${
                    getFieldError('tipoSmv')
                      ? 'border-2 border-red-500 bg-red-50/30'
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
                            ? 'bg-blue-700 text-white border-blue-700 shadow-sm ring-2 ring-blue-200'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        <span>{tipo}</span>
                        <span className="text-[10px] opacity-80 font-mono">
                          Prefixo: {getPrefixoByTipoSMV(tipo)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {getFieldError('tipoSmv') && (
                  <p className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getFieldError('tipoSmv')}
                  </p>
                )}
              </div>

              {/* 2. NÚMERO DA SMV */}
              <div>
                <label
                  htmlFor="numeroCentral"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
                >
                  2. NÚMERO DA SMV <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-300">
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
                    className={`w-full py-1.5 px-3 bg-white font-mono text-base font-extrabold text-slate-900 border rounded shadow-xs focus:outline-none transition-all ${
                      getFieldError('numeroCentral')
                        ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                    }`}
                  />
                  <span className="bg-slate-200 font-mono font-bold text-slate-800 text-sm px-2.5 py-1.5 rounded border border-slate-300 select-none shrink-0">
                    /{formData.ano}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Preencha exatamente 6 dígitos numéricos centrais (ex: 000053).
                </p>
                {getFieldError('numeroCentral') && (
                  <p className="mt-1 text-xs font-semibold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getFieldError('numeroCentral')}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Section 2: Pessoas e Estrutura Institucional */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <UserCheck className="w-5 h-5 text-blue-700" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                2. SOLICITANTE, ÁREA E RESPONSÁVEIS
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 3. SOLICITANTE */}
              <AutocompleteSelect
                id="solicitante"
                label="3. SOLICITANTE"
                options={servidorOptions}
                value={formData.solicitante?.id || ''}
                onChange={handleSolicitanteChange}
                placeholder="DIGITE PARA BUSCAR SOLICITANTE..."
                required
                error={getFieldError('solicitante')}
                helpText="Ao selecionar, preenche o Responsável Técnico caso não tenha sido alterado manualmente."
              />

              {/* 4. ÁREA */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  4. ÁREA
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
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-lg border border-slate-300 cursor-not-allowed uppercase"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Valor fixo institucional da gerência.
                </p>
              </div>

              {/* 12. RESPONSÁVEL TÉCNICO */}
              <AutocompleteSelect
                id="responsavelTecnico"
                label="12. RESPONSÁVEL TÉCNICO"
                options={servidorOptions}
                value={formData.responsavelTecnico?.id || ''}
                onChange={handleResponsavelTecnicoChange}
                placeholder="DIGITE PARA BUSCAR RESPONSÁVEL TÉCNICO..."
                required
                error={getFieldError('responsavelTecnico')}
                helpText="Pode ser alterado independentemente para outra pessoa da lista."
              />

              {/* 13. GERENTE DA ÁREA */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  13. GERENTE DA ÁREA
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
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-lg border border-slate-300 cursor-not-allowed uppercase"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Valor fixo não editável.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Dados do Local e Serviço */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <MapPin className="w-5 h-5 text-blue-700" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                3. LOCALIZAÇÃO E DETALHAMENTO DO SERVIÇO
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 5. ADMINISTRAÇÃO REGIONAL */}
              <AutocompleteSelect
                id="administracaoRegional"
                label="5. ADMINISTRAÇÃO REGIONAL"
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
              />

              {/* 10. TIPO DE PAVIMENTO */}
              <div>
                <label
                  htmlFor="tipoPavimento"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  10. TIPO DE PAVIMENTO <span className="text-red-500 font-bold">*</span>
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
                  className={`w-full py-2.5 px-3 bg-white text-slate-900 font-bold text-sm rounded-lg border shadow-xs focus:outline-none transition-all uppercase ${
                    getFieldError('tipoPavimento')
                      ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
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
                  <p className="mt-1 text-xs font-semibold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getFieldError('tipoPavimento')}
                  </p>
                )}
              </div>
            </div>

            {/* 6. SERVIÇO REFERENTE */}
            <div>
              <label
                htmlFor="servicoReferente"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                6. SERVIÇO REFERENTE <span className="text-red-500 font-bold">*</span>
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
                className={`w-full py-2.5 px-3.5 bg-white text-slate-900 font-medium text-sm rounded-lg border shadow-xs focus:outline-none transition-all uppercase placeholder:normal-case placeholder:text-slate-400 ${
                  getFieldError('servicoReferente')
                    ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                }`}
              />
              {getFieldError('servicoReferente') && (
                <p className="mt-1 text-xs font-semibold text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getFieldError('servicoReferente')}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 7. LOGRADOURO */}
              <div>
                <label
                  htmlFor="logradouro"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  7. LOGRADOURO <span className="text-red-500 font-bold">*</span>
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
                  className={`w-full py-2.5 px-3.5 bg-white text-slate-900 font-medium text-sm rounded-lg border shadow-xs focus:outline-none transition-all uppercase placeholder:normal-case placeholder:text-slate-400 ${
                    getFieldError('logradouro')
                      ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
                {getFieldError('logradouro') && (
                  <p className="mt-1 text-xs font-semibold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getFieldError('logradouro')}
                  </p>
                )}
              </div>

              {/* 8. BAIRRO */}
              <div>
                <label
                  htmlFor="bairro"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  8. BAIRRO <span className="text-red-500 font-bold">*</span>
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
                  className={`w-full py-2.5 px-3.5 bg-white text-slate-900 font-medium text-sm rounded-lg border shadow-xs focus:outline-none transition-all uppercase placeholder:normal-case placeholder:text-slate-400 ${
                    getFieldError('bairro')
                      ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
                {getFieldError('bairro') && (
                  <p className="mt-1 text-xs font-semibold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getFieldError('bairro')}
                  </p>
                )}
              </div>
            </div>

            {/* 9. LOCALIZAÇÃO */}
            <div>
              <label
                htmlFor="localizacao"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                9. LOCALIZAÇÃO <span className="text-red-500 font-bold">*</span>
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
                className={`w-full py-2.5 px-3.5 bg-white text-slate-900 font-medium text-sm rounded-lg border shadow-xs focus:outline-none transition-all uppercase placeholder:normal-case placeholder:text-slate-400 ${
                  getFieldError('localizacao')
                    ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                }`}
              />
              {getFieldError('localizacao') && (
                <p className="mt-1 text-xs font-semibold text-red-600 flex items-center gap-1">
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
            />
          </section>

          {/* Section 5: Data e Encaminhamento */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <Calendar className="w-5 h-5 text-blue-700" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                4. DATA DE CONFECÇÃO E ENCAMINHAMENTO
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 14. DATA DE CONFECÇÃO */}
              <div>
                <label
                  htmlFor="dataConfeccao"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  14. DATA DE CONFECÇÃO <span className="text-red-500 font-bold">*</span>
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
                    className={`w-full pl-9 pr-3.5 py-2.5 bg-white text-slate-900 font-bold text-sm rounded-lg border shadow-xs focus:outline-none transition-all ${
                      getFieldError('dataConfeccao')
                        ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Formato DD/MM/AAAA. Essa data será mantida nos locais correspondentes do SMV.
                </p>
                {getFieldError('dataConfeccao') && (
                  <p className="mt-1 text-xs font-semibold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {getFieldError('dataConfeccao')}
                  </p>
                )}
              </div>

              {/* 15. ENCAMINHAMENTO / PARA */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  15. ENCAMINHAMENTO / PARA
                </label>
                <input
                  type="text"
                  value={formData.encaminhamento || 'SELECIONE O TIPO DE SMV'}
                  disabled
                  readOnly
                  className="w-full py-2.5 px-3.5 bg-slate-100 text-slate-800 font-bold text-sm rounded-lg border border-slate-300 cursor-not-allowed uppercase"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Preenchido automaticamente de acordo com o Tipo de SMV.
                </p>
              </div>
            </div>
          </section>

          {/* Validation Summary Warning Box when errors exist */}
          {hasAttemptedSubmit && !validation.isValid && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl space-y-2 text-xs text-red-800 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-sm text-red-900">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span>ATENÇÃO: Existem campos obrigatórios pendentes ou inválidos</span>
              </div>
              <ul className="list-disc list-inside space-y-1 font-medium pl-1 text-red-700">
                {Object.values(validation.errors).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Success Message Banner */}
          {actionSuccessMsg && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Form Bottom Action Area */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Primary Action Button: VISUALIZAR PDF (NOT disabled, triggers scroll and highlight on invalid) */}
              <button
                id="btn-visualizar-pdf"
                type="button"
                onClick={handleOpenPreview}
                className="px-8 py-3.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
              >
                <Eye className="w-5 h-5" />
                VISUALIZAR PDF
              </button>

              <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Clique em "VISUALIZAR PDF" para conferir a prévia do documento oficial.</span>
              </div>
            </div>

            {/* Direct Downloads Actions Bar */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="block text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                Opções de Download Direto
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDirectDownloadPdf}
                  className="px-3.5 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 border border-blue-900 cursor-pointer shadow-xs transition-all active:scale-95"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  BAIXAR PDF
                </button>

                <button
                  type="button"
                  onClick={handleDirectDownloadExcel}
                  className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 border border-emerald-900 cursor-pointer shadow-xs transition-all active:scale-95"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  BAIXAR EXCEL EDITÁVEL
                </button>

                <button
                  type="button"
                  onClick={handleDirectDownloadBoth}
                  className="px-3.5 py-2 bg-indigo-800 hover:bg-indigo-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 border border-indigo-900 cursor-pointer shadow-xs transition-all active:scale-95"
                >
                  <Layers className="w-3.5 h-3.5" />
                  BAIXAR OS DOIS
                </button>
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
