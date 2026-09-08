import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { 
  RotateCcw, Play, Pause, Layers, 
  Flame, Sliders, Maximize2, Minimize2, ArrowLeft,
  Eye, CheckCircle2, ChevronRight, Wind, Activity, Zap
} from 'lucide-react';

export type ViewMode = 'rendered' | 'wireframe' | 'xray' | 'thermal';
export type CameraPreset = 'full' | 'surface' | 'wellbore' | 'reservoir';
export type CSSPhase = 'injection' | 'soak' | 'production';

interface DigitalTwin3DProps {
  wellId?: string;
  activeComponent?: 'reservoir' | 'wellbore' | 'srp' | 'surface';
  onComponentSelect?: (component: 'reservoir' | 'wellbore' | 'srp' | 'surface') => void;
  // SRP parameters
  spm?: number;
  strokeLength?: number;
  isPumping?: boolean;
  // CSS parameters
  cssSteam?: number;      // Steam Volume in tons (e.g. 735)
  cssPressure?: number;   // Injection pressure in bar (e.g. 21)
  cssSoak?: number;       // Soak time in hours (e.g. 64)
  cssPhase?: CSSPhase;    // Active CSS cycle phase
  onCssPhaseChange?: (phase: CSSPhase) => void;
  onBack?: () => void;
  // Live Coupled Physics Telemetry
  reservoirTemp?: number;
  viscosityCp?: number;
  oilRateBpd?: number;
  onSteamChange?: (v: number) => void;
  onSpmChange?: (v: number) => void;
}

