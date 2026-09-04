import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, ZoomIn, ZoomOut, RotateCcw, ExternalLink, Activity, Thermometer, ShieldAlert, Compass, MapPin } from 'lucide-react';

export interface FieldWell {
  id: string;
  name: string;
  status: 'Normal' | 'Attention' | 'Critical';
  oilProduction: number; // BPD
  sor: number; // bbl/bbl
  temperature: number; // °C
  rodLoad: number; // kN
  pumpEfficiency: number; // %
  failureRisk: string;
  formation: string;
  depthMeters: number;
  apiGravity: number;
  cssCycle: string;
  lat: number;
  lng: number;
}

// ── Real Geographical Coordinates of Oil India Limited Baghewala PML Block ───
// Center: 27° 44' 35" N, 71° 57' 42" E (27.7431° N, 71.9617° E)
// PML Block: 206.8 sq km in Bikaner-Nagaur Basin, Jaisalmer District, Rajasthan
export const BAGHEWALA_MAP_WELLS: FieldWell[] = [
  // ── Critical Wells (Red Pins) ───────────────────────────────────────
  { 
    id: 'BGW-014', 
    name: 'BGW-014', 
    status: 'Critical', 
    oilProduction: 24.8, 
    sor: 3.8, 
    temperature: 74, 
    rodLoad: 6.3, 
    pumpEfficiency: 62, 
    failureRisk: 'HIGH (0.68)', 
    formation: 'Jodhpur Sandstone Member A', 
    depthMeters: 852, 
    apiGravity: 17.5, 
    cssCycle: 'Cycle 04 (Active)', 
    lat: 27.7495, 
    lng: 71.9688 
  },
  { 
    id: 'BGW-007', 
    name: 'BGW-007', 
    status: 'Critical', 
    oilProduction: 18.4, 
    sor: 5.2, 
    temperature: 68, 
    rodLoad: 7.1, 
    pumpEfficiency: 52, 
    failureRisk: 'HIGH (0.72)', 
    formation: 'Lower Bilara Dolomite', 
    depthMeters: 864, 
    apiGravity: 16.8, 
    cssCycle: 'Cycle 03 (Decline)', 
    lat: 27.7378, 
    lng: 71.9485 
  },

  // ── Attention Wells (Yellow / Amber Pins) ───────────────────────────
  { 
    id: 'BGW-021', 
    name: 'BGW-021', 
    status: 'Attention', 
    oilProduction: 27.1, 
    sor: 4.3, 
    temperature: 73, 
    rodLoad: 5.9, 
    pumpEfficiency: 66, 
    failureRisk: 'MEDIUM (0.42)', 
    formation: 'Jodhpur Sandstone Member B', 
    depthMeters: 846, 
    apiGravity: 17.8, 
    cssCycle: 'Cycle 02 (Production)', 
    lat: 27.7562, 
    lng: 71.9642 
  },
  { 
    id: 'BGW-003', 
    name: 'BGW-003', 
    status: 'Attention', 
    oilProduction: 24.8, 
    sor: 4.1, 
    temperature: 74, 
    rodLoad: 6.3, 
    pumpEfficiency: 62, 
    failureRisk: 'MEDIUM (0.45)', 
    formation: 'Jodhpur Sandstone Member A', 
    depthMeters: 850, 
    apiGravity: 17.4, 
    cssCycle: 'Cycle 04 (Production)', 
    lat: 27.7465, 
    lng: 71.9565 
  },
  { 
    id: 'BGW-010', 
    name: 'BGW-010', 
    status: 'Attention', 
    oilProduction: 22.1, 
    sor: 4.6, 
    temperature: 71, 
    rodLoad: 6.8, 
    pumpEfficiency: 58, 
    failureRisk: 'MEDIUM (0.48)', 
    formation: 'Jodhpur Sandstone Member C', 
    depthMeters: 870, 
    apiGravity: 16.9, 
    cssCycle: 'Cycle 03 (Soaking)', 
    lat: 27.7335, 
    lng: 71.9420 
  },

  // ── Normal / Operating Heavy Oil Wells (Green Pins) ─────────────────
  { 
    id: 'BGW-001', 
    name: 'BGW-001 (Discovery)', 
    status: 'Normal', 
    oilProduction: 31.2, 
    sor: 3.2, 
    temperature: 82, 
    rodLoad: 4.2, 
    pumpEfficiency: 78, 
    failureRisk: 'LOW (0.08)', 
    formation: 'Jodhpur Sandstone Member A', 
    depthMeters: 840, 
    apiGravity: 18.2, 
    cssCycle: 'Cycle 05 (Stable)', 
    lat: 27.7395, 
    lng: 71.9510 
  },
  { 
    id: 'BGW-002', 
    name: 'BGW-002', 
    status: 'Normal', 
    oilProduction: 28.4, 
    sor: 3.5, 
    temperature: 79, 
    rodLoad: 5.1, 
    pumpEfficiency: 74, 
    failureRisk: 'LOW (0.12)', 
    formation: 'Jodhpur Sandstone Member A', 
    depthMeters: 848, 
    apiGravity: 17.6, 
    cssCycle: 'Cycle 04 (Production)', 
    lat: 27.7510, 
    lng: 71.9540 
  },
  { 
    id: 'BGW-004', 
    name: 'BGW-004', 
    status: 'Normal', 
    oilProduction: 33.1, 
    sor: 3.0, 
    temperature: 81, 
    rodLoad: 4.2, 
    pumpEfficiency: 81, 
    failureRisk: 'LOW (0.06)', 
    formation: 'Jodhpur Sandstone Member B', 
    depthMeters: 855, 
    apiGravity: 18.0, 
    cssCycle: 'Cycle 03 (Stable)', 
    lat: 27.7445, 
    lng: 71.9715 
  },
  { 
    id: 'BGW-005', 
    name: 'BGW-005', 
    status: 'Normal', 
    oilProduction: 26.7, 
    sor: 3.7, 
    temperature: 76, 
    rodLoad: 5.8, 
    pumpEfficiency: 70, 
    failureRisk: 'LOW (0.15)', 
    formation: 'Lower Bilara Dolomite', 
    depthMeters: 860, 
    apiGravity: 17.1, 
    cssCycle: 'Cycle 02 (Production)', 
    lat: 27.7340, 
    lng: 71.9580 
  },
  { 
    id: 'BGW-006', 
    name: 'BGW-006', 
    status: 'Normal', 
    oilProduction: 29.5, 
    sor: 3.3, 
    temperature: 80, 
    rodLoad: 4.9, 
    pumpEfficiency: 76, 
    failureRisk: 'LOW (0.10)', 
    formation: 'Jodhpur Sandstone Member A', 
    depthMeters: 852, 
    apiGravity: 17.7, 
    cssCycle: 'Cycle 04 (Production)', 
    lat: 27.7580, 
    lng: 71.9570 
  },
  { 
    id: 'BGW-008', 
    name: 'BGW-008', 
    status: 'Normal', 
    oilProduction: 32.8, 
    sor: 3.1, 
    temperature: 83, 
    rodLoad: 4.6, 
    pumpEfficiency: 79, 
    failureRisk: 'LOW (0.09)', 
    formation: 'Jodhpur Sandstone Member B', 
    depthMeters: 858, 
    apiGravity: 18.1, 
    cssCycle: 'Cycle 03 (Stable)', 
    lat: 27.7410, 
    lng: 71.9780 
  },
  { 
    id: 'BGW-009', 
    name: 'BGW-009', 
    status: 'Normal', 
    oilProduction: 27.3, 
    sor: 3.6, 
    temperature: 78, 
    rodLoad: 5.4, 
    pumpEfficiency: 72, 
    failureRisk: 'LOW (0.14)', 
    formation: 'Jodhpur Sandstone Member A', 
    depthMeters: 844, 
    apiGravity: 17.3, 
    cssCycle: 'Cycle 03 (Production)', 
    lat: 27.7420, 
    lng: 71.9535 
  },
  { 
    id: 'BGW-011', 
    name: 'BGW-011', 
    status: 'Normal', 
    oilProduction: 30.6, 
    sor: 3.3, 
    temperature: 80, 
    rodLoad: 5.0, 
    pumpEfficiency: 77, 
    failureRisk: 'LOW (0.11)', 
    formation: 'Jodhpur Sandstone Member B', 
    depthMeters: 856, 
    apiGravity: 17.9, 
    cssCycle: 'Cycle 04 (Production)', 
    lat: 27.7315, 
    lng: 71.9690 
  },
  { 
    id: 'BGW-012', 
    name: 'BGW-012', 
    status: 'Normal', 
    oilProduction: 25.9, 
    sor: 3.8, 
    temperature: 77, 
    rodLoad: 5.6, 
    pumpEfficiency: 69, 
    failureRisk: 'LOW (0.16)', 
    formation: 'Jodhpur Sandstone Member C', 
    depthMeters: 865, 
    apiGravity: 17.0, 
    cssCycle: 'Cycle 02 (Production)', 
    lat: 27.7535, 
    lng: 71.9440 
  },
  { 
    id: 'BGW-013', 
    name: 'BGW-013', 
    status: 'Normal', 
    oilProduction: 34.2, 
    sor: 2.9, 
    temperature: 84, 
    rodLoad: 4.0, 
    pumpEfficiency: 82, 
    failureRisk: 'LOW (0.05)', 
    formation: 'Jodhpur Sandstone Member A', 
    depthMeters: 842, 
    apiGravity: 18.4, 
    cssCycle: 'Cycle 04 (Peak)', 
    lat: 27.7485, 
    lng: 71.9750 
  },
  { 
    id: 'BGW-015', 
    name: 'BGW-015', 
    status: 'Normal', 
    oilProduction: 28.0, 
    sor: 3.5, 
    temperature: 79, 
    rodLoad: 5.1, 
    pumpEfficiency: 73, 
    failureRisk: 'LOW (0.13)', 
    formation: 'Jodhpur Sandstone Member B', 
    depthMeters: 854, 
    apiGravity: 17.5, 
    cssCycle: 'Cycle 03 (Production)', 
    lat: 27.7380, 
    lng: 71.9635 
  },
  { 
    id: 'BGW-016', 
    name: 'BGW-016', 
    status: 'Normal', 
    oilProduction: 31.8, 
    sor: 3.2, 
    temperature: 81, 
    rodLoad: 4.4, 
    pumpEfficiency: 79, 
    failureRisk: 'LOW (0.07)', 
    formation: 'Jodhpur Sandstone Member A', 
    depthMeters: 845, 
    apiGravity: 18.0, 
    cssCycle: 'Cycle 03 (Stable)', 
    lat: 27.7570, 
    lng: 71.9495 
  },
  { 
    id: 'BGW-017', 
    name: 'BGW-017', 
    status: 'Normal', 
    oilProduction: 29.1, 
    sor: 3.4, 
    temperature: 80, 
    rodLoad: 4.8, 
    pumpEfficiency: 75, 
    failureRisk: 'LOW (0.11)', 
    formation: 'Jodhpur Sandstone Member B', 
    depthMeters: 850, 
    apiGravity: 17.7, 
    cssCycle: 'Cycle 04 (Production)', 
    lat: 27.7455, 
    lng: 71.9510 
  },
  { 
    id: 'BGW-018', 
    name: 'BGW-018', 
    status: 'Normal', 
    oilProduction: 30.2, 
    sor: 3.3, 
    temperature: 80, 
    rodLoad: 4.7, 
    pumpEfficiency: 77, 
    failureRisk: 'LOW (0.10)', 
    formation: 'Jodhpur Sandstone Member A', 
    depthMeters: 848, 
    apiGravity: 17.8, 
    cssCycle: 'Cycle 03 (Production)', 
    lat: 27.7300, 
    lng: 71.9530 
  },
  { 
    id: 'BGW-019', 
    name: 'BGW-019', 
    status: 'Normal', 
    oilProduction: 27.8, 
    sor: 3.6, 
    temperature: 78, 
    rodLoad: 5.3, 
    pumpEfficiency: 71, 
    failureRisk: 'LOW (0.14)', 
    formation: 'Jodhpur Sandstone Member B', 
    depthMeters: 857, 
    apiGravity: 17.4, 
    cssCycle: 'Cycle 02 (Production)', 
    lat: 27.7540, 
    lng: 71.9710 
  },
  { 
    id: 'BGW-020', 
    name: 'BGW-020', 
    status: 'Normal', 
    oilProduction: 33.5, 
    sor: 3.0, 
    temperature: 82, 
    rodLoad: 4.1, 
    pumpEfficiency: 80, 
    failureRisk: 'LOW (0.06)', 
    formation: 'Jodhpur Sandstone Member A', 
    depthMeters: 840, 
    apiGravity: 18.3, 
    cssCycle: 'Cycle 04 (Peak)', 
    lat: 27.7470, 
    lng: 71.9380 
  },
  { 
    id: 'BGW-022', 
    name: 'BGW-022', 
    status: 'Normal', 
    oilProduction: 29.8, 
    sor: 3.4, 
    temperature: 79, 
    rodLoad: 4.9, 
    pumpEfficiency: 76, 
    failureRisk: 'LOW (0.09)', 
    formation: 'Jodhpur Sandstone Member A', 
    depthMeters: 849, 
    apiGravity: 17.7, 
    cssCycle: 'Cycle 03 (Production)', 
    lat: 27.7320, 
    lng: 71.9630 
  },
  { 
    id: 'BGW-023', 
    name: 'BGW-023', 
    status: 'Normal', 
    oilProduction: 32.0, 
    sor: 3.1, 
    temperature: 82, 
    rodLoad: 4.3, 
    pumpEfficiency: 78, 
    failureRisk: 'LOW (0.08)', 
    formation: 'Jodhpur Sandstone Member B', 
    depthMeters: 851, 
    apiGravity: 18.0, 
    cssCycle: 'Cycle 04 (Stable)', 
    lat: 27.7525, 
    lng: 71.9660 
  },
];

