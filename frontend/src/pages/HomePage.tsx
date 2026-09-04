import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, Activity, Cpu, Brain, Shield, TrendingUp, Layers } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

// ─── Interactive Nav Structure ───────────────────────────────────────────
interface NavSubItem {
  name: string;
  desc: string;
  action: 'scroll' | 'route';
  target: string;
}

interface NavItem {
  label: string;
  sectionId: string;
  subItems: NavSubItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Platform Overview',
    sectionId: 'platform',
    subItems: [
      { name: 'Asset Overview', desc: 'Baghewala heavy oil reservoir & CSS context', action: 'scroll', target: 'platform' },
      { name: 'Field Architecture', desc: 'Well-to-surface digital twin topology', action: 'scroll', target: 'digital-twin' },
      { name: 'Core Capabilities', desc: 'Full suite of intelligence modules', action: 'scroll', target: 'optimization' },
    ],
  },
  {
    label: 'Digital Twin',
    sectionId: 'digital-twin',
    subItems: [
      { name: '3D Wellbore & Surface Model', desc: 'Physics-informed well twin visualization', action: 'route', target: '/app/digital-twin' },
      { name: 'Dynacard Simulation Lab', desc: 'Surface & downhole pump stroke analysis', action: 'route', target: '/app/simulation-lab' },
      { name: 'System Architecture', desc: 'Reservoir-to-surface layers overview', action: 'scroll', target: 'digital-twin' },
    ],
  },
  {
    label: 'Optimization',
    sectionId: 'optimization',
    subItems: [
      { name: 'Joint CSS + SRP Optimizer', desc: 'Multi-objective Pareto optimization engine', action: 'route', target: '/app/joint-optimizer' },
      { name: 'AI Production Forecasting', desc: 'XGBoost forecasting with SHAP explainability', action: 'route', target: '/app/ai/forecast' },
      { name: 'Optimization Capabilities', desc: 'Explore AI surrogate models', action: 'scroll', target: 'optimization' },
    ],
  },
  {
    label: 'Field Operations',
    sectionId: 'field-operations',
    subItems: [
      { name: 'Operations Command Center', desc: 'Live SCADA & telemetry dashboard', action: 'route', target: '/app/command-center' },
      { name: 'Baghewala Well Explorer', desc: 'All 23 active heavy oil wells', action: 'route', target: '/app/well-explorer' },
      { name: 'Live Field Well Status', desc: 'Production rates and equipment health', action: 'scroll', target: 'field-operations' },
    ],
  },
  {
    label: 'Governance',
    sectionId: 'governance',
    subItems: [
      { name: 'Engineering Approvals', desc: '4-eye verification workflow for setpoints', action: 'route', target: '/app/approvals' },
      { name: 'Audit Trail & Compliance', desc: 'Regulatory logs & change history', action: 'route', target: '/app/audit-logs' },
      { name: 'Governance Standards', desc: 'Safety envelopes & change controls', action: 'scroll', target: 'governance' },
    ],
  },
];

// ─── Slides — 3 oilfield images like OIL India website ────────────────────
const SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=1920&q=90&fit=crop',
    title: 'WELL INTELLIGENCE',
    subtitle: '& DIGITAL TWIN',
    caption: 'AI-enabled well-to-surface optimization at Baghewala, Rajasthan',
  },
  {
    image: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df7b?w=1920&q=90&fit=crop',
    title: 'CYCLIC STEAM',
    subtitle: 'STIMULATION',
    caption: 'Optimize steam injection parameters to maximize heavy oil recovery',
  },
  {
    image: 'https://images.unsplash.com/photo-1623148962862-3ae6a32e7cf0?w=1920&q=90&fit=crop',
    title: 'SUCKER ROD PUMP',
    subtitle: 'OPTIMIZATION',
    caption: 'Real-time SRP monitoring and joint CSS+SRP optimization engine',
  },
];

