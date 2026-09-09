import React, { useRef } from 'react';
import { Upload, Trash2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SmvPhotoItem } from '../types/smv';

interface PhotoUploaderProps {
  photos: SmvPhotoItem[];
  onChange: (photos: SmvPhotoItem[]) => void;
  error?: string;
  isInitialEmptyPending?: boolean;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photos,
  onChange,
  error,
  isInitialEmptyPending = false,
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
        name: '', // Do not store/display filename
        observacao: updated[targetIdx]?.observacao || '',
      };

      onChange(updated);
      replaceIndexRef.current = null;
    } else {
      // Adding new photos (max 4)
      const slotsAvailable = 4 - photos.length;
      if (slotsAvailable <= 0) return;

      const filesToAdd = newFiles.slice(0, slotsAvailable);
      const newPhotoItems: SmvPhotoItem[] = filesToAdd.map((file) => ({
        id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        objectUrl: URL.createObjectURL(file),
        name: '',
        observacao: '',
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
    if (photos.length >= 4) return;
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

  const isMaxReached = photos.length >= 4;
  const isMinMet = photos.length >= 1;

  const showHighlight = (isInitialEmptyPending && photos.length === 0) || !!error;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Observações / Croqui - Fotografias <span className="text-rose-500 font-bold">*</span>
        </label>
        <span
          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
            isMinMet
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {photos.length} de 4 foto(s) {isMinMet ? '(Mínimo atendido)' : '(Mínimo 1 obrigatória)'}
        </span>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={photos.length < 4}
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="hidden"
        id="photo-file-input"
      />

      {/* Upload Zone / Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {/* Render Selected Photos */}
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="group relative bg-white rounded-xl overflow-hidden border border-slate-200 shadow-xs flex flex-col justify-between"
          >
            <div className="relative aspect-4/3 w-full bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-100">
              <img
                src={photo.objectUrl}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-200"
              />
              <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-xs text-slate-800 text-[11px] font-bold px-2.5 py-0.5 rounded shadow-xs border border-slate-200">
                FOTO {index + 1}
              </div>
            </div>

            {/* Card Actions Footer */}
            <div className="p-3 bg-slate-50/80 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleTriggerReplace(index)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Substituir foto"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  Substituir
                </button>
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(index)}
                  className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Remover foto"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  Remover
                </button>
              </div>

              {/* Optional Photo Observation Text */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Observação da foto (opcional)
                </label>
                <input
                  type="text"
                  value={photo.observacao || ''}
                  onChange={(e) => handleObservacaoChange(index, e.target.value)}
                  placeholder="EX.: DETALHE DO PAVIMENTO DANIFICADO"
                  className="w-full px-3 py-1.5 bg-white text-slate-900 placeholder:text-slate-400 font-medium text-xs rounded border border-slate-200 focus:border-slate-500 focus:outline-none uppercase"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Dropzone Box when less than 4 photos */}
        {!isMaxReached && (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleTriggerAdd}
            className={`border-2 border-dashed rounded-xl p-6 text-center flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all min-h-[190px] ${
              showHighlight
                ? 'border-rose-300 bg-rose-50/20 hover:bg-rose-50/40'
                : 'border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50'
            }`}
          >
            <div className={`p-2.5 rounded-full ${showHighlight ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 uppercase">
                {photos.length === 0
                  ? 'Clique ou arraste a 1ª foto aqui'
                  : `Clique ou arraste para adicionar (${photos.length + 1}ª foto)`}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Suporta PNG, JPG, JPEG &bull; Até 4 fotografias &bull; Memória temporária
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs font-semibold text-rose-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}

      {isMinMet && !error && (
        <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Fotografias prontas ({photos.length} de 4).
        </p>
      )}
    </div>
  );
};

