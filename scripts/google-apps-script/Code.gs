/**
 * =========================================================================
 * GOOGLE APPS SCRIPT — MÓDULO DE CONTROLE DE OFÍCIOS (GEAPI - SISTEMAS)
 * =========================================================================
 * 
 * Este script deve ser vinculado à planilha operacional oficial da PBH / GEAPI.
 * Ele fornece os endpoints REST (Web App) para:
 * 1. listarEquipamentos() -> Lê MATRIZ!D2:Z6152 filtrando contratos 2740/24, 2741/24 e 2742/24 (deduplica e ordena)
 * 2. listarOcorrenciasAbertas() -> Lê EQUIPAMENTOS OFF (col A preenchida e col I vazia)
 * 3. registrarParada() -> Escreve nova linha seletivamente em EQUIPAMENTOS OFF
 * 4. registrarRetorno() -> Localiza a ocorrência e complementa a mesma linha
 * 
 * REGRAS DE INTEGRIDADE:
 * - Utiliza LockService para evitar concorrência.
 * - Não sobrescreve colunas de fórmula (C, G, L) nem colunas não autorizadas.
 * - Localiza a última linha real com base na Coluna A.
 * - Suporta ID_CONTROLE (Coluna S) com fallback de chave composta (A + D + F).
 */

var SHEET_EQUIPAMENTOS_OFF = 'EQUIPAMENTOS OFF';
var SHEET_MATRIZ = 'MATRIZ';
var CACHE_KEY_EQUIPAMENTOS = 'GEAPI_EQUIPAMENTOS_LISTA_CT_2740_2741_2742';
var CACHE_TTL_EQUIPAMENTOS = 900; // 15 minutos (em segundos)
var CACHE_KEY_HISTORICO = 'GEAPI_HISTORICO_OFICIOS_CACHE_V1';
var CACHE_TTL_HISTORICO = 300; // 5 minutos (em segundos)
var CONTRATOS_PERMITIDOS = ['2740/24', '2741/24', '2742/24'];

// Mapeamento de Colunas (1-based index):
// A = 1 (CÓDIGO)
// B = 2
// C = 3 (CT / Fórmula - NÃO TOCAR)
// D = 4 (OF / OFÍCIO DE PARADA)
// E = 5 (INFORMADO I)
// F = 6 (DATA PARADA I)
// G = 7 (Fórmula - NÃO TOCAR)
// H = 8 (MOTIVO)
// I = 9 (OFÍCIO DE RETORNO)
// J = 10 (INFORMADO F)
// K = 11 (RETORNO F)
// L = 12 (Fórmula - NÃO TOCAR)
// M = 13 (HORÁRIO VANDALISMO)
// N = 14 (MEDIÇÃO)
// O = 15 (OBSERVAÇÃO)
// P = 16
// Q = 17
// R = 18 (TIPO)
// S = 19 (ID_CONTROLE)

/**
 * Ponto de entrada GET (Leituras)
 */
