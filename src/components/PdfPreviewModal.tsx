import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileDown,
  CheckCircle,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { SmvFormData } from '../types/smv';
import {
  getPrefixoByTipoSMV,
  formatFullSmvNumber,
  getSmvDocumentFileName,
} from '../lib/smvRules';
import { createPdfDocument, generatePdf } from '../lib/generatePdf';

// Configure pdfjs worker URL via CDN matching installed version for 100% reliable cross-browser rendering
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;

interface PdfPreviewModalProps {
  formData: SmvFormData;
  isOpen: boolean;
  onClose: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  formData,
  isOpen,
  onClose,
}) => {
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(true);
  const [zoomScale, setZoomScale] = useState<number>(1.25);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const prefixo = getPrefixoByTipoSMV(formData.tipoSmv);
  const fullSmvNumber = formatFullSmvNumber(
    prefixo,
    formData.numeroCentral,
    formData.ano
  );

  // Load PDF bytes into pdfjs document
  useEffect(() => {
    if (isOpen) {
      setIsLoadingPdf(true);
      createPdfDocument(formData)
        .then(async (pdfBytes) => {
          const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
          const doc = await loadingTask.promise;
          setPdfDoc(doc);
          setIsLoadingPdf(false);
        })
        .catch((err) => {
          console.error('Error rendering PDF preview:', err);
          setIsLoadingPdf(false);
        });
    } else {
      setPdfDoc(null);
    }
  }, [isOpen, formData]);

  // Render Page onto Canvas when document or zoom level changes
  useEffect(() => {
    if (!pdfDoc) return;
    let renderTask: any = null;

    pdfDoc.getPage(1).then((page: any) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;

      const viewport = page.getViewport({ scale: zoomScale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      renderTask = page.render(renderContext);
      renderTask.promise.catch((err: any) => {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Canvas render error:', err);
        }
      });
    });

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, zoomScale]);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    const res = await generatePdf({ formData });
    setDownloadMessage(`Documento PDF "${res.fileName}" baixado com sucesso!`);
    setTimeout(() => setDownloadMessage(null), 4000);
  };

  return (
    <div
      id="pdf-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white text-slate-900 rounded-xl shadow-2xl max-w-5xl w-full my-auto overflow-hidden border border-slate-200 flex flex-col h-[92vh]">
        {/* Modal Header */}
        <div className="bg-white px-5 py-3.5 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-slate-100 rounded text-xs font-bold text-slate-700 border border-slate-200 uppercase tracking-wide">
              Pré-visualização
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                SMV Nº {fullSmvNumber}
              </h2>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Documento oficial formatado em padrão A4 institucional
              </p>
            </div>
          </div>

          {/* Controls: Zoom & Close */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-50 border border-slate-200 rounded-lg flex items-center px-1 py-0.5 text-xs text-slate-700">
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.max(0.75, z - 0.25))}
                className="p-1.5 hover:bg-slate-200/70 rounded text-slate-600 transition-colors"
                title="Reduzir zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono font-bold text-[11px] min-w-[45px] text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.min(2.5, z + 0.25))}
                className="p-1.5 hover:bg-slate-200/70 rounded text-slate-600 transition-colors"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(1.25)}
                className="p-1.5 hover:bg-slate-200/70 rounded text-slate-600 transition-colors ml-1 border-l border-slate-200"
                title="Ajustar tamanho padrão"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Fechar pré-visualização"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Download Feedback Banner */}
        {downloadMessage && (
          <div className="bg-emerald-600 text-white px-6 py-2 text-xs font-semibold flex items-center gap-2 shrink-0 shadow-xs">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{downloadMessage}</span>
          </div>
        )}

        {/* Real Canvas Rendered PDF Viewer Area */}
        <div className="flex-1 w-full bg-slate-100 relative overflow-auto p-4 flex items-center justify-center">
          {isLoadingPdf ? (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-600 py-20">
              <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Gerando documento em alta resolução...
              </span>
            </div>
          ) : pdfDoc ? (
            <div className="shadow-lg rounded border border-slate-300 bg-white p-0.5 max-w-full my-auto">
              <canvas ref={canvasRef} className="block max-w-full h-auto bg-white" />
            </div>
          ) : (
            <div className="text-rose-600 text-xs font-bold py-20 text-center">
              Não foi possível carregar a pré-visualização do PDF.
            </div>
          )}
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="bg-white p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-mono">
            {getSmvDocumentFileName(prefixo, formData.numeroCentral, formData.ano, 'pdf')}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <FileDown className="w-4 h-4" />
              BAIXAR PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

