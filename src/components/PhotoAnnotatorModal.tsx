import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Square,
  MoveUpRight,
  RotateCcw,
  Trash2,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { AnnotationShape, SmvPhotoItem } from '../types/smv';

interface PhotoAnnotatorModalProps {
  photo: SmvPhotoItem | null;
  photoIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (photoIndex: number, annotations: AnnotationShape[], annotatedObjectUrl?: string) => void;
}

export const PhotoAnnotatorModal: React.FC<PhotoAnnotatorModalProps> = ({
  photo,
  photoIndex,
  isOpen,
  onClose,
  onSave,
}) => {
  const [selectedTool, setSelectedTool] = useState<'rectangle' | 'arrow'>('rectangle');
  const [annotations, setAnnotations] = useState<AnnotationShape[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStart, setCurrentStart] = useState<{ x: number; y: number } | null>(null);
  const [currentEnd, setCurrentEnd] = useState<{ x: number; y: number } | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load existing annotations when opening
  useEffect(() => {
    if (isOpen && photo) {
      setAnnotations(photo.annotations ? [...photo.annotations] : []);
      setImageLoaded(false);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        setImageLoaded(true);
      };
      // Use original photo URL for crisp re-editing
      img.src = photo.objectUrl;
    }
  }, [isOpen, photo]);

  // Helper to draw an arrow with solid arrowhead
  const drawArrowShape = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      lineWidth: number,
      color: string = '#dc2626'
    ) => {
      const headLength = Math.max(14, lineWidth * 3.6);
      const dx = toX - fromX;
      const dy = toY - fromY;
      const angle = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy);

      if (dist < 3) return;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Arrow line
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      // Filled Arrow Head
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(
        toX - headLength * Math.cos(angle - Math.PI / 6),
        toY - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        toX - headLength * 0.7 * Math.cos(angle),
        toY - headLength * 0.7 * Math.sin(angle)
      );
      ctx.lineTo(
        toX - headLength * Math.cos(angle + Math.PI / 6),
        toY - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    },
    []
  );

  // Helper to draw a rectangle contour
  const drawRectangleShape = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      lineWidth: number,
      color: string = '#dc2626'
    ) => {
      const minX = Math.min(startX, endX);
      const minY = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);

      if (width < 2 && height < 2) return;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'miter';
      ctx.strokeRect(minX, minY, width, height);
      ctx.restore();
    },
    []
  );

  // Redraw canvas whenever annotations, active drawing or image change
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Draw image
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // 2. Draw saved annotations
    const displayStroke = Math.max(3, Math.round(Math.max(width, height) * 0.006));

    annotations.forEach((shape) => {
      const startX = shape.startX * width;
      const startY = shape.startY * height;
      const endX = shape.endX * width;
      const endY = shape.endY * height;

      if (shape.type === 'rectangle') {
        drawRectangleShape(ctx, startX, startY, endX, endY, displayStroke, '#dc2626');
      } else if (shape.type === 'arrow') {
        drawArrowShape(ctx, startX, startY, endX, endY, displayStroke, '#dc2626');
      }
    });

    // 3. Draw in-progress shape
    if (isDrawing && currentStart && currentEnd) {
      const startX = currentStart.x * width;
      const startY = currentStart.y * height;
      const endX = currentEnd.x * width;
      const endY = currentEnd.y * height;

      if (selectedTool === 'rectangle') {
        drawRectangleShape(ctx, startX, startY, endX, endY, displayStroke, '#ef4444');
      } else if (selectedTool === 'arrow') {
        drawArrowShape(ctx, startX, startY, endX, endY, displayStroke, '#ef4444');
      }
    }
  }, [annotations, isDrawing, currentStart, currentEnd, selectedTool, imageLoaded, drawRectangleShape, drawArrowShape]);

  // Adjust canvas pixel resolution to container layout while maintaining image aspect ratio
  useEffect(() => {
    if (!imageLoaded || !imageRef.current || !containerRef.current || !canvasRef.current) return;

    const img = imageRef.current;
    const container = containerRef.current;
    const containerW = container.clientWidth - 20; // safe padding
    const containerH = window.innerHeight * 0.58; // max available height

    const aspect = img.naturalWidth / img.naturalHeight;
    let targetW = containerW;
    let targetH = containerW / aspect;

    if (targetH > containerH) {
      targetH = containerH;
      targetW = containerH * aspect;
    }

    targetW = Math.floor(targetW);
    targetH = Math.floor(targetH);

    canvasRef.current.width = targetW;
    canvasRef.current.height = targetH;

    renderCanvas();
  }, [imageLoaded, renderCanvas]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Coordinate normalizer relative to canvas
  const getRelativeCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;

    const clampedX = Math.max(0, Math.min(canvas.width, rawX));
    const clampedY = Math.max(0, Math.min(canvas.height, rawY));

    return {
      x: clampedX / canvas.width,
      y: clampedY / canvas.height,
    };
  };

  const handleStartDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getRelativeCoords(e);
    if (!coords) return;

    setIsDrawing(true);
    setCurrentStart(coords);
    setCurrentEnd(coords);
  };

  const handleMoveDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStart) return;
    e.preventDefault();
    const coords = getRelativeCoords(e);
    if (!coords) return;

    setCurrentEnd(coords);
  };

  const handleEndDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStart || !currentEnd) {
      setIsDrawing(false);
      return;
    }
    e.preventDefault();

    const dx = Math.abs(currentEnd.x - currentStart.x);
    const dy = Math.abs(currentEnd.y - currentStart.y);

    // Only add shape if dragged at least a minimal distance
    if (dx > 0.01 || dy > 0.01) {
      const newShape: AnnotationShape = {
        id: `shape_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: selectedTool,
        startX: currentStart.x,
        startY: currentStart.y,
        endX: currentEnd.x,
        endY: currentEnd.y,
      };
      setAnnotations((prev) => [...prev, newShape]);
    }

    setIsDrawing(false);
    setCurrentStart(null);
    setCurrentEnd(null);
  };

  const handleUndo = () => {
    setAnnotations((prev) => prev.slice(0, -1));
  };

  const handleClearAll = () => {
    setAnnotations([]);
  };

  const handleSave = async () => {
    if (!photo || !imageRef.current) {
      onClose();
      return;
    }

    const img = imageRef.current;

    if (annotations.length === 0) {
      // If user cleared all annotations, revert to original without annotated url
      onSave(photoIndex, [], undefined);
      onClose();
      return;
    }

    // Render high-res flattened canvas for PDF & UI Preview
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = img.naturalWidth;
    exportCanvas.height = img.naturalHeight;
    const ctx = exportCanvas.getContext('2d');

    if (!ctx) {
      onSave(photoIndex, annotations, undefined);
      onClose();
      return;
    }

    // 1. Draw full original image
    ctx.drawImage(img, 0, 0);

    // 2. High-res stroke width (scaled cleanly to image dimensions)
    const strokeWidth = Math.max(4, Math.round(Math.max(img.naturalWidth, img.naturalHeight) * 0.0055));

    // 3. Draw annotations at full resolution
    annotations.forEach((shape) => {
      const startX = shape.startX * exportCanvas.width;
      const startY = shape.startY * exportCanvas.height;
      const endX = shape.endX * exportCanvas.width;
      const endY = shape.endY * exportCanvas.height;

      if (shape.type === 'rectangle') {
        drawRectangleShape(ctx, startX, startY, endX, endY, strokeWidth, '#dc2626');
      } else if (shape.type === 'arrow') {
        drawArrowShape(ctx, startX, startY, endX, endY, strokeWidth, '#dc2626');
      }
    });

    // 4. Export high quality JPEG Blob
    exportCanvas.toBlob(
      (blob) => {
        if (blob) {
          const annotatedUrl = URL.createObjectURL(blob);
          onSave(photoIndex, annotations, annotatedUrl);
        } else {
          onSave(photoIndex, annotations, undefined);
        }
        onClose();
      },
      'image/jpeg',
      0.95
    );
  };

  if (!isOpen || !photo) return null;

  return (
    <div
      id="photo-annotator-modal"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fadeIn"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Marcar Fotografia {photoIndex + 1}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Desenhe retângulos ou setas em vermelho para indicar o local/problema
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Fechar sem salvar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Tool selection buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedTool('rectangle')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedTool === 'rectangle'
                  ? 'bg-white text-rose-600 shadow-xs border border-rose-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title="Desenhar Retângulo Vermelho"
            >
              <Square className="w-3.5 h-3.5" />
              Retângulo
            </button>

            <button
              type="button"
              onClick={() => setSelectedTool('arrow')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedTool === 'arrow'
                  ? 'bg-white text-rose-600 shadow-xs border border-rose-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title="Desenhar Seta Vermelha"
            >
              <MoveUpRight className="w-3.5 h-3.5" />
              Seta
            </button>
          </div>

          {/* Action buttons (Undo / Clear) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={annotations.length === 0}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                annotations.length > 0
                  ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 cursor-pointer shadow-2xs'
                  : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
              }`}
              title="Desfazer última marcação"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Desfazer
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              disabled={annotations.length === 0}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                annotations.length > 0
                  ? 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200 cursor-pointer shadow-2xs'
                  : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
              }`}
              title="Limpar todas as marcações"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Tudo
            </button>
          </div>
        </div>

        {/* Interactive Canvas Workspace */}
        <div
          ref={containerRef}
          className="flex-1 p-4 bg-slate-900/5 flex items-center justify-center overflow-auto min-h-[320px] select-none"
        >
          {!imageLoaded ? (
            <div className="flex flex-col items-center justify-center gap-2 text-slate-500 py-12">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              <span className="text-xs font-semibold">Carregando imagem...</span>
            </div>
          ) : (
            <div className="relative rounded-lg shadow-md border border-slate-300 overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                onMouseDown={handleStartDraw}
                onMouseMove={handleMoveDraw}
                onMouseUp={handleEndDraw}
                onMouseLeave={handleEndDraw}
                onTouchStart={handleStartDraw}
                onTouchMove={handleMoveDraw}
                onTouchEnd={handleEndDraw}
                className="cursor-crosshair block touch-none"
                style={{ touchAction: 'none' }}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
            {annotations.length === 0
              ? 'Nenhuma marcação adicionada.'
              : `${annotations.length} marcação(ões) ativa(s).`}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.99]"
            >
              <Check className="w-3.5 h-3.5" />
              Salvar Marcação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