interface FieldMapProps {
  onSelectWell?: (well: FieldWell) => void;
  selectedWellId?: string;
}

export const FieldMapBaghewala: React.FC<FieldMapProps> = ({ onSelectWell, selectedWellId = 'BGW-014' }) => {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [activeWell, setActiveWell] = useState<FieldWell | null>(
    BAGHEWALA_MAP_WELLS.find(w => w.id === selectedWellId) || BAGHEWALA_MAP_WELLS[0]
  );
  const [activeLayer, setActiveLayer] = useState<'google' | 'esri' | 'terrain'>('google');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Normal' | 'Attention' | 'Critical'>('ALL');

  // SVG Teardrop Pin Marker HTML (Matching Screenshot 1)
  const createPinIcon = (well: FieldWell, isSelected: boolean) => {
    let pinColor = '#16A34A'; // green
    let iconSvg = `<circle cx="12" cy="12" r="4" fill="white" />`;
    let pulseHtml = '';

    if (well.status === 'Critical') {
      pinColor = '#DC2626'; // red
      iconSvg = `<path d="M12 7v6m0 4v.01" stroke="white" stroke-width="2.2" stroke-linecap="round" />`;
      pulseHtml = `<div class="absolute -inset-2 rounded-full border-2 border-red-500 animate-ping opacity-75"></div>`;
    } else if (well.status === 'Attention') {
      pinColor = '#EAB308'; // amber/yellow
      iconSvg = `<circle cx="12" cy="12" r="3.5" fill="white" />`;
    }

    const html = `
      <div class="relative flex flex-col items-center cursor-pointer group" style="transform: translate(-50%, -100%);">
        ${pulseHtml}
        <div style="
          width: ${isSelected ? '34px' : '28px'}; 
          height: ${isSelected ? '44px' : '36px'}; 
          background-color: ${pinColor};
          border: ${isSelected ? '3px solid #FFFFFF' : '2px solid #FFFFFF'};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease-out;
        ">
          <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; transform: rotate(45deg);">
            ${iconSvg}
          </svg>
        </div>
        <div style="
          margin-top: 2px;
          background: rgba(15, 23, 42, 0.9);
          color: #FFFFFF;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 3px;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.4);
          pointer-events: none;
          letter-spacing: 0.5px;
        ">
          ${well.name.split(' ')[0]}
        </div>
      </div>
    `;

    return L.divIcon({
      className: 'custom-map-pin',
      html,
      iconSize: [32, 44],
      iconAnchor: [16, 40],
    });
  };

  // Initialize Map over Oil India Limited Baghewala PML Field
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Oil India Limited Baghewala Petroleum Mining Lease Center
    const baghewalaCenter: [number, number] = [27.7445, 71.9590];

    const map = L.map(mapContainerRef.current, {
      center: baghewalaCenter,
      zoom: 14,
      minZoom: 11,
      maxZoom: 19,
      zoomControl: false,
    });

    // Google Hybrid Layer (Real Satellite + Roads & Infrastructure)
    const googleHybridLayer = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      {
        attribution: '&copy; Google Satellite Imagery · Oil India Limited',
        maxZoom: 20,
      }
    );

    googleHybridLayer.addTo(map);
    tileLayerRef.current = googleHybridLayer;
    mapRef.current = map;

    // Pipeline Gathering Network connecting each wellhead to Baghewala GGS
    const ggsLocation: [number, number] = [27.7445, 71.9590];
    BAGHEWALA_MAP_WELLS.forEach((well) => {
      const isCritical = well.status === 'Critical';
      const isAttention = well.status === 'Attention';
      const lineColor = isCritical ? '#EF4444' : isAttention ? '#F59E0B' : '#0284C7';

      L.polyline([ggsLocation, [well.lat, well.lng]], {
        color: lineColor,
        weight: isCritical ? 2.5 : 1.5,
        opacity: 0.7,
        dashArray: isCritical ? '4, 4' : undefined,
      }).addTo(map);
    });

    // Central Gathering Station (GGS) Operational Hub Marker
    const ggsIcon = L.divIcon({
      className: 'ggs-station-pin',
      html: `
        <div style="
          background: #0F172A;
          color: #38BDF8;
          border: 2px solid #38BDF8;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 800;
          box-shadow: 0 3px 8px rgba(0,0,0,0.6);
          white-space: nowrap;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          <span style="color: #F59E0B;">★</span> OIL GGS BAGHEWALA
        </div>
      `,
      iconSize: [140, 26],
      iconAnchor: [70, 13],
    });
    L.marker(ggsLocation, { icon: ggsIcon }).addTo(map);

    // Invalidate size on initial mount and on window resize
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Switch Tile Layer: Google Hybrid vs Esri World Imagery vs Carto Terrain
  const switchLayer = (layerType: 'google' | 'esri' | 'terrain') => {
    if (!mapRef.current || !tileLayerRef.current) return;
    mapRef.current.removeLayer(tileLayerRef.current);

    if (layerType === 'google') {
      tileLayerRef.current = L.tileLayer(
        'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        { attribution: '&copy; Google Satellite · Oil India Ltd', maxZoom: 20 }
      ).addTo(mapRef.current);
    } else if (layerType === 'esri') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: '&copy; Esri World Imagery', maxZoom: 19 }
      ).addTo(mapRef.current);
    } else {
      tileLayerRef.current = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19 }
      ).addTo(mapRef.current);
    }
    setActiveLayer(layerType);
  };

  // Render & update markers when filter or selected well changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear previous markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const visibleWells = BAGHEWALA_MAP_WELLS.filter(
      w => statusFilter === 'ALL' || w.status === statusFilter
    );

    visibleWells.forEach((well) => {
      const isSelected = activeWell?.id === well.id;
      const marker = L.marker([well.lat, well.lng], {
        icon: createPinIcon(well, isSelected),
        zIndexOffset: isSelected ? 1000 : 100,
      }).addTo(mapRef.current!);

      marker.on('click', () => {
        setActiveWell(well);
        mapRef.current?.flyTo([well.lat, well.lng], 15, { duration: 0.8 });
        if (onSelectWell) onSelectWell(well);
      });

      // Bind rich popup with real heavy oil telemetry
      marker.bindPopup(`
        <div style="font-family: 'Inter', system-ui, sans-serif; font-size: 12px; color: #0F172A; min-width: 190px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin-bottom: 6px;">
            <strong style="font-size: 14px; color: #0F172A;">${well.name}</strong>
            <span style="
              background: ${well.status === 'Critical' ? '#FEF2F2' : well.status === 'Attention' ? '#FEFCE8' : '#F0FDF4'};
              color: ${well.status === 'Critical' ? '#DC2626' : well.status === 'Attention' ? '#CA8A04' : '#16A34A'};
              font-weight: 700;
              font-size: 10px;
              padding: 1px 6px;
              border-radius: 4px;
            ">${well.status}</span>
          </div>
          <div style="color: #64748B; font-size: 10px; margin-bottom: 6px;">
            ${well.formation} · ${well.depthMeters} m MD
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px;">
            <div><span style="color: #64748B; font-size: 10px;">Net Oil:</span><br/><strong>${well.oilProduction} BOPD</strong></div>
            <div><span style="color: #64748B; font-size: 10px;">SOR:</span><br/><strong>${well.sor}</strong></div>
            <div><span style="color: #64748B; font-size: 10px;">Rod Load:</span><br/><strong style="color: ${well.rodLoad > 6.0 ? '#DC2626' : '#0F172A'}">${well.rodLoad} kN</strong></div>
            <div><span style="color: #64748B; font-size: 10px;">Temp:</span><br/><strong>${well.temperature} °C</strong></div>
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px; padding: 4px; font-size: 10px; color: #475569; margin-bottom: 8px;">
            Cycle: <strong>${well.cssCycle}</strong> | Gravity: <strong>${well.apiGravity}° API</strong>
          </div>
          <a href="/app/wells/${well.id}" style="
            display: block;
            text-align: center;
            background: #D32F2F;
            color: #FFFFFF;
            padding: 5px 8px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 11px;
            text-decoration: none;
          ">View Digital Twin →</a>
        </div>
      `, { offset: [0, -32] });

      markersRef.current.push(marker);
    });
  }, [statusFilter, activeWell, onSelectWell]);

  // Zoom helpers
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleReset = () => mapRef.current?.flyTo([27.7445, 71.9590], 14, { duration: 0.8 });

  const normalCount = BAGHEWALA_MAP_WELLS.filter(w => w.status === 'Normal').length;
  const attentionCount = BAGHEWALA_MAP_WELLS.filter(w => w.status === 'Attention').length;
  const criticalCount = BAGHEWALA_MAP_WELLS.filter(w => w.status === 'Critical').length;

  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs overflow-hidden flex flex-col">
      {/* ── Card Header (Exact Match to Screenshot 1) ───────────── */}
      <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <h3 className="text-[16px] font-bold text-[#0F172A] tracking-tight">
            Field Map - Baghewala
          </h3>
          <span className="text-[11px] font-medium text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded">
            23 Heavy Oil Wells
          </span>
        </div>

        {/* Real Satellite View Switcher */}
        <div className="flex items-center gap-1 bg-[#F1F5F9] p-0.5 rounded border border-[#E2E8F0]">
          <button
            onClick={() => switchLayer('google')}
            className={`px-2 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
              activeLayer === 'google'
                ? 'bg-white text-[#0F172A] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
            title="Google Satellite with Roads & Labels"
          >
            Google Hybrid
          </button>
          <button
            onClick={() => switchLayer('esri')}
            className={`px-2 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
              activeLayer === 'esri'
                ? 'bg-white text-[#0F172A] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
            title="Esri World Imagery Aerial"
          >
            Esri Aerial
          </button>
          <button
            onClick={() => switchLayer('terrain')}
            className={`px-2 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
              activeLayer === 'terrain'
                ? 'bg-white text-[#0F172A] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
            title="Topographic Street Base"
          >
            Terrain
          </button>
        </div>
      </div>

      {/* ── Real Satellite Map Container ───────────────────────── */}
      <div className="relative w-full h-[480px] bg-[#1E293B]">
        {/* Leaflet DOM Anchor */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Top-Left Original Legend Box (Matches Screenshot 1 Overlay) */}
        <div className="absolute top-3 left-3 z-[1000] bg-black/75 backdrop-blur-md px-3 py-2 rounded-lg border border-white/20 text-white text-[11px] pointer-events-none shadow-lg">
          <div className="font-extrabold tracking-wide text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] inline-block animate-pulse" />
            OIL INDIA LIMITED · BAGHEWALA PML
          </div>
          <div className="text-[10px] text-gray-300 mt-0.5">
            27°44'35" N, 71°57'42" E · Bikaner-Nagaur Basin, Rajasthan
          </div>
          <div className="text-[9px] text-[#38BDF8] mt-0.5 font-semibold">
            Jodhpur Sandstone (CSS + SRP Operations) · Elevation: 142 m
          </div>
        </div>

        {/* Floating Zoom & Reset Controls */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5">
          <button
            onClick={handleZoomIn}
            className="w-7 h-7 bg-white/95 hover:bg-white text-[#0F172A] rounded shadow-md flex items-center justify-center transition-colors cursor-pointer border border-[#CBD5E1]"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-7 h-7 bg-white/95 hover:bg-white text-[#0F172A] rounded shadow-md flex items-center justify-center transition-colors cursor-pointer border border-[#CBD5E1]"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="w-7 h-7 bg-white/95 hover:bg-white text-[#0F172A] rounded shadow-md flex items-center justify-center transition-colors cursor-pointer border border-[#CBD5E1]"
            title="Reset to Field Center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Selected Well Floating Quick Card */}
        {activeWell && (
          <div className="absolute bottom-3 right-3 z-[1000] bg-white/95 backdrop-blur-md p-3.5 rounded-lg border border-[#CBD5E1] shadow-xl text-[12px] max-w-[230px]">
            <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0] pb-1.5 mb-1.5">
              <span className="font-black text-[#0F172A] text-[13px]">{activeWell.name}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                activeWell.status === 'Critical' ? 'bg-[#FEF2F2] text-[#DC2626]' :
                activeWell.status === 'Attention' ? 'bg-[#FEFCE8] text-[#CA8A04]' :
                'bg-[#F0FDF4] text-[#16A34A]'
              }`}>
                {activeWell.status}
              </span>
            </div>
            
            <div className="space-y-1 text-[#475569]">
              <div className="flex justify-between">
                <span>Net Oil Rate:</span>
                <strong className="text-[#0F172A]">{activeWell.oilProduction} BOPD</strong>
              </div>
              <div className="flex justify-between">
                <span>Steam-to-Oil (SOR):</span>
                <strong className="text-[#0F172A]">{activeWell.sor}</strong>
              </div>
              <div className="flex justify-between">
                <span>Rod String Load:</span>
                <strong className={activeWell.rodLoad > 6.0 ? 'text-[#DC2626]' : 'text-[#0F172A]'}>
                  {activeWell.rodLoad} kN
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Formation Temp:</span>
                <strong className="text-[#0F172A]">{activeWell.temperature} °C</strong>
              </div>
              <div className="flex justify-between text-[11px] text-[#64748B]">
                <span>Depth / Gravity:</span>
                <span>{activeWell.depthMeters}m · {activeWell.apiGravity}°</span>
              </div>
            </div>

            <button
              onClick={() => navigate(`/app/wells/${activeWell.id}`)}
              className="mt-2.5 w-full py-1.5 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>View Digital Twin</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* ── Status Legend (Screenshot 1 Exact Match) ─────────────── */}
      <div className="px-5 py-3 bg-white border-t border-[#E2E8F0] flex items-center justify-between text-[13px]">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setStatusFilter(statusFilter === 'Normal' ? 'ALL' : 'Normal')}
            className={`flex items-center gap-2 cursor-pointer transition-opacity ${
              statusFilter !== 'ALL' && statusFilter !== 'Normal' ? 'opacity-40' : 'opacity-100'
            }`}
          >
            <span className="w-3 h-3 rounded-full bg-[#16A34A] inline-block shadow-xs" />
            <span className="font-semibold text-[#334155]">Normal</span>
            <span className="text-[11px] text-[#64748B]">({normalCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'Attention' ? 'ALL' : 'Attention')}
            className={`flex items-center gap-2 cursor-pointer transition-opacity ${
              statusFilter !== 'ALL' && statusFilter !== 'Attention' ? 'opacity-40' : 'opacity-100'
            }`}
          >
            <span className="w-3 h-3 rounded-full bg-[#EAB308] inline-block shadow-xs" />
            <span className="font-semibold text-[#334155]">Attention</span>
            <span className="text-[11px] text-[#64748B]">({attentionCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'Critical' ? 'ALL' : 'Critical')}
            className={`flex items-center gap-2 cursor-pointer transition-opacity ${
              statusFilter !== 'ALL' && statusFilter !== 'Critical' ? 'opacity-40' : 'opacity-100'
            }`}
          >
            <span className="w-3 h-3 rounded-full bg-[#DC2626] inline-block shadow-xs" />
            <span className="font-semibold text-[#334155]">Critical</span>
            <span className="text-[11px] text-[#64748B]">({criticalCount})</span>
          </button>
        </div>

        {statusFilter !== 'ALL' && (
          <button
            onClick={() => setStatusFilter('ALL')}
            className="text-[11px] font-bold text-[#D32F2F] hover:underline cursor-pointer"
          >
            Reset Filter
          </button>
        )}
      </div>
    </div>
  );
};
