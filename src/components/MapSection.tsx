import React, { useState, useEffect } from 'react';
import { Map, AlertTriangle } from 'lucide-react';
import { MapReferenceItem, SmvPhotoItem } from '../types/smv';
import { MapAutocomplete } from './MapAutocomplete';
import { LeafletMapPicker } from './LeafletMapPicker';
import { renderLocationMapCanvas } from '../lib/mapRenderer';

interface MapSectionProps {
  usarMapa: 'SIM' | 'NAO' | null;
  onUsarMapaChange: (val: 'SIM' | 'NAO' | null) => void;
  mapaItem: MapReferenceItem | null;
  onMapaItemChange: (item: MapReferenceItem | null) => void;
  mapaLat: number | null;
  onMapaLatChange: (lat: number | null) => void;
  mapaLng: number | null;
  onMapaLngChange: (lng: number | null) => void;
  mapaZoom: number;
  onMapaZoomChange: (zoom: number) => void;
  mapaCenterLat: number | null;
  onMapaCenterLatChange: (lat: number | null) => void;
  mapaCenterLng: number | null;
  onMapaCenterLngChange: (lng: number | null) => void;
  mapaMarkerType: 'PIN' | 'SETA';
  onMapaMarkerTypeChange: (type: 'PIN' | 'SETA') => void;
  mapaObjectUrl?: string;
  onMapaObjectUrlChange: (url?: string) => void;
  photos: SmvPhotoItem[];
  onPhotosChange: (photos: SmvPhotoItem[]) => void;
}

