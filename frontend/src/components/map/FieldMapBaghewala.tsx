import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, ZoomIn, ZoomOut, RotateCcw, ExternalLink, Activity, Thermometer, ShieldAlert, Compass, MapPin } from 'lucide-react';
import { wellsApi } from '../../services/api';
import { useReplayStore } from '../../store/replayStore';

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
  { 
    id: 'BGW-001', 
    name: 'BGW-001 (Discovery)', 
    status: 'Normal', 
    oilProduction: 28.5, 
    sor: 3.2, 
    temperature: 66.1, 
    rodLoad: 4.8, 
    pumpEfficiency: 78, 
    failureRisk: 'LOW (0.08)', 
    formation: 'Jodhpur Sandstone', 
    depthMeters: 1109.6, 
    apiGravity: 18.7, 
    cssCycle: 'Cycle 04 (Production)', 
    lat: 26.9961, 
    lng: 71.59178 
  },
  { 
    id: 'BGW-002', 
    name: 'BGW-002', 
    status: 'Normal', 
    oilProduction: 24.1, 
    sor: 3.5, 
    temperature: 58.5, 
    rodLoad: 5.1, 
    pumpEfficiency: 74, 
    failureRisk: 'LOW (0.12)', 
    formation: 'Jodhpur Sandstone', 
    depthMeters: 1114.4, 
    apiGravity: 17.9, 
    cssCycle: 'Cycle 04 (Production)', 
    lat: 26.94302, 
    lng: 71.60164 
  },
  { 
    id: 'BGW-003', 
    name: 'BGW-003', 
    status: 'Attention', 
    oilProduction: 21.3, 
    sor: 4.1, 
    temperature: 56.6, 
    rodLoad: 6.3, 
    pumpEfficiency: 62, 
    failureRisk: 'MEDIUM (0.45)', 
    formation: 'Jodhpur Sandstone', 
    depthMeters: 977.4, 
    apiGravity: 18.1, 
    cssCycle: 'Cycle 04 (Production)', 
    lat: 26.94107, 
    lng: 71.59129 
  },
  { 
    id: 'BGW-004', 
    name: 'BGW-004', 
    status: 'Normal', 
    oilProduction: 31.0, 
    sor: 3.0, 
    temperature: 43.9, 
    rodLoad: 4.2, 
    pumpEfficiency: 81, 
    failureRisk: 'LOW (0.06)', 
    formation: 'Jodhpur Sandstone', 
    depthMeters: 941.8, 
    apiGravity: 18.8, 
    cssCycle: 'Cycle 03 (Production)', 
    lat: 26.91468, 
    lng: 71.47701 
  },
  { 
    id: 'BGW-005', 
    name: 'BGW-005', 
    status: 'Normal', 
    oilProduction: 22.8, 
    sor: 3.6, 
    temperature: 46.8, 
    rodLoad: 4.7, 
    pumpEfficiency: 76, 
    failureRisk: 'LOW (0.10)', 
    formation: 'Jodhpur Sandstone', 
    depthMeters: 980.2, 
    apiGravity: 17.6, 
    cssCycle: 'Cycle 03 (Production)', 
    lat: 26.91438, 
    lng: 71.44287 
  },
  { 
    id: 'BGW-006', 
    name: 'BGW-006', 
    status: 'Normal', 
    oilProduction: 26.4, 
    sor: 3.3, 
    temperature: 59.2, 
    rodLoad: 5.4, 
    pumpEfficiency: 79, 
    failureRisk: 'LOW (0.09)', 
    formation: 'Jodhpur Sandstone', 
    depthMeters: 994.5, 
    apiGravity: 18.3, 
    cssCycle: 'Cycle 03 (Production)', 
    lat: 26.92484, 
    lng: 71.55998 
  },
  { 
    id: 'BGW-007', 
    name: 'BGW-007 (Critical Risk)', 
    status: 'Critical', 
    oilProduction: 8.4, 
    sor: 7.8, 
    temperature: 41.5, 
    rodLoad: 8.9, 
    pumpEfficiency: 38, 
    failureRisk: 'HIGH (0.84)', 
    formation: 'Jodhpur Sandstone', 
    depthMeters: 955.0, 
    apiGravity: 16.8, 
    cssCycle: 'Cycle 02 (Thermal Depletion)', 
    lat: 26.89279, 
    lng: 71.51688 
  },
  { 
    id: 'BGW-008', 
    name: 'BGW-008', 
    status: 'Normal', 
    oilProduction: 27.2, 
    sor: 3.4, 
    temperature: 61.0, 
    rodLoad: 4.9, 
    pumpEfficiency: 82, 
    failureRisk: 'LOW (0.07)', 
    formation: 'Jodhpur Sandstone', 
    depthMeters: 855.2, 
    apiGravity: 18.5, 
    cssCycle: 'Cycle 04 (Production)', 
    lat: 26.96001, 
    lng: 71.54712 
  },
];

interface FieldMapProps {
  onSelectWell?: (well: FieldWell) => void;
  selectedWellId?: string;
}

