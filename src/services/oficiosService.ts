import {
  ApiResponse,
  OcorrenciaAberta,
  OcorrenciaParadaPayload,
  OcorrenciaRetornoPayload,
} from '../types/controleOficios';

const OFICIOS_API_URL = import.meta.env.VITE_OFICIOS_API_URL || '';

const SESSION_CACHE_KEY = 'geapi_oficios_equipamentos_cache_ct_2740_2741_2742_v1';
const LEGACY_SESSION_CACHE_KEY = 'geapi_oficios_equipamentos_cache_v1';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos de TTL (sessão operacional)

interface CachedEquipamentosSession {
  timestamp: number;
  data: string[];
}

let memoryCachedEquipamentos: string[] | null = null;
let memoryCacheTimestamp: number = 0;
let equipamentosPromise: Promise<string[]> | null = null;

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