export const MapSection: React.FC<MapSectionProps> = ({
  usarMapa,
  onUsarMapaChange,
  mapaItem,
  onMapaItemChange,
  mapaLat,
  onMapaLatChange,
  mapaLng,
  onMapaLngChange,
  mapaZoom,
  onMapaZoomChange,
  mapaCenterLat,
  onMapaCenterLatChange,
  mapaCenterLng,
  onMapaCenterLngChange,
  mapaMarkerType,
  onMapaMarkerTypeChange,
  mapaObjectUrl,
  onMapaObjectUrlChange,
  photos,
  onPhotosChange,
}) => {
  const [isConfirmingRemovePhoto4, setIsConfirmingRemovePhoto4] = useState<boolean>(false);

  // Sync lat/lng and map center when an equipment item from sheet autocomplete is selected
  useEffect(() => {
    if (mapaItem && mapaItem.isValidCoord && mapaItem.lat !== null && mapaItem.lng !== null) {
      onMapaLatChange(mapaItem.lat);
      onMapaLngChange(mapaItem.lng);
      onMapaCenterLatChange(mapaItem.lat);
      onMapaCenterLngChange(mapaItem.lng);
      onMapaMarkerTypeChange('PIN'); // Default marker type on reference selection
    }
  }, [mapaItem]);

  // Render static map image for PDF/Preview using Leaflet tile renderer canvas
  useEffect(() => {
    let isMounted = true;

    // Use marker location as fallback center if center is not set
    const renderCenterLat = mapaCenterLat ?? mapaLat;
    const renderCenterLng = mapaCenterLng ?? mapaLng;

    if (usarMapa !== 'SIM' || renderCenterLat === null || renderCenterLng === null) {
      if (mapaObjectUrl) {
        URL.revokeObjectURL(mapaObjectUrl);
        onMapaObjectUrlChange(undefined);
      }
      return;
    }

    renderLocationMapCanvas(
      renderCenterLat,
      renderCenterLng,
      mapaZoom,
      mapaLat,
      mapaLng,
      mapaMarkerType
    )
      .then(({ objectUrl }) => {
        if (isMounted) {
          if (mapaObjectUrl && mapaObjectUrl.startsWith('blob:')) {
            URL.revokeObjectURL(mapaObjectUrl);
          }
          onMapaObjectUrlChange(objectUrl);
        } else {
          URL.revokeObjectURL(objectUrl);
        }
      })
      .catch((err) => {
        console.error('Erro ao renderizar canvas do mapa:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [usarMapa, mapaLat, mapaLng, mapaZoom, mapaCenterLat, mapaCenterLng, mapaMarkerType]);

  const handleToggleUsarMapa = (targetVal: 'SIM' | 'NAO') => {
    if (targetVal === 'SIM') {
      if (photos.length >= 4) {
        setIsConfirmingRemovePhoto4(true);
        return;
      }
      onUsarMapaChange('SIM');
    } else {
      // Switch to NAO: clear map state and revoke URL
      if (mapaObjectUrl && mapaObjectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(mapaObjectUrl);
      }
      onMapaObjectUrlChange(undefined);
      onMapaItemChange(null);
      onMapaLatChange(null);
      onMapaLngChange(null);
      onMapaCenterLatChange(null);
      onMapaCenterLngChange(null);
      onMapaMarkerTypeChange('PIN');
      onUsarMapaChange('NAO');
    }
  };

  const handleConfirmRemove4thPhoto = () => {
    if (photos.length >= 4) {
      const photo4 = photos[3];
      if (photo4) {
        if (photo4.objectUrl) URL.revokeObjectURL(photo4.objectUrl);
        if (photo4.croppedObjectUrl) URL.revokeObjectURL(photo4.croppedObjectUrl);
        if (photo4.annotatedObjectUrl) URL.revokeObjectURL(photo4.annotatedObjectUrl);
      }
      onPhotosChange(photos.slice(0, 3));
    }
    setIsConfirmingRemovePhoto4(false);
    onUsarMapaChange('SIM');
  };

  const handlePositionChange = (lat: number, lng: number) => {
    onMapaLatChange(lat);
    onMapaLngChange(lng);
  };

  const handleCenterChange = (lat: number, lng: number) => {
    onMapaCenterLatChange(lat);
    onMapaCenterLngChange(lng);
  };

  return (
    <section className="bg-slate-50/90 rounded-2xl p-5 border border-slate-200 space-y-4 shadow-sm">
      {/* Header Bar with Toggle Question */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Map className="w-4 h-4 text-emerald-600 shrink-0" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Adicionar Mapa de Localização? <span className="text-slate-400 font-normal font-sans">(Opcional)</span>
            </h3>
          </div>
          <p className="text-[11px] text-slate-500">
            Substitui a 4ª foto do Croqui por um mapa interativo de localização (OpenStreetMap).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* SIM Button: Green background */}
          <button
            type="button"
            onClick={() => handleToggleUsarMapa('SIM')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
              usarMapa === 'SIM'
                ? 'bg-green-600 hover:bg-green-700 text-white border-green-600 ring-2 ring-green-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            SIM
          </button>
          {/* NÃO Button: Red background */}
          <button
            type="button"
            onClick={() => handleToggleUsarMapa('NAO')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
              usarMapa === 'NAO'
                ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 ring-2 ring-red-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            NÃO
          </button>
        </div>
      </div>

      {/* Map Content when SIM is selected */}
      {usarMapa === 'SIM' && (
        <div className="space-y-4 pt-1 animate-fadeIn">
          {/* Option A: Equipment Autocomplete */}
          <div className="space-y-1">
            <MapAutocomplete
              value={mapaItem}
              onChange={(item) => {
                onMapaItemChange(item);
                if (item && item.isValidCoord && item.lat !== null && item.lng !== null) {
                  onMapaLatChange(item.lat);
                  onMapaLngChange(item.lng);
                  onMapaCenterLatChange(item.lat);
                  onMapaCenterLngChange(item.lng);
                }
              }}
            />
          </div>

          {/* Interactive Leaflet Map (PIN / SETA and Center sync) */}
          <LeafletMapPicker
            lat={mapaLat}
            lng={mapaLng}
            zoom={mapaZoom}
            centerLat={mapaCenterLat}
            centerLng={mapaCenterLng}
            markerType={mapaMarkerType}
            onPositionChange={handlePositionChange}
            onZoomChange={onMapaZoomChange}
            onCenterChange={handleCenterChange}
            onMarkerTypeChange={onMapaMarkerTypeChange}
          />
        </div>
      )}

      {/* Confirmation Modal: Remove 4th photo */}
      {isConfirmingRemovePhoto4 && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-md w-full space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Substituir 4ª foto pelo mapa?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ao adicionar o mapa de localização, a 4ª foto será removida. Deseja continuar?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmingRemovePhoto4(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove4thPhoto}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer shadow-xs"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