const FIELD_STATS = [
  { value: '2,840', unit: 'BOPD',     label: 'Total Field Production',   delta: '↑ 6.4%' },
  { value: '23',    unit: 'Wells',    label: 'Active Producing Wells',    delta: '3 attention' },
  { value: '3.6',   unit: 'bbl/bbl', label: 'Average Steam-Oil Ratio',   delta: '↓ 10.2%' },
  { value: '78%',   unit: '',        label: 'Equipment Health Index',    delta: '23 monitored' },
];

const MODULES = [
  {
    icon: <Layers className="w-7 h-7" />,
    title: 'Well-to-Surface Digital Twin',
    desc: 'Interactive 3D model of the complete wellbore system — reservoir, casing, sucker rod pump, and surface — driven by physics simulation.',
  },
  {
    icon: <Brain className="w-7 h-7" />,
    title: 'AI-Powered Production Intelligence',
    desc: 'XGBoost production forecasting and failure risk assessment with SHAP explainability for every prediction at the field level.',
  },
  {
    icon: <Activity className="w-7 h-7" />,
    title: 'Joint CSS + SRP Optimization',
    desc: 'Simultaneously optimize Cyclic Steam Stimulation and Sucker Rod Pump parameters to maximize oil recovery and minimize SOR.',
  },
  {
    icon: <Cpu className="w-7 h-7" />,
    title: 'Simulation Laboratory',
    desc: 'Run what-if scenarios against the digital twin before field implementation. Compare current vs simulated outcomes in real time.',
  },
  {
    icon: <TrendingUp className="w-7 h-7" />,
    title: 'Production Monitoring & Analytics',
    desc: 'Field-level and well-level production dashboards with trend analysis, equipment health tracking, and automated alert management.',
  },
  {
    icon: <Shield className="w-7 h-7" />,
    title: 'Engineering Governance & Approvals',
    desc: 'Structured recommendation-to-approval workflow with complete audit trail for all optimization decisions and parameter changes.',
  },
];