function doGet(e) {
  var params = e ? e.parameter : {};
  var action = params.action;

  try {
    if (action === 'listarEquipamentos') {
      var forceRefresh = (params.refresh === 'true' || params.refresh === '1');
      var equipamentos = getListaEquipamentos(forceRefresh);
      return jsonResponse({ ok: true, data: equipamentos });
    }

    if (action === 'listarOcorrenciasAbertas') {
      var abertas = getOcorrenciasAbertas();
      return jsonResponse({ ok: true, data: abertas });
    }

    if (action === 'listarHistorico' || action === 'listarHistoricoOficios') {
      var forceRefreshHist = (params.refresh === 'true' || params.refresh === '1');
      var historico = getHistoricoOficios(forceRefreshHist);
      return jsonResponse({ ok: true, data: historico });
    }

    // Ping / status de saúde
    return jsonResponse({
      ok: true,
      data: {
        status: 'online',
        service: 'GEAPI - Controle de Ofícios API',
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: {
        code: 'GET_ERROR',
        message: err.message || 'Erro ao processar requisição GET'
      }
    });
  }
}

/**
 * Ponto de entrada POST (Gravações)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Tenta adquirir o lock por até 30 segundos
    lock.waitLock(30000);
  } catch (lockErr) {
    return jsonResponse({
      ok: false,
      error: {
        code: 'LOCK_TIMEOUT',
        message: 'O sistema está processando outra operação no momento. Tente novamente em alguns segundos.'
      }
    });
  }

  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    var action = body.action || (e && e.parameter && e.parameter.action);

    if (action === 'registrarParada') {
      var resParada = handleRegistrarParada(body.payload || body);
      lock.releaseLock();
      return jsonResponse(resParada);
    }

    if (action === 'registrarRetorno') {
      var resRetorno = handleRegistrarRetorno(body.payload || body);
      lock.releaseLock();
      return jsonResponse(resRetorno);
    }

    lock.releaseLock();
    return jsonResponse({
      ok: false,
      error: {
        code: 'INVALID_ACTION',
        message: 'Ação não informada ou inválida.'
      }
    });
  } catch (err) {
    try { lock.releaseLock(); } catch (e) {}
    return jsonResponse({
      ok: false,
      error: {
        code: 'POST_ERROR',
        message: err.message || 'Erro interno ao processar gravação.'
      }
    });
  }
}

/**
 * 1. Lê a lista de códigos de equipamentos da aba MATRIZ!D2:Z6152 filtrando
 * EXCLUSIVAMENTE os contratos 2740/24, 2741/24 e 2742/24 com cache de alta performance.
 * 
 * OTIMIZAÇÃO:
 * - CacheService.getScriptCache() armazena a lista processada (TTL 15 min / 900s).
 * - Chave de cache dedicada: GEAPI_EQUIPAMENTOS_LISTA_CT_2740_2741_2742.
 * - Leitura da planilha é realizada em UMA ÚNICA operação de range: MATRIZ!D2:Z6152.
 * - Utiliza getDisplayValues() em uma única chamada (evita leituras célula a célula).
 * - Para cada linha:
 *   - CÓDIGO = primeira coluna do range D:Z (Coluna D)
 *   - CT = última coluna do range D:Z (Coluna Z)
 * - Filtra estritamente os contratos homologados: 2740/24, 2741/24 e 2742/24.
 * - Processamento eficiente em memória: ignora vazios, aplica trim, elimina duplicados e ordena alfanumericamente.
 * - Suporta divisão automática em chunks caso o tamanho total do JSON atinja o limite do CacheService.
 */
function getListaEquipamentos(forceRefresh) {
  var cache = CacheService.getScriptCache();

  // Invalida silenciosamente o cache antigo legado para não reutilizar dados sem filtro
  try {
    cache.remove('GEAPI_EQUIPAMENTOS_LISTA');
    cache.remove('GEAPI_EQUIPAMENTOS_LISTA_chunks');
  } catch (cleanLegacyErr) {}

  // 1. Tenta recuperar do cache se não for forçado
  if (!forceRefresh) {
    try {
      var cached = getFromScriptCache(cache, CACHE_KEY_EQUIPAMENTOS);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return cached;
      }
    } catch (cacheErr) {
      // Em caso de falha na leitura do cache, prossegue para a planilha
    }
  }

  // 2. Não está no cache: lê exclusivamente da aba oficial MATRIZ!D2:Z6152
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_MATRIZ);
  if (!sheet) {
    throw new Error('Aba "' + SHEET_MATRIZ + '" não encontrada na planilha.');
  }

  // UMA ÚNICA chamada de range e getDisplayValues() cobrindo da Coluna D à Coluna Z
  var range = sheet.getRange('D2:Z6152');
  var displayValues = range.getDisplayValues();
  var uniqueCodes = {};

  var allowedContratosMap = {
    '2740/24': true,
    '2741/24': true,
    '2742/24': true
  };

  for (var i = 0; i < displayValues.length; i++) {
    var row = displayValues[i];
    var rawCode = row[0]; // Primeira coluna do range (Coluna D = CÓDIGO)
    var rawCt = row[row.length - 1]; // Última coluna do range (Coluna Z = CONTRATO / CT)

    var ct = (rawCt !== null && rawCt !== undefined) ? String(rawCt).trim() : '';

    // Manter somente registros cujo CT seja exatamente: 2740/24, 2741/24 ou 2742/24
    if (allowedContratosMap[ct]) {
      var code = (rawCode !== null && rawCode !== undefined) ? String(rawCode).trim() : '';
      if (code.length > 0) {
        uniqueCodes[code] = true;
      }
    }
  }

  var list = Object.keys(uniqueCodes);
  // Ordenação alfanumérica crescente
  list.sort(function(a, b) {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });

  // 3. Salva no CacheService com TTL de 15 minutos (900s)
  try {
    putInScriptCache(cache, CACHE_KEY_EQUIPAMENTOS, list, CACHE_TTL_EQUIPAMENTOS);
  } catch (putErr) {
    // Falha silenciosa no cache não impede a entrega da lista
  }

  return list;
}

