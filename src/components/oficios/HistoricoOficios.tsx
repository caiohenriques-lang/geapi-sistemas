import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Download,
  RotateCw,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import { HistoricoOficiosItem } from '../../types/controleOficios';
import { fetchHistoricoOficios } from '../../services/oficiosService';
import { generateHistoricoOficiosPdf } from '../../lib/generateHistoricoOficiosPdf';

interface HistoricoOficiosProps {
  refreshTrigger?: number;
}

type SortField =
  | 'ct'
  | 'codigo'
  | 'tipo'
  | 'motivo'
  | 'oficioParada'
  | 'dataParada'
  | 'oficioRetorno'
  | 'dataRetorno';

type SortDirection = 'asc' | 'desc';

const MESES_PT = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
];

/**
 * Converte qualquer formato de data (YYYY-MM-DD, DD/MM/AAAA, ISO) para DD/MM/AAAA
 */
function formatDateBR(val?: string | null): string {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';

  // Se já for DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  // Se for YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.substring(0, 10).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  return str;
}

/**
 * Extrai timestamp numérico para ordenação cronológica precisa
 */
function parseDateTimestamp(val?: string | null): number {
  if (!val) return 0;
  const str = String(val).trim();
  if (!str) return 0;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.substring(0, 10).split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
  }

  // DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
    const parts = str.substring(0, 10).split('/');
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)).getTime();
  }

  const parsed = Date.parse(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Extrai chave de Mês/Ano (ex: "2026-09" -> "SETEMBRO/2026") a partir da data de parada
 */
function getMonthYearFromDate(val?: string | null): { key: string; label: string; timestamp: number } | null {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;

  let year = 0;
  let monthIndex = 0; // 0-based

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.substring(0, 10).split('-');
    year = parseInt(parts[0], 10);
    monthIndex = parseInt(parts[1], 10) - 1;
  } else if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
    const parts = str.substring(0, 10).split('/');
    year = parseInt(parts[2], 10);
    monthIndex = parseInt(parts[1], 10) - 1;
  } else {
    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    year = d.getFullYear();
    monthIndex = d.getMonth();
  }

  if (monthIndex < 0 || monthIndex > 11 || year < 1900) return null;

  const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  const label = `${MESES_PT[monthIndex]}/${year}`;
  const timestamp = new Date(year, monthIndex, 1).getTime();

  return { key, label, timestamp };
}

