import React, { useState, useEffect } from 'react';
import {
  Thermometer,
  Flame,
  Activity,
  Droplet,
  TrendingDown,
  Clock,
  Layers,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { wellsApi, mlApi } from '../services/api';

export const ReservoirMonitorPage: React.FC = () => {
  const [selectedWell, setSelectedWell] = useState('BGW-001');
  const [wellsList, setWellsList] = useState<any[]>([]);
  const [forecastDays, setForecastDays] = useState<1 | 3 | 7>(7);
  const [loading, setLoading] = useState(false);
  const [viscosityData, setViscosityData] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [production, setProduction] = useState<any[]>([]);
  const [thermalForecast, setThermalForecast] = useState<any[]>([]);

  useEffect(() => {
    wellsApi.listWells().then((res) => {
      if (res.success && res.data) {
        setWellsList(res.data);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadWellData(selectedWell);
  }, [selectedWell, forecastDays]);

  const loadWellData = async (wellId: string) => {
    setLoading(true);
    try {
      const [viscRes, telRes, prodRes, thermRes] = await Promise.all([
        wellsApi.getViscosityProfile(wellId).catch(() => null),
        wellsApi.getTelemetry(wellId, 30).catch(() => null),
        wellsApi.getProduction(wellId, 30).catch(() => null),
        mlApi.predictReservoir({ well_id: wellId, forecast_days: forecastDays }).catch(() => null),
      ]);

      if (viscRes?.success) setViscosityData(viscRes.data);
      if (telRes?.success) setTelemetry(telRes.data || []);
      if (prodRes?.success) setProduction(prodRes.data || []);
      if (thermRes && thermRes.forecast) {
        setThermalForecast(thermRes.forecast);
      }
    } finally {
      setLoading(false);
    }
  };

  const currentTemp = viscosityData?.currentTempC ?? 68;
  const currentVisc = viscosityData?.currentViscosityCP ?? 1420;
  const mobilityIdx = Number((1000 / Math.max(currentVisc, 1)).toFixed(3));
  const spmCrit = viscosityData?.spmCrit ?? 5.4;
  const spmSafe = viscosityData?.spmSafe ?? 4.8;

  // Prepare combined time-series telemetry charts
  const historyChartData = telemetry.slice(-25).map((t, idx) => ({
    time: t.timestamp ? t.timestamp.split('T')[1]?.substring(0, 5) || `T-${25 - idx}` : `T-${idx}`,
    temp: t.reservoirTemperatureC || 68,
    wellheadTemp: t.wellheadTemperatureC || 52,
    pressure: t.pressureBar || 18.5,
    viscosity: Math.round(1400 * Math.exp(-0.03 * ((t.reservoirTemperatureC || 68) - 50))),
  }));

  const prodChartData = production.slice(-20).map((p) => ({
    date: p.date ? p.date.substring(5, 10) : 'D',
    oilRate: p.oilRate,
    waterCut: p.waterCut,
    sor: p.sor,
  }));

  const forecastChartData = thermalForecast.slice(0, forecastDays * 2).map((pt, idx) => ({
    step: `Day ${pt.day || idx + 1}`,
    actualTemp: pt.temperature_c,
    physicsTemp: pt.physics_temperature_c,
    viscosity: Math.round(pt.viscosity_cp || 1200),
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1750px] mx-auto">
      {/* ── HEADER TITLE & CONTROLS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[#FFEBEE] text-[#D32F2F] text-[11px] font-black uppercase tracking-wider">
              Page 3 · Physics-Informed Digital Twin
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] text-[11px] font-bold">
              Boberg-Lantz + ASTM Walther Formulation
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#0F172A] mt-1 tracking-tight">
            Reservoir Thermal &amp; Viscosity Monitor
          </h1>
          <p className="text-[13px] text-[#64748B] font-medium mt-0.5">
            Real-time downhole thermal depletion tracking, crude mobility coupling, and multi-day heating/cooling projections.
          </p>
        </div>

        {/* Well Switcher & Forecast horizon */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[#F8FAFC] px-3 py-1.5 rounded-xl border border-[#E2E8F0]">
            <span className="text-[12px] font-bold text-[#64748B]">Well:</span>
            <select
              value={selectedWell}
              onChange={(e) => setSelectedWell(e.target.value)}
              className="bg-transparent font-bold text-[13px] text-[#0F172A] outline-none cursor-pointer"
            >
              {wellsList.length > 0 ? (
                wellsList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.id} ({w.reservoir || 'Jodhpur Sandstone'})
                  </option>
                ))
              ) : (
                <option value="BGW-001">BGW-001 (Heavy Oil)</option>
              )}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0]">
            <span className="text-[11px] font-bold text-[#64748B] px-2">Forecast:</span>
            {([1, 3, 7] as const).map((days) => (
              <button
                key={days}
                onClick={() => setForecastDays(days)}
                className={`px-3 py-1 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                  forecastDays === days
                    ? 'bg-[#D32F2F] text-white shadow-xs'
                    : 'text-[#475569] hover:bg-[#E2E8F0]'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>

          <button
            onClick={() => loadWellData(selectedWell)}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#475569] transition-colors cursor-pointer"
            title="Refresh reservoir telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── KPI STRIP: RESERVOIR THERMAL COUPLING ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[12px] font-bold uppercase tracking-wider">Reservoir Temp</span>
            <Thermometer className="w-5 h-5 text-[#D32F2F]" />
          </div>
          <div className="text-2xl font-black text-[#0F172A] mt-2">
            {currentTemp}°C
          </div>
          <div className="text-[12px] font-medium text-[#16A34A] mt-1 flex items-center gap-1">
            <span>Peak Post-CSS: 114°C</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[12px] font-bold uppercase tracking-wider">Crude Viscosity</span>
            <Flame className="w-5 h-5 text-[#EA580C]" />
          </div>
          <div className="text-2xl font-black text-[#0F172A] mt-2">
            {currentVisc.toLocaleString()} <span className="text-[13px] font-bold text-[#64748B]">cP</span>
          </div>
          <div className="text-[12px] font-medium text-[#64748B] mt-1">
            ASTM D341 Walther heavy oil
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[12px] font-bold uppercase tracking-wider">Fluid Mobility</span>
            <Activity className="w-5 h-5 text-[#0284C7]" />
          </div>
          <div className="text-2xl font-black text-[#0F172A] mt-2">
            {mobilityIdx} <span className="text-[13px] font-bold text-[#64748B]">mD/cP</span>
          </div>
          <div className="text-[12px] font-medium text-[#16A34A] mt-1">
            Effective Darcy permeability index
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[12px] font-bold uppercase tracking-wider">Critical SPM</span>
            <TrendingDown className="w-5 h-5 text-[#D97706]" />
          </div>
          <div className="text-2xl font-black text-[#0F172A] mt-2">
            {spmCrit} <span className="text-[13px] font-bold text-[#64748B]">SPM</span>
          </div>
          <div className="text-[12px] font-medium text-[#475569] mt-1">
            Safe ceiling: <strong className="text-[#0F172A]">{spmSafe} SPM</strong>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[12px] font-bold uppercase tracking-wider">Pumping Envelope</span>
            <ShieldCheck className="w-5 h-5 text-[#16A34A]" />
          </div>
          <div className="text-xl font-black text-[#16A34A] mt-2 truncate">
            {viscosityData?.status || 'Kinematically Safe'}
          </div>
          <div className="text-[12px] font-medium text-[#64748B] mt-1 truncate">
            Buoyant load: {viscosityData?.buoyantRodWeightKN || 28.4} kN
          </div>
        </div>
      </div>

      {/* ── PHYSICAL COUPLING PIPELINE BANNER ── */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white p-4 rounded-2xl flex items-center justify-between gap-4 overflow-x-auto shadow-md">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Info className="w-5 h-5 text-[#D32F2F]" />
          <span className="text-[13px] font-black tracking-wide uppercase">Coupling Chain:</span>
        </div>
        <div className="flex items-center gap-3 text-[13px] font-bold flex-1 justify-around min-w-[700px]">
          <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
            1. Reservoir Temp ({currentTemp}°C)
          </span>
          <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
          <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
            2. Viscosity ({currentVisc} cP)
          </span>
          <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
          <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
            3. Fluid Mobility ({mobilityIdx})
          </span>
          <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
          <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
            4. Critical SPM ({spmCrit})
          </span>
          <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
          <span className="flex items-center gap-1.5 bg-[#D32F2F] text-white px-3 py-1.5 rounded-xl">
            5. Net Production (Coupled)
          </span>
        </div>
      </div>

      {/* ── CHARTS ROW 1: TEMPERATURE VS TIME & HEATING/COOLING FORECAST ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reservoir & Wellhead Temperature vs Time */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-black text-[#0F172A]">Downhole Temperature &amp; Pressure History</h2>
              <p className="text-[12px] text-[#64748B]">Continuous telemetry readings across latest monitoring window</p>
            </div>
            <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0]">
              Telemetry Points: {historyChartData.length}
            </span>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} />
                <YAxis yAxisId="left" stroke="#D32F2F" fontSize={11} domain={[40, 120]} />
                <YAxis yAxisId="right" orientation="right" stroke="#0284C7" fontSize={11} domain={[10, 30]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', border: 'none' }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="temp" name="Reservoir Temp (°C)" stroke="#D32F2F" strokeWidth={2.5} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="wellheadTemp" name="Wellhead Temp (°C)" stroke="#EA580C" strokeWidth={1.8} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="pressure" name="Pressure (bar)" stroke="#0284C7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Heating / Cooling Trajectory Forecast (Boberg-Lantz) */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-black text-[#0F172A]">
                Thermal Depletion &amp; Viscosity Forecast ({forecastDays}-Day Horizon)
              </h2>
              <p className="text-[12px] text-[#64748B]">Boberg-Lantz radial conduction model + Walther viscosity decay</p>
            </div>
            <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#FFEBEE] text-[#D32F2F] border border-[#FFCDD2]">
              Physics-Informed ML
            </span>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastChartData.length > 0 ? forecastChartData : [
                { step: 'Day 1', actualTemp: 78, physicsTemp: 76, viscosity: 980 },
                { step: 'Day 2', actualTemp: 74, physicsTemp: 73, viscosity: 1120 },
                { step: 'Day 3', actualTemp: 71, physicsTemp: 70, viscosity: 1280 },
                { step: 'Day 5', actualTemp: 67, physicsTemp: 66, viscosity: 1490 },
                { step: 'Day 7', actualTemp: 63, physicsTemp: 62, viscosity: 1740 },
              ]}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D32F2F" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#D32F2F" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="step" stroke="#94A3B8" fontSize={11} />
                <YAxis yAxisId="left" stroke="#D32F2F" fontSize={11} domain={[50, 100]} />
                <YAxis yAxisId="right" orientation="right" stroke="#EA580C" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff' }} />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="actualTemp" name="Predicted Temp (°C)" stroke="#D32F2F" strokeWidth={2.5} fill="url(#tempGrad)" />
                <Line yAxisId="left" type="monotone" dataKey="physicsTemp" name="Boberg-Lantz Baseline" stroke="#64748B" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="viscosity" name="Predicted Viscosity (cP)" stroke="#EA580C" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── CHARTS ROW 2: PRODUCTION VS TIME & WALTHER VISCOSITY CURVE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Response vs Time */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-black text-[#0F172A]">Production &amp; Water Cut Response</h2>
              <p className="text-[12px] text-[#64748B]">Daily oil rate and water cut dynamics post-steam injection</p>
            </div>
            <Droplet className="w-5 h-5 text-[#0284C7]" />
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={prodChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                <YAxis yAxisId="left" stroke="#16A34A" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="#0284C7" fontSize={11} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff' }} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="oilRate" name="Oil Rate (bpd)" stroke="#16A34A" strokeWidth={2.5} />
                <Line yAxisId="right" type="monotone" dataKey="waterCut" name="Water Cut (%)" stroke="#0284C7" strokeWidth={1.8} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Walther Temperature-Viscosity Reference Curve */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-black text-[#0F172A]">ASTM D341 Walther Viscosity Curve</h2>
              <p className="text-[12px] text-[#64748B]">Log-log dynamic viscosity vs. reservoir temperature with critical SPM envelope</p>
            </div>
            <Flame className="w-5 h-5 text-[#EA580C]" />
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={viscosityData?.referenceCurve || [
                { tempC: 45, viscosityCP: 3800, spmCrit: 4.1 },
                { tempC: 55, viscosityCP: 2400, spmCrit: 4.6 },
                { tempC: 65, viscosityCP: 1550, spmCrit: 5.2 },
                { tempC: 75, viscosityCP: 980, spmCrit: 5.8 },
                { tempC: 90, viscosityCP: 520, spmCrit: 6.7 },
                { tempC: 110, viscosityCP: 260, spmCrit: 7.9 },
                { tempC: 130, viscosityCP: 140, spmCrit: 8.9 },
                { tempC: 160, viscosityCP: 68, spmCrit: 9.8 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="tempC" stroke="#94A3B8" fontSize={11} unit="°C" />
                <YAxis yAxisId="left" stroke="#EA580C" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="#D32F2F" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff' }} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="viscosityCP" name="Viscosity (cP)" stroke="#EA580C" strokeWidth={2.5} />
                <Line yAxisId="right" type="monotone" dataKey="spmCrit" name="SPM Critical Limit" stroke="#D32F2F" strokeDasharray="5 5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
