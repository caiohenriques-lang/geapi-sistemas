/**
 * Utilitários para formatação de data no padrão brasileiro (DD/MM/AAAA)
 * e formatação textual institucional para o Controle de Ofícios.
 */

/**
 * Converte qualquer representação de data para o padrão visual obrigatório DD/MM/AAAA.
 * Nunca retorna formato YYYY-MM-DD para visualização do usuário.
 */
export function formatDateBR(value: string | Date | null | undefined): string {
  if (!value) return '';

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const str = String(value).trim();
  if (!str) return '';

  // Se já estiver no padrão DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  // Padrão ISO YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }

  // Padrão YYYY/MM/DD
  const slashMatch = str.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
  if (slashMatch) {
    const [, year, month, day] = slashMatch;
    return `${day}/${month}/${year}`;
  }

  // Caso seja string parseável por Date (ex.: "Thu Oct 01 2026 ...")
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    // Usa UTC se tiver indicação de fuso ou time
    if (str.includes('T') || str.includes('Z')) {
      const day = String(parsed.getUTCDate()).padStart(2, '0');
      const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
      const year = parsed.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return str;
}

/**
 * Formata lista de códigos de equipamentos em português:
 * 1 item: "KBH52041"
 * 2 itens: "KBH52041 e SPL132"
 * 3+ itens: "KBH52041, SPL132 e GBR287"
 */
export function formatEquipamentosListBR(items: string[]): string {
  if (!items || items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} e ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}
