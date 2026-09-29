import {
  ApiResponse,
  HistoricoOficiosItem,
  OcorrenciaAberta,
  OcorrenciaParadaPayload,
  OcorrenciaRetornoPayload,
} from '../types/controleOficios';

const OFICIOS_API_URL = import.meta.env.VITE_OFICIOS_API_URL || '';

const SESSION_CACHE_KEY = 'geapi_oficios_equipamentos_cache_ct_2740_2741_2742_v1';
const LEGACY_SESSION_CACHE_KEY = 'geapi_oficios_equipamentos_cache_v1';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos de TTL (sessão operacional)

const HISTORICO_SESSION_CACHE_KEY = 'geapi_oficios_historico_cache_v1';
const HISTORICO_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de TTL

interface CachedEquipamentosSession {
  timestamp: number;
  data: string[];
}

interface CachedHistoricoSession {
  timestamp: number;
  data: HistoricoOficiosItem[];
}

let memoryCachedEquipamentos: string[] | null = null;
let memoryCacheTimestamp: number = 0;
let equipamentosPromise: Promise<string[]> | null = null;

let memoryCachedHistorico: HistoricoOficiosItem[] | null = null;
let memoryHistoricoCacheTimestamp: number = 0;
let historicoPromise: Promise<HistoricoOficiosItem[]> | null = null;

/**
 * Lê do cache em memória ou sessionStorage
 */
function getCachedEquipamentos(): string[] | null {
  const now = Date.now();

  // 1. Tenta memória (acesso imediato 0ms)
  if (memoryCachedEquipamentos && memoryCachedEquipamentos.length > 0 && (now - memoryCacheTimestamp < CACHE_TTL_MS)) {
    return memoryCachedEquipamentos;
  }

  // 2. Tenta sessionStorage (reutiliza durante a sessão do navegador)
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      // Invalida cache legado sem filtro se existir
      sessionStorage.removeItem(LEGACY_SESSION_CACHE_KEY);

      const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
      if (raw) {
        const parsed: CachedEquipamentosSession = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0 && (now - parsed.timestamp < CACHE_TTL_MS)) {
          memoryCachedEquipamentos = parsed.data;
          memoryCacheTimestamp = parsed.timestamp;
          return parsed.data;
        }
        // Expirado
        sessionStorage.removeItem(SESSION_CACHE_KEY);
      }
    }
  } catch (e) {
    // sessionStorage indisponível ou parse falhou
  }

  return null;
}

/**
 * Grava no cache em memória e sessionStorage
 */
function setCachedEquipamentos(data: string[]): void {
  const now = Date.now();
  memoryCachedEquipamentos = data;
  memoryCacheTimestamp = now;

  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const entry: CachedEquipamentosSession = {
        timestamp: now,
        data,
      };
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(entry));
    }
  } catch (e) {
    // sessionStorage indisponível ou quota excedida
  }
}

/**
 * Limpa o cache local de equipamentos da sessão
 */
export function clearEquipamentosCache(): void {
  memoryCachedEquipamentos = null;
  memoryCacheTimestamp = 0;
  equipamentosPromise = null;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
      sessionStorage.removeItem(LEGACY_SESSION_CACHE_KEY);
    }
  } catch (e) {}
}

/**
 * Verifica se a URL pública do Web App do Google Apps Script está configurada
 */
export function isOficiosApiConfigured(): boolean {
  return typeof OFICIOS_API_URL === 'string' && OFICIOS_API_URL.trim().length > 0;
}

/**
 * Obtém a URL configurada
 */
export function getOficiosApiUrl(): string {
  return OFICIOS_API_URL;
}

/**
 * 1. Busca a lista oficial de equipamentos EXCLUSIVAMENTE da aba MATRIZ!D2:Z6152
 * filtrados por contrato (2740/24, 2741/24 e 2742/24) via Google Apps Script.
 * Sem qualquer fallback fictício ou base alternativa.
 *
 * Utiliza cache em memória + sessionStorage com TTL curto de 15 minutos para garantir
 * carregamento instantâneo nas aberturas seguintes do formulário ou durante a navegação.
 */
