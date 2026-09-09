import React, { useRef } from 'react';
import { Upload, Image as ImageIcon, Trash2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SmvPhotoItem } from '../types/smv';

interface PhotoUploaderProps {
  photos: SmvPhotoItem[];
  onChange: (photos: SmvPhotoItem[]) => void;
  error?: string;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photos,
  onChange,
  error,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceIndexRef = useRef<number | null>(null);

  const handleFilesSelected = (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;

    const newFiles = Array.from(filesList).filter((f) => f.type.startsWith('image/'));

    if (newFiles.length === 0) return;

    if (replaceIndexRef.current !== null) {
      // Replacing specific photo
      const targetIdx = replaceIndexRef.current;
      const fileToReplace = newFiles[0];

      // Revoke old object URL
      if (photos[targetIdx]) {
        URL.revokeObjectURL(photos[targetIdx].objectUrl);
      }

      const updated = [...photos];
      updated[targetIdx] = {
        id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file: fileToReplace,
        objectUrl: URL.createObjectURL(fileToReplace),
        name: fileToReplace.name.toUpperCase(),
      };

      onChange(updated);
      replaceIndexRef.current = null;
    } else {
      // Adding new photos (max 2)
      const slotsAvailable = 2 - photos.length;
      if (slotsAvailable <= 0) return;

      const filesToAdd = newFiles.slice(0, slotsAvailable);
      const newPhotoItems: SmvPhotoItem[] = filesToAdd.map((file) => ({
        id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        objectUrl: URL.createObjectURL(file),
        name: file.name.toUpperCase(),
      }));

      onChange([...photos, ...newPhotoItems]);
    }

    // Reset input value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    const photoToRemove = photos[index];
    if (photoToRemove) {
      URL.revokeObjectURL(photoToRemove.objectUrl);
    }
    const updated = photos.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  const handleTriggerReplace = (index: number) => {
    replaceIndexRef.current = index;
    fileInputRef.current?.click();
  };

  const handleTriggerAdd = () => {
    replaceIndexRef.current = null;
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (photos.length >= 2) return;
    if (e.dataTransfer.files) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleObservacaoChange = (index: number, text: string) => {
    const updated = [...photos];
    updated[index] = {
      ...updated[index],
      observacao: text.toUpperCase(),
    };
    onChange(updated);
  };

  const isMaxReached = photos.length >= 2;
  const isMinMet = photos.length >= 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          11. OBSERVAÇÕES / CROQUI - FOTOS <span className="text-red-500 font-bold">*</span>
        </label>
        <span
          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
            isMinMet
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-amber-100 text-amber-800 border border-amber-300'
          }`}
        >
          {photos.length} de 2 foto(s)
        </span>
      </div>

      {/* Warning Notice Box */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="font-medium">
          Adicione de 1 a 2 fotos. É obrigatória a inclusão de pelo menos uma imagem.
        </p>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={photos.length === 0}
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="hidden"
        id="photo-file-input"
      />

      {/* Upload Zone / Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Render Selected Photos */}
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="group relative bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-700 shadow-md flex flex-col justify-between"
          >
            <div className="relative aspect-4/3 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
              <img
                src={photo.objectUrl}
                alt={`Fotografia ${index + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-1 rounded border border-slate-700">
                FOTO {index + 1}
              </div>
            </div>

            {/* Card Actions Footer */}
            <div className="p-3 bg-slate-800 border-t border-slate-700 space-y-2">
              <div className="flex items-center justify-end gap-2">
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTriggerReplace(index)}
                    className="px-2.5 py-1.5 bg-slate-700 hover:bg-blue-600 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Substituir foto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    SUBSTITUIR
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    className="px-2.5 py-1.5 bg-red-900/80 hover:bg-red-600 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Remover foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    REMOVER
                  </button>
                </div>
              </div>

              {/* Optional Photo Observation Text */}
              <div className="pt-2 border-t border-slate-700/80">
                <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                  Observação da Foto {index + 1} (opcional)
                </label>
                <input
                  type="text"
                  value={photo.observacao || ''}
                  onChange={(e) => handleObservacaoChange(index, e.target.value)}
                  placeholder="EX.: DETALHE DO PAVIMENTO DANO NO ASFALTO"
                  className="w-full px-2.5 py-1.5 bg-slate-900 text-white placeholder:text-slate-500 font-mono text-xs rounded border border-slate-600 focus:border-blue-400 focus:outline-none uppercase"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Dropzone Box when less than 2 photos */}
        {!isMaxReached && (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleTriggerAdd}
            className={`border-2 border-dashed rounded-xl p-6 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all min-h-[180px] ${
              error && photos.length === 0
                ? 'border-red-400 bg-red-50/40 hover:bg-red-50/70'
                : 'border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/30'
            }`}
          >
            <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 uppercase">
                {photos.length === 0 ? 'CLIQUE OU ARRASTE A 1ª FOTO AQUI' : 'CLIQUE OU ARRASTE A 2ª FOTO (OPCIONAL)'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Suporta imagens PNG, JPG, JPEG (Armazenamento temporário na memória)
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}

      {isMinMet && (
        <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Requisito de fotografia atendido ({photos.length} de máximo 2 salvas temporariamente na memória do navegador).
        </p>
      )}
    </div>
  );
};