// ─── PROCEDURAL TEXTURE GENERATORS ───────────────────────────────────────────
const createSedimentaryStrataTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0.00, '#C9A982'); // Surface Sand
  grad.addColorStop(0.10, '#B39169'); // Sand-Shale interface
  grad.addColorStop(0.12, '#5A6577'); // Overburden Shale top
  grad.addColorStop(0.35, '#475364'); // Dense Overburden Shale
  grad.addColorStop(0.37, '#6E6B65'); // Siltstone Transition
  grad.addColorStop(0.68, '#7C786F'); // Evaporite & Dolomite
  grad.addColorStop(0.70, '#8C4E23'); // Baghewala Sand Member A (Heavy oil)
  grad.addColorStop(0.90, '#5C2D0C'); // Bitumen saturated zone
  grad.addColorStop(1.00, '#3A1C07'); // Basement formation
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 1024);

  for (let y = 0; y < 1024; y += 2) {
    const noise = Math.sin(y * 0.15) * 12 + Math.cos(y * 0.04) * 18;
    const alpha = (Math.sin(y * 0.8) + 1) * 0.08 + (Math.random() * 0.06);
    ctx.fillStyle = (y % 4 === 0) ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${alpha * 1.5})`;
    ctx.fillRect(0, y, 512, 1.5 + (noise % 2));
  }

  for (let i = 0; i < 40; i++) {
    const y = 720 + Math.random() * 280;
    const x = Math.random() * 512;
    ctx.fillStyle = 'rgba(20, 10, 5, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y, 35 + Math.random() * 50, 2 + Math.random() * 3, Math.random() * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
};

// ─── HIGH-FIDELITY PUMPJACK & SURFACE EQUIPMENT ───────────────────────────────
const PumpjackUnit: React.FC<{
  spm: number;
  isPlaying: boolean;
  wireframe: boolean;
  cssPhase: CSSPhase;
}> = ({ spm, isPlaying, wireframe, cssPhase }) => {
  const crankRef = useRef<THREE.Group>(null);
  const walkingBeamRef = useRef<THREE.Group>(null);
  const polishedRodRef = useRef<THREE.Mesh>(null);
  const steamVaporRef = useRef<THREE.Group>(null);

  // Metal materials
  const steelMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#334155',
    metalness: 0.88,
    roughness: 0.32,
    wireframe,
  }), [wireframe]);

  const industrialRedMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#B91C1C',
    metalness: 0.65,
    roughness: 0.28,
    wireframe,
  }), [wireframe]);

  const chromeMirrorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#F1F5F9',
    metalness: 0.98,
    roughness: 0.08,
    wireframe,
  }), [wireframe]);

  const darkCastIronMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0F172A',
    metalness: 0.92,
    roughness: 0.45,
    wireframe,
  }), [wireframe]);

  const safetyYellowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#EAB308',
    metalness: 0.3,
    roughness: 0.4,
    wireframe,
  }), [wireframe]);

  // CSS Steam Pipeline Material (Insulated silver with thermal expansion)
  const steamPipeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#E2E8F0',
    metalness: 0.9,
    roughness: 0.2,
    wireframe,
  }), [wireframe]);

  const steamInsulationBandMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#DC2626',
    metalness: 0.4,
    roughness: 0.5,
    wireframe,
  }), [wireframe]);

  const angleRef = useRef(0);

  // In CSS injection or soak phase, pump is paused or idling; in production phase it pumps actively
  const isPumpingActive = isPlaying && (cssPhase === 'production');

  useFrame(({ clock }, delta) => {
    if (isPumpingActive) {
      const speed = (spm * Math.PI * 2) / 60;
      angleRef.current += speed * delta;
      const angle = angleRef.current;
      const strokeAngle = Math.sin(angle) * 0.175;

      if (crankRef.current) crankRef.current.rotation.z = angle;
      if (walkingBeamRef.current) walkingBeamRef.current.rotation.z = strokeAngle;
      if (polishedRodRef.current) polishedRodRef.current.position.y = 1.38 + Math.sin(angle) * 0.32;
    }

    // Steam Vapor Animation at surface during CSS Injection
    if (steamVaporRef.current) {
      const t = clock.getElapsedTime() * 3;
      steamVaporRef.current.visible = (cssPhase === 'injection');
      steamVaporRef.current.position.y = 0.5 + Math.sin(t) * 0.06;
      steamVaporRef.current.scale.set(1 + Math.sin(t * 1.5) * 0.15, 1 + Math.cos(t) * 0.2, 1);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Heavy Structural Steel Skid Frame */}
      <mesh position={[0.2, 0.06, 0]} material={darkCastIronMat}>
        <boxGeometry args={[4.4, 0.12, 2.0]} />
      </mesh>

      {/* Concrete Mounting Base Pedestal */}
      <mesh position={[0.2, 0.16, 0]} material={steelMat}>
        <boxGeometry args={[4.2, 0.08, 1.8]} />
      </mesh>

      {/* Structural I-Beam Skid Rails */}
      <mesh position={[0.2, 0.24, 0.7]} material={steelMat}>
        <boxGeometry args={[4.2, 0.08, 0.12]} />
      </mesh>
      <mesh position={[0.2, 0.24, -0.7]} material={steelMat}>
        <boxGeometry args={[4.2, 0.08, 0.12]} />
      </mesh>

      {/* Samson Post (Heavy 4-Legged Steel A-Frame Truss) */}
      <group position={[0, 0.28, 0]}>
        <mesh position={[-0.45, 0.95, 0.5]} rotation={[0, 0, -0.19]} material={steelMat}>
          <boxGeometry args={[0.1, 1.95, 0.1]} />
        </mesh>
        <mesh position={[0.45, 0.95, 0.5]} rotation={[0, 0, 0.19]} material={steelMat}>
          <boxGeometry args={[0.1, 1.95, 0.1]} />
        </mesh>
        <mesh position={[-0.45, 0.95, -0.5]} rotation={[0, 0, -0.19]} material={steelMat}>
          <boxGeometry args={[0.1, 1.95, 0.1]} />
        </mesh>
        <mesh position={[0.45, 0.95, -0.5]} rotation={[0, 0, 0.19]} material={steelMat}>
          <boxGeometry args={[0.1, 1.95, 0.1]} />
        </mesh>
        {/* Diagonal Cross-Bracing Struts */}
        <mesh position={[0, 0.9, 0.5]} material={steelMat}>
          <boxGeometry args={[0.7, 0.05, 0.05]} />
        </mesh>
        <mesh position={[0, 0.9, -0.5]} material={steelMat}>
          <boxGeometry args={[0.7, 0.05, 0.05]} />
        </mesh>
        <mesh position={[0, 1.4, 0.5]} material={steelMat}>
          <boxGeometry args={[0.5, 0.04, 0.04]} />
        </mesh>
        <mesh position={[0, 1.4, -0.5]} material={steelMat}>
          <boxGeometry args={[0.5, 0.04, 0.04]} />
        </mesh>
        {/* Center Bearing Saddle Pedestal */}
        <mesh position={[0, 1.92, 0]} material={chromeMirrorMat}>
          <boxGeometry args={[0.35, 0.14, 1.0]} />
        </mesh>
      </group>

      {/* Walking Beam Assembly (Pivots at [0, 2.15, 0]) */}
      <group ref={walkingBeamRef} position={[0, 2.15, 0]}>
        <mesh position={[-0.1, 0, 0]} material={industrialRedMat}>
          <boxGeometry args={[3.4, 0.26, 0.18]} />
        </mesh>
        <mesh position={[-0.1, 0.14, 0]} material={industrialRedMat}>
          <boxGeometry args={[3.45, 0.03, 0.26]} />
        </mesh>
        <mesh position={[-0.1, -0.14, 0]} material={industrialRedMat}>
          <boxGeometry args={[3.45, 0.03, 0.26]} />
        </mesh>

        {/* Horse Head (Front Curved Arc with Wire Rope Grooves) */}
        <group position={[-1.82, -0.05, 0]}>
          <mesh material={industrialRedMat}>
            <boxGeometry args={[0.32, 0.9, 0.22]} />
          </mesh>
          <mesh position={[-0.15, -0.22, 0]} rotation={[0, 0, 0.32]} material={industrialRedMat}>
            <boxGeometry args={[0.16, 0.7, 0.2]} />
          </mesh>
          {/* Dual Wireline Bridle Cables */}
          <mesh position={[-0.22, -0.72, 0.07]} material={chromeMirrorMat}>
            <cylinderGeometry args={[0.012, 0.012, 0.9, 12]} />
          </mesh>
          <mesh position={[-0.22, -0.72, -0.07]} material={chromeMirrorMat}>
            <cylinderGeometry args={[0.012, 0.012, 0.9, 12]} />
          </mesh>
          {/* Carrier Bar */}
          <mesh position={[-0.22, -1.18, 0]} material={darkCastIronMat}>
            <boxGeometry args={[0.08, 0.06, 0.26]} />
          </mesh>
        </group>

        {/* Rear Equalizer Bar & Bearing */}
        <mesh position={[1.6, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]} material={chromeMirrorMat}>
          <cylinderGeometry args={[0.06, 0.06, 0.7, 16]} />
        </mesh>
      </group>

      {/* Crank & Counterweights Assembly */}
      <group position={[1.4, 0.75, 0]}>
        <mesh position={[-0.1, 0, 0]} material={darkCastIronMat}>
          <boxGeometry args={[0.75, 0.8, 0.6]} />
        </mesh>
        <mesh material={chromeMirrorMat} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 1.05, 16]} />
        </mesh>

        <group ref={crankRef}>
          {/* Front Crank & Counterweight */}
          <group position={[0, 0, 0.5]}>
            <mesh position={[0, 0.3, 0]} material={steelMat}>
              <boxGeometry args={[0.12, 0.72, 0.06]} />
            </mesh>
            <mesh position={[0, 0.42, 0]} material={industrialRedMat}>
              <boxGeometry args={[0.42, 0.45, 0.12]} />
            </mesh>
            <mesh position={[0, 0.42, 0.07]} material={chromeMirrorMat}>
              <boxGeometry args={[0.08, 0.38, 0.02]} />
            </mesh>
            <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]} material={chromeMirrorMat}>
              <cylinderGeometry args={[0.035, 0.035, 0.14, 16]} />
            </mesh>
          </group>

          {/* Back Crank & Counterweight */}
          <group position={[0, 0, -0.5]}>
            <mesh position={[0, 0.3, 0]} material={steelMat}>
              <boxGeometry args={[0.12, 0.72, 0.06]} />
            </mesh>
            <mesh position={[0, 0.42, 0]} material={industrialRedMat}>
              <boxGeometry args={[0.42, 0.45, 0.12]} />
            </mesh>
            <mesh position={[0, 0.42, -0.07]} material={chromeMirrorMat}>
              <boxGeometry args={[0.08, 0.38, 0.02]} />
            </mesh>
            <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]} material={chromeMirrorMat}>
              <cylinderGeometry args={[0.035, 0.035, 0.14, 16]} />
            </mesh>
          </group>
        </group>

        {/* Safety Guardrails */}
        <mesh position={[0, 0.45, 0.72]} material={safetyYellowMat}>
          <boxGeometry args={[1.1, 0.04, 0.04]} />
        </mesh>
        <mesh position={[0, 0.45, -0.72]} material={safetyYellowMat}>
          <boxGeometry args={[1.1, 0.04, 0.04]} />
        </mesh>
      </group>

      {/* Electric Drive Motor */}
      <group position={[2.0, 0.35, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={darkCastIronMat}>
          <cylinderGeometry args={[0.2, 0.2, 0.52, 20]} />
        </mesh>
        <mesh position={[-0.3, 0.12, 0]} material={industrialRedMat}>
          <boxGeometry args={[0.55, 0.42, 0.14]} />
        </mesh>
      </group>

      {/* Polished Rod */}
      <mesh ref={polishedRodRef} position={[-2.04, 1.38, 0]} material={chromeMirrorMat}>
        <cylinderGeometry args={[0.02, 0.02, 1.5, 20]} />
      </mesh>

      {/* Surface Wellhead Christmas Tree */}
      <group position={[-2.04, 0.25, 0]}>
        <mesh position={[0, 0, 0]} material={steelMat}>
          <cylinderGeometry args={[0.16, 0.2, 0.14, 20]} />
        </mesh>
        <mesh position={[0, 0.18, 0]} material={steelMat}>
          <cylinderGeometry args={[0.1, 0.1, 0.22, 20]} />
        </mesh>
        <mesh position={[0, 0.36, 0]} material={steelMat}>
          <cylinderGeometry args={[0.09, 0.09, 0.16, 20]} />
        </mesh>
        {/* Production Flowline */}
        <mesh position={[-0.32, 0.36, 0]} rotation={[0, 0, Math.PI / 2]} material={industrialRedMat}>
          <cylinderGeometry args={[0.045, 0.045, 0.5, 16]} />
        </mesh>
        <mesh position={[-0.56, 0.36, 0]} rotation={[0, Math.PI / 2, 0]} material={industrialRedMat}>
          <torusGeometry args={[0.07, 0.014, 8, 20]} />
        </mesh>
        <mesh position={[0, 0.52, 0]} material={chromeMirrorMat}>
          <cylinderGeometry args={[0.07, 0.08, 0.18, 20]} />
        </mesh>
      </group>

      {/* ── CSS HIGH-PRESSURE STEAM INJECTION MANIFOLD (Surface CSS Setup) ── */}
      <group position={[-2.04, 0.25, 0]}>
        {/* Insulated Steam Supply Line coming from surface steam generator */}
        <mesh position={[0, 0.25, 0.6]} rotation={[Math.PI / 2, 0, 0]} material={steamPipeMat}>
          <cylinderGeometry args={[0.05, 0.05, 1.1, 16]} />
        </mesh>
        {/* Red thermal insulation bands */}
        <mesh position={[0, 0.25, 0.4]} rotation={[Math.PI / 2, 0, 0]} material={steamInsulationBandMat}>
          <cylinderGeometry args={[0.055, 0.055, 0.08, 16]} />
        </mesh>
        <mesh position={[0, 0.25, 0.8]} rotation={[Math.PI / 2, 0, 0]} material={steamInsulationBandMat}>
          <cylinderGeometry args={[0.055, 0.055, 0.08, 16]} />
        </mesh>
        {/* Steam Injection Control Valve */}
        <mesh position={[0, 0.25, 0.2]} material={industrialRedMat}>
          <cylinderGeometry args={[0.06, 0.06, 0.12, 16]} />
        </mesh>
        <mesh position={[0, 0.34, 0.2]} rotation={[0, 0, 0]} material={industrialRedMat}>
          <torusGeometry args={[0.06, 0.012, 8, 16]} />
        </mesh>

        {/* Animated Steam Vapor Plume at surface during injection */}
        <group ref={steamVaporRef} position={[0, 0.45, 0.2]}>
          <mesh>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#FFFFFF" transparent opacity={0.65} emissive="#F1F5F9" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[0.05, 0.15, 0]}>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial color="#E2E8F0" transparent opacity={0.45} emissive="#F1F5F9" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[-0.04, 0.32, 0]}>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshStandardMaterial color="#CBD5E1" transparent opacity={0.25} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// ─── GEOLOGICAL STRATA & SUB-SURFACE CSS + SRP WELLBORE ───────────────────────
const SubsurfaceEarthAssembly: React.FC<{
  viewMode: ViewMode;
  showPlume: boolean;
  showStrata: boolean;
  isPlaying: boolean;
  cssSteam: number;
  cssPressure: number;
  cssSoak: number;
  cssPhase: CSSPhase;
  viscosityCp?: number;
  reservoirTemp?: number;
  spm?: number;
}> = ({ 
  viewMode, showPlume, showStrata, isPlaying, 
  cssSteam, cssPressure, cssSoak, cssPhase,
  viscosityCp = 1800, reservoirTemp = 66.1, spm = 5.1
}) => {
  const pulseRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const steamFlowRef = useRef<THREE.Group>(null);
  const oilFlowRef = useRef<THREE.Group>(null);

  // Dynamic calculations based on CSS Steam Volume (tons) and Pressure (bar)
  const steamFactor = Math.max(0.5, Math.min(2.2, (cssSteam || 735) / 735));
  const soakFactor = Math.max(0.6, Math.min(1.8, (cssSoak || 64) / 64));
  const pressureFactor = Math.max(0.7, Math.min(1.8, (cssPressure || 21) / 21));

  // Dynamic heat pulse and fluid transport animation
  useFrame(({ clock }) => {
    if (!isPlaying) return;
    const t = clock.getElapsedTime() * 2.5;

    // Steam Chamber Volumetric Pulsing (Intense white-hot pulsing in Injection mode)
    if (pulseRef.current) {
      const pulseSpeed = cssPhase === 'injection' ? 4.5 : 1.8;
      const pulseAmp = cssPhase === 'injection' ? 0.16 : 0.05;
      const scale = (1 + Math.sin(clock.getElapsedTime() * pulseSpeed) * pulseAmp) * Math.sqrt(steamFactor);
      pulseRef.current.scale.set(scale, scale * 0.9, scale);
    }

    // Thermal soak radial dispersion rings
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * 0.18;
      const rScale = (1 + Math.sin(t * 0.7) * 0.05) * Math.sqrt(steamFactor * soakFactor);
      ring1Ref.current.scale.set(rScale, rScale, 1);
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -t * 0.12;
      const rScale = (1 + Math.cos(t * 0.5) * 0.04) * Math.sqrt(steamFactor * soakFactor);
      ring2Ref.current.scale.set(rScale, rScale, 1);
    }

    // Steam flow downward inside wellbore (CSS Injection mode)
    if (steamFlowRef.current) {
      steamFlowRef.current.visible = (cssPhase === 'injection');
      const offset = (clock.getElapsedTime() * 4.5) % 1.5;
      steamFlowRef.current.position.y = -offset;
    }

    // Produced Heavy Oil flow UPWARD inside tubing (SRP Production mode)
    if (oilFlowRef.current) {
      oilFlowRef.current.visible = (cssPhase === 'production');
      const flowVelocity = Math.max(1.0, (spm || 5.1) * 0.35);
      const offset = (clock.getElapsedTime() * flowVelocity) % 1.5;
      oilFlowRef.current.position.y = offset;
    }
  });

  const isWireframe = viewMode === 'wireframe';
  const isXRay = viewMode === 'xray';

  const strataTexture = useMemo(() => createSedimentaryStrataTexture(), []);

  const strataPBRMat = useMemo(() => {
    if (viewMode === 'thermal') {
      return new THREE.MeshStandardMaterial({
        color: '#DC2626',
        wireframe: isWireframe,
        roughness: 0.8,
      });
    }
    return new THREE.MeshStandardMaterial({
      map: strataTexture,
      roughness: 0.85,
      metalness: 0.08,
      wireframe: isWireframe,
      transparent: isXRay,
      opacity: isXRay ? 0.3 : 1.0,
    });
  }, [viewMode, isWireframe, isXRay, strataTexture]);

  const casingSteelMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#94A3B8',
    metalness: 0.85,
    roughness: 0.25,
    wireframe: isWireframe,
  }), [isWireframe]);

  const tubingMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#475569',
    metalness: 0.88,
    roughness: 0.2,
    wireframe: isWireframe,
  }), [isWireframe]);

  const rodMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#DC2626',
    metalness: 0.92,
    roughness: 0.15,
    wireframe: isWireframe,
  }), [isWireframe]);

  const downholePumpMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1E293B',
    metalness: 0.9,
    roughness: 0.3,
    wireframe: isWireframe,
  }), [isWireframe]);

  // Dynamic Heavy Oil Mobilization Matrix (Black tar when cold -> Liquid amber when heated)
  const mobilizedOilMatrixMat = useMemo(() => {
    const isCold = viscosityCp > 2500;
    const isMobilized = viscosityCp < 500;
    const color = isCold ? '#090D16' : isMobilized ? '#F59E0B' : '#78350F';
    const emissive = isCold ? '#000000' : isMobilized ? '#EA580C' : '#92400E';
    const emissiveIntensity = isCold ? 0.0 : isMobilized ? 1.4 : 0.45;
    return new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity,
      roughness: isMobilized ? 0.25 : 0.9,
      metalness: 0.15,
      transparent: true,
      opacity: isMobilized ? 0.72 : 0.92,
      wireframe: isWireframe,
    });
  }, [viscosityCp, isWireframe]);

  // CSS Steam Vapor Shader Material
  const steamGlowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: cssPhase === 'injection' ? '#FFFFFF' : '#EF4444',
    emissive: cssPhase === 'injection' ? '#F43F5E' : '#DC2626',
    emissiveIntensity: 1.8 * pressureFactor,
    roughness: 0.12,
    transparent: true,
    opacity: 0.78,
  }), [cssPhase, pressureFactor]);

  return (
    <group position={[0, 0, 0]}>
      {/* ── 3D Geological Strata Cutaway Volume ─────────────────── */}
      {showStrata && (
        <group position={[-1.1, -6.0, 0]}>
          <mesh material={strataPBRMat} receiveShadow>
            <boxGeometry args={[4.5, 12.0, 3.2]} />
          </mesh>

          {/* Geological Stratigraphic Division Indicator Lines */}
          {[-1.5, -4.5, -8.5].map((y, idx) => (
            <mesh key={idx} position={[0, y, 1.61]}>
              <boxGeometry args={[4.52, 0.03, 0.01]} />
              <meshBasicMaterial color="#0F172A" opacity={0.6} transparent />
            </mesh>
          ))}
        </group>
      )}

      {/* ── Wellbore Casing & Tubing Strings ─────────────────────── */}
      <group position={[-2.04, 0, 0]}>
        {/* Outer Production Casing (9-5/8" Casing String down to 852m) */}
        <mesh position={[0, -5.6, 0]} material={casingSteelMat}>
          <cylinderGeometry args={[0.14, 0.14, 11.4, 24]} />
        </mesh>

        {/* Machined Casing Collars */}
        {[-1.8, -3.8, -5.8, -7.8, -9.8].map((y, idx) => (
          <mesh key={idx} position={[0, y, 0]} material={casingSteelMat}>
            <cylinderGeometry args={[0.155, 0.155, 0.18, 24]} />
          </mesh>
        ))}

        {/* Inner Production Tubing (3-1/2" Tubing) */}
        <mesh position={[0, -5.3, 0]} material={tubingMat}>
          <cylinderGeometry args={[0.075, 0.075, 10.8, 24]} />
        </mesh>

        {/* Sucker Rod String */}
        <mesh position={[0, -5.1, 0]} material={rodMat}>
          <cylinderGeometry args={[0.022, 0.022, 10.4, 16]} />
        </mesh>

        {/* ── ACTIVE CSS STEAM INJECTION COLUMN (Inside wellbore) ──── */}
        <group ref={steamFlowRef} position={[0, 0, 0]}>
          {[-1, -2.5, -4, -5.5, -7, -8.5].map((y, idx) => (
            <mesh key={idx} position={[0, y, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.8, 12]} />
              <meshBasicMaterial color="#38BDF8" transparent opacity={0.75} />
            </mesh>
          ))}
        </group>

        {/* ── PRODUCED HEAVY OIL FLOW COLUMN (Inside tubing in SRP mode) ──── */}
        <group ref={oilFlowRef} position={[0, 0, 0]}>
          {[-1.5, -3.0, -4.5, -6.0, -7.5, -9.0].map((y, idx) => (
            <mesh key={idx} position={[0, y, 0]}>
              <cylinderGeometry args={[0.042, 0.042, 0.9, 12]} />
              <meshStandardMaterial 
                color={viscosityCp < 500 ? "#F59E0B" : "#78350F"} 
                emissive={viscosityCp < 500 ? "#D97706" : "#451A03"}
                emissiveIntensity={0.6}
                transparent 
                opacity={0.82} 
              />
            </mesh>
          ))}
        </group>

        {/* Downhole SRP Pump Barrel & Plunger Assembly (Depth 852m) */}
        <group position={[0, -9.8, 0]}>
          <mesh material={downholePumpMat}>
            <cylinderGeometry args={[0.095, 0.095, 0.85, 20]} />
          </mesh>
          <mesh position={[0, -0.46, 0]} material={casingSteelMat}>
            <cylinderGeometry args={[0.075, 0.075, 0.14, 16]} />
          </mesh>
          <mesh position={[0, 0.18, 0]} material={rodMat}>
            <cylinderGeometry args={[0.07, 0.07, 0.48, 16]} />
          </mesh>
          <mesh position={[0, -0.72, 0]} material={downholePumpMat}>
            <cylinderGeometry args={[0.06, 0.06, 0.38, 16]} />
          </mesh>
        </group>

        {/* Pay Zone Perforations in Baghewala Formation (842m - 856m) */}
        {[-10.2, -10.4, -10.6, -10.8, -11.0, -11.2].map((y, idx) => (
          <group key={idx} position={[0, y, 0]}>
            <mesh position={[0.15, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.016, 0.016, 0.09, 8]} />
              <meshBasicMaterial color="#EF4444" />
            </mesh>
            <mesh position={[-0.15, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.016, 0.016, 0.09, 8]} />
              <meshBasicMaterial color="#EF4444" />
            </mesh>
            <mesh position={[0, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.09, 8]} />
              <meshBasicMaterial color="#EF4444" />
            </mesh>
            <mesh position={[0, 0, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.09, 8]} />
              <meshBasicMaterial color="#EF4444" />
            </mesh>

            {/* In CSS Injection Phase: Dynamic Steam Jet Cones spraying into reservoir */}
            {cssPhase === 'injection' && (
              <group>
                <mesh position={[0.32, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                  <coneGeometry args={[0.12, 0.32, 12]} />
                  <meshBasicMaterial color="#FFFFFF" transparent opacity={0.75} />
                </mesh>
                <mesh position={[-0.32, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <coneGeometry args={[0.12, 0.32, 12]} />
                  <meshBasicMaterial color="#FFFFFF" transparent opacity={0.75} />
                </mesh>
              </group>
            )}
          </group>
        ))}

        {/* ── CSS STEAM INJECTION THERMAL PLUME & LIQUEFIED HEAVY OIL CHAMBER ── */}
        {showPlume && (
          <group position={[0, -10.6, 0]}>
            {/* Liquefied Heavy Oil Viscosity Envelope (Pay Zone Member A) */}
            <mesh scale={[1.75 * Math.sqrt(steamFactor), 0.95, 1.75 * Math.sqrt(steamFactor)]}>
              <sphereGeometry args={[1.3, 32, 32]} />
              <primitive object={mobilizedOilMatrixMat} />
            </mesh>

            {/* Core Steam Bubble (Directly Scaled by Steam Volume) */}
            <mesh ref={pulseRef}>
              <sphereGeometry args={[0.82 * Math.sqrt(steamFactor), 32, 32]} />
              <primitive object={steamGlowMat} />
            </mesh>

            {/* Middle Heat Dispersion Envelope (~180°C - 240°C) */}
            <mesh scale={[1.45 * Math.sqrt(steamFactor), 0.95, 1.45 * Math.sqrt(steamFactor)]}>
              <sphereGeometry args={[1.05, 28, 28]} />
              <meshStandardMaterial
                color="#F59E0B"
                emissive="#EA580C"
                emissiveIntensity={1.0 * pressureFactor}
                roughness={0.35}
                transparent
                opacity={0.38}
              />
            </mesh>

            {/* Horizontal Thermal Heat Dispersion Contour Rings */}
            <group position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh ref={ring1Ref}>
                <ringGeometry args={[0.9 * Math.sqrt(steamFactor), 1.6 * Math.sqrt(steamFactor), 32]} />
                <meshBasicMaterial color="#EA580C" transparent opacity={0.4} side={THREE.DoubleSide} />
              </mesh>
              <mesh ref={ring2Ref}>
                <ringGeometry args={[1.65 * Math.sqrt(steamFactor), 2.4 * Math.sqrt(steamFactor * soakFactor), 32]} />
                <meshBasicMaterial color="#FBBF24" transparent opacity={0.22} side={THREE.DoubleSide} />
              </mesh>
            </group>

            {/* High-Intensity Reservoir Point Light */}
            <pointLight 
              color={cssPhase === 'injection' ? '#FFFFFF' : '#EF4444'} 
              intensity={3.5 * pressureFactor} 
              distance={8 * Math.sqrt(steamFactor)} 
            />
          </group>
        )}
      </group>
    </group>
  );
};

// ─── 3D CALLOUT ANNOTATION LABELS (Toggleable & Non-Clipping) ─────────────────
const CalloutAnnotations: React.FC<{
  onSelectComponent: (comp: 'reservoir' | 'wellbore' | 'srp' | 'surface') => void;
  activeComponent?: string;
  cssPhase: CSSPhase;
  visible: boolean;
}> = ({ onSelectComponent, activeComponent, cssPhase, visible }) => {
  if (!visible) return null;
  return (
    <>
      {/* 1. Surface Label */}
      <Html position={[1.4, 0.8, 0]} center distanceFactor={16}>
        <button
          onClick={() => onSelectComponent('surface')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-xl transition-all cursor-pointer border backdrop-blur-md whitespace-nowrap select-none ${
            activeComponent === 'surface'
              ? 'bg-[#005C53] text-white border-white ring-2 ring-[#005C53]/50'
              : 'bg-[#0F172A]/90 text-white border-[#334155] hover:border-[#005C53]'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
          <span>Surface {cssPhase === 'injection' ? '(Steam Manifold)' : ''}</span>
        </button>
      </Html>

      {/* 2. SRP Label */}
      <Html position={[1.4, 2.5, 0]} center distanceFactor={16}>
        <button
          onClick={() => onSelectComponent('srp')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-xl transition-all cursor-pointer border backdrop-blur-md whitespace-nowrap select-none ${
            activeComponent === 'srp'
              ? 'bg-[#D32F2F] text-white border-white ring-2 ring-[#D32F2F]/50'
              : 'bg-[#0F172A]/90 text-white border-[#334155] hover:border-[#D32F2F]'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#D32F2F]" />
          <span>SRP {cssPhase === 'production' ? '(Pumping)' : '(Standby)'}</span>
        </button>
      </Html>

      {/* 3. Wellbore Label */}
      <Html position={[1.4, -5.5, 0]} center distanceFactor={16}>
        <button
          onClick={() => onSelectComponent('wellbore')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-xl transition-all cursor-pointer border backdrop-blur-md whitespace-nowrap select-none ${
            activeComponent === 'wellbore'
              ? 'bg-[#0284C7] text-white border-white ring-2 ring-[#0284C7]/50'
              : 'bg-[#0F172A]/90 text-white border-[#334155] hover:border-[#0284C7]'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#0284C7]" />
          <span>Wellbore {cssPhase === 'injection' ? '(Steam Flow)' : '(Production String)'}</span>
        </button>
      </Html>

      {/* 4. Reservoir Label */}
      <Html position={[1.4, -10.6, 0]} center distanceFactor={16}>
        <button
          onClick={() => onSelectComponent('reservoir')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-xl transition-all cursor-pointer border backdrop-blur-md whitespace-nowrap select-none ${
            activeComponent === 'reservoir'
              ? 'bg-[#EA580C] text-white border-white ring-2 ring-[#EA580C]/50'
              : 'bg-[#0F172A]/90 text-white border-[#334155] hover:border-[#EA580C]'
          }`}
        >
          <Flame className="w-3 h-3 text-[#F59E0B]" />
          <span>Reservoir (CSS Chamber)</span>
        </button>
      </Html>
    </>
  );
};

