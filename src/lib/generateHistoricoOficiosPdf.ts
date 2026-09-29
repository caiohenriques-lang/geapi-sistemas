import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { HistoricoOficiosItem } from '../types/controleOficios';

/**
 * Converte qualquer formato de data para DD/MM/AAAA
 */
function formatDateBR(val?: string | null): string {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.substring(0, 10).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  return str;
}

/**
 * Quebra um texto em múltiplas linhas respeitando a largura máxima disponível
 */
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  if (!text || text.trim().length === 0) return ['-'];

  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, fontSize);

    if (width <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      // Se a palavra individual for maior que a linha inteira, quebra forçado
      const wordWidth = font.widthOfTextAtSize(word, fontSize);
      if (wordWidth > maxWidth) {
        let partial = '';
        for (const char of word) {
          if (font.widthOfTextAtSize(partial + char, fontSize) <= maxWidth) {
            partial += char;
          } else {
            lines.push(partial);
            partial = char;
          }
        }
        currentLine = partial;
      } else {
        currentLine = word;
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : ['-'];
}

interface ColumnDef {
  header: string;
  width: number;
}

export async function generateHistoricoOficiosPdf(
  items: HistoricoOficiosItem[],
  customTitle?: string
): Promise<void> {
  const pdfDoc = await PDFDocument.create();

  // Fontes padrão Helvetica
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Dimensões A4 Landscape (em pontos: 841.89 x 595.28)
  const pageWidth = 841.89;
  const pageHeight = 595.28;

  // Margens
  const marginLeft = 28;
  const marginRight = 28;
  const marginTop = 30;
  const marginBottom = 30;
  const usableWidth = pageWidth - marginLeft - marginRight; // 785.89 pt

  // Definição das 8 colunas e suas larguras proporcionais (soma = 785 pt)
  const columns: ColumnDef[] = [
    { header: 'CT', width: 50 },
    { header: 'CÓDIGO', width: 65 },
    { header: 'TIPO', width: 75 },
    { header: 'MOTIVO DA PARADA', width: 215 },
    { header: 'OFÍCIO DE PARADA', width: 95 },
    { header: 'DATA DE PARADA', width: 90 },
    { header: 'OFÍCIO DE RETORNO', width: 100 },
    { header: 'DATA DE RETORNO', width: 95 },
  ];

  // Estilos de cores
  const colorHeaderBg = rgb(0.94, 0.95, 0.97);
  const colorHeaderBorder = rgb(0.8, 0.84, 0.89);
  const colorRowBorder = rgb(0.88, 0.9, 0.93);
  const colorRowAltBg = rgb(0.985, 0.99, 0.995);
  const colorTextDark = rgb(0.12, 0.16, 0.22);
  const colorTextHeader = rgb(0.25, 0.3, 0.38);
  const colorTextMuted = rgb(0.45, 0.5, 0.58);
  const colorOpenBadge = rgb(0.8, 0.45, 0.05); // Tom âmbar/laranja institucional

  const headerHeight = 22;
  const headerFontSize = 7.5;
  const bodyFontSize = 7;
  const lineHeight = 8.5;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let cursorY = pageHeight - marginTop;

  // Helper para desenhar o título do relatório e o cabeçalho da tabela
  const drawPageHeader = (isFirstPage: boolean) => {
    cursorY = pageHeight - marginTop;

    if (isFirstPage) {
      // Título do relatório na primeira página
      const title = customTitle || 'RELATÓRIO HISTÓRICO DE PARADA E RETORNO DE EQUIPAMENTOS';
      currentPage.drawText(title, {
        x: marginLeft,
        y: cursorY - 10,
        size: 11,
        font: fontBold,
        color: colorTextDark,
      });

      const dataGeracao = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Total de registros: ${items.length}`;
      currentPage.drawText(dataGeracao, {
        x: marginLeft,
        y: cursorY - 22,
        size: 6.5,
        font: fontRegular,
        color: colorTextMuted,
      });

      cursorY -= 32;
    } else {
      cursorY -= 5;
    }

    // Fundo do cabeçalho da tabela
    currentPage.drawRectangle({
      x: marginLeft,
      y: cursorY - headerHeight,
      width: usableWidth,
      height: headerHeight,
      color: colorHeaderBg,
      borderColor: colorHeaderBorder,
      borderWidth: 0.75,
    });

    // Colunas do cabeçalho
    let currentX = marginLeft;
    for (const col of columns) {
      // Texto centralizado
      const textWidth = fontBold.widthOfTextAtSize(col.header, headerFontSize);
      const textX = currentX + (col.width - textWidth) / 2;
      const textY = cursorY - headerHeight + (headerHeight - headerFontSize) / 2 + 1.5;

      currentPage.drawText(col.header, {
        x: textX,
        y: textY,
        size: headerFontSize,
        font: fontBold,
        color: colorTextHeader,
      });

      // Linha divisória vertical
      if (currentX > marginLeft) {
        currentPage.drawLine({
          start: { x: currentX, y: cursorY },
          end: { x: currentX, y: cursorY - headerHeight },
          thickness: 0.5,
          color: colorHeaderBorder,
        });
      }

      currentX += col.width;
    }

    cursorY -= headerHeight;
  };

  // Desenha o cabeçalho na primeira página
  drawPageHeader(true);

  // Itera sobre todos os itens filtrados
  let rowIndex = 0;
  for (const item of items) {
    const isAberta = !item.oficioRetorno || item.oficioRetorno.trim().length === 0;

    const valCt = item.ct ? String(item.ct).trim() : '-';
    const valCodigo = item.codigo ? String(item.codigo).trim() : '-';
    const valTipo = item.tipo ? String(item.tipo).trim() : '-';
    const valMotivo = item.motivo ? String(item.motivo).trim() : '-';
    const valOficioParada = item.oficioParada ? String(item.oficioParada).trim() : '-';
    const valDataParada = formatDateBR(item.dataParada) || '-';
    const valOficioRetorno = isAberta ? '-' : item.oficioRetorno ? String(item.oficioRetorno).trim() : '-';
    const valDataRetorno = isAberta ? 'Em aberto' : formatDateBR(item.dataRetorno) || '-';

    // Quebra de texto para o Motivo da Parada
    const motivoLines = wrapText(valMotivo, columns[3].width - 8, fontRegular, bodyFontSize);
    const numLines = Math.max(1, motivoLines.length);
    const rowHeight = Math.max(16, numLines * lineHeight + 7);

    // Verifica se a linha cabe na página atual
    if (cursorY - rowHeight < marginBottom + 15) {
      // Nova página
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      drawPageHeader(false);
    }

    // Fundo zebra suave para linhas alternadas
    if (rowIndex % 2 === 1) {
      currentPage.drawRectangle({
        x: marginLeft,
        y: cursorY - rowHeight,
        width: usableWidth,
        height: rowHeight,
        color: colorRowAltBg,
      });
    }

    // Borda inferior da linha
    currentPage.drawLine({
      start: { x: marginLeft, y: cursorY - rowHeight },
      end: { x: marginLeft + usableWidth, y: cursorY - rowHeight },
      thickness: 0.5,
      color: colorRowBorder,
    });

    // Borda lateral esquerda e direita
    currentPage.drawLine({
      start: { x: marginLeft, y: cursorY },
      end: { x: marginLeft, y: cursorY - rowHeight },
      thickness: 0.5,
      color: colorRowBorder,
    });
    currentPage.drawLine({
      start: { x: marginLeft + usableWidth, y: cursorY },
      end: { x: marginLeft + usableWidth, y: cursorY - rowHeight },
      thickness: 0.5,
      color: colorRowBorder,
    });

    let currentX = marginLeft;

    // 1. CT
    {
      const col = columns[0];
      const tw = fontRegular.widthOfTextAtSize(valCt, bodyFontSize);
      currentPage.drawText(valCt, {
        x: currentX + (col.width - tw) / 2,
        y: cursorY - (rowHeight / 2) - (bodyFontSize / 2) + 2,
        size: bodyFontSize,
        font: fontRegular,
        color: colorTextDark,
      });
      currentX += col.width;
    }

    // 2. CÓDIGO
    {
      const col = columns[1];
      const tw = fontBold.widthOfTextAtSize(valCodigo, bodyFontSize);
      currentPage.drawText(valCodigo, {
        x: currentX + (col.width - tw) / 2,
        y: cursorY - (rowHeight / 2) - (bodyFontSize / 2) + 2,
        size: bodyFontSize,
        font: fontBold,
        color: colorTextDark,
      });
      currentX += col.width;
    }

    // 3. TIPO
    {
      const col = columns[2];
      const tw = fontRegular.widthOfTextAtSize(valTipo, bodyFontSize);
      currentPage.drawText(valTipo, {
        x: currentX + (col.width - tw) / 2,
        y: cursorY - (rowHeight / 2) - (bodyFontSize / 2) + 2,
        size: bodyFontSize,
        font: fontRegular,
        color: colorTextDark,
      });
      currentX += col.width;
    }

    // 4. MOTIVO DA PARADA (com múltiplas linhas centralizadas)
    {
      const col = columns[3];
      const totalTextHeight = motivoLines.length * lineHeight;
      const startY = cursorY - (rowHeight - totalTextHeight) / 2 - bodyFontSize + 1;

      for (let i = 0; i < motivoLines.length; i++) {
        const line = motivoLines[i];
        const tw = fontRegular.widthOfTextAtSize(line, bodyFontSize);
        currentPage.drawText(line, {
          x: currentX + (col.width - tw) / 2,
          y: startY - i * lineHeight,
          size: bodyFontSize,
          font: fontRegular,
          color: colorTextDark,
        });
      }
      currentX += col.width;
    }

    // 5. OFÍCIO DE PARADA
    {
      const col = columns[4];
      const tw = fontRegular.widthOfTextAtSize(valOficioParada, bodyFontSize);
      currentPage.drawText(valOficioParada, {
        x: currentX + (col.width - tw) / 2,
        y: cursorY - (rowHeight / 2) - (bodyFontSize / 2) + 2,
        size: bodyFontSize,
        font: fontRegular,
        color: colorTextDark,
      });
      currentX += col.width;
    }

    // 6. DATA DE PARADA
    {
      const col = columns[5];
      const tw = fontRegular.widthOfTextAtSize(valDataParada, bodyFontSize);
      currentPage.drawText(valDataParada, {
        x: currentX + (col.width - tw) / 2,
        y: cursorY - (rowHeight / 2) - (bodyFontSize / 2) + 2,
        size: bodyFontSize,
        font: fontRegular,
        color: colorTextDark,
      });
      currentX += col.width;
    }

    // 7. OFÍCIO DE RETORNO
    {
      const col = columns[6];
      const tw = fontRegular.widthOfTextAtSize(valOficioRetorno, bodyFontSize);
      currentPage.drawText(valOficioRetorno, {
        x: currentX + (col.width - tw) / 2,
        y: cursorY - (rowHeight / 2) - (bodyFontSize / 2) + 2,
        size: bodyFontSize,
        font: fontRegular,
        color: isAberta ? colorTextMuted : colorTextDark,
      });
      currentX += col.width;
    }

    // 8. DATA DE RETORNO
    {
      const col = columns[7];
      const isEmAbertoText = valDataRetorno === 'Em aberto';
      const fontToUse = isEmAbertoText ? fontBold : fontRegular;
      const colorToUse = isEmAbertoText ? colorOpenBadge : colorTextDark;
      const tw = fontToUse.widthOfTextAtSize(valDataRetorno, bodyFontSize);

      currentPage.drawText(valDataRetorno, {
        x: currentX + (col.width - tw) / 2,
        y: cursorY - (rowHeight / 2) - (bodyFontSize / 2) + 2,
        size: bodyFontSize,
        font: fontToUse,
        color: colorToUse,
      });
      currentX += col.width;
    }

    cursorY -= rowHeight;
    rowIndex++;
  }

  // Rodapé em todas as páginas: Numeração "Página X de Y"
  const totalPages = pdfDoc.getPageCount();
  const pages = pdfDoc.getPages();
  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const pageNumberText = `Página ${i + 1} de ${totalPages}`;
    const tw = fontRegular.widthOfTextAtSize(pageNumberText, 7);
    page.drawText(pageNumberText, {
      x: marginLeft + (usableWidth - tw) / 2,
      y: marginBottom - 12,
      size: 7,
      font: fontRegular,
      color: colorTextMuted,
    });
  }

  // Salva o PDF como bytes e dispara download direto no navegador
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const fileName = `Relatorio-Historico-Oficios-${day}-${month}-${year}.pdf`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