export const FieldMapBaghewala: React.FC<FieldMapProps> = ({ onSelectWell, selectedWellId = 'BGW-001' }) => {
  const navigate = useNavigate();
  const { allWellsReadings } = useReplayStore();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [wellsList, setWellsList] = useState<FieldWell[]>(BAGHEWALA_MAP_WELLS);
  const [activeWell, setActiveWell] = useState<FieldWell | null>(
    BAGHEWALA_MAP_WELLS.find(w => w.id === selectedWellId) || BAGHEWALA_MAP_WELLS[0]
  );
  const [activeLayer, setActiveLayer] = useState<'google' | 'esri' | 'terrain'>('google');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Normal' | 'Attention' | 'Critical'>('ALL');

  // Fetch live wells from DB
  useEffect(() => {
    wellsApi.listWells().then(res => {
      if (res.success && res.data.length > 0) {
        const live: FieldWell[] = res.data.map(w => ({
          id: w.id,
          name: w.name,
          status: w.status === 'Critical' ? 'Critical' : w.status === 'Attention' ? 'Attention' : 'Normal',
          oilProduction: w.oilProduction,
          sor: w.sor,
          temperature: w.temperature,
          rodLoad: w.rodLoad,
          pumpEfficiency: w.pumpEfficiency,
          failureRisk: `${w.failureRisk.toUpperCase()} (${w.failureRiskScore.toFixed(2)})`,
          formation: w.reservoir || 'Jodhpur Sandstone',
          depthMeters: w.wellDepthM || w.pumpDepth || 1000,
          apiGravity: w.oilApi || 18.0,
          cssCycle: w.cssPhase || 'Cycle 01',
          lat: w.latitude,
          lng: w.longitude,
        }));
        setWellsList(live);
        const match = live.find(w => w.id === selectedWellId) || live[0];
        if (match) setActiveWell(match);
      }
    }).catch(err => console.error('Map wells fetch error:', err));
  }, [selectedWellId]);

  // Dynamically overlay replay telemetry onto map wells
  const dynamicWellsList = React.useMemo(() => {
    return wellsList.map(w => {
      const dyn = allWellsReadings[w.id];
      if (!dyn) return w;

      const dynStatus: 'Normal' | 'Attention' | 'Critical' =
        dyn.status === 'Critical' ? 'Critical' :
        dyn.status === 'Attention' ? 'Attention' : 'Normal';

      return {
        ...w,
        status: dynStatus,
        oilProduction: dyn.oilProduction ?? w.oilProduction,
        temperature: dyn.temperature ?? w.temperature,
        rodLoad: dyn.rodLoad ?? w.rodLoad,
        pumpEfficiency: dyn.pumpEfficiency ?? w.pumpEfficiency,
        failureRisk: `${dyn.failureRisk.toUpperCase()} (${dyn.failureRiskScore ? dyn.failureRiskScore.toFixed(2) : '0.15'})`,
        cssCycle: dyn.cssPhase ?? w.cssCycle,
      };
    });
  }, [wellsList, allWellsReadings]);

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

    // Oil India Limited Baghewala PML Center (Jaisalmer District, Rajasthan)
    const baghewalaCenter: [number, number] = [26.94, 71.58];

    const map = L.map(mapContainerRef.current, {
      center: baghewalaCenter,
      zoom: 12,
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

    const visibleWells = dynamicWellsList.filter(
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
            <div><span style="color: #64748B; font-size: 10px;">Rod Load:</span><br/><strong style="color: ${well.rodLoad > 18.0 ? '#DC2626' : '#0F172A'}">${well.rodLoad} kN</strong></div>
            <div><span style="color: #64748B; font-size: 10px;">Temp:</span><br/><strong>${well.temperature} °C</strong></div>
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px; padding: 4px; font-size: 10px; color: #475569; margin-bottom: 8px;">
            Cycle: <strong>${well.cssCycle}</strong> | Risk: <strong>${well.failureRisk}</strong>
          </div>
          <div style="display: flex; gap: 4px; margin-top: 6px;">
            <a href="/app/wells/${well.id}" style="
              flex: 1;
              text-align: center;
              background: #0284C7;
              color: #FFFFFF;
              padding: 5px 6px;
              border-radius: 4px;
              font-weight: 700;
              font-size: 10px;
              text-decoration: none;
            ">View Dossier</a>
            <a href="/app/digital-twin?well=${well.id}" style="
              flex: 1;
              text-align: center;
              background: #D32F2F;
              color: #FFFFFF;
              padding: 5px 6px;
              border-radius: 4px;
              font-weight: 700;
              font-size: 10px;
              text-decoration: none;
            ">Digital Twin</a>
          </div>
        </div>
      `, { offset: [0, -10] });

      markersRef.current.push(marker);
    });
  }, [statusFilter, activeWell, onSelectWell, dynamicWellsList]);

  // Zoom helpers
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleReset = () => mapRef.current?.flyTo([27.7711, 71.6436], 14, { duration: 0.8 });

  const normalCount = dynamicWellsList.filter(w => w.status === 'Normal').length;
  const attentionCount = dynamicWellsList.filter(w => w.status === 'Attention').length;
  const criticalCount = dynamicWellsList.filter(w => w.status === 'Critical').length;

  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs overflow-hidden flex flex-col">
      {/* ── Card Header (Exact Match to Screenshot 1) ───────────── */}
      <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <h3 className="text-[16px] font-bold text-[#0F172A] tracking-tight">
            Field Map - Baghewala
          </h3>
          <span className="text-[11px] font-medium text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded">
            {dynamicWellsList.length} Heavy Oil Wells
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
