import ExcelJS from 'exceljs';
import { SmvFormData, SmvPhotoItem } from '../types/smv';
import {
  getPrefixoByTipoSMV,
  getSmvDocumentFileName,
  formatFullSmvNumber,
} from './smvRules';

export interface GenerateExcelOptions {
  formData: SmvFormData;
}

/**
 * Converte arquivo de foto em ArrayBuffer para embed no ExcelJS
 */
async function getPhotoBuffer(photo: SmvPhotoItem): Promise<ArrayBuffer | null> {
  try {
    if (photo.file) {
      return await photo.file.arrayBuffer();
    }
    if (photo.objectUrl) {
      const res = await fetch(photo.objectUrl);
      return await res.arrayBuffer();
    }
  } catch (err) {
    console.warn('Erro ao ler buffer da foto para Excel:', err);
  }
  return null;
}

export async function generateExcel({ formData }: GenerateExcelOptions): Promise<{
  fileName: string;
  success: boolean;
}> {
  const prefixo = getPrefixoByTipoSMV(formData.tipoSmv);
  const fullSmvNumber = formatFullSmvNumber(prefixo, formData.numeroCentral, formData.ano);
  const fileName = getSmvDocumentFileName(prefixo, formData.numeroCentral, formData.ano, 'xlsx');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GEAPI - PBH';
  workbook.lastModifiedBy = 'GEAPI - PBH';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('SMV', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2,
      },
    },
    views: [{ showGridLines: true }],
  });

  // Column widths definition (Columns A to H = 8 columns)
  worksheet.columns = [
    { key: 'A', width: 14 },
    { key: 'B', width: 14 },
    { key: 'C', width: 14 },
    { key: 'D', width: 14 },
    { key: 'E', width: 14 },
    { key: 'F', width: 14 },
    { key: 'G', width: 14 },
    { key: 'H', width: 14 },
  ];

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };

  const applyBorderToRange = (startCell: string, endCell: string) => {
    const startCol = startCell.charCodeAt(0) - 64;
    const startRow = parseInt(startCell.substring(1), 10);
    const endCol = endCell.charCodeAt(0) - 64;
    const endRow = parseInt(endCell.substring(1), 10);

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = worksheet.getCell(r, c);
        cell.border = thinBorder;
      }
    }
  };

  // Row 1: Header Title
  worksheet.mergeCells('A1:H1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'S O L I C I T A Ç Ã O   D E   M A N U T E N Ç Ã O   D E   V I A S';
  titleCell.font = { name: 'Times New Roman', size: 12, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 36;
  applyBorderToRange('A1', 'H1');

  // Row 2: Nº SMV
  worksheet.mergeCells('A2:H2');
  const numCell = worksheet.getCell('A2');
  numCell.value = `Nº  ${fullSmvNumber}`;
  numCell.font = { name: 'Arial', size: 11, bold: true };
  numCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  worksheet.getRow(2).height = 22;
  applyBorderToRange('A2', 'H2');

  // Row 3: SOLICITANTE (A3:E3) | ÁREA (F3:H3)
  // Regra: Solicitante exibe somente nome
  worksheet.mergeCells('A3:E3');
  const solCell = worksheet.getCell('A3');
  solCell.value = `SOLICITANTE:  ${formData.solicitante ? formData.solicitante.nome : ''}`;
  solCell.font = { name: 'Arial', size: 9, bold: false };
  solCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  worksheet.mergeCells('F3:H3');
  const areaCell = worksheet.getCell('F3');
  areaCell.value = `ÁREA:  ${formData.area || 'GEAPI'}`;
  areaCell.font = { name: 'Arial', size: 9, bold: true };
  areaCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  worksheet.getRow(3).height = 24;
  applyBorderToRange('A3', 'E3');
  applyBorderToRange('F3', 'H3');

  // Row 4: ADMINISTRAÇÃO REGIONAL
  worksheet.mergeCells('A4:H4');
  const regCell = worksheet.getCell('A4');
  regCell.value = `ADMINISTRAÇÃO REGIONAL:  ${formData.administracaoRegional || ''}`;
  regCell.font = { name: 'Arial', size: 9 };
  regCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  worksheet.getRow(4).height = 24;
  applyBorderToRange('A4', 'H4');

  // Row 5: SERVIÇO REFERENTE
  worksheet.mergeCells('A5:H5');
  const srvCell = worksheet.getCell('A5');
  srvCell.value = `SERVIÇO REFERENTE:  ${formData.servicoReferente || ''}`;
  srvCell.font = { name: 'Arial', size: 9 };
  srvCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  worksheet.getRow(5).height = 24;
  applyBorderToRange('A5', 'H5');

  // Row 6: LOGRADOURO (A6:E6) | BAIRRO (F6:H6)
  worksheet.mergeCells('A6:E6');
  const logCell = worksheet.getCell('A6');
  logCell.value = `LOGRADOURO:  ${formData.logradouro || ''}`;
  logCell.font = { name: 'Arial', size: 9 };
  logCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  worksheet.mergeCells('F6:H6');
  const baiCell = worksheet.getCell('F6');
  baiCell.value = `BAIRRO:  ${formData.bairro || ''}`;
  baiCell.font = { name: 'Arial', size: 9 };
  baiCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  worksheet.getRow(6).height = 24;
  applyBorderToRange('A6', 'E6');
  applyBorderToRange('F6', 'H6');

  // Row 7: LOCALIZAÇÃO
  worksheet.mergeCells('A7:H7');
  const locCell = worksheet.getCell('A7');
  locCell.value = `LOCALIZAÇÃO:  ${formData.localizacao || ''}`;
  locCell.font = { name: 'Arial', size: 9 };
  locCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  worksheet.getRow(7).height = 24;
  applyBorderToRange('A7', 'H7');

  // Row 8: TIPO DE PAVIMENTO
  worksheet.mergeCells('A8:H8');
  const pavCell = worksheet.getCell('A8');
  pavCell.value = `TIPO DE PAVIMENTO:  ${formData.tipoPavimento || ''}`;
  pavCell.font = { name: 'Arial', size: 9 };
  pavCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  worksheet.getRow(8).height = 24;
  applyBorderToRange('A8', 'H8');

  // Rows 9 to 24: OBSERVAÇÕES / CROQUI (Grandes linhas para acomodar fotos)
  worksheet.mergeCells('A9:H24');
  const croquiCell = worksheet.getCell('A9');
  croquiCell.value = 'OBSERVAÇÕES / CROQUI:';
  croquiCell.font = { name: 'Arial', size: 8, bold: true };
  croquiCell.alignment = { horizontal: 'left', vertical: 'top', indent: 1 };
  applyBorderToRange('A9', 'H24');

  for (let r = 9; r <= 24; r++) {
    worksheet.getRow(r).height = 18;
  }

  // Row 25: RESPONSÁVEL TÉCNICO (A25:D25) | GERENTE DA ÁREA (E25:H25)
  // Regra: Responsável Técnico = Nome + Matrícula BT
  worksheet.mergeCells('A25:D25');
  const respCell = worksheet.getCell('A25');
  const respLabel = formData.responsavelTecnico
    ? `${formData.responsavelTecnico.nome} - ${formData.responsavelTecnico.matriculaBT}`
    : '';
  respCell.value = `RESPONSÁVEL TÉCNICO:  ${respLabel}`;
  respCell.font = { name: 'Arial', size: 8.5 };
  respCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  worksheet.mergeCells('E25:H25');
  const gerCell = worksheet.getCell('E25');
  gerCell.value = `GERENTE DA ÁREA:  ${formData.gerenteArea || 'LEONARDO RIOS BRONZO ALMEIDA - BT01135'}`;
  gerCell.font = { name: 'Arial', size: 8.5 };
  gerCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  worksheet.getRow(25).height = 28;
  applyBorderToRange('A25', 'D25');
  applyBorderToRange('E25', 'H25');

  // Row 26: DATA (A26:D26) | DATA (E26:H26)
  worksheet.mergeCells('A26:D26');
  const date1Cell = worksheet.getCell('A26');
  date1Cell.value = `DATA:  ${formData.dataConfeccao || ''}`;
  date1Cell.font = { name: 'Arial', size: 8.5 };
  date1Cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  worksheet.mergeCells('E26:H26');
  const date2Cell = worksheet.getCell('E26');
  date2Cell.value = `DATA:  ${formData.dataConfeccao || ''}`;
  date2Cell.font = { name: 'Arial', size: 8.5 };
  date2Cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  worksheet.getRow(26).height = 22;
  applyBorderToRange('A26', 'D26');
  applyBorderToRange('E26', 'H26');

  // Row 27: ENCAMINHAMENTO
  worksheet.mergeCells('A27:H27');
  const encCell = worksheet.getCell('A27');
  encCell.value = `ENCAMINHAMENTO:   PARA: ${formData.encaminhamento || ''}           DATA: _____/_____/_________`;
  encCell.font = { name: 'Arial', size: 8.5, bold: true };
  encCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  worksheet.getRow(27).height = 26;
  applyBorderToRange('A27', 'H27');

  // Row 28 to 30: PROVIDÊNCIAS TOMADAS
  worksheet.mergeCells('A28:H30');
  const provCell = worksheet.getCell('A28');
  provCell.value = 'PROVIDÊNCIAS TOMADAS:';
  provCell.font = { name: 'Arial', size: 8, bold: true };
  provCell.alignment = { horizontal: 'left', vertical: 'top', indent: 1 };
  applyBorderToRange('A28', 'H30');
  worksheet.getRow(28).height = 18;
  worksheet.getRow(29).height = 18;
  worksheet.getRow(30).height = 18;

  // Embed Photos into Excel Croqui area
  if (formData.fotos && formData.fotos.length > 0) {
    const photosToEmbed = formData.fotos.slice(0, 4);

    for (let i = 0; i < photosToEmbed.length; i++) {
      const photo = photosToEmbed[i];
      const buffer = await getPhotoBuffer(photo);
      if (buffer) {
        const isPng = photo.file?.type === 'image/png';
        const imageId = workbook.addImage({
          buffer: buffer as any,
          extension: isPng ? 'png' : 'jpeg',
        });

        // Calculate positioning inside croqui (Rows 9 to 24, Cols 0 to 7)
        if (photosToEmbed.length === 1) {
          worksheet.addImage(imageId, {
            tl: { col: 1.5, row: 9.5 },
            ext: { width: 420, height: 240 },
          });
        } else if (photosToEmbed.length === 2) {
          if (i === 0) {
            worksheet.addImage(imageId, {
              tl: { col: 0.5, row: 9.5 },
              ext: { width: 250, height: 230 },
            });
          } else {
            worksheet.addImage(imageId, {
              tl: { col: 4.5, row: 9.5 },
              ext: { width: 250, height: 230 },
            });
          }
        } else if (photosToEmbed.length === 3) {
          if (i === 0) {
            worksheet.addImage(imageId, {
              tl: { col: 1.5, row: 9.5 },
              ext: { width: 380, height: 120 },
            });
          } else if (i === 1) {
            worksheet.addImage(imageId, {
              tl: { col: 0.5, row: 16.5 },
              ext: { width: 240, height: 120 },
            });
          } else {
            worksheet.addImage(imageId, {
              tl: { col: 4.5, row: 16.5 },
              ext: { width: 240, height: 120 },
            });
          }
        } else {
          // 4 photos (2x2)
          const colOffset = (i % 2 === 0) ? 0.5 : 4.5;
          const rowOffset = (i < 2) ? 9.5 : 16.5;
          worksheet.addImage(imageId, {
            tl: { col: colOffset, row: rowOffset },
            ext: { width: 240, height: 115 },
          });
        }
      }
    }
  }

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

  return {
    fileName,
    success: true,
  };
}