export async function fetchEquipamentosList(forceRefresh: boolean = false): Promise<string[]> {
  if (!forceRefresh) {
    const cached = getCachedEquipamentos();
    if (cached && cached.length > 0) {
      return cached;
    }

    if (equipamentosPromise) {
      return equipamentosPromise;
    }
  } else {
    clearEquipamentosCache();
  }

  if (!isOficiosApiConfigured()) {
    throw new Error('Integração com Controle de Ofícios ainda não configurada.');
  }

  equipamentosPromise = (async () => {
    try {
      const url = `${OFICIOS_API_URL}${OFICIOS_API_URL.includes('?') ? '&' : '?'}action=listarEquipamentos${
        forceRefresh ? '&refresh=true' : ''
      }`;
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - Falha ao conectar ao servidor do Google Apps Script.`);
      }

      const resJson: ApiResponse<string[]> = await response.json();
      if (!resJson.ok || !Array.isArray(resJson.data)) {
        throw new Error(resJson.error?.message || 'Erro ao processar lista de equipamentos.');
      }

      setCachedEquipamentos(resJson.data);
      equipamentosPromise = null;
      return resJson.data;
    } catch (err: any) {
      equipamentosPromise = null;
      console.error('Erro ao buscar equipamentos de MATRIZ!D2:Z6152 (Contratos 2740/24, 2741/24, 2742/24):', err);
      throw new Error(err.message || 'Não foi possível carregar a lista de equipamentos.');
    }
  })();

  return equipamentosPromise;
}

/**
 * 2. Busca a lista de ocorrências em aberto (EQUIPAMENTOS OFF onde OFÍCIO DE RETORNO está vazio)
 */
export async function fetchOcorrenciasAbertas(): Promise<OcorrenciaAberta[]> {
  if (!isOficiosApiConfigured()) {
    throw new Error('Integração com Controle de Ofícios ainda não configurada.');
  }

  try {
    const url = `${OFICIOS_API_URL}${OFICIOS_API_URL.includes('?') ? '&' : '?'}action=listarOcorrenciasAbertas`;
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - Falha na comunicação com Apps Script.`);
    }

    const resJson: ApiResponse<OcorrenciaAberta[]> = await response.json();
    if (!resJson.ok) {
      throw new Error(resJson.error?.message || 'Erro ao listar ocorrências abertas.');
    }

    return resJson.data || [];
  } catch (err: any) {
    console.error('Erro em fetchOcorrenciasAbertas:', err);
    throw new Error(err.message || 'Não foi possível carregar as ocorrências em aberto na planilha.');
  }
}

/**
 * Lê o histórico de ofícios do cache em memória ou sessionStorage
 */
function getCachedHistorico(): HistoricoOficiosItem[] | null {
  const now = Date.now();

  if (memoryCachedHistorico && memoryCachedHistorico.length > 0 && (now - memoryHistoricoCacheTimestamp < HISTORICO_CACHE_TTL_MS)) {
    return memoryCachedHistorico;
  }

  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = sessionStorage.getItem(HISTORICO_SESSION_CACHE_KEY);
      if (raw) {
        const parsed: CachedHistoricoSession = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0 && (now - parsed.timestamp < HISTORICO_CACHE_TTL_MS)) {
          memoryCachedHistorico = parsed.data;
          memoryHistoricoCacheTimestamp = parsed.timestamp;
          return parsed.data;
        }
        sessionStorage.removeItem(HISTORICO_SESSION_CACHE_KEY);
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Salva o histórico de ofícios no cache em memória e sessionStorage
 */
function setCachedHistorico(data: HistoricoOficiosItem[]): void {
  const now = Date.now();
  memoryCachedHistorico = data;
  memoryHistoricoCacheTimestamp = now;

  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const entry: CachedHistoricoSession = {
        timestamp: now,
        data,
      };
      sessionStorage.setItem(HISTORICO_SESSION_CACHE_KEY, JSON.stringify(entry));
    }
  } catch (e) {}
}