/**
 * Utilitários seguros para o CacheService do Apps Script (com suporte a chunks para listas longas)
 */
function getFromScriptCache(cache, key) {
  var chunksHeader = cache.get(key + '_chunks');
  if (chunksHeader) {
    var count = parseInt(chunksHeader, 10);
    var keys = [];
    for (var i = 0; i < count; i++) {
      keys.push(key + '_' + i);
    }
    var chunkMap = cache.getAll(keys);
    var full = '';
    for (var j = 0; j < count; j++) {
      var part = chunkMap[key + '_' + j];
      if (!part) return null;
      full += part;
    }
    return JSON.parse(full);
  }

  var single = cache.get(key);
  if (!single) return null;
  return JSON.parse(single);
}

function putInScriptCache(cache, key, data, ttlSeconds) {
  var json = JSON.stringify(data);
  // Limite individual do CacheService é 100KB (102.400 bytes). Margem de segurança: 90KB.
  if (json.length < 90000) {
    cache.put(key, json, ttlSeconds);
    cache.remove(key + '_chunks');
  } else {
    var chunkSize = 75000;
    var count = Math.ceil(json.length / chunkSize);
    var chunkMap = {};
    for (var i = 0; i < count; i++) {
      chunkMap[key + '_' + i] = json.substring(i * chunkSize, (i + 1) * chunkSize);
    }
    chunkMap[key + '_chunks'] = String(count);
    cache.putAll(chunkMap, ttlSeconds);
  }
}

/**
 * 2. Lista as ocorrências abertas na aba EQUIPAMENTOS OFF (col A != '' e col I == '')
 */
function getOcorrenciasAbertas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_EQUIPAMENTOS_OFF);
  if (!sheet) {
    throw new Error('Aba "' + SHEET_EQUIPAMENTOS_OFF + '" não encontrada na planilha.');
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  // Lê até a coluna S (19 colunas)
  var numCols = Math.max(19, sheet.getLastColumn());
  var range = sheet.getRange(2, 1, lastRow - 1, numCols);
  var values = range.getValues();
  var tz = ss.getSpreadsheetTimeZone();

  var abertas = [];

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var codigo = row[0] ? String(row[0]).trim() : '';
    var oficioRetorno = row[8] ? String(row[8]).trim() : '';

    // Regra: Coluna A preenchida e Coluna I (OFÍCIO DE RETORNO) vazia = Ocorrência Aberta
    if (codigo.length > 0 && oficioRetorno.length === 0) {
      var oficioParada = row[3] ? String(row[3]).trim() : '';
      var informadoI = formatDateValue(row[4], tz);
      var dataParadaI = formatDateValue(row[5], tz);
      var motivo = row[7] ? String(row[7]).trim() : '';
      var horarioVandalismo = row[12] ? formatTimeValue(row[12]) : '';
      var observacao = row[14] ? String(row[14]).trim() : '';
      var idControle = (row.length >= 19 && row[18]) ? String(row[18]).trim() : '';

      abertas.push({
        rowNumber: i + 2,
        codigo: codigo,
        oficioParada: oficioParada,
        informadoI: informadoI,
        dataParadaI: dataParadaI,
        motivo: motivo,
        horarioVandalismo: horarioVandalismo,
        observacao: observacao,
        idControle: idControle
      });
    }
  }

  return abertas;
}

