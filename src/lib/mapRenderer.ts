/**
 * Utilitário para renderização estática de mapa de localização em alta resolução (1600x1200 - 4:3 HiDPI)
 * utilizando blocos cartográficos gratuitos (OpenStreetMap) e exportação para Blob/ObjectUrl.
 * 
 * Preserva o enquadramento exato definido pelo usuário (zoom e centro), utilizando tiles em densidade
 * cartográfica superior (Z+1) com dimensões compensadas para manter exatamente os mesmos limites geográficos
 * com o dobro de densidade de pixels.
 */

function latLngToGlobalPixels(lat: number, lng: number, zoom: number) {
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    scale;
  return { x, y };
}

// Servidores de tiles cartográficos gratuitos com suporte a CORS (Access-Control-Allow-Origin: *)
const TILE_SERVERS = [
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
  'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
];

/**
 * Carrega uma imagem de tile com suporte a fallback de servidor
 */
function loadTileImage(zoom: number, tx: number, ty: number): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    let serverIndex = 0;

    const tryLoadNext = () => {
      if (serverIndex >= TILE_SERVERS.length) {
        resolve(null);
        return;
      }
      const template = TILE_SERVERS[serverIndex];
      const url = template
        .replace('{z}', Math.round(zoom).toString())
        .replace('{x}', tx.toString())
        .replace('{y}', ty.toString());

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        serverIndex++;
        tryLoadNext();
      };
      img.src = url;
    };

    tryLoadNext();
  });
}

/**
 * Desenha o marcador/pino vermelho de localização no canvas em alta resolução
 */
function drawLocationMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number = 1
) {
  ctx.save();

  // 1. Círculo externo de alcance / pulso radiante
  ctx.beginPath();
  ctx.arc(x, y, 22 * scale, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(220, 38, 38, 0.15)'; // Red suave
  ctx.fill();
  ctx.strokeStyle = 'rgba(220, 38, 38, 0.4)';
  ctx.lineWidth = 1.5 * scale;
  ctx.setLineDash([4 * scale, 4 * scale]);
  ctx.stroke();

  // 2. Sombra do pino
  ctx.save();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.ellipse(x, y + 2 * scale, 10 * scale, 4.5 * scale, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.fill();
  ctx.restore();

  // 3. Corpo do Pino (Gota Teardrop)
  const pinW = 28 * scale;
  const pinH = 38 * scale;
  const pinTopY = y - pinH;

  ctx.beginPath();
  ctx.moveTo(x, y); // Ponta inferior no exato ponto
  ctx.bezierCurveTo(
    x - pinW / 2,
    y - pinH * 0.4,
    x - pinW / 2,
    pinTopY,
    x,
    pinTopY
  );
  ctx.bezierCurveTo(
    x + pinW / 2,
    pinTopY,
    x + pinW / 2,
    y - pinH * 0.4,
    x,
    y
  );
  ctx.closePath();

  ctx.fillStyle = '#dc2626'; // Vermelho
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5 * scale;
  ctx.stroke();

  // 4. Ponto central branco no pino
  ctx.beginPath();
  ctx.arc(x, pinTopY + pinW / 2 - 2 * scale, 5.5 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.restore();
}

/**
 * Desenha a seta vermelha de localização no canvas em alta resolução
 */
function drawArrowMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number = 1
) {
  ctx.save();

  // Círculo externo sob a ponta da seta
  ctx.beginPath();
  ctx.arc(x, y, 12 * scale, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(220, 38, 38, 0.15)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(220, 38, 38, 0.5)';
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  // Seta apontando de cima/esquerda para baixo/direita (x, y)
  const fromX = x - 26 * scale;
  const fromY = y - 36 * scale;
  const toX = x - 2 * scale;
  const toY = y - 2 * scale;

  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);

  ctx.translate(toX, toY);
  ctx.rotate(angle);

  // Geometria da seta de forma limpa apontando para (0,0)
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-14 * scale, -8 * scale);
  ctx.lineTo(-11 * scale, -3 * scale);
  ctx.lineTo(-34 * scale, -3 * scale);
  ctx.lineTo(-34 * scale, 3 * scale);
  ctx.lineTo(-11 * scale, 3 * scale);
  ctx.lineTo(-14 * scale, 8 * scale);
  ctx.closePath();

  ctx.fillStyle = '#dc2626'; // Vermelho
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5 * scale;
  ctx.stroke();

  ctx.restore();
}

/**
 * Desenha atribuição obrigatória do OpenStreetMap com escala vetorial nítida
 */
function drawOpenStreetMapAttribution(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number = 1
) {
  ctx.save();
  const attrText = '© OpenStreetMap contributors';
  const fontSize = Math.round(11 * scale);
  ctx.font = `${fontSize}px sans-serif`;
  const textWidth = ctx.measureText(attrText).width;
  const paddingX = 8 * scale;
  const paddingY = 4 * scale;
  const bgW = textWidth + paddingX * 2;
  const bgH = Math.round(18 * scale) + paddingY;
  const bgX = width - bgW - 6 * scale;
  const bgY = height - bgH - 6 * scale;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(bgX, bgY, bgW, bgH, 4 * scale);
  } else {
    ctx.rect(bgX, bgY, bgW, bgH);
  }
  ctx.fill();

  ctx.strokeStyle = 'rgba(203, 213, 225, 0.8)';
  ctx.lineWidth = 1 * scale;
  ctx.stroke();

  ctx.fillStyle = '#334155';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(attrText, width - 6 * scale - paddingX, bgY + bgH / 2);
  ctx.restore();
}

