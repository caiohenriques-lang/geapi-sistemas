export interface MapReferenceItem {
  codigo: string;       // Column D (index 3) - e.g. "KBH13022"
  endereco: string;     // Column K (index 10) or G (index 6) - e.g. "Av. Olinto Meireles, 308"
  corredor?: string;    // Column F (index 5)
  bairro?: string;      // Column I (index 8)
  regional?: string;    // Column J (index 9)
  coordRaw: string;     // Column Z (index 25) - e.g. "-19.973963,-44.013336"
  lat: number | null;
  lng: number | null;
  isValidCoord: boolean;
}

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTMqNFwW7A6_F2X16VVXddLQgovMI5sEAbUq1cgT0vF3CDGL1dGjYn5nciuxPpZCiF-_hyXHi8k-Bgt/pub?gid=226357776&single=true&output=csv';

let memoryCache: MapReferenceItem[] | null = null;
let fetchPromise: Promise<MapReferenceItem[]> | null = null;

/**
 * Parser de linha CSV com suporte a aspas e vírgulas internas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(currentVal.trim());
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  result.push(currentVal.trim());
  return result;
}

/**
 * Interpretador robusto de coordenadas da COLUNA Z.
 * Suporta formatos:
 * 1. "-19.973963,-44.013336" (ponto decimal padrão)
 * 2. "-19,886166,-43.929663" (vírgula decimal brasileira)
 * 3. "-19.973963 -44.013336" (espaço divisor)
 */
export function parseLatLongCoords(
  coordsStr: string | undefined | null
): { lat: number; lng: number } | null {
  if (!coordsStr || typeof coordsStr !== 'string') return null;
  const s = coordsStr.trim();
  if (!s) return null;

  // 1. Formato padrão: "-19.973963,-44.013336" ou "-19.973963, -44.013336"
  const stdMatch = s.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (stdMatch) {
    const lat = parseFloat(stdMatch[1]);
    const lng = parseFloat(stdMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  // 2. Normalizar vírgulas decimais brasileiras (ex: "-19,886166,-43.929663")
  const normalized = s.replace(/(\d+),(\d+)/g, '$1.$2');
  const normMatch = normalized.match(/^(-?\d+(?:\.\d+)?)\s*[\s,]\s*(-?\d+(?:\.\d+)?)$/);
  if (normMatch) {
    const lat = parseFloat(normMatch[1]);
    const lng = parseFloat(normMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  // 3. Extrair dois números de ponto flutuante válidos
  const matches = normalized.match(/-?\d+\.\d+/g);
  if (matches && matches.length >= 2) {
    const lat = parseFloat(matches[0]);
    const lng = parseFloat(matches[1]);
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  return null;
}

/**
 * Busca e parseia a lista pública de referências da planilha Google Sheets.
 * Armazena em cache de memória na sessão.
 */
export async function fetchMapReferences(): Promise<MapReferenceItem[]> {
  if (memoryCache) {
    return memoryCache;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const response = await fetch(SHEET_CSV_URL);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - Falha ao carregar planilha pública.`);
      }

      const csvText = await response.text();
      const lines = csvText.split(/\r?\n/);
      if (lines.length <= 1) {
        return [];
      }

      const items: MapReferenceItem[] = [];
      const seenCodes = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const row = parseCSVLine(line);
        const codigo = row[3]?.trim(); // COLUNA D
        if (!codigo) continue;

        // Evitar duplicados exatos mantendo a primeira ocorrência
        if (seenCodes.has(codigo)) continue;
        seenCodes.add(codigo);

        const endereco = row[10]?.trim() || row[6]?.trim() || ''; // COLUNA K / G
        const corredor = row[5]?.trim() || undefined; // COLUNA F
        const bairro = row[8]?.trim() || undefined; // COLUNA I
        const regional = row[9]?.trim() || undefined; // COLUNA J
        const coordRaw = row[25]?.trim() || ''; // COLUNA Z

        const coords = parseLatLongCoords(coordRaw);
        const lat = coords ? coords.lat : null;
        const lng = coords ? coords.lng : null;
        const isValidCoord = lat !== null && lng !== null;

        items.push({
          codigo,
          endereco,
          corredor,
          bairro,
          regional,
          coordRaw,
          lat,
          lng,
          isValidCoord,
        });
      }

      memoryCache = items;
      return items;
    } catch (err) {
      console.error('Erro ao buscar lista de locais de referência:', err);
      fetchPromise = null;
      throw err;
    }
  })();

  return fetchPromise;
}

/**
 * Limpa o cache em memória (utilizado em reset da sessão se necessário)
 */
export function clearMapReferencesCache(): void {
  memoryCache = null;
  fetchPromise = null;
}
