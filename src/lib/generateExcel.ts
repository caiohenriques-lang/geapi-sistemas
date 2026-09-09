import ExcelJS from 'exceljs';
import { SmvFormData } from '../types/smv';
import {
  getPrefixoByTipoSMV,
  getSmvDocumentFileName,
  formatFullSmvNumber,
} from './smvRules';

export interface GenerateExcelOptions {
  formData: SmvFormData;
}

export async function generateExcel({ formData }: GenerateExcelOptions): Promise<{
  fileName: string;
  success: boolean;
}> {
  const prefixo = getPrefixoByTipoSMV(formData.tipoSmv);
  const fileName = getSmvDocumentFileName(prefixo, formData.numeroCentral, formData.ano, 'xlsx');
  const fullNumber = formatFullSmvNumber(prefixo, formData.numeroCentral, formData.ano);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PBH / BHTRANS GEAPI';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('SMV', {
    views: [{ showGridLines: true }],
  });

  // Define column widths
  worksheet.columns = [
    { key: 'A', width: 22 },
    { key: 'B', width: 22 },
    { key: 'C', width: 22 },
    { key: 'D', width: 22 },
    { key: 'E', width: 22 },
  ];

  // Helper for cell border
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };

  // 1. Header Title (Rows 1 to 3) - NO extra institutional text
  worksheet.mergeCells('A1:D3');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'S O L I C I T A Ç Ã O   D E   M A N U T E N Ç Ã O   D E   V I A S';
  titleCell.font = { name: 'Times New Roman', size: 12, bold: true };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  for (let r = 1; r <= 3; r++) {
    for (let col of ['A', 'B', 'C', 'D', 'E']) {
      worksheet.getCell(`${col}${r}`).border = thinBorder;
    }
  }

  // Embed Logo in E1:E3
  try {
    const logoResp = await fetch('/logo_pbh_bhtrans.png');
    if (logoResp.ok) {
      const logoBuf = await logoResp.arrayBuffer();
      const imageId = workbook.addImage({
        buffer: logoBuf,
        extension: 'png',
      });
      worksheet.addImage(imageId, {
        tl: { col: 4, row: 0.2 } as any,
        br: { col: 5, row: 2.8 } as any,
      });
    }
  } catch (e) {
    console.warn('Could not add logo to Excel:', e);
  }

  // Row 4: Nº
  worksheet.mergeCells('A4:E4');
  const numCell = worksheet.getCell('A4');
  numCell.value = `Nº  ${fullNumber}`;
  numCell.font = { name: 'Calibri', size: 11, bold: true };
  numCell.alignment = { vertical: 'middle', horizontal: 'left' };
  for (let col of ['A', 'B', 'C', 'D', 'E']) {
    worksheet.getCell(`${col}4`).border = thinBorder;
  }

  // Row 5: SOLICITANTE | ÁREA
  // RULE: SOLICITANTE displays ONLY THE NAME (no matrícula, no BT)
  worksheet.mergeCells('A5:C5');
  const solName = formData.solicitante ? formData.solicitante.nome : '';
  worksheet.getCell('A5').value = `SOLICITANTE:  ${solName}`;
  worksheet.getCell('A5').font = { name: 'Calibri', size: 10, bold: true };

  worksheet.mergeCells('D5:E5');
  worksheet.getCell('D5').value = `ÁREA:  ${formData.area || 'GEAPI'}`;
  worksheet.getCell('D5').font = { name: 'Calibri', size: 10, bold: true };
  for (let col of ['A', 'B', 'C', 'D', 'E']) {
    worksheet.getCell(`${col}5`).border = thinBorder;
  }

  // Row 6: ADMINISTRAÇÃO REGIONAL
  worksheet.mergeCells('A6:E6');
  worksheet.getCell('A6').value = `ADMINISTRAÇÃO REGIONAL:  ${formData.administracaoRegional}`;
  worksheet.getCell('A6').font = { name: 'Calibri', size: 10, bold: true };
  for (let col of ['A', 'B', 'C', 'D', 'E']) {
    worksheet.getCell(`${col}6`).border = thinBorder;
  }

  // Row 7: SERVIÇO REFERENTE
  worksheet.mergeCells('A7:E7');
  worksheet.getCell('A7').value = `SERVIÇO REFERENTE:  ${formData.servicoReferente}`;
  worksheet.getCell('A7').font = { name: 'Calibri', size: 10, bold: true };
  for (let col of ['A', 'B', 'C', 'D', 'E']) {
    worksheet.getCell(`${col}7`).border = thinBorder;
  }

  // Row 8: LOGRADOURO | BAIRRO
  worksheet.mergeCells('A8:C8');
  worksheet.getCell('A8').value = `LOGRADOURO:  ${formData.logradouro}`;
  worksheet.getCell('A8').font = { name: 'Calibri', size: 10, bold: true };

  worksheet.mergeCells('D8:E8');
  worksheet.getCell('D8').value = `BAIRRO:  ${formData.bairro}`;
  worksheet.getCell('D8').font = { name: 'Calibri', size: 10, bold: true };
  for (let col of ['A', 'B', 'C', 'D', 'E']) {
    worksheet.getCell(`${col}8`).border = thinBorder;
  }

  // Row 9: LOCALIZAÇÃO
  worksheet.mergeCells('A9:E9');
  worksheet.getCell('A9').value = `LOCALIZAÇÃO:  ${formData.localizacao}`;
  worksheet.getCell('A9').font = { name: 'Calibri', size: 10, bold: true };
  for (let col of ['A', 'B', 'C', 'D', 'E']) {
    worksheet.getCell(`${col}9`).border = thinBorder;
  }

  // Row 10: TIPO DE PAVIMENTO
  worksheet.mergeCells('A10:E10');
  worksheet.getCell('A10').value = `TIPO DE PAVIMENTO:  ${formData.tipoPavimento}`;
  worksheet.getCell('A10').font = { name: 'Calibri', size: 10, bold: true };
  for (let col of ['A', 'B', 'C', 'D', 'E']) {
    worksheet.getCell(`${col}10`).border = thinBorder;
  }

  // Row 11: OBSERVAÇÕES / CROQUI Title Bar
  worksheet.mergeCells('A11:E11');
  worksheet.getCell('A11').value = 'OBSERVAÇÕES / CROQUI:';
  worksheet.getCell('A11').font = { name: 'Calibri', size: 10, bold: true };
  for (let col of ['A', 'B', 'C', 'D', 'E']) {
    worksheet.getCell(`${col}11`).border = thinBorder;
  }

  // Rows 12 to 24: CROQUI Photo Area
  for (let r = 12; r <= 24; r++) {
    for (let col of ['A', 'B', 'C', 'D', 'E']) {
      worksheet.getCell(`${col}${r}`).border = thinBorder;
    }
  }

  // Embed photos if available
  if (formData.fotos && formData.fotos.length > 0) {
    const photosToRender = formData.fotos.slice(0, 2);
    for (let i = 0; i < photosToRender.length; i++) {
      const photo = photosToRender[i];
      try {
        let photoBuf: ArrayBuffer | null = null;
        if (photo.file) {
          photoBuf = await photo.file.arrayBuffer();
        } else if (photo.objectUrl) {
          const r = await fetch(photo.objectUrl);
          photoBuf = await r.arrayBuffer();
        }
        if (photoBuf) {
          const imgExt = photo.file?.type?.includes('png') ? 'png' : 'jpeg';
          const imgId = workbook.addImage({
            buffer: photoBuf,
            extension: imgExt as any,
          });

          const hasObs = !!(photo.observacao && photo.observacao.trim());
          const maxRow = hasObs ? 22.8 : 23.7;

          if (photosToRender.length === 1) {
            worksheet.addImage(imgId, {
              tl: { col: 0.5, row: 11.3 } as any,
              br: { col: 4.5, row: maxRow } as any,
            });
            if (hasObs) {
              worksheet.mergeCells('A24:E24');
              const c = worksheet.getCell('A24');
              c.value = photo.observacao!.trim().toUpperCase();
              c.font = { name: 'Calibri', size: 9, bold: true };
              c.alignment = { horizontal: 'center', vertical: 'middle' };
            }
          } else if (i === 0) {
            worksheet.addImage(imgId, {
              tl: { col: 0.2, row: 11.3 } as any,
              br: { col: 2.3, row: maxRow } as any,
            });
            if (hasObs) {
              worksheet.mergeCells('A24:B24');
              const c = worksheet.getCell('A24');
              c.value = photo.observacao!.trim().toUpperCase();
              c.font = { name: 'Calibri', size: 9, bold: true };
              c.alignment = { horizontal: 'center', vertical: 'middle' };
            }
          } else {
            worksheet.addImage(imgId, {
              tl: { col: 2.7, row: 11.3 } as any,
              br: { col: 4.8, row: maxRow } as any,
            });
            if (hasObs) {
              worksheet.mergeCells('C24:E24');
              const c = worksheet.getCell('C24');
              c.value = photo.observacao!.trim().toUpperCase();
              c.font = { name: 'Calibri', size: 9, bold: true };
              c.alignment = { horizontal: 'center', vertical: 'middle' };
            }
          }
        }
      } catch (e) {
        console.warn('Error embedding photo in Excel:', e);
      }
    }
  }

  // Row 25: RESPONSÁVEL TÉCNICO | GERENTE DA ÁREA
  // RULE: RESPONSÁVEL TÉCNICO has single BT
  worksheet.mergeCells('A25:C25');
  const respName = formData.responsavelTecnico
    ? `${formData.responsavelTecnico.nome} - ${formData.responsavelTecnico.matriculaBT}`
    : '';
  worksheet.getCell('A25').value = `RESPONSÁVEL TÉCNICO:  ${respName}`;
  worksheet.getCell('A25').font = { name: 'Calibri', size: 9, bold: true };

  worksheet.mergeCells('D25:E25');
  worksheet.getCell('D25').value = `GERENTE DA ÁREA:  ${
    formData.gerenteArea || 'LEONARDO RIOS BRONZO ALMEIDA - BT01135'
  }`;
  worksheet.getCell('D25').font = { name: 'Calibri', size: 9, bold: true };
  for (let col of ['A', 'B', 'C', 'D', 'E']) {
    worksheet.getCell(`${col}25`).border = thinBorder;
  }

  // Row 26: DATA | DATA
  worksheet.mergeCells('A26:C26');
  worksheet.getCell('A26').value = `DATA:  ${formData.dataConfeccao}`;
  worksheet.getCell('A26').font = { name: 'Calibri', size: 9, bold: true };

  worksheet.mergeCells('D26:E26');
  worksheet.getCell('D26').value = `DATA:  ${formData.dataConfeccao}`;
  worksheet.getCell('D26').font = { name: 'Calibri', size: 9, bold: true };
  for (let col of ['A', 'B', 'C', 'D', 'E']) {
    worksheet.getCell(`${col}26`).border = thinBorder;
  }

  // Row 27: ENCAMINHAMENTO
  worksheet.mergeCells('A27:E27');
  worksheet.getCell(
    'A27'
  ).value = `ENCAMINHAMENTO:\nPARA:  ${formData.encaminhamento}        DATA: _____/_____/_________`;
  worksheet.getCell('A27').font = { name: 'Calibri', size: 9, bold: true };
  worksheet.getCell('A27').alignment = { wrapText: true };
  for (let col of ['A', 'B', 'C', 'D', 'E']) {
    worksheet.getCell(`${col}27`).border = thinBorder;
  }

  // Row 28: PROVIDÊNCIAS TOMADAS (2 lines)
  worksheet.mergeCells('A28:E29');
  worksheet.getCell('A28').value = 'PROVIDÊNCIAS TOMADAS:';
  worksheet.getCell('A28').font = { name: 'Calibri', size: 9, bold: true };
  worksheet.getCell('A28').alignment = { vertical: 'top', horizontal: 'left' };
  for (let r = 28; r <= 29; r++) {
    for (let col of ['A', 'B', 'C', 'D', 'E']) {
      worksheet.getCell(`${col}${r}`).border = thinBorder;
    }
  }

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

  return {
    fileName,
    success: true,
  };
}