export interface RenderMapResult {
  blob: Blob;
  objectUrl: string;
}

/**
 * Renderiza o mapa cartográfico estático no canvas em alta resolução 2x (1600x1200 - proporção 4:3)
 * e exporta como JPEG Blob / Object URL.
 * 
 * Mantém o centro, proporção e enquadramento geográfico exatos escolhidos pelo usuário,
 * utilizando tiles cartográficos com densidade superior (Z+1) para garantir extrema nitidez no PDF.
 */
export async function renderLocationMapCanvas(
  centerLat: number,
  centerLng: number,
  zoom: number,
  markerLat: number | null,
  markerLng: number | null,
  markerType: 'PIN' | 'SETA'
): Promise<RenderMapResult> {
  const baseWidth = 800;
  const baseHeight = 600;
  const scale = 2; // HiDPI 2x scale
  const width = baseWidth * scale;   // 1600 px
  const height = baseHeight * scale; // 1200 px
  const effectiveZoom = Math.min(Math.max(Math.round(zoom), 1), 19);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Não foi possível inicializar o contexto 2D do Canvas.');
  }

  // Fundo neutro inicial
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, width, height);

  // Densidade cartográfica 2x: usar tiles de zoom superior (Z+1) quando Z < 19
  // mantendo rigorosamente a mesma extensão geográfica (bounds)
  const useHigherZoomTiles = effectiveZoom < 19;
  const tileZoom = useHigherZoomTiles ? effectiveZoom + 1 : effectiveZoom;
  const tilePixelScale = useHigherZoomTiles ? 1 : 2;

  // Centro cartográfico em pixels globais no nível do tile
  const tileCenter = latLngToGlobalPixels(centerLat, centerLng, tileZoom);
  const tileTopLeftX = tileCenter.x - width / (2 * tilePixelScale);
  const tileTopLeftY = tileCenter.y - height / (2 * tilePixelScale);

  const minTx = Math.floor(tileTopLeftX / 256);
  const maxTx = Math.floor((tileTopLeftX + width / tilePixelScale) / 256);
  const minTy = Math.floor(tileTopLeftY / 256);
  const maxTy = Math.floor((tileTopLeftY + height / tilePixelScale) / 256);

  const tilePromises: Promise<{ img: HTMLImageElement | null; drawX: number; drawY: number }>[] = [];

  for (let tx = minTx; tx <= maxTx; tx++) {
    for (let ty = minTy; ty <= maxTy; ty++) {
      const drawX = (tx * 256 - tileTopLeftX) * tilePixelScale;
      const drawY = (ty * 256 - tileTopLeftY) * tilePixelScale;
      tilePromises.push(
        loadTileImage(tileZoom, tx, ty).then((img) => ({ img, drawX, drawY }))
      );
    }
  }

  const loadedTiles = await Promise.all(tilePromises);

  // Desenhar tiles no canvas com resolução nativa
  const tileDrawSize = 256 * tilePixelScale;
  loadedTiles.forEach(({ img, drawX, drawY }) => {
    if (img) {
      ctx.drawImage(img, Math.round(drawX), Math.round(drawY), tileDrawSize, tileDrawSize);
    }
  });

  // Calcular a posição exata da marcação (se houver) com base no centro do mapa
  if (markerLat !== null && markerLng !== null) {
    const markerPixel = latLngToGlobalPixels(markerLat, markerLng, tileZoom);
    const markerX = width / 2 + (markerPixel.x - tileCenter.x) * tilePixelScale;
    const markerY = height / 2 + (markerPixel.y - tileCenter.y) * tilePixelScale;

    // Fator de escala das marcações no documento de saída (+32% para visibilidade e legibilidade ideais no PDF)
    const MARKER_SIZE_BOOST = 1.32;
    const markerScale = scale * MARKER_SIZE_BOOST;

    // Desenhar somente se estiver dentro dos limites visíveis (com margem de transbordo)
    if (markerX >= -120 && markerX <= width + 120 && markerY >= -120 && markerY <= height + 120) {
      if (markerType === 'SETA') {
        drawArrowMarker(ctx, markerX, markerY, markerScale);
      } else {
        drawLocationMarker(ctx, markerX, markerY, markerScale);
      }
    }
  }

  // Desenhar atribuição obrigatória do OpenStreetMap em alta resolução
  drawOpenStreetMapAttribution(ctx, width, height, scale);

  // Borda externa discreta
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2 * scale;
  ctx.strokeRect(0, 0, width, height);

  // Converter canvas para JPEG Blob e liberar memória do buffer imediatamente
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        // Liberar memória do buffer de pixels do canvas temporário
        canvas.width = 0;
        canvas.height = 0;
        if (blob) {
          const objectUrl = URL.createObjectURL(blob);
          resolve({ blob, objectUrl });
        } else {
          reject(new Error('Falha ao gerar blob do mapa em canvas.'));
        }
      },
      'image/jpeg',
      0.95
    );
  });
}