/**
 * 2.1. Lê o relatório histórico de todas as paradas e retornos da aba EQUIPAMENTOS OFF.
 * 
 * DESEMPENHO E INTEGRIDADE:
 * - Leitura em bloco com getDisplayValues() e getValues() em uma única chamada.
 * - Considera somente linhas onde CÓDIGO (Coluna A) esteja preenchido.
 * - Ignora as milhares de linhas vazias pré-preenchidas com fórmulas.
 * - CacheService com TTL de 5 minutos (300s).
 * - Retorna os campos exatos do relatório: ct, codigo, tipo, motivo, oficioParada, dataParada, oficioRetorno, dataRetorno.
 */
function getHistoricoOficios(forceRefresh) {
  var cache = CacheService.getScriptCache();

  // 1. Tenta recuperar do cache se não for forçado
  if (!forceRefresh) {
    try {
      var cached = getFromScriptCache(cache, CACHE_KEY_HISTORICO);
      if (cached && Array.isArray(cached)) {
        return cached;
      }
    } catch (cacheErr) {}
  }

  // 2. Lê da planilha oficial
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_EQUIPAMENTOS_OFF);
  if (!sheet) {
    throw new Error('Aba "' + SHEET_EQUIPAMENTOS_OFF + '" não encontrada na planilha.');
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  // Lê em bloco da linha 2 até a última linha, cobrindo da Coluna A até R (18 colunas)
  var numCols = Math.max(18, sheet.getLastColumn());
  var range = sheet.getRange(2, 1, lastRow - 1, numCols);
  var displayValues = range.getDisplayValues();
  var values = range.getValues();
  var tz = ss.getSpreadsheetTimeZone();

  var historico = [];

  for (var i = 0; i < displayValues.length; i++) {
    var dRow = displayValues[i];
    var vRow = values[i];
    var rawCodigo = dRow[0];
    var codigo = (rawCodigo !== null && rawCodigo !== undefined) ? String(rawCodigo).trim() : '';

    // Considera SOMENTE linhas onde CÓDIGO esteja preenchido
    if (codigo.length > 0) {
      var ct = dRow[2] ? String(dRow[2]).trim() : '';
      var oficioParada = dRow[3] ? String(dRow[3]).trim() : '';
      var dataParada = formatDateValue(vRow[5], tz) || (dRow[5] ? String(dRow[5]).trim() : '');
      var motivo = dRow[7] ? String(dRow[7]).trim() : '';
      var oficioRetorno = dRow[8] ? String(dRow[8]).trim() : '';
      var dataRetorno = formatDateValue(vRow[10], tz) || (dRow[10] ? String(dRow[10]).trim() : '');
      var tipo = (dRow.length >= 18 && dRow[17]) ? String(dRow[17]).trim() : '';

      historico.push({
        rowNumber: i + 2,
        ct: ct,
        codigo: codigo,
        tipo: tipo,
        motivo: motivo,
        oficioParada: oficioParada,
        dataParada: dataParada,
        oficioRetorno: oficioRetorno,
        dataRetorno: dataRetorno
      });
    }
  }

  // 3. Salva no CacheService com TTL de 5 minutos (300s)
  try {
    putInScriptCache(cache, CACHE_KEY_HISTORICO, historico, CACHE_TTL_HISTORICO);
  } catch (putErr) {}

  return historico;
}

/**
 * Validador de formato de ofício (número/ano com conteúdo antes e depois da barra)
 */
function isValidOficioFormat(str) {
  if (!str) return false;
  var s = String(str).trim();
  if (s.indexOf('/') === -1) return false;
  var parts = s.split('/');
  if (parts.length < 2) return false;
  var before = parts[0].trim();
  var after = parts.slice(1).join('/').trim();
  return before.length > 0 && after.length > 0;
}

/**
 * 3. Grava ocorrência(s) de PARADA (1 linha individual por equipamento com UUID próprio)
 */
