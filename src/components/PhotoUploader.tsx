import React, { useRef, useState } from 'react';
import {
  Upload,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Edit3,
  Crop,
  Map,
  MapPin,
} from 'lucide-react';
import { SmvPhotoItem, AnnotationShape, CropArea } from '../types/smv';
import { PhotoAnnotatorModal } from './PhotoAnnotatorModal';

interface PhotoUploaderProps {
  photos: SmvPhotoItem[];
  onChange: (photos: SmvPhotoItem[]) => void;
  usarMapa: 'SIM' | 'NAO' | null;
  mapaObjectUrl?: string;
  error?: string;
  isInitialEmptyPending?: boolean;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photos,
  onChange,
  usarMapa,
  mapaObjectUrl,
  error,
  isInitialEmptyPending = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceIndexRef = useRef<number | null>(null);
  const [annotatingIndex, setAnnotatingIndex] = useState<number | null>(null);

  // Maximum allowed user photos depends on whether Map occupies the 4th position
  const maxUserPhotos = usarMapa === 'SIM' ? 3 : 4;

  const handleFilesSelected = (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;

    const newFiles = Array.from(filesList).filter((f) => f.type.startsWith('image/'));
    if (newFiles.length === 0) return;

    if (replaceIndexRef.current !== null) {
      // Replacing specific photo
      const targetIdx = replaceIndexRef.current;
      const fileToReplace = newFiles[0];

      if (photos[targetIdx]) {
        if (photos[targetIdx].objectUrl) URL.revokeObjectURL(photos[targetIdx].objectUrl);
        if (photos[targetIdx].croppedObjectUrl) URL.revokeObjectURL(photos[targetIdx].croppedObjectUrl!);
        if (photos[targetIdx].annotatedObjectUrl) URL.revokeObjectURL(photos[targetIdx].annotatedObjectUrl!);
      }

      const updated = [...photos];
      updated[targetIdx] = {
        id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file: fileToReplace,
        objectUrl: URL.createObjectURL(fileToReplace),
        name: '',
        observacao: updated[targetIdx]?.observacao || '',
        annotations: [],
        crop: undefined,
        croppedObjectUrl: undefined,
        annotatedObjectUrl: undefined,
      };

      onChange(updated);
      replaceIndexRef.current = null;
    } else {
      // Adding new photos (max 3 if map is used, max 4 otherwise)
      const slotsAvailable = maxUserPhotos - photos.length;
      if (slotsAvailable <= 0) return;

      const filesToAdd = newFiles.slice(0, slotsAvailable);
      const newPhotoItems: SmvPhotoItem[] = filesToAdd.map((file) => ({
        id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        objectUrl: URL.createObjectURL(file),
        name: '',
        observacao: '',
        annotations: [],
      }));

      onChange([...photos, ...newPhotoItems]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    const photoToRemove = photos[index];
    if (photoToRemove) {
      if (photoToRemove.objectUrl) URL.revokeObjectURL(photoToRemove.objectUrl);
      if (photoToRemove.croppedObjectUrl) URL.revokeObjectURL(photoToRemove.croppedObjectUrl);
      if (photoToRemove.annotatedObjectUrl) URL.revokeObjectURL(photoToRemove.annotatedObjectUrl);
    }
    const updated = photos.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  const handleSaveAnnotations = (
    photoIdx: number,
    annotations: AnnotationShape[],
    crop?: CropArea,
    annotatedObjectUrl?: string,
    croppedObjectUrl?: string
  ) => {
    const updated = [...photos];
    const targetPhoto = updated[photoIdx];
    if (!targetPhoto) return;

    if (targetPhoto.croppedObjectUrl && targetPhoto.croppedObjectUrl !== croppedObjectUrl) {
      URL.revokeObjectURL(targetPhoto.croppedObjectUrl);
    }
    if (targetPhoto.annotatedObjectUrl && targetPhoto.annotatedObjectUrl !== annotatedObjectUrl) {
      URL.revokeObjectURL(targetPhoto.annotatedObjectUrl);
    }

    updated[photoIdx] = {
      ...targetPhoto,
      annotations,
      crop,
      croppedObjectUrl,
      annotatedObjectUrl,
    };

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
    if (photos.length >= maxUserPhotos) return;
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

  const isMapActive = usarMapa === 'SIM';
  const totalCroquiElements = photos.length + (isMapActive && mapaObjectUrl ? 1 : 0);
  const isMinMet = totalCroquiElements >= 1 || photos.length >= 1;
  const showHighlight = (isInitialEmptyPending && totalCroquiElements === 0) || !!error;

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
          Observações / Croqui - Fotografias do Local <span className="text-rose-500 font-bold">*</span>
        </label>
        <span
          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
            isMinMet
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {photos.length} foto(s) {isMapActive ? '+ 1 mapa' : ''}{' '}
          {isMinMet ? '(Mínimo atendido)' : '(Mínimo 1 item obrigatório)'}
        </span>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={photos.length < maxUserPhotos}
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="hidden"
        id="photo-file-input"
      />

      {/* Upload Zone / Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {/* Render Selected User Photos */}
        {photos.slice(0, maxUserPhotos).map((photo, index) => {
          const isMarked = photo.annotations && photo.annotations.length > 0;
          const isCropped = !!photo.crop;
          const displayUrl = photo.annotatedObjectUrl || photo.croppedObjectUrl || photo.objectUrl;

          return (
            <div
              key={photo.id}
              className="group relative bg-white rounded-xl overflow-hidden border border-slate-200 shadow-xs flex flex-col justify-between"
            >
              <div className="relative aspect-4/3 w-full bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-100">
                <img
                  src={displayUrl}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-200"
                />
                <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-xs text-slate-800 text-[11px] font-bold px-2.5 py-0.5 rounded shadow-xs border border-slate-200">
                  FOTO {index + 1}
                </div>

                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  {isCropped && (
                    <div className="bg-indigo-600/95 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1 border border-indigo-700">
                      <Crop className="w-3 h-3" />
                      RECORTADA
                    </div>
                  )}
                  {isMarked && (
                    <div className="bg-rose-600/95 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1 border border-rose-700">
                      <Sparkles className="w-3 h-3" />
                      MARCADA ({photo.annotations?.length})
                    </div>
                  )}
                </div>
              </div>

              {/* Card Actions Footer */}
              <div className="p-3 bg-slate-50/80 border-t border-slate-100 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAnnotatingIndex(index)}
                    className={`px-2.5 py-1.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer border shadow-2xs ${
                      isMarked || isCropped
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                    title="Editar fotografia, aplicar recorte ou adicionar marcações"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-rose-600" />
                    {isMarked || isCropped ? 'Editar Foto / Marcação' : 'Editar Foto'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTriggerReplace(index)}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Substituir foto"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      Substituir
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Remover foto"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      Remover
                    </button>
                  </div>
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
          );
        })}

        {/* Dropzone Box when less than max photos */}
        {photos.length < maxUserPhotos && (
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
            <div
              className={`p-2.5 rounded-full ${
                showHighlight ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 uppercase">
                {photos.length === 0
                  ? 'Clique ou arraste a 1ª foto aqui'
                  : `Clique ou arraste para adicionar (${photos.length + 1}ª foto)`}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Suporta PNG, JPG, JPEG &bull; Até {maxUserPhotos} foto(s){' '}
                {usarMapa === 'SIM' ? '(4º lugar reservado ao mapa)' : ''}
              </p>
            </div>
          </div>
        )}

        {/* 4th Reserved Slot Badge when MAP is active */}
        {usarMapa === 'SIM' && (
          <div className="group relative bg-slate-900 text-white rounded-xl overflow-hidden border border-slate-800 shadow-xs flex flex-col justify-between p-4 min-h-[190px]">
            <div className="flex items-start justify-between">
              <div className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                4º ITEM • CROQUI
              </div>
              <Map className="w-5 h-5 text-rose-400" />
            </div>

            <div className="space-y-1 my-auto">
              <p className="text-xs font-bold uppercase text-white flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-400" />
                Mapa de Localização Ativo
              </p>
              <p className="text-[11px] text-slate-400 leading-normal">
                O mapa de localização ocupará a 4ª posição no Croqui. Configure a referência, busca ou coordenadas no painel inferior do formulário.
              </p>
            </div>

            {mapaObjectUrl ? (
              <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Imagem do mapa gerada
              </div>
            ) : (
              <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Aguardando ponto no mapa
              </div>
            )}
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
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Fotos configuradas ({photos.length} foto(s) {isMapActive ? '+ 1 mapa' : ''}).
        </p>
      )}

      {/* Photo Annotator Modal */}
      <PhotoAnnotatorModal
        photo={annotatingIndex !== null ? photos[annotatingIndex] || null : null}
        photoIndex={annotatingIndex !== null ? annotatingIndex : 0}
        isOpen={annotatingIndex !== null}
        onClose={() => setAnnotatingIndex(null)}
        onSave={handleSaveAnnotations}
      />
    </div>
  );
};