export const HistoricoOficios: React.FC<HistoricoOficiosProps> = ({ refreshTrigger = 0 }) => {
  const [items, setItems] = useState<HistoricoOficiosItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filtroCt, setFiltroCt] = useState<string>('TODOS');
  const [filtroMes, setFiltroMes] = useState<string>('TODOS');
  const [filtroMotivo, setFiltroMotivo] = useState<string>('TODOS');
  const [filtroEmAberto, setFiltroEmAberto] = useState<boolean>(false);
  const [busca, setBusca] = useState<string>('');

  // Ordenação (padrão: dataParada decrescente)
  const [sortField, setSortField] = useState<SortField>('dataParada');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Paginação (10 registros por página)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Carrega dados da API
  const loadData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchHistoricoOficios(forceRefresh);
      setItems(data);
    } catch (err: any) {
      console.error('Falha ao carregar histórico de ofícios:', err);
      setError(err.message || 'Erro ao carregar relatório histórico de paradas e retornos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData, refreshTrigger]);

  // Extrai listas dinâmicas para os selects de filtro baseados nos dados carregados
  const { opcoesCt, opcoesMotivos, opcoesMeses } = useMemo(() => {
    const ctsSet = new Set<string>();
    const motivosSet = new Set<string>();
    const mesesMap = new Map<string, { label: string; timestamp: number }>();

    items.forEach((item) => {
      if (item.ct && item.ct.trim().length > 0) {
        ctsSet.add(item.ct.trim());
      }
      if (item.motivo && item.motivo.trim().length > 0) {
        motivosSet.add(item.motivo.trim());
      }
      const mesInfo = getMonthYearFromDate(item.dataParada);
      if (mesInfo) {
        mesesMap.set(mesInfo.key, { label: mesInfo.label, timestamp: mesInfo.timestamp });
      }
    });

    const cts = Array.from(ctsSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const motivos = Array.from(motivosSet).sort((a, b) => a.localeCompare(b));
    const meses = Array.from(mesesMap.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
      .map(([key, val]) => ({ key, label: val.label }));

    return {
      opcoesCt: cts,
      opcoesMotivos: motivos,
      opcoesMeses: meses,
    };
  }, [items]);

  // Reseta para a página 1 sempre que qualquer filtro mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [filtroCt, filtroMes, filtroMotivo, filtroEmAberto, busca]);

  // Manipulador de ordenação
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'dataParada' || field === 'dataRetorno' ? 'desc' : 'asc');
    }
  };

  // Filtragem combinada
  const filteredItems = useMemo(() => {
    const termoBusca = busca.trim().toLowerCase();

    return items.filter((item) => {
      // 1. Filtro CT
      if (filtroCt !== 'TODOS' && item.ct !== filtroCt) {
        return false;
      }

      // 2. Filtro Mês (baseado em dataParada)
      if (filtroMes !== 'TODOS') {
        const mesInfo = getMonthYearFromDate(item.dataParada);
        if (!mesInfo || mesInfo.key !== filtroMes) {
          return false;
        }
      }

      // 3. Filtro Motivo
      if (filtroMotivo !== 'TODOS' && item.motivo !== filtroMotivo) {
        return false;
      }

      // 4. Filtro Em Aberto (oficioRetorno vazio)
      if (filtroEmAberto) {
        const isOpen = !item.oficioRetorno || item.oficioRetorno.trim().length === 0;
        if (!isOpen) return false;
      }

      // 5. Busca geral (em todas as colunas)
      if (termoBusca.length > 0) {
        const dataParadaBR = formatDateBR(item.dataParada).toLowerCase();
        const dataRetornoBR = formatDateBR(item.dataRetorno).toLowerCase();
        const statusText = !item.oficioRetorno || item.oficioRetorno.trim().length === 0 ? 'em aberto' : '';

        const searchBlob = [
          item.ct || '',
          item.codigo || '',
          item.tipo || '',
          item.motivo || '',
          item.oficioParada || '',
          item.dataParada || '',
          dataParadaBR,
          item.oficioRetorno || '',
          item.dataRetorno || '',
          dataRetornoBR,
          statusText,
        ]
          .join(' ')
          .toLowerCase();

        if (!searchBlob.includes(termoBusca)) {
          return false;
        }
      }

      return true;
    });
  }, [items, filtroCt, filtroMes, filtroMotivo, filtroEmAberto, busca]);

  // Ordenação dos itens filtrados (TODOS os itens filtrados, ANTES da paginação)
  const sortedItems = useMemo(() => {
    const list = [...filteredItems];

    list.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'dataParada') {
        const timeA = parseDateTimestamp(a.dataParada);
        const timeB = parseDateTimestamp(b.dataParada);
        comparison = timeA - timeB;
      } else if (sortField === 'dataRetorno') {
        const timeA = parseDateTimestamp(a.dataRetorno);
        const timeB = parseDateTimestamp(b.dataRetorno);
        comparison = timeA - timeB;
      } else {
        const valA = String(a[sortField] || '').trim();
        const valB = String(b[sortField] || '').trim();
        comparison = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [filteredItems, sortField, sortDirection]);

  // Paginação (exibição em tela: 10 registros por página)
  const totalItems = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, validCurrentPage, pageSize]);

  const startRecord = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(validCurrentPage * pageSize, totalItems);

  const hasActiveFilters =
    filtroCt !== 'TODOS' ||
    filtroMes !== 'TODOS' ||
    filtroMotivo !== 'TODOS' ||
    filtroEmAberto ||
    busca.trim().length > 0;

  const handleResetFilters = () => {
    setFiltroCt('TODOS');
    setFiltroMes('TODOS');
    setFiltroMotivo('TODOS');
    setFiltroEmAberto(false);
    setBusca('');
  };

  // Exportação CSV (usa sortedItems completo)
  const handleExportCsv = () => {
    if (sortedItems.length === 0) return;

    const headers = [
      'CT',
      'CÓDIGO',
      'TIPO',
      'MOTIVO DA PARADA',
      'OFÍCIO DE PARADA',
      'DATA DE PARADA',
      'OFÍCIO DE RETORNO',
      'DATA DE RETORNO',
    ];

    const escapeCsv = (val: string) => {
      const s = String(val || '').replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = sortedItems.map((item) => {
      const isAberta = !item.oficioRetorno || item.oficioRetorno.trim().length === 0;
      return [
        escapeCsv(item.ct),
        escapeCsv(item.codigo),
        escapeCsv(item.tipo),
        escapeCsv(item.motivo),
        escapeCsv(item.oficioParada),
        escapeCsv(formatDateBR(item.dataParada)),
        escapeCsv(isAberta ? '-' : item.oficioRetorno),
        escapeCsv(isAberta ? 'Em aberto' : formatDateBR(item.dataRetorno)),
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const nowStr = new Date().toISOString().substring(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_historico_parada_retorno_${nowStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Exportação PDF Real (Gera e baixa arquivo PDF tabular completo de sortedItems com pdf-lib)
  const handleExportPdf = async () => {
    if (sortedItems.length === 0 || isGeneratingPdf) return;

    try {
      setIsGeneratingPdf(true);
      await generateHistoricoOficiosPdf(sortedItems);
    } catch (err) {
      console.error('Falha ao gerar arquivo PDF do relatório histórico:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div id="historico-oficios-container" className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* 1. CABEÇALHO DO RELATÓRIO & CONTROLES */}
      <div className="p-4 sm:p-5 pb-3.5 sm:pb-4">
        {/* Linha do Título com Botão Recarregar no canto */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
            Relatório Histórico de Parada e Retorno de Equipamentos
          </h2>

          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isLoading || isGeneratingPdf}
              className="p-1.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200 transition-colors shadow-2xs flex items-center justify-center cursor-pointer disabled:opacity-50"
              title="Recarregar dados da planilha"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-900' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2. PRIMEIRA LINHA DE CONTROLES */}
        {/* [ Exportar CSV (Verde) ] [ Exportar PDF (Azul) ] [ Todos os CTs ] [ Todos os meses ] [ Todos os motivos ] [ □ Em aberto ] */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 print:hidden">
          {/* Botão Exportar CSV (Verde institucional) */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isLoading || isGeneratingPdf || sortedItems.length === 0}
            className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded-lg border border-emerald-600 hover:border-emerald-700 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            title="Exportar registros filtrados para planilha CSV"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>Exportar CSV</span>
          </button>

          {/* Botão Exportar PDF Real (Azul institucional) */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isLoading || isGeneratingPdf || sortedItems.length === 0}
            className="h-8 px-3 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold text-xs rounded-lg border border-sky-600 hover:border-sky-700 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            title="Gerar e baixar arquivo PDF com todos os registros filtrados"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-white" />
            )}
            <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Exportar PDF'}</span>
          </button>

          {/* Select: CTs */}
          <select
            value={filtroCt}
            onChange={(e) => setFiltroCt(e.target.value)}
            className="h-8 px-2.5 bg-white text-slate-700 font-normal text-xs rounded-lg border border-slate-200 hover:border-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-300 shadow-2xs outline-none cursor-pointer min-w-[115px]"
          >
            <option value="TODOS">Todos os CTs</option>
            {opcoesCt.map((ct) => (
              <option key={ct} value={ct}>
                CT {ct}
              </option>
            ))}
          </select>

          {/* Select: Meses (Invertido com Motivos conforme solicitado) */}
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="h-8 px-2.5 bg-white text-slate-700 font-normal text-xs rounded-lg border border-slate-200 hover:border-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-300 shadow-2xs outline-none cursor-pointer min-w-[125px]"
          >
            <option value="TODOS">Todos os meses</option>
            {opcoesMeses.map((mes) => (
              <option key={mes.key} value={mes.key}>
                {mes.label}
              </option>
            ))}
          </select>

          {/* Select: Motivos */}
          <select
            value={filtroMotivo}
            onChange={(e) => setFiltroMotivo(e.target.value)}
            className="h-8 px-2.5 bg-white text-slate-700 font-normal text-xs rounded-lg border border-slate-200 hover:border-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-300 shadow-2xs outline-none cursor-pointer max-w-[190px] truncate"
          >
            <option value="TODOS">Todos os motivos</option>
            {opcoesMotivos.map((mot) => (
              <option key={mot} value={mot}>
                {mot}
              </option>
            ))}
          </select>

          {/* Checkbox: Em aberto */}
          <label className="h-8 px-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg flex items-center gap-1.5 cursor-pointer select-none transition-colors shadow-2xs">
            <input
              type="checkbox"
              checked={filtroEmAberto}
              onChange={(e) => setFiltroEmAberto(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-slate-800 focus:ring-slate-400 border-slate-300 cursor-pointer"
            />
            <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
              Em aberto
            </span>
          </label>

          {/* Botão limpar filtros (se ativo) */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="h-8 px-2 text-slate-500 hover:text-slate-800 text-xs font-medium rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer ml-auto"
              title="Limpar todos os filtros"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          )}
        </div>

        {/* 3. SEGUNDA LINHA: BUSCA ALINHADA À ESQUERDA */}
        <div className="mt-2 print:hidden">
          <div className="relative w-full sm:w-72 md:w-80">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar em todas as colunas..."
              className="w-full h-8 pl-7 pr-7 bg-white text-slate-800 font-normal text-xs rounded-lg border border-slate-200 hover:border-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-300 shadow-2xs outline-none placeholder:text-slate-400"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alerta de erro caso ocorra */}
      {error && (
        <div className="mx-4 mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs font-medium text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => loadData(true)}
            className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* 4. TABELA DE DADOS CENTRALIZADA */}
      <div className="border-t border-slate-200">
        {isLoading && items.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
            <p className="text-xs font-medium text-slate-500">
              Carregando histórico de paradas e retornos...
            </p>
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="py-10 px-4 text-center space-y-1.5">
            <FileSpreadsheet className="w-6 h-6 mx-auto text-slate-400" />
            <h3 className="text-xs font-semibold text-slate-800">
              Nenhum registro encontrado
            </h3>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Nenhuma ocorrência corresponde aos filtros ou à busca aplicada.
            </p>
            {hasActiveFilters && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  Restaurar Registros
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[920px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-semibold text-slate-600 select-none">
                  {/* CT */}
                  <th
                    scope="col"
                    onClick={() => handleSort('ct')}
                    className="py-2 px-2.5 text-center cursor-pointer hover:bg-slate-100 transition-colors w-[80px]"
                    title="Clique para ordenar por CT"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>CT</span>
                      {sortField === 'ct' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-slate-900" /> : <ArrowDown className="w-3 h-3 text-slate-900" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  {/* CÓDIGO */}
                  <th
                    scope="col"
                    onClick={() => handleSort('codigo')}
                    className="py-2 px-2.5 text-center cursor-pointer hover:bg-slate-100 transition-colors w-[100px]"
                    title="Clique para ordenar por Código"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>CÓDIGO</span>
                      {sortField === 'codigo' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-slate-900" /> : <ArrowDown className="w-3 h-3 text-slate-900" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  {/* TIPO */}
                  <th
                    scope="col"
                    onClick={() => handleSort('tipo')}
                    className="py-2 px-2.5 text-center cursor-pointer hover:bg-slate-100 transition-colors w-[110px]"
                    title="Clique para ordenar por Tipo"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>TIPO</span>
                      {sortField === 'tipo' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-slate-900" /> : <ArrowDown className="w-3 h-3 text-slate-900" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  {/* MOTIVO DA PARADA */}
                  <th
                    scope="col"
                    onClick={() => handleSort('motivo')}
                    className="py-2 px-2.5 text-center cursor-pointer hover:bg-slate-100 transition-colors min-w-[190px]"
                    title="Clique para ordenar por Motivo"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>MOTIVO DA PARADA</span>
                      {sortField === 'motivo' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-slate-900" /> : <ArrowDown className="w-3 h-3 text-slate-900" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  {/* OFÍCIO DE PARADA */}
                  <th
                    scope="col"
                    onClick={() => handleSort('oficioParada')}
                    className="py-2 px-2.5 text-center cursor-pointer hover:bg-slate-100 transition-colors w-[120px]"
                    title="Clique para ordenar por Ofício de Parada"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>OFÍCIO DE PARADA</span>
                      {sortField === 'oficioParada' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-slate-900" /> : <ArrowDown className="w-3 h-3 text-slate-900" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  {/* DATA DE PARADA */}
                  <th
                    scope="col"
                    onClick={() => handleSort('dataParada')}
                    className="py-2 px-2.5 text-center cursor-pointer hover:bg-slate-100 transition-colors w-[120px]"
                    title="Clique para alternar ordenação por Data de Parada"
                  >
                    <div className="inline-flex items-center justify-center gap-1 text-slate-900 font-bold">
                      <span>DATA DE PARADA</span>
                      {sortField === 'dataParada' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-blue-600 stroke-[2.5]" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-blue-600 stroke-[2.5]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  {/* OFÍCIO DE RETORNO */}
                  <th
                    scope="col"
                    onClick={() => handleSort('oficioRetorno')}
                    className="py-2 px-2.5 text-center cursor-pointer hover:bg-slate-100 transition-colors w-[120px]"
                    title="Clique para ordenar por Ofício de Retorno"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>OFÍCIO DE RETORNO</span>
                      {sortField === 'oficioRetorno' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-slate-900" /> : <ArrowDown className="w-3 h-3 text-slate-900" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  {/* DATA DE RETORNO */}
                  <th
                    scope="col"
                    onClick={() => handleSort('dataRetorno')}
                    className="py-2 px-2.5 text-center cursor-pointer hover:bg-slate-100 transition-colors w-[120px]"
                    title="Clique para ordenar por Data de Retorno"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>DATA DE RETORNO</span>
                      {sortField === 'dataRetorno' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-slate-900" /> : <ArrowDown className="w-3 h-3 text-slate-900" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedItems.map((item, idx) => {
                  const isAberta = !item.oficioRetorno || item.oficioRetorno.trim().length === 0;

                  return (
                    <tr
                      key={item.rowNumber ? `row-${item.rowNumber}-${idx}` : `item-${idx}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* CT */}
                      <td className="py-2 px-2.5 text-center text-slate-600 font-normal whitespace-nowrap">
                        {item.ct || '-'}
                      </td>

                      {/* CÓDIGO */}
                      <td className="py-2 px-2.5 text-center font-medium text-slate-800 whitespace-nowrap">
                        {item.codigo}
                      </td>

                      {/* TIPO */}
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        {item.tipo ? (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            {item.tipo}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>

                      {/* MOTIVO DA PARADA */}
                      <td className="py-2 px-2.5 text-center text-slate-700 leading-snug">
                        {item.motivo || '-'}
                      </td>

                      {/* OFÍCIO DE PARADA */}
                      <td className="py-2 px-2.5 text-center text-slate-700 font-normal whitespace-nowrap">
                        {item.oficioParada || '-'}
                      </td>

                      {/* DATA DE PARADA */}
                      <td className="py-2 px-2.5 text-center text-slate-800 font-medium whitespace-nowrap">
                        {formatDateBR(item.dataParada) || '-'}
                      </td>

                      {/* OFÍCIO DE RETORNO */}
                      <td className="py-2 px-2.5 text-center whitespace-nowrap text-slate-700 font-normal">
                        {isAberta ? (
                          <span className="text-slate-400 font-normal">-</span>
                        ) : (
                          item.oficioRetorno
                        )}
                      </td>

                      {/* DATA DE RETORNO */}
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        {isAberta ? (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Em aberto
                          </span>
                        ) : (
                          <span className="text-slate-700 font-normal">
                            {formatDateBR(item.dataRetorno) || '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. RODAPÉ COM PAGINAÇÃO */}
        {!isLoading && totalItems > 0 && (
          <div className="py-2.5 px-4 sm:px-5 bg-white border-t border-slate-200 flex items-center justify-between gap-4 text-xs select-none print:hidden">
            {/* Lado esquerdo: "1 - 10 / 462" */}
            <div className="font-normal text-slate-600">
              <span>{startRecord}</span> - <span>{endRecord}</span> / <span>{totalItems}</span>
            </div>

            {/* Lado direito: "1 / 47" + botões Anterior / Próximo */}
            <div className="flex items-center gap-2.5">
              <span className="font-normal text-slate-600">
                {validCurrentPage} / {totalPages}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validCurrentPage <= 1}
                  className="p-1 bg-white hover:bg-slate-50 text-slate-700 rounded-md border border-slate-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validCurrentPage >= totalPages}
                  className="p-1 bg-white hover:bg-slate-50 text-slate-700 rounded-md border border-slate-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                  title="Próxima página"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
