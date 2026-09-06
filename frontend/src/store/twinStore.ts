import { create } from 'zustand';
import type { TwinState, SimulationParams, SimulationResult } from '../types';
import { simulationEngine } from '../services/simulationEngine';

// Default initial state — overwritten by API fetch in DigitalTwinPage
const INITIAL_TWIN_STATE: TwinState = {
  wellId: 'BGW-001',
  timestamp: new Date().toISOString(),
  reservoir: { temperature: 60, pressure: 50, viscosity: 1800, steamPenetration: 40, oilSaturation: 0.34, depth: 1000 },
  wellbore: { temperature: 55, pressure: 45, flowRate: 80, depth: 1000, casingDiameter: 177.8, tubingDiameter: 88.9 },
  css: { steamVolume: 700, injectionPressure: 20, soakTime: 60, cycleNumber: 1, steamQuality: 72 },
  srp: { spm: 5.0, strokeLength: 66, vfd: 36, rodLoad: 5.5, pumpEfficiency: 70, fluidLevel: 320 },
  production: { oilRate: 90, waterCut: 35, sor: 4.5, grossRate: 140, energyConsumption: 85 },
  health: { failureRisk: 0.18, rodCondition: 'Fair', pumpCondition: 'Good', overallHealth: 72 },
};


interface TwinStore {
  currentState: TwinState;
  simulatedState: TwinState | null;
  simulationResult: SimulationResult | null;
  isSimulating: boolean;
  simLog: string[];
  hasSimulation: boolean;

  updateCurrentState: (patch: Partial<TwinState>) => void;
  runSimulation: (params: SimulationParams) => Promise<void>;
  resetSimulation: () => void;
  clearSimLog: () => void;
}

export const useTwinStore = create<TwinStore>((set, get) => ({
  currentState: INITIAL_TWIN_STATE,
  simulatedState: null,
  simulationResult: null,
  isSimulating: false,
  simLog: [],
  hasSimulation: false,

  updateCurrentState: (patch) =>
    set((s) => ({ currentState: { ...s.currentState, ...patch } })),

  runSimulation: async (params: SimulationParams) => {
    set({ isSimulating: true, simLog: [], hasSimulation: false });

    const steps = [
      'Initializing Digital Twin model...',
      'Loading reservoir state — BGW-014, Cycle 14...',
      'Calculating thermal response to steam parameters...',
      'Calculating viscosity reduction from temperature...',
      'Calculating fluid mobility index...',
      'Calculating SRP mechanical response...',
      'Calculating production rate response...',
      'Calculating equipment loading and risk...',
      'Running joint optimization assessment...',
      'Validating against operating envelope...',
      'Simulation complete.',
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 420));
      set((s) => ({
        simLog: [...s.simLog, steps[i]],
      }));
    }

    const current = get().currentState;
    const result = simulationEngine.run(current, params);

    set({
      simulatedState: result.simulated,
      simulationResult: result,
      isSimulating: false,
      hasSimulation: true,
    });
  },

  resetSimulation: () =>
    set({
      simulatedState: null,
      simulationResult: null,
      isSimulating: false,
      simLog: [],
      hasSimulation: false,
    }),

  clearSimLog: () => set({ simLog: [] }),
}));
