import React, { useState, useEffect } from 'react';
import { 
  Activity, AlertTriangle, Cpu, Radio, ShieldAlert, Sparkles, 
  Thermometer, Zap, CheckCircle2, Loader2, ArrowRight
} from 'lucide-react';
import { 
  simulationApi, 
  EdgeTelemetryStream 
} from '../../services/api';

interface EdgeStreamBarProps {
  selectedWell: string;
  onAnomalyInjected?: (alert: any) => void;
}

export const EdgeStreamBar: React.FC<EdgeStreamBarProps> = ({
  selectedWell,
  onAnomalyInjected,
}) => {
  const [streamData, setStreamData] = useState<EdgeTelemetryStream | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [injectingType, setInjectingType] = useState<string | null>(null);
  const [recentAnomalyAlert, setRecentAnomalyAlert] = useState<any | null>(null);

  // Poll simulated live edge gateway stream every 3 seconds when active
  useEffect(() => {
    if (!isStreaming || !selectedWell) return;

    const fetchStream = () => {
      simulationApi.getEdgeStream(selectedWell)
        .then((res) => {
          if (res.success && res.data) {
            setStreamData(res.data);
          }
        })
        .catch((err) => console.error('Edge stream error:', err));
    };

    fetchStream();
    const interval = setInterval(fetchStream, 3000);
    return () => clearInterval(interval);
  }, [isStreaming, selectedWell]);

  const handleInjectAnomaly = async (anomalyType: string) => {
    try {
      setInjectingType(anomalyType);
      const res = await simulationApi.injectEdgeAnomaly({
        well_id: selectedWell,
        anomaly_type: anomalyType,
        severity: 'HIGH',
      });
      if (res.success && res.alert) {
        setRecentAnomalyAlert(res.alert);
        if (onAnomalyInjected) {
          onAnomalyInjected(res.alert);
        }
      }
    } catch (err) {
      console.error('Failed to inject anomaly:', err);
    } finally {
      setInjectingType(null);
    }
  };

  const t = streamData?.telemetry;

  return (
    <div className="bg-white text-slate-800 rounded-xl p-4 border border-[#E2E8F0] shadow-xs space-y-3">
      {/* Top bar: Status & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute opacity-75" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-red-600">
                Live Edge IoT Telemetry Stream
              </span>
              <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200">
                ESP32-BGW-RTU01 · LoRaWAN
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Active wellnode: <strong className="text-slate-900 font-mono">{selectedWell}</strong> · Ingesting downhole sensor telemetry
            </p>
          </div>
        </div>

        {/* Live Metrics Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-2xs">
            <Thermometer className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-slate-500">BHT:</span>
            <span className="font-bold text-slate-800">{t?.reservoirTempC || 66.1}°C</span>
          </div>

          <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-2xs">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-slate-500">Viscosity:</span>
            <span className="font-bold text-slate-800">{t?.viscosityCP || 1209} cP</span>
          </div>

          <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-2xs">
            <Cpu className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-slate-500">SPM:</span>
            <span className={`font-bold ${t?.isFloatingRisk ? 'text-red-600 font-black' : 'text-slate-800'}`}>
              {t?.spm || 5.9}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">(Crit: {t?.spmCrit || 14.0})</span>
          </div>

          <div className="bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-2xs">
            <Radio className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-slate-500">Vibration:</span>
            <span className="font-bold text-slate-800">{t?.vibrationMmS || 2.8} mm/s</span>
          </div>
        </div>
      </div>

      {/* Bottom bar: Interactive Fault Injections (SIH Demonstration Novelty) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-bold text-slate-700">
            Field Anomaly Injector (Virtual Testing Lab):
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleInjectAnomaly('rod_floating')}
            disabled={injectingType !== null}
            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            {injectingType === 'rod_floating' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" /> : <ShieldAlert className="w-3.5 h-3.5 text-red-600" />}
            <span>⚡ Inject Rod Floating</span>
          </button>

          <button
            onClick={() => handleInjectAnomaly('thermal_shock')}
            disabled={injectingType !== null}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            {injectingType === 'thermal_shock' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" /> : <Thermometer className="w-3.5 h-3.5 text-amber-600" />}
            <span>🌡️ Inject Thermal Shock</span>
          </button>

          <button
            onClick={() => handleInjectAnomaly('motor_overload')}
            disabled={injectingType !== null}
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            {injectingType === 'motor_overload' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />}
            <span>📉 Inject Motor Surge</span>
          </button>
        </div>
      </div>

      {/* Live Feedback Toast if Anomaly Triggered */}
      {recentAnomalyAlert && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs space-y-1 animate-fadeIn">
          <div className="flex items-center justify-between text-red-800 font-bold">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>Real-Time Edge Fault Detected on {recentAnomalyAlert.wellId}!</span>
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">
              {recentAnomalyAlert.category}
            </span>
          </div>
          <p className="text-slate-700">{recentAnomalyAlert.message}</p>
          <div className="flex items-center justify-between pt-1 text-[11px] text-red-700">
            <span>Root Cause: {recentAnomalyAlert.rootCause}</span>
            <span className="font-semibold text-red-900">Action: {recentAnomalyAlert.recommendedAction}</span>
          </div>
        </div>
      )}
    </div>
  );
};
