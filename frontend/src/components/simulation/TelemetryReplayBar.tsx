import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Radio,
  Activity,
  ChevronDown,
  ChevronUp,
  Globe,
} from 'lucide-react';
import { type ReplayState } from '../../services/api';
import { useReplayStore } from '../../store/replayStore';

interface TelemetryReplayBarProps {
  currentWellId?: string;
  onWellChange?: (wellId: string) => void;
  onStateChange?: (state: ReplayState) => void;
  className?: string;
  defaultCollapsed?: boolean;
}

export const TelemetryReplayBar: React.FC<TelemetryReplayBarProps> = ({
  currentWellId,
  onWellChange,
  onStateChange,
  className = '',
  defaultCollapsed = false,
}) => {
  const {
    replayState,
    isPlaying,
    speed,
    activeWellId,
    currentIndex,
    totalFrames,
    currentReading: reading,
    start,
    pause,
    reset,
    step,
    seek,
    setSpeed,
    selectWell,
    initPolling,
  } = useReplayStore();

  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isSeeking, setIsSeeking] = useState(false);
  const [scrubValue, setScrubValue] = useState<number>(currentIndex);

  // Initialize global background polling
  useEffect(() => {
    return initPolling();
  }, [initPolling]);

  // Sync scrubValue when not user-seeking
  useEffect(() => {
    if (!isSeeking) {
      setScrubValue(currentIndex);
    }
  }, [currentIndex, isSeeking]);

  // Notify parent of state updates if requested
  useEffect(() => {
    if (replayState && onStateChange) {
      onStateChange(replayState);
    }
  }, [replayState, onStateChange]);

  // Sync with currentWellId if provided by parent
  useEffect(() => {
    if (currentWellId && activeWellId !== currentWellId && activeWellId !== 'ALL') {
      selectWell(currentWellId);
    }
  }, [currentWellId, activeWellId, selectWell]);

  // Controls
  const togglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      start();
    }
  };

  const handleStep = (stepCount: number) => {
    step(stepCount);
  };

  const handleReset = () => {
    reset();
    setScrubValue(0);
  };

  const handleSpeed = (s: number) => {
    setSpeed(s);
  };

  const handleWellSelect = (wellId: string) => {
    selectWell(wellId);
    if (onWellChange && wellId !== 'ALL') {
      onWellChange(wellId);
    }
  };

  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSeeking(true);
    setScrubValue(parseInt(e.target.value, 10));
  };

  const handleScrubCommit = async () => {
    try {
      await seek(scrubValue);
    } finally {
      setIsSeeking(false);
    }
  };

  const isFieldSync = activeWellId === 'ALL';
  const availableWells = replayState?.availableWells || [
    'BGW-001', 'BGW-002', 'BGW-003', 'BGW-004', 'BGW-005', 'BGW-006', 'BGW-007', 'BGW-008'
  ];

  const currentFrame = currentIndex + 1;
  const progressPercent = Math.round((currentFrame / totalFrames) * 100);

  return (
    <div className={`bg-white border-b border-[#CBD5E1] shadow-2xs transition-all overflow-hidden ${className}`}>
      {/* ── Top Bar / Header with Collapse Toggle ── */}
      <div className="px-4 sm:px-6 py-2.5 bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#0F172A] flex items-center justify-center text-white shadow-xs">
            <Radio className={`w-4 h-4 ${isPlaying ? 'text-[#22C55E] animate-pulse' : 'text-[#94A3B8]'}`} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12.5px] font-black text-[#0F172A] tracking-wider uppercase">
                SCADA Telemetry Replay Engine
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
                isFieldSync 
                  ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]' 
                  : 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
              }`}>
                {isFieldSync ? <Globe className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                {isFieldSync ? 'Field-Wide Multi-Well Sync' : `Inspecting: ${activeWellId}`}
              </span>
              {reading?.cycleNumber && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] hidden md:inline-flex">
                  Cycle {reading.cycleNumber} ({reading.cycleId})
                </span>
              )}
              {reading?.phase && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase hidden sm:inline-flex ${
                  reading.phase === 'injection'
                    ? 'bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]'
                    : reading.phase === 'soak'
                    ? 'bg-[#FFEDD5] text-[#C2410C] border border-[#FED7AA]'
                    : 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]'
                }`}>
                  {reading.phase}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#64748B] font-medium hidden sm:block">
              Simulated time-series telemetry synchronized across all Baghewala wells
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Play/Pause on header bar */}
          <button
            onClick={togglePlay}
            className={`px-3 py-1.5 rounded-xl font-bold text-[12px] flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              isPlaying
                ? 'bg-[#D32F2F] text-white hover:bg-[#B71C1C]'
                : 'bg-[#16A34A] text-white hover:bg-[#15803D]'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          {/* Frame Indicator Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#CBD5E1] rounded-lg text-[11px] font-mono font-bold text-[#334155]">
            <span>Frame:</span>
            <span className="text-[#0F172A] font-black">{currentFrame}</span>
            <span className="text-[#94A3B8]">/ {totalFrames}</span>
            <span className="text-[#D32F2F] font-black ml-1">({progressPercent}%)</span>
          </div>

          {/* Collapse / Expand */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl border border-[#CBD5E1] bg-white text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand Telemetry Controls' : 'Collapse Telemetry Controls'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Collapsible Body ── */}
      {!isCollapsed && (
        <div className="px-4 sm:px-6 py-3 space-y-3 bg-white">
          {/* Main Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* 1. Multi-Well Selector Dropdown */}
            <div className="flex items-center gap-2 bg-[#F8FAFC] px-3 py-1.5 rounded-xl border border-[#CBD5E1]">
              <label className="text-[11.5px] font-black text-[#475569] uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                <Globe className="w-3.5 h-3.5 text-[#D32F2F]" />
                Replay Focus:
              </label>
              <select
                value={activeWellId || 'BGW-001'}
                onChange={(e) => handleWellSelect(e.target.value)}
                className="bg-white border border-[#CBD5E1] rounded-lg px-2 py-1 text-[12px] font-bold text-[#0F172A] focus:outline-none focus:border-[#D32F2F] cursor-pointer"
              >
                <option value="ALL">🌐 All Wells (Field-Wide Multi-Well Sync)</option>
                <optgroup label="Individual Oil Wells">
                  {availableWells.map((wid) => (
                    <option key={wid} value={wid}>
                      {wid} — Heavy Oil Well
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* 2. Transport Player Controls */}
            <div className="flex items-center gap-1.5 bg-[#F8FAFC] p-1 rounded-xl border border-[#CBD5E1]">
              {/* Reset to Start */}
              <button
                onClick={handleReset}
                className="p-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer shadow-2xs"
                title="Reset simulation to frame 1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Step Back */}
              <button
                onClick={() => handleStep(-1)}
                className="p-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer shadow-2xs"
                title="Step backward 1 frame"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              {/* Play / Pause Main */}
              <button
                onClick={togglePlay}
                className={`px-3 py-1.5 rounded-lg font-bold text-[12px] flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  isPlaying
                    ? 'bg-[#D32F2F] text-white hover:bg-[#B71C1C]'
                    : 'bg-[#16A34A] text-white hover:bg-[#15803D]'
                }`}
                title={isPlaying ? 'Pause telemetry stream' : 'Play telemetry stream'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
              </button>

              {/* Step Forward */}
              <button
                onClick={() => handleStep(1)}
                className="p-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer shadow-2xs"
                title="Step forward 1 frame"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              {/* Speed Multipliers */}
              <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-[#CBD5E1] ml-1">
                {[1, 5, 10, 50].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSpeed(s)}
                    className={`px-2 py-0.5 text-[11px] font-black rounded cursor-pointer transition-all ${
                      speed === s
                        ? 'bg-[#0F172A] text-white'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Timestamp Pill */}
            <div className="hidden md:flex items-center gap-2 bg-[#F8FAFC] px-3 py-1.5 rounded-xl border border-[#CBD5E1] text-[11.5px] font-mono text-[#334155]">
              <span className="text-[#64748B] font-bold">Virtual Time:</span>
              <span className="text-[#0F172A] font-black">{reading?.timestamp || 'Time Series Sync'}</span>
            </div>
          </div>

          {/* Scrubber Timeline Slider */}
          <div className="space-y-1 bg-[#F8FAFC] px-3 py-2 rounded-xl border border-[#E2E8F0]">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#64748B]">
              <span>Timeline Scrubber ({currentFrame} / {totalFrames})</span>
              <span className="font-mono text-[#0F172A]">
                Timestamp: {reading?.timestamp || 'Operational Sync'}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={totalFrames - 1}
              value={scrubValue}
              onChange={handleScrubChange}
              onMouseUp={handleScrubCommit}
              onTouchEnd={handleScrubCommit}
              className="w-full accent-[#D32F2F] cursor-pointer h-1.5 bg-[#CBD5E1] rounded-lg"
            />
          </div>

          {/* Live Telemetry Sensor Metric Badges for Inspected Well */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-2 rounded-lg">
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Pump SPM</div>
              <div className="text-[15px] font-black text-[#0F172A]">
                {reading?.spm ? `${reading.spm.toFixed(1)} SPM` : '5.5 SPM'}
              </div>
              <div className="text-[9.5px] text-[#64748B]">Safe limit: {reading?.spmSafe || 4.9}</div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-2 rounded-lg">
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Oil Viscosity</div>
              <div className="text-[15px] font-black text-[#0F172A]">
                {reading?.viscosityCP ? `${Math.round(reading.viscosityCP).toLocaleString()} cP` : '1,250 cP'}
              </div>
              <div className="text-[9.5px] text-[#64748B]">Heavy Crude (17° API)</div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-2 rounded-lg">
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">BHP Pressure</div>
              <div className="text-[15px] font-black text-[#0F172A]">
                {reading?.pressureBar ? `${reading.pressureBar.toFixed(1)} bar` : '18.5 bar'}
              </div>
              <div className="text-[9.5px] text-[#64748B]">Hydrostatic head</div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-2 rounded-lg">
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Flow Rate</div>
              <div className="text-[15px] font-black text-[#0F172A]">
                {reading?.flowRateBpd ? `${reading.flowRateBpd.toFixed(1)} BPD` : '28.5 BPD'}
              </div>
              <div className="text-[9.5px] text-[#64748B]">Surface production</div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-2 rounded-lg">
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Res. Temp</div>
              <div className="text-[15px] font-black text-[#0F172A]">
                {reading?.temperatureC ? `${reading.temperatureC.toFixed(1)} °C` : '68.0 °C'}
              </div>
              <div className="text-[9.5px] text-[#64748B]">Thermal profile</div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-2 rounded-lg">
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Rod Float Risk</div>
              <div className="text-[15px] font-black flex items-center gap-1 text-[#D32F2F]">
                {reading?.rodFloatingRisk ? `${reading.rodFloatingRisk}%` : '18.5%'}
                <span className={`text-[9.5px] px-1 py-0.2 rounded font-black ${
                  reading?.rodFloatingStatus === 'CRITICAL'
                    ? 'bg-[#FEF2F2] text-[#B91C1C]'
                    : reading?.rodFloatingStatus === 'MEDIUM'
                    ? 'bg-[#FFFBEB] text-[#B45309]'
                    : 'bg-[#F0FDF4] text-[#15803D]'
                }`}>
                  {reading?.rodFloatingStatus || 'LOW'}
                </span>
              </div>
              <div className="text-[9.5px] text-[#64748B]">Kinematic risk</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