// ─── CAMERA PRESET CONTROLLER (Smooth Lerp on Change, Free Orbit Afterwards) ────
const CameraPresetController: React.FC<{
  preset: CameraPreset;
}> = ({ preset }) => {
  const controlsRef = useRef<any>(null);
  const targetPosRef = useRef<THREE.Vector3>(new THREE.Vector3(-0.8, -5.5, 0));
  const camPosRef = useRef<THREE.Vector3>(new THREE.Vector3(8.5, -3.0, 13.5));
  const isTransitioningRef = useRef<boolean>(true);
  const lastPresetRef = useRef<CameraPreset>(preset);

  useEffect(() => {
    lastPresetRef.current = preset;
    isTransitioningRef.current = true;
    if (preset === 'surface') {
      targetPosRef.current.set(-0.6, 1.2, 0);
      camPosRef.current.set(3.0, 3.4, 4.8);
    } else if (preset === 'wellbore') {
      targetPosRef.current.set(-2.04, -5.5, 0);
      camPosRef.current.set(1.4, -5.5, 6.2);
    } else if (preset === 'reservoir') {
      targetPosRef.current.set(-2.04, -10.6, 0);
      camPosRef.current.set(1.8, -9.8, 5.4);
    } else {
      targetPosRef.current.set(-0.8, -5.5, 0);
      camPosRef.current.set(8.5, -3.0, 13.5);
    }
  }, [preset]);

  useFrame(({ camera }) => {
    if (isTransitioningRef.current) {
      camera.position.lerp(camPosRef.current, 0.08);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetPosRef.current, 0.08);
        controlsRef.current.update();
      }
      if (camera.position.distanceTo(camPosRef.current) < 0.1) {
        isTransitioningRef.current = false;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={2}
      maxDistance={45}
      onStart={() => { isTransitioningRef.current = false; }}
      maxPolarAngle={Math.PI / 2 + 0.12}
    />
  );
};

// ─── MAIN EXPORTED DIGITAL TWIN 3D CANVAS WITH FULL CSS + SRP INTEGRATION ────
export const DigitalTwin3DCanvas: React.FC<DigitalTwin3DProps> = ({
  wellId = 'BGW-001',
  activeComponent = 'reservoir',
  onComponentSelect,
  spm = 5.1,
  strokeLength = 66,
  isPumping = true,
  cssSteam = 735,
  cssPressure = 21,
  cssSoak = 64,
  cssPhase = 'production',
  onCssPhaseChange,
  onBack,
  reservoirTemp = 66.1,
  viscosityCp = 1800,
  oilRateBpd = 28.5,
  onSteamChange,
  onSpmChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('rendered');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('full');
  const [showStrata, setShowStrata] = useState(true);
  const [showPlume, setShowPlume] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [isPlaying, setIsPlaying] = useState(isPumping);
  const [curSPM, setCurSPM] = useState(spm);
  const [curSteam, setCurSteam] = useState(cssSteam);
  const [curPressure, setCurPressure] = useState(cssPressure);
  const [curPhase, setCurPhase] = useState<CSSPhase>(cssPhase);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Synchronize state with props
  useEffect(() => { setCurSPM(spm); }, [spm]);
  useEffect(() => { setCurSteam(cssSteam); }, [cssSteam]);
  useEffect(() => { setCurPressure(cssPressure); }, [cssPressure]);
  useEffect(() => { setCurPhase(cssPhase); }, [cssPhase]);

  const handleSteamChange = (val: number) => {
    setCurSteam(val);
    if (onSteamChange) onSteamChange(val);
  };

  const handleSpmChange = (val: number) => {
    setCurSPM(val);
    if (onSpmChange) onSpmChange(val);
  };

  const handlePhaseSelect = (phase: CSSPhase) => {
    setCurPhase(phase);
    if (onCssPhaseChange) onCssPhaseChange(phase);
    if (phase === 'injection' || phase === 'soak') {
      setCameraPreset('reservoir');
    } else {
      setCameraPreset('surface');
    }
  };

  const handleComponentSelect = (comp: 'reservoir' | 'wellbore' | 'srp' | 'surface') => {
    if (onComponentSelect) onComponentSelect(comp);
    if (comp === 'surface' || comp === 'srp') setCameraPreset('surface');
    else if (comp === 'wellbore') setCameraPreset('wellbore');
    else if (comp === 'reservoir') setCameraPreset('reservoir');
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!isFullscreen) {
      if (el?.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
      document.body.style.overflow = 'hidden';
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
      document.body.style.overflow = '';
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs) document.body.style.overflow = '';
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  return (
    <div
      ref={containerRef}
      className={`relative transition-all duration-200 flex flex-col ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] w-full h-full m-0 p-0 bg-[#070B14] overflow-hidden'
          : 'w-full h-[640px] bg-[#0A0F1D] rounded-xl overflow-hidden border border-[#1E293B] shadow-2xl'
      }`}
      style={isFullscreen ? { width: '100vw', height: '100vh', margin: 0, padding: 0 } : undefined}
    >
      {/* ── Top CAD Ribbon Toolbar (SolidWorks / Blender Controls) ── */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#0F172A]/90 backdrop-blur-md border border-[#334155]/90 rounded-lg text-white text-[12px] shadow-2xl">
        
        {/* Left: Back option & View Modes */}
        <div className="flex items-center gap-2">
          {(isFullscreen || onBack) && (
            <button
              onClick={() => {
                if (isFullscreen) toggleFullscreen();
                else if (onBack) onBack();
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#1E293B] hover:bg-[#D32F2F] text-white font-bold rounded transition-colors cursor-pointer border border-[#334155]"
              title="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isFullscreen ? 'Exit Fullscreen' : 'Back'}</span>
            </button>
          )}

          <div className="h-5 w-px bg-[#334155]" />

          {/* View Modes */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('rendered')}
              className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                viewMode === 'rendered'
                  ? 'bg-[#D32F2F] text-white shadow-xs'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
              }`}
            >
              Rendered
            </button>
            <button
              onClick={() => setViewMode('wireframe')}
              className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                viewMode === 'wireframe'
                  ? 'bg-[#0284C7] text-white shadow-xs'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
              }`}
            >
              SolidWorks CAD
            </button>
            <button
              onClick={() => setViewMode('xray')}
              className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                viewMode === 'xray'
                  ? 'bg-[#10B981] text-white shadow-xs'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
              }`}
            >
              X-Ray Cutaway
            </button>
            <button
              onClick={() => setViewMode('thermal')}
              className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                viewMode === 'thermal'
                  ? 'bg-[#F59E0B] text-white shadow-xs'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
              }`}
            >
              Thermal Heatmap
            </button>
          </div>
        </div>

        {/* Center: CSS + SRP Operational Phase Switcher */}
        <div className="flex items-center gap-1 bg-[#1E293B] p-1 rounded-md border border-[#334155]">
          <span className="text-[10px] uppercase font-bold text-[#94A3B8] px-1.5">Cycle Phase:</span>
          <button
            onClick={() => handlePhaseSelect('injection')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
              curPhase === 'injection'
                ? 'bg-[#0284C7] text-white shadow-xs'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#334155]'
            }`}
          >
            <Wind className="w-3 h-3 text-[#38BDF8]" />
            <span>CSS Injection</span>
          </button>
          <button
            onClick={() => handlePhaseSelect('soak')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
              curPhase === 'soak'
                ? 'bg-[#EA580C] text-white shadow-xs'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#334155]'
            }`}
          >
            <Flame className="w-3 h-3 text-[#FBBF24]" />
            <span>CSS Soak</span>
          </button>
          <button
            onClick={() => handlePhaseSelect('production')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
              curPhase === 'production'
                ? 'bg-[#16A34A] text-white shadow-xs'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#334155]'
            }`}
          >
            <Activity className="w-3 h-3 text-[#86EFAC]" />
            <span>SRP Production</span>
          </button>
        </div>

        {/* Right: Controls, Badges & Fullscreen */}
        <div className="flex items-center gap-3">
          {/* Dynamic Kinematics Slider (Synchronized with parent page) */}
          {curPhase === 'production' ? (
            <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
              <span>SPM:</span>
              <input
                type="range"
                min="1"
                max="12"
                step="0.1"
                value={curSPM}
                onChange={(e) => handleSpmChange(parseFloat(e.target.value))}
                className="w-20 h-1.5 bg-[#334155] rounded-lg appearance-none cursor-pointer accent-[#D32F2F]"
              />
              <span className="font-bold text-white w-8 text-right">{curSPM.toFixed(1)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
              <span>Steam (t):</span>
              <input
                type="range"
                min="400"
                max="1200"
                step="25"
                value={curSteam}
                onChange={(e) => handleSteamChange(parseFloat(e.target.value))}
                className="w-20 h-1.5 bg-[#334155] rounded-lg appearance-none cursor-pointer accent-[#0284C7]"
              />
              <span className="font-bold text-[#38BDF8] w-12 text-right">{curSteam}t</span>
            </div>
          )}

          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-white transition-colors cursor-pointer border border-[#334155]"
            title={isPlaying ? 'Pause Kinematics' : 'Start Kinematics'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Strata Layer Toggle */}
          <button
            onClick={() => setShowStrata(!showStrata)}
            className={`p-1.5 rounded transition-colors cursor-pointer border border-[#334155] ${
              showStrata ? 'bg-[#1E293B] text-white' : 'bg-[#334155] text-[#94A3B8]'
            }`}
            title="Toggle Earth Strata Cutaway"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          {/* Toggle 3D Annotations Badges */}
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer border border-[#334155] ${
              showAnnotations ? 'bg-[#0284C7] text-white' : 'bg-[#1E293B] text-[#94A3B8] hover:text-white'
            }`}
            title={showAnnotations ? 'Hide 3D Component Badges' : 'Show 3D Component Badges'}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Badges</span>
          </button>

          {/* Reset Camera */}
          <button
            onClick={() => setCameraPreset('full')}
            className="p-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-white transition-colors cursor-pointer border border-[#334155]"
            title="Reset Camera View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle Option */}
          <button
            onClick={toggleFullscreen}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-bold transition-all cursor-pointer border ${
              isFullscreen
                ? 'bg-[#D32F2F] text-white border-white shadow-md'
                : 'bg-[#005C53] hover:bg-[#004B44] text-white border-[#005C53]'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Open True Fullscreen View'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Exit' : 'Full Screen'}</span>
          </button>
        </div>
      </div>

      {/* ── 3D Canvas Viewport ─────────────────────────────────────── */}
      <div className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden">
        <Canvas
          shadows
          resize={{ debounce: 0 }}
          camera={{ position: [8.5, -3.0, 13.5], fov: 42 }}
          gl={{
            antialias: true,
            alpha: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.15,
          }}
        >
          {/* Lighting Setup */}
          <ambientLight intensity={0.7} />
          <directionalLight
            position={[10, 15, 12]}
            intensity={1.4}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0001}
          />
          <directionalLight position={[-8, -6, -8]} intensity={0.5} />
          <directionalLight position={[0, -12, 10]} intensity={0.3} color="#F59E0B" />

          {/* Contact Shadows */}
          <ContactShadows
            position={[0, 0.01, 0]}
            opacity={0.65}
            scale={8}
            blur={1.8}
            far={4}
          />

          {/* Surface Grid */}
          <gridHelper
            args={[14, 14, '#334155', '#1E293B']}
            position={[0, 0.02, 0]}
          />

          {/* High-Fidelity Pumpjack & Surface Steam Manifold */}
          <PumpjackUnit
            spm={curSPM}
            isPlaying={isPlaying}
            wireframe={viewMode === 'wireframe'}
            cssPhase={curPhase}
          />

          {/* Geological Strata Cutaway & Subsurface CSS/SRP Assembly */}
          <SubsurfaceEarthAssembly
            viewMode={viewMode}
            showPlume={showPlume}
            showStrata={showStrata}
            isPlaying={isPlaying}
            cssSteam={curSteam}
            cssPressure={curPressure}
            cssSoak={cssSoak}
            cssPhase={curPhase}
            viscosityCp={viscosityCp}
            reservoirTemp={reservoirTemp}
            spm={curSPM}
          />

          {/* 3D Callout Annotations */}
          <CalloutAnnotations
            visible={showAnnotations}
            onSelectComponent={handleComponentSelect}
            activeComponent={activeComponent}
            cssPhase={curPhase}
          />

          {/* Camera Controller */}
          <CameraPresetController preset={cameraPreset} />
        </Canvas>
      </div>

      {/* ── Interactive Floating Fullscreen Telemetry HUD ───────────── */}
      {isFullscreen && (
        <div className="absolute bottom-6 left-6 right-6 z-30 flex flex-wrap items-center justify-between gap-4 p-4 bg-[#0F172A]/92 backdrop-blur-lg border border-[#334155] rounded-2xl text-white shadow-2xl animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center gap-6 text-[13px]">
            <div>
              <span className="text-[#94A3B8] text-[11px] block uppercase font-bold tracking-wider">Well ID</span>
              <span className="text-base font-black text-[#F8FAFC]">{wellId}</span>
            </div>

            {/* In-HUD Phase Selector */}
            <div className="flex items-center gap-1 bg-[#1E293B] p-1 rounded-lg border border-[#334155]">
              {(['injection', 'soak', 'production'] as CSSPhase[]).map(p => (
                <button
                  key={p}
                  onClick={() => handlePhaseSelect(p)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded capitalize cursor-pointer transition-all ${
                    curPhase === p
                      ? p === 'injection' ? 'bg-[#0284C7] text-white' : p === 'soak' ? 'bg-[#EA580C] text-white' : 'bg-[#16A34A] text-white'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div>
              <span className="text-[#94A3B8] text-[11px] block uppercase font-bold tracking-wider">Steam Volume</span>
              <span className="font-bold text-[#38BDF8]">{curSteam} Tons</span>
            </div>

            <div>
              <span className="text-[#94A3B8] text-[11px] block uppercase font-bold tracking-wider">Heavy Oil Viscosity</span>
              <span className={`font-bold ${viscosityCp < 500 ? 'text-[#10B981]' : viscosityCp < 2000 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                {viscosityCp ? `${viscosityCp.toLocaleString()} cP` : '1,800 cP'}
              </span>
            </div>

            <div>
              <span className="text-[#94A3B8] text-[11px] block uppercase font-bold tracking-wider">Reservoir Temp</span>
              <span className="font-bold text-[#EA580C]">{reservoirTemp ? `${reservoirTemp.toFixed(1)} °C` : '66.1 °C'}</span>
            </div>

            <div>
              <span className="text-[#94A3B8] text-[11px] block uppercase font-bold tracking-wider">Pumping Cadence</span>
              <span className="font-bold text-[#10B981]">{curSPM.toFixed(1)} SPM · {strokeLength} in</span>
            </div>

            <div>
              <span className="text-[#94A3B8] text-[11px] block uppercase font-bold tracking-wider">Net Oil Output</span>
              <span className="font-bold text-[#38BDF8]">{oilRateBpd !== undefined ? `${oilRateBpd.toFixed(1)} BOPD` : '28.5 BOPD'}</span>
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-4 py-2 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold rounded-xl text-[13px] shadow-sm transition-colors cursor-pointer"
          >
            <Minimize2 className="w-4 h-4" />
            <span>Exit Fullscreen</span>
          </button>
        </div>
      )}

      {/* ── Bottom Status Bar ──────────────────────────────────────── */}
      <div className="px-4 py-2 bg-[#0F172A]/95 border-t border-[#1E293B] flex items-center justify-between text-[11px] text-[#94A3B8]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[#10B981] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            CSS + SRP Coupled Physics Active
          </span>
          <span className="text-[#64748B]">|</span>
          <span>Phase: <strong className="text-[#38BDF8] uppercase font-bold">{curPhase}</strong></span>
          <span className="text-[#64748B]">|</span>
          <span>Viscosity: <strong className={viscosityCp < 500 ? 'text-[#10B981]' : 'text-[#F59E0B]'}>{viscosityCp.toLocaleString()} cP</strong></span>
          <span className="text-[#64748B]">|</span>
          <span>Plume Radius: <strong className="text-white">{(42 * Math.sqrt(curSteam / 735)).toFixed(1)} m</strong></span>
          <span className="text-[#64748B]">|</span>
          <span>Reservoir Depth: <strong className="text-white">852 m MD</strong></span>
        </div>

        <div className="flex items-center gap-4 text-[#64748B]">
          <span>Rotate: <kbd className="px-1 py-0.5 bg-[#1E293B] rounded text-white text-[10px]">Left Click</kbd></span>
          <span>Pan: <kbd className="px-1 py-0.5 bg-[#1E293B] rounded text-white text-[10px]">Right Click</kbd></span>
          <span>Zoom: <kbd className="px-1 py-0.5 bg-[#1E293B] rounded text-white text-[10px]">Scroll</kbd></span>
        </div>
      </div>
    </div>
  );
};
