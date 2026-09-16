import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Square,
  MoveUpRight,
  RotateCcw,
  Trash2,
  Check,
  X,
  Sparkles,
  Crop,
  RotateCw,
  AlertTriangle,
} from 'lucide-react';
import { AnnotationShape, CropArea, SmvPhotoItem } from '../types/smv';

interface PhotoAnnotatorModalProps {
  photo: SmvPhotoItem | null;
  photoIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    photoIndex: number,
    annotations: AnnotationShape[],
    crop?: CropArea,
    annotatedObjectUrl?: string,
    croppedObjectUrl?: string
  ) => void;
}

type ToolType = 'rectangle' | 'arrow' | 'crop';

type HandleType = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e' | 'move';

interface CropDragState {
  handle: HandleType;
  startClientX: number;
  startClientY: number;
  initialCrop: CropArea;
}

interface ConfirmationModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export const PhotoAnnotatorModal: React.FC<PhotoAnnotatorModalProps> = ({
  photo,
  photoIndex,
  isOpen,
  onClose,
  onSave,
}) => {
  const [selectedTool, setSelectedTool] = useState<ToolType>('rectangle');
  const [annotations, setAnnotations] = useState<AnnotationShape[]>([]);
  
  // Active crop applied to current photo (null means full image)
  const [activeCrop, setActiveCrop] = useState<CropArea | null>(null);
  // Temporary crop currently being dragged/edited in crop mode
  const [tempCrop, setTempCrop] = useState<CropArea>({ x: 0, y: 0, width: 1, height: 1 });

  // Drawing state for shapes (rectangle/arrow)
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStart, setCurrentStart] = useState<{ x: number; y: number } | null>(null);
  const [currentEnd, setCurrentEnd] = useState<{ x: number; y: number } | null>(null);

  // Crop drag state
  const [cropDragState, setCropDragState] = useState<CropDragState | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<HandleType | null>(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<ConfirmationModalState | null>(null);

  const [imageLoaded, setImageLoaded] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load photo & restore saved annotations/crop when modal opens
  useEffect(() => {
    if (isOpen && photo) {
      setAnnotations(photo.annotations ? [...photo.annotations] : []);
      const initialCrop = photo.crop ? { ...photo.crop } : null;
      setActiveCrop(initialCrop);
      setTempCrop(initialCrop ? { ...initialCrop } : { x: 0, y: 0, width: 1, height: 1 });
      setSelectedTool('rectangle');
      setImageLoaded(false);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        setImageLoaded(true);
      };
      // Always load original image so we can crop non-destructively
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

  // Helper to get crop handles pixel positions for given crop and canvas dimensions
  const getCropHandles = (crop: CropArea, canvasWidth: number, canvasHeight: number) => {
    const cropX = crop.x * canvasWidth;
    const cropY = crop.y * canvasHeight;
    const cropW = crop.width * canvasWidth;
    const cropH = crop.height * canvasHeight;

    return [
      { id: 'nw' as HandleType, x: cropX, y: cropY },
      { id: 'ne' as HandleType, x: cropX + cropW, y: cropY },
      { id: 'sw' as HandleType, x: cropX, y: cropY + cropH },
      { id: 'se' as HandleType, x: cropX + cropW, y: cropY + cropH },
      { id: 'n' as HandleType, x: cropX + cropW / 2, y: cropY },
      { id: 's' as HandleType, x: cropX + cropW / 2, y: cropY + cropH },
      { id: 'w' as HandleType, x: cropX, y: cropY + cropH / 2 },
      { id: 'e' as HandleType, x: cropX + cropW, y: cropY + cropH / 2 },
    ];
  };

  // Redraw canvas whenever annotations, crop tool, or drawing state changes
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (selectedTool === 'crop') {
      // CROP MODE: Render original full image, overlay, crop box, rule of thirds, and handles
      ctx.drawImage(img, 0, 0, width, height);

      // 1. Dark overlay
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.fillRect(0, 0, width, height);

      // 2. Unmask crop box area
      const cropX = tempCrop.x * width;
      const cropY = tempCrop.y * height;
      const cropW = tempCrop.width * width;
      const cropH = tempCrop.height * height;

      const srcX = tempCrop.x * img.naturalWidth;
      const srcY = tempCrop.y * img.naturalHeight;
      const srcW = tempCrop.width * img.naturalWidth;
      const srcH = tempCrop.height * img.naturalHeight;

      ctx.drawImage(img, srcX, srcY, srcW, srcH, cropX, cropY, cropW, cropH);

      // 3. Crop Box Outline
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(cropX, cropY, cropW, cropH);

      ctx.strokeStyle = '#e11d48'; // Rose accent line
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(cropX, cropY, cropW, cropH);
      ctx.restore();

      // 4. Rule-of-Thirds Grid
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Vertical grid lines
      ctx.moveTo(cropX + cropW / 3, cropY);
      ctx.lineTo(cropX + cropW / 3, cropY + cropH);
      ctx.moveTo(cropX + (2 * cropW) / 3, cropY);
      ctx.lineTo(cropX + (2 * cropW) / 3, cropY + cropH);
      // Horizontal grid lines
      ctx.moveTo(cropX, cropY + cropH / 3);
      ctx.lineTo(cropX + cropW, cropY + cropH / 3);
      ctx.moveTo(cropX, cropY + cropH * 2 / 3);
      ctx.lineTo(cropX + cropW, cropY + cropH * 2 / 3);
      ctx.stroke();
      ctx.restore();

      // 5. Draw 8 Handles
      const handles = getCropHandles(tempCrop, width, height);
      handles.forEach((h) => {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = h.id === hoveredHandle ? '#be123c' : '#e11d48';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.id === hoveredHandle ? 8 : 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
    } else {
      // ANNOTATION MODE (Rectangle / Arrow):
      // Render cropped base image (or full original if no crop)
      const effCrop = activeCrop || { x: 0, y: 0, width: 1, height: 1 };
      const srcX = effCrop.x * img.naturalWidth;
      const srcY = effCrop.y * img.naturalHeight;
      const srcW = effCrop.width * img.naturalWidth;
      const srcH = effCrop.height * img.naturalHeight;

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, width, height);

      // Render saved annotations relative to cropped area
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

      // Render in-progress shape
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
    }
  }, [
    selectedTool,
    imageLoaded,
    tempCrop,
    activeCrop,
    hoveredHandle,
    annotations,
    isDrawing,
    currentStart,
    currentEnd,
    drawRectangleShape,
    drawArrowShape,
  ]);

  // Adjust canvas size to fit container layout while matching active aspect ratio
  useEffect(() => {
    if (!imageLoaded || !imageRef.current || !containerRef.current || !canvasRef.current) return;

    const img = imageRef.current;
    const container = containerRef.current;
    const containerW = container.clientWidth - 24;
    const containerH = window.innerHeight * 0.54;

    let baseWidth = img.naturalWidth;
    let baseHeight = img.naturalHeight;

    if (selectedTool !== 'crop' && activeCrop) {
      baseWidth = activeCrop.width * img.naturalWidth;
      baseHeight = activeCrop.height * img.naturalHeight;
    }

    const aspect = baseWidth / baseHeight;
    let targetW = containerW;
    let targetH = containerW / aspect;

    if (targetH > containerH) {
      targetH = containerH;
      targetW = containerH * aspect;
    }

    targetW = Math.max(200, Math.floor(targetW));
    targetH = Math.max(150, Math.floor(targetH));

    canvasRef.current.width = targetW;
    canvasRef.current.height = targetH;

    renderCanvas();
  }, [imageLoaded, selectedTool, activeCrop, renderCanvas]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Coordinate normalizer
  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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

    const canvasX = Math.max(0, Math.min(canvas.width, clientX - rect.left));
    const canvasY = Math.max(0, Math.min(canvas.height, clientY - rect.top));

    return {
      clientX,
      clientY,
      canvasX,
      canvasY,
      relX: canvasX / canvas.width,
      relY: canvasY / canvas.height,
    };
  };

  // Crop hit test for handles and move area
  const hitTestCrop = (canvasX: number, canvasY: number): HandleType | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const handles = getCropHandles(tempCrop, canvas.width, canvas.height);
    const HIT_RADIUS = 20;

    for (const h of handles) {
      const dist = Math.hypot(canvasX - h.x, canvasY - h.y);
      if (dist <= HIT_RADIUS) {
        return h.id;
      }
    }

    const cropX = tempCrop.x * canvas.width;
    const cropY = tempCrop.y * canvas.height;
    const cropW = tempCrop.width * canvas.width;
    const cropH = tempCrop.height * canvas.height;

    if (
      canvasX >= cropX &&
      canvasX <= cropX + cropW &&
      canvasY >= cropY &&
      canvasY <= cropY + cropH
    ) {
      return 'move';
    }

    return null;
  };

  // Handle Tool Selection Switch
  const handleSelectTool = (tool: ToolType) => {
    if (tool === 'crop') {
      // Entering crop mode: prepare tempCrop from activeCrop or default inset
      if (activeCrop) {
        setTempCrop({ ...activeCrop });
      } else {
        setTempCrop({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
      }
    }
    setSelectedTool(tool);
  };

  // Canvas Mouse/Touch Down
  const handleStartInteraction = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pt = getCanvasPoint(e);
    if (!pt) return;

    if (selectedTool === 'crop') {
      const handle = hitTestCrop(pt.canvasX, pt.canvasY);
      if (handle) {
        setCropDragState({
          handle,
          startClientX: pt.clientX,
          startClientY: pt.clientY,
          initialCrop: { ...tempCrop },
        });
      }
    } else {
      setIsDrawing(true);
      setCurrentStart({ x: pt.relX, y: pt.relY });
      setCurrentEnd({ x: pt.relX, y: pt.relY });
    }
  };

  // Canvas Mouse/Touch Move
  const handleMoveInteraction = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    if (!pt) return;

    if (selectedTool === 'crop') {
      if (cropDragState && canvasRef.current) {
        e.preventDefault();
        const canvasW = canvasRef.current.width;
        const canvasH = canvasRef.current.height;

        const deltaX = (pt.clientX - cropDragState.startClientX) / canvasW;
        const deltaY = (pt.clientY - cropDragState.startClientY) / canvasH;

        const init = cropDragState.initialCrop;
        let newX = init.x;
        let newY = init.y;
        let newW = init.width;
        let newH = init.height;

        const MIN_SIZE = 0.05; // minimum 5% crop width/height

        switch (cropDragState.handle) {
          case 'move': {
            newX = Math.max(0, Math.min(1 - init.width, init.x + deltaX));
            newY = Math.max(0, Math.min(1 - init.height, init.y + deltaY));
            break;
          }
          case 'nw': {
            newX = Math.max(0, Math.min(init.x + init.width - MIN_SIZE, init.x + deltaX));
            newY = Math.max(0, Math.min(init.y + init.height - MIN_SIZE, init.y + deltaY));
            newW = init.x + init.width - newX;
            newH = init.y + init.height - newY;
            break;
          }
          case 'ne': {
            newY = Math.max(0, Math.min(init.y + init.height - MIN_SIZE, init.y + deltaY));
            const maxW = 1 - init.x;
            newW = Math.max(MIN_SIZE, Math.min(maxW, init.width + deltaX));
            newH = init.y + init.height - newY;
            break;
          }
          case 'sw': {
            newX = Math.max(0, Math.min(init.x + init.width - MIN_SIZE, init.x + deltaX));
            newW = init.x + init.width - newX;
            const maxH = 1 - init.y;
            newH = Math.max(MIN_SIZE, Math.min(maxH, init.height + deltaY));
            break;
          }
          case 'se': {
            const maxW = 1 - init.x;
            const maxH = 1 - init.y;
            newW = Math.max(MIN_SIZE, Math.min(maxW, init.width + deltaX));
            newH = Math.max(MIN_SIZE, Math.min(maxH, init.height + deltaY));
            break;
          }
          case 'n': {
            newY = Math.max(0, Math.min(init.y + init.height - MIN_SIZE, init.y + deltaY));
            newH = init.y + init.height - newY;
            break;
          }
          case 's': {
            const maxH = 1 - init.y;
            newH = Math.max(MIN_SIZE, Math.min(maxH, init.height + deltaY));
            break;
          }
          case 'w': {
            newX = Math.max(0, Math.min(init.x + init.width - MIN_SIZE, init.x + deltaX));
            newW = init.x + init.width - newX;
            break;
          }
          case 'e': {
            const maxW = 1 - init.x;
            newW = Math.max(MIN_SIZE, Math.min(maxW, init.width + deltaX));
            break;
          }
        }

        setTempCrop({
          x: newX,
          y: newY,
          width: newW,
          height: newH,
        });
      } else {
        // Hover cursor check
        const h = hitTestCrop(pt.canvasX, pt.canvasY);
        setHoveredHandle(h);
      }
    } else {
      if (!isDrawing || !currentStart) return;
      e.preventDefault();
      setCurrentEnd({ x: pt.relX, y: pt.relY });
    }
  };

  // Canvas Mouse/Touch End
  const handleEndInteraction = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (selectedTool === 'crop') {
      if (cropDragState) {
        setCropDragState(null);
      }
    } else {
      if (!isDrawing || !currentStart || !currentEnd) {
        setIsDrawing(false);
        return;
      }
      e.preventDefault();

      const dx = Math.abs(currentEnd.x - currentStart.x);
      const dy = Math.abs(currentEnd.y - currentStart.y);

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
    }
  };

  // Cursor style generator for canvas
  const getCanvasCursor = () => {
    if (selectedTool !== 'crop') return 'crosshair';
    if (!hoveredHandle) return 'default';
    switch (hoveredHandle) {
      case 'nw':
      case 'se':
        return 'nwse-resize';
      case 'ne':
      case 'sw':
        return 'nesw-resize';
      case 'n':
      case 's':
        return 'ns-resize';
      case 'w':
      case 'e':
        return 'ew-resize';
      case 'move':
        return 'move';
      default:
        return 'default';
    }
  };

  // Apply crop change with confirmation if annotations exist
  const executeApplyCrop = (newCrop: CropArea | null) => {
    setActiveCrop(newCrop);
    if (newCrop) {
      setTempCrop({ ...newCrop });
    } else {
      setTempCrop({ x: 0, y: 0, width: 1, height: 1 });
    }
    setSelectedTool('rectangle');
  };

  const handleApplyCrop = () => {
    // Check if crop area actually changed or covers full image (~100%)
    const isFullImage =
      tempCrop.x <= 0.005 &&
      tempCrop.y <= 0.005 &&
      tempCrop.width >= 0.99 &&
      tempCrop.height >= 0.99;

    const targetCrop = isFullImage ? null : tempCrop;

    // Check if crop changed from activeCrop
    const cropChanged =
      JSON.stringify(targetCrop) !== JSON.stringify(activeCrop);

    if (cropChanged && annotations.length > 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Alterar recorte da imagem?',
        message:
          'Modificar o recorte da imagem irá remover as marcações existentes (retângulos/setas), pois a área de enquadramento foi alterada. Deseja continuar?',
        onConfirm: () => {
          setAnnotations([]);
          executeApplyCrop(targetCrop);
          setConfirmModal(null);
        },
      });
    } else {
      executeApplyCrop(targetCrop);
    }
  };

  // Restore Original Full Image
  const handleRestoreOriginal = () => {
    if (annotations.length > 0 && activeCrop !== null) {
      setConfirmModal({
        isOpen: true,
        title: 'Restaurar imagem original?',
        message:
          'Restaurar a imagem original irá remover o recorte e descartar as marcações criadas. Deseja continuar?',
        onConfirm: () => {
          setAnnotations([]);
          executeApplyCrop(null);
          setConfirmModal(null);
        },
      });
    } else {
      executeApplyCrop(null);
    }
  };

  // Cancel Crop Editing Mode without applying tempCrop
  const handleCancelCropMode = () => {
    if (activeCrop) {
      setTempCrop({ ...activeCrop });
    } else {
      setTempCrop({ x: 0, y: 0, width: 1, height: 1 });
    }
    setSelectedTool('rectangle');
  };

  // Undo & Clear Annotations
  const handleUndo = () => {
    setAnnotations((prev) => prev.slice(0, -1));
  };

  const handleClearAll = () => {
    setAnnotations([]);
  };

  // Save Final Edited Image & Annotations
  const handleSave = async () => {
    if (!photo || !imageRef.current) {
      onClose();
      return;
    }

    const img = imageRef.current;

    // 1. Calculate high-res source dimensions
    const effCrop = activeCrop;

    let srcX = 0;
    let srcY = 0;
    let srcW = img.naturalWidth;
    let srcH = img.naturalHeight;

    if (effCrop) {
      srcX = Math.round(effCrop.x * img.naturalWidth);
      srcY = Math.round(effCrop.y * img.naturalHeight);
      srcW = Math.round(effCrop.width * img.naturalWidth);
      srcH = Math.round(effCrop.height * img.naturalHeight);
    }

    // High resolution cropped base canvas
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = srcW;
    croppedCanvas.height = srcH;
    const cctx = croppedCanvas.getContext('2d');

    if (!cctx) {
      onSave(photoIndex, annotations, effCrop || undefined);
      onClose();
      return;
    }

    cctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

    // If no crop and no annotations, return clean original
    if (!effCrop && annotations.length === 0) {
      onSave(photoIndex, [], undefined, undefined, undefined);
      onClose();
      return;
    }

    // Helper to produce high quality JPEG Blob
    const getCanvasBlob = (canvas: HTMLCanvasElement): Promise<string | undefined> => {
      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(URL.createObjectURL(blob));
            } else {
              resolve(undefined);
            }
          },
          'image/jpeg',
          0.95
        );
      });
    };

    let croppedObjectUrl: string | undefined = undefined;
    let annotatedObjectUrl: string | undefined = undefined;

    if (effCrop) {
      croppedObjectUrl = await getCanvasBlob(croppedCanvas);
    }

    if (annotations.length > 0) {
      const annotatedCanvas = document.createElement('canvas');
      annotatedCanvas.width = srcW;
      annotatedCanvas.height = srcH;
      const actx = annotatedCanvas.getContext('2d');

      if (actx) {
        actx.drawImage(croppedCanvas, 0, 0);

        const strokeWidth = Math.max(
          4,
          Math.round(Math.max(srcW, srcH) * 0.0055)
        );

        annotations.forEach((shape) => {
          const startX = shape.startX * srcW;
          const startY = shape.startY * srcH;
          const endX = shape.endX * srcW;
          const endY = shape.endY * srcH;

          if (shape.type === 'rectangle') {
            drawRectangleShape(actx, startX, startY, endX, endY, strokeWidth, '#dc2626');
          } else if (shape.type === 'arrow') {
            drawArrowShape(actx, startX, startY, endX, endY, strokeWidth, '#dc2626');
          }
        });

        annotatedObjectUrl = await getCanvasBlob(annotatedCanvas);
      }
    }

    onSave(
      photoIndex,
      annotations,
      effCrop || undefined,
      annotatedObjectUrl,
      croppedObjectUrl
    );
    onClose();
  };

  if (!isOpen || !photo) return null;

  return (
    <div
      id="photo-annotator-modal"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fadeIn"
      role="dialog"
      aria-modal="true"
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
                Editar / Marcar Fotografia {photoIndex + 1}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Recorte a imagem ou destaque pontos importantes com retângulos e setas vermelhas
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

        {/* Primary Toolbar */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Main tool selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleSelectTool('rectangle')}
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
              onClick={() => handleSelectTool('arrow')}
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

            <button
              type="button"
              onClick={() => handleSelectTool('crop')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedTool === 'crop'
                  ? 'bg-white text-rose-600 shadow-xs border border-rose-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
              title="Ferramenta de Recorte / Crop"
            >
              <Crop className="w-3.5 h-3.5" />
              Recortar
            </button>
          </div>

          {/* Action buttons (Undo / Clear / Restore Original) */}
          <div className="flex items-center gap-2">
            {activeCrop !== null && selectedTool !== 'crop' && (
              <button
                type="button"
                onClick={handleRestoreOriginal}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border bg-white hover:bg-slate-50 text-slate-700 border-slate-200 cursor-pointer shadow-2xs"
                title="Restaurar imagem completa original sem recorte"
              >
                <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                Restaurar Original
              </button>
            )}

            {selectedTool !== 'crop' && (
              <>
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
                  Limpar Marcações
                </button>
              </>
            )}
          </div>
        </div>

        {/* Crop Sub-Bar Banner when Crop tool is selected */}
        {selectedTool === 'crop' && (
          <div className="px-5 py-2.5 bg-rose-50/90 border-b border-rose-200 flex flex-wrap items-center justify-between gap-2.5 text-xs text-rose-900 font-medium animate-fadeIn">
            <div className="flex items-center gap-2">
              <Crop className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Arraste as alças ou a caixa de seleção para ajustar a área de recorte da fotografia.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCancelCropMode}
                className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-md font-semibold border border-slate-200 transition-colors cursor-pointer"
              >
                Cancelar Recorte
              </button>
              {activeCrop !== null && (
                <button
                  type="button"
                  onClick={handleRestoreOriginal}
                  className="px-3 py-1 bg-white hover:bg-rose-100 text-rose-700 rounded-md font-semibold border border-rose-200 transition-colors cursor-pointer"
                >
                  Restaurar Original
                </button>
              )}
              <button
                type="button"
                onClick={handleApplyCrop}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Aplicar Recorte
              </button>
            </div>
          </div>
        )}

        {/* Interactive Canvas Workspace */}
        <div
          ref={containerRef}
          className="flex-1 p-4 bg-slate-900/5 flex items-center justify-center overflow-auto min-h-[320px] select-none relative"
        >
          {!imageLoaded ? (
            <div className="flex flex-col items-center justify-center gap-2 text-slate-500 py-12">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              <span className="text-xs font-semibold">Carregando fotografia...</span>
            </div>
          ) : (
            <div className="relative rounded-lg shadow-md border border-slate-300 overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                onMouseDown={handleStartInteraction}
                onMouseMove={handleMoveInteraction}
                onMouseUp={handleEndInteraction}
                onMouseLeave={handleEndInteraction}
                onTouchStart={handleStartInteraction}
                onTouchMove={handleMoveInteraction}
                onTouchEnd={handleEndInteraction}
                className="block touch-none"
                style={{
                  cursor: getCanvasCursor(),
                  touchAction: 'none',
                }}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 font-medium hidden sm:flex items-center gap-2">
            {activeCrop ? (
              <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                <Crop className="w-3 h-3" /> Imagem Recortada
              </span>
            ) : (
              <span>Enquadramento Original</span>
            )}
            <span>•</span>
            {annotations.length === 0
              ? 'Nenhuma marcação.'
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

      {/* Confirmation Modal for Clearing Annotations on Crop Change */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-scaleUp">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-rose-100 rounded-xl text-rose-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