/**
 * Limpa o cache local do relatório histórico
 */
export function clearHistoricoCache(): void {
  memoryCachedHistorico = null;
  memoryHistoricoCacheTimestamp = 0;
  historicoPromise = null;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem(HISTORICO_SESSION_CACHE_KEY);
    }
  } catch (e) {}
}

/**
 * Extrai e normaliza um item de histórico
 */
function normalizeHistoricoItem(raw: any, index: number): HistoricoOficiosItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const codigo = String(raw.codigo || raw.CÓDIGO || raw.Codigo || '').trim();
  if (!codigo) return null;

  return {
    rowNumber: typeof raw.rowNumber === 'number' ? raw.rowNumber : index + 2,
    ct: String(raw.ct || raw.CT || raw.contrato || '').trim(),
    codigo,
    tipo: String(raw.tipo || raw.TIPO || raw.tipoEquipamento || '').trim(),
    motivo: String(raw.motivo || raw.MOTIVO || raw.motivoParada || '').trim(),
    oficioParada: String(raw.oficioParada || raw.OFICIO_PARADA || raw.oficio || '').trim(),
    dataParada: String(raw.dataParada || raw.dataParadaI || raw.DATA_PARADA || '').trim(),
    oficioRetorno: String(raw.oficioRetorno || raw.OFICIO_RETORNO || '').trim(),
    dataRetorno: String(raw.dataRetorno || raw.retornoF || raw.DATA_RETORNO || '').trim(),
  };
}

/**
 * 2.1. Busca o relatório histórico completo de paradas e retornos da aba EQUIPAMENTOS OFF
 */
export async function fetchHistoricoOficios(forceRefresh: boolean = false): Promise<HistoricoOficiosItem[]> {
  if (!forceRefresh) {
    const cached = getCachedHistorico();
    if (cached && cached.length > 0) {
      return cached;
    }

    if (historicoPromise) {
      return historicoPromise;
    }
  } else {
    clearHistoricoCache();
  }

  if (!isOficiosApiConfigured()) {
    return [];
  }

  historicoPromise = (async () => {
    try {
      // 1. Tenta listarHistoricoOficios primeiro
      const baseUrl = OFICIOS_API_URL;
      const separator = baseUrl.includes('?') ? '&' : '?';
      const urlPrimary = `${baseUrl}${separator}action=listarHistoricoOficios${
        forceRefresh ? '&refresh=true' : ''
      }`;

      let response = await fetch(urlPrimary, { method: 'GET' });
      let resJson: any = null;

      if (response.ok) {
        try {
          resJson = await response.json();
        } catch (jsonErr) {
          resJson = null;
        }
      }

      // Verifica se resJson.data é array de histórico
      let rawList: any[] = [];
      if (resJson && Array.isArray(resJson.data)) {
        rawList = resJson.data;
      } else if (Array.isArray(resJson)) {
        rawList = resJson;
      } else if (resJson && resJson.data && Array.isArray(resJson.data.historico)) {
        rawList = resJson.data.historico;
      } else if (resJson && resJson.data && Array.isArray(resJson.data.items)) {
        rawList = resJson.data.items;
      }

      // 2. Se não veio array (ex: versão do script sem listarHistoricoOficios ou ping status), tenta listarHistorico
      if (rawList.length === 0 && (!resJson || !resJson.ok || !Array.isArray(resJson.data))) {
        try {
          const urlSecondary = `${baseUrl}${separator}action=listarHistorico${
            forceRefresh ? '&refresh=true' : ''
          }`;
          const respSec = await fetch(urlSecondary, { method: 'GET' });
          if (respSec.ok) {
            const secJson = await respSec.json();
            if (secJson && Array.isArray(secJson.data)) {
              rawList = secJson.data;
            } else if (Array.isArray(secJson)) {
              rawList = secJson;
            }
          }
        } catch (secErr) {
          // Ignora falha da rota secundária
        }
      }

      // 3. Se ainda não encontrou histórico mas o endpoint tem listarOcorrenciasAbertas (versão anterior do Apps Script)
      if (rawList.length === 0 && (!resJson || !resJson.ok || !Array.isArray(resJson.data))) {
        try {
          const ocorrenciasAbertas = await fetchOcorrenciasAbertas();
          if (Array.isArray(ocorrenciasAbertas) && ocorrenciasAbertas.length > 0) {
            rawList = ocorrenciasAbertas.map((aberta) => ({
              rowNumber: aberta.rowNumber,
              ct: '',
              codigo: aberta.codigo,
              tipo: '',
              motivo: aberta.motivo,
              oficioParada: aberta.oficioParada,
              dataParada: aberta.dataParadaI,
              oficioRetorno: '',
              dataRetorno: '',
            }));
          }
        } catch (abertasErr) {
          // Fallback silencioso
        }
      }

      const normalizedList = rawList
        .map((item, idx) => normalizeHistoricoItem(item, idx))
        .filter((item): item is HistoricoOficiosItem => item !== null);

      setCachedHistorico(normalizedList);
      historicoPromise = null;
      return normalizedList;
    } catch (err: any) {
      historicoPromise = null;
      console.warn('Aviso em fetchHistoricoOficios:', err);
      // Retorna cache existente ou lista vazia para evitar crash da aplicação
      const cached = getCachedHistorico();
      return cached || [];
    }
  })();

  return historicoPromise;
}