function handleRegistrarParada(payload) {
  if (!payload) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Payload não informado.' }
    };
  }

  // Extrai lista de códigos (suporta array 'codigos' ou único 'codigo')
  var rawCodigos = [];
  if (Array.isArray(payload.codigos)) {
    rawCodigos = payload.codigos;
  } else if (payload.codigo) {
    rawCodigos = [payload.codigo];
  }

  // Limpa e deduplica códigos defensivamente
  var uniqueCodigos = [];
  var seen = {};
  for (var c = 0; c < rawCodigos.length; c++) {
    var cod = String(rawCodigos[c] || '').trim();
    if (cod.length > 0 && !seen[cod.toUpperCase()]) {
      seen[cod.toUpperCase()] = true;
      uniqueCodigos.push(cod);
    }
  }

  if (uniqueCodigos.length === 0) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Nenhum equipamento válido foi selecionado para registro da parada.'
      }
    };
  }

  // Validação obrigatória do formato de ofício (número/ano com barra)
  if (!isValidOficioFormat(payload.oficioParada)) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Informe o ofício no formato número/ano. Ex.: 187/26.'
      }
    };
  }

  if (!payload.informadoI || !payload.dataParadaI || !payload.motivo) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Campos obrigatórios da parada não foram informados (Informado I, Data Parada I, Motivo).'
      }
    };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_EQUIPAMENTOS_OFF);
  if (!sheet) {
    throw new Error('Aba "' + SHEET_EQUIPAMENTOS_OFF + '" não encontrada na planilha.');
  }

  var tz = ss.getSpreadsheetTimeZone();

  // Localiza a próxima linha operacional baseando-se na Coluna A
  var startRow = findNextRealRowByColumnA(sheet);

  // Converte datas respeitando o timezone da planilha
  var dateInformadoI = parseDateInTz(payload.informadoI, tz);
  var dateDataParadaI = parseDateInTz(payload.dataParadaI, tz);

  var createdIds = [];

  // Cria 1 LINHA INDIVIDUAL para cada equipamento selecionado
  for (var i = 0; i < uniqueCodigos.length; i++) {
    var targetRow = startRow + i;
    // Cada ocorrência recebe seu PRÓPRIO UUID único
    var idControle = Utilities.getUuid();
    createdIds.push(idControle);

    // Escrita SELETIVA por célula (NÃO sobrescreve colunas de fórmula C, G, L nem B, N, P, Q, R):
    sheet.getRange(targetRow, 1).setValue(uniqueCodigos[i]); // A: CÓDIGO
    sheet.getRange(targetRow, 4).setValue(String(payload.oficioParada).trim()); // D: OF (preserva zeros)
    sheet.getRange(targetRow, 5).setValue(dateInformadoI); // E: INFORMADO I
    sheet.getRange(targetRow, 6).setValue(dateDataParadaI); // F: DATA PARADA I
    sheet.getRange(targetRow, 8).setValue(String(payload.motivo).trim()); // H: MOTIVO

    // M: HORÁRIO VANDALISMO (apenas se MOTIVO = VANDALISMO/FURTO)
    if (String(payload.motivo).trim() === 'VANDALISMO/FURTO' && payload.horarioVandalismo) {
      sheet.getRange(targetRow, 13).setValue(String(payload.horarioVandalismo).trim());
    }

    // O: OBSERVAÇÃO (se informada)
    if (payload.observacao && String(payload.observacao).trim().length > 0) {
      sheet.getRange(targetRow, 15).setValue(String(payload.observacao).trim());
    }

    // S: ID_CONTROLE único
    sheet.getRange(targetRow, 19).setValue(idControle);
  }

  // Invalida o cache do relatório histórico para refletir imediatamente novos lançamentos
  try {
    var cache = CacheService.getScriptCache();
    cache.remove(CACHE_KEY_HISTORICO);
    cache.remove(CACHE_KEY_HISTORICO + '_chunks');
  } catch (e) {}

  var count = uniqueCodigos.length;
  var successMsg = count > 1
    ? (count + ' paradas registradas com sucesso.')
    : 'Parada registrada com sucesso.';

  return {
    ok: true,
    data: {
      message: successMsg,
      count: count,
      codigos: uniqueCodigos,
      ids: createdIds,
      rowNumber: startRow
    }
  };
}

