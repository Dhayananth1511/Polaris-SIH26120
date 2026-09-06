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
// Center: 27°46'16" N, 71°38'37" E (27.7711° N, 71.6436° E)
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
    lat: 27.7761, 
    lng: 71.6534 
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
    lat: 27.7644, 
    lng: 71.6331 
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
    lat: 27.7828, 
    lng: 71.6488 
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
    lat: 27.7731, 
    lng: 71.6411 
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
    lat: 27.7601, 
    lng: 71.6266 
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
    lat: 27.7661, 
    lng: 71.6356 
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
    lat: 27.7776, 
    lng: 71.6386 
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
    lat: 27.7711, 
    lng: 71.6561 
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
    lat: 27.7606, 
    lng: 71.6426 
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
    lat: 27.7846, 
    lng: 71.6416 
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
    lat: 27.7676, 
    lng: 71.6626 
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
    lat: 27.7686, 
    lng: 71.6381 
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
    lat: 27.7581, 
    lng: 71.6536 
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
    lat: 27.7801, 
    lng: 71.6286 
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
    lat: 27.7751, 
    lng: 71.6596 
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
    lat: 27.7646, 
    lng: 71.6481 
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
    lat: 27.7836, 
    lng: 71.6341 
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
    lat: 27.7721, 
    lng: 71.6356 
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
    lat: 27.7566, 
    lng: 71.6376 
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
    lat: 27.7806, 
    lng: 71.6556 
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
    lat: 27.7736, 
    lng: 71.6226 
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
    lat: 27.7586, 
    lng: 71.6476 
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
    lat: 27.7791, 
    lng: 71.6506 
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

  // Clean circle marker — professional GIS style
  const createPinIcon = (well: FieldWell, isSelected: boolean) => {
    const colors: Record<string, { fill: string; ring: string; text: string }> = {
      Critical:  { fill: '#EF4444', ring: 'rgba(239,68,68,0.35)',  text: '#EF4444' },
      Attention: { fill: '#F59E0B', ring: 'rgba(245,158,11,0.30)', text: '#B45309' },
      Normal:    { fill: '#22C55E', ring: 'rgba(34,197,94,0.25)',  text: '#15803D' },
    };
    const c = colors[well.status] ?? colors.Normal;

    const size   = isSelected ? 14 : 10;
    const total  = size + 8;          // ring padding
    const pulse  = well.status === 'Critical'
      ? `<div style="position:absolute;inset:-5px;border-radius:50%;border:2px solid ${c.fill};opacity:0.5;animation:ping 1.4s cubic-bezier(0,0,0.2,1) infinite;"></div>`
      : '';

    const label = well.id; // e.g. "BGW-014"

    const html = `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
        ${pulse}
        <div style="
          width:${total}px;height:${total}px;
          border-radius:50%;
          background:${c.ring};
          display:flex;align-items:center;justify-content:center;
        ">
          <div style="
            width:${size}px;height:${size}px;
            border-radius:50%;
            background:${c.fill};
            border:2px solid #fff;
            box-shadow:0 1px 4px rgba(0,0,0,0.45);
          "></div>
        </div>
        <div style="
          margin-top:1px;
          font-family:'Inter',system-ui,sans-serif;
          font-size:9px;font-weight:700;
          color:#fff;
          background:rgba(15,23,42,0.72);
          padding:1px 4px;
          border-radius:3px;
          white-space:nowrap;
          letter-spacing:0.3px;
          pointer-events:none;
          backdrop-filter:blur(2px);
        ">${label}</div>
      </div>`;

    return L.divIcon({
      className: '',
      html,
      iconSize:   [total, total + 16],
      iconAnchor: [total / 2, total / 2],
    });
  };

  // Initialize Map over Oil India Limited Baghewala PML Field
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Oil India Limited Baghewala Petroleum Mining Lease Center (Jaisalmer District, Rajasthan)
    const baghewalaCenter: [number, number] = [27.7711, 71.6436];

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

    // Pipeline gathering lines — thin, uniform, subtle
    const ggsLocation: [number, number] = [27.7711, 71.6436];
    BAGHEWALA_MAP_WELLS.forEach((well) => {
      L.polyline([ggsLocation, [well.lat, well.lng]], {
        color: '#64748B',
        weight: 0.8,
        opacity: 0.30,
        dashArray: '3, 5',
      }).addTo(map);
    });

    // GGS centre — minimal crosshair dot
    const ggsIcon = L.divIcon({
      className: '',
      html: `
        <div style="
          width:12px; height:12px;
          border-radius:50%;
          background:#F8FAFC;
          border:2px solid #64748B;
          box-shadow:0 0 0 3px rgba(100,116,139,0.20);
        "></div>`,
      iconSize:   [12, 12],
      iconAnchor: [6, 6],
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
          <a href="/app/digital-twin?well=${well.id}" style="
            display:block;
            text-align:center;
            background:#D32F2F;
            color:#FFFFFF;
            padding:5px 8px;
            border-radius:4px;
            font-weight:700;
            font-size:11px;
            text-decoration:none;
            margin-top:4px;
          ">View Digital Twin →</a>
        </div>
      `, { offset: [0, -10] });

      markersRef.current.push(marker);
    });
  }, [statusFilter, activeWell, onSelectWell]);

  // Zoom helpers
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleReset = () => mapRef.current?.flyTo([27.7711, 71.6436], 14, { duration: 0.8 });

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
            27°46'16" N, 71°38'37" E · Jaisalmer District, Rajasthan
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
