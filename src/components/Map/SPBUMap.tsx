'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { SPBUItem } from '@/types/spbu';
import { Video, Edit3, X, Clock, MapPin, Navigation } from 'lucide-react';

interface SPBUMapProps {
  spbus: SPBUItem[];
  selectedSpbu: SPBUItem | null;
  onSelectSpbu: (spbu: SPBUItem | null) => void;
  onOpenCCTV: (spbu: SPBUItem) => void;
  onOpenReport: (spbu: SPBUItem) => void;
  userLocation: { lat: number; lng: number } | null;
}

export const SPBUMap: React.FC<SPBUMapProps> = ({
  spbus,
  selectedSpbu,
  onSelectSpbu,
  onOpenCCTV,
  onOpenReport,
  userLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Center of Denpasar / Badung
  const DEFAULT_CENTER: [number, number] = [-8.685, 115.205];
  const DEFAULT_ZOOM = 13;

  // Generate dynamic DivIcon for map pin
  const createMarkerIcon = (spbu: SPBUItem, isSelected: boolean) => {
    let color = '#10b981'; // green (smooth)
    let ringClass = '';
    let label = 'Lancar';

    if (spbu.queueLevel === 'congested') {
      color = '#ef4444'; // red (congested)
      ringClass = 'marker-pulse-congested';
      label = `Macet ${spbu.estimatedWaitMinutes}m`;
    } else if (spbu.queueLevel === 'moderate') {
      color = '#f59e0b'; // amber (moderate)
      label = `Ramai ${spbu.estimatedWaitMinutes}m`;
    } else if (spbu.queueLevel === 'empty') {
      color = '#64748b'; // slate (empty/closed)
      label = 'Habis';
    }

    const cctvBadge = spbu.cctv.hasCCTV
      ? `<span class="cctv-click-trigger" data-spbu-id="${spbu.id}" style="background:#dc2626; color:white; font-size:9px; padding:2px 5px; border-radius:4px; font-weight:800; margin-left:3px; display:inline-flex; align-items:center; box-shadow:0 1px 3px rgba(0,0,0,0.4);" title="Buka pantauan CCTV">CCTV</span>`
      : '';

    const html = `
      <div style="position:relative; width:0; height:0;">
        <div class="marker-interactive-content" style="
          position:absolute;
          bottom:0;
          left:0;
          transform:translate(-50%, 0);
          display:flex;
          flex-direction:column;
          align-items:center;
          cursor:pointer;
          pointer-events:auto !important;
        ">
          <!-- Floating label pill -->
          <div style="
            background:#ffffff; 
            color:#09090b; 
            font-size:11px; 
            font-weight:700; 
            padding:3px 8px; 
            border-radius:12px; 
            border:2px solid ${isSelected ? '#000000' : color}; 
            box-shadow:0 4px 12px rgba(0,0,0,0.15); 
            white-space:nowrap; 
            display:flex; 
            align-items:center; 
            gap:3px;
            transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            margin-bottom:2px;
            cursor:pointer;
            pointer-events:auto !important;
          " title="${spbu.name} - Klik untuk lihat detail">
            <span style="width:7px; height:7px; border-radius:50%; background:${color}; flex-shrink:0;"></span>
            <span>${label}</span>
            ${cctvBadge}
          </div>

          <!-- Pin Head & Needle -->
          <div style="position:relative; width:28px; height:34px; display:flex; justify-content:center; cursor:pointer; pointer-events:auto !important;">
            <div class="${ringClass}" style="
              position:absolute;
              inset: -4px;
              border-radius:50%;
              background:${color};
              opacity:0.35;
            "></div>
            <svg viewBox="0 0 24 30" width="28" height="34" fill="${color}" style="display:block;">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 18 12 18s12-9 12-18c0-6.63-5.37-12-12-12zm0 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
            </svg>
            <div style="
              position:absolute; 
              top:6px; 
              left:9px; 
              width:10px; 
              height:10px; 
              border-radius:50%; 
              background:#ffffff;
              box-shadow:0 1px 3px rgba(0,0,0,0.5);
            "></div>
          </div>
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-spbu-marker',
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  };

  // User current location marker
  const createUserLocationIcon = () => {
    const html = `
      <div style="position:relative; width:0; height:0;">
        <div style="
          position:absolute;
          top:0;
          left:0;
          transform:translate(-50%, -50%);
          width:24px;
          height:24px;
        ">
          <div style="
            position:absolute;
            inset:-8px;
            border-radius:50%;
            background:#0284c7;
            opacity:0.35;
            animation: pulse-ring 2s infinite;
          "></div>
          <div style="
            width:24px;
            height:24px;
            border-radius:50%;
            background:#0284c7;
            border:3px solid #ffffff;
            box-shadow:0 2px 8px rgba(0,0,0,0.4);
          "></div>
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'user-location-marker',
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  };

  // 1. Initialize Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Clicking anywhere on empty map deselects active card
    map.on('click', (e) => {
      const target = e.originalEvent.target as HTMLElement;
      if (!target.closest('.custom-spbu-marker') && !target.closest('.map-floating-card')) {
        onSelectSpbu(null);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Render Markers ONLY when spbus data changes (independent of selectedSpbu)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear removed markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    spbus.forEach((spbu) => {
      const isSelected = selectedSpbu?.id === spbu.id;
      const icon = createMarkerIcon(spbu, isSelected);

      const marker = L.marker([spbu.coordinates.lat, spbu.coordinates.lng], {
        icon,
        zIndexOffset: isSelected ? 1000 : 100,
      }).addTo(map);

      // Handle click: check if user clicked directly on the CCTV badge or the pin
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        const nativeEvent = e.originalEvent as MouseEvent;
        const target = nativeEvent.target as HTMLElement;

        if (target && target.closest('.cctv-click-trigger') && spbu.cctv.hasCCTV) {
          onOpenCCTV(spbu);
        } else {
          onSelectSpbu(spbu);
        }
      });

      markersRef.current.set(spbu.id, marker);
    });
  }, [spbus]);

  // 3. React to selectedSpbu changes (update icon styling and pan smoothly without recreating markers)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Update icons for all markers to highlight selected
    spbus.forEach((spbu) => {
      const marker = markersRef.current.get(spbu.id);
      if (marker) {
        const isSelected = selectedSpbu?.id === spbu.id;
        marker.setIcon(createMarkerIcon(spbu, isSelected));
        marker.setZIndexOffset(isSelected ? 1000 : 100);
      }
    });

    if (selectedSpbu) {
      map.flyTo([selectedSpbu.coordinates.lat, selectedSpbu.coordinates.lng], 15, {
        duration: 0.6,
      });
    }
  }, [selectedSpbu]);

  // 4. Render user GPS location
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocation) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
          icon: createUserLocationIcon(),
          zIndexOffset: 2000,
        }).addTo(map);
      } else {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      }
    }
  }, [userLocation]);

  // Calculate Haversine distance for selected SPBU
  const selectedDistanceKm = useMemo(() => {
    if (!userLocation || !selectedSpbu) return null;
    const R = 6371; // km
    const dLat = ((selectedSpbu.coordinates.lat - userLocation.lat) * Math.PI) / 180;
    const dLng = ((selectedSpbu.coordinates.lng - userLocation.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLocation.lat * Math.PI) / 180) *
        Math.cos((selectedSpbu.coordinates.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`;
  }, [userLocation, selectedSpbu]);

  return (
    <div className="relative w-full h-full min-h-[420px] bg-zinc-100 overflow-hidden">
      {/* Map canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Modern React Floating Overlay Card when an SPBU is selected on the map */}
      {selectedSpbu && (
        <div className="map-floating-card absolute top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[900] animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="bg-white/95 backdrop-blur-md border border-zinc-200 rounded-2xl p-4 shadow-xl text-zinc-900">
            {/* Top row */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-100 text-zinc-700 border border-zinc-200">
                    {selectedSpbu.code}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
                    {selectedSpbu.regency} • {selectedSpbu.district}
                  </span>
                  {selectedDistanceKm && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                      <Navigation className="w-2.5 h-2.5" />
                      {selectedDistanceKm}
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-black text-sm sm:text-base leading-snug">
                  {selectedSpbu.name}
                </h4>
                <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{selectedSpbu.address}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => onSelectSpbu(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-black cursor-pointer"
                title="Tutup info"
                aria-label="Tutup info SPBU"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status bar */}
            <div className="mt-3 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between text-xs">
              <span className="text-zinc-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                Antrean Saat Ini:
              </span>
              <span
                className={`font-bold px-2 py-0.5 rounded-md ${
                  selectedSpbu.queueLevel === 'congested'
                    ? 'bg-rose-50 text-rose-800'
                    : selectedSpbu.queueLevel === 'moderate'
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-emerald-50 text-emerald-800'
                }`}
              >
                {selectedSpbu.queueLevel === 'congested'
                  ? 'Macet Mengular'
                  : selectedSpbu.queueLevel === 'moderate'
                  ? 'Ramai Sedang'
                  : 'Lancar'}{' '}
                (~{selectedSpbu.estimatedWaitMinutes} mnt)
              </span>
            </div>

            {/* Fuel stock quick summary */}
            <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center text-[11px]">
              <div className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-500 block text-[10px]">Pertalite</span>
                <span
                  className={`font-semibold ${
                    selectedSpbu.fuelStock.pertalite === 'available'
                      ? 'text-emerald-700'
                      : selectedSpbu.fuelStock.pertalite === 'low'
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }`}
                >
                  {selectedSpbu.fuelStock.pertalite === 'available'
                    ? 'Ada'
                    : selectedSpbu.fuelStock.pertalite === 'low'
                    ? 'Menipis'
                    : 'Habis'}
                </span>
              </div>
              <div className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-500 block text-[10px]">Pertamax</span>
                <span
                  className={`font-semibold ${
                    selectedSpbu.fuelStock.pertamax === 'available'
                      ? 'text-zinc-900'
                      : selectedSpbu.fuelStock.pertamax === 'low'
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }`}
                >
                  {selectedSpbu.fuelStock.pertamax === 'available'
                    ? 'Ada'
                    : selectedSpbu.fuelStock.pertamax === 'low'
                    ? 'Menipis'
                    : 'Habis'}
                </span>
              </div>
              <div className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-zinc-500 block text-[10px]">Bio Solar</span>
                <span
                  className={`font-semibold ${
                    selectedSpbu.fuelStock.solar === 'available'
                      ? 'text-emerald-700'
                      : selectedSpbu.fuelStock.solar === 'low'
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }`}
                >
                  {selectedSpbu.fuelStock.solar === 'available'
                    ? 'Ada'
                    : selectedSpbu.fuelStock.solar === 'low'
                    ? 'Menipis'
                    : 'Habis'}
                </span>
              </div>
            </div>

            {/* Action buttons (Direct React handlers) */}
            <div className="mt-3 pt-2.5 border-t border-zinc-200 flex gap-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${selectedSpbu.name}, ${selectedSpbu.address}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Buka rute navigasi ke ${selectedSpbu.name}`}
                className="min-h-[44px] px-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-black cursor-pointer"
              >
                <Navigation className="w-4 h-4 text-blue-600" />
                Rute
              </a>

              {selectedSpbu.cctv.hasCCTV && (
                <button
                  type="button"
                  onClick={() => onOpenCCTV(selectedSpbu)}
                  className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-black cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  Pantau CCTV
                </button>
              )}

              <button
                type="button"
                onClick={() => onOpenReport(selectedSpbu)}
                className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-black cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                Lapor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
