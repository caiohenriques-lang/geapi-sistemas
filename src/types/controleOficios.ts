export interface OcorrenciaParadaPayload {
  codigos: string[];
  codigo?: string;
  oficioParada: string;
  informadoI: string;
  dataParadaI: string;
  motivo: string;
  horarioVandalismo?: string;
  observacao?: string;
  idControle?: string;
}

export interface OcorrenciaRetornoPayload {
  idControle?: string;
  codigo: string;
  oficioParada: string;
  dataParadaI: string;
  oficioRetorno: string;
  informadoF: string;
  retornoF: string;
  complementoObservacao?: string;
}

export interface OcorrenciaAberta {
  idControle?: string;
  codigo: string;
  oficioParada: string;
  informadoI: string;
  dataParadaI: string;
  motivo: string;
  horarioVandalismo?: string;
  observacao?: string;
  rowNumber?: number;
}

export interface HistoricoOficiosItem {
  rowNumber?: number;
  ct: string;
  codigo: string;
  tipo: string;
  motivo: string;
  oficioParada: string;
  dataParada: string;
  oficioRetorno: string;
  dataRetorno: string;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export const MOTIVOS_OFICIAIS = [
  'ABALROAMENTO NO EQUIPAMENTO',
  'ACIONAMENTO SEM VEÍCULO',
  'AFERIÇÃO REPROVADA',
  'AFERIÇÃO VENCIDA',
  'AVANÇO NO SINAL VERDE',
  'CABEAMENTO ROMPIDO',
  'CABO DE REDE DA PANORÂMICA FRONTAL ROMPIDO',
  'CÂMERA QUEIMADA',
  'COMPONENTES ELETRÔNICOS QUEIMADOS',
  'CONJUNTO DE CÂMERAS QUEIMADAS',
  'DEFEITO NA PLACA BDV',
  'DESCARGA ELÉTRICA',
  'FALHA NO FUNCIONAMENTO',
  'FALTA DE ENERGIA ELÉTRICA NO PADRÃO',
  'LAÇO ROMPIDO',
  'MÁS CONDIÇÕES DO PAVIMENTO',
  'MEDIDOR DAFINICADO',
  'OBRAS',
  'PROBLEMA NA CÂMERA',
  'RECAPEAMENTO/FREZAMENTO',
  'ROMPIMENTO DE CABOS',
  'ROMPIMENTO DO LACRE IPEM',
  'SEMÁFORO EM FLASH',
  'SINALIZAÇÃO ABALROADA',
  'TRAVAMENTO NO SOFTWARE',
  'VANDALISMO/FURTO',
] as const;

export type MotivoOficial = typeof MOTIVOS_OFICIAIS[number];
