import { SmvFormData, TipoSMV, ValidationErrors } from '../types/smv';

/**
 * Retorna o prefixo do SMV com base no tipo selecionado.
 * PODA -> 23V
 * SINALIZAÇÃO VERTICAL -> 23V
 * SINALIZAÇÃO HORIZONTAL -> 23H
 */
export function getPrefixoByTipoSMV(tipo: TipoSMV | ''): string {
  if (tipo === 'SINALIZAÇÃO HORIZONTAL') {
    return '23H';
  }
  return '23V';
}

/**
 * Retorna o encaminhamento (PARA) automático com base no tipo.
 * PODA -> WILLIAM DOUGLAS ALVIM - GESIN
 * SINALIZAÇÃO VERTICAL -> WILLIAM DOUGLAS ALVIM - GESIN
 * SINALIZAÇÃO HORIZONTAL -> CARLOS HENRIQUE SANTANA - GESIN
 */
export function getEncaminhamentoByTipoSMV(tipo: TipoSMV | ''): string {
  if (tipo === 'SINALIZAÇÃO HORIZONTAL') {
    return 'CARLOS HENRIQUE SANTANA - GESIN';
  }
  return 'WILLIAM DOUGLAS ALVIM - GESIN';
}

/**
 * Formata e completa o número central com zeros à esquerda para ter exatamente 6 dígitos.
 * Exemplo: 53 -> 000053
 */
export function padCentralNumber(numero: string): string {
  const digits = (numero || '').replace(/\D/g, '').slice(0, 6);
  if (!digits) return '';
  return digits.padStart(6, '0');
}

/**
 * Validação do número central: entre 1 e 6 dígitos numéricos.
 */
export function validateNumeroCentral(numero: string): boolean {
  const digits = (numero || '').replace(/\D/g, '');
  return digits.length >= 1 && digits.length <= 6;
}

/**
 * Retorna o número completo do SMV formatado para exibição.
 * Exemplo: 23V-000053/2026
 */
export function formatFullSmvNumber(
  prefixo: string,
  numeroCentral: string,
  ano: number,
): string {
  const padded = padCentralNumber(numeroCentral) || '______';
  return `${prefixo}-${padded}/${ano}`;
}

/**
 * Retorna o nome oficial do arquivo gerado para o SMV.
 * Exemplo: SMV-23V-000053-2026.pdf
 */
export function getSmvDocumentFileName(
  prefixo: string,
  numeroCentral: string,
  ano: number,
  ext: 'pdf' | 'xlsx',
): string {
  const padded = padCentralNumber(numeroCentral) || '000000';
  return `SMV-${prefixo}-${padded}-${ano}.${ext}`;
}

/**
 * Formata um objeto Date para DD/MM/AAAA no horário local
 */
export function formatDateToBR(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Valida se a string fornecida está no formato DD/MM/AAAA válido
 */
export function isValidBRDate(dateStr: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return false;
  const [day, month, year] = dateStr.split('/').map(Number);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const testDate = new Date(year, month - 1, day);
  return (
    testDate.getFullYear() === year &&
    testDate.getMonth() === month - 1 &&
    testDate.getDate() === day
  );
}

/**
 * Executa todas as validações obrigatórias no formulário do SMV.
 */
export function validateForm(formData: SmvFormData): {
  isValid: boolean;
  errors: ValidationErrors;
} {
  const errors: ValidationErrors = {};

  if (!formData.tipoSmv) {
    errors.tipoSmv = 'Escolha obrigatória do tipo de SMV.';
  }

  if (!formData.numeroCentral || !validateNumeroCentral(formData.numeroCentral)) {
    errors.numeroCentral = 'O número deve possuir exatamente 6 dígitos numéricos.';
  }

  if (!formData.solicitante) {
    errors.solicitante = 'Solicitante é obrigatório.';
  }

  if (!formData.administracaoRegional.trim()) {
    errors.administracaoRegional = 'Administração Regional é obrigatória.';
  }

  if (!formData.servicoReferente.trim()) {
    errors.servicoReferente = 'Serviço Referente é obrigatório.';
  }

  if (!formData.logradouro.trim()) {
    errors.logradouro = 'Logradouro é obrigatório.';
  }

  if (!formData.bairro.trim()) {
    errors.bairro = 'Bairro é obrigatório.';
  }

  if (!formData.localizacao.trim()) {
    errors.localizacao = 'Localização é obrigatória.';
  }

  if (!formData.tipoPavimento) {
    errors.tipoPavimento = 'Tipo de Pavimento é obrigatório.';
  }

  if (!formData.fotos || formData.fotos.length < 1) {
    errors.fotos = 'É obrigatória a inclusão de pelo menos uma imagem.';
  }

  if (!formData.responsavelTecnico) {
    errors.responsavelTecnico = 'Responsável Técnico é obrigatório.';
  }

  if (!formData.dataConfeccao || !isValidBRDate(formData.dataConfeccao)) {
    errors.dataConfeccao = 'Informe uma data válida no formato DD/MM/AAAA.';
  }

  const isValid = Object.keys(errors).length === 0;

  return { isValid, errors };
}
