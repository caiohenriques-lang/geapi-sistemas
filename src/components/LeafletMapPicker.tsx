import React, { useEffect, useRef } from 'react';
import { MapPin, Info, Compass } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LeafletMapPickerProps {
  lat: number | null;
  lng: number | null;
  zoom: number;
  centerLat: number | null;
  centerLng: number | null;
  markerType: 'PIN' | 'SETA';
  onPositionChange: (lat: number, lng: number) => void;
  onZoomChange: (zoom: number) => void;
  onCenterChange: (lat: number, lng: number) => void;
  onMarkerTypeChange: (type: 'PIN' | 'SETA') => void;
}

// Default center: Belo Horizonte, MG
const DEFAULT_CENTER: [number, number] = [-19.9167, -43.9345];
const DEFAULT_ZOOM = 16;

// Custom Red PIN Icon for Leaflet
const createPinIcon = () =>
  L.divIcon({
    className: 'custom-leaflet-red-marker',
    html: `<div style="width:28px;height:38px;position:relative;margin-left:-14px;margin-top:-38px;">
      <svg viewBox="0 0 24 34" width="28" height="38" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 22 12 22s12-13 12-22c0-6.63-5.37-12-12-12z" fill="#dc2626" stroke="#ffffff" stroke-width="1.8"/>
        <circle cx="12" cy="12" r="4.5" fill="#ffffff"/>
      </svg>
    </div>`,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
  });

// Custom Red SETA (Arrow) Icon for Leaflet
const createArrowIcon = () =>
  L.divIcon({
    className: 'custom-leaflet-arrow-marker',
    html: `<div style="width:40px;height:40px;position:relative;margin-left:-4px;margin-top:-4px;">
      <svg viewBox="0 0 40 40" width="40" height="40" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
        <path d="M4,4 L24,12 L19,16 L34,31 L31,34 L16,19 L12,24 Z" fill="#dc2626" stroke="#ffffff" stroke-width="2" />
        <circle cx="4" cy="4" r="3" fill="#ffffff" stroke="#dc2626" stroke-width="2"/>
      </svg>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [4, 4],
  });

export const LeafletMapPicker: React.FC<LeafletMapPickerProps> = ({
  lat,
  lng,
  zoom,
  centerLat,
  centerLng,
  markerType,
  onPositionChange,
  onZoomChange,
  onCenterChange,
  onMarkerTypeChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);

  // Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center prioritized: user defined center > user defined marker location > default BH
    const initialCenterLat = centerLat ?? lat ?? DEFAULT_CENTER[0];
    const initialCenterLng = centerLng ?? lng ?? DEFAULT_CENTER[1];
    const initialZoom = zoom || DEFAULT_ZOOM;

    const map = L.map(mapContainerRef.current, {
      center: [initialCenterLat, initialCenterLng],
      zoom: initialZoom,
      zoomControl: true,
    });

    mapInstanceRef.current = map;

    // Add OpenStreetMap Tile Layer with mandatory attribution
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
    }).addTo(map);

    // Initial Marker
    if (lat !== null && lng !== null) {
      const activeIcon = markerType === 'SETA' ? createArrowIcon() : createPinIcon();
      const marker = L.marker([lat, lng], {
        icon: activeIcon,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onPositionChange(pos.lat, pos.lng);
      });

      markerInstanceRef.current = marker;
    }

    // Capture clicks for manual marking
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat: newLat, lng: newLng } = e.latlng;
      onPositionChange(newLat, newLng);
    });

    // Capture map move and zoom to maintain perfect center and zoom
    const updateCenterAndZoom = () => {
      const currentCenter = map.getCenter();
      onCenterChange(currentCenter.lat, currentCenter.lng);
      
      const currentZoom = map.getZoom();
      onZoomChange(currentZoom);
    };

    map.on('moveend', updateCenterAndZoom);
    map.on('zoomend', updateCenterAndZoom);

    // Run first update to sync default state
    updateCenterAndZoom();

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    };
  }, []);

  // Sync Marker type or position dynamically
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (lat !== null && lng !== null) {
      const activeIcon = markerType === 'SETA' ? createArrowIcon() : createPinIcon();

      if (markerInstanceRef.current) {
        markerInstanceRef.current.setLatLng([lat, lng]);
        markerInstanceRef.current.setIcon(activeIcon);
      } else {
        const marker = L.marker([lat, lng], {
          icon: activeIcon,
          draggable: true,
        }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onPositionChange(pos.lat, pos.lng);
        });

        markerInstanceRef.current = marker;
      }
    } else if (markerInstanceRef.current) {
      map.removeLayer(markerInstanceRef.current);
      markerInstanceRef.current = null;
    }
  }, [lat, lng, markerType]);

  // Sync center and zoom when external values change (like sheet autocomplete)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Only set view if different to prevent oscillation
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();

    const targetLat = centerLat ?? DEFAULT_CENTER[0];
    const targetLng = centerLng ?? DEFAULT_CENTER[1];

    const isCenterDiff = Math.abs(currentCenter.lat - targetLat) > 0.0001 || Math.abs(currentCenter.lng - targetLng) > 0.0001;
    const isZoomDiff = currentZoom !== zoom;

    if (isCenterDiff || isZoomDiff) {
      map.setView([targetLat, targetLng], zoom);
    }
  }, [centerLat, centerLng, zoom]);

  const hasPoint = lat !== null && lng !== null;

  return (
    <div className="space-y-4">
      {/* Selector: PIN vs SETA */}
      <div className="flex items-center justify-between bg-slate-100 p-2 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            MARCAÇÃO DO MAPA
          </span>
        </div>
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => onMarkerTypeChange('PIN')}
            className={`px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
              markerType === 'PIN'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            PIN
          </button>
          <button
            type="button"
            onClick={() => onMarkerTypeChange('SETA')}
            className={`px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
              markerType === 'SETA'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            SETA
          </button>
        </div>
      </div>

      {/* Helper instruction */}
      <div className="text-xs text-slate-600 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200/80 flex items-center gap-2">
        <Info className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          Navegue pelo mapa e clique no ponto que deseja indicar.
        </span>
      </div>

      {/* Interactive Map Box */}
      <div className="relative w-full aspect-16/9 rounded-xl overflow-hidden border border-slate-300 shadow-sm bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full min-h-[300px] z-0" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>💡 Dica: Arraste o mapa ou use o scroll para aproximar/afastar.</span>
        {hasPoint && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              LAT: {lat?.toFixed(6)} | LNG: {lng?.toFixed(6)}
            </span>
            <span className="font-semibold text-emerald-700">✓ Ponto Marcado ({markerType})</span>
          </div>
        )}
      </div>
    </div>
  );
};
