import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Box, Activity, Sliders, Zap, CheckCircle2, Play, 
  RotateCcw, Info, ArrowRight, ArrowLeft, Check, Layers, Eye, Maximize2
} from 'lucide-react';
import { DigitalTwin3DCanvas } from '../components/digitaltwin/DigitalTwin3DCanvas';
import { 
  wellsApi, aiApi, replayApi,
  type BackendCSSCycle, type BackendSRPReading, type BackendWell, 
  type PIMLTwinResult, type ReplayReading, type ReplayState 
} from '../services/api';

import { useUIStore } from '../store/uiStore';
import { useReplayStore } from '../store/replayStore';

interface DigitalTwinProps {
  tab?: 'twin' | 'dyno' | 'cycles' | 'piml';
}

export const DigitalTwinPage: React.FC<DigitalTwinProps> = ({ tab = 'twin' }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedWellId, setSelectedWellId } = useUIStore();
  const { replayState } = useReplayStore();
  
  // Prioritize URL param if present, otherwise use global selectedWellId
  const currentWellId = searchParams.get('well') || selectedWellId || 'BGW-001';

  const [wells, setWells] = useState<BackendWell[]>([]);
  const [selectedSubsystem, setSelectedSubsystem] = useState<'reservoir' | 'wellbore' | 'srp' | 'surface'>('reservoir');
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [activeSecondaryTab, setActiveSecondaryTab] = useState<'twin' | 'dyno' | 'cycles' | 'piml'>(
    (tab && (tab as string) !== 'simulation' ? tab : 'twin') as any
  );

  // Real data
  const [twinState, setTwinState] = useState<any>(null);
  const [cssCycles, setCssCycles] = useState<BackendCSSCycle[]>([]);
  const [srpReadings, setSrpReadings] = useState<BackendSRPReading[]>([]);
  const [pimlData, setPimlData] = useState<PIMLTwinResult | null>(null);
  const [pimlLoading, setPimlLoading] = useState(false);

  // Telemetry Simulation Replay Engine Sync State
  const [isReplaySync, setIsReplaySync] = useState<boolean>(true);

  // Keep global store in sync
  useEffect(() => {
    if (currentWellId && currentWellId !== selectedWellId) {
      setSelectedWellId(currentWellId);
    }
  }, [currentWellId, selectedWellId, setSelectedWellId]);

  useEffect(() => {
    wellsApi.listWells().then(res => {
      if (res.success && res.data.length > 0) setWells(res.data);
    }).catch(console.error);
  }, []);

  // Simulation Lab & CSS/SRP Coupled State
  const [simCssSteam, setSimCssSteam] = useState<number>(735);
  const [simCssPressure, setSimCssPressure] = useState<number>(21);
  const [simCssSoak, setSimCssSoak] = useState<number>(64);
  const [simSrpSPM, setSimSrpSPM] = useState<number>(5.1);
  const [simSrpStroke, setSimSrpStroke] = useState<number>(66);
  const [simSrpVFD, setSimSrpVFD] = useState<number>(36);
  const [cssPhase, setCssPhase] = useState<'injection' | 'soak' | 'production'>('production');
  const [simRunning, setSimRunning] = useState<boolean>(false);

  // Replay State Sync Handler
  useEffect(() => {
    if (isReplaySync && replayState?.currentReading) {
      const r = replayState.currentReading;
      if (r.phase) {
        const p = r.phase.toLowerCase();
        if (p === 'injection' || p === 'soak' || p === 'production') {
          setCssPhase(p as 'injection' | 'soak' | 'production');
        }
      }
      if (r.spm !== undefined && r.spm !== null) {
        setSimSrpSPM(r.spm);
      }
      if (r.steamVolumeTon) {
        setSimCssSteam(Math.round(r.steamVolumeTon));
      }
      if (r.steamPressureBar) {
        setSimCssPressure(Math.round(r.steamPressureBar));
      }
      if (r.soakTimeHr) {
        setSimCssSoak(Math.round(r.soakTimeHr));
      }
    }
  }, [isReplaySync, replayState]);

  // Live noise ticker: small random fluctuations every 3s to simulate real sensor data
  const [liveNoise, setLiveNoise] = useState({ spm: 0, temp: 0, pressure: 0, oilRate: 0 });
  useEffect(() => {
    const ticker = setInterval(() => {
      setLiveNoise({
        spm:      (Math.random() - 0.5) * 0.12,
        temp:     (Math.random() - 0.5) * 1.8,
        pressure: (Math.random() - 0.5) * 0.35,
        oilRate:  (Math.random() - 0.5) * 2.1,
      });
    }, 3000);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    setPimlLoading(true);
    Promise.all([
      wellsApi.getTwinState(currentWellId),
      wellsApi.getCSSCycles(currentWellId),
      wellsApi.getSRP(currentWellId, 30),
      aiApi.pimlTwin(currentWellId).catch(() => null),
    ]).then(([twinRes, cssRes, srpRes, pimlRes]) => {
      if (twinRes.success && twinRes.data) {
        setTwinState(twinRes.data);
        const sp = twinRes.data.srp || {};
        const css = twinRes.data.css || {};
        if (!isReplaySync) {
          if (sp.spm) setSimSrpSPM(Number(sp.spm));
          if (sp.strokeLength) setSimSrpStroke(Number(sp.strokeLength));
          if (sp.vfdFrequency) setSimSrpVFD(Number(sp.vfdFrequency));
          if (css.steamVolume) setSimCssSteam(Number(css.steamVolume));
        }
      }
      if (cssRes.success) setCssCycles(cssRes.data);
      if (srpRes.success) setSrpReadings(srpRes.data);
      if (pimlRes?.success && pimlRes.data) setPimlData(pimlRes.data);
    }).catch(err => console.error('DigitalTwin fetch error:', err))
      .finally(() => setPimlLoading(false));
  }, [currentWellId]);

  // Auto-refresh live DB data every 30 seconds (does NOT reset sliders)
  useEffect(() => {
    const autoRefresh = setInterval(() => {
      Promise.all([
        wellsApi.getTwinState(currentWellId),
        wellsApi.getCSSCycles(currentWellId),
        wellsApi.getSRP(currentWellId, 30),
      ]).then(([twinRes, cssRes, srpRes]) => {
        if (twinRes.success && twinRes.data) setTwinState(twinRes.data);
        if (cssRes.success) setCssCycles(cssRes.data);
        if (srpRes.success) setSrpReadings(srpRes.data);
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(autoRefresh);
  }, [currentWellId]);

  const cumulativeSteam = useMemo(() => {
    return cssCycles.reduce((sum, c) => sum + (Number(c.steamVolumeTon) || 0), 0);
  }, [cssCycles]);

  const latestSrp = srpReadings[0];
  const pumpFillage = latestSrp?.pumpFillagePct ?? (twinState?.srp?.pumpFillage || 62);
  const pumpEff = latestSrp?.pumpEfficiencyPct ?? (twinState?.srp?.pumpEfficiency || 78);

  const replayReading = replayState?.currentReading;

  // ── Live Coupled Multi-Physics Solver (CSS Thermal + SRP Kinematics) ───────
  const livePhysics = useMemo(() => {
    // 1. Driven directly by Telemetry Simulation Engine across operational cycles
    if (isReplaySync && replayReading) {
      const tempC = Math.round(replayReading.temperatureC * 10) / 10;
      const viscCp = Math.max(25, Math.min(25000, Math.round(replayReading.viscosityCP)));
      const steamVol = Math.round(replayReading.steamVolumeTon || simCssSteam);
      const radialRadiusM = Math.round(Math.sqrt((steamVol * 1000) / (Math.PI * 12.0 * 0.28 * 950 * 0.75)));
      const steamPenetrationPct = Math.min(95, Math.max(15, Math.round((radialRadiusM / 65) * 100)));
      const bhpBar = Math.round(replayReading.pressureBar * 10) / 10;
      const whpBar = Math.round((replayReading.wellheadTempC ? Math.max(2.5, replayReading.pressureBar * 0.28) : 4.8) * 10) / 10;
      const oilRateBpd = Math.round(replayReading.flowRateBpd * 10) / 10;
      const grossRateBpd = Math.round((oilRateBpd * 1.82) * 10) / 10;
      const currentSpm = replayReading.spm;

      let pumpEffCalc = 0;
      if (replayReading.phase === 'production' && currentSpm > 0) {
        const mobilityFactor = Math.min(2.5, Math.max(0.2, 1200 / viscCp));
        if (currentSpm > 7.5 && viscCp > 400) {
          pumpEffCalc = Math.max(45, Math.round(85 - (currentSpm - 7.5) * 9.5));
        } else {
          pumpEffCalc = Math.min(94, Math.round(80 + (mobilityFactor * 5.5)));
        }
      }

      const rodLoadKN = replayReading.phase === 'production'
        ? Math.round((12.0 + (currentSpm * 0.85) + (viscCp > 1000 ? 4.8 : 1.5)) * 10) / 10
        : 2.5;

      return {
        tempC,
        viscCp,
        radialRadiusM,
        steamPenetrationPct,
        bhpBar,
        whpBar,
        oilRateBpd,
        grossRateBpd,
        pumpEffCalc,
        rodLoadKN,
        vfdHz: Math.round((currentSpm / 10) * 50 * 10) / 10,
        spm: currentSpm,
        cycleId: replayReading.cycleId || 'BGW-001-C1',
        cycleNumber: replayReading.cycleNumber || 1,
        phase: replayReading.phase || 'production',
        rodFloatingRisk: replayReading.rodFloatingRisk,
        rodFloatingStatus: replayReading.rodFloatingStatus,
        spmCrit: replayReading.spmCrit,
        spmSafe: replayReading.spmSafe,
        motorPowerKW: replayReading.motorPowerKW,
        motorCurrentA: replayReading.motorCurrentA || 0,
        steamVolumeTon: steamVol,
        steamPressureBar: replayReading.steamPressureBar || simCssPressure,
        soakTimeHr: replayReading.soakTimeHr || simCssSoak,
        timestamp: replayReading.timestamp,
        isReplay: true,
      };
    }

    // 2. Fallback to Sandbox Mathematical Equations
    let tempC = 48.0;
    if (cssPhase === 'injection') {
      tempC = 48.0 + (simCssSteam / 1000) * 118.0;
    } else if (cssPhase === 'soak') {
      tempC = (48.0 + (simCssSteam / 1000) * 118.0) * 0.88;
    } else {
      tempC = Math.max(50.0, (48.0 + (simCssSteam / 1000) * 85.0) * 0.78);
    }
    tempC = Math.round(tempC * 10) / 10;

    const T_k = tempC + 273.15;
    const logLogVisc = 7.043 - 2.590 * Math.log10(T_k);
    let viscCp = Math.exp(Math.exp(logLogVisc)) - 0.7;
    viscCp = Math.max(25, Math.min(25000, Math.round(viscCp)));

    const radialRadiusM = Math.round(Math.sqrt((simCssSteam * 1000) / (Math.PI * 12.0 * 0.28 * 950 * 0.75)));
    const steamPenetrationPct = Math.min(95, Math.max(15, Math.round((radialRadiusM / 65) * 100)));

    let bhpBar = 18.4;
    let whpBar = 4.8;
    if (cssPhase === 'injection') {
      bhpBar = simCssPressure + liveNoise.pressure;
      whpBar = Math.max(12.0, simCssPressure * 0.78 + liveNoise.pressure * 0.5);
    } else if (cssPhase === 'soak') {
      bhpBar = simCssPressure * 0.68 + liveNoise.pressure * 0.4;
      whpBar = 6.2 + liveNoise.pressure * 0.2;
    } else {
      bhpBar = Math.max(6.5, 16.8 - (simSrpSPM + liveNoise.spm - 2) * 1.05);
      whpBar = Math.max(2.5, 4.2 + ((simSrpSPM + liveNoise.spm) * 0.22));
    }
    bhpBar = Math.round(bhpBar * 10) / 10;
    whpBar = Math.round(whpBar * 10) / 10;

    let oilRateBpd = 0;
    let grossRateBpd = 0;
    let pumpEffCalc = 78;
    let rodLoadKN = 16.5;

    if (cssPhase === 'injection' || cssPhase === 'soak') {
      oilRateBpd = 0.0;
      grossRateBpd = 0.0;
      pumpEffCalc = 0;
      rodLoadKN = 2.5;
    } else {
      const mobilityFactor = Math.min(2.5, Math.max(0.2, 1200 / viscCp));
      const strokeFactor = simSrpStroke / 100;
      const effectiveSpm = Math.max(1, simSrpSPM + liveNoise.spm);
      const idealBpd = effectiveSpm * 5.4 * strokeFactor;
      
      if (effectiveSpm > 7.5 && viscCp > 400) {
        pumpEffCalc = Math.max(45, Math.round(85 - (effectiveSpm - 7.5) * 9.5));
      } else {
        pumpEffCalc = Math.min(94, Math.round(80 + (mobilityFactor * 5.5)));
      }
      oilRateBpd = Math.round((idealBpd * (pumpEffCalc / 100) * (mobilityFactor * 0.82) + liveNoise.oilRate) * 10) / 10;
      oilRateBpd = Math.max(0, oilRateBpd);
      grossRateBpd = Math.round((oilRateBpd * 1.82) * 10) / 10;
      rodLoadKN = Math.round((12.0 + (effectiveSpm * 0.85) + (viscCp > 1000 ? 4.8 : 1.5)) * 10) / 10;
    }

    return {
      tempC,
      viscCp,
      radialRadiusM,
      steamPenetrationPct,
      bhpBar,
      whpBar,
      oilRateBpd,
      grossRateBpd,
      pumpEffCalc,
      rodLoadKN,
      vfdHz: Math.round((simSrpSPM / 10) * 50 * 10) / 10,
      spm: simSrpSPM,
      cycleId: 'BGW-001-C1',
      cycleNumber: 1,
      phase: cssPhase,
      rodFloatingRisk: 18.5,
      rodFloatingStatus: 'LOW',
      spmCrit: 6.5,
      spmSafe: 5.2,
      motorPowerKW: 22.4,
      motorCurrentA: 38.2,
      steamVolumeTon: simCssSteam,
      steamPressureBar: simCssPressure,
      soakTimeHr: simCssSoak,
      timestamp: 'Manual Setpoints',
      isReplay: false,
    };
  }, [isReplaySync, replayReading, cssPhase, simCssSteam, simCssPressure, simSrpSPM, simSrpStroke, liveNoise]);

  const currentSpm = Number(livePhysics.spm ?? latestSrp?.spm ?? twinState?.srp?.spm ?? 5.1);
  const isFluidPound = pumpFillage < 70 || (livePhysics.viscCp > 3000 && currentSpm > 4.5);

  // Subsystem Telemetry Data dynamically updated with live multi-physics
  const currentParams = useMemo(() => {
    const res = twinState?.reservoir || {};
    const wb = twinState?.wellbore || {};
    const sp = twinState?.srp || {};
    const prod = twinState?.production || {};
    const health = twinState?.health || {};

    if (selectedSubsystem === 'reservoir') {
      const isHot = livePhysics.tempC > 120;
      const isMobile = livePhysics.viscCp < 500;
      return {
        description: `Baghewala Heavy Oil Formation · Chamber active at ${res.depth || 852}m MD`,
        metrics: [
          { 
            label: 'Reservoir Temperature', 
            value: `${livePhysics.tempC} °C`, 
            status: isHot ? 'Superheated' : livePhysics.tempC > 70 ? 'Thermally Mobilized' : 'Cold Baseline' 
          },
          { 
            label: 'Bottomhole Pressure', 
            value: `${livePhysics.bhpBar} bar`, 
            status: cssPhase === 'injection' ? 'Steam Overpressure' : cssPhase === 'soak' ? 'Diffusion Bleed' : 'Pumping Drawdown' 
          },
          { 
            label: 'Heavy Oil Viscosity', 
            value: `${livePhysics.viscCp.toLocaleString()} cP`, 
            status: isMobile ? 'Fully Mobilized' : livePhysics.viscCp < 2000 ? 'Semi-Plastic' : 'Immobile Tar' 
          },
          { 
            label: 'Steam Penetration', 
            value: `${livePhysics.steamPenetrationPct} %`, 
            status: `Radial ${livePhysics.radialRadiusM}m` 
          },
          { 
            label: 'Mobile Oil Saturation', 
            value: `${(0.18 + (livePhysics.tempC / 200) * 0.42).toFixed(2)}`, 
            status: 'Pay Zone A (852m)' 
          },
        ],
      };
    }
    if (selectedSubsystem === 'wellbore') {
      return {
        description: `${wb.casingDiameter || 177.8}mm Casing & ${wb.tubingDiameter || 88.9}mm Production Tubing`,
        metrics: [
          { 
            label: 'Wellhead Pressure', 
            value: `${livePhysics.whpBar} bar`, 
            status: livePhysics.phase === 'injection' ? 'Manifold Active' : 'Nominal' 
          },
          { 
            label: 'Wellhead Temp', 
            value: `${replayReading?.wellheadTempC ? replayReading.wellheadTempC.toFixed(1) : (livePhysics.tempC * 0.78).toFixed(1)} °C`, 
            status: 'Continuous' 
          },
          { 
            label: 'Oil Flow Rate', 
            value: `${livePhysics.oilRateBpd} BPD`, 
            status: livePhysics.phase === 'production' ? 'Producing' : 'Shut-In (CSS)' 
          },
          { 
            label: 'True Pump Depth', 
            value: `${wb.depth || 852} m`, 
            status: 'Perforated String' 
          },
          { 
            label: 'Polished Stroke Length', 
            value: `${simSrpStroke} in`, 
            status: 'Nominal API-11E' 
          },
        ],
      };
    }
    if (selectedSubsystem === 'srp') {
      return {
        description: 'Surface Walking Beam Unit with dynamic counterweights and polished carrier bar',
        metrics: [
          { 
            label: 'Pumping Speed', 
            value: `${(livePhysics.spm ?? simSrpSPM).toFixed(1)} SPM`, 
            status: livePhysics.phase === 'production' ? ((livePhysics.spm ?? simSrpSPM) > 8 ? 'High Cadence' : 'Optimized') : 'Standby' 
          },
          { 
            label: 'Polished Rod Load', 
            value: `${livePhysics.rodLoadKN} kN`, 
            status: livePhysics.rodLoadKN > 20 ? 'High Drag' : 'Safe Operating' 
          },
          { 
            label: 'Rod Floating Risk', 
            value: `${livePhysics.rodFloatingRisk}%`, 
            status: livePhysics.rodFloatingStatus 
          },
          { 
            label: 'Critical SPM (SPMcrit)', 
            value: `${(livePhysics.spmCrit || 6.5).toFixed(1)} SPM`, 
            status: `Safe: ${(livePhysics.spmSafe || 5.2).toFixed(1)}` 
          },
          { 
            label: 'Motor Power Consumption', 
            value: `${(livePhysics.motorPowerKW || 22.4).toFixed(1)} kW`, 
            status: 'Electric Drive' 
          },
        ],
      };
    }
    return {
      description: 'Surface wellhead Christmas tree, manifold master valve, and VFD controller',
      metrics: [
        { label: 'Flowline Pressure', value: `${livePhysics.whpBar} bar`, status: 'Flowline' },
        { label: 'Net Oil Flow Rate', value: `${livePhysics.oilRateBpd} BPD`, status: livePhysics.phase === 'production' ? 'Producing' : 'Shut-In' },
        { label: 'Gross Liquid Rate', value: `${livePhysics.grossRateBpd} BFPD`, status: 'Total Produced' },
        { label: 'Motor Drive Current', value: `${(livePhysics.motorCurrentA || 0).toFixed(1)} A`, status: 'VFD Output' },
        { label: 'Overall Mechanical Health', value: `${Math.max(55, Math.round(94 - ((livePhysics.spm || 0) > 8 ? 16 : 4) - (livePhysics.rodLoadKN > 18 ? 12 : 0)))} %`, status: 'Monitored' },
      ],
    };
  }, [twinState, selectedSubsystem, livePhysics, cssPhase, simSrpSPM, simSrpStroke, replayReading]);

  const handleSelectWell = (id: string) => {
    setSearchParams({ well: id });
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-white min-h-screen text-[#1E293B]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Page Header (OIL INDIA LIMITED | Digital Twin) ───────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-[12px] font-bold text-[#64748B] hover:text-[#D32F2F] transition-colors cursor-pointer mr-2"
              title="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <span className="text-[#CBD5E1]">|</span>
            <span className="text-[12px] font-bold tracking-wider text-[#D32F2F] uppercase">
              OIL INDIA LIMITED
            </span>
            <span className="text-[#94A3B8]">|</span>
            <span className="text-[12px] font-bold tracking-wider text-[#64748B] uppercase">
              Digital Twin
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={currentWellId}
              onChange={(e) => handleSelectWell(e.target.value)}
              className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight bg-transparent border-b-2 border-[#CBD5E1] focus:outline-none focus:border-[#005C53] cursor-pointer"
            >
              {wells.map(w => (
                <option key={w.id} value={w.id} className="text-[16px] font-bold">{w.name || w.id}</option>
              ))}
            </select>
            <span className="text-lg text-[#64748B] font-medium">|</span>
            <h2 className="text-xl font-bold text-[#0F172A]">Live Digital Twin</h2>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#1B5E20] text-[12px] font-bold border border-[#A5D6A7]">
              <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
              Live DB Telemetry
            </span>
          </div>
          <p className="text-[14px] text-[#64748B] mt-1">
            Real-time coupled physics model for heavy oil Cyclic Steam Stimulation (CSS) &amp; Sucker Rod Pump (SRP)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] rounded text-[13px] font-bold shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#D32F2F]" />
            <span>Back</span>
          </button>
          <button
            onClick={() => setIs3DMode(!is3DMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded text-[13px] font-bold shadow-sm transition-all cursor-pointer ${
              is3DMode
                ? 'bg-[#005C53] hover:bg-[#004B44] text-white'
                : 'bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>3D View</span>
          </button>
          <button
            onClick={() => navigate('/app/simulation-lab')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] rounded text-[13px] font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-[#D32F2F]" />
            <span>Simulation Lab</span>
          </button>
          <button
            onClick={() => navigate('/app/joint-optimizer')}
            className="flex items-center gap-2 px-4 py-2 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded text-[13px] font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>Optimize Well</span>
          </button>
        </div>
      </div>


      {/* ── Sub-Navigation Tabs ──────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 text-[14px]">
        {[
          { key: 'twin', label: '3D CAD Digital Twin & Thermal Profile' },
          { key: 'dyno', label: 'Downhole Dynamometer Card' },
          { key: 'cycles', label: 'CSS Thermal Cycle History' },
          { key: 'piml', label: 'PIML Twin (Physics + ML)' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveSecondaryTab(t.key as any)}
            className={`px-4 py-2 font-bold rounded-t transition-all cursor-pointer ${
              activeSecondaryTab === t.key
                ? 'border-b-2 border-[#D32F2F] text-[#D32F2F] bg-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── MAIN TAB: DIGITAL TWIN (Matching Panel 5 in Design) ──── */}
      {activeSecondaryTab === 'twin' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left / Center 3D Model Area (7 cols or 8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#D32F2F]" />
                  <h3 className="text-[15px] font-bold text-[#0F172A]">
                    Photorealistic CAD Digital Twin — Rajasthan Heavy Oil Formation
                  </h3>
                </div>
                <span className="text-[12px] text-[#64748B] font-medium">
                  Baghewala Field · Spud Depth: 852 m
                </span>
              </div>

              {/* 3D Canvas Viewport */}
              <DigitalTwin3DCanvas
                wellId={currentWellId}
                activeComponent={selectedSubsystem}
                onComponentSelect={(c) => setSelectedSubsystem(c)}
                spm={livePhysics.spm !== undefined ? livePhysics.spm : simSrpSPM}
                strokeLength={simSrpStroke}
                isPumping={livePhysics.phase === 'production' && (livePhysics.spm !== undefined ? livePhysics.spm : simSrpSPM) > 0}
                cssSteam={livePhysics.steamVolumeTon || simCssSteam}
                cssPressure={livePhysics.steamPressureBar || simCssPressure}
                cssSoak={livePhysics.soakTimeHr || simCssSoak}
                cssPhase={(livePhysics.phase as any) || cssPhase}
                onCssPhaseChange={(p) => { setIsReplaySync(false); setCssPhase(p); }}
                onBack={() => navigate(-1)}
                reservoirTemp={livePhysics.tempC}
                viscosityCp={livePhysics.viscCp}
                oilRateBpd={livePhysics.oilRateBpd}
                onSteamChange={(v) => { setIsReplaySync(false); setSimCssSteam(v); }}
                onSpmChange={(v) => { setIsReplaySync(false); setSimSrpSPM(v); }}
              />
            </div>
          </div>

          {/* Right Inspection & Thermal Profile Panel (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* Sub-Component Selector Tabs */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 space-y-4">
              <div className="grid grid-cols-4 gap-1 bg-[#F1F5F9] p-1 rounded-lg">
                {[
                  { key: 'reservoir', label: 'Reservoir' },
                  { key: 'wellbore',  label: 'Wellbore' },
                  { key: 'srp',       label: 'SRP' },
                  { key: 'surface',   label: 'Surface' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedSubsystem(tab.key as any)}
                    className={`py-2 text-[12px] font-bold rounded-md transition-all cursor-pointer ${
                      selectedSubsystem === tab.key
                        ? 'bg-white text-[#0F172A] shadow-xs'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Component Specific Live Parameters Table (Dynamically tracks live multi-physics) */}
              <div className="space-y-3 pt-1">
                <div className="text-[12px] text-[#64748B] pb-2 border-b border-[#F1F5F9]">
                  {currentParams.description}
                </div>

                <div className="space-y-2.5">
                  {currentParams.metrics.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1.5 border-b border-[#F8FAFC]">
                      <span className="text-[13px] font-semibold text-[#475569]">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-black text-[#0F172A]">{item.value}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Coupled Simulation Controls (CSS & SRP) */}
              <div className="pt-3 border-t border-[#F1F5F9] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F172A]">
                    Live Coupled Controls (CSS + SRP)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-[#E0F2FE] text-[#0369A1]">
                    3D Synchronized
                  </span>
                </div>

                {/* CSS Phase Selector */}
                <div className="grid grid-cols-3 gap-1 bg-[#F8FAFC] p-1 rounded border border-[#E2E8F0] text-[11px]">
                  <button
                    onClick={() => setCssPhase('injection')}
                    className={`py-1 font-bold rounded transition-colors cursor-pointer ${
                      cssPhase === 'injection' ? 'bg-[#0284C7] text-white shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    Injection
                  </button>
                  <button
                    onClick={() => setCssPhase('soak')}
                    className={`py-1 font-bold rounded transition-colors cursor-pointer ${
                      cssPhase === 'soak' ? 'bg-[#EA580C] text-white shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    Soak
                  </button>
                  <button
                    onClick={() => setCssPhase('production')}
                    className={`py-1 font-bold rounded transition-colors cursor-pointer ${
                      cssPhase === 'production' ? 'bg-[#16A34A] text-white shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    Production
                  </button>
                </div>

                {/* Live Heavy Oil Mobilization State Banner */}
                <div className={`p-3 rounded-lg border text-[12px] space-y-1.5 ${
                  livePhysics.viscCp < 500 
                    ? 'bg-[#F0FDF4] border-[#BBF7D0]' 
                    : livePhysics.viscCp < 2000 
                      ? 'bg-[#FFFBEB] border-[#FDE68A]' 
                      : 'bg-[#FEF2F2] border-[#FECACA]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0F172A] flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        livePhysics.viscCp < 500 ? 'bg-[#16A34A] animate-pulse' : livePhysics.viscCp < 2000 ? 'bg-[#D97706]' : 'bg-[#DC2626]'
                      }`} />
                      Heavy Oil Formation State:
                    </span>
                    <strong className={`font-black ${
                      livePhysics.viscCp < 500 ? 'text-[#15803D]' : livePhysics.viscCp < 2000 ? 'text-[#B45309]' : 'text-[#B91C1C]'
                    }`}>
                      {livePhysics.viscCp < 500 ? 'Thermally Mobilized (Fluid)' : livePhysics.viscCp < 2000 ? 'Softening Plastic Crude' : 'Solid Immobile Bitumen'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                    <span>Current Viscosity: <strong className="text-[#0F172A]">{livePhysics.viscCp.toLocaleString()} cP</strong></span>
                    <span>Heated Radius: <strong className="text-[#0F172A]">{livePhysics.radialRadiusM} m</strong></span>
                    <span>Net Output: <strong className="text-[#0284C7]">{livePhysics.oilRateBpd} BOPD</strong></span>
                  </div>
                </div>

                {/* Interactive Sliders that immediately update 3D model and all live telemetry */}
                <div className="space-y-3 text-[12px]">
                  <div>
                    <div className="flex justify-between text-[#475569] font-medium">
                      <span>CSS Steam Volume</span>
                      <strong className="text-[#0284C7]">{simCssSteam} tons</strong>
                    </div>
                    <input
                      type="range"
                      min="400"
                      max="1200"
                      step="25"
                      value={simCssSteam}
                      onChange={(e) => setSimCssSteam(Number(e.target.value))}
                      className="w-full h-1.5 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#0284C7]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[#475569] font-medium">
                      <span>Injection Pressure</span>
                      <strong className="text-[#0284C7]">{simCssPressure} bar</strong>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="35"
                      step="1"
                      value={simCssPressure}
                      onChange={(e) => setSimCssPressure(Number(e.target.value))}
                      className="w-full h-1.5 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#0284C7]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[#475569] font-medium">
                      <span>SRP Pumping Cadence</span>
                      <strong className="text-[#D32F2F]">{simSrpSPM.toFixed(1)} SPM</strong>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      step="0.1"
                      value={simSrpSPM}
                      onChange={(e) => setSimSrpSPM(Number(e.target.value))}
                      className="w-full h-1.5 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#D32F2F]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[#475569] font-medium">
                      <span>Polished Stroke Length</span>
                      <strong className="text-[#D32F2F]">{simSrpStroke} in</strong>
                    </div>
                    <input
                      type="range"
                      min="44"
                      max="144"
                      step="2"
                      value={simSrpStroke}
                      onChange={(e) => setSimSrpStroke(Number(e.target.value))}
                      className="w-full h-1.5 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#D32F2F]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Thermal Profile Depth Chart (Dynamic Walther Viscosity & Temperature Profiles) */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                <div>
                  <h4 className="text-[14px] font-bold text-[#0F172A]">Thermal Profile &amp; Viscosity Curve</h4>
                  <p className="text-[11px] text-[#64748B]">Coupled thermodynamic dissipation at depth 852m MD</p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-[#0284C7]">
                    <span className="w-2.5 h-0.5 bg-[#0284C7] rounded" /> Temp ({livePhysics.tempC}°C)
                  </span>
                  <span className="flex items-center gap-1 text-[#EA580C]">
                    <span className="w-2.5 h-0.5 bg-[#EA580C] rounded" /> Viscosity ({livePhysics.viscCp.toLocaleString()} cP)
                  </span>
                </div>
              </div>

              {/* Depth Profile Chart (Y: Depth 0 to 1000m MD, X: Value 0 to 600) */}
              <div className="h-64 relative bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] p-3">
                <svg viewBox="0 0 320 220" className="w-full h-full">
                  {/* Grid Lines */}
                  {[30, 70, 110, 150, 190].map((y, i) => (
                    <g key={i}>
                      <line x1="45" y1={y} x2="300" y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
                      <text x="38" y={y + 3} textAnchor="end" fontSize="9" fill="#94A3B8" fontWeight="600">
                        {i * 200 + 200}
                      </text>
                    </g>
                  ))}
                  <text x="38" y="24" textAnchor="end" fontSize="9" fill="#94A3B8" fontWeight="600">0</text>
                  <text x="18" y="115" transform="rotate(-90, 18, 115)" textAnchor="middle" fontSize="10" fill="#64748B" fontWeight="bold">
                    Depth (m)
                  </text>

                  {/* X Axis Values */}
                  {[0, 200, 400, 600].map((v, i) => (
                    <g key={i}>
                      <text x={45 + i * 85} y="208" textAnchor="middle" fontSize="9" fill="#94A3B8" fontWeight="600">
                        {v}
                      </text>
                    </g>
                  ))}
                  <text x="175" y="218" textAnchor="middle" fontSize="10" fill="#64748B" fontWeight="bold">
                    Value Scale
                  </text>

                  {/* Axes */}
                  <line x1="45" y1="20" x2="45" y2="195" stroke="#94A3B8" strokeWidth="1.5" />
                  <line x1="45" y1="195" x2="300" y2="195" stroke="#94A3B8" strokeWidth="1.5" />

                  {/* Dynamic Temperature Curve (Blue Line) - warming down into reservoir */}
                  <path
                    d={`M 58 25 Q 65 60 72 100 T 95 160 Q ${Math.min(220, 80 + (livePhysics.tempC / 200) * 90)} 180 ${Math.min(290, Math.max(70, 45 + (livePhysics.tempC / 200) * 230))} 190`}
                    fill="none"
                    stroke="#0284C7"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx={Math.min(290, Math.max(70, 45 + (livePhysics.tempC / 200) * 230))} cy={190} r={4} fill="#0284C7" />

                  {/* Dynamic Viscosity Curve (Orange Line) - drops dramatically in thermal chamber */}
                  <path
                    d={`M 285 25 C 275 60 250 100 205 140 C 160 170 120 185 ${Math.min(290, Math.max(52, 45 + (Math.min(2500, livePhysics.viscCp) / 2500) * 200))} 190`}
                    fill="none"
                    stroke="#EA580C"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx={Math.min(290, Math.max(52, 45 + (Math.min(2500, livePhysics.viscCp) / 2500) * 200))} cy={190} r={4} fill="#EA580C" />

                  {/* Reservoir Steam Zone Marker */}
                  <rect x="45" y="170" width="255" height="25" fill="#EF4444" opacity="0.08" />
                  <text x="290" y="186" textAnchor="end" fill="#B91C1C" fontSize="9" fontWeight="bold">
                    CSS Injection Zone (852m MD)
                  </text>
                </svg>
              </div>

              <div className={`p-3 rounded-lg text-[12px] flex items-center justify-between border ${
                livePhysics.viscCp <= 500
                  ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
                  : livePhysics.viscCp <= 2000
                    ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]'
                    : 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
              }`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-semibold">
                    {livePhysics.viscCp <= 500
                      ? 'Optimal Viscosity Threshold Met (< 500 cP)'
                      : livePhysics.viscCp <= 2000
                        ? 'Thermal Soak Recommended (Viscosity: 500 - 2000 cP)'
                        : 'Cold Bitumen Warning — Additional Steam Required'}
                  </span>
                </div>
                <span className="font-black text-sm">{livePhysics.viscCp.toLocaleString()} cP</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ── TAB 2: DYNAMOMETER CARD ──────────────────────────────── */}
      {activeSecondaryTab === 'dyno' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">Surface &amp; Downhole Dynamometer Card Diagnostics</h3>
              <p className="text-[13px] text-[#64748B]">Polished rod load vs stroke displacement loop analysis for {currentWellId}</p>
            </div>
            <span className={`px-2.5 py-1 rounded text-[12px] font-bold ${
              isFluidPound ? 'bg-[#FFEBEE] text-[#D32F2F]' : 'bg-[#E8F5E9] text-[#15803D]'
            }`}>
              {isFluidPound ? 'Diagnosis: Severe Fluid Pound Detected' : 'Diagnosis: Nominal Full Barrel Operation'}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="h-72 bg-[#F8FAFC] rounded border border-[#E2E8F0] p-4 flex items-center justify-center">
              <svg viewBox="0 0 400 240" className="w-full h-full">
                <line x1="40" y1="20" x2="40" y2="200" stroke="#94A3B8" strokeWidth="1.5" />
                <line x1="40" y1="200" x2="380" y2="200" stroke="#94A3B8" strokeWidth="1.5" />
                <text x="30" y="15" fill="#64748B" fontSize="10" textAnchor="end">Load (kN)</text>
                <text x="375" y="215" fill="#64748B" fontSize="10" textAnchor="end">Displacement (in)</text>

                {[50, 100, 150].map(y => (
                  <line key={y} x1="40" y1={y} x2="380" y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
                ))}

                <path
                  d="M 60 170 L 60 70 Q 180 65 320 60 L 340 65 L 340 160 L 220 165 L 140 185 Z"
                  fill="none"
                  stroke="#D32F2F"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />

                <path
                  d="M 80 150 L 80 90 L 300 90 L 320 150 L 190 150 Z"
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />

                <circle cx="220" cy="165" r="4" fill="#D32F2F" />
                <text x="230" y="165" fill="#B91C1C" fontSize="11" fontWeight="bold">Fluid Impact Point</text>
              </svg>
            </div>

            <div className="space-y-4 text-[13px]">
              <div className="p-4 bg-[#F8FAFC] rounded border border-[#E2E8F0]">
                <h5 className="font-bold text-[#0F172A] mb-1">Downhole Diagnostic Summary</h5>
                <p className="text-[#475569] leading-relaxed">
                  {isFluidPound ? (
                    <>Premature tension drop during downstroke indicates incomplete heavy oil pump chamber fill (<strong className="text-[#D32F2F]">Fluid Pound</strong>, pump fillage: {pumpFillage}%).</>
                  ) : (
                    <>Nominal cylinder intake and polished rod displacement observed with stable pump fillage ({pumpFillage}%).</>
                  )}
                </p>
              </div>

              <div className={`p-4 rounded border ${isFluidPound ? 'bg-[#FFF5F5] border-[#FED7D7]' : 'bg-[#F0FDF4] border-[#BBF7D0]'}`}>
                <h5 className={`font-bold mb-1 ${isFluidPound ? 'text-[#991B1B]' : 'text-[#166534]'}`}>Recommended Corrective Action</h5>
                <p className={`leading-relaxed ${isFluidPound ? 'text-[#7F1D1D]' : 'text-[#14532D]'}`}>
                  {isFluidPound ? (
                    <>Reduce SPM from {currentSpm.toFixed(1)} to {(currentSpm * 0.65).toFixed(1)} to give viscous heavy oil adequate intake time into pump barrel, elevating pump volumetric efficiency from {pumpEff}% to 84%.</>
                  ) : (
                    <>Maintain current operating setpoints at {currentSpm.toFixed(1)} SPM. Polished rod load and pump volumetric efficiency ({pumpEff}%) remain within nominal API-11E limits.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: CSS CYCLES HISTORY ────────────────────────────── */}
      {activeSecondaryTab === 'cycles' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">Cyclic Steam Stimulation Historical Performance</h3>
              <p className="text-[13px] text-[#64748B]">Chronological cycle metrics for Well {currentWellId} (Baghewala Field)</p>
            </div>
            <span className="text-[12px] text-[#64748B]">Cumulative Steam Injected: <strong>{cumulativeSteam > 0 ? `${cumulativeSteam.toLocaleString()} tons` : '3,800 tons'}</strong></span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Cycle #</th>
                  <th className="py-3 px-4">Inj Duration</th>
                  <th className="py-3 px-4 text-right">Steam Vol (t)</th>
                  <th className="py-3 px-4 text-right">Inj. Press (bar)</th>
                  <th className="py-3 px-4 text-right">Soak</th>
                  <th className="py-3 px-4 text-right">Steam Temp</th>
                  <th className="py-3 px-4 text-right">Post-Steam Temp</th>
                  <th className="py-3 px-4 text-right">Cutoff</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {cssCycles.map(c => {
                  const isCurrentActive = isReplaySync && replayReading?.cycleNumber === c.cycleNumber;
                  return (
                    <tr 
                      key={c.cycleId || c.cycleNumber} 
                      className={`transition-colors ${
                        isCurrentActive 
                          ? 'bg-[#FEF2F2] border-l-4 border-l-[#D32F2F]' 
                          : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-black text-[#0F172A]">
                        <div className="flex items-center gap-2">
                          <span>Cycle {c.cycleNumber}</span>
                          {isCurrentActive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#D32F2F] text-white animate-pulse">
                              ACTIVE REPLAY ({replayReading?.phase?.toUpperCase()})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#475569]">{c.injectionDurationHr ? `${c.injectionDurationHr}h` : '-'}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#0F172A]">{c.steamVolumeTon}</td>
                      <td className="py-3.5 px-4 text-right text-[#475569]">{c.injectionPressureBar}</td>
                      <td className="py-3.5 px-4 text-right text-[#475569]">{c.soakTimeHr ? `${Math.round(c.soakTimeHr / 24)}d (${c.soakTimeHr}h)` : '-'}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#EA580C]">{c.steamTemperatureC}°C</td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#0F172A]">{c.postSteamTemperatureC ? `${c.postSteamTemperatureC}°C` : '-'}</td>
                      <td className="py-3.5 px-4 text-right text-[#475569]">{c.productionCutoff || '-'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          isCurrentActive
                            ? 'bg-[#D32F2F] text-white'
                            : c.status === 'Active' || c.status === 'ACTIVE' 
                            ? 'bg-[#FFEBEE] text-[#B71C1C]' 
                            : 'bg-[#E8F5E9] text-[#1B5E20]'
                        }`}>
                          {isCurrentActive ? 'Simulating' : c.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PIML TAB: Physics-Informed ML Twin ───────────────────────── */}
      {activeSecondaryTab === 'piml' && (
        <div className="space-y-6">

          {/* Header */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">Physics-Informed ML (PIML) Digital Twin</h3>
                <p className="text-[12px] text-[#64748B]">
                  Boberg-Lantz physics baseline + XGBoost residual corrector trained on {currentWellId} field data
                </p>
              </div>
              <div className="flex items-center gap-2">
                {pimlLoading && (
                  <span className="text-[12px] text-[#64748B] flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 animate-pulse" /> Computing…
                  </span>
                )}
                {pimlData && (
                  <span className="px-3 py-1 bg-[#E0F2FE] text-[#0369A1] font-bold text-[12px] rounded">
                    {pimlData.thermalStage}
                  </span>
                )}
              </div>
            </div>

            {pimlData ? (
              <div className="mt-4 space-y-6">

                {/* Physics vs PIML comparison cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <span className="text-[11px] font-bold text-[#64748B] uppercase block">Physics Model</span>
                    <span className="text-2xl font-black text-[#334155] mt-1 block">{pimlData.physicsBpd} BPD</span>
                    <span className="text-[11px] text-[#64748B]">Boberg-Lantz surrogate</span>
                    {pimlData.physicsErrorPct !== null && (
                      <span className="text-[11px] font-semibold text-[#D97706] block mt-1">{pimlData.physicsErrorPct}% vs actual</span>
                    )}
                  </div>
                  <div className="p-4 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0]">
                    <span className="text-[11px] font-bold text-[#064E3B] uppercase block">PIML Prediction</span>
                    <span className="text-2xl font-black text-[#059669] mt-1 block">{pimlData.pimlBpd} BPD</span>
                    <span className="text-[11px] text-[#064E3B]">Physics + XGBoost residual</span>
                    {pimlData.pimlErrorPct !== null && (
                      <span className="text-[11px] font-semibold text-[#059669] block mt-1">{pimlData.pimlErrorPct}% vs actual</span>
                    )}
                  </div>
                  <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <span className="text-[11px] font-bold text-[#64748B] uppercase block">Residual Correction</span>
                    <span className={`text-2xl font-black mt-1 block ${
                      pimlData.residualCorrection >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                    }`}>
                      {pimlData.residualCorrection >= 0 ? '+' : ''}{pimlData.residualCorrection} BPD
                    </span>
                    <span className="text-[11px] text-[#64748B]">ML learned correction</span>
                  </div>
                  <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <span className="text-[11px] font-bold text-[#64748B] uppercase block">90% CI</span>
                    <span className="text-[14px] font-black text-[#0F172A] mt-1 block">
                      [{pimlData.ci90Lower} – {pimlData.ci90Upper}]
                    </span>
                    <span className="text-[11px] text-[#64748B]">BPD uncertainty band</span>
                  </div>
                </div>

                {/* Visual comparison bar */}
                <div className="space-y-3">
                  <h4 className="text-[13px] font-bold text-[#0F172A]">Prediction Comparison</h4>
                  {[
                    { label: 'Physics Model', value: pimlData.physicsBpd, color: '#64748B', max: Math.max(pimlData.physicsBpd, pimlData.pimlBpd, pimlData.actualBpd || 0) + 5 },
                    { label: 'PIML (Physics + ML)', value: pimlData.pimlBpd, color: '#059669', max: Math.max(pimlData.physicsBpd, pimlData.pimlBpd, pimlData.actualBpd || 0) + 5 },
                    ...(pimlData.actualBpd ? [{ label: 'Actual Production', value: pimlData.actualBpd, color: '#D32F2F', max: Math.max(pimlData.physicsBpd, pimlData.pimlBpd, pimlData.actualBpd) + 5 }] : []),
                  ].map((bar, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-semibold text-[#334155]">{bar.label}</span>
                        <span className="font-black" style={{ color: bar.color }}>{bar.value} BPD</span>
                      </div>
                      <div className="w-full h-3 bg-[#F1F5F9] rounded-full">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(100, (bar.value / bar.max) * 100)}%`, backgroundColor: bar.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input features */}
                <div className="space-y-2">
                  <h4 className="text-[13px] font-bold text-[#0F172A]">Live Input State</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(pimlData.inputFeatures).map(([k, v]) => (
                      <div key={k} className="p-3 bg-[#F8FAFC] rounded border border-[#E2E8F0] text-[12px]">
                        <span className="text-[#64748B] block capitalize">{k.replace(/_/g, ' ')}</span>
                        <span className="font-black text-[#0F172A]">{typeof v === 'number' ? v.toFixed(1) : v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PIML methodology explanation */}
                <div className="p-4 bg-[#EFF6FF] rounded-lg border border-[#BFDBFE] text-[12px] text-[#1E40AF] space-y-1">
                  <strong className="block">PIML Architecture:</strong>
                  <span>1. <b>Physics Base</b>: Walther viscosity + Boberg-Lantz thermal mobility + SRP volumetric displacement</span><br/>
                  <span>2. <b>XGBoost Residual</b>: Trained on (actual_bpd − physics_predicted_bpd) from {currentWellId} CSV data</span><br/>
                  <span>3. <b>Final Output</b>: physics_bpd + residual_correction = PIML_bpd ± {pimlData.uncertaintyBpd} BPD (σ)</span>
                </div>
              </div>
            ) : !pimlLoading ? (
              <div className="mt-4 p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-[13px] text-[#64748B]">
                PIML data unavailable. Ensure the backend ML models are trained (check /api/ai/status) and the database is seeded.
              </div>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
};
