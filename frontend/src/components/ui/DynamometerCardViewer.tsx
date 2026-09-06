import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, AlertTriangle, CheckCircle2, ChevronDown, Download, 
  Eye, Info, RefreshCw, ShieldAlert, Sparkles, TrendingDown, Zap
} from 'lucide-react';
import { 
  wellsApi, 
  BackendDynamometerCard, 
  DynamometerPoint 
} from '../../services/api';

interface DynamometerCardViewerProps {
  wellId: string;
  onOptimizeClick?: () => void;
  showHistorySelector?: boolean;
}

export const DynamometerCardViewer: React.FC<DynamometerCardViewerProps> = ({
  wellId,
  onOptimizeClick,
  showHistorySelector = true,
}) => {
  const [cards, setCards] = useState<BackendDynamometerCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showDownhole, setShowDownhole] = useState<boolean>(true);
  const [showLimits, setShowLimits] = useState<boolean>(true);

  // Load cards for well
  useEffect(() => {
    if (!wellId) return;
    setLoading(true);
    wellsApi.getDynamometerCards(wellId, undefined, 12)
      .then((res) => {
        if (res.success && res.data.length > 0) {
          setCards(res.data);
          setSelectedCardId(res.data[0].cardId);
        } else {
          // Fallback to latest
          wellsApi.getLatestDynamometerCard(wellId).then((lRes) => {
            if (lRes.success && lRes.data) {
              setCards([lRes.data]);
              setSelectedCardId(lRes.data.cardId);
            }
          });
        }
      })
      .catch((err) => console.error('Failed to load dyno cards:', err))
      .finally(() => setLoading(false));
  }, [wellId]);

  const activeCard = useMemo(() => {
    return cards.find((c) => c.cardId === selectedCardId) || cards[0] || null;
  }, [cards, selectedCardId]);

  // SVG dimensions and scaling
  const width = 640;
  const height = 360;
  const padding = { top: 28, right: 36, bottom: 44, left: 54 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const strokeMax = Math.max(80, activeCard?.strokeLengthIn || 72);
  const loadMax = 25.0; // 25 kN maximum scale for polished rod load

  const scaleX = (pos: number) => padding.left + (Math.max(0, Math.min(pos, strokeMax)) / strokeMax) * plotWidth;
  const scaleY = (ld: number) => padding.top + plotHeight - (Math.max(0, Math.min(ld, loadMax)) / loadMax) * plotHeight;

  const surfacePathD = useMemo(() => {
    if (!activeCard || !activeCard.surfacePoints || activeCard.surfacePoints.length === 0) return '';
    const pts = activeCard.surfacePoints;
    let d = `M ${scaleX(pts[0].position)} ${scaleY(pts[0].load)}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${scaleX(pts[i].position)} ${scaleY(pts[i].load)}`;
    }
    d += ' Z';
    return d;
  }, [activeCard]);

  const downholePathD = useMemo(() => {
    if (!activeCard || !activeCard.downholePoints || activeCard.downholePoints.length === 0) return '';
    const pts = activeCard.downholePoints;
    let d = `M ${scaleX(pts[0].position)} ${scaleY(pts[0].load)}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${scaleX(pts[i].position)} ${scaleY(pts[i].load)}`;
    }
    d += ' Z';
    return d;
  }, [activeCard]);

  // Severity & Diagnostic styling
  const diagnostic = activeCard?.diagnosticLabel || 'Normal Operation';
  const isRodFloating = diagnostic.toLowerCase().includes('floating');
  const isFluidPound = diagnostic.toLowerCase().includes('pound') || diagnostic.toLowerCase().includes('impact');

  const badgeColor = isRodFloating
    ? 'bg-red-50 text-red-700 border-red-200'
    : isFluidPound
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-bold text-slate-900">
              Dynamometer Card Diagnostic Analysis
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-slate-100 text-slate-700">
              {activeCard?.wellId || wellId}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time Surface & Pump Plunger Load vs Stroke Displacement curve (Baghewala SRP Twin)
          </p>
        </div>

        {/* History Selector & Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {showHistorySelector && cards.length > 1 && (
            <select
              value={selectedCardId || ''}
              onChange={(e) => setSelectedCardId(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-red-500"
            >
              {cards.map((c) => (
                <option key={c.cardId} value={c.cardId}>
                  {c.timestamp} — {c.diagnosticLabel.substring(0, 18)} ({c.peakLoadKN} kN)
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setShowDownhole(!showDownhole)}
              className={`px-2.5 py-1 rounded transition-colors ${
                showDownhole ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Downhole Plunger
            </button>
            <button
              onClick={() => setShowLimits(!showLimits)}
              className={`px-2.5 py-1 rounded transition-colors ${
                showLimits ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Limits (API RP 11L)
            </button>
          </div>
        </div>
      </div>

      {/* Main Plot + Diagnostic Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* SVG Dyno Plot (7 cols) */}
        <div className="lg:col-span-8 bg-slate-900 rounded-xl p-4 border border-slate-800 shadow-inner relative overflow-hidden">
          {/* Legend Overlay */}
          <div className="absolute top-4 left-6 flex items-center gap-4 text-xs font-medium z-10">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-slate-200">Surface Polished Rod</span>
            </div>
            {showDownhole && (
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-1.5 rounded-full bg-teal-400" />
                <span className="text-teal-300">Downhole Plunger Card</span>
              </div>
            )}
            {showLimits && (
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 border-t border-dashed border-amber-400" />
                <span className="text-amber-300">Allowable Load Envelope</span>
              </div>
            )}
          </div>

          {/* Dyno SVG Canvas */}
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
            {/* Grid lines */}
            {[0, 5, 10, 15, 20, 25].map((val) => (
              <g key={`y-${val}`}>
                <line
                  x1={padding.left}
                  y1={scaleY(val)}
                  x2={width - padding.right}
                  y2={scaleY(val)}
                  stroke="#334155"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 10}
                  y={scaleY(val) + 4}
                  fill="#94A3B8"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {val} kN
                </text>
              </g>
            ))}

            {[0, 20, 40, 60, 80, 100, 120].filter((v) => v <= strokeMax).map((pos) => (
              <g key={`x-${pos}`}>
                <line
                  x1={scaleX(pos)}
                  y1={padding.top}
                  x2={scaleX(pos)}
                  y2={height - padding.bottom}
                  stroke="#334155"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                />
                <text
                  x={scaleX(pos)}
                  y={height - padding.bottom + 18}
                  fill="#94A3B8"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {pos}"
                </text>
              </g>
            ))}

            {/* Axes */}
            <line
              x1={padding.left}
              y1={height - padding.bottom}
              x2={width - padding.right}
              y2={height - padding.bottom}
              stroke="#64748B"
              strokeWidth="1.5"
            />
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={height - padding.bottom}
              stroke="#64748B"
              strokeWidth="1.5"
            />

            {/* Axis Titles */}
            <text
              x={padding.left + plotWidth / 2}
              y={height - 10}
              fill="#CBD5E1"
              fontSize="11"
              fontWeight="bold"
              textAnchor="middle"
            >
              Stroke Position (inches)
            </text>
            <text
              x={14}
              y={padding.top + plotHeight / 2}
              fill="#CBD5E1"
              fontSize="11"
              fontWeight="bold"
              textAnchor="middle"
              transform={`rotate(-90, 14, ${padding.top + plotHeight / 2})`}
            >
              Rod Load (kN)
            </text>

            {/* Goodman Upper/Lower Stress Limits */}
            {showLimits && (
              <>
                <line
                  x1={padding.left}
                  y1={scaleY(21.5)}
                  x2={width - padding.right}
                  y2={scaleY(21.5)}
                  stroke="#F59E0B"
                  strokeWidth="1.2"
                  strokeDasharray="5 4"
                />
                <text
                  x={width - padding.right - 6}
                  y={scaleY(21.5) - 4}
                  fill="#F59E0B"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  Max Permissible Tension (21.5 kN)
                </text>
                <line
                  x1={padding.left}
                  y1={scaleY(6.5)}
                  x2={width - padding.right}
                  y2={scaleY(6.5)}
                  stroke="#EF4444"
                  strokeWidth="1.2"
                  strokeDasharray="5 4"
                />
                <text
                  x={width - padding.right - 6}
                  y={scaleY(6.5) + 12}
                  fill="#EF4444"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  Min Compression Limit / Floating Threshold (6.5 kN)
                </text>
              </>
            )}

            {/* Downhole Card Polygon */}
            {showDownhole && downholePathD && (
              <path
                d={downholePathD}
                fill="rgba(45, 212, 191, 0.12)"
                stroke="#2DD4BF"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
            )}

            {/* Surface Card Polygon */}
            {surfacePathD && (
              <path
                d={surfacePathD}
                fill="rgba(239, 68, 68, 0.18)"
                stroke="#EF4444"
                strokeWidth="2.6"
                strokeLinejoin="round"
              />
            )}

            {/* Rod Floating Detection Annotation on downstroke */}
            {isRodFloating && (
              <g transform={`translate(${scaleX(strokeMax * 0.45)}, ${scaleY(activeCard?.minLoadKN || 6.0) + 20})`}>
                <circle cx="0" cy="0" r="14" fill="rgba(239, 68, 68, 0.25)" className="animate-ping" />
                <circle cx="0" cy="0" r="5" fill="#EF4444" />
                <rect x="-60" y="-32" width="120" height="20" rx="4" fill="#991B1B" />
                <text x="0" y="-18" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">
                  ROD FLOATING LAG
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Diagnostic Breakdown Card (5 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Status Badge & Classification */}
          <div className={`p-4 rounded-xl border ${badgeColor} space-y-2`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">Automated Diagnosis</span>
              <span className="text-xs font-mono">{activeCard?.timestamp}</span>
            </div>
            <div className="flex items-center gap-2">
              {isRodFloating ? (
                <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0" />
              ) : isFluidPound ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              )}
              <span className="text-base font-black leading-tight">
                {diagnostic}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {isRodFloating
                ? 'Severe buoyant drag from cooling heavy crude (>1,800 cP) exceeds downward rod fall velocity. Carrier bar is separating from rod clamp on downstroke.'
                : isFluidPound
                ? 'Pump barrel is partially filled with gas or low fluid level. Downward plunger encounters liquid surface with high mechanical shock loading.'
                : 'Balanced kinematic cycle. Full pump chamber fillage with polished rod stress safely within API RP 11L Goodman boundaries.'}
            </p>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-1">
              <div className="text-slate-500 font-medium">Peak Load (PPRL)</div>
              <div className="text-base font-black text-slate-900">
                {activeCard?.peakLoadKN || 16.8} <span className="text-xs font-normal text-slate-500">kN</span>
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold">Max Limit: 21.5 kN</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-1">
              <div className="text-slate-500 font-medium">Minimum Load (MPRL)</div>
              <div className={`text-base font-black ${(activeCard?.minLoadKN || 7.2) < 7.0 ? 'text-red-600' : 'text-slate-900'}`}>
                {activeCard?.minLoadKN || 7.2} <span className="text-xs font-normal text-slate-500">kN</span>
              </div>
              <div className="text-[10px] text-slate-500">Safe Floor: 6.5 kN</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-1">
              <div className="text-slate-500 font-medium">Stroke Length</div>
              <div className="text-base font-black text-slate-900">
                {activeCard?.strokeLengthIn || 68.0}"
              </div>
              <div className="text-[10px] text-slate-500 font-mono">SPM: {activeCard?.spm || 5.5}</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-1">
              <div className="text-slate-500 font-medium">Cycle Work Area</div>
              <div className="text-base font-black text-slate-900">
                {activeCard?.cardAreaKNIn || 412} <span className="text-xs font-normal text-slate-500">kN·in</span>
              </div>
              <div className="text-[10px] text-teal-600 font-semibold">Pump Work Done</div>
            </div>
          </div>

          {/* Risk Level Gauges */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600">Rod Floating Risk</span>
                <span className={activeCard?.rodFloatingRisk && activeCard.rodFloatingRisk > 50 ? 'text-red-600 font-bold' : 'text-slate-700'}>
                  {activeCard?.rodFloatingRisk || 8.0}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    (activeCard?.rodFloatingRisk || 8.0) > 50 ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, activeCard?.rodFloatingRisk || 8.0)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600">Impact Loading / Fluid Pound Risk</span>
                <span className={activeCard?.fluidPoundRisk && activeCard.fluidPoundRisk > 50 ? 'text-amber-600 font-bold' : 'text-slate-700'}>
                  {activeCard?.fluidPoundRisk || 5.0}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    (activeCard?.fluidPoundRisk || 5.0) > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, activeCard?.fluidPoundRisk || 5.0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action CTA */}
          {onOptimizeClick && (
            <button
              onClick={onOptimizeClick}
              className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Optimize SRP Kinematic Setpoints →</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
