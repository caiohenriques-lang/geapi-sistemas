import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { SmvFormData, SmvPhotoItem } from '../types/smv';
import {
  getPrefixoByTipoSMV,
  getSmvDocumentFileName,
  formatFullSmvNumber,
} from './smvRules';

export interface GeneratePdfOptions {
  formData: SmvFormData;
}

/**
 * Normaliza e carrega imagem para o pdf-lib com fallback para HTML Canvas se necessário.
 */
async function getCleanImageData(
  photo: SmvPhotoItem
): Promise<{ bytes: ArrayBuffer; format: 'png' | 'jpg' } | null> {
  // 1. Tentar ler ArrayBuffer direto
  try {
    let buf: ArrayBuffer | null = null;
    if (photo.file) {
      buf = await photo.file.arrayBuffer();
    } else if (photo.objectUrl) {
      const res = await fetch(photo.objectUrl);
      buf = await res.arrayBuffer();
    }
    if (buf) {
      const isPng = photo.file?.type === 'image/png';
      return { bytes: buf, format: isPng ? 'png' : 'jpg' };
    }
  } catch (err) {
    console.warn('Direct fetch failed for photo, falling back to canvas normalization:', err);
  }

  // 2. Fallback: Canvas normalization
  if (photo.objectUrl || photo.file) {
    try {
      const url = photo.objectUrl || (photo.file ? URL.createObjectURL(photo.file) : '');
      if (!url) return null;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const base64 = dataUrl.split(',')[1];
        const binaryStr = atob(base64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        return { bytes: bytes.buffer, format: 'jpg' };
      }
    } catch (err) {
      console.error('Canvas normalization failed for photo:', err);
    }
  }
  return null;
}

interface FittedBox {
  x: number;
  y: number;
  width: number;
  height: number;
  observacao?: string;
  embeddedImg: any;
}

/**
 * Calcula a posição e dimensão ideal de uma imagem dentro de um slot (largura x altura disponíveis).
 */
function fitImageInSlot(
  slotX: number,
  slotY: number, // Bottom Y do slot
  slotW: number,
  slotH: number,
  aspect: number,
  observacao?: string,
  embeddedImg?: any
): FittedBox {
  const obsHeight = observacao ? 13 : 0;
  const availH = slotH - obsHeight;

  let drawW = slotW;
  let drawH = availH;

  if (aspect > slotW / availH) {
    // Imagem mais larga que o slot: largura é o limitante
    drawW = slotW;
    drawH = slotW / aspect;
  } else {
    // Imagem mais alta que o slot: altura é o limitante
    drawH = availH;
    drawW = availH * aspect;
  }

  const imgX = slotX + (slotW - drawW) / 2;
  const imgY = slotY + obsHeight + (availH - drawH) / 2;

  return {
    x: imgX,
    y: imgY,
    width: drawW,
    height: drawH,
    observacao,
    embeddedImg,
  };
}

