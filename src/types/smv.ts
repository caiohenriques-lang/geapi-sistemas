export type TipoSMV = 'PODA' | 'SINALIZAÇÃO VERTICAL' | 'SINALIZAÇÃO HORIZONTAL';

export type TipoPavimento = 'ASFALTO' | 'CALÇAMENTO' | 'CONCRETO';

export interface ServidorItem {
  id: string; // e.g. "1748"
  matricula: string; // e.g. "1748"
  nome: string; // e.g. "CAIO HENRIQUES DE O. LOBO CORDEIRO"
  formattedLabel: string; // e.g. "1748 - CAIO HENRIQUES DE O. LOBO CORDEIRO"
  matriculaBT: string; // e.g. "BT01748"
}

export interface AnnotationShape {
  id: string;
  type: 'rectangle' | 'arrow';
  startX: number; // 0..1 (normalized relative coordinate)
  startY: number; // 0..1
  endX: number;   // 0..1
  endY: number;   // 0..1
}

export interface CropArea {
  x: number;      // 0..1 relative to original image
  y: number;      // 0..1
  width: number;  // 0..1
  height: number; // 0..1
}

export interface SmvPhotoItem {
  id: string;
  file: File;
  objectUrl: string;
  name: string;
  observacao?: string;
  annotations?: AnnotationShape[];
  crop?: CropArea;
  croppedObjectUrl?: string;
  annotatedObjectUrl?: string;
}

export interface SmvFormData {
  tipoSmv: TipoSMV | '';
  numeroCentral: string; // exactly 6 numeric digits
  ano: number; // e.g. 2026
  solicitante: ServidorItem | null;
  area: string; // fixed "GEAPI"
  administracaoRegional: string;
  servicoReferente: string;
  logradouro: string;
  bairro: string;
  localizacao: string;
  tipoPavimento: TipoPavimento | '';
  fotos: SmvPhotoItem[];
  responsavelTecnico: ServidorItem | null;
  gerenteArea: string; // fixed "LEONARDO RIOS BRONZO ALMEIDA - BT01135"
  dataConfeccao: string; // DD/MM/AAAA
  encaminhamento: string; // auto based on TipoSMV
}

export interface ValidationErrors {
  tipoSmv?: string;
  numeroCentral?: string;
  solicitante?: string;
  administracaoRegional?: string;
  servicoReferente?: string;
  logradouro?: string;
  bairro?: string;
  localizacao?: string;
  tipoPavimento?: string;
  fotos?: string;
  responsavelTecnico?: string;
  dataConfeccao?: string;
}
