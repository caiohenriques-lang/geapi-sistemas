import { ServidorItem, TipoPavimento, TipoSMV } from '../types/smv';

export const AREA_FIXA = 'GEAPI';
export const GERENTE_FIXO = 'LEONARDO RIOS BRONZO ALMEIDA - BT01135';

export function formatMatriculaBT(matricula: string): string {
  const numOnly = matricula.replace(/\D/g, '');
  return `BT${numOnly.padStart(5, '0')}`;
}

const RAW_SERVIDORES = [
  { matricula: '608', nome: 'CARLOS HENRIQUE TRÓPIA REQUENA' },
  { matricula: '725', nome: 'FLÁVIO ANDRÉ DE CASTRO BRAGA' },
  { matricula: '795', nome: 'GUSTAVO MARTINS DE MORAIS' },
  { matricula: '858', nome: 'RONARO DE ANDRADE FERREIRA' },
  { matricula: '1135', nome: 'LEONARDO RIOS BRONZO ALMEIDA' },
  { matricula: '1437', nome: 'ANTÔNIO EMERSON' },
  { matricula: '1478', nome: 'MARCOS PORTUGAL HORTA' },
  { matricula: '1589', nome: 'GISELLE SIMOES DA SILVA' },
  { matricula: '1647', nome: 'ANDERSON MAGALHÃES DE AGUIAR' },
  { matricula: '1704', nome: 'LEONARDO BARROS VINHAL MAIER' },
  { matricula: '1748', nome: 'CAIO HENRIQUES DE O. LOBO CORDEIRO' },
  { matricula: '1768', nome: 'JONATHAN DUARTE AMORIM LIMA' },
  { matricula: '1814', nome: 'JÉSSICA DE OLIVEIRA FONSECA' },
  { matricula: '1837', nome: 'VÂNIA JESUS DA ASSUNÇÃO' },
];

export const SERVIDORES_LISTA: ServidorItem[] = RAW_SERVIDORES.map((s) => {
  const matriculaBT = formatMatriculaBT(s.matricula);
  return {
    id: s.matricula,
    matricula: s.matricula,
    nome: s.nome,
    formattedLabel: `${s.matricula} - ${s.nome}`,
    matriculaBT,
  };
});

export const ADMINISTRACOES_REGIONAIS: string[] = [
  'BARREIRO',
  'CENTRO-SUL',
  'LESTE',
  'NORDESTE',
  'NOROESTE',
  'NORTE',
  'OESTE',
  'PAMPULHA',
  'VENDA NOVA',
];

export const TIPOS_SMV: TipoSMV[] = [
  'PODA',
  'SINALIZAÇÃO VERTICAL',
  'SINALIZAÇÃO HORIZONTAL',
];

export const TIPOS_PAVIMENTO: TipoPavimento[] = [
  'ASFALTO',
  'CALÇAMENTO',
  'CONCRETO',
];