/**
 * 4. Grava o RETORNO complementando a linha existente
 */
function handleRegistrarRetorno(payload) {
  if (!payload || !payload.codigo || !payload.oficioParada || !payload.dataParadaI || !payload.oficioRetorno || !payload.informadoF || !payload.retornoF) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Campos obrigatórios do retorno não foram informados (Ofício Retorno, Informado F, Retorno F).'
      }
    };
  }

  // Validação do formato de ofício de retorno (número/ano com barra)
  if (!isValidOficioFormat(payload.oficioRetorno)) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Informe o ofício no formato número/ano. Ex.: 187/26.'
      }
    };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_EQUIPAMENTOS_OFF);
  if (!sheet) {
    throw new Error('Aba "' + SHEET_EQUIPAMENTOS_OFF + '" não encontrada na planilha.');
  }

  var tz = ss.getSpreadsheetTimeZone();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Nenhuma ocorrência encontrada na planilha.' }
    };
  }

  var numCols = Math.max(19, sheet.getLastColumn());
  var values = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();

  var targetRowIndex = -1;
  var targetRowData = null;

  // 1. Busca prioritária por ID_CONTROLE (coluna S = index 18)
  if (payload.idControle && String(payload.idControle).trim().length > 0) {
    var searchId = String(payload.idControle).trim();
    for (var i = 0; i < values.length; i++) {
      if (values[i].length >= 19 && String(values[i][18]).trim() === searchId) {
        targetRowIndex = i + 2;
        targetRowData = values[i];
        break;
      }
    }
  }

  // 2. Fallback: Busca pela chave composta (A + D + F) para históricos sem ID
  if (targetRowIndex === -1) {
    var searchCod = String(payload.codigo).trim().toUpperCase();
    var searchOf = String(payload.oficioParada).trim().toUpperCase();
    var searchDataF = normalizeDateString(payload.dataParadaI);

    for (var j = 0; j < values.length; j++) {
      var rowCod = String(values[j][0] || '').trim().toUpperCase();
      var rowOf = String(values[j][3] || '').trim().toUpperCase();
      var rowDataF = formatDateValue(values[j][5], tz);

      if (rowCod === searchCod && rowOf === searchOf && rowDataF === searchDataF) {
        targetRowIndex = j + 2;
        targetRowData = values[j];
        break;
      }
    }
  }

  if (targetRowIndex === -1 || !targetRowData) {
    return {
      ok: false,
      error: {
        code: 'OCCURRENCE_NOT_FOUND',
        message: 'Não foi possível localizar a ocorrência original correspondente na planilha.'
      }
    };
  }

  // PROTEÇÃO CONTRA DUPLO RETORNO:
  // Relê o valor da coluna I diretamente para garantir integridade
  var currentOficioRetorno = sheet.getRange(targetRowIndex, 9).getValue();
  if (currentOficioRetorno !== null && currentOficioRetorno !== undefined && String(currentOficioRetorno).trim().length > 0) {
    return {
      ok: false,
      error: {
        code: 'ALREADY_CLOSED',
        message: 'Esta ocorrência já possui retorno registrado.'
      }
    };
  }

  // Se o registro histórico não possuía ID_CONTROLE na coluna S, gera e grava agora
  var finalIdControle = payload.idControle;
  var currentIdInSheet = targetRowData.length >= 19 ? String(targetRowData[18] || '').trim() : '';
  if (!currentIdInSheet) {
    finalIdControle = Utilities.getUuid();
    sheet.getRange(targetRowIndex, 19).setValue(finalIdControle);
  }

  // Converte datas para o timezone da planilha
  var dateInformadoF = parseDateInTz(payload.informadoF, tz);
  var dateRetornoF = parseDateInTz(payload.retornoF, tz);

  // Escrita SELETIVA do Retorno:
  sheet.getRange(targetRowIndex, 9).setValue(String(payload.oficioRetorno).trim()); // I: OFÍCIO DE RETORNO
  sheet.getRange(targetRowIndex, 10).setValue(dateInformadoF); // J: INFORMADO F
  sheet.getRange(targetRowIndex, 11).setValue(dateRetornoF); // K: RETORNO F

  // Validação e escrita opcional do campo MEDIÇÃO (Coluna N = 14):
  // Opções válidas permitidas: MANUAL, PARCIAL, SISTEMA TIVIC
  var ALLOWED_MEDICAO = {
    'MANUAL': true,
    'PARCIAL': true,
    'SISTEMA TIVIC': true
  };

  if (payload.medicao && String(payload.medicao).trim().length > 0) {
    var rawMed = String(payload.medicao).trim().toUpperCase();
    if (ALLOWED_MEDICAO[rawMed]) {
      sheet.getRange(targetRowIndex, 14).setValue(rawMed); // N: MEDIÇÃO
    } else {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Valor inválido para o campo Medição. Opções permitidas: MANUAL, PARCIAL, SISTEMA TIVIC.'
        }
      };
    }
  }

  // Tratamento da observação complementar:
  if (payload.complementoObservacao && String(payload.complementoObservacao).trim().length > 0) {
    var existingObs = String(sheet.getRange(targetRowIndex, 15).getValue() || '').trim();
    var complemento = String(payload.complementoObservacao).trim();
    var finalObs = existingObs.length > 0 ? (existingObs + '\n' + complemento) : complemento;
    sheet.getRange(targetRowIndex, 15).setValue(finalObs);
  }

  // Invalida o cache do relatório histórico para refletir imediatamente a alteração de status
  try {
    var cache = CacheService.getScriptCache();
    cache.remove(CACHE_KEY_HISTORICO);
    cache.remove(CACHE_KEY_HISTORICO + '_chunks');
  } catch (e) {}

  return {
    ok: true,
    data: {
      message: 'Retorno registrado com sucesso.',
      idControle: finalIdControle,
      rowNumber: targetRowIndex
    }
  };
}