const DEMO_WELLS = [
  { id: 'BGW-014', status: 'High Risk', prod: '24.8 BPD', temp: '74 °C', risk: 'High',    statusColor: '#B71C1C', statusBg: '#FFEBEE' },
  { id: 'BGW-001', status: 'Producing', prod: '31.2 BPD', temp: '82 °C', risk: 'Low',     statusColor: '#1B5E20', statusBg: '#E8F5E9' },
  { id: 'BGW-007', status: 'Critical',  prod: '18.4 BPD', temp: '68 °C', risk: 'High',    statusColor: '#B71C1C', statusBg: '#FFEBEE' },
  { id: 'BGW-004', status: 'Producing', prod: '33.1 BPD', temp: '81 °C', risk: 'Low',     statusColor: '#1B5E20', statusBg: '#E8F5E9' },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scrolled, setScrolled]         = useState(false);

  // ── Scroll listener for sticky header shadow ──────────────────────────
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // ── Gentle title text rotation every 6s ───────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // ── Smooth Scroll Helper ──────────────────────────────────────────────
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -76;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: '16px' }}>

      {/* ══ HEADER (Clean light government PSU header) ════════════════════ */}
      <header className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${scrolled ? 'shadow-md border-b-2 border-[#D32F2F]' : 'border-b border-[#E2E8F0]'}`}>
        <div className="max-w-7xl mx-auto px-8 flex items-center h-[74px] gap-8">

          {/* OIL Logo — mimics actual OIL India logo */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 flex-shrink-0 cursor-pointer select-none"
            title="Oil India Limited — Home"
          >
            <svg width="44" height="48" viewBox="0 0 44 48" fill="none">
              <circle cx="22" cy="13" r="11" fill="#D32F2F"/>
              <circle cx="22" cy="13" r="5.5" fill="#fff"/>
              <rect x="19.5" y="24" width="5" height="20" fill="#D32F2F"/>
              <rect x="11" y="42" width="22" height="4" rx="2" fill="#D32F2F"/>
            </svg>
            <div className="border-l border-[#E2E8F0] pl-4">
              <div className="font-black text-[#1E293B] tracking-wide leading-tight" style={{ fontSize: '15px' }}>OIL INDIA LIMITED</div>
              <div className="text-[#64748B] leading-tight mt-0.5" style={{ fontSize: '11px' }}>Conquering Newer Horizons</div>
            </div>
          </div>

          {/* Nav links — Fully clickable with smooth scroll & quick module links */}
          <nav className="hidden lg:flex items-center gap-1 ml-4 flex-1">
            {NAV_ITEMS.map(item => (
              <div key={item.label} className="relative group">
                <button
                  type="button"
                  onClick={() => scrollToSection(item.sectionId)}
                  className="px-3.5 py-6 font-semibold text-[#374151] hover:text-[#D32F2F] border-b-2 border-transparent hover:border-[#D32F2F] transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer focus:outline-none"
                  style={{ fontSize: '15px' }}
                >
                  <span>{item.label}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#D32F2F] group-hover:rotate-180 transition-transform duration-200" />
                </button>

                {/* Dropdown Menu */}
                <div className="absolute top-full left-0 hidden group-hover:block pt-1 z-50 animate-fadeIn">
                  <div className="bg-white shadow-xl border border-slate-200 rounded-md py-2 w-72">
                    <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Navigation</span>
                      <button
                        type="button"
                        onClick={() => scrollToSection(item.sectionId)}
                        className="text-[11px] font-semibold text-[#D32F2F] hover:underline cursor-pointer"
                      >
                        Scroll to Section ↓
                      </button>
                    </div>
                    {item.subItems.map(sub => (
                      <button
                        key={sub.name}
                        type="button"
                        onClick={() => {
                          if (sub.action === 'scroll') {
                            scrollToSection(sub.target);
                          } else {
                            navigate(isAuthenticated ? sub.target : '/login');
                          }
                        }}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-[#F8FAFC] transition-colors flex flex-col cursor-pointer group/item"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-semibold text-[#1E293B] group-hover/item:text-[#D32F2F] transition-colors">
                            {sub.name}
                          </span>
                          {sub.action === 'route' && (
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover/item:text-[#D32F2F] transition-colors" />
                          )}
                        </div>
                        <span className="text-[11px] text-[#64748B] line-clamp-1 mt-0.5">{sub.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </nav>

          {/* CTA */}
          <div className="ml-auto flex-shrink-0">
            <button
              onClick={() => navigate(isAuthenticated ? '/app/command-center' : '/login')}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#D32F2F] text-white font-semibold rounded-sm hover:bg-[#B71C1C] transition-colors shadow-sm cursor-pointer"
              style={{ fontSize: '14px' }}
            >
              <span>{isAuthenticated ? 'Command Center' : 'Operational Access'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ══ HERO — Dynamic Video Background (Official Oil India Limited Video) ══ */}
      <section className="relative overflow-hidden bg-black flex items-center" style={{ height: '90vh', minHeight: 560 }}>

        {/* ── Dynamic Video Background (Official Oil India Limited Video) ── */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{ filter: 'brightness(0.78) contrast(1.06)' }}
        >
          <source src="https://www.oil-india.com/files/banner_videos/Landing%20Page%20Video%20Final.webm" type="video/webm" />
          <source src="https://www.oil-india.com/files/banner_videos/Landing%20Page%20Video%20Final.mp4" type="video/mp4" />
        </video>

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 z-[1]"
             style={{ background: 'linear-gradient(to right, rgba(8,12,25,0.85) 0%, rgba(8,12,25,0.60) 55%, rgba(8,12,25,0.20) 100%)' }} />

        {/* Subtle bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 z-[1]"
             style={{ background: 'linear-gradient(to top, rgba(8,12,25,0.6), transparent)' }} />

        {/* ── Hero content ─────────────────────────────────────────── */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-8">
          <div className="max-w-3xl py-12" key={currentSlide}
               style={{ animation: 'slideUp 0.6s ease forwards' }}>

            {/* Red horizontal line + tag */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-[2px] bg-[#D32F2F]" />
              <span style={{ fontSize: '14px' }}
                    className="font-bold text-[#D32F2F] uppercase tracking-[0.18em]">
                Baghewala Field · Rajasthan · India
              </span>
            </div>

            {/* Slide title */}
            <h1 className="text-white font-black leading-[1.02] mb-5"
                style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}>
              {SLIDES[currentSlide].title}<br />
              <span className="text-[#D32F2F]">{SLIDES[currentSlide].subtitle}</span>
            </h1>

            <p className="text-white/75 leading-relaxed mb-8 max-w-2xl" style={{ fontSize: '18px' }}>
              {SLIDES[currentSlide].caption}
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 px-7 py-3.5 bg-[#D32F2F] text-white font-bold rounded-sm hover:bg-[#B71C1C] transition-colors shadow-md"
                style={{ fontSize: '15px' }}>
                Explore Digital Twin <ArrowRight className="w-5 h-5" />
              </button>
              <a href="#platform"
                 className="flex items-center gap-2 px-7 py-3.5 font-bold text-white border border-white/40 rounded-sm hover:bg-white/10 hover:border-white/70 transition-colors"
                 style={{ fontSize: '15px' }}>
                View Platform
              </a>
            </div>

            {/* Field stats inline */}
            <div className="flex flex-wrap gap-8">
              {FIELD_STATS.map(({ value, unit, label }) => (
                <div key={label} className="border-l-2 border-[#D32F2F] pl-4">
                  <div className="font-bold text-white" style={{ fontSize: '24px' }}>
                    {value} <span className="font-normal text-white/55" style={{ fontSize: '14px' }}>{unit}</span>
                  </div>
                  <div className="text-white/50 mt-0.5" style={{ fontSize: '13px' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ DARK STATS STRIP ════════════════════════════════════════════ */}
      <section style={{ background: '#111827' }} className="py-12">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/10">
            {[
              { v: '2,840', u: 'BOPD',    l: 'Total Field Production',  s: '↑ 6.4% this month' },
              { v: '23',    u: 'Wells',   l: 'Active Producing Wells',   s: '3 require attention' },
              { v: '3.6',   u: 'bbl/bbl', l: 'Average Steam-Oil Ratio', s: '↓ 10.2% improvement' },
              { v: '78%',   u: '',        l: 'Equipment Health Index',   s: '23 wells monitored' },
            ].map(({ v, u, l, s }) => (
              <div key={l} className="text-center px-8 py-3">
                <div className="font-black text-[#D32F2F]" style={{ fontSize: '36px' }}>
                  {v}<span className="font-normal text-white/50 ml-2" style={{ fontSize: '16px' }}>{u}</span>
                </div>
                <div className="text-white font-semibold mt-2" style={{ fontSize: '15px' }}>{l}</div>
                <div className="text-white/40 mt-1" style={{ fontSize: '13px' }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ABOUT SECTION ═══════════════════════════════════════════════ */}
      <section className="py-20 bg-white border-t border-[#E2E8F0]" id="platform">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            {/* Left */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1.5 h-9 bg-[#D32F2F] rounded" />
                <h2 className="font-bold text-[#1E293B]" style={{ fontSize: '26px' }}>
                  Digital Twin Operations Platform
                </h2>
              </div>
              <p className="text-[#475569] leading-relaxed mb-4" style={{ fontSize: '16px' }}>
                The Baghewala field in Rajasthan, India is one of the key heavy oil producing assets of
                Oil India Limited. Producing heavy crude with API gravity below 20°, the field requires
                Cyclic Steam Stimulation (CSS) to reduce oil viscosity and enable pumping via Sucker Rod Pump.
              </p>
              <p className="text-[#475569] leading-relaxed mb-8" style={{ fontSize: '16px' }}>
                This platform provides a comprehensive digital twin connecting reservoir physics to surface
                operations, enabling engineers to simulate, optimize, and govern well operations with
                AI-assisted decision support.
              </p>

              <div className="grid grid-cols-2 gap-5 mb-8">
                {[
                  { label: 'Organization', value: 'Oil India Limited' },
                  { label: 'Field Location', value: 'Baghewala, Rajasthan' },
                  { label: 'Well Type', value: 'Heavy Oil — CSS + SRP' },
                  { label: 'Horizon', value: 'Baghewala Sand Member' },
                ].map(({ label, value }) => (
                  <div key={label} className="py-3 border-b border-[#F1F5F9]">
                    <p className="text-[#94A3B8] uppercase font-semibold tracking-wide" style={{ fontSize: '11px' }}>{label}</p>
                    <p className="font-bold text-[#1E293B] mt-1" style={{ fontSize: '15px' }}>{value}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 px-6 py-3 bg-[#D32F2F] text-white font-bold rounded-sm hover:bg-[#B71C1C] transition-colors"
                style={{ fontSize: '15px' }}>
                Access Operations Platform <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right — well table */}
            <div id="field-operations" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1.5 h-9 bg-[#D32F2F] rounded" />
                <h2 className="font-bold text-[#1E293B]" style={{ fontSize: '26px' }}>Field Well Status</h2>
              </div>

              <div className="border border-[#E2E8F0] rounded-sm overflow-hidden mb-6">
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                      {['Well ID', 'Status', 'Production', 'Temp.', 'Risk'].map(h => (
                        <th key={h} className="text-left py-3 px-4 font-bold text-[#64748B] uppercase tracking-wider" style={{ fontSize: '12px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DEMO_WELLS.map(w => (
                      <tr key={w.id} className="hover:bg-[#FAFBFC] transition-colors border-b border-[#F1F5F9] last:border-0">
                        <td className="py-3.5 px-4 font-bold text-[#1E3A5F]" style={{ fontSize: '14px' }}>{w.id}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded font-semibold"
                                style={{ fontSize: '12px', background: w.statusBg, color: w.statusColor, border: `1px solid ${w.statusColor}30` }}>
                            {w.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#374151]" style={{ fontSize: '14px' }}>{w.prod}</td>
                        <td className="py-3.5 px-4 text-[#374151]" style={{ fontSize: '14px' }}>{w.temp}</td>
                        <td className="py-3.5 px-4 font-bold" style={{ fontSize: '14px', color: w.statusColor }}>{w.risk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
                  <span className="text-[#64748B]" style={{ fontSize: '13px' }}>Showing 4 of 23 wells</span>
                  <button onClick={() => navigate(isAuthenticated ? '/app/well-explorer' : '/login')}
                          className="text-[#D32F2F] font-semibold hover:underline cursor-pointer" style={{ fontSize: '13px' }}>
                    View All Wells →
                  </button>
                </div>
              </div>

              {/* Architecture & Digital Twin */}
              <div id="digital-twin" className="border border-[#E2E8F0] rounded-sm p-5 bg-[#FAFBFC] scroll-mt-24">
                <div id="architecture" className="flex items-center justify-between mb-4">
                  <p className="font-bold text-[#64748B] uppercase tracking-wider" style={{ fontSize: '12px' }}>
                    Well-to-Surface System Architecture
                  </p>
                  <button onClick={() => navigate(isAuthenticated ? '/app/digital-twin' : '/login')}
                          className="text-[#D32F2F] text-[12px] font-bold hover:underline flex items-center gap-1 cursor-pointer">
                    Launch 3D Twin →
                  </button>
                </div>
                <div className="flex flex-col gap-0">
                  {[
                    { n: 'Reservoir (852m depth)',   c: '#92400E', bg: '#FEF3C7' },
                    { n: 'Wellbore + Casing',         c: '#1E3A5F', bg: '#DBEAFE' },
                    { n: 'Sucker Rod Pump (SRP)',     c: '#1E3A5F', bg: '#EFF6FF' },
                    { n: 'Wellhead + Surface',        c: '#374151', bg: '#F1F5F9' },
                    { n: 'AI Optimization Engine',    c: '#14532D', bg: '#DCFCE7' },
                  ].map(({ n, c, bg }, i) => (
                    <div key={n} className="flex items-stretch gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold flex-shrink-0"
                             style={{ borderColor: c, color: c, fontSize: '12px' }}>
                          {i + 1}
                        </div>
                        {i < 4 && <div className="w-0.5 h-4 bg-[#E2E8F0]" />}
                      </div>
                      <div className="pb-4 flex items-center">
                        <span className="px-3 py-1.5 rounded font-medium" style={{ background: bg, color: c, fontSize: '13px' }}>
                          {n}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PLATFORM MODULES & OPTIMIZATION ════════════════════════════════ */}
      <section id="optimization" className="py-20 bg-[#F4F6F8] border-t border-[#E2E8F0] scroll-mt-20">
        <div id="capabilities" className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-14 h-[2px] bg-[#D32F2F]" />
              <span className="font-bold text-[#D32F2F] uppercase tracking-[0.14em]" style={{ fontSize: '13px' }}>
                Platform Capabilities
              </span>
              <div className="w-14 h-[2px] bg-[#D32F2F]" />
            </div>
            <h2 className="font-bold text-[#1E293B] mb-3" style={{ fontSize: '28px' }}>
              Integrated Operations Intelligence
            </h2>
            <p className="text-[#64748B] max-w-2xl mx-auto" style={{ fontSize: '16px' }}>
              End-to-end platform covering monitoring, simulation, optimization, and governance
              for Baghewala field heavy oil operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MODULES.map(({ icon, title, desc }) => (
              <div key={title}
                   className="bg-white border border-[#E2E8F0] rounded-sm p-6 hover:border-[#D32F2F] hover:shadow-md cursor-pointer group transition-all duration-200"
                   onClick={() => navigate(isAuthenticated ? '/app/joint-optimizer' : '/login')}>
                <div className="w-12 h-12 rounded bg-[#FFEBEE] flex items-center justify-center mb-5 text-[#D32F2F] group-hover:bg-[#D32F2F] group-hover:text-white transition-colors duration-200">
                  {icon}
                </div>
                <h3 className="font-bold text-[#1E293B] mb-2 group-hover:text-[#D32F2F] transition-colors" style={{ fontSize: '16px' }}>
                  {title}
                </h3>
                <p className="text-[#64748B] leading-relaxed" style={{ fontSize: '14px' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ GOVERNANCE & ENGINEERING COMPLIANCE ══════════════════════════ */}
      <section id="governance" className="py-16 bg-white border-t border-[#E2E8F0] scroll-mt-20">
        <div className="max-w-7xl mx-auto px-8">
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm p-8 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1.5 h-8 bg-[#D32F2F] rounded" />
                <h3 className="font-bold text-[#1E293B]" style={{ fontSize: '22px' }}>
                  Engineering Governance & 4-Eye Approval Framework
                </h3>
              </div>
              <p className="text-[#64748B] leading-relaxed mb-4" style={{ fontSize: '15px' }}>
                All automated setpoint adjustments and steam injection schedules generated by the digital twin
                are subject to multi-tier engineering verification. Complete audit logs and compliance with
                DGMS &amp; OISD safety protocols are maintained.
              </p>
              <div className="flex flex-wrap gap-2 text-[12px] font-semibold text-[#475569]">
                <span className="bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-sm">✓ Role-Based Access Control</span>
                <span className="bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-sm">✓ Cryptographic Audit Trail</span>
                <span className="bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-sm">✓ Safety Envelope Enforcement</span>
                <span className="bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-sm">✓ DGMS &amp; OISD Compliant</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => navigate(isAuthenticated ? '/app/approvals' : '/login')}
                className="flex items-center gap-2 px-6 py-3.5 bg-[#1E293B] text-white font-bold rounded-sm hover:bg-[#0F172A] transition-colors cursor-pointer shadow-sm"
                style={{ fontSize: '15px' }}
              >
                Access Governance Portal <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA STRIP ════════════════════════════════════════════════════ */}
      <section style={{ background: '#1E293B' }} className="py-16">
        <div className="max-w-7xl mx-auto px-8 flex flex-col lg:flex-row items-center justify-between gap-10">
          <div>
            <h2 className="font-bold text-white mb-3" style={{ fontSize: '26px' }}>
              Access the Operations Platform
            </h2>
            <p className="text-white/60 max-w-xl" style={{ fontSize: '16px' }}>
              Oil India Limited authorized personnel — sign in with your Employee ID to access
              the complete digital operations platform for Baghewala field.
            </p>
          </div>
          <div className="flex-shrink-0 text-center">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-3 px-8 py-4 bg-[#D32F2F] text-white font-bold rounded-sm hover:bg-[#B71C1C] transition-colors"
              style={{ fontSize: '16px' }}>
              Sign In to Platform <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-white/30 mt-3" style={{ fontSize: '12px' }}>Authorized Personnel Only</p>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════ */}
      <footer style={{ background: '#0F172A', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <svg width="36" height="40" viewBox="0 0 44 48" fill="none">
                  <circle cx="22" cy="13" r="11" fill="#D32F2F"/>
                  <circle cx="22" cy="13" r="5.5" fill="#fff"/>
                  <rect x="19.5" y="24" width="5" height="20" fill="#D32F2F"/>
                  <rect x="11" y="42" width="22" height="4" rx="2" fill="#D32F2F"/>
                </svg>
                <div>
                  <div className="font-black text-white tracking-wide" style={{ fontSize: '14px' }}>OIL INDIA LIMITED</div>
                  <div className="text-white/35" style={{ fontSize: '11px', marginTop: 2 }}>A Navratna Government of India Enterprise</div>
                </div>
              </div>
              <p className="text-white/40 leading-relaxed" style={{ fontSize: '13px' }}>
                Well Intelligence &amp; Digital Twin<br />Baghewala Field Operations Platform<br />
                AI-enabled optimization for heavy oil operations.
              </p>
            </div>

            {/* Platform */}
            <div>
              <p className="font-bold text-white/50 uppercase tracking-wider mb-4" style={{ fontSize: '12px' }}>Platform Modules</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {['Command Center','Well Explorer','Digital Twin','Simulation Lab','CSS Optimizer','SRP Optimizer','AI Intelligence','Governance'].map(m => (
                  <button key={m} onClick={() => navigate('/login')}
                          className="text-left text-white/40 hover:text-white/70 transition-colors"
                          style={{ fontSize: '13px' }}>{m}</button>
                ))}
              </div>
            </div>

            {/* Field info */}
            <div>
              <p className="font-bold text-white/50 uppercase tracking-wider mb-4" style={{ fontSize: '12px' }}>Field Information</p>
              <div className="space-y-2.5">
                {[
                  { l: 'Field',    v: 'Baghewala, Rajasthan, India' },
                  { l: 'Operator', v: 'Oil India Limited (OIL)' },
                  { l: 'Type',     v: 'Cyclic Steam + SRP' },
                  { l: 'Data',     v: 'Prototype / Synthetic' },
                ].map(({ l, v }) => (
                  <div key={l} className="flex gap-3">
                    <span className="text-white/30 flex-shrink-0 w-16" style={{ fontSize: '13px' }}>{l}:</span>
                    <span className="text-white/55" style={{ fontSize: '13px' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-white/8 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-white/30" style={{ fontSize: '13px' }}>
              © 2026 Oil India Limited. Well Intelligence &amp; Digital Twin — Baghewala Field Operations Platform.
            </p>
            <p className="text-white/20" style={{ fontSize: '12px' }}>
              Prototype Environment — Synthetic Data Only
            </p>
          </div>
        </div>
      </footer>

      {/* ── Ken Burns + slide-up CSS animations ──────────────────────── */}
      <style>{`
        @keyframes kenBurns {
          from { transform: scale(1.0); }
          to   { transform: scale(1.08); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};
