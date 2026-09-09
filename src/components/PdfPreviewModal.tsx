import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileDown,
  FileSpreadsheet,
  Layers,
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
import { generateExcel } from '../lib/generateExcel';

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

  const handleDownloadExcel = async () => {
    const res = await generateExcel({ formData });
    setDownloadMessage(`Planilha Excel "${res.fileName}" baixada com sucesso!`);
    setTimeout(() => setDownloadMessage(null), 4000);
  };

  const handleDownloadBoth = async () => {
    const pdfRes = await generatePdf({ formData });
    const excelRes = await generateExcel({ formData });
    setDownloadMessage(
      `Documentos "${pdfRes.fileName}" e "${excelRes.fileName}" baixados com sucesso!`
    );
    setTimeout(() => setDownloadMessage(null), 4000);
  };

  return (
    <div
      id="pdf-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-900 text-white rounded-xl shadow-2xl max-w-5xl w-full my-auto overflow-hidden border border-slate-700 flex flex-col h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-1.5 bg-blue-900/80 rounded border border-blue-700/60 font-mono text-xs font-bold text-blue-300">
              PRÉ-VISUALIZAÇÃO OFICIAL
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                SMV Nº {fullSmvNumber}
              </h2>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Visualização fiel renderizada via Canvas (Compatível com Chrome, Edge, Firefox e Safari)
              </p>
            </div>
          </div>

          {/* Controls: Zoom & Close */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-800 border border-slate-700 rounded-lg flex items-center px-1 py-0.5 text-xs text-slate-300">
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.max(0.75, z - 0.25))}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
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
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(1.25)}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors ml-1 border-l border-slate-700"
                title="Ajustar tamanho"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar pré-visualização"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Download Feedback Banner */}
        {downloadMessage && (
          <div className="bg-emerald-600 text-white px-6 py-2.5 text-xs font-bold flex items-center gap-2 animate-fadeIn shrink-0 shadow-md">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{downloadMessage}</span>
          </div>
        )}

        {/* Real Canvas Rendered PDF Viewer Area */}
        <div className="flex-1 w-full bg-slate-950/90 relative overflow-auto p-4 flex items-center justify-center">
          {isLoadingPdf ? (
            <div className="flex flex-col items-center justify-center gap-3 text-white py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Gerando documento PDF oficial em alta fidelidade...
              </span>
            </div>
          ) : pdfDoc ? (
            <div className="shadow-2xl rounded border border-slate-700 bg-white p-0.5 max-w-full my-auto transition-all">
              <canvas ref={canvasRef} className="block max-w-full h-auto bg-white" />
            </div>
          ) : (
            <div className="text-red-400 text-xs font-bold py-20 text-center">
              Não foi possível carregar a pré-visualização do PDF.
            </div>
          )}
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="bg-slate-900 p-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            Arquivo final: <strong className="font-mono text-blue-300">{getSmvDocumentFileName(prefixo, formData.numeroCentral, formData.ano, 'pdf')}</strong>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <FileDown className="w-4 h-4" />
              BAIXAR PDF
            </button>

            <button
              type="button"
              onClick={handleDownloadExcel}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              BAIXAR EXCEL EDITÁVEL
            </button>

            <button
              type="button"
              onClick={handleDownloadBoth}
              className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Layers className="w-4 h-4" />
              BAIXAR OS DOIS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
