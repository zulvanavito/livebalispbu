'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { SPBUItem } from '@/types/spbu';

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

  // Keep callback refs fresh
  const spbusRef = useRef(spbus);
  const selectedSpbuRef = useRef(selectedSpbu);
  const onSelectSpbuRef = useRef(onSelectSpbu);
  const onOpenCCTVRef = useRef(onOpenCCTV);
  const onOpenReportRef = useRef(onOpenReport);

  useEffect(() => {
    spbusRef.current = spbus;
    selectedSpbuRef.current = selectedSpbu;
    onSelectSpbuRef.current = onSelectSpbu;
    onOpenCCTVRef.current = onOpenCCTV;
    onOpenReportRef.current = onOpenReport;
  });

  // Center of Denpasar / Badung
  const DEFAULT_CENTER: [number, number] = [-8.685, 115.205];
  const DEFAULT_ZOOM = 13;

  // Calculate distance string
  const getDistanceStr = (spbu: SPBUItem) => {
    if (!userLocation) return null;
    const R = 6371; // km
    const dLat = ((spbu.coordinates.lat - userLocation.lat) * Math.PI) / 180;
    const dLng = ((spbu.coordinates.lng - userLocation.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLocation.lat * Math.PI) / 180) *
        Math.cos((spbu.coordinates.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`;
  };

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

  // Generate modern HTML for Leaflet Popup (anchored right above the pin!)
  const createPopupHtml = (spbu: SPBUItem, distanceStr: string | null): string => {
    let queueBadgeBg = '#ecfdf5';
    let queueBadgeColor = '#065f46';
    let queueLabel = 'Lancar';

    if (spbu.queueLevel === 'congested') {
      queueBadgeBg = '#fef2f2';
      queueBadgeColor = '#991b1b';
      queueLabel = 'Macet Mengular';
    } else if (spbu.queueLevel === 'moderate') {
      queueBadgeBg = '#fffbeb';
      queueBadgeColor = '#92400e';
      queueLabel = 'Ramai Sedang';
    } else if (spbu.queueLevel === 'empty') {
      queueBadgeBg = '#f1f5f9';
      queueBadgeColor = '#334155';
      queueLabel = 'Kosong / Tutup';
    }

    const getStockColor = (status?: string) => {
      if (status === 'available') return '#047857';
      if (status === 'low') return '#b45309';
      return '#b91c1c';
    };

    const getStockLabel = (status?: string) => {
      if (status === 'available') return 'Ada';
      if (status === 'low') return 'Menipis';
      return 'Habis';
    };

    const distanceBadge = distanceStr
      ? `<span style="padding:2px 7px; border-radius:9999px; font-size:10px; font-weight:700; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; display:inline-flex; align-items:center; gap:2px;">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          ${distanceStr}
        </span>`
      : '';

    const cctvButton = spbu.cctv.hasCCTV
      ? `<button type="button" class="spbu-popup-cctv-btn" data-spbu-id="${spbu.id}" title="Lihat siaran CCTV ${spbu.name}" style="
          flex:1; min-height:38px; padding:6px 10px; border-radius:10px; background:#dc2626; color:#ffffff; font-size:11px; font-weight:700; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; box-shadow:0 1px 2px rgba(0,0,0,0.1); transition:opacity 0.15s;
        ">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          Lihat CCTV
        </button>`
      : '';

    return `
      <div style="font-family: inherit; width: 280px; max-width: 86vw; padding: 14px 14px 12px 14px; color: #09090b; box-sizing: border-box;">
        <!-- Header meta -->
        <div style="display:flex; align-items:center; gap:5px; margin-bottom:6px; flex-wrap:wrap;">
          <span style="padding:2px 5px; border-radius:4px; font-size:10px; font-family:monospace; background:#f4f4f5; color:#3f3f46; border:1px solid #e4e4e7;">
            ${spbu.code}
          </span>
          <span style="padding:2px 6px; border-radius:9999px; font-size:10px; font-weight:600; background:#f4f4f5; color:#52525b; border:1px solid #e4e4e7;">
            ${spbu.regency} • ${spbu.district}
          </span>
          ${distanceBadge}
        </div>

        <!-- Title & address -->
        <h4 style="margin:0 0 4px 0; font-size:13px; font-weight:800; line-height:1.3; color:#09090b;">
          ${spbu.name}
        </h4>
        <p style="margin:0 0 10px 0; font-size:11px; color:#71717a; line-height:1.3; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
          ${spbu.address}
        </p>

        <!-- Queue status banner -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 10px; border-radius:10px; background:#f4f4f5; border:1px solid #e4e4e7; margin-bottom:10px; font-size:11px;">
          <span style="color:#71717a; display:inline-flex; align-items:center; gap:4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Antrean:
          </span>
          <span style="font-weight:700; padding:2px 6px; border-radius:6px; background:${queueBadgeBg}; color:${queueBadgeColor};">
            ${queueLabel} (~${spbu.estimatedWaitMinutes} mnt)
          </span>
        </div>

        <!-- Fuel Stock Grid -->
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; text-align:center; margin-bottom:12px;">
          <div style="padding:5px 4px; border-radius:8px; background:#fafafa; border:1px solid #f4f4f5;">
            <span style="display:block; font-size:9px; color:#71717a; margin-bottom:2px;">Pertalite</span>
            <span style="font-size:11px; font-weight:700; color:${getStockColor(spbu.fuelStock.pertalite)};">
              ${getStockLabel(spbu.fuelStock.pertalite)}
            </span>
          </div>
          <div style="padding:5px 4px; border-radius:8px; background:#fafafa; border:1px solid #f4f4f5;">
            <span style="display:block; font-size:9px; color:#71717a; margin-bottom:2px;">Pertamax</span>
            <span style="font-size:11px; font-weight:700; color:${getStockColor(spbu.fuelStock.pertamax)};">
              ${getStockLabel(spbu.fuelStock.pertamax)}
            </span>
          </div>
          <div style="padding:5px 4px; border-radius:8px; background:#fafafa; border:1px solid #f4f4f5;">
            <span style="display:block; font-size:9px; color:#71717a; margin-bottom:2px;">Bio Solar</span>
            <span style="font-size:11px; font-weight:700; color:${getStockColor(spbu.fuelStock.solar)};">
              ${getStockLabel(spbu.fuelStock.solar)}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div style="display:flex; gap:6px; align-items:center; padding-top:4px; border-top:1px solid #f4f4f5;">
          <a href="https://www.google.com/maps/dir/?api=1&destination=${spbu.coordinates.lat},${spbu.coordinates.lng}" 
             target="_blank" 
             rel="noopener noreferrer"
             title="Buka rute navigasi Google Maps"
             style="
              min-height:38px; padding:6px 10px; border-radius:10px; background:#eff6ff; color:#1d4ed8; font-size:11px; font-weight:700; border:1px solid #bfdbfe; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:4px; box-sizing:border-box; transition:background 0.15s;
             ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            Rute
          </a>
          ${cctvButton}
          <button type="button" class="spbu-popup-report-btn" data-spbu-id="${spbu.id}" style="
            flex:1; min-height:38px; padding:6px 10px; border-radius:10px; background:#09090b; color:#ffffff; font-size:11px; font-weight:700; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 1px 2px rgba(0,0,0,0.1); transition:opacity 0.15s;
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Lapor
          </button>
        </div>
      </div>
    `;
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

    // Clicking anywhere on empty map deselects active SPBU
    map.on('click', (e) => {
      const target = e.originalEvent.target as HTMLElement;
      if (!target.closest('.custom-spbu-marker') && !target.closest('.leaflet-popup')) {
        onSelectSpbuRef.current(null);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 1b. Robust event delegation on the map container (capture phase)
  // Guarantees clicks on CCTV, Report, and Close inside popups always trigger reliably
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const handleContainerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // A. CCTV Button (either inside popup or directly on the pin badge)
      const cctvTrigger = target.closest('.spbu-popup-cctv-btn, .cctv-click-trigger') as HTMLElement | null;
      if (cctvTrigger) {
        e.preventDefault();
        e.stopPropagation();
        const spbuId = cctvTrigger.getAttribute('data-spbu-id');
        const targetSpbu = spbusRef.current.find((s) => s.id === spbuId);
        if (targetSpbu && targetSpbu.cctv.hasCCTV) {
          onOpenCCTVRef.current(targetSpbu);
        }
        return;
      }

      // B. Report Button inside popup
      const reportTrigger = target.closest('.spbu-popup-report-btn') as HTMLElement | null;
      if (reportTrigger) {
        e.preventDefault();
        e.stopPropagation();
        const spbuId = reportTrigger.getAttribute('data-spbu-id');
        const targetSpbu = spbusRef.current.find((s) => s.id === spbuId);
        if (targetSpbu) {
          onOpenReportRef.current(targetSpbu);
        }
        return;
      }

      // C. Close button inside popup
      const closeTrigger = target.closest('.leaflet-popup-close-button') as HTMLElement | null;
      if (closeTrigger) {
        onSelectSpbuRef.current(null);
        return;
      }
    };

    container.addEventListener('click', handleContainerClick, true);
    return () => {
      container.removeEventListener('click', handleContainerClick, true);
    };
  }, []);

  // 2. Render Markers and bind Popups directly on coordinates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    spbus.forEach((spbu) => {
      const isSelected = selectedSpbu?.id === spbu.id;
      const icon = createMarkerIcon(spbu, isSelected);

      const marker = L.marker([spbu.coordinates.lat, spbu.coordinates.lng], {
        icon,
        zIndexOffset: isSelected ? 1000 : 100,
      }).addTo(map);

      // Create Leaflet Popup anchored directly above the marker pin
      const popup = L.popup({
        offset: [0, -60],
        className: 'custom-spbu-popup',
        closeButton: true,
        autoPan: true,
        autoPanPaddingTopLeft: [24, 24],
        autoPanPaddingBottomRight: [24, 24],
        maxWidth: 320,
        minWidth: 280,
      }).setContent(createPopupHtml(spbu, getDistanceStr(spbu)));

      marker.bindPopup(popup);

      // Handle marker click: check if user clicked CCTV badge or the pin
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        const nativeEvent = e.originalEvent as MouseEvent;
        const target = nativeEvent.target as HTMLElement;

        if (target && target.closest('.cctv-click-trigger') && spbu.cctv.hasCCTV) {
          onOpenCCTVRef.current(spbu);
        } else {
          onSelectSpbuRef.current(spbu);
        }
      });

      markersRef.current.set(spbu.id, marker);
    });
  }, [spbus, userLocation]);

  // 3. React to selectedSpbu changes (update icon styling, pan smoothly, and open popup on the marker)
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
      const marker = markersRef.current.get(selectedSpbu.id);
      if (marker) {
        map.flyTo([selectedSpbu.coordinates.lat, selectedSpbu.coordinates.lng], 15, {
          duration: 0.6,
        });

        // Update popup content with latest distance and data
        marker.getPopup()?.setContent(createPopupHtml(selectedSpbu, getDistanceStr(selectedSpbu)));
        marker.openPopup();
      }
    } else {
      map.closePopup();
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

  return (
    <div className="relative w-full h-full min-h-[420px] bg-zinc-100 overflow-hidden">
      {/* Map canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