export async function createPdfDocument(formData: SmvFormData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  // Page size A4 portrait in points: 595.28 x 841.89
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  // Load Standard Fonts
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Colors & Line Thickness
  const black = rgb(0, 0, 0);
  const grayLine = rgb(0, 0, 0);
  const lightGrayBg = rgb(0.96, 0.96, 0.96);
  const borderWidthDefault = 0.35; // Linhas finas, precisas e institucionais

  // Geometry
  const marginX = 25;
  const startY = height - 25; // 816.89
  const tableWidth = width - 2 * marginX; // 545.28

  const prefixo = getPrefixoByTipoSMV(formData.tipoSmv);
  const fullSmvNumber = formatFullSmvNumber(prefixo, formData.numeroCentral, formData.ano);

  // Helper drawing functions
  const drawCellRect = (
    x: number,
    y: number,
    w: number,
    h: number,
    fillBg = false
  ) => {
    if (fillBg) {
      page.drawRectangle({
        x,
        y: y - h,
        width: w,
        height: h,
        color: lightGrayBg,
      });
    }
    page.drawRectangle({
      x,
      y: y - h,
      width: w,
      height: h,
      borderColor: grayLine,
      borderWidth: borderWidthDefault,
    });
  };

  const drawLabelValueCell = (
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    value: string,
    boldValue = false,
    fontSize = 9
  ) => {
    drawCellRect(x, y, w, h);
    if (label) {
      page.drawText(label, {
        x: x + 4,
        y: y - 11,
        size: 7.5,
        font: helveticaBold,
        color: black,
      });
    }
    if (value) {
      const valY = label ? y - 23 : y - (h / 2) - 3;
      page.drawText(value, {
        x: x + 4,
        y: valY,
        size: fontSize,
        font: boldValue ? helveticaBold : helvetica,
        color: black,
      });
    }
  };

  let currentY = startY;

  // 1. HEADER ROW (Height: 48pt) - Cabeçalho unificado com Logo no canto superior direito
  const headerHeight = 48;
  drawCellRect(marginX, currentY, tableWidth, headerHeight);

  // Title on the left side
  page.drawText('S O L I C I T A Ç Ã O   D E   M A N U T E N Ç Ã O   D E   V I A S', {
    x: marginX + 12,
    y: currentY - 28,
    size: 11,
    font: timesBold,
    color: black,
  });

  // Logo PBH / BHTRANS no canto superior direito
  try {
    const logoResp = await fetch('/logo_pbh_bhtrans.png');
    if (logoResp.ok) {
      const logoBytes = await logoResp.arrayBuffer();
      let logoImage;
      try {
        logoImage = await pdfDoc.embedPng(logoBytes);
      } catch {
        logoImage = await pdfDoc.embedJpg(logoBytes);
      }
      if (logoImage) {
        const logoAspect = logoImage.width / logoImage.height;
        const targetH = 36;
        const targetW = targetH * logoAspect;
        const logoX = marginX + tableWidth - targetW - 12;
        const logoY = currentY - headerHeight + (headerHeight - targetH) / 2;
        page.drawImage(logoImage, {
          x: logoX,
          y: logoY,
          width: targetW,
          height: targetH,
        });
      }
    }
  } catch (err) {
    console.warn('Could not load logo for PDF:', err);
  }

  currentY -= headerHeight;

  // 2. ROW 1: Nº (Height: 20pt)
  const numRowH = 20;
  drawCellRect(marginX, currentY, tableWidth, numRowH);
  page.drawText('Nº', {
    x: marginX + 4,
    y: currentY - 13,
    size: 8.5,
    font: helveticaBold,
    color: black,
  });
  page.drawText(fullSmvNumber, {
    x: marginX + 30,
    y: currentY - 14,
    size: 10.5,
    font: helveticaBold,
    color: black,
  });

  currentY -= numRowH;

  // 3. ROW 2: SOLICITANTE | ÁREA (Height: 26pt)
  // REGRA: SOLICITANTE exibe SOMENTE O NOME (sem matrícula, sem BT)
  const r2H = 26;
  const colLeftW = 380;
  const colRightW = tableWidth - colLeftW;

  const solLabel = formData.solicitante ? formData.solicitante.nome : '';

  drawLabelValueCell(
    marginX,
    currentY,
    colLeftW,
    r2H,
    'SOLICITANTE:',
    solLabel,
    false,
    9
  );
  drawLabelValueCell(
    marginX + colLeftW,
    currentY,
    colRightW,
    r2H,
    'ÁREA:',
    formData.area || 'GEAPI',
    true,
    9
  );

  currentY -= r2H;

  // 4. ROW 3: ADMINISTRAÇÃO REGIONAL (Height: 26pt)
  const r3H = 26;
  drawLabelValueCell(
    marginX,
    currentY,
    tableWidth,
    r3H,
    'ADMINISTRAÇÃO REGIONAL:',
    formData.administracaoRegional,
    false,
    9
  );

  currentY -= r3H;

  // 5. ROW 4: SERVIÇO REFERENTE (Height: 26pt)
  const r4H = 26;
  drawLabelValueCell(
    marginX,
    currentY,
    tableWidth,
    r4H,
    'SERVIÇO REFERENTE:',
    formData.servicoReferente,
    false,
    9
  );

  currentY -= r4H;

  // 6. ROW 5: LOGRADOURO | BAIRRO (Height: 26pt)
  const r5H = 26;
  drawLabelValueCell(
    marginX,
    currentY,
    colLeftW,
    r5H,
    'LOGRADOURO:',
    formData.logradouro,
    false,
    9
  );
  drawLabelValueCell(
    marginX + colLeftW,
    currentY,
    colRightW,
    r5H,
    'BAIRRO:',
    formData.bairro,
    false,
    9
  );

  currentY -= r5H;

  // 7. ROW 6: LOCALIZAÇÃO (Height: 26pt)
  const r6H = 26;
  drawLabelValueCell(
    marginX,
    currentY,
    tableWidth,
    r6H,
    'LOCALIZAÇÃO:',
    formData.localizacao,
    false,
    9
  );

  currentY -= r6H;

  // 8. ROW 7: TIPO DE PAVIMENTO (Height: 26pt)
  const r7H = 26;
  drawLabelValueCell(
    marginX,
    currentY,
    tableWidth,
    r7H,
    'TIPO DE PAVIMENTO:',
    formData.tipoPavimento,
    false,
    9
  );

  currentY -= r7H;

  // 9. ROW 8: OBSERVAÇÕES / CROQUI (Height: 370pt - ampliado em 25pt)
  const croquiH = 370;
  drawCellRect(marginX, currentY, tableWidth, croquiH);
  page.drawText('OBSERVAÇÕES / CROQUI:', {
    x: marginX + 4,
    y: currentY - 11,
    size: 7.5,
    font: helveticaBold,
    color: black,
  });

  // Render photo(s) inside CROQUI box with smart dynamic layout (1 to 4 photos)
  const photoBoxTop = currentY - 16;
  const photoBoxH = croquiH - 20;
  const photoBoxW = tableWidth - 10;
  const photoBoxX = marginX + 5;
  const photoBoxBottom = photoBoxTop - photoBoxH;

  if (formData.fotos && formData.fotos.length > 0) {
    const photosToRender = formData.fotos.slice(0, 4);

    // Prepare embedded images and compute aspect ratios
    const embeddedList: Array<{
      photo: SmvPhotoItem;
      embeddedImg: any;
      aspect: number;
      observacao?: string;
    }> = [];

    for (const photo of photosToRender) {
      try {
        const imgData = await getCleanImageData(photo);
        if (imgData) {
          let embeddedImg;
          try {
            if (imgData.format === 'png') {
              embeddedImg = await pdfDoc.embedPng(imgData.bytes);
            } else {
              embeddedImg = await pdfDoc.embedJpg(imgData.bytes);
            }
          } catch {
            try {
              embeddedImg = await pdfDoc.embedJpg(imgData.bytes);
            } catch {
              embeddedImg = await pdfDoc.embedPng(imgData.bytes);
            }
          }
          if (embeddedImg) {
            embeddedList.push({
              photo,
              embeddedImg,
              aspect: embeddedImg.width / embeddedImg.height,
              observacao: photo.observacao?.trim() ? photo.observacao.trim().toUpperCase() : undefined,
            });
          }
        }
      } catch (e) {
        console.warn('Error embedding photo for layout:', e);
      }
    }

    const count = embeddedList.length;
    const boxesToDraw: FittedBox[] = [];

    if (count === 1) {
      // 1 FOTO: Maximiza a área útil do croqui
      const item = embeddedList[0];
      const box = fitImageInSlot(
        photoBoxX,
        photoBoxBottom,
        photoBoxW,
        photoBoxH,
        item.aspect,
        item.observacao,
        item.embeddedImg
      );
      boxesToDraw.push(box);
    } else if (count === 2) {
      // 2 FOTOS: Compara LADO A LADO vs EMPILHADAS (calcula qual gera maior área total)
      const gap = 8;
      const item1 = embeddedList[0];
      const item2 = embeddedList[1];

      // Opção A: Lado a Lado
      const sideW = (photoBoxW - gap) / 2;
      const box1Side = fitImageInSlot(
        photoBoxX,
        photoBoxBottom,
        sideW,
        photoBoxH,
        item1.aspect,
        item1.observacao,
        item1.embeddedImg
      );
      const box2Side = fitImageInSlot(
        photoBoxX + sideW + gap,
        photoBoxBottom,
        sideW,
        photoBoxH,
        item2.aspect,
        item2.observacao,
        item2.embeddedImg
      );
      const totalAreaSide = box1Side.width * box1Side.height + box2Side.width * box2Side.height;

      // Opção B: Empilhadas (Uma acima da outra)
      const stackH = (photoBoxH - gap) / 2;
      const box1Stack = fitImageInSlot(
        photoBoxX,
        photoBoxBottom + stackH + gap,
        photoBoxW,
        stackH,
        item1.aspect,
        item1.observacao,
        item1.embeddedImg
      );
      const box2Stack = fitImageInSlot(
        photoBoxX,
        photoBoxBottom,
        photoBoxW,
        stackH,
        item2.aspect,
        item2.observacao,
        item2.embeddedImg
      );
      const totalAreaStack = box1Stack.width * box1Stack.height + box2Stack.width * box2Stack.height;

      if (totalAreaStack > totalAreaSide * 1.05) {
        boxesToDraw.push(box1Stack, box2Stack);
      } else {
        boxesToDraw.push(box1Side, box2Side);
      }
    } else if (count === 3) {
      // 3 FOTOS: Layout Dinâmico
      // Testar: (A) 1 em cima (largura cheia) + 2 embaixo (lado a lado)
      //         (B) 2 em cima (lado a lado) + 1 embaixo (largura cheia)
      const gap = 6;
      const rowH = (photoBoxH - gap) / 2;
      const colHalfW = (photoBoxW - gap) / 2;

      const item1 = embeddedList[0];
      const item2 = embeddedList[1];
      const item3 = embeddedList[2];

      // Layout A: 1 topo, 2 base
      const boxA1 = fitImageInSlot(photoBoxX, photoBoxBottom + rowH + gap, photoBoxW, rowH, item1.aspect, item1.observacao, item1.embeddedImg);
      const boxA2 = fitImageInSlot(photoBoxX, photoBoxBottom, colHalfW, rowH, item2.aspect, item2.observacao, item2.embeddedImg);
      const boxA3 = fitImageInSlot(photoBoxX + colHalfW + gap, photoBoxBottom, colHalfW, rowH, item3.aspect, item3.observacao, item3.embeddedImg);
      const areaA = boxA1.width * boxA1.height + boxA2.width * boxA2.height + boxA3.width * boxA3.height;

      // Layout B: 2 topo, 1 base
      const boxB1 = fitImageInSlot(photoBoxX, photoBoxBottom + rowH + gap, colHalfW, rowH, item1.aspect, item1.observacao, item1.embeddedImg);
      const boxB2 = fitImageInSlot(photoBoxX + colHalfW + gap, photoBoxBottom + rowH + gap, colHalfW, rowH, item2.aspect, item2.observacao, item2.embeddedImg);
      const boxB3 = fitImageInSlot(photoBoxX, photoBoxBottom, photoBoxW, rowH, item3.aspect, item3.observacao, item3.embeddedImg);
      const areaB = boxB1.width * boxB1.height + boxB2.width * boxB2.height + boxB3.width * boxB3.height;

      if (areaA >= areaB) {
        boxesToDraw.push(boxA1, boxA2, boxA3);
      } else {
        boxesToDraw.push(boxB1, boxB2, boxB3);
      }
    } else if (count === 4) {
      // 4 FOTOS: Grade 2x2 otimizada
      const gap = 6;
      const cellW = (photoBoxW - gap) / 2;
      const cellH = (photoBoxH - gap) / 2;

      // Linha superior
      boxesToDraw.push(
        fitImageInSlot(photoBoxX, photoBoxBottom + cellH + gap, cellW, cellH, embeddedList[0].aspect, embeddedList[0].observacao, embeddedList[0].embeddedImg),
        fitImageInSlot(photoBoxX + cellW + gap, photoBoxBottom + cellH + gap, cellW, cellH, embeddedList[1].aspect, embeddedList[1].observacao, embeddedList[1].embeddedImg)
      );
      // Linha inferior
      boxesToDraw.push(
        fitImageInSlot(photoBoxX, photoBoxBottom, cellW, cellH, embeddedList[2].aspect, embeddedList[2].observacao, embeddedList[2].embeddedImg),
        fitImageInSlot(photoBoxX + cellW + gap, photoBoxBottom, cellW, cellH, embeddedList[3].aspect, embeddedList[3].observacao, embeddedList[3].embeddedImg)
      );
    }

    // Desenhar imagens calculadas e suas observações
    for (const box of boxesToDraw) {
      page.drawImage(box.embeddedImg, {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      });

      // Borda sutil de enquadramento
      page.drawRectangle({
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        borderColor: rgb(0.85, 0.85, 0.85),
        borderWidth: 0.35,
      });

      // Observação opcional abaixo da foto
      if (box.observacao) {
        page.drawText(box.observacao, {
          x: box.x,
          y: Math.max(photoBoxBottom + 2, box.y - 10),
          size: 7,
          font: helveticaBold,
          color: rgb(0.2, 0.2, 0.2),
        });
      }
    }
  }

  currentY -= croquiH;

  // 10. ROW 9: RESPONSÁVEL TÉCNICO | GERENTE DA ÁREA (Height: 32pt)
  // REGRA: RESPONSÁVEL TÉCNICO = SOLICITANTE + MATRÍCULA (ex: CAIO HENRIQUES - BT01748)
  const sigH = 32;
  const halfW = tableWidth / 2;

  const respLabel = formData.responsavelTecnico
    ? `${formData.responsavelTecnico.nome} - ${formData.responsavelTecnico.matriculaBT}`
    : '';

  drawLabelValueCell(
    marginX,
    currentY,
    halfW,
    sigH,
    'RESPONSÁVEL TÉCNICO:',
    respLabel,
    false,
    8.5
  );
  drawLabelValueCell(
    marginX + halfW,
    currentY,
    halfW,
    sigH,
    'GERENTE DA ÁREA:',
    formData.gerenteArea || 'LEONARDO RIOS BRONZO ALMEIDA - BT01135',
    false,
    8.5
  );

  currentY -= sigH;

  // 11. ROW 10: DATA | DATA (Height: 22pt)
  const dateH = 22;
  const dataVal = formData.dataConfeccao || '';

  drawCellRect(marginX, currentY, halfW, dateH);
  page.drawText('DATA:', {
    x: marginX + 4,
    y: currentY - 14,
    size: 7.5,
    font: helveticaBold,
    color: black,
  });
  page.drawText(dataVal, {
    x: marginX + 35,
    y: currentY - 14,
    size: 9,
    font: helvetica,
    color: black,
  });

  drawCellRect(marginX + halfW, currentY, halfW, dateH);
  page.drawText('DATA:', {
    x: marginX + halfW + 4,
    y: currentY - 14,
    size: 7.5,
    font: helveticaBold,
    color: black,
  });
  page.drawText(dataVal, {
    x: marginX + halfW + 35,
    y: currentY - 14,
    size: 9,
    font: helvetica,
    color: black,
  });

  currentY -= dateH;

  // 12. ROW 11: ENCAMINHAMENTO (Height: 28pt)
  const encH = 28;
  drawCellRect(marginX, currentY, tableWidth, encH);
  page.drawText('ENCAMINHAMENTO:', {
    x: marginX + 4,
    y: currentY - 10,
    size: 7.5,
    font: helveticaBold,
    color: black,
  });

  page.drawText('PARA:', {
    x: marginX + 4,
    y: currentY - 22,
    size: 7.5,
    font: helveticaBold,
    color: black,
  });
  page.drawText(formData.encaminhamento || '', {
    x: marginX + 35,
    y: currentY - 22,
    size: 8.5,
    font: helveticaBold,
    color: black,
  });

  page.drawText('DATA: _____/_____/_________', {
    x: marginX + 370,
    y: currentY - 22,
    size: 7.5,
    font: helveticaBold,
    color: black,
  });

  currentY -= encH;

  // 13. ROW 12: PROVIDÊNCIAS TOMADAS (Height: 75pt - espaço ampliado para anotações manuais)
  const provH = 75;
  drawCellRect(marginX, currentY, tableWidth, provH);
  page.drawText('PROVIDÊNCIAS TOMADAS:', {
    x: marginX + 4,
    y: currentY - 10,
    size: 7.5,
    font: helveticaBold,
    color: black,
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

export async function generatePdf({ formData }: GeneratePdfOptions): Promise<{
  fileName: string;
  success: boolean;
  blobUrl?: string;
  pdfBytes?: Uint8Array;
}> {
  const prefixo = getPrefixoByTipoSMV(formData.tipoSmv);
  const fileName = getSmvDocumentFileName(prefixo, formData.numeroCentral, formData.ano, 'pdf');

  const pdfBytes = await createPdfDocument(formData);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);

  // Trigger download in browser if called directly
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return {
    fileName,
    success: true,
    blobUrl,
    pdfBytes,
  };
}