/**
 * 3. Registra nova PARADA na planilha
 */
export async function registrarParada(
  payload: OcorrenciaParadaPayload
): Promise<ApiResponse<{ idControle: string; rowNumber: number }>> {
  if (!isOficiosApiConfigured()) {
    return {
      ok: false,
      error: {
        code: 'NOT_CONFIGURED',
        message:
          'Integração com Controle de Ofícios ainda não configurada. Configure a variável VITE_OFICIOS_API_URL para salvar na planilha real.',
      },
    };
  }

  try {
    const response = await fetch(OFICIOS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'registrarParada',
        payload,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - Falha ao conectar ao servidor do Google Apps Script.`);
    }

    const resJson: ApiResponse<{ idControle: string; rowNumber: number }> = await response.json();
    if (resJson.ok) {
      // Invalida o cache local do histórico para forçar recarregamento imediato
      clearHistoricoCache();
    }
    return resJson;
  } catch (err: any) {
    console.error('Erro em registrarParada:', err);
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message:
          err.message ||
          'Ocorreu uma falha de rede ao tentar gravar a parada. Verifique a conexão e a URL da API.',
      },
    };
  }
}

/**
 * 4. Registra RETORNO na ocorrência existente
 */
export async function registrarRetorno(
  payload: OcorrenciaRetornoPayload
): Promise<ApiResponse<{ idControle: string; rowNumber: number }>> {
  if (!isOficiosApiConfigured()) {
    return {
      ok: false,
      error: {
        code: 'NOT_CONFIGURED',
        message:
          'Integração com Controle de Ofícios ainda não configurada. Configure a variável VITE_OFICIOS_API_URL para salvar na planilha real.',
      },
    };
  }

  try {
    const response = await fetch(OFICIOS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'registrarRetorno',
        payload,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - Falha ao conectar ao servidor do Google Apps Script.`);
    }

    const resJson: ApiResponse<{ idControle: string; rowNumber: number }> = await response.json();
    if (resJson.ok) {
      // Invalida o cache local do histórico para forçar recarregamento imediato
      clearHistoricoCache();
    }
    return resJson;
  } catch (err: any) {
    console.error('Erro em registrarRetorno:', err);
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message:
          err.message ||
          'Ocorreu uma falha de rede ao tentar gravar o retorno. Verifique a conexão e a URL da API.',
      },
    };
  }
}
