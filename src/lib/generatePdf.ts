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
 * Robust helper to convert/read image data for pdf-lib embedding.
 * Handles PNG, JPG, JPEG, WebP and falls back to HTML Canvas normalization if needed.
 */
async function getCleanImageData(
  photo: SmvPhotoItem
): Promise<{ bytes: ArrayBuffer; format: 'png' | 'jpg' } | null> {
  // 1. Try reading raw arrayBuffer from File or objectUrl
  try {
    let buf: ArrayBuffer | null = null;
    if (photo.file) {
      buf = await photo.file.arrayBuffer();
    } else if (photo.objectUrl) {
      const res = await fetch(photo.objectUrl);
      buf = await res.arrayBuffer();
    }
    if (buf) {
      const isPng =
        photo.file?.type === 'image/png' ||
        photo.name?.toLowerCase().endsWith('.png');
      return { bytes: buf, format: isPng ? 'png' : 'jpg' };
    }
  } catch (err) {
    console.warn('Raw fetch failed for photo, falling back to canvas normalization:', err);
  }

  // 2. Fallback: Normalization via HTML Canvas -> clean JPEG
  if (photo.objectUrl || photo.file) {
    try {
      const url = photo.objectUrl || URL.createObjectURL(photo.file);
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
      console.error('Canvas normalization failed for photo:', photo.name, err);
    }
  }
  return null;
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
  const borderWidthDefault = 0.4; // Reduced line thickness for a lighter, elegant look

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

  // 1. HEADER ROW (Height: 52pt) - Single unified box, NO vertical line divider
  const headerHeight = 52;
  drawCellRect(marginX, currentY, tableWidth, headerHeight);

  // Title on the left side
  page.drawText('S O L I C I T A Ç Ã O   D E   M A N U T E N Ç Ã O   D E   V I A S', {
    x: marginX + 12,
    y: currentY - 30,
    size: 11,
    font: timesBold,
    color: black,
  });

  // Logo on the right side
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
        const targetH = 38;
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

  // 2. ROW 1: Nº (Height: 22pt)
  const numRowH = 22;
  drawCellRect(marginX, currentY, tableWidth, numRowH);
  page.drawText('Nº', {
    x: marginX + 4,
    y: currentY - 14,
    size: 9,
    font: helveticaBold,
    color: black,
  });
  page.drawText(fullSmvNumber, {
    x: marginX + 30,
    y: currentY - 15,
    size: 11,
    font: helveticaBold,
    color: black,
  });

  currentY -= numRowH;

  // 3. ROW 2: SOLICITANTE | ÁREA (Height: 28pt)
  // RULE: SOLICITANTE displays ONLY THE NAME (no matrícula, no BT).
  const r2H = 28;
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

  // 4. ROW 3: ADMINISTRAÇÃO REGIONAL (Height: 28pt)
  const r3H = 28;
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

  // 5. ROW 4: SERVIÇO REFERENTE (Height: 28pt)
  const r4H = 28;
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

  // 6. ROW 5: LOGRADOURO | BAIRRO (Height: 28pt)
  const r5H = 28;
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

  // 7. ROW 6: LOCALIZAÇÃO (Height: 28pt)
  const r6H = 28;
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

  // 8. ROW 7: TIPO DE PAVIMENTO (Height: 28pt)
  const r7H = 28;
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

  // 9. ROW 8: OBSERVAÇÕES / CROQUI (Height: 320pt)
  const croquiH = 320;
  drawCellRect(marginX, currentY, tableWidth, croquiH);
  page.drawText('OBSERVAÇÕES / CROQUI:', {
    x: marginX + 4,
    y: currentY - 11,
    size: 7.5,
    font: helveticaBold,
    color: black,
  });

  // Render photo(s) inside CROQUI box with smart layout optimization
  const photoBoxTop = currentY - 16;
  const photoBoxH = croquiH - 20;
  const photoBoxW = tableWidth - 10;
  const photoBoxX = marginX + 5;

  if (formData.fotos && formData.fotos.length > 0) {
    const photosToRender = formData.fotos.slice(0, 2);

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

    if (embeddedList.length === 1) {
      // 1 PHOTO LAYOUT: Maximize available space inside photoBox
      const item = embeddedList[0];
      const hasObs = !!item.observacao;
      const obsH = hasObs ? 16 : 0;
      const availH = photoBoxH - obsH;

      const imgAspect = item.aspect;
      const boxAspect = photoBoxW / availH;

      let drawW = photoBoxW;
      let drawH = availH;

      if (imgAspect > boxAspect) {
        drawH = photoBoxW / imgAspect;
      } else {
        drawW = availH * imgAspect;
      }

      const imgX = photoBoxX + (photoBoxW - drawW) / 2;
      const imgY = (photoBoxTop - photoBoxH) + obsH + (availH - drawH) / 2;

      page.drawImage(item.embeddedImg, {
        x: imgX,
        y: imgY,
        width: drawW,
        height: drawH,
      });

      page.drawRectangle({
        x: imgX,
        y: imgY,
        width: drawW,
        height: drawH,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 0.35,
      });

      if (hasObs) {
        page.drawText(item.observacao!, {
          x: imgX,
          y: (photoBoxTop - photoBoxH) + 3,
          size: 7.5,
          font: helveticaBold,
          color: rgb(0.2, 0.2, 0.2),
        });
      }
    } else if (embeddedList.length === 2) {
      // 2 PHOTOS LAYOUT: Dynamically calculate whether SIDE-BY-SIDE or STACKED uses more total photo area
      const gap = 8;
      const item1 = embeddedList[0];
      const item2 = embeddedList[1];

      const obs1H = item1.observacao ? 14 : 0;
      const obs2H = item2.observacao ? 14 : 0;

      // Option A: SIDE-BY-SIDE (Left & Right)
      const sideSlotW = (photoBoxW - gap) / 2;
      const sideAvailH1 = photoBoxH - obs1H;
      const sideAvailH2 = photoBoxH - obs2H;

      // Fit 1 side
      let w1_side = sideSlotW;
      let h1_side = sideAvailH1;
      if (item1.aspect > sideSlotW / sideAvailH1) {
        h1_side = sideSlotW / item1.aspect;
      } else {
        w1_side = sideAvailH1 * item1.aspect;
      }
      const area1_side = w1_side * h1_side;

      // Fit 2 side
      let w2_side = sideSlotW;
      let h2_side = sideAvailH2;
      if (item2.aspect > sideSlotW / sideAvailH2) {
        h2_side = sideSlotW / item2.aspect;
      } else {
        w2_side = sideAvailH2 * item2.aspect;
      }
      const area2_side = w2_side * h2_side;

      const totalAreaSide = area1_side + area2_side;

      // Option B: STACKED (Top & Bottom)
      const stackSlotH = (photoBoxH - gap) / 2;
      const stackAvailH1 = stackSlotH - obs1H;
      const stackAvailH2 = stackSlotH - obs2H;

      // Fit 1 stack
      let w1_stack = photoBoxW;
      let h1_stack = stackAvailH1;
      if (item1.aspect > photoBoxW / stackAvailH1) {
        h1_stack = photoBoxW / item1.aspect;
      } else {
        w1_stack = stackAvailH1 * item1.aspect;
      }
      const area1_stack = w1_stack * h1_stack;

      // Fit 2 stack
      let w2_stack = photoBoxW;
      let h2_stack = stackAvailH2;
      if (item2.aspect > photoBoxW / stackAvailH2) {
        h2_stack = photoBoxW / item2.aspect;
      } else {
        w2_stack = stackAvailH2 * item2.aspect;
      }
      const area2_stack = w2_stack * h2_stack;

      const totalAreaStack = area1_stack + area2_stack;

      const useStacked = totalAreaStack > totalAreaSide * 1.05;

      if (useStacked) {
        // RENDER STACKED (Top & Bottom)
        // Photo 1 (Top)
        const slot1Y = photoBoxTop - stackSlotH;
        const img1X = photoBoxX + (photoBoxW - w1_stack) / 2;
        const img1Y = slot1Y + obs1H + (stackAvailH1 - h1_stack) / 2;

        page.drawImage(item1.embeddedImg, {
          x: img1X,
          y: img1Y,
          width: w1_stack,
          height: h1_stack,
        });
        page.drawRectangle({
          x: img1X,
          y: img1Y,
          width: w1_stack,
          height: h1_stack,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 0.35,
        });
        if (item1.observacao) {
          page.drawText(item1.observacao, {
            x: img1X,
            y: slot1Y + 2,
            size: 7,
            font: helveticaBold,
            color: rgb(0.2, 0.2, 0.2),
          });
        }

        // Photo 2 (Bottom)
        const slot2Y = photoBoxTop - photoBoxH;
        const img2X = photoBoxX + (photoBoxW - w2_stack) / 2;
        const img2Y = slot2Y + obs2H + (stackAvailH2 - h2_stack) / 2;

        page.drawImage(item2.embeddedImg, {
          x: img2X,
          y: img2Y,
          width: w2_stack,
          height: h2_stack,
        });
        page.drawRectangle({
          x: img2X,
          y: img2Y,
          width: w2_stack,
          height: h2_stack,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 0.35,
        });
        if (item2.observacao) {
          page.drawText(item2.observacao, {
            x: img2X,
            y: slot2Y + 2,
            size: 7,
            font: helveticaBold,
            color: rgb(0.2, 0.2, 0.2),
          });
        }
      } else {
        // RENDER SIDE-BY-SIDE (Left & Right)
        const slotY = photoBoxTop - photoBoxH;

        // Photo 1 (Left)
        const slot1X = photoBoxX;
        const img1X = slot1X + (sideSlotW - w1_side) / 2;
        const img1Y = slotY + obs1H + (sideAvailH1 - h1_side) / 2;

        page.drawImage(item1.embeddedImg, {
          x: img1X,
          y: img1Y,
          width: w1_side,
          height: h1_side,
        });
        page.drawRectangle({
          x: img1X,
          y: img1Y,
          width: w1_side,
          height: h1_side,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 0.35,
        });
        if (item1.observacao) {
          page.drawText(item1.observacao, {
            x: img1X,
            y: slotY + 2,
            size: 7,
            font: helveticaBold,
            color: rgb(0.2, 0.2, 0.2),
          });
        }

        // Photo 2 (Right)
        const slot2X = photoBoxX + sideSlotW + gap;
        const img2X = slot2X + (sideSlotW - w2_side) / 2;
        const img2Y = slotY + obs2H + (sideAvailH2 - h2_side) / 2;

        page.drawImage(item2.embeddedImg, {
          x: img2X,
          y: img2Y,
          width: w2_side,
          height: h2_side,
        });
        page.drawRectangle({
          x: img2X,
          y: img2Y,
          width: w2_side,
          height: h2_side,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 0.35,
        });
        if (item2.observacao) {
          page.drawText(item2.observacao, {
            x: img2X,
            y: slotY + 2,
            size: 7,
            font: helveticaBold,
            color: rgb(0.2, 0.2, 0.2),
          });
        }
      }
    }
  }

  currentY -= croquiH;

  // 10. ROW 9: RESPONSÁVEL TÉCNICO | GERENTE DA ÁREA (Height: 32pt)
  // RULE: RESPONSÁVEL TÉCNICO has single BT (e.g. CAIO HENRIQUES - BT01748)
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

  // 13. ROW 12: PROVIDÊNCIAS TOMADAS (Height: 54pt - increased height for manual notes space)
  const provH = 54;
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