/**
 * Encontra a próxima linha real com base na Coluna A (ignora fórmulas pré-existentes em outras colunas)
 */
function findNextRealRowByColumnA(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return 2;
  }

  var colAValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var lastFilledIndex = -1;

  for (var i = colAValues.length - 1; i >= 0; i--) {
    var cell = colAValues[i][0];
    if (cell !== null && cell !== undefined && String(cell).trim().length > 0) {
      lastFilledIndex = i;
      break;
    }
  }

  // Linha 2 + índice da última preenchida + 1
  return lastFilledIndex === -1 ? 2 : (2 + lastFilledIndex + 1);
}

/**
 * Utilitário de formatação de data
 */
function formatDateValue(val, tz) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, tz, 'yyyy-MM-dd');
  }
  return normalizeDateString(String(val));
}

/**
 * Utilitário de formatação de hora
 */
function formatTimeValue(val) {
  if (!val) return '';
  if (val instanceof Date) {
    var h = ('0' + val.getHours()).slice(-2);
    var m = ('0' + val.getMinutes()).slice(-2);
    return h + ':' + m;
  }
  var str = String(val).trim();
  if (/^\d{1,2}:\d{2}/.test(str)) {
    return str.substring(0, 5);
  }
  return str;
}

/**
 * Normaliza string de data para YYYY-MM-DD
 */
function normalizeDateString(str) {
  if (!str) return '';
  str = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  // Se estiver em DD/MM/YYYY
  var parts = str.split('/');
  if (parts.length === 3) {
    var day = ('0' + parts[0]).slice(-2);
    var month = ('0' + parts[1]).slice(-2);
    var year = parts[2].length === 2 ? ('20' + parts[2]) : parts[2];
    return year + '-' + month + '-' + day;
  }
  return str;
}

/**
 * Cria objeto Date respeitando o fuso da planilha para evitar offset de dia
 */
function parseDateInTz(isoDateStr, tz) {
  if (!isoDateStr) return null;
  var parts = String(isoDateStr).substring(0, 10).split('-');
  if (parts.length === 3) {
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10) - 1;
    var d = parseInt(parts[2], 10);
    // Meio-dia para evitar shifts de timezone
    return new Date(y, m, d, 12, 0, 0);
  }
  return new Date(isoDateStr);
}

/**
 * Helper para resposta JSON padronizada com cabeçalhos CORS
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
